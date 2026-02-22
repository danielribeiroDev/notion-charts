import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { ExchangeCodeDto } from './dto/exchange-code.dto';
import { JwtPayload } from '../auth/types/jwt-payload';
import { ListDatabasesDto } from './dto/list-databases.dto';
import { NotionHttpError, NotionHttpService } from './notion-http.service';
import { RedisService } from '../redis/redis.service';
import { GetDatabaseSchemaDto } from './dto/get-database-schema.dto';
import { QueryDatabaseDto } from './dto/query-database.dto';
import { AggregateMetricsDto } from './dto/aggregate-metric.dto';
import { AggregationResult, AggregationService } from './aggregation.service';
import { buildAggregationCacheKey } from './cache-key.util';

@Injectable()
export class NotionIntegrationService {
    private readonly clientId: string;
    private readonly clientSecret: string;
    private readonly redirectUri: string;
    private readonly aggregationTtlSeconds: number;

    constructor(
        private readonly prisma: PrismaService,
        private readonly crypto: CryptoService,
        private readonly redis: RedisService,
        private readonly notionHttp: NotionHttpService,
        private readonly aggregation: AggregationService,
        configService: ConfigService,
    ) {
        this.clientId = configService.get<string>('NOTION_CLIENT_ID', '');
        this.clientSecret = configService.get<string>('NOTION_CLIENT_SECRET', '');
        this.redirectUri = configService.get<string>('NOTION_REDIRECT_URI', '');
        const defaultCacheTtl = Number(configService.get<string>('NOTION_CACHE_TTL_SECONDS', '300')) || 300;
        this.aggregationTtlSeconds = Number(configService.get<string>('CACHE_TTL_AGGREGATION', `${defaultCacheTtl}`)) || defaultCacheTtl;
    }

    async exchange(user: JwtPayload, dto: ExchangeCodeDto) {
        const workspace = await this.prisma.workspace.findFirst({
            where: { id: dto.workspaceId, userId: user.sub },
        });
        if (!workspace) {
            throw new ForbiddenException('Workspace not found or not owned');
        }

        const tokenResult = await this.requestNotionToken(dto.code);

        const encryptedAccessToken = this.crypto.encrypt(tokenResult.access_token);

        await this.prisma.notionCredential.upsert({
            where: { workspaceId: workspace.id },
            update: {
                encryptedAccessToken,
                botId: tokenResult.bot_id,
            },
            create: {
                workspaceId: workspace.id,
                encryptedAccessToken,
                botId: tokenResult.bot_id,
            },
        });

        return {
            ok: true,
            workspaceId: workspace.id,
            botId: tokenResult.bot_id,
            notionWorkspaceId: tokenResult.workspace_id,
        };
    }

    async listDatabases(query: ListDatabasesDto, userId: string) {
        const { workspaceId, startCursor, pageSize } = query;
        if (!workspaceId) {
            throw new BadRequestException('workspaceId is required');
        }

        const token = await this.getAccessTokenForWorkspace(workspaceId, userId);

        const body: Record<string, unknown> = {
            page_size: pageSize ?? 50,
            filter: { value: 'database', property: 'object' },
        };
        if (startCursor) {
            body.start_cursor = startCursor;
        }

        const cacheKey = this.cacheKey(workspaceId, startCursor, pageSize ?? 50);
        const cached = await this.redis.get<{
            items: Array<{ id: string; title: string; icon?: string; url?: string }>;
            hasMore: boolean;
            nextCursor?: string;
        }>(cacheKey);
        if (cached) {
            return cached;
        }

        let json: {
            results: Array<{
                id: string;
                url?: string;
                icon?: { type: 'emoji' | 'external'; emoji?: string; external?: { url?: string } };
                title?: Array<{ plain_text?: string; text?: { content?: string } }>;
            }>;
            has_more?: boolean;
            next_cursor?: string | null;
        };

        try {
            json = await this.notionHttp.postJson('https://api.notion.com/v1/search', {
                token,
                body,
            });
        } catch (err) {
            this.handleNotionError(err);
        }

        const databases = (json.results ?? []).map((db) => {
            const title = db.title?.[0]?.plain_text ?? db.title?.[0]?.text?.content ?? 'Untitled';
            const icon = db.icon?.type === 'emoji'
                ? db.icon.emoji
                : db.icon?.external?.url;
            return {
                id: db.id,
                title,
                icon,
                url: db.url,
            };
        });

        const payload = {
            items: databases,
            hasMore: Boolean(json.has_more),
            nextCursor: json.next_cursor ?? undefined,
        };

        await this.redis.set(cacheKey, payload);

        return payload;
    }

    async aggregateMetric(dto: AggregateMetricsDto, userId: string) {
        const { workspaceId, databaseId, metrics } = dto;
        if (!workspaceId || !databaseId) {
            throw new BadRequestException('workspaceId and databaseId are required');
        }

        const token = await this.getAccessTokenForWorkspace(workspaceId, userId);
        const useCache = dto.forceRefresh !== true;

        const results: Array<AggregationResult & { source: 'cache' | 'api' }> = [];

        for (const metric of metrics) {
            const cacheKey = buildAggregationCacheKey(workspaceId, databaseId, metric);

            if (useCache) {
                const cached = await this.redis.get<AggregationResult & { source: 'cache' | 'api' }>(cacheKey);
                if (cached) {
                    results.push({ ...cached, source: 'cache' });
                    continue;
                }
            }

            try {
                const aggregated = await this.aggregation.aggregate(token, databaseId, metric);
                const payload: AggregationResult & { source: 'cache' | 'api' } = {
                    ...aggregated,
                    source: 'api',
                };
                await this.redis.set(cacheKey, payload, this.aggregationTtlSeconds);
                results.push(payload);
            } catch (err) {
                this.handleNotionError(err);
            }
        }

        return results.map((result) => ({
            metricId: result.metricId,
            total: result.total,
            count: result.count,
            processedPages: result.pagesProcessed,
            isPartial: result.hitPageLimit,
            source: result.source,
        }));
    }

    async getDatabaseSchema(query: GetDatabaseSchemaDto, userId: string) {
        const { workspaceId, databaseId } = query;
        if (!workspaceId || !databaseId) {
            throw new BadRequestException('workspaceId and databaseId are required');
        }

        const token = await this.getAccessTokenForWorkspace(workspaceId, userId);

        let json: {
            id: string;
            title?: Array<{ plain_text?: string; text?: { content?: string } }>;
            properties?: Record<string, any>;
        };

        try {
            json = await this.notionHttp.getJson(`https://api.notion.com/v1/databases/${databaseId}`, {
                token,
            });
        } catch (err) {
            this.handleNotionError(err);
        }

        const properties = this.mapPropertyDefinitions(json.properties ?? {});
        const title = json.title?.[0]?.plain_text ?? json.title?.[0]?.text?.content ?? 'Untitled';

        return {
            id: json.id,
            title,
            properties,
        };
    }

    async queryDatabase(dto: QueryDatabaseDto, userId: string) {
        const { workspaceId, databaseId, filter, sorts, startCursor, pageSize } = dto;
        if (!workspaceId || !databaseId) {
            throw new BadRequestException('workspaceId and databaseId are required');
        }

        const token = await this.getAccessTokenForWorkspace(workspaceId, userId);

        const body: Record<string, unknown> = {};
        if (filter) body.filter = filter;
        if (sorts) body.sorts = sorts;
        if (startCursor) body.start_cursor = startCursor;
        if (pageSize) body.page_size = pageSize;

        let json: {
            results: Array<{ id: string; properties?: Record<string, any> }>;
            has_more?: boolean;
            next_cursor?: string | null;
        };

        try {
            json = await this.notionHttp.postJson(`https://api.notion.com/v1/databases/${databaseId}/query`, {
                token,
                body,
            });
        } catch (err) {
            this.handleNotionError(err);
        }

        const items = (json.results ?? []).map((page) => ({
            id: page.id,
            properties: this.mapPropertyValues(page.properties ?? {}),
        }));

        return {
            items,
            hasMore: Boolean(json.has_more),
            nextCursor: json.next_cursor ?? undefined,
        };
    }

    // Temporary debug endpoint to verify stored Notion credentials
    async testPing(workspaceId: string, userId: string) {
        if (!workspaceId) {
            throw new BadRequestException('workspaceId is required');
        }

        const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
        if (!workspace || workspace.userId !== userId) {
            throw new ForbiddenException('Workspace not found or not owned');
        }

        const credential = await this.prisma.notionCredential.findUnique({ where: { workspaceId } });
        if (!credential) {
            throw new NotFoundException('No Notion credential stored for this workspace');
        }

        const token = this.crypto.decrypt(credential.encryptedAccessToken);

        try {
            await this.notionHttp.postJson('https://api.notion.com/v1/search', {
                token,
                body: { page_size: 1 },
            });
        } catch (err) {
            this.handleNotionError(err);
        }

        return { ok: true };
    }

    private async requestNotionToken(code: string) {
        if (!this.clientId || !this.clientSecret || !this.redirectUri) {
            throw new InternalServerErrorException('Notion OAuth config missing');
        }

        const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
        let json: { access_token: string; bot_id?: string; workspace_id?: string };
        try {
            json = await this.notionHttp.postJson('https://api.notion.com/v1/oauth/token', {
                headers: {
                    Authorization: `Basic ${basic}`,
                },
                body: {
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: this.redirectUri,
                },
            });
        } catch (err) {
            this.handleNotionError(err);
        }

        if (!json.access_token) {
            throw new ForbiddenException('Notion token exchange failed: missing access_token');
        }

        return json;
    }

    private handleNotionError(err: unknown): never {
        if (err instanceof NotionHttpError) {
            if (err.status === 401 || err.status === 403) {
                throw new ForbiddenException('Falha na autenticação com o provedor externo');
            }

            throw new BadRequestException('Erro ao consultar provedor externo');
        }

        throw err;
    }

    private cacheKey(workspaceId: string, startCursor?: string, pageSize?: number) {
        const cursor = startCursor ?? 'first';
        const size = pageSize ?? 50;
        return `notion:dbs:${workspaceId}:${cursor}:${size}`;
    }

    private async getAccessTokenForWorkspace(workspaceId: string, userId: string) {
        const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
        if (!workspace || workspace.userId !== userId) {
            throw new ForbiddenException('Workspace not found or not owned');
        }

        const credential = await this.prisma.notionCredential.findUnique({ where: { workspaceId } });
        if (!credential) {
            throw new NotFoundException('No Notion credential stored for this workspace');
        }

        return this.crypto.decrypt(credential.encryptedAccessToken);
    }

    private mapPropertyDefinitions(properties: Record<string, any>) {
        return Object.entries(properties)
            .flatMap(([name, prop]) => {
                if (!prop || prop.type === 'relation' || prop.type === 'rollup') {
                    return [];
                }

                const base = {
                    id: prop.id as string,
                    name,
                    type: prop.type as string,
                };

                if (prop.type === 'select') {
                    return [{
                        ...base,
                        options: (prop.select?.options ?? []).map((opt: any) => ({ id: opt.id, name: opt.name, color: opt.color })),
                    }];
                }

                if (prop.type === 'multi_select') {
                    return [{
                        ...base,
                        options: (prop.multi_select?.options ?? []).map((opt: any) => ({ id: opt.id, name: opt.name, color: opt.color })),
                    }];
                }

                if (prop.type === 'status') {
                    return [{
                        ...base,
                        options: (prop.status?.options ?? []).map((opt: any) => ({ id: opt.id, name: opt.name, color: opt.color })),
                    }];
                }

                return [base];
            });
    }

    private mapPropertyValues(properties: Record<string, any>) {
        const result: Record<string, unknown> = {};

        for (const [name, prop] of Object.entries(properties)) {
            if (!prop || prop.type === 'relation' || prop.type === 'rollup') {
                continue;
            }

            switch (prop.type) {
                case 'title':
                    result[name] = prop.title?.map((t: any) => t.plain_text ?? t.text?.content ?? '').join(' ') ?? '';
                    break;
                case 'rich_text':
                    result[name] = prop.rich_text?.map((t: any) => t.plain_text ?? t.text?.content ?? '').join(' ') ?? '';
                    break;
                case 'number':
                    result[name] = prop.number ?? null;
                    break;
                case 'date':
                    result[name] = prop.date ? { start: prop.date.start, end: prop.date.end ?? undefined } : null;
                    break;
                case 'select':
                    result[name] = prop.select?.name ?? null;
                    break;
                case 'multi_select':
                    result[name] = (prop.multi_select ?? []).map((opt: any) => opt.name);
                    break;
                case 'checkbox':
                    result[name] = prop.checkbox ?? false;
                    break;
                case 'url':
                    result[name] = prop.url ?? null;
                    break;
                case 'email':
                    result[name] = prop.email ?? null;
                    break;
                case 'phone_number':
                    result[name] = prop.phone_number ?? null;
                    break;
                case 'people':
                    result[name] = (prop.people ?? []).map((p: any) => p.name ?? p.id);
                    break;
                case 'status':
                    result[name] = prop.status?.name ?? null;
                    break;
                default:
                    result[name] = null;
            }
        }

        return result;
    }
}

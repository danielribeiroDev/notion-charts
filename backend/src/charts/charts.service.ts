import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChartDto } from './dto/create-chart.dto';
import { UpdateChartDto } from './dto/update-chart.dto';
import { JwtPayload } from '../auth/types/jwt-payload';
import { NotionIntegrationService } from '../notion-integration/notion-integration.service';

@Injectable()
export class ChartsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notionService: NotionIntegrationService,
    ) { }

    async list(user: JwtPayload) {
        return this.prisma.chart.findMany({
            where: { workspace: { userId: user.sub } },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getById(user: JwtPayload, id: string) {
        const chart = await this.prisma.chart.findFirst({
            where: { id, workspace: { userId: user.sub } },
        });
        if (!chart) {
            throw new NotFoundException('Chart not found');
        }
        return chart;
    }

    async create(user: JwtPayload, dto: CreateChartDto) {
        const workspace = await this.prisma.workspace.findFirst({
            where: { id: dto.workspaceId, userId: user.sub },
        });
        if (!workspace) {
            throw new ForbiddenException('Workspace not found or not owned');
        }

        return this.prisma.chart.create({
            data: {
                workspaceId: dto.workspaceId,
                notionDatabaseId: dto.notionDatabaseId,
                configJson: dto.configJson as any,
                lastSyncedAt: dto.lastSyncedAt ? new Date(dto.lastSyncedAt) : undefined,
            },
        });
    }

    async update(user: JwtPayload, id: string, dto: UpdateChartDto) {
        const existing = await this.prisma.chart.findFirst({
            where: { id, workspace: { userId: user.sub } },
        });
        if (!existing) {
            throw new NotFoundException('Chart not found');
        }

        return this.prisma.chart.update({
            where: { id },
            data: {
                notionDatabaseId: dto.notionDatabaseId ?? existing.notionDatabaseId,
                configJson: (dto.configJson ?? existing.configJson) as any,
                lastSyncedAt: dto.lastSyncedAt ? new Date(dto.lastSyncedAt) : existing.lastSyncedAt,
            },
        });
    }

    async remove(user: JwtPayload, id: string) {
        const deleted = await this.prisma.chart.deleteMany({
            where: { id, workspace: { userId: user.sub } },
        });
        if (deleted.count === 0) {
            throw new NotFoundException('Chart not found');
        }
        return { success: true };
    }

    async compute(user: JwtPayload, chartId: string) {
        const chart = await this.prisma.chart.findFirst({
            where: { id: chartId, workspace: { userId: user.sub } },
        });
        if (!chart) {
            throw new NotFoundException('Chart not found');
        }

        const config = chart.configJson as Record<string, unknown>;
        const metrics = Array.isArray(config?.metrics) ? config.metrics : [];
        if (metrics.length === 0) return [];

        return this.notionService.aggregateMetric(
            {
                workspaceId: chart.workspaceId,
                databaseId: chart.notionDatabaseId,
                metrics: metrics as any,
            },
            user.sub,
        );
    }
}

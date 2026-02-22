import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetricConfigDto } from './dto/aggregate-metric.dto';
import { NotionFilterFactory } from './notion-filter.factory';
import { NotionHttpError, NotionHttpService } from './notion-http.service';

export interface AggregationResult {
    metricId: string;
    total: number;
    count: number;
    pagesProcessed: number;
    hitPageLimit: boolean;
}

@Injectable()
export class AggregationService {
    private readonly pageLimit: number;

    constructor(
        private readonly notionHttp: NotionHttpService,
        private readonly filterFactory: NotionFilterFactory,
        configService: ConfigService,
    ) {
        this.pageLimit = Number(configService.get<string>('NOTION_AGGREGATION_PAGE_LIMIT', '20')) || 20;
    }

    async aggregate(token: string, databaseId: string, config: MetricConfigDto): Promise<AggregationResult> {
        let total = 0;
        let count = 0;
        let pagesProcessed = 0;
        let cursor: string | undefined;
        let hitPageLimit = false;

        const filter = this.filterFactory.buildCompositeFilter(config);

        while (true) {
            if (pagesProcessed >= this.pageLimit) {
                hitPageLimit = true;
                break;
            }

            const body: Record<string, unknown> = {
                page_size: 100,
            };
            if (filter) body.filter = filter;
            if (cursor) body.start_cursor = cursor;

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
                if (err instanceof NotionHttpError) {
                    throw err;
                }
                throw err;
            }

            pagesProcessed += 1;

            for (const page of json.results ?? []) {
                const valueProp = page.properties?.[config.valueColumn];
                if (!valueProp || valueProp.type !== 'number') continue;
                const val = valueProp.number;
                if (typeof val !== 'number') continue;
                total += val;
                count += 1;
            }

            if (!json.has_more || !json.next_cursor) {
                break;
            }
            cursor = json.next_cursor ?? undefined;
        }

        return {
            metricId: config.id,
            total,
            count,
            pagesProcessed,
            hitPageLimit,
        };
    }
}

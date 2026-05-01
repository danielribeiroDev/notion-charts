import { Controller, Get, Param } from '@nestjs/common';
import { ChartsService } from './charts.service';

@Controller('embed')
export class EmbedController {
    constructor(private readonly chartsService: ChartsService) { }

    @Get(':chartId')
    async getEmbedData(@Param('chartId') chartId: string) {
        const result = await this.chartsService.computePublic(chartId);
        const config = result.chart.configJson as Record<string, unknown>;

        return {
            chart: {
                id: result.chart.id,
                name: (config as any)?.name ?? 'Chart',
                type: (config as any)?.type ?? 'stats',
                metrics: result.metrics,
                metricNames: Array.isArray((config as any)?.metricNames)
                    ? (config as any).metricNames
                    : [],
            },
        };
    }
}

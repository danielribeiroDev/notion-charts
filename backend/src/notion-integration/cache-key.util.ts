import { createHash } from 'crypto';
import { MetricConfigDto } from './dto/aggregate-metric.dto';

function stableSerialize(value: unknown): string {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
    }

    const entries = Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => `${JSON.stringify(k)}:${stableSerialize(v)}`);

    return `{${entries.join(',')}}`;
}

export function buildAggregationCacheKey(workspaceId: string, databaseId: string, metric: MetricConfigDto): string {
    const normalizedFilters = metric.filters?.map((filter) => ({
        property: filter.property,
        type: filter.type,
        value: filter.value,
    }));

    const payload = {
        workspaceId,
        databaseId,
        metricId: metric.id,
        valueColumn: metric.valueColumn,
        timeRange: metric.timeRange,
        dateProperty: metric.dateProperty,
        filters: normalizedFilters,
    };

    const stable = stableSerialize(payload);
    const hash = createHash('sha256').update(stable).digest('hex');
    return `notion:agg:${workspaceId}:${hash}`;
}

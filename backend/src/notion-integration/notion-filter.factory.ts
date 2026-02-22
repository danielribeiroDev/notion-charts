import { Injectable } from '@nestjs/common';
import { DateRange, MetricConfigDto, MetricFilterDto, MetricFilterType } from './dto/aggregate-metric.dto';

@Injectable()
export class NotionFilterFactory {
    buildCompositeFilter(config: MetricConfigDto) {
        const dateFilter = this.buildDateFilter(config.timeRange, config.dateProperty);
        const propertyFilters = this.buildPropertyFilters(config.filters);

        const filters: Array<Record<string, unknown>> = [];
        if (dateFilter) filters.push(dateFilter);
        if (propertyFilters.length) filters.push(...propertyFilters);

        if (!filters.length) return undefined;
        if (filters.length === 1) return filters[0];
        return { and: filters };
    }

    buildDateFilter(range?: DateRange, property?: string) {
        if (!range || range === DateRange.All) return undefined;

        const dateProperty = property?.trim() || 'last_edited_time';

        const now = new Date();
        const cutoff = this.computeCutoff(now, range);
        return {
            property: dateProperty,
            date: { on_or_after: cutoff.toISOString() },
        };
    }

    buildPropertyFilters(filters?: MetricFilterDto[]) {
        if (!filters?.length) return [];

        return filters
            .map((filter) => {
                const property = filter.property.trim();
                const value = filter.value;
                switch (filter.type) {
                    case MetricFilterType.MultiSelect:
                        return { property, multi_select: { contains: value } };
                    case MetricFilterType.Select:
                    case MetricFilterType.Status:
                        return { property, [filter.type]: { equals: value } } as Record<string, unknown>;
                    case MetricFilterType.Date:
                        return { property, date: { on_or_after: value } };
                    case MetricFilterType.Checkbox: {
                        const boolVal = value.toLowerCase() === 'true';
                        return { property, checkbox: { equals: boolVal } };
                    }
                    case MetricFilterType.People:
                        return { property, people: { contains: value } };
                    case MetricFilterType.Relation:
                        return { property, relation: { contains: value } };
                    case MetricFilterType.Number: {
                        const numericValue = Number(value);
                        if (Number.isNaN(numericValue)) return undefined;
                        return { property, number: { equals: numericValue } };
                    }
                    case MetricFilterType.Formula:
                        return { property, formula: { string: { equals: value } } };
                    default:
                        return undefined;
                }
            })
            .filter((filter): filter is Record<string, unknown> => Boolean(filter));
    }

    private computeCutoff(now: Date, range: DateRange) {
        const d = new Date(now.getTime());
        switch (range) {
            case DateRange.Last7d:
                d.setUTCDate(d.getUTCDate() - 7);
                break;
            case DateRange.Last30d:
                d.setUTCDate(d.getUTCDate() - 30);
                break;
            case DateRange.Last90d:
                d.setUTCDate(d.getUTCDate() - 90);
                break;
            case DateRange.Last12m:
                d.setUTCMonth(d.getUTCMonth() - 12);
                break;
        }
        return d;
    }
}

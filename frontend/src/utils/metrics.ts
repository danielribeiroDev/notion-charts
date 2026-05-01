import { type NotionDateProperty, type NotionFilterProperty, type NotionNumberProperty } from '@/lib/notion';
import { type ChartMetric } from '@/store/useAppStore';

export function createDefaultMetric(
    numberProps: NotionNumberProperty[],
    dateProps: NotionDateProperty[],
    filterProps: NotionFilterProperty[],
    createId: () => string,
): ChartMetric {
    const defaultFilterProp = filterProps[0];
    return {
        id: createId(),
        name: 'Metric 1',
        valueColumn: numberProps[0]?.name ?? '',
        dateProperty: dateProps[0]?.name ?? '',
        filters: defaultFilterProp
            ? {
                property: defaultFilterProp.name,
                type: defaultFilterProp.type,
                value: defaultFilterProp.type === 'checkbox' ? 'true' : defaultFilterProp.options?.[0]?.name ?? '',
            }
            : undefined,
        timeRange: 'none',
    };
}

export function normalizeMetrics(
    metrics: ChartMetric[],
    numberProps: NotionNumberProperty[],
    dateProps: NotionDateProperty[],
    filterProps: NotionFilterProperty[],
): ChartMetric[] {
    return metrics.map((metric, index) => {
        const valueColumnValid = numberProps.some((p) => p.name === metric.valueColumn)
            ? metric.valueColumn
            : numberProps[0]?.name ?? '';

        let dateColumnValid = metric.dateProperty;
        if (dateColumnValid && !dateProps.some((p) => p.name === dateColumnValid)) {
            dateColumnValid = dateProps[0]?.name ?? '';
        }
        if (!dateColumnValid && metric.timeRange && metric.timeRange !== 'none') {
            dateColumnValid = dateProps[0]?.name ?? '';
        }

        const currentProperty = metric.filters?.property;
        let nextFilters = metric.filters;

        if (currentProperty && currentProperty !== '') {
            const propMeta = filterProps.find((p) => p.name === currentProperty);
            if (!propMeta) {
                const fallback = filterProps[0];
                nextFilters = fallback
                    ? {
                        property: fallback.name,
                        type: fallback.type,
                        value: fallback.type === 'checkbox' ? 'true' : fallback.options?.[0]?.name ?? '',
                    }
                    : undefined;
            } else {
                const nextValue = propMeta.type === 'checkbox'
                    ? (metric.filters?.value ?? 'true')
                    : propMeta.type === 'formula'
                        ? metric.filters?.value ?? ''
                        : propMeta.options?.some((o) => o.name === metric.filters?.value)
                            ? metric.filters?.value
                            : propMeta.options?.[0]?.name ?? '';
                nextFilters = {
                    property: propMeta.name,
                    type: propMeta.type,
                    value: nextValue,
                };
            }
        } else if (metric.filters?.property === '') {
            nextFilters = { property: '', value: '', type: metric.filters?.type };
        }

        return {
            ...metric,
            name: metric.name || `Metric ${index + 1}`,
            valueColumn: valueColumnValid,
            filters: nextFilters,
            timeRange: metric.timeRange || 'none',
            dateProperty: dateColumnValid,
        };
    });
}

export function validateMetrics(metrics: ChartMetric[]) {
    if (metrics.length === 0 || metrics.some((m) => !m.valueColumn)) {
        return { ok: false, message: 'Add at least one metric with a numeric column.' };
    }

    const missingDate = metrics.some((m) => (m.timeRange && m.timeRange !== 'none') && !m.dateProperty);
    if (missingDate) {
        return { ok: false, message: 'Select a date column for every metric that uses a time filter.' };
    }

    return { ok: true } as const;
}

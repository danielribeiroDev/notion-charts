import { useEffect, useState } from 'react';
import { fetchDatabaseSum } from '@/lib/notion';
import { type ChartConfig, type ChartMetric, type NotionConnection } from '@/store/useAppStore';

type AggregateState = Record<string, Record<string, { loading: boolean; error?: string; total?: number; count?: number }>>;

function buildMetricsList(chart: ChartConfig): ChartMetric[] {
    if (chart.metrics && chart.metrics.length > 0) return chart.metrics;
    return [{
        id: chart.id,
        name: chart.name,
        valueColumn: chart.valueColumn || '',
        filters: chart.filters as ChartMetric['filters'],
        timeRange: 'none',
        dateProperty: undefined,
    }];
}

export function useNotionMetricAggregates(charts: ChartConfig[], notionConnection: NotionConnection | null) {
    const [aggregates, setAggregates] = useState<AggregateState>({});

    useEffect(() => {
        if (!notionConnection) return;
        if (!charts || charts.length === 0) {
            setAggregates({});
            return;
        }

        setAggregates({});

        charts.forEach((chart) => {
            if (chart.type !== 'stats' || !chart.notionDatabaseId) return;
            const metricsList = buildMetricsList(chart);

            metricsList.forEach((metric) => {
                if (!metric.valueColumn) return;

                setAggregates((prev) => ({
                    ...prev,
                    [chart.id]: {
                        ...prev[chart.id],
                        [metric.id]: { loading: true },
                    },
                }));

                const filterMeta = metric.filters;
                fetchDatabaseSum(
                    notionConnection.accessToken,
                    chart.notionDatabaseId,
                    metric.valueColumn,
                    filterMeta?.property && filterMeta.value
                        ? { property: filterMeta.property, value: filterMeta.value, type: filterMeta.type }
                        : undefined,
                    metric.timeRange || 'none',
                    metric.dateProperty,
                )
                    .then(({ total, count }) => {
                        setAggregates((prev) => ({
                            ...prev,
                            [chart.id]: {
                                ...prev[chart.id],
                                [metric.id]: { loading: false, total, count },
                            },
                        }));
                    })
                    .catch((error) => {
                        const message = error instanceof Error ? error.message : 'Não foi possível calcular o total.';
                        setAggregates((prev) => ({
                            ...prev,
                            [chart.id]: {
                                ...prev[chart.id],
                                [metric.id]: { loading: false, error: message },
                            },
                        }));
                    });
            });
        });
    }, [charts, notionConnection]);

    return { aggregates };
}

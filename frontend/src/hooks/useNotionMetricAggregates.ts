import { useEffect, useState } from 'react';
import { computeChartMetrics } from '@/lib/charts';
import { type ChartConfig, type ChartMetric } from '@/store/useAppStore';

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

export function useNotionMetricAggregates(charts: ChartConfig[]) {
    const [aggregates, setAggregates] = useState<AggregateState>({});

    useEffect(() => {
        if (!charts || charts.length === 0) {
            setAggregates({});
            return;
        }

        setAggregates({});

        charts.forEach((chart) => {
            if (chart.type !== 'stats' || !chart.notionDatabaseId) return;
            const metricsList = buildMetricsList(chart);
            if (metricsList.length === 0 || !metricsList[0].valueColumn) return;

            setAggregates((prev) => ({
                ...prev,
                [chart.id]: Object.fromEntries(
                    metricsList.map((m) => [m.id, { loading: true }])
                ),
            }));

            computeChartMetrics(chart.id)
                .then((results) => {
                    const metricsMap: Record<string, { loading: boolean; total?: number; count?: number }> = {};
                    for (const r of results) {
                        metricsMap[r.metricId] = { loading: false, total: r.total, count: r.count };
                    }
                    setAggregates((prev) => ({
                        ...prev,
                        [chart.id]: { ...prev[chart.id], ...metricsMap },
                    }));
                })
                .catch((error) => {
                    const message = error instanceof Error ? error.message : 'Unable to calculate the total.';
                    setAggregates((prev) => ({
                        ...prev,
                        [chart.id]: Object.fromEntries(
                            metricsList.map((m) => [m.id, { loading: false, error: message }])
                        ),
                    }));
                });
        });
    }, [charts]);

    return { aggregates };
}

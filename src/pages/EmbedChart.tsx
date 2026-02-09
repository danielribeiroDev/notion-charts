import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { useAppStore, type ChartMetric } from '@/store/useAppStore';
import { Card, CardContent } from '@/components/ui/card';
import { fetchDatabaseSum } from '@/lib/notion';

export default function EmbedChart() {
  const { chartId } = useParams<{ chartId: string }>();
  const { charts, notionConnection } = useAppStore();

  const [error, setError] = useState<string | null>(null);
  const [metricStates, setMetricStates] = useState<Record<string, { loading: boolean; error?: string; total?: number; count?: number }>>({});

  const chart = charts.find((c) => c.id === chartId);

  useEffect(() => {
    if (!chart || chart.type !== 'stats') return;
    if (!notionConnection || !chart.notionDatabaseId) {
      setError('Configuração insuficiente para carregar este chart.');
      return;
    }

    const metricsList: ChartMetric[] = chart.metrics && chart.metrics.length > 0
      ? chart.metrics
      : [{
        id: chart.id,
        name: chart.name,
        valueColumn: chart.valueColumn || '',
        filters: chart.filters as ChartMetric['filters'],
      }];

    if (metricsList.length === 0 || metricsList.every((m) => !m.valueColumn)) {
      setError('Nenhuma métrica configurada para este chart.');
      return;
    }

    setError(null);

    metricsList.forEach((metric) => {
      if (!metric.valueColumn) return;

      setMetricStates((prev) => ({
        ...prev,
        [metric.id]: { loading: true },
      }));

      const filterMeta = metric.filters;

      fetchDatabaseSum(
        notionConnection.accessToken,
        chart.notionDatabaseId!,
        metric.valueColumn,
        filterMeta?.property && filterMeta.value
          ? { property: filterMeta.property, value: filterMeta.value, type: filterMeta.type }
          : undefined,
        metric.timeRange || 'none',
        metric.dateProperty
      )
        .then(({ total, count }) => {
          setMetricStates((prev) => ({
            ...prev,
            [metric.id]: { loading: false, total, count },
          }));
        })
        .catch((err) => {
          const msg = err instanceof Error ? err.message : 'Não foi possível carregar o chart.';
          setMetricStates((prev) => ({
            ...prev,
            [metric.id]: { loading: false, error: msg },
          }));
        });
    });
  }, [chart, notionConnection]);

  if (!chart) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Gráfico não encontrado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderChart = () => {
    if (chart.type !== 'stats') {
      return <p className="text-sm text-muted-foreground">Tipo de gráfico não suportado neste embed.</p>;
    }

    if (error) {
      return <p className="text-sm text-destructive">{error}</p>;
    }

    const metricsList: ChartMetric[] = chart.metrics && chart.metrics.length > 0
      ? chart.metrics
      : [{ id: chart.id, name: chart.name, valueColumn: chart.valueColumn || '', filters: chart.filters as ChartMetric['filters'] }];

    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {metricsList.map((metric, idx) => {
          const state = metricStates[metric.id];
          const filterMeta = metric.filters;

          if (!state) {
            return (
              <Card key={metric.id} className="bg-secondary/50">
                <CardContent className="p-6 text-sm text-muted-foreground">Preparando dados...</CardContent>
              </Card>
            );
          }

          if (state.error) {
            return (
              <Card key={metric.id} className="bg-secondary/50">
                <CardContent className="p-6 text-sm text-destructive">{state.error}</CardContent>
              </Card>
            );
          }

          if (state.loading || state.total === undefined || state.count === undefined) {
            return (
              <Card key={metric.id} className="bg-secondary/50">
                <CardContent className="p-6 text-sm text-muted-foreground">Carregando...</CardContent>
              </Card>
            );
          }

          return (
            <Card key={metric.id} className="bg-secondary/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {metric.name || `Métrica ${idx + 1}`}
                      {filterMeta?.property && filterMeta.value && (
                        <span className="ml-1 text-xs text-muted-foreground">({filterMeta.property}: {filterMeta.value})</span>
                      )}
                    </p>
                    <p className="text-3xl font-bold">
                      {state.total.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">{state.count} registros</p>
                  </div>
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <Card className="mx-auto max-w-3xl">
        <CardContent className="p-6">
          <h2 className="mb-6 text-xl font-semibold">{chart.name}</h2>
          {renderChart()}
        </CardContent>
      </Card>
    </div>
  );
}

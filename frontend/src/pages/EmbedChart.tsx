import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { fetchEmbedData, type EmbedData, type ComputedMetric } from '@/lib/charts';

export default function EmbedChart() {
  const { chartId } = useParams<{ chartId: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EmbedData | null>(null);

  useEffect(() => {
    if (!chartId) {
      setError('Chart ID not provided.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetchEmbedData(chartId)
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Unable to load chart.';
        setError(msg);
        setLoading(false);
      });
  }, [chartId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{error ?? 'Chart not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { chart } = data;

  if (chart.type !== 'stats') {
    return (
      <div className="min-h-screen bg-background p-6">
        <Card className="mx-auto max-w-3xl">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              Chart type not supported in this embed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <Card className="mx-auto max-w-3xl">
        <CardContent className="p-6">
          <h2 className="mb-6 text-xl font-semibold">{chart.name}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {chart.metrics.map((metric: ComputedMetric, idx: number) => (
              <Card key={metric.metricId} className="bg-secondary/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {chart.metricNames[idx] || `Metric ${idx + 1}`}
                      </p>
                      <p className="text-3xl font-bold">
                        {metric.total.toLocaleString('en-US', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {metric.count} records
                      </p>
                    </div>
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

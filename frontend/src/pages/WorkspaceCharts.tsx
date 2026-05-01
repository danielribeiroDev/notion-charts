import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, ArrowLeft, TrendingUp, Database, BarChart3, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore, type ChartConfig, type ChartMetric } from '@/store/useAppStore';
import { useToast } from '@/hooks/use-toast';
import { listNotionDatabases, type NotionDatabaseOption } from '@/lib/notion';
import { useNotionDatabaseMeta } from '@/hooks/useNotionDatabaseMeta';
import { useNotionMetricAggregates } from '@/hooks/useNotionMetricAggregates';
import { ChartCard } from '@/components/charts/ChartCard';
import { MetricFields } from '@/components/charts/MetricFields';
import { timeOptions, NO_DATE_VALUE, NO_FILTER_VALUE } from '@/lib/timeRanges';
import { createDefaultMetric, normalizeMetrics, validateMetrics } from '@/utils/metrics';
import { fetchCharts, createChart, updateChartApi, deleteChartApi, buildConfigJson } from '@/lib/charts';

const chartTypeIcons = {
  stats: TrendingUp,
};

export default function WorkspaceCharts() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { workspaces, charts, setCharts, deleteChart } = useAppStore();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChart, setEditingChart] = useState<string | null>(null);
  const [chartName, setChartName] = useState('');
  const [chartType, setChartType] = useState<ChartConfig['type']>('stats');
  const [selectedDatabaseId, setSelectedDatabaseId] = useState('');
  const [databases, setDatabases] = useState<NotionDatabaseOption[]>([]);
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ChartMetric[]>([]);
  const [isLoadingCharts, setIsLoadingCharts] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const createMetricId = () => Math.random().toString(36).slice(2, 9);

  const addMetric = () => {
    setMetrics((prev) => [...prev, createDefaultMetric(numberProps, dateProps, filterProps, createMetricId)]);
  };

  const removeMetric = (metricId: string) => {
    setMetrics((prev) => (prev.length <= 1 ? prev : prev.filter((m) => m.id !== metricId)));
  };

  const updateMetric = (metricId: string, updater: (metric: ChartMetric) => ChartMetric) => {
    setMetrics((prev) => prev.map((metric) => (metric.id === metricId ? updater(metric) : metric)));
  };

  const workspace = workspaces.find((w) => w.id === workspaceId);
  const workspaceCharts = useMemo(() => charts.filter((c) => c.workspaceId === workspaceId), [charts, workspaceId]);

  const notionAuthUrl = useMemo(() => {
    if (!workspaceId) return null;
    const clientId = import.meta.env.VITE_NOTION_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_NOTION_REDIRECT_URI;
    if (!clientId || !redirectUri) return null;
    const state = `workspaceId=${encodeURIComponent(workspaceId)}`;
    return `https://api.notion.com/v1/oauth/authorize?client_id=${encodeURIComponent(clientId)}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
  }, [workspaceId]);

  const {
    numberProps,
    dateProps,
    filterProps,
    isLoadingNumberProps,
    isLoadingDateProps,
    isLoadingFilterProps,
    numberPropsError,
    datePropsError,
    filterPropsError,
  } = useNotionDatabaseMeta({ notionConnected: workspace?.notionConnected ?? false, workspaceId, databaseId: selectedDatabaseId, enabled: isModalOpen });

  const { aggregates } = useNotionMetricAggregates(workspaceCharts);

  useEffect(() => {
    const load = async () => {
      setIsLoadingCharts(true);
      try {
        const data = await fetchCharts();
        setCharts(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to load charts.';
        toast({ title: 'Error', description: message, variant: 'destructive' });
      } finally {
        setIsLoadingCharts(false);
      }
    };
    load();
  }, [setCharts, toast]);

  useEffect(() => {
    if (!isModalOpen || !workspace?.notionConnected) return;
    if (databases.length > 0 && !databaseError) return;
    setIsLoadingDatabases(true);
    setDatabaseError(null);

    if (!workspaceId) return;

    listNotionDatabases({ workspaceId })
      .then((page) => setDatabases(page.items))
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Unable to load Notion databases.';
        setDatabaseError(message);
        toast({
          title: 'Error loading databases',
          description: message,
          variant: 'destructive',
        });
      })
      .finally(() => setIsLoadingDatabases(false));
  }, [isModalOpen, workspace?.notionConnected, databases.length, databaseError, toast, workspaceId]);

  useEffect(() => {
    if (!isModalOpen || !selectedDatabaseId) {
      setMetrics([]);
    }
  }, [isModalOpen, selectedDatabaseId]);

  useEffect(() => {
    if (!isModalOpen || !selectedDatabaseId) return;

    setMetrics((prev) => {
      if (prev.length === 0 && numberProps.length > 0) {
        return [createDefaultMetric(numberProps, dateProps, filterProps, createMetricId)];
      }

      if (prev.length === 0) return prev;
      return normalizeMetrics(prev, numberProps, dateProps, filterProps);
    });
  }, [isModalOpen, selectedDatabaseId, numberProps, dateProps, filterProps]);

  if (!workspace) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Workspace not found</p>
            <Link to="/dashboard">
              <Button variant="link" className="mt-4">
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreateChart = async () => {
    if (!chartName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for the chart.',
        variant: 'destructive',
      });
      return;
    }

    if (!workspace?.notionConnected) {
      toast({
        title: 'Notion connection required',
        description: 'Connect to Notion before creating charts.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedDatabaseId) {
      toast({
        title: 'Select a database',
        description: 'Choose a Notion database for the chart.',
        variant: 'destructive',
      });
      return;
    }

    const normalizedMetrics = normalizeMetrics(metrics, numberProps, dateProps, filterProps);
    const validation = validateMetrics(normalizedMetrics);
    if (!validation.ok) {
      toast({
        title: 'Configure metrics',
        description: validation.message,
        variant: 'destructive',
      });
      return;
    }

    const metricsPayload: ChartMetric[] = normalizedMetrics.map((metric, index) => ({
      id: metric.id || createMetricId(),
      name: metric.name || `Metric ${index + 1}`,
      valueColumn: metric.valueColumn,
      filters: metric.filters?.property && metric.filters.value
        ? { property: metric.filters.property, value: metric.filters.value, type: metric.filters.type }
        : undefined,
      timeRange: metric.timeRange || 'none',
      dateProperty: metric.dateProperty || undefined,
    }));

    const configJson = buildConfigJson({
      name: chartName.trim(),
      type: chartType,
      metrics: metricsPayload,
    });

    setIsSaving(true);
    try {
      if (editingChart) {
        const updated = await updateChartApi(editingChart, {
          notionDatabaseId: selectedDatabaseId,
          configJson,
        });
        setCharts(charts.map((c) => (c.id === updated.id ? updated : c)));
        toast({
          title: 'Chart updated',
          description: `"${chartName}" was updated successfully.`,
        });
      } else {
        const created = await createChart({
          workspaceId: workspaceId!,
          notionDatabaseId: selectedDatabaseId,
          configJson,
        });
        setCharts([...charts, created]);
        toast({
          title: 'Chart created',
          description: `"${chartName}" was created successfully.`,
        });
      }

      setIsModalOpen(false);
      setChartName('');
      setChartType('stats');
      setSelectedDatabaseId('');
      setMetrics([]);
      setEditingChart(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save chart.';
      if (message.includes('Free plan allows only 1 chart')) {
        toast({
          title: 'Plan limit',
          description: 'The free plan allows only 1 chart. Upgrade to PRO.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Error saving', description: message, variant: 'destructive' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (chart: ChartConfig) => {
    setEditingChart(chart.id);
    setChartName(chart.name);
    setChartType(chart.type);
    setSelectedDatabaseId(chart.notionDatabaseId || '');
    const existingMetrics: ChartMetric[] = chart.metrics?.length
      ? chart.metrics.map((m, index) => ({ ...m, id: m.id || `${chart.id}-${index}`, timeRange: m.timeRange || 'none', dateProperty: m.dateProperty }))
      : [{
        id: createMetricId(),
        name: chart.name,
        valueColumn: chart.valueColumn || '',
        filters: chart.filters as ChartMetric['filters'],
        timeRange: 'none',
        dateProperty: undefined,
      }];
    setMetrics(existingMetrics);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteChartApi(id);
      deleteChart(id);
      toast({
        title: 'Chart deleted',
        description: `"${name}" was removed.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete chart.';
      toast({ title: 'Error deleting', description: message, variant: 'destructive' });
    }
  };

  const handleCopyEmbedLink = (chartId: string) => {
    const embedUrl = `${window.location.origin}/embed/${chartId}`;
    navigator.clipboard.writeText(embedUrl);
    toast({
      title: 'Link copied!',
      description: 'Paste the link in Notion to embed the chart.',
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link to="/dashboard" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Workspaces
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{workspace.name}</h1>
            <p className="text-muted-foreground">
              Manage charts for this workspace
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={workspace.notionConnected ? "default" : "destructive"}
              disabled={workspace.notionConnected || !notionAuthUrl}
              onClick={() => {
                if (!workspace.notionConnected && notionAuthUrl) {
                  window.location.href = notionAuthUrl;
                }
              }}
              className={workspace.notionConnected
                ? 'bg-green-600 hover:bg-green-600 text-white cursor-default'
                : ''
              }
            >
              <Link2 className="mr-2 h-4 w-4" />
              {workspace.notionConnected ? 'Notion connected' : 'Connect to Notion'}
            </Button>
            <Button
              onClick={() => {
                setEditingChart(null);
                setChartName('');
                setChartType('stats');
                setSelectedDatabaseId('');
                setMetrics([]);
                setIsModalOpen(true);
              }}
              className="neon-glow"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Chart
            </Button>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      {isLoadingCharts ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground">Loading charts...</p>
          </CardContent>
        </Card>
      ) : workspaceCharts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No Charts Yet</h3>
            <p className="mb-6 text-center text-muted-foreground">
              Create your first chart to visualize your Notion data
            </p>
            <Button
              onClick={() => {
                setEditingChart(null);
                setChartName('');
                setChartType('stats');
                setSelectedDatabaseId('');
                setMetrics([]);
                setIsModalOpen(true);
              }}
              className="neon-glow"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Chart
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {workspaceCharts.map((chart) => {
            const IconComponent = chartTypeIcons[chart.type] || TrendingUp;
            const metricsList: ChartMetric[] = chart.metrics && chart.metrics.length > 0
              ? chart.metrics
              : [{
                id: chart.id,
                name: chart.name,
                valueColumn: chart.valueColumn || '',
                filters: chart.filters as ChartMetric['filters'],
                timeRange: 'none',
                dateProperty: undefined,
              }];

            return (
              <ChartCard
                key={chart.id}
                chart={chart}
                metrics={metricsList}
                aggregates={aggregates[chart.id] ?? {}}
                IconComponent={IconComponent}
                onEdit={handleEdit}
                onCopyEmbedLink={handleCopyEmbedLink}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingChart ? 'Edit Chart' : 'Create Chart'}
            </DialogTitle>
            <DialogDescription>
              {editingChart
                ? 'Update your chart settings'
                : 'Set up your new chart'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="chartName" className="text-sm font-medium">
                Chart Name
              </label>
              <Input
                id="chartName"
                placeholder="e.g. Monthly Revenue"
                value={chartName}
                onChange={(e) => setChartName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Chart Type</label>
              <Select value={chartType} onValueChange={(v) => setChartType(v as ChartConfig['type'])}>
                <SelectTrigger>
                  <SelectValue placeholder="Stats Card" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stats">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Stats Card
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Notion database</span>
                {databaseError && <span className="text-xs text-destructive">Error</span>}
              </div>
              <Select
                value={selectedDatabaseId}
                onValueChange={(value) => setSelectedDatabaseId(value)}
                disabled={!workspace?.notionConnected || isLoadingDatabases}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingDatabases ? 'Loading databases...' : 'Select a shared database'} />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingDatabases && (
                    <SelectItem value="loading" disabled>
                      Loading databases...
                    </SelectItem>
                  )}
                  {!isLoadingDatabases && databases.length === 0 && !databaseError && (
                    <SelectItem value="empty" disabled>
                      No databases found for this integration
                    </SelectItem>
                  )}
                  {!isLoadingDatabases && databases.map((db) => (
                    <SelectItem key={db.id} value={db.id}>
                      <span className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        <span className="truncate">{db.title}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Share the database with the Notion integration to see it here.</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Metrics</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addMetric}
                  disabled={!selectedDatabaseId || numberProps.length === 0}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add metric
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Build multiple cards within the same chart.</p>

              {metrics.length === 0 && (
                <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                  Select a database to enable metrics.
                </p>
              )}

              <div className="space-y-3">
                {metrics.map((metric, index) => (
                  <MetricFields
                    key={metric.id}
                    metric={metric}
                    index={index}
                    metricsLength={metrics.length}
                    numberProps={numberProps}
                    dateProps={dateProps}
                    filterProps={filterProps}
                    timeOptions={timeOptions}
                    NO_FILTER_VALUE={NO_FILTER_VALUE}
                    NO_DATE_VALUE={NO_DATE_VALUE}
                    isLoadingNumberProps={isLoadingNumberProps}
                    isLoadingDateProps={isLoadingDateProps}
                    isLoadingFilterProps={isLoadingFilterProps}
                    numberPropsError={numberPropsError}
                    datePropsError={datePropsError}
                    filterPropsError={filterPropsError}
                    selectedDatabaseId={selectedDatabaseId}
                    updateMetric={updateMetric}
                    removeMetric={removeMetric}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateChart} className="neon-glow" disabled={isSaving}>
              {isSaving
                ? 'Saving...'
                : editingChart ? 'Save' : 'Create Chart'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
import { fetchNotionDatabases, listNotionDatabases, type NotionDatabaseOption } from '@/lib/notion';
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
  const { workspaces, charts, setCharts, deleteChart, notionConnection } = useAppStore();
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
  } = useNotionDatabaseMeta({ notionConnection, workspaceId, databaseId: selectedDatabaseId, enabled: isModalOpen });

  const { aggregates } = useNotionMetricAggregates(workspaceCharts);

  useEffect(() => {
    const load = async () => {
      setIsLoadingCharts(true);
      try {
        const data = await fetchCharts();
        setCharts(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Não foi possível carregar gráficos.';
        toast({ title: 'Erro', description: message, variant: 'destructive' });
      } finally {
        setIsLoadingCharts(false);
      }
    };
    load();
  }, [setCharts, toast]);

  useEffect(() => {
    if (!isModalOpen || !notionConnection) return;
    if (databases.length > 0 && !databaseError) return;
    setIsLoadingDatabases(true);
    setDatabaseError(null);

    const isServerManaged = notionConnection.accessToken === 'server-managed';
    const loadPromise = isServerManaged && workspaceId
      ? listNotionDatabases({ workspaceId }).then((page) => page.items)
      : fetchNotionDatabases(notionConnection.accessToken);

    loadPromise
      .then((data) => setDatabases(data))
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Não foi possível carregar bases do Notion.';
        setDatabaseError(message);
        toast({
          title: 'Erro ao carregar bases',
          description: message,
          variant: 'destructive',
        });
      })
      .finally(() => setIsLoadingDatabases(false));
  }, [isModalOpen, notionConnection, databases.length, databaseError, toast, workspaceId]);

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
            <p className="text-muted-foreground">Workspace não encontrado</p>
            <Link to="/dashboard">
              <Button variant="link" className="mt-4">
                Voltar para Dashboard
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
        title: 'Nome obrigatório',
        description: 'Por favor, insira um nome para o gráfico.',
        variant: 'destructive',
      });
      return;
    }

    if (!notionConnection) {
      toast({
        title: 'Conexão com Notion necessária',
        description: 'Conecte-se ao Notion antes de criar gráficos.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedDatabaseId) {
      toast({
        title: 'Selecione uma base',
        description: 'Escolha uma database do Notion para o gráfico.',
        variant: 'destructive',
      });
      return;
    }

    const normalizedMetrics = normalizeMetrics(metrics, numberProps, dateProps, filterProps);
    const validation = validateMetrics(normalizedMetrics);
    if (!validation.ok) {
      toast({
        title: 'Configure as métricas',
        description: validation.message,
        variant: 'destructive',
      });
      return;
    }

    const metricsPayload: ChartMetric[] = normalizedMetrics.map((metric, index) => ({
      id: metric.id || createMetricId(),
      name: metric.name || `Métrica ${index + 1}`,
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
          title: 'Gráfico atualizado',
          description: `"${chartName}" foi atualizado com sucesso.`,
        });
      } else {
        const created = await createChart({
          workspaceId: workspaceId!,
          notionDatabaseId: selectedDatabaseId,
          configJson,
        });
        setCharts([...charts, created]);
        toast({
          title: 'Gráfico criado',
          description: `"${chartName}" foi criado com sucesso.`,
        });
      }

      setIsModalOpen(false);
      setChartName('');
      setChartType('stats');
      setSelectedDatabaseId('');
      setMetrics([]);
      setEditingChart(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar o gráfico.';
      if (message.includes('Free plan allows only 1 chart')) {
        toast({
          title: 'Limite do plano',
          description: 'O plano gratuito permite apenas 1 gráfico. Faça upgrade para PRO.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Erro ao salvar', description: message, variant: 'destructive' });
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
        title: 'Gráfico excluído',
        description: `"${name}" foi removido.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível excluir o gráfico.';
      toast({ title: 'Erro ao excluir', description: message, variant: 'destructive' });
    }
  };

  const handleCopyEmbedLink = (chartId: string) => {
    const embedUrl = `${window.location.origin}/embed/${chartId}`;
    navigator.clipboard.writeText(embedUrl);
    toast({
      title: 'Link copiado!',
      description: 'Cole o link no Notion para embedar o gráfico.',
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link to="/dashboard" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Workspaces
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{workspace.name}</h1>
            <p className="text-muted-foreground">
              Gerencie os gráficos deste workspace
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={!notionAuthUrl}
              onClick={() => notionAuthUrl && (window.location.href = notionAuthUrl)}
            >
              <Link2 className="mr-2 h-4 w-4" />
              {notionConnection ? 'Reconectar Notion' : 'Conectar Notion'}
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
            <p className="text-muted-foreground">Carregando gráficos...</p>
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
              Crie seu primeiro gráfico para visualizar seus dados do Notion
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
              {editingChart ? 'Editar Gráfico' : 'Criar Gráfico'}
            </DialogTitle>
            <DialogDescription>
              {editingChart
                ? 'Altere as configurações do seu gráfico'
                : 'Configure seu novo gráfico'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="chartName" className="text-sm font-medium">
                Nome do Gráfico
              </label>
              <Input
                id="chartName"
                placeholder="Ex: Receitas Mensais"
                value={chartName}
                onChange={(e) => setChartName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Gráfico</label>
              <Select value={chartType} onValueChange={(v) => setChartType(v as ChartConfig['type'])}>
                <SelectTrigger>
                  <SelectValue placeholder="Card de Estatísticas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stats">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Card de Estatísticas
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Database do Notion</span>
                {databaseError && <span className="text-xs text-destructive">Erro</span>}
              </div>
              <Select
                value={selectedDatabaseId}
                onValueChange={(value) => setSelectedDatabaseId(value)}
                disabled={!notionConnection || isLoadingDatabases}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingDatabases ? 'Carregando bases...' : 'Selecione uma base compartilhada'} />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingDatabases && (
                    <SelectItem value="loading" disabled>
                      Carregando bases...
                    </SelectItem>
                  )}
                  {!isLoadingDatabases && databases.length === 0 && !databaseError && (
                    <SelectItem value="empty" disabled>
                      Nenhuma base encontrada para esta integração
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
              <p className="text-xs text-muted-foreground">Compartilhe a database com a integração do Notion para aparecer aqui.</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Métricas</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addMetric}
                  disabled={!selectedDatabaseId || numberProps.length === 0}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar métrica
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Monte vários cartões dentro do mesmo chart.</p>

              {metrics.length === 0 && (
                <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                  Selecione uma database para habilitar métricas.
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
              Cancelar
            </Button>
            <Button onClick={handleCreateChart} className="neon-glow" disabled={isSaving}>
              {isSaving
                ? 'Salvando...'
                : editingChart ? 'Salvar' : 'Criar Gráfico'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

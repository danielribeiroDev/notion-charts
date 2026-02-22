import { apiFetch } from './api';
import { type ChartMetric, type ChartConfig } from '@/store/useAppStore';

export type MetricFilterType = 'select' | 'status' | 'multi_select' | 'date' | 'checkbox' | 'people' | 'relation' | 'number' | 'formula';

export interface MetricConfigPayload {
  id: string;
  valueColumn: string;
  timeRange?: 'last7d' | 'last30d' | 'last90d' | 'last12m' | 'all';
  dateProperty?: string;
  filters?: {
    property: string;
    type: MetricFilterType;
    value: string;
  }[];
}

interface ChartApiModel {
  id: string;
  workspaceId: string;
  notionDatabaseId: string;
  configJson: Record<string, unknown>;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export function mapApiChartToConfig(api: ChartApiModel): ChartConfig {
  const config = api.configJson ?? {};
  const metricsRaw = Array.isArray((config as any).metrics) ? (config as any).metrics : [];
  const metricNames = Array.isArray((config as any).metricNames) ? (config as any).metricNames : [];
  const metrics: ChartMetric[] = metricsRaw.map((m: any, idx: number) => ({
    id: typeof m.id === 'string' ? m.id : `${api.id}-metric-${idx}`,
    name: typeof metricNames[idx] === 'string' ? metricNames[idx] : `Métrica ${idx + 1}`,
    valueColumn: m.valueColumn ?? '',
    filters: m.filters && Array.isArray(m.filters) && m.filters.length > 0
      ? m.filters[0]
      : undefined,
    timeRange: m.timeRange ?? 'none',
    dateProperty: m.dateProperty,
  }));

  return {
    id: api.id,
    workspaceId: api.workspaceId,
    name: (config as any).name ?? 'Chart',
    type: (config as any).type ?? 'stats',
    notionDatabaseId: api.notionDatabaseId,
    metrics,
    valueColumn: metrics[0]?.valueColumn,
    filters: metrics[0]?.filters,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
    lastSyncedAt: api.lastSyncedAt,
  };
}

export async function fetchCharts(): Promise<ChartConfig[]> {
  const data = await apiFetch<ChartApiModel[]>('/charts');
  return data.map(mapApiChartToConfig);
}

export async function createChart(payload: {
  workspaceId: string;
  notionDatabaseId: string;
  configJson: Record<string, unknown>;
  lastSyncedAt?: string;
}): Promise<ChartConfig> {
  const data = await apiFetch<ChartApiModel>('/charts', 'POST', payload);
  return mapApiChartToConfig(data);
}

export async function updateChartApi(id: string, payload: Partial<{
  notionDatabaseId: string;
  configJson: Record<string, unknown>;
  lastSyncedAt?: string;
}>): Promise<ChartConfig> {
  const data = await apiFetch<ChartApiModel>(`/charts/${id}`, 'PATCH', payload);
  return mapApiChartToConfig(data);
}

export async function deleteChartApi(id: string): Promise<void> {
  await apiFetch(`/charts/${id}`, 'DELETE');
}

export interface ComputedMetric {
  metricId: string;
  total: number;
  count: number;
  processedPages: number;
  isPartial: boolean;
  source: 'cache' | 'api';
}

export async function computeChartMetrics(chartId: string): Promise<ComputedMetric[]> {
  return apiFetch<ComputedMetric[]>(`/charts/${chartId}/compute`, 'POST');
}

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

export function buildConfigJson(params: {
  name: string;
  type: string;
  metrics: ChartMetric[];
}): Record<string, unknown> {
  const metricNames: string[] = [];
  const metricsPayload: MetricConfigPayload[] = params.metrics.map((m) => {
    metricNames.push(m.name || 'Métrica');

    const filters: MetricConfigPayload['filters'] =
      m.filters?.property && m.filters?.value && m.filters?.type
        ? [{ property: m.filters.property, type: m.filters.type as MetricFilterType, value: m.filters.value }]
        : undefined;

    const timeRange = m.timeRange && m.timeRange !== 'none' ? m.timeRange : undefined;

    return {
      id: isValidUUID(m.id) ? m.id : crypto.randomUUID(),
      valueColumn: m.valueColumn,
      timeRange,
      dateProperty: timeRange ? m.dateProperty : undefined,
      filters,
    };
  });

  return {
    name: params.name,
    type: params.type,
    metrics: metricsPayload,
    metricNames,
  };
}

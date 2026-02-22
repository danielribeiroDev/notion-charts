import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NotionConnection {
  accessToken: string;
  workspaceName: string;
  workspaceIcon?: string;
  botId: string;
}

export interface Workspace {
  id: string;
  name: string;
  notionPageId?: string;
  notionPageTitle?: string;
  notionPageUrl?: string;
  notionPageIcon?: string;
  notionPageType?: 'page' | 'database';
  notionDatabaseId?: string;
  notionDatabaseName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChartMetric {
  id: string;
  name: string;
  valueColumn: string;
  filters?: {
    property?: string;
    value?: string;
    type?: 'select' | 'multi_select' | 'status' | 'checkbox' | 'formula' | 'date' | 'people' | 'relation' | 'number';
  };
  timeRange?: 'none' | 'last7d' | 'last30d' | 'last90d' | 'last12m';
  dateProperty?: string;
}

export interface ChartConfig {
  id: string;
  workspaceId: string;
  name: string;
  type: 'bar' | 'line' | 'pie' | 'stats';
  notionDatabaseId: string;
  lastSyncedAt?: string;
  // valueColumn is kept for backwards compatibility with single-metric charts
  valueColumn?: string;
  labelColumn?: string;
  filters?: ChartMetric['filters'];
  metrics?: ChartMetric[];
  createdAt: string;
  updatedAt: string;
}

interface AppState {
  // Auth
  user: { email: string } | null;
  accessToken: string | null;
  refreshToken: string | null;
  notionConnection: NotionConnection | null;
  setNotionConnection: (connection: NotionConnection | null) => void;
  setSession: (data: { user: { email: string } | null; accessToken: string | null; refreshToken: string | null }) => void;
  isAuthenticated: boolean;

  // Workspaces
  workspaces: Workspace[];
  setWorkspaces: (workspaces: Workspace[]) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  deleteWorkspace: (id: string) => void;

  // Charts
  charts: ChartConfig[];
  setCharts: (charts: ChartConfig[]) => void;
  addChart: (chart: Omit<ChartConfig, 'id' | 'createdAt' | 'updatedAt'>) => ChartConfig;
  updateChart: (id: string, updates: Partial<ChartConfig>) => void;
  deleteChart: (id: string) => void;

  // UI State
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Actions
  logout: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      accessToken: null,
      refreshToken: null,
      notionConnection: null,
      isAuthenticated: false,
      setSession: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken, isAuthenticated: !!accessToken }),
      setNotionConnection: (connection) => set({ notionConnection: connection }),

      // Workspaces
      workspaces: [],
      setWorkspaces: (workspaces) => set({ workspaces }),
      addWorkspace: (workspace) =>
        set((state) => ({ workspaces: [...state.workspaces, workspace] })),
      updateWorkspace: (id, updates) =>
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === id ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w
          ),
        })),
      deleteWorkspace: (id) =>
        set((state) => ({
          workspaces: state.workspaces.filter((w) => w.id !== id),
          charts: state.charts.filter((c) => c.workspaceId !== id),
        })),

      // Charts
      charts: [],
      setCharts: (charts) => set({ charts }),
      addChart: (chart) => {
        const hasMetrics = Array.isArray(chart.metrics) && chart.metrics.length > 0;
        const metrics: ChartMetric[] = hasMetrics
          ? chart.metrics!.map((m) => ({ ...m, timeRange: m.timeRange ?? 'none' }))
          : [{
            id: generateId(),
            name: chart.name,
            valueColumn: chart.valueColumn || '',
            filters: chart.filters,
            timeRange: 'none',
            dateProperty: undefined,
          }];
        const newChart: ChartConfig = {
          ...chart,
          metrics,
          valueColumn: metrics[0]?.valueColumn,
          filters: hasMetrics ? undefined : chart.filters,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ charts: [...state.charts, newChart] }));
        return newChart;
      },
      updateChart: (id, updates) =>
        set((state) => ({
          charts: state.charts.map((c) =>
            c.id === id
              ? (() => {
                const nextMetrics: ChartMetric[] = Array.isArray(updates.metrics) && updates.metrics.length > 0
                  ? updates.metrics.map((m) => ({ ...m, timeRange: m.timeRange ?? 'none' }))
                  : c.metrics && c.metrics.length > 0
                    ? c.metrics
                    : [{ id: generateId(), name: updates.name || c.name, valueColumn: updates.valueColumn || c.valueColumn || '', filters: updates.filters || c.filters, timeRange: 'none', dateProperty: undefined }];
                return {
                  ...c,
                  ...updates,
                  metrics: nextMetrics,
                  valueColumn: nextMetrics[0]?.valueColumn,
                  filters: updates.metrics ? undefined : updates.filters ?? c.filters,
                  updatedAt: new Date().toISOString(),
                };
              })()
              : c
          ),
        })),
      deleteChart: (id) =>
        set((state) => ({
          charts: state.charts.filter((c) => c.id !== id),
        })),

      // UI State
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      // Actions
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          notionConnection: null,
          isAuthenticated: false,
          workspaces: [],
          charts: [],
        }),
    }),
    {
      name: 'notioncharts-storage',
    }
  )
);

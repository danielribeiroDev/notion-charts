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
  notionDatabaseId?: string;
  notionDatabaseName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChartConfig {
  id: string;
  workspaceId: string;
  name: string;
  type: 'bar' | 'line' | 'pie' | 'stats';
  notionDatabaseId: string;
  valueColumn: string;
  labelColumn?: string;
  filters?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface AppState {
  // Auth
  notionConnection: NotionConnection | null;
  setNotionConnection: (connection: NotionConnection | null) => void;
  isAuthenticated: boolean;
  
  // Workspaces
  workspaces: Workspace[];
  addWorkspace: (workspace: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>) => Workspace;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  deleteWorkspace: (id: string) => void;
  
  // Charts
  charts: ChartConfig[];
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
      notionConnection: null,
      isAuthenticated: false,
      setNotionConnection: (connection) => 
        set({ notionConnection: connection, isAuthenticated: !!connection }),
      
      // Workspaces
      workspaces: [],
      addWorkspace: (workspace) => {
        const newWorkspace: Workspace = {
          ...workspace,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ workspaces: [...state.workspaces, newWorkspace] }));
        return newWorkspace;
      },
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
      addChart: (chart) => {
        const newChart: ChartConfig = {
          ...chart,
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
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
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

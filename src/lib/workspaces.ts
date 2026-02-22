import { apiFetch } from './api';
import { type Workspace } from '@/store/useAppStore';

export async function fetchWorkspaces(): Promise<Workspace[]> {
    return apiFetch<Workspace[]>('/workspaces', 'GET');
}

export async function createWorkspace(name: string): Promise<Workspace> {
    return apiFetch<Workspace>('/workspaces', 'POST', { name });
}

export async function updateWorkspaceApi(id: string, name: string): Promise<Workspace> {
    return apiFetch<Workspace>(`/workspaces/${id}`, 'PATCH', { name });
}

export async function deleteWorkspaceApi(id: string): Promise<void> {
    await apiFetch<void>(`/workspaces/${id}`, 'DELETE');
}

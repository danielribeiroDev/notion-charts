import { NotionConnection, useAppStore } from '@/store/useAppStore';
import { apiFetch } from './api';

const NOTION_BASE_URL = import.meta.env.VITE_NOTION_PROXY_URL ?? 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const BACKEND_NOTION_INTEGRATION_URL = '/api/integrations/notion/exchange';

type Envelope<T> = { data: T | T[]; meta?: unknown };

function unwrapFirst<T>(enveloped: Envelope<T>): T {
    const payload = Array.isArray(enveloped?.data) ? enveloped.data[0] : enveloped?.data;
    if (payload === undefined || payload === null) {
        throw new Error('Resposta inesperada do servidor (corpo vazio).');
    }
    return payload as T;
}

export interface NotionPageOption {
    id: string;
    title: string;
    icon?: string;
    url?: string;
    lastEdited?: string;
    type: 'page' | 'database';
}

export interface NotionDatabaseOption {
    id: string;
    title: string;
    icon?: string;
    url?: string;
}

export interface NotionDatabasesPage {
    items: NotionDatabaseOption[];
    hasMore: boolean;
    nextCursor?: string | null;
}

export interface NotionNumberProperty {
    name: string;
    type: 'number';
}

export interface NotionDateProperty {
    name: string;
    type: 'date';
}

export interface NotionSelectOption {
    id?: string;
    name: string;
    color?: string;
}

export interface NotionFilterProperty {
    name: string;
    type: 'select' | 'multi_select' | 'status' | 'checkbox' | 'formula';
    options: NotionSelectOption[];
}

export interface NotionSchemaProperty {
    id: string;
    name: string;
    type: string;
    options?: NotionSelectOption[];
}

export interface NotionDatabaseSchema {
    id: string;
    title: string;
    properties: NotionSchemaProperty[];
}

export type NotionTimeRange = 'none' | 'last7d' | 'last30d' | 'last90d' | 'last12m';

type NotionRichText = { plain_text?: string };

type NotionProperty = {
    type?: string;
    select?: { options?: NotionSelectOption[] };
    multi_select?: { options?: NotionSelectOption[] };
    status?: { options?: NotionSelectOption[] };
    checkbox?: unknown;
    formula?: unknown;
};

type NotionSearchResult = {
    id: string;
    url?: string;
    icon?: unknown;
    title?: NotionRichText[];
    properties?: Record<string, NotionProperty & { title?: NotionRichText[] }>;
    object?: string;
    last_edited_time?: string;
};

type NotionDatabaseResponse = {
    properties?: Record<string, NotionProperty>;
    icon?: unknown;
    title?: NotionRichText[];
    url?: string;
    object?: string;
};

async function parseError(response: Response) {
    try {
        const body = await response.json();
        if (body?.message) {
            return body.message as string;
        }
    } catch (error) {
        // no-op: fall back to status text
    }
    if (response.status === 401) {
        return 'Token inválido ou expirado. Confirme o Internal Integration Token.';
    }
    return response.statusText || 'Erro desconhecido ao falar com a API do Notion.';
}

export async function verifyNotionIntegration(accessToken: string): Promise<NotionConnection> {
    const token = accessToken.trim();
    const response = await fetch(`${NOTION_BASE_URL}/users/me`, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Notion-Version': NOTION_VERSION,
        },
    });

    if (!response.ok) {
        const message = await parseError(response);
        throw new Error(message);
    }

    const data = await response.json();
    const botInfo = data.bot ?? {};
    return {
        accessToken: token,
        workspaceName: botInfo.workspace_name || data.name || 'Workspace',
        workspaceIcon: botInfo.workspace_icon || data.avatar_url,
        botId: data.id,
    };
}

export async function exchangeNotionCode(code: string, workspaceId: string) {
    const { accessToken } = useAppStore.getState();
    if (!accessToken) {
        throw new Error('É necessário estar autenticado para conectar o Notion.');
    }
    const response = await apiFetch<Envelope<{
        ok: boolean;
        workspaceId: string;
        botId?: string;
        notionWorkspaceId?: string;
    }>>(BACKEND_NOTION_INTEGRATION_URL, 'POST', { code, workspaceId });

    return unwrapFirst(response);
}

function extractPageTitle(page: unknown) {
    if (!page || typeof page !== 'object') return 'Página sem título';
    const typedPage = page as Partial<NotionSearchResult>;

    if (typedPage.object === 'database' && Array.isArray(typedPage.title)) {
        const text = typedPage.title.map((t) => t?.plain_text || '').join('').trim();
        if (text) return text;
    }

    const properties = typedPage.properties ?? {};
    for (const key of Object.keys(properties)) {
        const prop = properties[key];
        if (prop?.type === 'title' && Array.isArray(prop.title)) {
            const text = prop.title.map((t) => t?.plain_text || '').join('').trim();
            if (text) return text;
        }
    }

    if (typeof typedPage.url === 'string') {
        const slug = typedPage.url.split('/').pop() || '';
        return slug.replace(/-/g, ' ') || 'Página sem título';
    }
    return 'Página sem título';
}

function extractIcon(icon: unknown): string | undefined {
    if (!icon || typeof icon !== 'object') return undefined;
    const iconObj = icon as { type?: string; emoji?: string; external?: { url?: string }; file?: { url?: string } };
    if (iconObj.type === 'emoji') return iconObj.emoji;
    if (iconObj.type === 'external') return iconObj.external?.url;
    if (iconObj.type === 'file') return iconObj.file?.url;
    return undefined;
}

export async function fetchNotionPages(accessToken: string): Promise<NotionPageOption[]> {
    const token = accessToken.trim();
    const response = await fetch(`${NOTION_BASE_URL}/search`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Notion-Version': NOTION_VERSION,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            sort: { direction: 'descending', timestamp: 'last_edited_time' },
            page_size: 50,
        }),
    });

    if (!response.ok) {
        const message = await parseError(response);
        throw new Error(message);
    }

    const data = await response.json();
    const results = Array.isArray(data?.results) ? (data.results as unknown[]) : [];

    return results.map((page) => {
        const pageData = page as Partial<NotionSearchResult>;
        const id = typeof pageData.id === 'string' ? pageData.id : '';
        return {
            id,
            title: extractPageTitle(pageData),
            icon: extractIcon(pageData.icon),
            url: typeof pageData.url === 'string' ? pageData.url : undefined,
            lastEdited: typeof pageData.last_edited_time === 'string' ? pageData.last_edited_time : undefined,
            type: pageData.object === 'database' ? 'database' : 'page',
        };
    });
}

export async function fetchNotionDatabases(accessToken: string): Promise<NotionDatabaseOption[]> {
    const token = accessToken.trim();
    const response = await fetch(`${NOTION_BASE_URL}/search`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Notion-Version': NOTION_VERSION,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            filter: { value: 'database', property: 'object' },
            sort: { direction: 'descending', timestamp: 'last_edited_time' },
            page_size: 50,
        }),
    });

    if (!response.ok) {
        const message = await parseError(response);
        throw new Error(message);
    }

    const data = await response.json();
    const results = Array.isArray(data?.results) ? (data.results as unknown[]) : [];

    return results.map((db) => {
        const dbData = db as Partial<NotionDatabaseResponse> & { id?: string };
        const id = typeof dbData.id === 'string' ? dbData.id : '';
        return {
            id,
            title: extractPageTitle(dbData),
            icon: extractIcon(dbData.icon),
            url: typeof dbData.url === 'string' ? dbData.url : undefined,
        } as NotionDatabaseOption;
    });
}

export async function listNotionDatabases(params: { workspaceId: string; startCursor?: string; pageSize?: number; }): Promise<NotionDatabasesPage> {
    const { workspaceId, startCursor, pageSize } = params;
    const searchParams = new URLSearchParams({ workspaceId });
    if (startCursor) searchParams.set('startCursor', startCursor);
    if (typeof pageSize === 'number') searchParams.set('pageSize', String(pageSize));

    const response = await apiFetch<Envelope<NotionDatabasesPage>>(`/api/integrations/notion/databases?${searchParams.toString()}`);
    return unwrapFirst(response);
}

export async function fetchDatabaseSchema(workspaceId: string, databaseId: string): Promise<NotionDatabaseSchema> {
    const searchParams = new URLSearchParams({ workspaceId, databaseId });
    const response = await apiFetch<Envelope<NotionDatabaseSchema>>(`/api/integrations/notion/schema?${searchParams.toString()}`);
    return unwrapFirst(response);
}

export async function fetchDatabaseNumberProperties(accessToken: string, databaseId: string): Promise<NotionNumberProperty[]> {
    const token = accessToken.trim();
    const response = await fetch(`${NOTION_BASE_URL}/databases/${databaseId}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            'Notion-Version': NOTION_VERSION,
        },
    });

    if (!response.ok) {
        const message = await parseError(response);
        throw new Error(message);
    }

    const data = await response.json();
    const properties = (data?.properties ?? {}) as Record<string, NotionProperty>;
    return Object.entries(properties)
        .map(([key, value]) => ({ name: key, type: value?.type }))
        .filter((p) => p.type === 'number') as NotionNumberProperty[];
}

export async function fetchDatabaseDateProperties(accessToken: string, databaseId: string): Promise<NotionDateProperty[]> {
    const token = accessToken.trim();
    const response = await fetch(`${NOTION_BASE_URL}/databases/${databaseId}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            'Notion-Version': NOTION_VERSION,
        },
    });

    if (!response.ok) {
        const message = await parseError(response);
        throw new Error(message);
    }

    const data = await response.json();
    const properties = (data?.properties ?? {}) as Record<string, NotionProperty>;

    return Object.entries(properties)
        .map(([key, value]) => ({ name: key, type: value?.type }))
        .filter((p) => p.type === 'date') as NotionDateProperty[];
}

export async function fetchDatabaseFilterableProperties(accessToken: string, databaseId: string): Promise<NotionFilterProperty[]> {
    const token = accessToken.trim();
    const response = await fetch(`${NOTION_BASE_URL}/databases/${databaseId}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            'Notion-Version': NOTION_VERSION,
        },
    });

    if (!response.ok) {
        const message = await parseError(response);
        throw new Error(message);
    }

    const data = await response.json();
    const properties = (data?.properties ?? {}) as Record<string, NotionProperty>;

    const extractOptions = (prop: NotionProperty | undefined): NotionSelectOption[] => {
        if (!prop) return [];
        if (prop.type === 'select' && Array.isArray(prop.select?.options)) return prop.select.options.map((o) => ({ id: o.id, name: o.name, color: o.color }));
        if (prop.type === 'multi_select' && Array.isArray(prop.multi_select?.options)) return prop.multi_select.options.map((o) => ({ id: o.id, name: o.name, color: o.color }));
        if (prop.type === 'status' && Array.isArray(prop.status?.options)) return prop.status.options.map((o) => ({ id: o.id, name: o.name, color: o.color }));
        if (prop.type === 'checkbox') return [{ name: 'true' }, { name: 'false' }];
        if (prop.type === 'formula') return [];
        return [];
    };

    return Object.entries(properties)
        .map(([key, value]) => ({ name: key, type: value?.type, options: extractOptions(value) }))
        .filter((p) => p.type === 'select' || p.type === 'multi_select' || p.type === 'status' || p.type === 'checkbox' || p.type === 'formula') as NotionFilterProperty[];
}

export async function fetchDatabaseSum(
    accessToken: string,
    databaseId: string,
    numberProperty: string,
    filter?: { property: string; value: string; type?: 'select' | 'multi_select' | 'status' | 'checkbox' | 'formula'; },
    timeRange?: NotionTimeRange,
    dateProperty?: string,
): Promise<{ total: number; count: number; }> {
    const token = accessToken.trim();
    let hasMore = true;
    let startCursor: string | undefined = undefined;
    let total = 0;
    let count = 0;
    let safety = 0;

    const buildFilter = () => {
        if (!filter?.property || !filter.value) return undefined;
        if (filter.type === 'multi_select') {
            return {
                property: filter.property,
                multi_select: { contains: filter.value },
            };
        }
        if (filter.type === 'status') {
            return {
                property: filter.property,
                status: { equals: filter.value },
            };
        }
        if (filter.type === 'checkbox') {
            return {
                property: filter.property,
                checkbox: { equals: filter.value === 'true' },
            };
        }
        if (filter.type === 'formula') {
            return {
                property: filter.property,
                formula: { string: { equals: filter.value } },
            };
        }
        return {
            property: filter.property,
            select: { equals: filter.value },
        };
    };

    const dateFilter = (() => {
        if (!timeRange || timeRange === 'none') return undefined;
        if (!dateProperty) {
            throw new Error('Selecione uma coluna de data para aplicar o filtro de tempo.');
        }

        const now = new Date();
        const start = new Date(now);
        if (timeRange === 'last7d') start.setDate(now.getDate() - 7);
        if (timeRange === 'last30d') start.setDate(now.getDate() - 30);
        if (timeRange === 'last90d') start.setDate(now.getDate() - 90);
        if (timeRange === 'last12m') start.setMonth(now.getMonth() - 12);
        return {
            property: dateProperty,
            date: { on_or_after: start.toISOString() },
        };
    })();

    const queryFilter = (() => {
        const propertyFilter = buildFilter();
        if (propertyFilter && dateFilter) return { and: [propertyFilter, dateFilter] };
        if (propertyFilter) return propertyFilter;
        if (dateFilter) return dateFilter;
        return undefined;
    })();

    while (hasMore && safety < 20) {
        const response = await fetch(`${NOTION_BASE_URL}/databases/${databaseId}/query`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Notion-Version': NOTION_VERSION,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                start_cursor: startCursor,
                page_size: 100,
                filter: queryFilter,
            }),
        });

        if (!response.ok) {
            const message = await parseError(response);
            throw new Error(message);
        }

        const data = await response.json();
        const results = Array.isArray(data?.results) ? (data.results as unknown[]) : [];

        results.forEach((page) => {
            const props = (page as { properties?: Record<string, NotionProperty & { number?: number }> }).properties;
            const prop = props?.[numberProperty];
            if (!prop || prop.type !== 'number') return;
            const value = typeof prop.number === 'number' ? prop.number : 0;
            total += value;
            count += 1;
        });

        hasMore = !!data.has_more;
        startCursor = data.next_cursor || undefined;
        safety += 1;
    }

    return { total, count };
}

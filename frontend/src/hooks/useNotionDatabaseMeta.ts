import { useEffect, useState } from 'react';
import {
    fetchDatabaseSchema,
    type NotionDateProperty,
    type NotionFilterProperty,
    type NotionNumberProperty,
} from '@/lib/notion';

interface UseNotionDatabaseMetaParams {
    notionConnected: boolean;
    workspaceId?: string;
    databaseId: string;
    enabled: boolean;
}

interface MetaState {
    numberProps: NotionNumberProperty[];
    dateProps: NotionDateProperty[];
    filterProps: NotionFilterProperty[];
    isLoadingNumberProps: boolean;
    isLoadingDateProps: boolean;
    isLoadingFilterProps: boolean;
    numberPropsError: string | null;
    datePropsError: string | null;
    filterPropsError: string | null;
}

const initialState: MetaState = {
    numberProps: [],
    dateProps: [],
    filterProps: [],
    isLoadingNumberProps: false,
    isLoadingDateProps: false,
    isLoadingFilterProps: false,
    numberPropsError: null,
    datePropsError: null,
    filterPropsError: null,
};

/**
 * Encapsulates loading database columns (number, date, filters) to reduce component churn.
 */
export function useNotionDatabaseMeta({ notionConnected, workspaceId, databaseId, enabled }: UseNotionDatabaseMetaParams) {
    const [state, setState] = useState<MetaState>(initialState);

    useEffect(() => {
        if (!enabled || !notionConnected) return;
        if (!workspaceId || !databaseId) {
            setState(initialState);
            return;
        }

        let cancelled = false;
        setState({
            ...initialState,
            isLoadingNumberProps: true,
            isLoadingDateProps: true,
            isLoadingFilterProps: true,
        });

        fetchDatabaseSchema(workspaceId, databaseId)
            .then((schema) => {
                if (cancelled) return;
                const numberProps = schema.properties
                    .filter((prop) => prop.type === 'number')
                    .map((prop) => ({ name: prop.name, type: 'number' as const }));

                const dateProps = schema.properties
                    .filter((prop) => prop.type === 'date')
                    .map((prop) => ({ name: prop.name, type: 'date' as const }));

                const filterProps = schema.properties
                    .filter((prop) => prop.type === 'select' || prop.type === 'multi_select' || prop.type === 'status' || prop.type === 'checkbox' || prop.type === 'formula')
                    .map((prop) => ({
                        name: prop.name,
                        type: prop.type as NotionFilterProperty['type'],
                        options: prop.type === 'checkbox'
                            ? [{ name: 'true' }, { name: 'false' }]
                            : prop.type === 'formula'
                                ? []
                                : (prop.options ?? []).map((opt) => ({ id: opt.id, name: opt.name, color: opt.color })),
                    }));

                setState((prev) => ({
                    ...prev,
                    numberProps,
                    dateProps,
                    filterProps,
                }));
            })
            .catch((error) => {
                if (cancelled) return;
                const message = error instanceof Error ? error.message : 'Unable to load the database schema.';
                setState((prev) => ({
                    ...prev,
                    numberPropsError: message,
                    datePropsError: message,
                    filterPropsError: message,
                }));
            })
            .finally(() => {
                if (cancelled) return;
                setState((prev) => ({
                    ...prev,
                    isLoadingNumberProps: false,
                    isLoadingDateProps: false,
                    isLoadingFilterProps: false,
                }));
            });

        return () => {
            cancelled = true;
        };
    }, [enabled, workspaceId, notionConnected, databaseId]);

    return state;
}

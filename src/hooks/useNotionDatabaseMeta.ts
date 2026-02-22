import { useEffect, useState } from 'react';
import {
    fetchDatabaseSchema,
    fetchDatabaseDateProperties,
    fetchDatabaseFilterableProperties,
    fetchDatabaseNumberProperties,
    type NotionDateProperty,
    type NotionFilterProperty,
    type NotionNumberProperty,
} from '@/lib/notion';
import { type NotionConnection } from '@/store/useAppStore';

interface UseNotionDatabaseMetaParams {
    notionConnection: NotionConnection | null;
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
 * Encapsula carregamento de colunas da database (número, data, filtros) para reduzir efeitos no componente.
 */
export function useNotionDatabaseMeta({ notionConnection, workspaceId, databaseId, enabled }: UseNotionDatabaseMetaParams) {
    const [state, setState] = useState<MetaState>(initialState);

    useEffect(() => {
        if (!enabled) return;
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

        const setAllLoadingFalse = () => {
            if (cancelled) return;
            setState((prev) => ({
                ...prev,
                isLoadingNumberProps: false,
                isLoadingDateProps: false,
                isLoadingFilterProps: false,
            }));
        };

        const useBackend = !notionConnection || notionConnection.accessToken === 'server-managed';

        if (useBackend) {
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
                    const message = error instanceof Error ? error.message : 'Não foi possível carregar o schema da database.';
                    setState((prev) => ({
                        ...prev,
                        numberPropsError: message,
                        datePropsError: message,
                        filterPropsError: message,
                    }));
                })
                .finally(setAllLoadingFalse);

            return () => {
                cancelled = true;
            };
        }

        const token = notionConnection.accessToken;

        (async () => {
            let numberProps: NotionNumberProperty[] = [];
            let dateProps: NotionDateProperty[] = [];
            let filterProps: NotionFilterProperty[] = [];
            let numberPropsError: string | null = null;
            let datePropsError: string | null = null;
            let filterPropsError: string | null = null;

            try {
                numberProps = await fetchDatabaseNumberProperties(token, databaseId);
            } catch (error) {
                numberPropsError = error instanceof Error ? error.message : 'Não foi possível carregar colunas numéricas.';
            }

            try {
                dateProps = await fetchDatabaseDateProperties(token, databaseId);
            } catch (error) {
                datePropsError = error instanceof Error ? error.message : 'Não foi possível carregar colunas de data.';
            }

            try {
                const props = await fetchDatabaseFilterableProperties(token, databaseId);
                filterProps = props.filter((prop) => !numberProps.some((n) => n.name === prop.name));
            } catch (error) {
                filterPropsError = error instanceof Error ? error.message : 'Não foi possível carregar filtros.';
            }

            if (cancelled) return;

            setState((prev) => ({
                ...prev,
                numberProps,
                dateProps,
                filterProps,
                numberPropsError,
                datePropsError,
                filterPropsError,
                isLoadingNumberProps: false,
                isLoadingDateProps: false,
                isLoadingFilterProps: false,
            }));
        })();

        return () => {
            cancelled = true;
        };
    }, [enabled, workspaceId, notionConnection, databaseId]);

    return state;
}

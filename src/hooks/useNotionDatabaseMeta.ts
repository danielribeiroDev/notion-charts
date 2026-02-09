import { useEffect, useState } from 'react';
import {
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
export function useNotionDatabaseMeta({ notionConnection, databaseId, enabled }: UseNotionDatabaseMetaParams) {
    const [state, setState] = useState<MetaState>(initialState);

    useEffect(() => {
        if (!enabled) return;
        if (!notionConnection || !databaseId) {
            setState(initialState);
            return;
        }

        setState(initialState);

        setState((prev) => ({ ...prev, isLoadingNumberProps: true }));
        fetchDatabaseNumberProperties(notionConnection.accessToken, databaseId)
            .then((props) => setState((prev) => ({ ...prev, numberProps: props })))
            .catch((error) => {
                const message = error instanceof Error ? error.message : 'Não foi possível carregar colunas numéricas.';
                setState((prev) => ({ ...prev, numberPropsError: message }));
            })
            .finally(() => setState((prev) => ({ ...prev, isLoadingNumberProps: false })));

        setState((prev) => ({ ...prev, isLoadingDateProps: true }));
        fetchDatabaseDateProperties(notionConnection.accessToken, databaseId)
            .then((props) => setState((prev) => ({ ...prev, dateProps: props })))
            .catch((error) => {
                const message = error instanceof Error ? error.message : 'Não foi possível carregar colunas de data.';
                setState((prev) => ({ ...prev, datePropsError: message }));
            })
            .finally(() => setState((prev) => ({ ...prev, isLoadingDateProps: false })));

        setState((prev) => ({ ...prev, isLoadingFilterProps: true }));
        fetchDatabaseFilterableProperties(notionConnection.accessToken, databaseId)
            .then((props) => setState((prev) => ({
                ...prev,
                // Remove quaisquer colunas numéricas da lista de filtros
                filterProps: props.filter((prop) => !prev.numberProps.some((n) => n.name === prop.name)),
            })))
            .catch((error) => {
                const message = error instanceof Error ? error.message : 'Não foi possível carregar filtros.';
                setState((prev) => ({ ...prev, filterPropsError: message }));
            })
            .finally(() => setState((prev) => ({ ...prev, isLoadingFilterProps: false })));
    }, [enabled, notionConnection, databaseId]);

    return state;
}

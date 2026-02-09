import { type NotionTimeRange } from '@/lib/notion';

export const NO_FILTER_VALUE = '__no_filter__';
export const NO_DATE_VALUE = '__no_date__';

export const timeOptions: { label: string; value: NotionTimeRange }[] = [
    { label: 'Sem filtro de tempo', value: 'none' },
    { label: 'Últimos 7 dias', value: 'last7d' },
    { label: 'Último mês', value: 'last30d' },
    { label: 'Últimos 3 meses', value: 'last90d' },
    { label: 'Último ano', value: 'last12m' },
];

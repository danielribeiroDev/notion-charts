import { type NotionTimeRange } from '@/lib/notion';

export const NO_FILTER_VALUE = '__no_filter__';
export const NO_DATE_VALUE = '__no_date__';

export const timeOptions: { label: string; value: NotionTimeRange }[] = [
    { label: 'No time filter', value: 'none' },
    { label: 'Last 7 days', value: 'last7d' },
    { label: 'Last month', value: 'last30d' },
    { label: 'Last 3 months', value: 'last90d' },
    { label: 'Last year', value: 'last12m' },
];

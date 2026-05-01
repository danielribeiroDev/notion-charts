import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { type NotionDateProperty, type NotionFilterProperty, type NotionNumberProperty, type NotionTimeRange } from '@/lib/notion';
import { type ChartMetric } from '@/store/useAppStore';

interface MetricFieldsProps {
    metric: ChartMetric;
    index: number;
    metricsLength: number;
    numberProps: NotionNumberProperty[];
    dateProps: NotionDateProperty[];
    filterProps: NotionFilterProperty[];
    timeOptions: { label: string; value: NotionTimeRange }[];
    NO_FILTER_VALUE: string;
    NO_DATE_VALUE: string;
    isLoadingNumberProps: boolean;
    isLoadingDateProps: boolean;
    isLoadingFilterProps: boolean;
    numberPropsError: string | null;
    datePropsError: string | null;
    filterPropsError: string | null;
    selectedDatabaseId: string;
    updateMetric: (id: string, updater: (m: ChartMetric) => ChartMetric) => void;
    removeMetric: (id: string) => void;
}

export function MetricFields(props: MetricFieldsProps) {
    const {
        metric,
        index,
        metricsLength,
        numberProps,
        dateProps,
        filterProps,
        timeOptions,
        NO_FILTER_VALUE,
        NO_DATE_VALUE,
        isLoadingNumberProps,
        isLoadingDateProps,
        isLoadingFilterProps,
        numberPropsError,
        datePropsError,
        filterPropsError,
        selectedDatabaseId,
        updateMetric,
        removeMetric,
    } = props;

    const selectedProp = filterProps.find((p) => p.name === metric.filters?.property);

    return (
        <div className="space-y-3 rounded-md border border-border bg-secondary/40 p-3">
            <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Metric {index + 1}</p>
                {metricsLength > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeMetric(metric.id)}>
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>

            <div className="space-y-2">
                <label className="text-xs font-medium">Name</label>
                <Input
                    placeholder="Ex: Total Income"
                    value={metric.name}
                    onChange={(e) => updateMetric(metric.id, (m) => ({ ...m, name: e.target.value }))}
                />
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                    <span>Numeric column</span>
                    {numberPropsError && <span className="text-[11px] text-destructive">Error</span>}
                </div>
                <Select
                    value={metric.valueColumn || numberProps[0]?.name || 'no-number'}
                    onValueChange={(value) => updateMetric(metric.id, (m) => ({ ...m, valueColumn: value }))}
                    disabled={!selectedDatabaseId || isLoadingNumberProps}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={isLoadingNumberProps ? 'Loading columns...' : 'Select a numeric column'} />
                    </SelectTrigger>
                    <SelectContent>
                        {!isLoadingNumberProps && numberProps.length === 0 && (
                            <SelectItem value="no-number" disabled>
                                No columns available
                            </SelectItem>
                        )}
                        {isLoadingNumberProps && (
                            <SelectItem value="loading" disabled>
                                Loading columns...
                            </SelectItem>
                        )}
                        {!isLoadingNumberProps && numberProps.length === 0 && !numberPropsError && (
                            <SelectItem value="empty" disabled>
                                No numeric columns found
                            </SelectItem>
                        )}
                        {!isLoadingNumberProps && numberProps.map((prop) => (
                            <SelectItem key={prop.name} value={prop.name}>
                                {prop.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                    <span>Date column (for time filter)</span>
                    {datePropsError && <span className="text-[11px] text-destructive">Error</span>}
                </div>
                <Select
                    value={metric.dateProperty || NO_DATE_VALUE}
                    onValueChange={(value) => updateMetric(metric.id, (m) => ({ ...m, dateProperty: value === NO_DATE_VALUE ? undefined : value }))}
                    disabled={!selectedDatabaseId || isLoadingDateProps || dateProps.length === 0}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={isLoadingDateProps ? 'Loading date columns...' : 'Select a date column'} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={NO_DATE_VALUE}>None (disables time filter)</SelectItem>
                        {isLoadingDateProps && (
                            <SelectItem value="loading" disabled>
                                Loading date columns...
                            </SelectItem>
                        )}
                        {!isLoadingDateProps && dateProps.length === 0 && !datePropsError && (
                            <SelectItem value="empty" disabled>
                                No date columns found
                            </SelectItem>
                        )}
                        {!isLoadingDateProps && dateProps.map((prop) => (
                            <SelectItem key={prop.name} value={prop.name}>
                                {prop.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">Required when choosing a time filter. Uses this column to calculate the period.</p>

                <div className="flex items-center justify-between text-xs font-medium">
                    <span>Time filter</span>
                    {filterPropsError && <span className="text-[11px] text-destructive">Error</span>}
                </div>
                <Select
                    value={metric.timeRange || 'none'}
                    onValueChange={(value) => updateMetric(metric.id, (m) => ({ ...m, timeRange: value as NotionTimeRange }))}
                    disabled={!selectedDatabaseId}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select a period" />
                    </SelectTrigger>
                    <SelectContent>
                        {timeOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">Applies the period using the selected date column.</p>

                <div className="flex items-center justify-between text-xs font-medium">
                    <span>Property filter (optional)</span>
                    {filterPropsError && <span className="text-[11px] text-destructive">Error</span>}
                </div>
                <Select
                    value={metric.filters?.property ?? NO_FILTER_VALUE}
                    onValueChange={(value) => {
                        if (value === NO_FILTER_VALUE) {
                            updateMetric(metric.id, (m) => ({ ...m, filters: undefined }));
                            return;
                        }

                        const prop = filterProps.find((p) => p.name === value);
                        if (!prop) return;
                        const defaultValue = prop.type === 'checkbox'
                            ? 'true'
                            : prop.type === 'formula'
                                ? ''
                                : prop.options?.[0]?.name ?? prop.name;
                        updateMetric(metric.id, (m) => ({
                            ...m,
                            filters: { property: prop.name, type: prop.type, value: defaultValue },
                        }));
                    }}
                    disabled={!selectedDatabaseId || isLoadingFilterProps || filterProps.length === 0}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={isLoadingFilterProps ? 'Loading filters...' : 'No filter'} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={NO_FILTER_VALUE}>No filter</SelectItem>
                        {isLoadingFilterProps && (
                            <SelectItem value="loading" disabled>
                                Loading filters...
                            </SelectItem>
                        )}
                        {!isLoadingFilterProps && filterProps.length === 0 && !filterPropsError && (
                            <SelectItem value="empty" disabled>
                                No selectable properties found
                            </SelectItem>
                        )}
                        {!isLoadingFilterProps && filterProps.map((prop) => (
                            <SelectItem key={prop.name} value={prop.name}>
                                {prop.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {(() => {
                    if (!metric.filters?.property) {
                        return (
                            <Select value="__placeholder__" disabled>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a property first" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__placeholder__" disabled>
                                        No filter configured
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        );
                    }

                    if (selectedProp?.type === 'formula') {
                        return (
                            <Input
                                placeholder="Enter a value (text)"
                                value={metric.filters?.value ?? ''}
                                onChange={(e) => updateMetric(metric.id, (m) => ({
                                    ...m,
                                    filters: { ...m.filters, value: e.target.value },
                                }))}
                            />
                        );
                    }

                    if (selectedProp?.type === 'checkbox') {
                        return (
                            <Select
                                value={metric.filters?.value || 'true'}
                                onValueChange={(value) => updateMetric(metric.id, (m) => ({
                                    ...m,
                                    filters: { ...m.filters, value },
                                }))}
                                disabled={isLoadingFilterProps}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a value" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="true">Checked</SelectItem>
                                    <SelectItem value="false">Unchecked</SelectItem>
                                </SelectContent>
                            </Select>
                        );
                    }

                    const options = selectedProp?.options || [];
                    return (
                        <Select
                            value={metric.filters?.value || options[0]?.name || '__no_option__'}
                            onValueChange={(value) => updateMetric(metric.id, (m) => ({
                                ...m,
                                filters: { ...m.filters, value },
                            }))}
                            disabled={isLoadingFilterProps || options.length === 0}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={options.length ? 'Select a value' : 'No values available'} />
                            </SelectTrigger>
                            <SelectContent>
                                {options.length === 0 && (
                                    <SelectItem value="__placeholder__" disabled>
                                        No values available
                                    </SelectItem>
                                )}
                                {options.length === 0 && (
                                    <SelectItem value="__no_option__" disabled>
                                        No options
                                    </SelectItem>
                                )}
                                {options.map((opt) => (
                                    <SelectItem key={opt.id ?? opt.name} value={opt.name}>
                                        {opt.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    );
                })()}
                <p className="text-[11px] text-muted-foreground">Optional: select a filter by select/status/multi-select/checkbox or formula (text).</p>
            </div>
        </div>
    );
}

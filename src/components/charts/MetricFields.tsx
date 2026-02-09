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
                <p className="text-sm font-semibold">Métrica {index + 1}</p>
                {metricsLength > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeMetric(metric.id)}>
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>

            <div className="space-y-2">
                <label className="text-xs font-medium">Nome</label>
                <Input
                    placeholder="Ex: Total Income"
                    value={metric.name}
                    onChange={(e) => updateMetric(metric.id, (m) => ({ ...m, name: e.target.value }))}
                />
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                    <span>Coluna numérica</span>
                    {numberPropsError && <span className="text-[11px] text-destructive">Erro</span>}
                </div>
                <Select
                    value={metric.valueColumn || numberProps[0]?.name || 'no-number'}
                    onValueChange={(value) => updateMetric(metric.id, (m) => ({ ...m, valueColumn: value }))}
                    disabled={!selectedDatabaseId || isLoadingNumberProps}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={isLoadingNumberProps ? 'Carregando colunas...' : 'Selecione uma coluna numérica'} />
                    </SelectTrigger>
                    <SelectContent>
                        {!isLoadingNumberProps && numberProps.length === 0 && (
                            <SelectItem value="no-number" disabled>
                                Nenhuma coluna disponível
                            </SelectItem>
                        )}
                        {isLoadingNumberProps && (
                            <SelectItem value="loading" disabled>
                                Carregando colunas...
                            </SelectItem>
                        )}
                        {!isLoadingNumberProps && numberProps.length === 0 && !numberPropsError && (
                            <SelectItem value="empty" disabled>
                                Nenhuma coluna numérica encontrada
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
                    <span>Coluna de data (para filtro de tempo)</span>
                    {datePropsError && <span className="text-[11px] text-destructive">Erro</span>}
                </div>
                <Select
                    value={metric.dateProperty || NO_DATE_VALUE}
                    onValueChange={(value) => updateMetric(metric.id, (m) => ({ ...m, dateProperty: value === NO_DATE_VALUE ? undefined : value }))}
                    disabled={!selectedDatabaseId || isLoadingDateProps || dateProps.length === 0}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={isLoadingDateProps ? 'Carregando colunas de data...' : 'Selecione a coluna de data'} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={NO_DATE_VALUE}>Nenhuma (desativa filtro de tempo)</SelectItem>
                        {isLoadingDateProps && (
                            <SelectItem value="loading" disabled>
                                Carregando colunas de data...
                            </SelectItem>
                        )}
                        {!isLoadingDateProps && dateProps.length === 0 && !datePropsError && (
                            <SelectItem value="empty" disabled>
                                Nenhuma coluna de data encontrada
                            </SelectItem>
                        )}
                        {!isLoadingDateProps && dateProps.map((prop) => (
                            <SelectItem key={prop.name} value={prop.name}>
                                {prop.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">Obrigatório quando escolher um filtro de tempo. Usa essa coluna para calcular o período.</p>

                <div className="flex items-center justify-between text-xs font-medium">
                    <span>Filtro de tempo</span>
                    {filterPropsError && <span className="text-[11px] text-destructive">Erro</span>}
                </div>
                <Select
                    value={metric.timeRange || 'none'}
                    onValueChange={(value) => updateMetric(metric.id, (m) => ({ ...m, timeRange: value as NotionTimeRange }))}
                    disabled={!selectedDatabaseId}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                        {timeOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">Aplica o período usando a coluna de data selecionada.</p>

                <div className="flex items-center justify-between text-xs font-medium">
                    <span>Filtro de propriedade (opcional)</span>
                    {filterPropsError && <span className="text-[11px] text-destructive">Erro</span>}
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
                        <SelectValue placeholder={isLoadingFilterProps ? 'Carregando filtros...' : 'Sem filtro'} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={NO_FILTER_VALUE}>Sem filtro</SelectItem>
                        {isLoadingFilterProps && (
                            <SelectItem value="loading" disabled>
                                Carregando filtros...
                            </SelectItem>
                        )}
                        {!isLoadingFilterProps && filterProps.length === 0 && !filterPropsError && (
                            <SelectItem value="empty" disabled>
                                Nenhuma propriedade selecionável encontrada
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
                                    <SelectValue placeholder="Selecione a propriedade primeiro" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__placeholder__" disabled>
                                        Sem filtro configurado
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        );
                    }

                    if (selectedProp?.type === 'formula') {
                        return (
                            <Input
                                placeholder="Digite o valor (texto)"
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
                                    <SelectValue placeholder="Selecione o valor" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="true">Marcado</SelectItem>
                                    <SelectItem value="false">Desmarcado</SelectItem>
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
                                <SelectValue placeholder={options.length ? 'Selecione um valor' : 'Sem valores disponíveis'} />
                            </SelectTrigger>
                            <SelectContent>
                                {options.length === 0 && (
                                    <SelectItem value="__placeholder__" disabled>
                                        Nenhum valor disponível
                                    </SelectItem>
                                )}
                                {options.length === 0 && (
                                    <SelectItem value="__no_option__" disabled>
                                        Sem opções
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
                <p className="text-[11px] text-muted-foreground">Opcional: selecione um filtro por select/status/multi-select/checkbox ou fórmula (texto).</p>
            </div>
        </div>
    );
}

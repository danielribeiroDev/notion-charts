import { Link } from 'react-router-dom';
import { Calculator, Copy, Edit2, ExternalLink, MoreVertical, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type ChartConfig, type ChartMetric } from '@/store/useAppStore';

interface ChartCardProps {
    chart: ChartConfig;
    metrics: ChartMetric[];
    aggregates: Record<string, { loading: boolean; error?: string; total?: number; count?: number }>;
    IconComponent: React.ComponentType<{ className?: string }>;
    onEdit: (chart: ChartConfig) => void;
    onCopyEmbedLink: (id: string) => void;
    onDelete: (id: string, name: string) => void;
}

export function ChartCard({ chart, metrics, aggregates, IconComponent, onEdit, onCopyEmbedLink, onDelete }: ChartCardProps) {
    return (
        <Card
            key={chart.id}
            className="group transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
        >
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-lg">{chart.name}</CardTitle>
                        <CardDescription>Stats Card</CardDescription>
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 transition-opacity group-hover:opacity-100"
                        >
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(chart)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onCopyEmbedLink(chart.id)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Embed Link
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link to={`/embed/${chart.id}`} target="_blank">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View Preview
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => onDelete(chart.id, chart.name)}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                    {metrics.map((metric, idx) => {
                        const metricAgg = aggregates?.[metric.id];
                        const filterMeta = metric.filters;
                        const hasData = metricAgg && !metricAgg.loading && !metricAgg.error;

                        return (
                            <div key={metric.id} className="rounded-lg border border-dashed border-border bg-secondary/40 p-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold">{metric.name || `Metric ${idx + 1}`}</p>
                                    <IconComponent className="h-4 w-4 text-primary" />
                                </div>

                                {metricAgg?.loading && (
                                    <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
                                        <Calculator className="h-4 w-4 animate-pulse" />
                                        Calculating...
                                    </div>
                                )}

                                {metricAgg?.error && (
                                    <p className="mt-2 text-sm text-destructive">{metricAgg.error}</p>
                                )}

                                {hasData && (
                                    <div className="mt-2 space-y-1">
                                        <p className="text-xs text-muted-foreground">
                                            {metric.valueColumn}
                                            {filterMeta?.property && filterMeta.value && (
                                                <span className="ml-1 text-[11px] text-muted-foreground">({filterMeta.property}: {filterMeta.value})</span>
                                            )}
                                        </p>
                                        <p className="text-2xl font-semibold">
                                            {metricAgg.total?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) ?? '0'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{metricAgg.count ?? 0} records</p>
                                    </div>
                                )}

                                {!metricAgg && (
                                    <p className="mt-2 text-sm text-muted-foreground">Configure a column and filter to see the total.</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

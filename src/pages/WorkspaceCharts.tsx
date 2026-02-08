import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, ArrowLeft, BarChart3, LineChart, PieChart, TrendingUp, MoreVertical, Trash2, Edit2, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore, type ChartConfig } from '@/store/useAppStore';
import { useToast } from '@/hooks/use-toast';

const chartTypeIcons = {
  bar: BarChart3,
  line: LineChart,
  pie: PieChart,
  stats: TrendingUp,
};

const chartTypeLabels = {
  bar: 'Gráfico de Barras',
  line: 'Gráfico de Linhas',
  pie: 'Gráfico de Pizza',
  stats: 'Card de Estatísticas',
};

export default function WorkspaceCharts() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { workspaces, charts, addChart, updateChart, deleteChart } = useAppStore();
  const { toast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChart, setEditingChart] = useState<string | null>(null);
  const [chartName, setChartName] = useState('');
  const [chartType, setChartType] = useState<ChartConfig['type']>('bar');

  const workspace = workspaces.find((w) => w.id === workspaceId);
  const workspaceCharts = charts.filter((c) => c.workspaceId === workspaceId);

  if (!workspace) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Workspace não encontrado</p>
            <Link to="/dashboard">
              <Button variant="link" className="mt-4">
                Voltar para Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreateChart = () => {
    if (!chartName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, insira um nome para o gráfico.',
        variant: 'destructive',
      });
      return;
    }

    if (editingChart) {
      updateChart(editingChart, { name: chartName.trim(), type: chartType });
      toast({
        title: 'Gráfico atualizado',
        description: `"${chartName}" foi atualizado com sucesso.`,
      });
    } else {
      addChart({
        workspaceId: workspaceId!,
        name: chartName.trim(),
        type: chartType,
        notionDatabaseId: '',
        valueColumn: '',
      });
      toast({
        title: 'Gráfico criado',
        description: `"${chartName}" foi criado com sucesso.`,
      });
    }

    setIsModalOpen(false);
    setChartName('');
    setChartType('bar');
    setEditingChart(null);
  };

  const handleEdit = (chart: ChartConfig) => {
    setEditingChart(chart.id);
    setChartName(chart.name);
    setChartType(chart.type);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    deleteChart(id);
    toast({
      title: 'Gráfico excluído',
      description: `"${name}" foi removido.`,
    });
  };

  const handleCopyEmbedLink = (chartId: string) => {
    const embedUrl = `${window.location.origin}/embed/${chartId}`;
    navigator.clipboard.writeText(embedUrl);
    toast({
      title: 'Link copiado!',
      description: 'Cole o link no Notion para embedar o gráfico.',
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link to="/dashboard" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Workspaces
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{workspace.name}</h1>
            <p className="text-muted-foreground">
              Gerencie os gráficos deste workspace
            </p>
          </div>
          <Button 
            onClick={() => {
              setEditingChart(null);
              setChartName('');
              setChartType('bar');
              setIsModalOpen(true);
            }}
            className="neon-glow"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Chart
          </Button>
        </div>
      </div>

      {/* Charts Grid */}
      {workspaceCharts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No Charts Yet</h3>
            <p className="mb-6 text-center text-muted-foreground">
              Crie seu primeiro gráfico para visualizar seus dados do Notion
            </p>
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="neon-glow"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Chart
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {workspaceCharts.map((chart) => {
            const IconComponent = chartTypeIcons[chart.type];
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
                      <CardDescription>
                        {chartTypeLabels[chart.type]}
                      </CardDescription>
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
                      <DropdownMenuItem onClick={() => handleEdit(chart)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyEmbedLink(chart.id)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar Link Embed
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/embed/${chart.id}`} target="_blank">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Ver Preview
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(chart.id, chart.name)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  {/* Chart Preview Placeholder */}
                  <div className="flex h-32 items-center justify-center rounded-lg bg-secondary/50">
                    <IconComponent className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingChart ? 'Editar Gráfico' : 'Criar Gráfico'}
            </DialogTitle>
            <DialogDescription>
              {editingChart 
                ? 'Altere as configurações do seu gráfico'
                : 'Configure seu novo gráfico'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="chartName" className="text-sm font-medium">
                Nome do Gráfico
              </label>
              <Input
                id="chartName"
                placeholder="Ex: Receitas Mensais"
                value={chartName}
                onChange={(e) => setChartName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Tipo de Gráfico
              </label>
              <Select value={chartType} onValueChange={(v) => setChartType(v as ChartConfig['type'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Gráfico de Barras
                    </div>
                  </SelectItem>
                  <SelectItem value="line">
                    <div className="flex items-center gap-2">
                      <LineChart className="h-4 w-4" />
                      Gráfico de Linhas
                    </div>
                  </SelectItem>
                  <SelectItem value="pie">
                    <div className="flex items-center gap-2">
                      <PieChart className="h-4 w-4" />
                      Gráfico de Pizza
                    </div>
                  </SelectItem>
                  <SelectItem value="stats">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Card de Estatísticas
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateChart} className="neon-glow">
              {editingChart ? 'Salvar' : 'Criar Gráfico'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

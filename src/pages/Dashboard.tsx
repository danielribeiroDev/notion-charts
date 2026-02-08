import { useState } from 'react';
import { Plus, MoreVertical, BarChart3, Trash2, Edit2 } from 'lucide-react';
import { Link } from 'react-router-dom';
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
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { workspaces, addWorkspace, updateWorkspace, deleteWorkspace, charts } = useAppStore();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');

  const handleCreateWorkspace = () => {
    if (!workspaceName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, insira um nome para o workspace.',
        variant: 'destructive',
      });
      return;
    }

    if (editingWorkspace) {
      updateWorkspace(editingWorkspace, { name: workspaceName.trim() });
      toast({
        title: 'Workspace atualizado',
        description: `"${workspaceName}" foi atualizado com sucesso.`,
      });
    } else {
      addWorkspace({ name: workspaceName.trim() });
      toast({
        title: 'Workspace criado',
        description: `"${workspaceName}" foi criado com sucesso.`,
      });
    }

    setIsModalOpen(false);
    setWorkspaceName('');
    setEditingWorkspace(null);
  };

  const handleEdit = (id: string, name: string) => {
    setEditingWorkspace(id);
    setWorkspaceName(name);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    deleteWorkspace(id);
    toast({
      title: 'Workspace excluído',
      description: `"${name}" foi removido.`,
    });
  };

  const getWorkspaceChartCount = (workspaceId: string) => {
    return charts.filter((c) => c.workspaceId === workspaceId).length;
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workspaces</h1>
          <p className="text-muted-foreground">
            Organize seus gráficos em workspaces
          </p>
        </div>
        <Button 
          onClick={() => {
            setEditingWorkspace(null);
            setWorkspaceName('');
            setIsModalOpen(true);
          }}
          className="neon-glow"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Workspace
        </Button>
      </div>

      {/* Workspaces Grid */}
      {workspaces.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No Workspaces Yet</h3>
            <p className="mb-6 text-center text-muted-foreground">
              Crie seu primeiro workspace para começar a organizar seus gráficos
            </p>
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="neon-glow"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Workspace
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace) => (
            <Card 
              key={workspace.id} 
              className="group transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{workspace.name}</CardTitle>
                  <CardDescription>
                    {getWorkspaceChartCount(workspace.id)} charts
                  </CardDescription>
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
                    <DropdownMenuItem onClick={() => handleEdit(workspace.id, workspace.name)}>
                      <Edit2 className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDelete(workspace.id, workspace.name)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <Link to={`/workspace/${workspace.id}/charts`}>
                  <Button variant="outline" className="w-full">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Ver Charts
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingWorkspace ? 'Editar Workspace' : 'Criar Workspace'}
            </DialogTitle>
            <DialogDescription>
              {editingWorkspace 
                ? 'Altere o nome do seu workspace'
                : 'Dê um nome para seu novo workspace'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Nome do Workspace
              </label>
              <Input
                id="name"
                placeholder="Ex: Finanças Pessoais"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateWorkspace} className="neon-glow">
              {editingWorkspace ? 'Salvar' : 'Criar Workspace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

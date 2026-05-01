import { useEffect, useState } from 'react';
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
import { createWorkspace, deleteWorkspaceApi, fetchWorkspaces, updateWorkspaceApi } from '@/lib/workspaces';

export default function Dashboard() {
  const { workspaces, setWorkspaces, charts } = useAppStore();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchWorkspaces();
        setWorkspaces(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to load workspaces.';
        toast({ title: 'Error', description: message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [setWorkspaces, toast]);

  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for the workspace.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingWorkspace) {
        const updated = await updateWorkspaceApi(editingWorkspace, workspaceName.trim());
        setWorkspaces(workspaces.map((w) => (w.id === updated.id ? updated : w)));
        toast({
          title: 'Workspace updated',
          description: `"${workspaceName}" was updated successfully.`,
        });
      } else {
        const created = await createWorkspace(workspaceName.trim());
        setWorkspaces([...workspaces, created]);
        toast({
          title: 'Workspace created',
          description: `"${workspaceName}" was created successfully.`,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save workspace.';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }

    setIsModalOpen(false);
    setWorkspaceName('');
    setEditingWorkspace(null);
  };

  const handleEdit = (workspaceId: string) => {
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) return;
    setEditingWorkspace(workspaceId);
    setWorkspaceName(workspace.name);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteWorkspaceApi(id);
      setWorkspaces(workspaces.filter((w) => w.id !== id));
      toast({
        title: 'Workspace deleted',
        description: `"${name}" was removed.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete workspace.';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
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
            Organize your charts in workspaces
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
      {loading ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">Loading workspaces...</CardContent>
        </Card>
      ) : workspaces.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No Workspaces Yet</h3>
            <p className="mb-6 text-center text-muted-foreground">
              Create your first workspace to start organizing your charts
            </p>
            <Button
              onClick={() => {
                setEditingWorkspace(null);
                setWorkspaceName('');
                setIsModalOpen(true);
              }}
              className="neon-glow"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Workspace
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Tip: you can rename the workspace at any time.
            </p>
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
                    <span
                      className={`ml-2 inline-block h-2 w-2 rounded-full ${workspace.notionConnected ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      title={workspace.notionConnected ? 'Notion connected' : 'Notion disconnected'}
                    />
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
                    <DropdownMenuItem onClick={() => handleEdit(workspace.id)}>
                      <Edit2 className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(workspace.id, workspace.name)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <Link to={`/workspace/${workspace.id}/charts`}>
                  <Button variant="outline" className="w-full">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Charts
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
              {editingWorkspace ? 'Edit Workspace' : 'Create Workspace'}
            </DialogTitle>
            <DialogDescription>
              {editingWorkspace
                ? 'Change your workspace name'
                : 'Give your new workspace a name'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Workspace Name
              </label>
              <Input
                id="name"
                placeholder="e.g. Personal Finance"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: you can rename the workspace at any time.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWorkspace} className="neon-glow">
              {editingWorkspace ? 'Save' : 'Create Workspace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

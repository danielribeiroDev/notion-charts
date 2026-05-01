import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/store/useAppStore';
import { exchangeNotionCode } from '@/lib/notion';

export default function NotionCallback() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { toast } = useToast();
    const { setNotionConnection, workspaces } = useAppStore();
    const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
    const [message, setMessage] = useState<string>('Processing authorization...');

    const code = searchParams.get('code') ?? '';
    const stateParam = searchParams.get('state') ?? '';
    const workspaceId = useMemo(() => {
        const fromState = new URLSearchParams(stateParam).get('workspaceId');
        if (fromState) return fromState;
        const fromQuery = searchParams.get('workspaceId');
        if (fromQuery) return fromQuery;
        if (workspaces.length > 0) return workspaces[0].id;
        return '';
    }, [stateParam, searchParams, workspaces]);

    useEffect(() => {
        const run = async () => {
            if (!code) {
                setStatus('error');
                setMessage('Authorization code not found in the URL.');
                return;
            }
            if (!workspaceId) {
                setStatus('error');
                setMessage('Workspace ID not provided.');
                return;
            }
            try {
                setStatus('loading');
                setMessage('Exchanging code for credentials...');
                const response = await exchangeNotionCode(code, workspaceId);

                if (!response?.ok) {
                    throw new Error('Code exchange did not succeed.');
                }

                // We don't receive the access token on the frontend; mark as authenticated with placeholders.
                setNotionConnection({
                    accessToken: 'server-managed',
                    workspaceName: 'Notion Workspace',
                    workspaceIcon: undefined,
                    botId: response.botId ?? 'bot',
                });

                // Optimistically update the workspace's notionConnected status
                const { workspaces: currentWorkspaces, setWorkspaces: updateWorkspaces } = useAppStore.getState();
                updateWorkspaces(currentWorkspaces.map(w =>
                    w.id === workspaceId ? { ...w, notionConnected: true } : w
                ));

                setStatus('success');
                setMessage('Connected! Redirecting...');
                navigate(`/workspace/${workspaceId}/charts`, { replace: true });
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to connect to Notion.';
                setStatus('error');
                setMessage(errorMessage);
                toast({
                    title: 'Connection error',
                    description: errorMessage,
                    variant: 'destructive',
                });
            }
        };

        run();
    }, [code, workspaceId, navigate, toast, setNotionConnection]);

    const icon = status === 'loading' ? (
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
    ) : status === 'success' ? (
        <CheckCircle2 className="h-6 w-6 text-green-500" />
    ) : (
        <AlertTriangle className="h-6 w-6 text-destructive" />
    );

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <Card className="w-full max-w-md border-border">
                <CardHeader className="flex items-center gap-3">
                    {icon}
                    <div>
                        <CardTitle>Connecting to Notion</CardTitle>
                        <CardDescription>{message}</CardDescription>
                    </div>
                </CardHeader>
                {status === 'error' && (
                    <CardContent className="flex flex-col gap-3">
                        <Button onClick={() => navigate('/login')} variant="outline">
                            Back to login
                        </Button>
                        <Button onClick={() => navigate(0)}>
                            Try again
                        </Button>
                    </CardContent>
                )}
            </Card>
        </div>
    );
}

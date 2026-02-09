import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, ExternalLink, Key, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/hooks/use-toast';
import { verifyNotionIntegration } from '@/lib/notion';

export default function Login() {
  const navigate = useNavigate();
  const { setNotionConnection } = useAppStore();
  const { toast } = useToast();
  const [accessToken, setAccessToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'intro' | 'token'>('intro');

  const handleConnect = async () => {
    if (!accessToken.trim()) {
      toast({
        title: 'Token obrigatório',
        description: 'Por favor, insira seu Integration Token do Notion.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const connection = await verifyNotionIntegration(accessToken.trim());
      setNotionConnection(connection);

      toast({
        title: 'Conectado com sucesso!',
        description: 'Sua conta do Notion foi vinculada.',
      });

      navigate('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível conectar ao Notion.';
      toast({
        title: 'Erro ao conectar',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      {/* Background gradient effect */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
      </div>

      {/* Logo */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary neon-glow">
          <BarChart3 className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold">
          Notion<span className="text-primary">Charts</span>
        </h1>
      </div>

      {step === 'intro' ? (
        <Card className="w-full max-w-md animate-fade-in border-border bg-card/80 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Crie gráficos incríveis</CardTitle>
            <CardDescription>
              Transforme seus dados do Notion em visualizações embedáveis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  <p className="font-medium">Conecte seu Notion</p>
                  <p className="text-sm text-muted-foreground">
                    Vincule suas databases em segundos
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  <p className="font-medium">Configure seus gráficos</p>
                  <p className="text-sm text-muted-foreground">
                    Escolha métricas, cores e estilos
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  <p className="font-medium">Embed no Notion</p>
                  <p className="text-sm text-muted-foreground">
                    Cole o link e veja a mágica acontecer
                  </p>
                </div>
              </div>
            </div>

            <Button
              className="w-full neon-glow"
              size="lg"
              onClick={() => setStep('token')}
            >
              Começar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-md animate-fade-in border-border bg-card/80 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <Key className="h-6 w-6" />
              Conectar com Notion
            </CardTitle>
            <CardDescription>
              Cole seu Integration Token para conectar sua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="token" className="text-sm font-medium">
                  Integration Token
                </label>
                <Input
                  id="token"
                  type="password"
                  placeholder="secret_..."
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="rounded-lg bg-secondary/50 p-4">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Como obter seu token:</strong>
                </p>
                <ol className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>1. Acesse notion.so/my-integrations</li>
                  <li>2. Crie uma nova integração</li>
                  <li>3. Copie o "Internal Integration Token"</li>
                  <li>4. Compartilhe suas pages com a integração</li>
                </ol>
                <Button
                  variant="link"
                  className="mt-2 h-auto p-0 text-primary"
                  asChild
                >
                  <a
                    href="https://www.notion.so/my-integrations"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir Notion Integrations
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </Button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep('intro')}
              >
                Voltar
              </Button>
              <Button
                className="flex-1 neon-glow"
                onClick={handleConnect}
                disabled={isLoading}
              >
                {isLoading ? 'Conectando...' : 'Conectar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="mt-8 text-sm text-muted-foreground">
        Seus dados ficam seguros e privados
      </p>
    </div>
  );
}

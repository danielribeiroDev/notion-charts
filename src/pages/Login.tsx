import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, ArrowRight, CheckCircle2, Mail, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { loginUser, registerUser } from '@/lib/auth';
import { useAppStore } from '@/store/useAppStore';

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const setSession = useAppStore((s) => s.setSession);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe e-mail e senha.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const fn = mode === 'login' ? loginUser : registerUser;
      const res = await fn(email.trim(), password.trim());
      setSession({ user: { email: email.trim() }, accessToken: res.accessToken, refreshToken: res.refreshToken });
      toast({
        title: mode === 'login' ? 'Login realizado' : 'Conta criada',
        description: 'Você já pode acessar seus workspaces.',
      });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha na autenticação.';
      toast({
        title: 'Erro',
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

      <Card className="w-full max-w-md animate-fade-in border-border bg-card/80 backdrop-blur">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Acesse sua conta</CardTitle>
          <CardDescription>
            Crie ou entre para gerenciar seus workspaces
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
              <div>
                <p className="font-medium">Crie sua conta</p>
                <p className="text-sm text-muted-foreground">
                  Registre-se ou faça login para continuar
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
              <div>
                <p className="font-medium">Crie workspaces</p>
                <p className="text-sm text-muted-foreground">
                  Organize seus gráficos por projeto
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
              <div>
                <p className="font-medium">Conecte ao Notion</p>
                <p className="text-sm text-muted-foreground">
                  Vincule um workspace para gerar gráficos
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">E-mail</label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">Senha</label>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
              </div>
            </div>
          </div>

          <Button
            className="w-full neon-glow"
            size="lg"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {mode === 'login' ? 'Entrando...' : 'Criando conta...'}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                {mode === 'login' ? 'Entrar' : 'Registrar'}
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>

          <Button
            variant="link"
            className="w-full text-sm"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login'
              ? 'Não tem conta? Registrar'
              : 'Já tem conta? Entrar'}
          </Button>
        </CardContent>
      </Card>

      <p className="mt-8 text-sm text-muted-foreground">
        Seus dados ficam seguros e privados
      </p>
    </div>
  );
}

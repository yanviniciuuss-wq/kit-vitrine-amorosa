import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSupabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShoppingBag, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — VitrineJá" },
      { name: "description", content: "Acesse ou crie sua conta de lojista no VitrineJá." },
      { property: "og:title", content: "Entrar — VitrineJá" },
      { property: "og:description", content: "Acesse sua vitrine digital." },
    ],
  }),
  component: AuthPage,
  errorComponent: AuthErrorFallback,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setConfigured(false);
      return;
    }
    try {
      getSupabase()
        .auth.getSession()
        .then(({ data }) => {
          if (data.session) navigate({ to: "/dashboard" });
        })
        .catch((err) => {
          console.error("[v0] Falha ao obter sessão:", err);
        });
    } catch (err) {
      console.error("[v0] Supabase não inicializado:", err);
      setConfigured(false);
    }
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await getSupabase().auth.signInWithPassword({ email, password });
      if (error) return toast.error(error.message);
      toast.success("Bem-vindo!");
      navigate({ to: "/dashboard" });
    } catch (err) {
      console.error("[v0] Erro no login:", err);
      toast.error("Não foi possível entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await getSupabase().auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + "/auth/callback",
          data: { full_name: name },
        },
      });
      if (error) return toast.error(error.message);
      toast.success("Conta criada! Verifique seu e-mail se pedido, ou entre agora.");
    } catch (err) {
      console.error("[v0] Erro no cadastro:", err);
      toast.error("Não foi possível criar a conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    try {
      const { error } = await getSupabase().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/auth/callback",
        },
      });
      if (error) toast.error("Falha no login com Google");
    } catch (err) {
      console.error("[v0] Erro no login com Google:", err);
      toast.error("Não foi possível conectar com o Google.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 font-bold text-lg">
          <ShoppingBag className="h-5 w-5 text-primary" /> VitrineJá
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Acesse sua loja</CardTitle>
          </CardHeader>
          <CardContent>
            {!configured && (
              <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  A conexão com o Supabase não está configurada. Verifique as variáveis de ambiente para habilitar o login.
                </span>
              </div>
            )}
            <Button type="button" variant="outline" className="w-full" onClick={google} disabled={!configured}>
              Continuar com Google
            </Button>
            <div className="my-4 text-center text-xs text-muted-foreground">ou</div>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={signIn} className="space-y-3">
                  <div><Label>E-mail</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div><Label>Senha</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                  <Button type="submit" className="w-full" disabled={loading || !configured}>Entrar</Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={signUp} className="space-y-3">
                  <div><Label>Nome</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
                  <div><Label>E-mail</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div><Label>Senha</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                  <Button type="submit" className="w-full" disabled={loading || !configured}>Criar minha loja</Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AuthErrorFallback({ error }: { error: Error }) {
  console.error("[v0] AuthErrorFallback:", error);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Não foi possível carregar o login
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Ocorreu um problema ao carregar a tela de autenticação. Isso costuma acontecer quando a
              conexão com o Supabase ainda não está configurada.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => window.location.reload()} className="flex-1">
                Tentar novamente
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link to="/">Voltar ao início</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

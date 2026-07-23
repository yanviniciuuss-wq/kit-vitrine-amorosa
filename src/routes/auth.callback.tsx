import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { getSupabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShoppingBag, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrando… — VitrineJá" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallback,
  errorComponent: CallbackErrorFallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    async function finish() {
      if (!isSupabaseConfigured()) {
        toast.error("Conexão com o Supabase não configurada.");
        navigate({ to: "/auth" });
        return;
      }

      try {
        const supabase = getSupabase();

        // Caso o provedor retorne um erro na URL (ex.: acesso negado).
        const params = new URLSearchParams(window.location.search);
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const authError = params.get("error") ?? hash.get("error");
        if (authError) {
          const description = params.get("error_description") ?? hash.get("error_description");
          toast.error(description ?? "Não foi possível concluir o login.");
          navigate({ to: "/auth" });
          return;
        }

        // Se veio um "code" (fluxo PKCE), troca explicitamente por uma sessão.
        const code = params.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            toast.error("Falha ao concluir o login.");
            if (active) navigate({ to: "/auth" });
            return;
          }
        }

        // Com detectSessionInUrl, o fluxo implícito já persiste a sessão.
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        if (data.session) {
          toast.success("Bem-vindo!");
          navigate({ to: "/dashboard" });
        } else {
          navigate({ to: "/auth" });
        }
      } catch (err) {
        console.error("[v0] Erro no callback de auth:", err);
        if (!active) return;
        toast.error("Não foi possível concluir o login.");
        navigate({ to: "/auth" });
      }
    }

    finish();
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <div className="flex items-center gap-2 font-bold text-lg mb-4">
        <ShoppingBag className="h-5 w-5 text-primary" /> VitrineJá
      </div>
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary"
        role="status"
        aria-label="Concluindo login"
      />
      <p className="mt-4 text-sm text-muted-foreground">Concluindo seu login…</p>
    </div>
  );
}

function CallbackErrorFallback({ error }: { error: Error }) {
  console.error("[v0] CallbackErrorFallback:", error);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <p className="mt-4 text-sm text-muted-foreground max-w-sm">
        Não foi possível concluir o login. Tente entrar novamente.
      </p>
      <Button asChild className="mt-4">
        <Link to="/auth">Voltar para o login</Link>
      </Button>
    </div>
  );
}

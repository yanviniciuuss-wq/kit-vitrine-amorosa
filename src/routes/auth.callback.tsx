import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrando… — VitrineJá" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    async function finish() {
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

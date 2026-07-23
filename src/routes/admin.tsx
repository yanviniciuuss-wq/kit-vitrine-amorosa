import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useRoles } from "@/lib/use-session";
import { toast } from "sonner";
import { ShoppingBag, LogOut } from "lucide-react";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Super Admin — VitrineJá" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

type StoreRow = {
  id: string; slug: string; name: string; owner_id: string;
  is_blocked: boolean; created_at: string; whatsapp_number: string;
};

function AdminPage() {
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const { isAdmin, loading: rolesLoading } = useRoles(user);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [counts, setCounts] = useState<{ stores: number; products: number }>({ stores: 0, products: 0 });

  useEffect(() => {
    if (loading || rolesLoading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!isAdmin) { navigate({ to: "/dashboard" }); return; }
    load();
  }, [user, loading, isAdmin, rolesLoading]);

  async function load() {
    const { data } = await supabase.from("stores").select("*").order("created_at", { ascending: false });
    setStores((data ?? []) as StoreRow[]);
    const { count: prodCount } = await supabase.from("products").select("*", { count: "exact", head: true });
    setCounts({ stores: data?.length ?? 0, products: prodCount ?? 0 });
  }

  async function toggleBlock(s: StoreRow) {
    const { error } = await supabase.from("stores").update({ is_blocked: !s.is_blocked }).eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success(s.is_blocked ? "Loja desbloqueada" : "Loja bloqueada");
    load();
  }

  async function del(s: StoreRow) {
    if (!confirm(`Excluir loja "${s.name}" e todos os produtos? Esta ação é irreversível.`)) return;
    const { error } = await supabase.from("stores").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Loja excluída");
    load();
  }

  async function signOut() { await supabase.auth.signOut(); navigate({ to: "/" }); }

  if (loading || rolesLoading || !isAdmin) return <div className="flex min-h-screen items-center justify-center">Carregando...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-bold"><ShoppingBag className="h-5 w-5 text-primary" /> VitrineJá <Badge className="ml-2">Admin</Badge></Link>
          <div className="flex gap-2">
            <Link to="/dashboard"><Button variant="outline" size="sm">Meu painel</Button></Link>
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sair</Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Lojas cadastradas" value={counts.stores} />
          <StatCard label="Produtos totais" value={counts.products} />
          <StatCard label="Lojas bloqueadas" value={stores.filter((s) => s.is_blocked).length} />
        </div>
        <Card>
          <CardHeader><CardTitle>Todas as lojas</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Slug</TableHead><TableHead>WhatsApp</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {stores.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell><a className="text-primary underline" href={`/loja/${s.slug}`} target="_blank" rel="noreferrer">/loja/{s.slug}</a></TableCell>
                    <TableCell>{s.whatsapp_number || "—"}</TableCell>
                    <TableCell>{s.is_blocked ? <Badge variant="destructive">Bloqueada</Badge> : <Badge variant="secondary">Ativa</Badge>}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => toggleBlock(s)}>{s.is_blocked ? "Desbloquear" : "Bloquear"}</Button>
                      <Button variant="destructive" size="sm" onClick={() => del(s)}>Excluir</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {stores.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma loja ainda.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card><CardContent className="p-6"><div className="text-sm text-muted-foreground">{label}</div><div className="mt-2 text-3xl font-bold">{value}</div></CardContent></Card>
  );
}

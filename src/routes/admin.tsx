import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useRoles } from "@/lib/use-session";
import { toast } from "sonner";
import { formatBRL } from "@/lib/cart";
import { ShoppingBag, LogOut, Store, Users, Receipt, Ban, Trash2, Eye, Search } from "lucide-react";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Super Admin — VitrineJá" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

type StoreRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  owner_id: string;
  is_blocked: boolean;
  created_at: string;
  whatsapp_number: string;
  primary_color: string;
  logo_url: string | null;
  banner_url: string | null;
};

type StoreStats = {
  productCount: number;
  orderCount: number;
  revenue: number;
};

type OrderDetail = {
  id: string;
  created_at: string;
  total: number;
  status: string;
  order_items: { id: string; name: string; price: number; quantity: number; note: string | null }[];
};

type OwnerProfile = { email: string | null; full_name: string | null };

function AdminPage() {
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const { isAdmin, loading: rolesLoading } = useRoles(user);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [activeOwners, setActiveOwners] = useState(0);
  const [search, setSearch] = useState("");
  const [detailStore, setDetailStore] = useState<StoreRow | null>(null);

  useEffect(() => {
    if (loading || rolesLoading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!isAdmin) { navigate({ to: "/dashboard" }); return; }
    load();
  }, [user, loading, isAdmin, rolesLoading]);

  async function load() {
    const { data } = await supabase.from("stores").select("*").order("created_at", { ascending: false });
    const storeList = (data ?? []) as StoreRow[];
    setStores(storeList);

    const { count } = await supabase.from("orders").select("*", { count: "exact", head: true });
    setTotalOrders(count ?? 0);

    const { count: ownerCount } = await supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "lojista");
    setActiveOwners(ownerCount ?? 0);
  }

  async function toggleBlock(s: StoreRow) {
    const { error } = await supabase.from("stores").update({ is_blocked: !s.is_blocked }).eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success(s.is_blocked ? "Loja desbloqueada" : "Loja bloqueada");
    load();
  }

  async function del(s: StoreRow) {
    if (!confirm(`Excluir loja "${s.name}" e todos os produtos e pedidos? Esta ação é irreversível.`)) return;
    const { error } = await supabase.from("stores").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Loja excluída");
    load();
  }

  async function signOut() { await supabase.auth.signOut(); navigate({ to: "/" }); }

  if (loading || rolesLoading || !isAdmin) return <div className="flex min-h-screen items-center justify-center">Carregando...</div>;

  const filtered = stores.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.slug.toLowerCase().includes(search.toLowerCase()) ||
    (s.whatsapp_number ?? "").includes(search)
  );

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
        <div>
          <h1 className="text-2xl font-bold">Painel do Super Administrador</h1>
          <p className="text-muted-foreground">Visão geral da plataforma e gestão das lojas.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard icon={<Store className="h-5 w-5 text-primary" />} label="Lojas cadastradas" value={stores.length} />
          <StatCard icon={<Receipt className="h-5 w-5 text-primary" />} label="Total de pedidos" value={totalOrders} />
          <StatCard icon={<Users className="h-5 w-5 text-primary" />} label="Lojistas ativos" value={activeOwners} />
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Todas as lojas</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Buscar por nome, slug ou WhatsApp..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loja</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell><a className="text-primary underline" href={`/loja/${s.slug}`} target="_blank" rel="noreferrer">/loja/{s.slug}</a></TableCell>
                    <TableCell>{s.whatsapp_number || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(s.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{s.is_blocked ? <Badge variant="destructive">Bloqueada</Badge> : <Badge variant="secondary">Ativa</Badge>}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => setDetailStore(s)}><Eye className="mr-1 h-4 w-4" />Detalhes</Button>
                      <Button variant="outline" size="sm" onClick={() => toggleBlock(s)}>
                        {s.is_blocked ? "Desbloquear" : <><Ban className="mr-1 h-4 w-4" />Bloquear</>}
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => del(s)}><Trash2 className="mr-1 h-4 w-4" />Excluir</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma loja encontrada.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {detailStore && <StoreDetailDialog store={detailStore} onClose={() => setDetailStore(null)} />}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}{label}</div>
        <div className="mt-2 text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function StoreDetailDialog({ store, onClose }: { store: StoreRow; onClose: () => void }) {
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: prods }, { count: prodCount }] = await Promise.all([
        supabase.from("products").select("id").eq("store_id", store.id),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("store_id", store.id),
      ]);
      const { data: orderData } = await supabase
        .from("orders")
        .select("id, created_at, total, status, order_items(id, name, price, quantity, note)")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false })
        .limit(20);
      const { data: ownerData } = await supabase.from("profiles").select("email, full_name").eq("id", store.owner_id).maybeSingle();

      if (cancelled) return;
      const orderList = (orderData ?? []) as OrderDetail[];
      const revenue = orderList.filter((o) => o.status !== "cancelled").reduce((s, o) => s + Number(o.total), 0);
      setStats({ productCount: prodCount ?? 0, orderCount: orderList.length, revenue });
      setOrders(orderList);
      setOwner((ownerData as OwnerProfile) ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [store.id]);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {store.logo_url && <img src={store.logo_url} alt="" className="h-8 w-8 rounded-full object-cover" />}
            {store.name}
            {store.is_blocked ? <Badge variant="destructive">Bloqueada</Badge> : <Badge variant="secondary">Ativa</Badge>}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Carregando detalhes...</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">Produtos</div><div className="mt-1 text-xl font-bold">{stats?.productCount ?? 0}</div></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">Pedidos</div><div className="mt-1 text-xl font-bold">{stats?.orderCount ?? 0}</div></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><div className="text-xs text-muted-foreground">Receita</div><div className="mt-1 text-xl font-bold">{formatBRL(stats?.revenue ?? 0)}</div></CardContent></Card>
            </div>

            <div className="space-y-1 text-sm">
              <div><span className="text-muted-foreground">Slug:</span> <a className="text-primary underline" href={`/loja/${store.slug}`} target="_blank" rel="noreferrer">/loja/{store.slug}</a></div>
              <div><span className="text-muted-foreground">WhatsApp:</span> {store.whatsapp_number || "—"}</div>
              <div><span className="text-muted-foreground">Cor principal:</span> <span className="inline-flex items-center gap-1"><span className="h-4 w-4 rounded border" style={{ background: store.primary_color }} />{store.primary_color}</span></div>
              <div><span className="text-muted-foreground">Criada em:</span> {new Date(store.created_at).toLocaleString("pt-BR")}</div>
              {store.description && <div><span className="text-muted-foreground">Descrição:</span> {store.description}</div>}
              <div className="border-t pt-2">
                <div className="text-muted-foreground font-medium mb-1">Dados do lojista (suporte)</div>
                <div><span className="text-muted-foreground">Nome:</span> {owner?.full_name ?? "—"}</div>
                <div><span className="text-muted-foreground">E-mail:</span> {owner?.email ?? "—"}</div>
                <div><span className="text-muted-foreground">ID:</span> <code className="text-xs">{store.owner_id}</code></div>
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-medium">Pedidos recentes</div>
              {orders.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">Nenhum pedido.</div>
              ) : (
                <div className="space-y-2">
                  {orders.map((o) => (
                    <div key={o.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                      <div>
                        <div className="font-medium">{new Date(o.created_at).toLocaleString("pt-BR")}</div>
                        <div className="text-xs text-muted-foreground">{o.order_items.length} {o.order_items.length === 1 ? "item" : "itens"}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {o.status === "confirmed" && <Badge variant="secondary">Confirmado</Badge>}
                        {o.status === "cancelled" && <Badge variant="destructive">Cancelado</Badge>}
                        {o.status === "pending" && <Badge variant="default">Pendente</Badge>}
                        <span className="font-bold">{formatBRL(Number(o.total))}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useRoles } from "@/lib/use-session";
import { toast } from "sonner";
import { ExternalLink, LogOut, Plus, ShoppingBag, Trash2, Receipt } from "lucide-react";
import { formatBRL } from "@/lib/cart";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({ meta: [{ title: "Painel do lojista — VitrineJá" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

type Store = {
  id: string; slug: string; name: string; description: string | null;
  logo_url: string | null; banner_url: string | null; primary_color: string;
  whatsapp_number: string; is_blocked: boolean;
};
type Product = { id: string; name: string; description: string | null; price: number; stock: number; image_url: string | null; is_active: boolean; category_id: string | null };
type Category = { id: string; name: string };

function Dashboard() {
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const { isAdmin } = useRoles(user);
  const [store, setStore] = useState<Store | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    supabase.from("stores").select("*").eq("owner_id", user.id).maybeSingle()
      .then(({ data }) => { setStore(data as Store | null); setLoadingStore(false); });
  }, [user, loading, navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (loading || loadingStore) return <div className="flex min-h-screen items-center justify-center">Carregando...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-bold"><ShoppingBag className="h-5 w-5 text-primary" /> VitrineJá</Link>
          <div className="flex items-center gap-2">
            {isAdmin && <Link to="/admin"><Button variant="outline" size="sm">Super Admin</Button></Link>}
            {store && <a href={`/loja/${store.slug}`} target="_blank" rel="noreferrer"><Button variant="outline" size="sm"><ExternalLink className="mr-2 h-4 w-4" />Ver vitrine</Button></a>}
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sair</Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {!store ? <CreateStore userId={user!.id} onCreated={setStore} /> : <StoreManager store={store} onChange={setStore} />}
      </main>
    </div>
  );
}

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

function CreateStore({ userId, onCreated }: { userId: string; onCreated: (s: Store) => void }) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const slug = slugify(name) + "-" + Math.random().toString(36).slice(2, 6);
    const { data, error } = await supabase.from("stores").insert({
      owner_id: userId, name, slug, whatsapp_number: whatsapp,
    }).select().single();
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Loja criada!");
    onCreated(data as Store);
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader><CardTitle>Criar sua loja</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div><Label>Nome da loja</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div>
            <Label>WhatsApp (com DDD e código do país)</Label>
            <Input required placeholder="5511999999999" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            <p className="mt-1 text-xs text-muted-foreground">Ex: 5511987654321 (55 = Brasil).</p>
          </div>
          <Button type="submit" disabled={loading} className="w-full">Criar loja</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function StoreManager({ store, onChange }: { store: Store; onChange: (s: Store) => void }) {
  return (
    <Tabs defaultValue="products">
      <TabsList>
        <TabsTrigger value="products">Produtos</TabsTrigger>
        <TabsTrigger value="categories">Categorias</TabsTrigger>
        <TabsTrigger value="orders">Pedidos</TabsTrigger>
        <TabsTrigger value="settings">Loja</TabsTrigger>
      </TabsList>
      <TabsContent value="products"><ProductsPanel store={store} /></TabsContent>
      <TabsContent value="categories"><CategoriesPanel store={store} /></TabsContent>
      <TabsContent value="orders"><OrdersPanel store={store} /></TabsContent>
      <TabsContent value="settings"><SettingsPanel store={store} onChange={onChange} /></TabsContent>
    </Tabs>
  );
}

function SettingsPanel({ store, onChange }: { store: Store; onChange: (s: Store) => void }) {
  const [form, setForm] = useState(store);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { data, error } = await supabase.from("stores").update({
      name: form.name, description: form.description, logo_url: form.logo_url,
      banner_url: form.banner_url, primary_color: form.primary_color,
      whatsapp_number: form.whatsapp_number, slug: form.slug,
    }).eq("id", store.id).select().single();
    setSaving(false);
    if (error) return toast.error(error.message);
    onChange(data as Store);
    toast.success("Salvo!");
  }

  return (
    <Card className="mt-4">
      <CardHeader><CardTitle>Dados da loja</CardTitle></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>Slug (URL)</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /><p className="text-xs text-muted-foreground mt-1">/loja/{form.slug}</p></div>
        <div className="md:col-span-2"><Label>Descrição</Label><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div><Label>URL do logo</Label><Input value={form.logo_url ?? ""} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} /></div>
        <div><Label>URL do banner</Label><Input value={form.banner_url ?? ""} onChange={(e) => setForm({ ...form, banner_url: e.target.value })} /></div>
        <div><Label>Cor principal</Label><Input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} /></div>
        <div><Label>WhatsApp (com DDI)</Label><Input value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} /></div>
        <div className="md:col-span-2"><Button onClick={save} disabled={saving}>Salvar alterações</Button></div>
      </CardContent>
    </Card>
  );
}

function CategoriesPanel({ store }: { store: Store }) {
  const [cats, setCats] = useState<Category[]>([]);
  const [name, setName] = useState("");
  async function load() {
    const { data } = await supabase.from("categories").select("*").eq("store_id", store.id).order("sort_order");
    setCats((data ?? []) as Category[]);
  }
  useEffect(() => { load(); }, [store.id]);
  async function add() {
    if (!name.trim()) return;
    const { error } = await supabase.from("categories").insert({ store_id: store.id, name });
    if (error) return toast.error(error.message);
    setName(""); load();
  }
  async function del(id: string) {
    if (!confirm("Excluir categoria?")) return;
    await supabase.from("categories").delete().eq("id", id);
    load();
  }
  return (
    <Card className="mt-4">
      <CardHeader><CardTitle>Categorias</CardTitle></CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input placeholder="Nome da categoria" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={add}><Plus className="h-4 w-4" /></Button>
        </div>
        <ul className="divide-y">
          {cats.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2">
              <span>{c.name}</span>
              <Button variant="ghost" size="icon" onClick={() => del(c.id)}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
          {cats.length === 0 && <li className="py-4 text-sm text-muted-foreground">Nenhuma categoria ainda.</li>}
        </ul>
      </CardContent>
    </Card>
  );
}

function ProductsPanel({ store }: { store: Store }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  async function load() {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("products").select("*").eq("store_id", store.id).order("created_at", { ascending: false }),
      supabase.from("categories").select("*").eq("store_id", store.id),
    ]);
    setProducts((p ?? []) as Product[]);
    setCats((c ?? []) as Category[]);
  }
  useEffect(() => { load(); }, [store.id]);

  async function del(id: string) {
    if (!confirm("Excluir produto?")) return;
    await supabase.from("products").delete().eq("id", id);
    load();
  }

  return (
    <Card className="mt-4">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Produtos</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={() => setEditing(null)}><Plus className="mr-2 h-4 w-4" />Novo produto</Button></DialogTrigger>
          <ProductForm store={store} cats={cats} product={editing} onSaved={() => { setOpen(false); load(); }} />
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Preço</TableHead><TableHead>Estoque</TableHead><TableHead>Ativo</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{formatBRL(Number(p.price))}</TableCell>
                <TableCell>{p.stock}</TableCell>
                <TableCell>{p.is_active ? "Sim" : "Não"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(p); setOpen(true); }}>Editar</Button>
                  <Button variant="ghost" size="icon" onClick={() => del(p.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {products.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sem produtos ainda.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

type OrderRow = {
  id: string;
  created_at: string;
  total: number;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  order_items: { id: string; name: string; price: number; quantity: number; note: string | null }[];
};

function statusBadge(status: string) {
  if (status === "confirmed") return <Badge variant="secondary">Confirmado</Badge>;
  if (status === "cancelled") return <Badge variant="destructive">Cancelado</Badge>;
  return <Badge variant="default">Pendente</Badge>;
}

function OrdersPanel({ store }: { store: Store }) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("id, created_at, total, status, customer_name, customer_phone, order_items(id, name, price, quantity, note)")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });
    setOrders((data ?? []) as OrderRow[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [store.id]);

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    load();
  }

  async function del(id: string) {
    if (!confirm("Excluir este pedido?")) return;
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Pedido excluído");
    load();
  }

  const totalRevenue = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + Number(o.total), 0);
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-6"><div className="text-sm text-muted-foreground">Total de pedidos</div><div className="mt-2 text-3xl font-bold">{orders.length}</div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-sm text-muted-foreground">Pedidos pendentes</div><div className="mt-2 text-3xl font-bold">{pendingCount}</div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-sm text-muted-foreground">Receita (confirmados)</div><div className="mt-2 text-3xl font-bold">{formatBRL(totalRevenue)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Histórico de pedidos recebidos</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Carregando...</div>
          ) : orders.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">Nenhum pedido recebido ainda.</div>
          ) : (
            <div className="divide-y">
              {orders.map((o) => (
                <div key={o.id} className="py-3">
                  <button
                    className="flex w-full items-center justify-between gap-2 text-left"
                    onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium">{new Date(o.created_at).toLocaleString("pt-BR")}</div>
                        <div className="text-xs text-muted-foreground">
                          {o.order_items.length} {o.order_items.length === 1 ? "item" : "itens"}
                          {o.customer_name ? ` · ${o.customer_name}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {statusBadge(o.status)}
                      <div className="font-bold">{formatBRL(Number(o.total))}</div>
                    </div>
                  </button>
                  {expanded === o.id && (
                    <div className="mt-3 space-y-2 rounded-md border p-3 bg-muted/30">
                      {o.order_items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <div>
                            <span className="font-medium">{item.quantity}x</span> {item.name}
                            {item.note && <div className="text-xs text-muted-foreground">Obs: {item.note}</div>}
                          </div>
                          <div className="text-muted-foreground">{formatBRL(Number(item.price) * item.quantity)}</div>
                        </div>
                      ))}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {o.status !== "confirmed" && (
                          <Button size="sm" variant="secondary" onClick={() => updateStatus(o.id, "confirmed")}>Confirmar</Button>
                        )}
                        {o.status !== "cancelled" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(o.id, "cancelled")}>Cancelar</Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => del(o.id)}><Trash2 className="mr-1 h-4 w-4" />Excluir</Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ProductForm({ store, cats, product, onSaved }: { store: Store; cats: Category[]; product: Product | null; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Product>>(product ?? { name: "", description: "", price: 0, stock: 0, image_url: "", is_active: true, category_id: null });
  useEffect(() => { setForm(product ?? { name: "", description: "", price: 0, stock: 0, image_url: "", is_active: true, category_id: null }); }, [product]);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const payload = {
      store_id: store.id,
      name: form.name ?? "", description: form.description ?? null,
      price: Number(form.price ?? 0), stock: Number(form.stock ?? 0),
      image_url: form.image_url ?? null, is_active: form.is_active ?? true,
      category_id: form.category_id || null,
    };
    const { error } = product
      ? await supabase.from("products").update(payload).eq("id", product.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Salvo!");
    onSaved();
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{product ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div><Label>Nome</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>Descrição</Label><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={form.price ?? 0} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
          <div><Label>Estoque</Label><Input type="number" value={form.stock ?? 0} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} /></div>
        </div>
        <div><Label>URL da imagem</Label><Input value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
        <div>
          <Label>Categoria</Label>
          <select className="w-full rounded-md border bg-background p-2" value={form.category_id ?? ""} onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}>
            <option value="">— sem categoria —</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2"><Switch checked={form.is_active ?? true} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Ativo (visível na vitrine)</Label></div>
      </div>
      <DialogFooter><Button onClick={save} disabled={saving}>Salvar</Button></DialogFooter>
    </DialogContent>
  );
}

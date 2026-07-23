import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useCart, formatBRL, buildWhatsAppMessage, whatsappUrl } from "@/lib/cart";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Store = { id: string; slug: string; name: string; description: string | null; logo_url: string | null; banner_url: string | null; primary_color: string; whatsapp_number: string; is_blocked: boolean };
type Product = { id: string; name: string; description: string | null; price: number; image_url: string | null; category_id: string | null; stock: number };
type Category = { id: string; name: string };

export const Route = createFileRoute("/loja/$slug")({
  ssr: false,
  head: ({ params }) => ({
    meta: [
      { title: `Loja ${params.slug} — VitrineJá` },
      { name: "description", content: `Vitrine da loja ${params.slug}. Faça seu pedido pelo WhatsApp.` },
      { property: "og:title", content: `Loja ${params.slug}` },
      { property: "og:description", content: `Vitrine com pedidos via WhatsApp.` },
    ],
  }),
  component: Storefront,
});

function Storefront() {
  const { slug } = Route.useParams();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [notfound, setNotfound] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const cart = useCart(slug);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("stores").select("*").eq("slug", slug).maybeSingle();
      if (!s) { setNotfound(true); setLoading(false); return; }
      setStore(s as Store);
      const [{ data: p }, { data: c }] = await Promise.all([
        supabase.from("products").select("*").eq("store_id", s.id).eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("categories").select("*").eq("store_id", s.id).order("sort_order"),
      ]);
      setProducts((p ?? []) as Product[]);
      setCats((c ?? []) as Category[]);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="flex min-h-screen items-center justify-center">Carregando...</div>;
  if (notfound || !store) return <div className="flex min-h-screen items-center justify-center text-center"><div><h1 className="text-2xl font-bold">Loja não encontrada</h1><p className="text-muted-foreground mt-2">Verifique o endereço.</p></div></div>;
  if (store.is_blocked) return <div className="flex min-h-screen items-center justify-center text-center"><div><h1 className="text-2xl font-bold">Loja indisponível</h1></div></div>;

  const visible = filter ? products.filter((p) => p.category_id === filter) : products;
  const primary = store.primary_color || "#0ea5e9";

  return (
    <div className="min-h-screen bg-background" style={{ ["--store-primary" as string]: primary }}>
      {store.banner_url && <div className="w-full h-40 md:h-56 bg-cover bg-center" style={{ backgroundImage: `url(${store.banner_url})` }} />}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {store.logo_url && <img src={store.logo_url} alt={store.name} className="h-10 w-10 rounded-full object-cover" />}
            <div><div className="font-bold" style={{ color: primary }}>{store.name}</div>{store.description && <div className="text-xs text-muted-foreground line-clamp-1">{store.description}</div>}</div>
          </div>
          <CartSheet store={store} cart={cart} primary={primary} />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {cats.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button onClick={() => setFilter(null)} className={`px-3 py-1 rounded-full text-sm border ${!filter ? "text-white" : ""}`} style={!filter ? { background: primary, borderColor: primary } : {}}>Todos</button>
            {cats.map((c) => (
              <button key={c.id} onClick={() => setFilter(c.id)} className={`px-3 py-1 rounded-full text-sm border ${filter === c.id ? "text-white" : ""}`} style={filter === c.id ? { background: primary, borderColor: primary } : {}}>{c.name}</button>
            ))}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <div key={p.id} className="rounded-lg border overflow-hidden flex flex-col">
              {p.image_url ? <img src={p.image_url} alt={p.name} className="aspect-square w-full object-cover" /> : <div className="aspect-square bg-muted" />}
              <div className="p-4 flex-1 flex flex-col">
                <div className="font-medium">{p.name}</div>
                {p.description && <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</div>}
                <div className="mt-3 font-bold text-lg" style={{ color: primary }}>{formatBRL(Number(p.price))}</div>
                <Button className="mt-3" style={{ background: primary }} onClick={() => { cart.add({ productId: p.id, name: p.name, price: Number(p.price) }); toast.success("Adicionado ao carrinho"); }}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>
            </div>
          ))}
          {visible.length === 0 && <div className="col-span-full py-16 text-center text-muted-foreground">Nenhum produto disponível.</div>}
        </div>
      </main>
    </div>
  );
}

function CartSheet({ store, cart, primary }: { store: Store; cart: ReturnType<typeof useCart>; primary: string }) {
  const [open, setOpen] = useState(false);

  function checkout() {
    if (cart.items.length === 0) return;
    if (!store.whatsapp_number) return toast.error("Esta loja ainda não configurou o WhatsApp.");
    const msg = buildWhatsAppMessage(store.name, cart.items, cart.total);
    const url = whatsappUrl(store.whatsapp_number, msg);
    window.open(url, "_blank");
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button style={{ background: primary }} className="relative">
          <ShoppingCart className="h-4 w-4 mr-2" /> Carrinho
          {cart.count > 0 && <span className="ml-2 rounded-full bg-white text-black text-xs px-2 py-0.5">{cart.count}</span>}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader><SheetTitle>Seu pedido</SheetTitle></SheetHeader>
        <div className="flex-1 overflow-auto space-y-4 py-4">
          {cart.items.length === 0 && <p className="text-center text-muted-foreground py-12">Carrinho vazio.</p>}
          {cart.items.map((i) => (
            <div key={i.productId} className="border rounded-lg p-3">
              <div className="flex justify-between items-start gap-2">
                <div className="font-medium">{i.name}</div>
                <Button variant="ghost" size="icon" onClick={() => cart.remove(i.productId)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div className="text-sm text-muted-foreground">{formatBRL(i.price)} un.</div>
              <div className="flex items-center gap-2 mt-2">
                <Button variant="outline" size="icon" onClick={() => cart.setQty(i.productId, i.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                <Input className="w-16 text-center" type="number" value={i.quantity} onChange={(e) => cart.setQty(i.productId, Number(e.target.value))} />
                <Button variant="outline" size="icon" onClick={() => cart.setQty(i.productId, i.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                <div className="ml-auto font-medium">{formatBRL(i.price * i.quantity)}</div>
              </div>
              <Textarea className="mt-2 text-sm" placeholder="Observações (opcional)" value={i.note ?? ""} onChange={(e) => cart.setNote(i.productId, e.target.value)} />
            </div>
          ))}
        </div>
        <SheetFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex justify-between items-center w-full text-lg font-bold">
            <span>Total</span><span>{formatBRL(cart.total)}</span>
          </div>
          <Button className="w-full" style={{ background: primary }} disabled={cart.items.length === 0} onClick={checkout}>
            Finalizar pedido no WhatsApp
          </Button>
          {cart.items.length > 0 && <Button variant="ghost" className="w-full" onClick={() => cart.clear()}>Limpar carrinho</Button>}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

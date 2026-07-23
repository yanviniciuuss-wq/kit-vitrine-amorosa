import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Smartphone, Store } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VitrineJá — Sua loja online com pedidos no WhatsApp" },
      { name: "description", content: "Crie a vitrine digital da sua loja em minutos. Cliente monta o carrinho e o pedido cai direto no seu WhatsApp." },
      { property: "og:title", content: "VitrineJá — Vitrine digital com checkout no WhatsApp" },
      { property: "og:description", content: "Crie sua vitrine grátis e receba pedidos direto no WhatsApp." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <ShoppingBag className="h-5 w-5 text-primary" /> VitrineJá
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost">Entrar</Button></Link>
            <Link to="/auth"><Button>Criar minha loja</Button></Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-20 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
            Sua vitrine digital com pedidos no <span className="text-primary">WhatsApp</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Monte seu catálogo em minutos. Os clientes escolhem os produtos, finalizam o pedido, e ele cai direto no seu WhatsApp — sem taxa de gateway, sem burocracia.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth"><Button size="lg">Começar de graça</Button></Link>
          </div>
        </section>

        <section className="container mx-auto grid gap-6 px-4 py-12 md:grid-cols-3">
          {[
            { icon: Store, title: "Sua marca, sua loja", desc: "Logo, banner, cor principal e URL /loja/sua-marca." },
            { icon: ShoppingBag, title: "Carrinho de verdade", desc: "Cliente adiciona quantidades e observações antes de fechar o pedido." },
            { icon: Smartphone, title: "Pedido no WhatsApp", desc: "Ao finalizar, você recebe a mensagem formatada com produtos e total." },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border p-6">
              <f.icon className="h-8 w-8 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} VitrineJá
      </footer>
    </div>
  );
}

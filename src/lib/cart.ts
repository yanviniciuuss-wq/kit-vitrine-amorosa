import { useEffect, useState, useCallback } from "react";

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  note?: string;
};

const key = (storeSlug: string) => `cart:${storeSlug}`;

export function useCart(storeSlug: string) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key(storeSlug));
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, [storeSlug]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(key(storeSlug), JSON.stringify(items));
  }, [items, storeSlug, ready]);

  const add = useCallback((item: Omit<CartItem, "quantity">, qty = 1) => {
    setItems((cur) => {
      const idx = cur.findIndex((c) => c.productId === item.productId);
      if (idx >= 0) {
        const copy = [...cur];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + qty };
        return copy;
      }
      return [...cur, { ...item, quantity: qty }];
    });
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    setItems((cur) =>
      qty <= 0 ? cur.filter((c) => c.productId !== productId) : cur.map((c) => (c.productId === productId ? { ...c, quantity: qty } : c)),
    );
  }, []);

  const setNote = useCallback((productId: string, note: string) => {
    setItems((cur) => cur.map((c) => (c.productId === productId ? { ...c, note } : c)));
  }, []);

  const remove = useCallback((productId: string) => {
    setItems((cur) => cur.filter((c) => c.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return { items, add, setQty, setNote, remove, clear, total, count, ready };
}

export function formatBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function buildWhatsAppMessage(storeName: string, items: CartItem[], total: number) {
  const lines = [`*Novo pedido — ${storeName}*`, ""];
  items.forEach((i) => {
    lines.push(`• ${i.quantity}x ${i.name} — ${formatBRL(i.price * i.quantity)}`);
    if (i.note) lines.push(`   _Obs: ${i.note}_`);
  });
  lines.push("", `*Total: ${formatBRL(total)}*`);
  return lines.join("\n");
}

export function whatsappUrl(number: string, message: string) {
  const clean = number.replace(/\D/g, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

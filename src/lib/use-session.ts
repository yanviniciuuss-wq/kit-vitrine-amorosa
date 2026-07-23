import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/integrations/supabase/client";

export type Role = "super_admin" | "lojista";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;
    try {
      const supabase = getSupabase();
      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
        setSession(s);
      });
      unsubscribe = () => sub.subscription.unsubscribe();
      supabase.auth
        .getSession()
        .then(({ data }) => {
          setSession(data.session);
          setLoading(false);
        })
        .catch((err) => {
          console.error("[v0] useSession getSession error:", err);
          setLoading(false);
        });
    } catch (err) {
      console.error("[v0] useSession init error:", err);
      setLoading(false);
    }

    return () => unsubscribe?.();
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export function useRoles(user: User | null) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user || !isSupabaseConfigured()) {
      setRoles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      getSupabase()
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .then(({ data }) => {
          setRoles(((data ?? []) as { role: Role }[]).map((r) => r.role));
          setLoading(false);
        });
    } catch (err) {
      console.error("[v0] useRoles error:", err);
      setRoles([]);
      setLoading(false);
    }
  }, [user?.id]);
  return { roles, loading, isAdmin: roles.includes("super_admin"), isLojista: roles.includes("lojista") };
}

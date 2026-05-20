"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tenant, AppUser } from "@/types";

export function useTenant() {
  const [tenant, setTenant]   = useState<Tenant | null>(null);
  const [user, setUser]       = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { setLoading(false); return; }
      const { data } = await supabase
        .from("users").select("*, tenants(*)").eq("id", authUser.id).single();
      if (data) {
        setUser(data as AppUser);
        setTenant((data as any).tenants as Tenant);
      }
      setLoading(false);
    })();
  }, []);

  return { tenant, user, loading };
}

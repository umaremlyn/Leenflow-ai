"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Lead } from "@/types";

// Subscribe to real-time lead captures for the dashboard notification dot
export function useRealtimeLeads(tenantId: string | null) {
  const [newLeads, setNewLeads] = useState<Lead[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel(`leads:${tenantId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads", filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          setNewLeads(prev => [payload.new as Lead, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenantId]);

  function clearNew() { setNewLeads([]); }

  return { newLeads, clearNew };
}

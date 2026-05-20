"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Assistant } from "@/types";

export function useAssistant(tenantId: string | null) {
  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [loading, setLoading]     = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!tenantId) return;
    supabase.from("assistants").select("*").eq("tenant_id", tenantId).single()
      .then(({ data }) => { setAssistant(data); setLoading(false); });
  }, [tenantId]);

  async function update(updates: Partial<Assistant>) {
    if (!tenantId) return;
    const { data } = await supabase.from("assistants")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("tenant_id", tenantId).select().single();
    if (data) setAssistant(data);
    return data;
  }

  return { assistant, loading, update };
}

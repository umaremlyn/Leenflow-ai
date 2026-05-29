-- ============================================================
-- Leen-Co AI — Make vector RPC functions take float8[] and cast
-- explicitly to vector(1536) inside.
--
-- supabase-js + PostgREST type coercion for `vector(1536)` parameters is
-- unreliable: passing a JS array sometimes stores/compares as JSON text
-- instead of a vector, causing retrieval to silently return zero results
-- even when chunks exist. Accepting float8[] and casting in SQL bypasses
-- the coercion entirely.
-- ============================================================

-- Drop the old match function so we can change its parameter signature
drop function if exists match_knowledge_chunks(uuid, vector, int, float);
drop function if exists match_knowledge_chunks(uuid, vector(1536), int, float);

create or replace function match_knowledge_chunks(
  p_tenant_id   uuid,
  p_embedding   float8[],
  p_match_count int    default 5,
  p_threshold   float  default 0.5
)
returns table (
  id          uuid,
  tenant_id   uuid,
  source_type text,
  source_id   uuid,
  content     text,
  conf_score  float,
  similarity  float
)
language sql stable as $$
  with q as (select p_embedding::vector(1536) as v)
  select
    kc.id, kc.tenant_id, kc.source_type, kc.source_id, kc.content, kc.conf_score,
    1 - (kc.embedding <=> q.v) as similarity
  from knowledge_chunks kc, q
  where
    kc.tenant_id = p_tenant_id
    and 1 - (kc.embedding <=> q.v) > p_threshold
  order by kc.embedding <=> q.v
  limit p_match_count;
$$;

-- Bulletproof insert path used by trainTenant
create or replace function insert_knowledge_chunk(
  p_tenant_id   uuid,
  p_source_type text,
  p_source_id   uuid,
  p_content     text,
  p_embedding   float8[],
  p_conf_score  float8
) returns uuid
language sql as $$
  insert into knowledge_chunks (tenant_id, source_type, source_id, content, embedding, conf_score)
  values (p_tenant_id, p_source_type, p_source_id, p_content, p_embedding::vector(1536), p_conf_score)
  returning id;
$$;

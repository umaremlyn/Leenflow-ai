-- ============================================================
-- Leen-Co AI — Bulletproof vector cast via text format
--
-- 008 used `p_embedding::vector(1536)` which depends on pgvector
-- registering a cast from float8[] to vector. On some pgvector versions
-- that cast either doesn't exist or produces a zero vector silently.
-- Building the canonical text form `[v1,v2,...]` and casting text→vector
-- is supported on every pgvector version since 0.1.
-- ============================================================

drop function if exists match_knowledge_chunks(uuid, float8[], int, float);
drop function if exists match_knowledge_chunks(uuid, vector, int, float);
drop function if exists match_knowledge_chunks(uuid, vector(1536), int, float);
drop function if exists insert_knowledge_chunk(uuid, text, uuid, text, float8[], float8);

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
  with q as (
    select ('[' || array_to_string(p_embedding, ',') || ']')::vector(1536) as v
  )
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
  values (
    p_tenant_id, p_source_type, p_source_id, p_content,
    ('[' || array_to_string(p_embedding, ',') || ']')::vector(1536),
    p_conf_score
  )
  returning id;
$$;

-- Diagnostic: returns top-K chunks with NO threshold so we can see actual
-- similarity scores when retrieval is unexpectedly empty.
create or replace function debug_top_chunks(
  p_tenant_id   uuid,
  p_embedding   float8[],
  p_match_count int default 5
)
returns table (
  source_type text,
  content     text,
  similarity  float
)
language sql stable as $$
  with q as (
    select ('[' || array_to_string(p_embedding, ',') || ']')::vector(1536) as v
  )
  select
    kc.source_type, kc.content,
    1 - (kc.embedding <=> q.v) as similarity
  from knowledge_chunks kc, q
  where kc.tenant_id = p_tenant_id
  order by kc.embedding <=> q.v
  limit p_match_count;
$$;

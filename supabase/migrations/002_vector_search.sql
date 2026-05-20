-- Vector similarity search function for RAG
create or replace function match_knowledge_chunks(
  p_tenant_id  uuid,
  p_embedding  vector(1536),
  p_match_count int     default 5,
  p_threshold   float   default 0.5
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
  select
    id, tenant_id, source_type, source_id, content, conf_score,
    1 - (embedding <=> p_embedding) as similarity
  from knowledge_chunks
  where
    tenant_id = p_tenant_id
    and 1 - (embedding <=> p_embedding) > p_threshold
  order by embedding <=> p_embedding
  limit p_match_count;
$$;

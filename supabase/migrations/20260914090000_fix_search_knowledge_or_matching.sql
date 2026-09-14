-- search_knowledge used AND-logic (plainto_tsquery) across every word in the
-- combined "message + intent hint" query, so knowledge_entries almost never
-- matched once the query had more than a couple of words. Switch to OR
-- matching (any word can match) while keeping the same ranking/weights.
CREATE OR REPLACE FUNCTION public.search_knowledge(
  search_query text,
  match_limit integer DEFAULT 8,
  filter_category public.kb_category DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  category public.kb_category,
  title text,
  summary text,
  content text,
  tags text[],
  keywords text[],
  priority integer,
  policy_type public.policy_type,
  service_id uuid,
  score real
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH q AS (
    SELECT
      CASE
        WHEN coalesce(search_query, '') = '' THEN ''::tsquery
        ELSE replace(plainto_tsquery('simple', search_query)::text, ' & ', ' | ')::tsquery
      END AS tsq,
      coalesce(search_query, '') AS raw
  )
  SELECT k.id, k.category, k.title, k.summary, k.content, k.tags, k.keywords,
         k.priority, k.policy_type, k.service_id,
         (
           ts_rank(
             to_tsvector('simple', coalesce(k.title,'') || ' ' || coalesce(k.summary,'') || ' ' || coalesce(k.content,'') || ' ' || array_to_string(k.tags,' ') || ' ' || array_to_string(k.keywords,' ')),
             q.tsq
           ) * 4.0
           + CASE WHEN q.raw <> '' AND k.title ILIKE '%' || q.raw || '%' THEN 1.0 ELSE 0 END
           + (k.priority::real / 100.0)
         )::real AS score
  FROM public.knowledge_entries k, q
  WHERE k.is_active
    AND (filter_category IS NULL OR k.category = filter_category)
    AND (
      q.raw = ''
      OR q.tsq = ''::tsquery
      OR to_tsvector('simple', coalesce(k.title,'') || ' ' || coalesce(k.summary,'') || ' ' || coalesce(k.content,'') || ' ' || array_to_string(k.tags,' ') || ' ' || array_to_string(k.keywords,' ')) @@ q.tsq
      OR k.title ILIKE '%' || q.raw || '%'
    )
  ORDER BY score DESC, k.priority DESC, k.sort_order ASC
  LIMIT greatest(1, coalesce(match_limit, 8));
$$;

GRANT EXECUTE ON FUNCTION public.search_knowledge(text, integer, public.kb_category) TO authenticated, service_role;

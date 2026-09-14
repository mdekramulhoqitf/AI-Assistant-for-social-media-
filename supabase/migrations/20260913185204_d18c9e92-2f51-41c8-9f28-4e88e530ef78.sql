-- Enums
CREATE TYPE public.handoff_state AS ENUM ('none','human_required','human_active','resolved');
CREATE TYPE public.ai_decision AS ENUM ('answer','clarify','collect_lead','handoff','ignore');
CREATE TYPE public.intent_type AS ENUM (
  'greeting','website_development','ecommerce','advertising','branding_design',
  'digital_marketing','pricing','portfolio','hosting_domain','support',
  'general_question','human_handoff','unknown'
);

ALTER TYPE public.sender_type ADD VALUE IF NOT EXISTS 'system';

-- Conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS external_conversation_id text,
  ADD COLUMN IF NOT EXISTS ai_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS handoff_state public.handoff_state NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS summary text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS last_intent public.intent_type,
  ADD COLUMN IF NOT EXISTS last_confidence numeric,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_conversations_handoff ON public.conversations (handoff_state);
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_external
  ON public.conversations (channel, external_conversation_id)
  WHERE external_conversation_id IS NOT NULL;

-- Messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS external_message_id text,
  ADD COLUMN IF NOT EXISTS intent public.intent_type,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS tokens_input integer,
  ADD COLUMN IF NOT EXISTS tokens_output integer,
  ADD COLUMN IF NOT EXISTS latency_ms integer,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages (created_at DESC);

-- Leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS business_type text,
  ADD COLUMN IF NOT EXISTS timeline text,
  ADD COLUMN IF NOT EXISTS preferred_contact text,
  ADD COLUMN IF NOT EXISTS source_channel public.channel_type,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS confidence numeric;

CREATE INDEX IF NOT EXISTS idx_leads_conversation ON public.leads (conversation_id);

-- AI settings
ALTER TABLE public.ai_settings
  ADD COLUMN IF NOT EXISTS model text NOT NULL DEFAULT 'gpt-4.1-mini',
  ADD COLUMN IF NOT EXISTS temperature numeric NOT NULL DEFAULT 0.4,
  ADD COLUMN IF NOT EXISTS max_reply_chars integer NOT NULL DEFAULT 700,
  ADD COLUMN IF NOT EXISTS context_message_limit integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS allow_price_quotes boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS fallback_message text NOT NULL DEFAULT '';

-- AI run log
CREATE TABLE IF NOT EXISTS public.ai_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  channel public.channel_type,
  incoming_message text NOT NULL DEFAULT '',
  intent public.intent_type,
  confidence numeric,
  decision public.ai_decision,
  detected_language text,
  knowledge_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  knowledge_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  reply text,
  model text,
  tokens_input integer,
  tokens_output integer,
  latency_ms integer,
  status text NOT NULL DEFAULT 'ok',
  error_message text,
  is_test boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_runs TO authenticated;
GRANT ALL ON public.ai_runs TO service_role;
ALTER TABLE public.ai_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can manage ai runs" ON public.ai_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_ai_runs_created ON public.ai_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_runs_conversation ON public.ai_runs (conversation_id, created_at DESC);

-- Search indexes
CREATE INDEX IF NOT EXISTS idx_services_fts ON public.services USING gin (
  to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(short_description,'') || ' ' || coalesce(description,''))
);
CREATE INDEX IF NOT EXISTS idx_packages_fts ON public.service_packages USING gin (
  to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(description,''))
);
CREATE INDEX IF NOT EXISTS idx_knowledge_fts_simple ON public.knowledge_entries USING gin (
  to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(content,''))
);

-- Keyword retrieval helper (vector search can be layered on later)
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
    SELECT plainto_tsquery('simple', coalesce(search_query, '')) AS tsq,
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
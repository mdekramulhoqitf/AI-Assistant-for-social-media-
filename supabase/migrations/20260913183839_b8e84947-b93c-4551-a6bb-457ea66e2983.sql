-- Enums
CREATE TYPE public.policy_type AS ENUM ('payment','refund','revision','delivery','support','cancellation','general');
CREATE TYPE public.pricing_type AS ENUM ('one_time','monthly','yearly','hourly','custom');
CREATE TYPE public.template_type AS ENUM ('greeting','website_inquiry','advertising_inquiry','pricing_inquiry','general_inquiry','human_handoff','thank_you','follow_up');

-- knowledge_entries upgrades
ALTER TABLE public.knowledge_entries
  ADD COLUMN summary text NOT NULL DEFAULT '',
  ADD COLUMN keywords text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN priority integer NOT NULL DEFAULT 0,
  ADD COLUMN service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  ADD COLUMN policy_type public.policy_type,
  ADD COLUMN source_url text,
  ADD COLUMN embedding_status text NOT NULL DEFAULT 'pending';

CREATE INDEX idx_knowledge_category ON public.knowledge_entries (category);
CREATE INDEX idx_knowledge_active ON public.knowledge_entries (is_active);
CREATE INDEX idx_knowledge_priority ON public.knowledge_entries (priority DESC, sort_order ASC);
CREATE INDEX idx_knowledge_service ON public.knowledge_entries (service_id);
CREATE INDEX idx_knowledge_tags ON public.knowledge_entries USING gin (tags);
CREATE INDEX idx_knowledge_keywords ON public.knowledge_entries USING gin (keywords);
CREATE INDEX idx_knowledge_fts ON public.knowledge_entries USING gin (
  to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(content,''))
);

-- services upgrades
ALTER TABLE public.services
  ADD COLUMN short_description text NOT NULL DEFAULT '',
  ADD COLUMN includes text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN excludes text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN ai_visible boolean NOT NULL DEFAULT true;

CREATE INDEX idx_services_active ON public.services (is_active, ai_visible);

-- packages
CREATE TABLE public.service_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES public.services(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric,
  currency text NOT NULL DEFAULT 'BDT',
  pricing_type public.pricing_type NOT NULL DEFAULT 'one_time',
  features text[] NOT NULL DEFAULT '{}'::text[],
  limitations text[] NOT NULL DEFAULT '{}'::text[],
  ai_notes text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_packages TO authenticated;
GRANT ALL ON public.service_packages TO service_role;
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can manage packages" ON public.service_packages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER service_packages_updated_at BEFORE UPDATE ON public.service_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_packages_service ON public.service_packages (service_id);
CREATE INDEX idx_packages_active ON public.service_packages (is_active, sort_order);

-- response templates
CREATE TABLE public.response_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_type public.template_type NOT NULL,
  language text NOT NULL DEFAULT 'english',
  tone text NOT NULL DEFAULT 'professional',
  body text NOT NULL DEFAULT '',
  variables text[] NOT NULL DEFAULT '{}'::text[],
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.response_templates TO authenticated;
GRANT ALL ON public.response_templates TO service_role;
ALTER TABLE public.response_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can manage templates" ON public.response_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER response_templates_updated_at BEFORE UPDATE ON public.response_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_templates_type ON public.response_templates (template_type, is_active, sort_order);
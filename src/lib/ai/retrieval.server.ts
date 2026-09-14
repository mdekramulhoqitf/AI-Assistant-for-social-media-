// Knowledge retrieval layer.
// Today this is deterministic keyword / full-text retrieval over the existing
// Knowledge Base, Services, Packages and Response Templates. The interface is
// intentionally shaped so a semantic/vector ranker can be added later without
// changing the engine: retrieveContext() in, RetrievedContext out.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { Intent, KnowledgeRef } from "./types";

export type Db = SupabaseClient<Database>;

export type RetrievedContext = {
  refs: KnowledgeRef[];
  /** Plain-text block handed to the model as the ONLY source of business facts. */
  contextText: string;
  hasKnowledge: boolean;
};

const INTENT_QUERY_HINTS: Partial<Record<Intent, string>> = {
  website_development: "website development site",
  ecommerce: "ecommerce online shop store",
  advertising: "advertising ads campaign boost",
  branding_design: "branding logo design identity",
  digital_marketing: "digital marketing social media seo",
  pricing: "price pricing package cost budget",
  portfolio: "portfolio previous work case study",
  hosting_domain: "hosting domain server",
  support: "support help policy revision refund",
  greeting: "about company",
};

function truncate(value: string, max: number): string {
  const clean = (value ?? "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

export async function retrieveContext(
  db: Db,
  message: string,
  intent: Intent,
  limit = 6,
): Promise<RetrievedContext> {
  const query = [message, INTENT_QUERY_HINTS[intent] ?? ""].join(" ").trim();
  const refs: KnowledgeRef[] = [];
  const blocks: string[] = [];

  const [knowledge, services, packages, templates] = await Promise.all([
    db.rpc("search_knowledge", { search_query: query, match_limit: limit }),
    db
      .from("services")
      .select(
        "id,name,short_description,description,starting_price,price_range,currency,delivery_time,features,includes,excludes",
      )
      .eq("is_active", true)
      .eq("ai_visible", true)
      .order("sort_order", { ascending: true })
      .limit(20),
    db
      .from("service_packages")
      .select("id,name,description,price,currency,pricing_type,features,limitations,ai_notes,service_id")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(20),
    db
      .from("response_templates")
      .select("id,name,template_type,body,language,tone")
      .eq("is_active", true)
      .limit(20),
  ]);

  if (knowledge.error) throw new Error(`Knowledge retrieval failed: ${knowledge.error.message}`);

  const kbRows = (knowledge.data ?? []) as Array<{
    id: string;
    category: string;
    title: string;
    summary: string | null;
    content: string;
    score: number | null;
  }>;

  if (kbRows.length) {
    const lines = kbRows.map((row) => {
      refs.push({
        id: row.id,
        kind: "knowledge",
        label: row.title,
        category: row.category,
        ...(row.score != null ? { score: row.score } : {}),
      });
      return `- [${row.category}] ${row.title}: ${truncate(row.summary || row.content, 600)}`;
    });
    blocks.push(`KNOWLEDGE BASE ENTRIES\n${lines.join("\n")}`);
  }

  const serviceRows = services.data ?? [];
  const serviceNames = new Map(serviceRows.map((s) => [s.id, s.name]));
  if (serviceRows.length) {
    const lines = serviceRows.map((s) => {
      refs.push({ id: s.id, kind: "service", label: s.name });
      const parts = [
        s.short_description || s.description || "",
        s.starting_price != null ? `starting price: ${s.starting_price} ${s.currency}` : "",
        s.price_range ? `price range: ${s.price_range}` : "",
        s.delivery_time ? `delivery: ${s.delivery_time}` : "",
        s.features?.length ? `features: ${s.features.join(", ")}` : "",
        s.includes?.length ? `includes: ${s.includes.join(", ")}` : "",
        s.excludes?.length ? `not included: ${s.excludes.join(", ")}` : "",
      ].filter(Boolean);
      return `- ${s.name}${parts.length ? ` — ${truncate(parts.join(" | "), 500)}` : ""}`;
    });
    blocks.push(`SERVICES\n${lines.join("\n")}`);
  }

  const packageRows = packages.data ?? [];
  if (packageRows.length) {
    const lines = packageRows.map((p) => {
      refs.push({ id: p.id, kind: "package", label: p.name });
      const parts = [
        p.service_id ? `service: ${serviceNames.get(p.service_id) ?? "unknown"}` : "",
        p.price != null ? `price: ${p.price} ${p.currency} (${p.pricing_type})` : "",
        p.description || "",
        p.features?.length ? `features: ${p.features.join(", ")}` : "",
        p.limitations?.length ? `limitations: ${p.limitations.join(", ")}` : "",
        p.ai_notes ? `notes: ${p.ai_notes}` : "",
      ].filter(Boolean);
      return `- ${p.name}${parts.length ? ` — ${truncate(parts.join(" | "), 500)}` : ""}`;
    });
    blocks.push(`PACKAGES / APPROVED PRICING\n${lines.join("\n")}`);
  }

  const templateRows = templates.data ?? [];
  const relevantTemplates = templateRows.filter((t) => templateMatchesIntent(t.template_type, intent));
  if (relevantTemplates.length) {
    const lines = relevantTemplates.map((t) => {
      refs.push({ id: t.id, kind: "template", label: t.name, category: t.template_type });
      return `- [${t.template_type}] ${truncate(t.body, 400)}`;
    });
    blocks.push(`RESPONSE TEMPLATES (style guidance, adapt naturally)\n${lines.join("\n")}`);
  }

  return {
    refs,
    contextText: blocks.join("\n\n"),
    hasKnowledge: kbRows.length > 0 || serviceRows.length > 0 || packageRows.length > 0,
  };
}

function templateMatchesIntent(templateType: string, intent: Intent): boolean {
  const map: Record<string, Intent[]> = {
    greeting: ["greeting"],
    website_inquiry: ["website_development", "ecommerce"],
    advertising_inquiry: ["advertising", "digital_marketing"],
    pricing_inquiry: ["pricing"],
    general_inquiry: ["general_question", "unknown", "portfolio", "hosting_domain", "support"],
    human_handoff: ["human_handoff"],
    thank_you: [],
    follow_up: [],
  };
  return (map[templateType] ?? []).includes(intent);
}

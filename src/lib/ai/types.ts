// Shared, client-safe types for the DigitalHub AI conversation engine.

export const INTENTS = [
  "greeting",
  "website_development",
  "ecommerce",
  "advertising",
  "branding_design",
  "digital_marketing",
  "pricing",
  "portfolio",
  "hosting_domain",
  "support",
  "dentist_product",
  "dentist_appointment",
  "dentist_patient_management",
  "wishhub",
  "wishhub_card",
  "wishhub_scheduling",
  "wishhub_event",
  "vingobd",
  "vingobd_card_design",
  "vingobd_bangladeshi_event",
  "digital_product_general",
  "general_question",
  "human_handoff",
  "unknown",
] as const;

export type Intent = (typeof INTENTS)[number];

export const DECISIONS = ["answer", "clarify", "collect_lead", "handoff", "ignore"] as const;
export type Decision = (typeof DECISIONS)[number];

export type KnowledgeRef = {
  id: string;
  kind: "knowledge" | "service" | "package" | "template";
  label: string;
  category?: string;
  score?: number;
};

export type LeadSignals = {
  requested_service?: string | null;
  requirements?: string | null;
  budget?: string | null;
  timeline?: string | null;
  business_type?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type EngineResult = {
  conversation_id: string | null;
  reply: string;
  intent: Intent;
  confidence: number;
  decision: Decision;
  language: string;
  knowledge: KnowledgeRef[];
  lead: LeadSignals | null;
  handoff: boolean;
  auto_replied: boolean;
  status: "ok" | "fallback" | "skipped";
  error: string | null;
  model: string | null;
  latency_ms: number;
};

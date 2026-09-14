import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ConnectionBadge } from "@/components/indicators";
import { getAiStatus } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/ai-settings")({
  head: () => ({
    meta: [
      { title: "AI Settings — DigitalHub AI Assistant" },
      {
        name: "description",
        content:
          "Configure the assistant's name, tone, language, greeting, business rules and human handoff rules.",
      },
      { property: "og:title", content: "AI Settings — DigitalHub AI Assistant" },
      {
        property: "og:description",
        content: "Tune how the DigitalHub assistant speaks and when it hands off to a human.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AiSettingsPage,
});

type Form = {
  assistant_name: string;
  tone: string;
  language: string;
  greeting: string;
  business_rules: string;
  handoff_rules: string;
  handoff_keywords: string;
  auto_reply_enabled: boolean;
  model: string;
  temperature: string;
  max_reply_chars: string;
  context_message_limit: string;
  allow_price_quotes: boolean;
  fallback_message: string;
};

function AiSettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);

  const settings = useQuery({
    queryKey: ["ai-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const status = useQuery({
    queryKey: ["ai-status"],
    queryFn: () => getAiStatus(),
  });

  useEffect(() => {
    if (settings.data && !form) {
      setForm({
        assistant_name: settings.data.assistant_name,
        tone: settings.data.tone,
        language: settings.data.language,
        greeting: settings.data.greeting,
        business_rules: settings.data.business_rules,
        handoff_rules: settings.data.handoff_rules,
        handoff_keywords: settings.data.handoff_keywords.join(", "),
        auto_reply_enabled: settings.data.auto_reply_enabled,
        model: settings.data.model,
        temperature: String(settings.data.temperature),
        max_reply_chars: String(settings.data.max_reply_chars),
        context_message_limit: String(settings.data.context_message_limit),
        allow_price_quotes: settings.data.allow_price_quotes,
        fallback_message: settings.data.fallback_message,
      });
    }
  }, [settings.data, form]);

  const save = useMutation({
    mutationFn: async (values: Form) => {
      if (!settings.data) throw new Error("Settings not loaded");
      const { error } = await supabase
        .from("ai_settings")
        .update({
          assistant_name: values.assistant_name,
          tone: values.tone,
          language: values.language,
          greeting: values.greeting,
          business_rules: values.business_rules,
          handoff_rules: values.handoff_rules,
          handoff_keywords: values.handoff_keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
          auto_reply_enabled: values.auto_reply_enabled,
          model: values.model,
          temperature: Number(values.temperature) || 0.4,
          max_reply_chars: Number(values.max_reply_chars) || 700,
          context_message_limit: Number(values.context_message_limit) || 12,
          allow_price_quotes: values.allow_price_quotes,
          fallback_message: values.fallback_message,
        })
        .eq("id", settings.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("AI settings saved");
      qc.invalidateQueries({ queryKey: ["ai-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (settings.isLoading || !form) {
    return (
      <div>
        <PageHeader title="AI Settings" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="AI Settings"
        description="How the assistant introduces itself, answers, and when it steps aside for a human."
      />

      <form
        className="max-w-3xl space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(form);
        }}
      >
        <section className="surface-card space-y-4 p-6">
          <h2 className="text-base font-semibold">Identity</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="assistant-name">Assistant name</Label>
              <Input
                id="assistant-name"
                value={form.assistant_name}
                onChange={(e) => setForm({ ...form, assistant_name: e.target.value })}
                placeholder="e.g. Hub"
              />
            </div>
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={form.tone} onValueChange={(v) => setForm({ ...form, tone: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="concise">Concise</SelectItem>
                  <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Primary language</Label>
              <Select
                value={form.language}
                onValueChange={(v) => setForm({ ...form, language: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="bangla">Bangla</SelectItem>
                  <SelectItem value="banglish">Bangla + English mix</SelectItem>
                  <SelectItem value="auto">Match the customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="greeting">Greeting message</Label>
            <Textarea
              id="greeting"
              rows={3}
              value={form.greeting}
              onChange={(e) => setForm({ ...form, greeting: e.target.value })}
              placeholder="First message sent to a new customer."
            />
          </div>
        </section>

        <section className="surface-card space-y-4 p-6">
          <h2 className="text-base font-semibold">Business rules</h2>
          <Textarea
            rows={6}
            value={form.business_rules}
            onChange={(e) => setForm({ ...form, business_rules: e.target.value })}
            placeholder="What the assistant may promise, discounts it can offer, information it must never invent…"
          />
        </section>

        <section className="surface-card space-y-4 p-6">
          <h2 className="text-base font-semibold">Human handoff</h2>
          <div className="space-y-2">
            <Label htmlFor="handoff-rules">When to hand off to a human</Label>
            <Textarea
              id="handoff-rules"
              rows={5}
              value={form.handoff_rules}
              onChange={(e) => setForm({ ...form, handoff_rules: e.target.value })}
              placeholder="e.g. Custom enterprise quotes, complaints, refund requests."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="handoff-keywords">Handoff keywords (comma separated)</Label>
            <Input
              id="handoff-keywords"
              value={form.handoff_keywords}
              onChange={(e) => setForm({ ...form, handoff_keywords: e.target.value })}
              placeholder="refund, complaint, manager"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium">Automatic AI replies</p>
              <p className="text-sm text-muted-foreground">
                Takes effect once an AI provider is connected.
              </p>
            </div>
            <Switch
              checked={form.auto_reply_enabled}
              onCheckedChange={(v) => setForm({ ...form, auto_reply_enabled: v })}
              aria-label="Toggle automatic AI replies"
            />
          </div>
        </section>

        <section className="surface-card space-y-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">AI engine</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              OpenAI
              <ConnectionBadge connected={Boolean(status.data?.openaiConnected)} />
            </div>
          </div>
          {!status.data?.openaiConnected ? (
            <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              Add an <code>OPENAI_API_KEY</code> secret in Project Settings → Secrets to switch the
              assistant on. Until then the engine returns the safe fallback reply below.
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="gpt-4.1-mini"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="temperature">Creativity (0–1)</Label>
              <Input
                id="temperature"
                value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-chars">Max reply length (characters)</Label>
              <Input
                id="max-chars"
                value={form.max_reply_chars}
                onChange={(e) => setForm({ ...form, max_reply_chars: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="context-limit">Messages kept in context</Label>
              <Input
                id="context-limit"
                value={form.context_message_limit}
                onChange={(e) => setForm({ ...form, context_message_limit: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium">Allow price quotes</p>
              <p className="text-sm text-muted-foreground">
                Only exact prices saved in Services or Packages are ever quoted.
              </p>
            </div>
            <Switch
              checked={form.allow_price_quotes}
              onCheckedChange={(v) => setForm({ ...form, allow_price_quotes: v })}
              aria-label="Toggle price quotes"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fallback">Fallback reply</Label>
            <Textarea
              id="fallback"
              rows={2}
              value={form.fallback_message}
              onChange={(e) => setForm({ ...form, fallback_message: e.target.value })}
              placeholder="Used when the AI service is unavailable."
            />
          </div>
        </section>

        <Button type="submit" disabled={save.isPending}>

          {save.isPending ? "Saving…" : "Save AI settings"}
        </Button>
      </form>
    </div>
  );
}

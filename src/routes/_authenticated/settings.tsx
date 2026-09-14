import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, Facebook, Instagram, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { ConnectionBadge } from "@/components/indicators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { getAiStatus } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — DigitalHub AI Assistant" },
      {
        name: "description",
        content:
          "General business settings and integration status for the DigitalHub AI assistant workspace.",
      },
      { property: "og:title", content: "Settings — DigitalHub AI Assistant" },
      {
        property: "og:description",
        content: "Business details and integration status for DigitalHub.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

type Form = {
  business_name: string;
  website: string;
  support_email: string;
  support_phone: string;
  timezone: string;
};

function SettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);

  const settings = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const aiStatus = useQuery({
    queryKey: ["ai-status"],
    queryFn: () => getAiStatus(),
  });

  useEffect(() => {
    if (settings.data && !form) {
      setForm({
        business_name: settings.data.business_name,
        website: settings.data.website,
        support_email: settings.data.support_email,
        support_phone: settings.data.support_phone,
        timezone: settings.data.timezone,
      });
    }
  }, [settings.data, form]);

  const save = useMutation({
    mutationFn: async (values: Form) => {
      if (!settings.data) throw new Error("Settings not loaded");
      const { error } = await supabase
        .from("app_settings")
        .update(values)
        .eq("id", settings.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["app-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const integrations = [
    {
      icon: Facebook,
      name: "Facebook Messenger",
      description: "Receive and reply to Messenger conversations automatically.",
      connected: settings.data?.meta_connected ?? false,
    },
    {
      icon: Instagram,
      name: "Instagram Direct",
      description: "Handle Instagram DMs from the same inbox.",
      connected: settings.data?.instagram_connected ?? false,
    },
    {
      icon: Sparkles,
      name: "OpenAI (AI replies)",
      description:
        "Generate answers grounded in your knowledge base. Connects automatically once an OPENAI_API_KEY secret exists.",
      connected: Boolean(aiStatus.data?.openaiConnected),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Business details and the status of every integration."
      />

      <div className="max-w-3xl space-y-6">
        <section className="surface-card p-6">
          <h2 className="text-base font-semibold">General</h2>
          {!form ? (
            <Skeleton className="mt-4 h-48 w-full" />
          ) : (
            <form
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(form);
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="biz-name">Business name</Label>
                  <Input
                    id="biz-name"
                    value={form.business_name}
                    onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="biz-site">Website</Label>
                  <Input
                    id="biz-site"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="digitalhubbd.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="biz-email">Support email</Label>
                  <Input
                    id="biz-email"
                    type="email"
                    value={form.support_email}
                    onChange={(e) => setForm({ ...form, support_email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="biz-phone">Support phone</Label>
                  <Input
                    id="biz-phone"
                    value={form.support_phone}
                    onChange={(e) => setForm({ ...form, support_phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="biz-tz">Timezone</Label>
                  <Input
                    id="biz-tz"
                    value={form.timezone}
                    onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save settings"}
              </Button>
            </form>
          )}
        </section>

        <section className="surface-card p-6">
          <h2 className="text-base font-semibold">Data & storage</h2>
          <div className="mt-4 flex items-start justify-between gap-4 rounded-lg border border-border p-4">
            <div className="flex gap-3">
              <Database className="mt-0.5 size-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Workspace database</p>
                <p className="text-sm text-muted-foreground">
                  Conversations, leads, services and knowledge are stored securely and only
                  readable by signed-in team members.
                </p>
              </div>
            </div>
            <ConnectionBadge connected={true} />
          </div>
        </section>

        <section className="surface-card p-6">
          <h2 className="text-base font-semibold">Integrations</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These are placeholders — nothing is live until it's configured.
          </p>
          <div className="mt-4 space-y-3">
            {integrations.map((item) => (
              <div
                key={item.name}
                className="flex items-start justify-between gap-4 rounded-lg border border-border p-4"
              >
                <div className="flex gap-3">
                  <item.icon className="mt-0.5 size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <ConnectionBadge connected={item.connected} />
                  <Button variant="outline" size="sm" disabled>
                    Configure
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

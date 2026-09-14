import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Copy, MessageSquareText, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, EmptyState } from "@/components/page-header";
import { ConfirmDelete, parseList } from "@/components/confirm-delete";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/templates")({
  head: () => ({
    meta: [
      { title: "Response Templates — DigitalHub AI Assistant" },
      {
        name: "description",
        content:
          "Reusable reply templates for greetings, website and advertising inquiries, pricing, handoff and follow-ups.",
      },
      { property: "og:title", content: "Response Templates — DigitalHub AI Assistant" },
      {
        property: "og:description",
        content: "Reusable reply templates the DigitalHub assistant will draw from.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TemplatesPage,
});

const TYPES = [
  { value: "greeting", label: "Greeting" },
  { value: "website_inquiry", label: "Website inquiry" },
  { value: "advertising_inquiry", label: "Advertising inquiry" },
  { value: "pricing_inquiry", label: "Pricing inquiry" },
  { value: "general_inquiry", label: "General inquiry" },
  { value: "human_handoff", label: "Human handoff" },
  { value: "thank_you", label: "Thank you" },
  { value: "follow_up", label: "Follow up" },
] as const;

type TemplateType = (typeof TYPES)[number]["value"];

type TemplateForm = {
  id?: string;
  name: string;
  template_type: TemplateType;
  language: string;
  tone: string;
  body: string;
  variables: string;
  sort_order: string;
  is_active: boolean;
};

const EMPTY: TemplateForm = {
  name: "",
  template_type: "greeting",
  language: "english",
  tone: "professional",
  body: "",
  variables: "",
  sort_order: "0",
  is_active: true,
};

function TemplatesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TemplateForm>(EMPTY);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TemplateType | "all">("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");

  const templates = useQuery({
    queryKey: ["response_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("response_templates")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (values: TemplateForm) => {
      const payload = {
        name: values.name,
        template_type: values.template_type,
        language: values.language,
        tone: values.tone,
        body: values.body,
        variables: parseList(values.variables),
        sort_order: Number(values.sort_order) || 0,
        is_active: values.is_active,
      };
      const { error } = values.id
        ? await supabase.from("response_templates").update(payload).eq("id", values.id)
        : await supabase.from("response_templates").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template saved");
      setOpen(false);
      setForm(EMPTY);
      qc.invalidateQueries({ queryKey: ["response_templates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: async (id: string) => {
      const row = (templates.data ?? []).find((t) => t.id === id);
      if (!row) throw new Error("Template not found");
      const { id: _id, created_at, updated_at, ...rest } = row;
      const { error } = await supabase
        .from("response_templates")
        .insert({ ...rest, name: `${row.name} (copy)`, is_active: false });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template duplicated");
      qc.invalidateQueries({ queryKey: ["response_templates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("response_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template deleted");
      qc.invalidateQueries({ queryKey: ["response_templates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (templates.data ?? []).filter((t) => {
      if (typeFilter !== "all" && t.template_type !== typeFilter) return false;
      if (status === "active" && !t.is_active) return false;
      if (status === "inactive" && t.is_active) return false;
      if (!q) return true;
      return `${t.name} ${t.body} ${(t.variables ?? []).join(" ")}`.toLowerCase().includes(q);
    });
  }, [templates.data, search, typeFilter, status]);

  const typeLabel = (v: string) => TYPES.find((t) => t.value === v)?.label ?? v;

  return (
    <div>
      <PageHeader
        title="Response Templates"
        description="Reusable replies the assistant can send for common situations."
        actions={
          <Button
            className="gap-2"
            onClick={() => {
              setForm(EMPTY);
              setOpen(true);
            }}
          >
            <Plus className="size-4" />
            Add template
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search templates"
            aria-label="Search templates"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TemplateType | "all")}>
          <SelectTrigger className="sm:w-52" aria-label="Filter by type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="sm:w-44" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="inactive">Inactive only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {templates.isError ? (
        <div className="surface-card flex items-start gap-3 p-5 text-sm">
          <AlertTriangle className="mt-0.5 size-4 text-destructive" />
          <div>
            <p className="font-medium">Could not load templates</p>
            <p className="text-muted-foreground">{(templates.error as Error).message}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => templates.refetch()}
            >
              Try again
            </Button>
          </div>
        </div>
      ) : templates.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<MessageSquareText className="size-6" />}
          title={
            search || typeFilter !== "all" || status !== "all"
              ? "No templates match your filters"
              : "No templates yet"
          }
          description="Write the replies you want the assistant to reuse for each situation."
          action={
            <Button
              onClick={() => {
                setForm(EMPTY);
                setOpen(true);
              }}
            >
              Add template
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <article key={t.id} className="surface-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold">{t.name}</h2>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="font-normal">
                      {typeLabel(t.template_type)}
                    </Badge>
                    <Badge variant="outline" className="font-normal capitalize">
                      {t.language}
                    </Badge>
                    <Badge variant="outline" className="font-normal capitalize">
                      {t.tone}
                    </Badge>
                    {!t.is_active ? (
                      <Badge variant="outline" className="font-normal">
                        Inactive
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Duplicate ${t.name}`}
                    onClick={() => duplicate.mutate(t.id)}
                  >
                    <Copy className="size-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${t.name}`}
                    onClick={() => {
                      setForm({
                        id: t.id,
                        name: t.name,
                        template_type: t.template_type as TemplateType,
                        language: t.language,
                        tone: t.tone,
                        body: t.body,
                        variables: (t.variables ?? []).join(", "),
                        sort_order: String(t.sort_order ?? 0),
                        is_active: t.is_active,
                      });
                      setOpen(true);
                    }}
                  >
                    <Pencil className="size-4 text-muted-foreground" />
                  </Button>
                  <ConfirmDelete
                    title={`Delete "${t.name}"?`}
                    onConfirm={() => remove.mutate(t.id)}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label={`Delete ${t.name}`}>
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
                    }
                  />
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{t.body}</p>
            </article>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit template" : "New template"}</DialogTitle>
          </DialogHeader>
          <form
            id="tpl-form"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(form);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="tpl-name">Template name</Label>
              <Input
                id="tpl-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="tpl-type">Type</Label>
                <Select
                  value={form.template_type}
                  onValueChange={(v) => setForm({ ...form, template_type: v as TemplateType })}
                >
                  <SelectTrigger id="tpl-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tpl-language">Language</Label>
                <Input
                  id="tpl-language"
                  value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tpl-tone">Tone</Label>
                <Input
                  id="tpl-tone"
                  value={form.tone}
                  onChange={(e) => setForm({ ...form, tone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-body">Message</Label>
              <Textarea
                id="tpl-body"
                rows={8}
                required
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tpl-vars">Variables (comma separated)</Label>
                <Input
                  id="tpl-vars"
                  value={form.variables}
                  onChange={(e) => setForm({ ...form, variables: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tpl-sort">Sort order</Label>
                <Input
                  id="tpl-sort"
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="tpl-active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label htmlFor="tpl-active">Active</Label>
            </div>
          </form>
          <DialogFooter>
            <Button type="submit" form="tpl-form" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

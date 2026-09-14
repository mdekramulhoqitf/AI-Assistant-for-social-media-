import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BookOpen, Copy, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export const Route = createFileRoute("/_authenticated/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge Base — DigitalHub AI Assistant" },
      {
        name: "description",
        content:
          "Company information, pricing, FAQs, policies and AI instructions that ground the DigitalHub assistant.",
      },
      { property: "og:title", content: "Knowledge Base — DigitalHub AI Assistant" },
      {
        property: "og:description",
        content: "The knowledge the DigitalHub assistant answers from.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KnowledgePage,
});

const CATEGORIES = [
  { value: "company", label: "Company", hint: "Who DigitalHub is, history, team, contact." },
  { value: "service", label: "Services", hint: "Extra detail about what you deliver." },
  { value: "pricing", label: "Pricing", hint: "Packages, discounts and payment terms." },
  { value: "faq", label: "FAQs", hint: "Title is the question, content is the answer." },
  {
    value: "policy",
    label: "Policies",
    hint: "Payment, refund, revision, delivery, support, cancellation and general terms.",
  },
  { value: "ai_instruction", label: "AI Instructions", hint: "Rules the assistant must follow." },
] as const;

const POLICY_TYPES = [
  "payment",
  "refund",
  "revision",
  "delivery",
  "support",
  "cancellation",
  "general",
] as const;

type Category = (typeof CATEGORIES)[number]["value"];
type PolicyType = (typeof POLICY_TYPES)[number];

type EntryForm = {
  id?: string;
  category: Category;
  title: string;
  summary: string;
  content: string;
  tags: string;
  keywords: string;
  priority: string;
  sort_order: string;
  policy_type: PolicyType | "none";
  service_id: string;
  source_url: string;
  is_active: boolean;
};

const EMPTY = (category: Category): EntryForm => ({
  category,
  title: "",
  summary: "",
  content: "",
  tags: "",
  keywords: "",
  priority: "0",
  sort_order: "0",
  policy_type: "none",
  service_id: "none",
  source_url: "",
  is_active: true,
});

function KnowledgePage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Category>("company");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [form, setForm] = useState<EntryForm>(EMPTY("company"));

  const entries = useQuery({
    queryKey: ["knowledge"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_entries")
        .select("*")
        .order("priority", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const services = useQuery({
    queryKey: ["services", "options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id,name")
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (values: EntryForm) => {
      const payload = {
        category: values.category,
        title: values.title,
        summary: values.summary,
        content: values.content,
        tags: parseList(values.tags),
        keywords: parseList(values.keywords),
        priority: Number(values.priority) || 0,
        sort_order: Number(values.sort_order) || 0,
        policy_type: values.category === "policy" && values.policy_type !== "none"
          ? values.policy_type
          : null,
        service_id: values.service_id !== "none" ? values.service_id : null,
        source_url: values.source_url || null,
        is_active: values.is_active,
      };
      const { error } = values.id
        ? await supabase.from("knowledge_entries").update(payload).eq("id", values.id)
        : await supabase.from("knowledge_entries").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entry saved");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["knowledge"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: async (id: string) => {
      const row = (entries.data ?? []).find((e) => e.id === id);
      if (!row) throw new Error("Entry not found");
      const { id: _id, created_at, updated_at, ...rest } = row;
      const { error } = await supabase
        .from("knowledge_entries")
        .insert({ ...rest, title: `${row.title} (copy)`, is_active: false });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entry duplicated");
      qc.invalidateQueries({ queryKey: ["knowledge"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("knowledge_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entry deleted");
      qc.invalidateQueries({ queryKey: ["knowledge"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (entries.data ?? []).filter((e) => {
      if (status === "active" && !e.is_active) return false;
      if (status === "inactive" && e.is_active) return false;
      if (!q) return true;
      const haystack = [e.title, e.summary ?? "", e.content, ...(e.tags ?? []), ...(e.keywords ?? [])]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [entries.data, search, status]);

  function openNew(category: Category) {
    setForm(EMPTY(category));
    setOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Knowledge Base"
        description="Everything the assistant is allowed to say about DigitalHub lives here."
        actions={
          <Button className="gap-2" onClick={() => openNew(tab)}>
            <Plus className="size-4" />
            Add entry
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search title, content, tags or keywords"
            aria-label="Search knowledge base"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="sm:w-44" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entries</SelectItem>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="inactive">Inactive only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {entries.isError ? (
        <div className="surface-card flex items-start gap-3 p-5 text-sm">
          <AlertTriangle className="mt-0.5 size-4 text-destructive" />
          <div>
            <p className="font-medium">Could not load the knowledge base</p>
            <p className="text-muted-foreground">{(entries.error as Error).message}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => entries.refetch()}>
              Try again
            </Button>
          </div>
        </div>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as Category)}>
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c.value} value={c.value}>
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {CATEGORIES.map((c) => {
            const list = filtered.filter((e) => e.category === c.value);
            return (
              <TabsContent key={c.value} value={c.value} className="mt-5">
                <p className="mb-4 text-sm text-muted-foreground">{c.hint}</p>
                {entries.isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : list.length === 0 ? (
                  <EmptyState
                    icon={<BookOpen className="size-6" />}
                    title={
                      search || status !== "all"
                        ? "No entries match your filters"
                        : `No ${c.label.toLowerCase()} entries yet`
                    }
                    description="Add an entry so the assistant has an accurate source to answer from."
                    action={<Button onClick={() => openNew(c.value)}>Add entry</Button>}
                  />
                ) : (
                  <div className="space-y-3">
                    {list.map((entry) => (
                      <article key={entry.id} className="surface-card p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="text-base font-semibold">{entry.title}</h2>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              {!entry.is_active ? (
                                <Badge variant="outline" className="font-normal">
                                  Inactive
                                </Badge>
                              ) : null}
                              {entry.policy_type ? (
                                <Badge variant="secondary" className="font-normal capitalize">
                                  {entry.policy_type}
                                </Badge>
                              ) : null}
                              {entry.priority > 0 ? (
                                <Badge variant="outline" className="font-normal">
                                  Priority {entry.priority}
                                </Badge>
                              ) : null}
                              {(entry.tags ?? []).map((t: string) => (
                                <Badge key={t} variant="outline" className="font-normal">
                                  {t}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Duplicate ${entry.title}`}
                              onClick={() => duplicate.mutate(entry.id)}
                            >
                              <Copy className="size-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Edit ${entry.title}`}
                              onClick={() => {
                                setForm({
                                  id: entry.id,
                                  category: entry.category as Category,
                                  title: entry.title,
                                  summary: entry.summary ?? "",
                                  content: entry.content,
                                  tags: (entry.tags ?? []).join(", "),
                                  keywords: (entry.keywords ?? []).join(", "),
                                  priority: String(entry.priority ?? 0),
                                  sort_order: String(entry.sort_order ?? 0),
                                  policy_type: (entry.policy_type as PolicyType) ?? "none",
                                  service_id: entry.service_id ?? "none",
                                  source_url: entry.source_url ?? "",
                                  is_active: entry.is_active,
                                });
                                setOpen(true);
                              }}
                            >
                              <Pencil className="size-4 text-muted-foreground" />
                            </Button>
                            <ConfirmDelete
                              title={`Delete "${entry.title}"?`}
                              description="The assistant will no longer be able to answer from this entry."
                              onConfirm={() => remove.mutate(entry.id)}
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Delete ${entry.title}`}
                                >
                                  <Trash2 className="size-4 text-muted-foreground" />
                                </Button>
                              }
                            />
                          </div>
                        </div>
                        {entry.summary ? (
                          <p className="mt-3 text-sm font-medium">{entry.summary}</p>
                        ) : null}
                        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                          {entry.content}
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit entry" : "New entry"}</DialogTitle>
          </DialogHeader>
          <form
            id="kb-form"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(form);
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="kb-category">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v as Category })}
                >
                  <SelectTrigger id="kb-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="kb-service">Related service</Label>
                <Select
                  value={form.service_id}
                  onValueChange={(v) => setForm({ ...form, service_id: v })}
                >
                  <SelectTrigger id="kb-service">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {(services.data ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.category === "policy" ? (
              <div className="space-y-2">
                <Label htmlFor="kb-policy">Policy type</Label>
                <Select
                  value={form.policy_type}
                  onValueChange={(v) => setForm({ ...form, policy_type: v as PolicyType | "none" })}
                >
                  <SelectTrigger id="kb-policy">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unspecified</SelectItem>
                    {POLICY_TYPES.map((p) => (
                      <SelectItem key={p} value={p} className="capitalize">
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="kb-title">
                {form.category === "faq" ? "Question" : "Title"}
              </Label>
              <Input
                id="kb-title"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kb-summary">Short summary</Label>
              <Input
                id="kb-summary"
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kb-content">
                {form.category === "faq" ? "Answer" : "Content"}
              </Label>
              <Textarea
                id="kb-content"
                rows={8}
                required
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="kb-tags">Tags (comma separated)</Label>
                <Input
                  id="kb-tags"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kb-keywords">Search keywords (comma separated)</Label>
                <Input
                  id="kb-keywords"
                  value={form.keywords}
                  onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="kb-priority">Priority</Label>
                <Input
                  id="kb-priority"
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kb-sort">Sort order</Label>
                <Input
                  id="kb-sort"
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kb-source">Source link</Label>
                <Input
                  id="kb-source"
                  value={form.source_url}
                  onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="kb-active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label htmlFor="kb-active">Active</Label>
            </div>
          </form>
          <DialogFooter>
            <Button type="submit" form="kb-form" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

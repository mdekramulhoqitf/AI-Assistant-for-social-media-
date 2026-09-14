import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, EmptyState } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({
    meta: [
      { title: "Leads — DigitalHub AI Assistant" },
      {
        name: "description",
        content:
          "Track qualified leads captured by the DigitalHub assistant: service requested, budget and requirements.",
      },
      { property: "og:title", content: "Leads — DigitalHub AI Assistant" },
      {
        property: "og:description",
        content: "Lead pipeline captured by the DigitalHub AI assistant.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeadsPage,
});

const STATUSES = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const;
type LeadStatus = (typeof STATUSES)[number];

type LeadForm = {
  full_name: string;
  email: string;
  phone: string;
  requested_service: string;
  budget: string;
  requirements: string;
  status: LeadStatus;
};

const EMPTY_FORM: LeadForm = {
  full_name: "",
  email: "",
  phone: "",
  requested_service: "",
  budget: "",
  requirements: "",
  status: "new",
};

function LeadsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<LeadForm>(EMPTY_FORM);

  const leads = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createLead = useMutation({
    mutationFn: async (values: LeadForm) => {
      const { error } = await supabase.from("leads").insert({
        full_name: values.full_name,
        email: values.email || null,
        phone: values.phone || null,
        requested_service: values.requested_service || null,
        budget: values.budget || null,
        requirements: values.requirements || null,
        status: values.status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead added");
      setOpen(false);
      setForm(EMPTY_FORM);
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const removeLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead deleted");
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (leads.data ?? []).filter((l) => {
    const matchesSearch = `${l.full_name} ${l.email ?? ""} ${l.requested_service ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Sales opportunities captured from customer conversations."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="size-4" />
                Add lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New lead</DialogTitle>
              </DialogHeader>
              <form
                id="lead-form"
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  createLead.mutate(form);
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="lead-name">Full name</Label>
                  <Input
                    id="lead-name"
                    required
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="lead-email">Email</Label>
                    <Input
                      id="lead-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lead-phone">Phone</Label>
                    <Input
                      id="lead-phone"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="lead-service">Requested service</Label>
                    <Input
                      id="lead-service"
                      value={form.requested_service}
                      onChange={(e) => setForm({ ...form, requested_service: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lead-budget">Budget</Label>
                    <Input
                      id="lead-budget"
                      value={form.budget}
                      onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-req">Requirements</Label>
                  <Textarea
                    id="lead-req"
                    rows={4}
                    value={form.requirements}
                    onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v as LeadStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </form>
              <DialogFooter>
                <Button type="submit" form="lead-form" disabled={createLead.isPending}>
                  {createLead.isPending ? "Saving…" : "Save lead"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search leads"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {leads.isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6" />}
          title="No leads yet"
          description="Leads captured by the assistant during conversations will be listed here."
        />
      ) : (
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Requirements</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.full_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div>{lead.email ?? "—"}</div>
                    <div>{lead.phone ?? ""}</div>
                  </TableCell>
                  <TableCell>{lead.requested_service ?? "—"}</TableCell>
                  <TableCell>{lead.budget ?? "—"}</TableCell>
                  <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">
                    {lead.requirements ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={lead.status}
                      onValueChange={(v) =>
                        updateStatus.mutate({ id: lead.id, status: v as LeadStatus })
                      }
                    >
                      <SelectTrigger className="h-8 w-32 capitalize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {format(new Date(lead.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${lead.full_name}`}
                      onClick={() => removeLead.mutate(lead.id)}
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-4">
        <Badge variant="outline" className="font-normal text-muted-foreground">
          {rows.length} lead{rows.length === 1 ? "" : "s"} shown
        </Badge>
      </div>
    </div>
  );
}

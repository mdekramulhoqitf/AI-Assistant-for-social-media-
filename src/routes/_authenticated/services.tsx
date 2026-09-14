import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Package, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, EmptyState } from "@/components/page-header";
import { ConfirmDelete, parseLines } from "@/components/confirm-delete";
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

export const Route = createFileRoute("/_authenticated/services")({
  head: () => ({
    meta: [
      { title: "Services & Packages — DigitalHub AI Assistant" },
      {
        name: "description",
        content:
          "Manage the DigitalHub service catalogue and packages: pricing, delivery times, inclusions and what the assistant may quote.",
      },
      { property: "og:title", content: "Services & Packages — DigitalHub AI Assistant" },
      {
        property: "og:description",
        content: "Service catalogue and packages powering the DigitalHub assistant's answers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ServicesPage,
});

const PRICING_TYPES = ["one_time", "monthly", "yearly", "hourly", "custom"] as const;
type PricingType = (typeof PRICING_TYPES)[number];

const PRICING_LABEL: Record<PricingType, string> = {
  one_time: "One-time",
  monthly: "Monthly",
  yearly: "Yearly",
  hourly: "Hourly",
  custom: "Custom",
};

type ServiceForm = {
  id?: string;
  name: string;
  short_description: string;
  description: string;
  starting_price: string;
  price_range: string;
  currency: string;
  delivery_time: string;
  features: string;
  includes: string;
  excludes: string;
  is_active: boolean;
  ai_visible: boolean;
};

const EMPTY_SERVICE: ServiceForm = {
  name: "",
  short_description: "",
  description: "",
  starting_price: "",
  price_range: "",
  currency: "BDT",
  delivery_time: "",
  features: "",
  includes: "",
  excludes: "",
  is_active: true,
  ai_visible: true,
};

type PackageForm = {
  id?: string;
  name: string;
  service_id: string;
  description: string;
  price: string;
  currency: string;
  pricing_type: PricingType;
  features: string;
  limitations: string;
  ai_notes: string;
  is_active: boolean;
  sort_order: string;
};

const EMPTY_PACKAGE: PackageForm = {
  name: "",
  service_id: "none",
  description: "",
  price: "",
  currency: "BDT",
  pricing_type: "one_time",
  features: "",
  limitations: "",
  ai_notes: "",
  is_active: true,
  sort_order: "0",
};

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="surface-card flex items-start gap-3 p-5 text-sm">
      <AlertTriangle className="mt-0.5 size-4 text-destructive" />
      <div>
        <p className="font-medium">Something went wrong loading this list</p>
        <p className="text-muted-foreground">{message}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  );
}

function ServicesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"services" | "packages">("services");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ServiceForm>(EMPTY_SERVICE);
  const [pkgOpen, setPkgOpen] = useState(false);
  const [pkgForm, setPkgForm] = useState<PackageForm>(EMPTY_PACKAGE);

  const services = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const packages = useQuery({
    queryKey: ["service_packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_packages")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (values: ServiceForm) => {
      const payload = {
        name: values.name,
        short_description: values.short_description,
        description: values.description || null,
        starting_price: values.starting_price ? Number(values.starting_price) : null,
        price_range: values.price_range || null,
        currency: values.currency || "BDT",
        delivery_time: values.delivery_time || null,
        features: parseLines(values.features),
        includes: parseLines(values.includes),
        excludes: parseLines(values.excludes),
        is_active: values.is_active,
        ai_visible: values.ai_visible,
      };
      const { error } = values.id
        ? await supabase.from("services").update(payload).eq("id", values.id)
        : await supabase.from("services").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Service saved");
      setOpen(false);
      setForm(EMPTY_SERVICE);
      qc.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Service deleted");
      qc.invalidateQueries({ queryKey: ["services"] });
      qc.invalidateQueries({ queryKey: ["service_packages"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("services").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleVisible = useMutation({
    mutationFn: async ({ id, ai_visible }: { id: string; ai_visible: boolean }) => {
      const { error } = await supabase.from("services").update({ ai_visible }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const savePackage = useMutation({
    mutationFn: async (values: PackageForm) => {
      const payload = {
        name: values.name,
        service_id: values.service_id !== "none" ? values.service_id : null,
        description: values.description,
        price: values.price ? Number(values.price) : null,
        currency: values.currency || "BDT",
        pricing_type: values.pricing_type,
        features: parseLines(values.features),
        limitations: parseLines(values.limitations),
        ai_notes: values.ai_notes,
        is_active: values.is_active,
        sort_order: Number(values.sort_order) || 0,
      };
      const { error } = values.id
        ? await supabase.from("service_packages").update(payload).eq("id", values.id)
        : await supabase.from("service_packages").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Package saved");
      setPkgOpen(false);
      setPkgForm(EMPTY_PACKAGE);
      qc.invalidateQueries({ queryKey: ["service_packages"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removePackage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_packages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Package deleted");
      qc.invalidateQueries({ queryKey: ["service_packages"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const serviceName = (id: string | null) =>
    (services.data ?? []).find((s) => s.id === id)?.name ?? "No linked service";

  return (
    <div>
      <PageHeader
        title="Services & Packages"
        description="What DigitalHub sells, how it's priced and what the assistant is allowed to quote."
        actions={
          tab === "services" ? (
            <Button
              className="gap-2"
              onClick={() => {
                setForm(EMPTY_SERVICE);
                setOpen(true);
              }}
            >
              <Plus className="size-4" />
              Add service
            </Button>
          ) : (
            <Button
              className="gap-2"
              onClick={() => {
                setPkgForm(EMPTY_PACKAGE);
                setPkgOpen(true);
              }}
            >
              <Plus className="size-4" />
              Add package
            </Button>
          )
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-5">
          {services.isError ? (
            <ErrorBox
              message={(services.error as Error).message}
              onRetry={() => services.refetch()}
            />
          ) : services.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          ) : (services.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={<Sparkles className="size-6" />}
              title="No services added yet"
              description="Add your services so the assistant can describe and price them accurately."
              action={
                <Button
                  onClick={() => {
                    setForm(EMPTY_SERVICE);
                    setOpen(true);
                  }}
                >
                  Add your first service
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {services.data?.map((service) => (
                <div key={service.id} className="surface-card flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-base font-semibold">{service.name}</h2>
                    <Badge
                      variant={service.is_active ? "default" : "outline"}
                      className="font-normal"
                    >
                      {service.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {service.short_description ? (
                    <p className="mt-2 text-sm font-medium">{service.short_description}</p>
                  ) : null}
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                    {service.description ?? "No description"}
                  </p>
                  <dl className="mt-4 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Starting at</dt>
                      <dd>
                        {service.starting_price != null
                          ? `${service.currency} ${Number(service.starting_price).toLocaleString()}`
                          : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Range</dt>
                      <dd>{service.price_range ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Delivery</dt>
                      <dd>{service.delivery_time ?? "—"}</dd>
                    </div>
                  </dl>
                  {service.features.length > 0 ? (
                    <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {service.features.map((f: string) => (
                        <li key={f}>• {f}</li>
                      ))}
                    </ul>
                  ) : null}
                  {(service.includes ?? []).length > 0 ? (
                    <div className="mt-3 text-sm">
                      <p className="font-medium">What's included</p>
                      <ul className="mt-1 space-y-1 text-muted-foreground">
                        {service.includes.map((f: string) => (
                          <li key={f}>• {f}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {(service.excludes ?? []).length > 0 ? (
                    <div className="mt-3 text-sm">
                      <p className="font-medium">Not included</p>
                      <ul className="mt-1 space-y-1 text-muted-foreground">
                        {service.excludes.map((f: string) => (
                          <li key={f}>• {f}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="mt-5 space-y-3 border-t border-border pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={service.is_active}
                          onCheckedChange={(v) =>
                            toggleActive.mutate({ id: service.id, is_active: v })
                          }
                          aria-label="Toggle service active"
                        />
                        <span className="text-xs text-muted-foreground">Active</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={service.ai_visible}
                          onCheckedChange={(v) =>
                            toggleVisible.mutate({ id: service.id, ai_visible: v })
                          }
                          aria-label="Toggle AI visibility"
                        />
                        <span className="text-xs text-muted-foreground">Visible to AI</span>
                      </div>
                    </div>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${service.name}`}
                        onClick={() => {
                          setForm({
                            id: service.id,
                            name: service.name,
                            short_description: service.short_description ?? "",
                            description: service.description ?? "",
                            starting_price:
                              service.starting_price != null ? String(service.starting_price) : "",
                            price_range: service.price_range ?? "",
                            currency: service.currency,
                            delivery_time: service.delivery_time ?? "",
                            features: service.features.join("\n"),
                            includes: (service.includes ?? []).join("\n"),
                            excludes: (service.excludes ?? []).join("\n"),
                            is_active: service.is_active,
                            ai_visible: service.ai_visible,
                          });
                          setOpen(true);
                        }}
                      >
                        <Pencil className="size-4 text-muted-foreground" />
                      </Button>
                      <ConfirmDelete
                        title={`Delete "${service.name}"?`}
                        description="Packages linked to this service will be removed too."
                        onConfirm={() => remove.mutate(service.id)}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${service.name}`}
                          >
                            <Trash2 className="size-4 text-muted-foreground" />
                          </Button>
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="packages" className="mt-5">
          {packages.isError ? (
            <ErrorBox
              message={(packages.error as Error).message}
              onRetry={() => packages.refetch()}
            />
          ) : packages.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          ) : (packages.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={<Package className="size-6" />}
              title="No packages yet"
              description="Create packages so the assistant can quote exact tiers instead of guessing."
              action={
                <Button
                  onClick={() => {
                    setPkgForm(EMPTY_PACKAGE);
                    setPkgOpen(true);
                  }}
                >
                  Add your first package
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {packages.data?.map((pkg) => (
                <div key={pkg.id} className="surface-card flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold">{pkg.name}</h2>
                      <p className="text-xs text-muted-foreground">{serviceName(pkg.service_id)}</p>
                    </div>
                    <Badge variant={pkg.is_active ? "default" : "outline"} className="font-normal">
                      {pkg.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {pkg.description ? (
                    <p className="mt-2 text-sm text-muted-foreground">{pkg.description}</p>
                  ) : null}
                  <dl className="mt-4 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Price</dt>
                      <dd>
                        {pkg.price != null
                          ? `${pkg.currency} ${Number(pkg.price).toLocaleString()}`
                          : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Billing</dt>
                      <dd>{PRICING_LABEL[pkg.pricing_type as PricingType]}</dd>
                    </div>
                  </dl>
                  {pkg.features.length > 0 ? (
                    <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {pkg.features.map((f: string) => (
                        <li key={f}>• {f}</li>
                      ))}
                    </ul>
                  ) : null}
                  {pkg.limitations.length > 0 ? (
                    <div className="mt-3 text-sm">
                      <p className="font-medium">Limitations</p>
                      <ul className="mt-1 space-y-1 text-muted-foreground">
                        {pkg.limitations.map((f: string) => (
                          <li key={f}>• {f}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="mt-5 flex justify-end gap-1 border-t border-border pt-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${pkg.name}`}
                      onClick={() => {
                        setPkgForm({
                          id: pkg.id,
                          name: pkg.name,
                          service_id: pkg.service_id ?? "none",
                          description: pkg.description ?? "",
                          price: pkg.price != null ? String(pkg.price) : "",
                          currency: pkg.currency,
                          pricing_type: pkg.pricing_type as PricingType,
                          features: pkg.features.join("\n"),
                          limitations: pkg.limitations.join("\n"),
                          ai_notes: pkg.ai_notes ?? "",
                          is_active: pkg.is_active,
                          sort_order: String(pkg.sort_order ?? 0),
                        });
                        setPkgOpen(true);
                      }}
                    >
                      <Pencil className="size-4 text-muted-foreground" />
                    </Button>
                    <ConfirmDelete
                      title={`Delete "${pkg.name}"?`}
                      onConfirm={() => removePackage.mutate(pkg.id)}
                      trigger={
                        <Button variant="ghost" size="icon" aria-label={`Delete ${pkg.name}`}>
                          <Trash2 className="size-4 text-muted-foreground" />
                        </Button>
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit service" : "New service"}</DialogTitle>
          </DialogHeader>
          <form
            id="service-form"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(form);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="svc-name">Service name</Label>
              <Input
                id="svc-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-short">Short description</Label>
              <Input
                id="svc-short"
                value={form.short_description}
                onChange={(e) => setForm({ ...form, short_description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-desc">Detailed description</Label>
              <Textarea
                id="svc-desc"
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="svc-currency">Currency</Label>
                <Input
                  id="svc-currency"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="svc-price">Starting price</Label>
                <Input
                  id="svc-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.starting_price}
                  onChange={(e) => setForm({ ...form, starting_price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="svc-range">Price range</Label>
                <Input
                  id="svc-range"
                  value={form.price_range}
                  onChange={(e) => setForm({ ...form, price_range: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-delivery">Delivery time</Label>
              <Input
                id="svc-delivery"
                value={form.delivery_time}
                onChange={(e) => setForm({ ...form, delivery_time: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-features">Features (one per line)</Label>
              <Textarea
                id="svc-features"
                rows={4}
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-includes">What's included (one per line)</Label>
              <Textarea
                id="svc-includes"
                rows={4}
                value={form.includes}
                onChange={(e) => setForm({ ...form, includes: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-excludes">What's not included (one per line)</Label>
              <Textarea
                id="svc-excludes"
                rows={4}
                value={form.excludes}
                onChange={(e) => setForm({ ...form, excludes: e.target.value })}
              />
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <Switch
                  id="svc-active"
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                <Label htmlFor="svc-active">Active</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="svc-visible"
                  checked={form.ai_visible}
                  onCheckedChange={(v) => setForm({ ...form, ai_visible: v })}
                />
                <Label htmlFor="svc-visible">Visible to AI</Label>
              </div>
            </div>
          </form>
          <DialogFooter>
            <Button type="submit" form="service-form" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pkgOpen} onOpenChange={setPkgOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{pkgForm.id ? "Edit package" : "New package"}</DialogTitle>
          </DialogHeader>
          <form
            id="package-form"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              savePackage.mutate(pkgForm);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="pkg-name">Package name</Label>
              <Input
                id="pkg-name"
                required
                value={pkgForm.name}
                onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkg-service">Related service</Label>
              <Select
                value={pkgForm.service_id}
                onValueChange={(v) => setPkgForm({ ...pkgForm, service_id: v })}
              >
                <SelectTrigger id="pkg-service">
                  <SelectValue />
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
            <div className="space-y-2">
              <Label htmlFor="pkg-desc">Description</Label>
              <Textarea
                id="pkg-desc"
                rows={3}
                value={pkgForm.description}
                onChange={(e) => setPkgForm({ ...pkgForm, description: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="pkg-currency">Currency</Label>
                <Input
                  id="pkg-currency"
                  value={pkgForm.currency}
                  onChange={(e) => setPkgForm({ ...pkgForm, currency: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pkg-price">Price</Label>
                <Input
                  id="pkg-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={pkgForm.price}
                  onChange={(e) => setPkgForm({ ...pkgForm, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pkg-type">Pricing type</Label>
                <Select
                  value={pkgForm.pricing_type}
                  onValueChange={(v) =>
                    setPkgForm({ ...pkgForm, pricing_type: v as PricingType })
                  }
                >
                  <SelectTrigger id="pkg-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICING_TYPES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRICING_LABEL[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkg-features">Features (one per line)</Label>
              <Textarea
                id="pkg-features"
                rows={4}
                value={pkgForm.features}
                onChange={(e) => setPkgForm({ ...pkgForm, features: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkg-limits">Limitations (one per line)</Label>
              <Textarea
                id="pkg-limits"
                rows={3}
                value={pkgForm.limitations}
                onChange={(e) => setPkgForm({ ...pkgForm, limitations: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkg-notes">Notes for the assistant</Label>
              <Textarea
                id="pkg-notes"
                rows={3}
                value={pkgForm.ai_notes}
                onChange={(e) => setPkgForm({ ...pkgForm, ai_notes: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pkg-sort">Sort order</Label>
                <Input
                  id="pkg-sort"
                  type="number"
                  value={pkgForm.sort_order}
                  onChange={(e) => setPkgForm({ ...pkgForm, sort_order: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-3 pt-7">
                <Switch
                  id="pkg-active"
                  checked={pkgForm.is_active}
                  onCheckedChange={(v) => setPkgForm({ ...pkgForm, is_active: v })}
                />
                <Label htmlFor="pkg-active">Active</Label>
              </div>
            </div>
          </form>
          <DialogFooter>
            <Button type="submit" form="package-form" disabled={savePackage.isPending}>
              {savePackage.isPending ? "Saving…" : "Save package"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

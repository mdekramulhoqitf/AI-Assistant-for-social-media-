import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Mail, MessageCircle, Phone, Search } from "lucide-react";

import { PageHeader, EmptyState } from "@/components/page-header";
import {
  ChannelBadge,
  HandlerBadge,
  StatusDot,
  type Channel,
  type Handler,
} from "@/components/indicators";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/conversations")({
  head: () => ({
    meta: [
      { title: "Conversations — DigitalHub AI Assistant" },
      {
        name: "description",
        content:
          "Browse customer conversations across Messenger and Instagram with AI or human handling status.",
      },
      { property: "og:title", content: "Conversations — DigitalHub AI Assistant" },
      {
        property: "og:description",
        content: "Customer conversation inbox for the DigitalHub assistant.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConversationsPage,
});

type ConversationRow = {
  id: string;
  channel: Channel;
  status: string;
  handled_by: Handler;
  last_message_at: string;
  subject: string | null;
  customers: {
    full_name: string;
    email: string | null;
    phone: string | null;
    locale: string | null;
    notes: string | null;
  } | null;
};

function ConversationsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [channel, setChannel] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const conversations = useQuery({
    queryKey: ["conversations", status, channel],
    queryFn: async (): Promise<ConversationRow[]> => {
      let query = supabase
        .from("conversations")
        .select(
          "id, channel, status, handled_by, last_message_at, subject, customers(full_name, email, phone, locale, notes)",
        )
        .order("last_message_at", { ascending: false });
      if (status !== "all") query = query.eq("status", status as "active");
      if (channel !== "all") query = query.eq("channel", channel as "messenger");
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as ConversationRow[];
    },
  });

  const list = (conversations.data ?? []).filter((c) =>
    (c.customers?.full_name ?? "").toLowerCase().includes(search.toLowerCase()),
  );
  const selected = list.find((c) => c.id === selectedId) ?? list[0] ?? null;

  const messages = useQuery({
    queryKey: ["messages", selected?.id],
    enabled: Boolean(selected?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender, content, created_at")
        .eq("conversation_id", selected!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div>
      <PageHeader
        title="Conversations"
        description="Every customer thread the assistant is handling, with full context."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search customers"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All channels</SelectItem>
            <SelectItem value="messenger">Messenger</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="web">Web</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {conversations.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<MessageCircle className="size-6" />}
          title="No conversations to show"
          description="Conversations will appear here once a messaging channel is connected and customers start chatting."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)_280px]">
          <div className="surface-card max-h-[70vh] overflow-y-auto">
            <ul className="divide-y divide-border">
              {list.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      "w-full px-4 py-3 text-left transition-colors hover:bg-muted",
                      selected?.id === c.id && "bg-muted",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {c.customers?.full_name ?? "Unknown"}
                      </p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {format(new Date(c.last_message_at), "MMM d")}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {c.subject ?? "No subject"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <ChannelBadge channel={c.channel} />
                      <HandlerBadge handler={c.handled_by} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="surface-card flex max-h-[70vh] flex-col">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <p className="text-sm font-semibold">
                {selected?.customers?.full_name ?? "Conversation"}
              </p>
              {selected ? <StatusDot status={selected.status} /> : null}
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {messages.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (messages.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No messages in this thread yet.</p>
              ) : (
                messages.data?.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[80%] rounded-xl px-4 py-2.5 text-sm",
                      m.sender === "customer"
                        ? "bg-muted"
                        : "ml-auto bg-primary text-primary-foreground",
                    )}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    <p className="mt-1 text-[11px] opacity-70">
                      {m.sender === "customer" ? "Customer" : m.sender === "ai" ? "AI" : "Agent"} ·{" "}
                      {format(new Date(m.created_at), "MMM d, HH:mm")}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
              Replying from the dashboard becomes available once a messaging channel is connected.
            </div>
          </div>

          <div className="surface-card p-5">
            <h2 className="text-sm font-semibold">Customer information</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Name</dt>
                <dd>{selected?.customers?.full_name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd className="flex items-center gap-1.5">
                  <Mail className="size-3.5 text-muted-foreground" />
                  {selected?.customers?.email ?? "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Phone</dt>
                <dd className="flex items-center gap-1.5">
                  <Phone className="size-3.5 text-muted-foreground" />
                  {selected?.customers?.phone ?? "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Language</dt>
                <dd>{selected?.customers?.locale ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Notes</dt>
                <dd className="text-muted-foreground">
                  {selected?.customers?.notes ?? "No notes recorded."}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

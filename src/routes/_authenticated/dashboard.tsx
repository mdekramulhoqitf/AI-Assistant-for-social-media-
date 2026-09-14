import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bot,
  MessageCircle,
  MessagesSquare,
  Radio,
  UserRound,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { PageHeader, EmptyState } from "@/components/page-header";
import { ChannelBadge, HandlerBadge, StatusDot, type Channel, type Handler } from "@/components/indicators";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — DigitalHub AI Assistant" },
      {
        name: "description",
        content:
          "Live overview of DigitalHub conversations, leads, AI-handled chats and human handoffs.",
      },
      { property: "og:title", content: "Dashboard — DigitalHub AI Assistant" },
      {
        property: "og:description",
        content: "Live overview of conversations, leads and AI performance at DigitalHub.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

type RecentConversation = {
  id: string;
  channel: Channel;
  status: string;
  handled_by: Handler;
  last_message_at: string;
  customers: { full_name: string } | null;
};

function DashboardPage() {
  const stats = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const count = (q: { count: number | null }) => q.count ?? 0;
      const [total, active, leads, ai, human] = await Promise.all([
        supabase.from("conversations").select("*", { count: "exact", head: true }),
        supabase
          .from("conversations")
          .select("*", { count: "exact", head: true })
          .eq("status", "active"),
        supabase.from("leads").select("*", { count: "exact", head: true }),
        supabase
          .from("conversations")
          .select("*", { count: "exact", head: true })
          .eq("handled_by", "ai"),
        supabase
          .from("conversations")
          .select("*", { count: "exact", head: true })
          .eq("handled_by", "human"),
      ]);
      return {
        total: count(total),
        active: count(active),
        leads: count(leads),
        ai: count(ai),
        human: count(human),
      };
    },
  });

  const recent = useQuery({
    queryKey: ["dashboard-recent"],
    queryFn: async (): Promise<RecentConversation[]> => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, channel, status, handled_by, last_message_at, customers(full_name)")
        .order("last_message_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as unknown as RecentConversation[];
    },
  });

  const cards = [
    { label: "Total conversations", value: stats.data?.total, icon: MessagesSquare },
    { label: "Active conversations", value: stats.data?.active, icon: Radio },
    { label: "Leads", value: stats.data?.leads, icon: Users },
    { label: "AI handled", value: stats.data?.ai, icon: Bot },
    { label: "Human handoffs", value: stats.data?.human, icon: UserRound },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Performance of the DigitalHub assistant across every connected channel."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="surface-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <card.icon className="size-4 text-muted-foreground" />
            </div>
            {stats.isLoading ? (
              <Skeleton className="mt-3 h-8 w-14" />
            ) : (
              <p className="mt-2 font-display text-3xl font-semibold">{card.value ?? 0}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 surface-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Recent conversations</h2>
          <Link to="/conversations" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="p-2">
          {recent.isLoading ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (recent.data?.length ?? 0) === 0 ? (
            <div className="p-3">
              <EmptyState
                icon={<MessageCircle className="size-6" />}
                title="No conversations yet"
                description="Once a messaging channel is connected, incoming chats will appear here."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recent.data?.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {c.customers?.full_name ?? "Unknown customer"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true })}
                    </p>
                  </div>
                  <StatusDot status={c.status} />
                  <ChannelBadge channel={c.channel} />
                  <HandlerBadge handler={c.handled_by} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

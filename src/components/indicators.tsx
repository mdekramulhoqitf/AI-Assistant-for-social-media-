import { Badge } from "@/components/ui/badge";
import { Bot, Facebook, Globe, Instagram, UserRound } from "lucide-react";

export type Channel = "messenger" | "instagram" | "web";
export type Handler = "ai" | "human";

const CHANNEL_META: Record<Channel, { label: string; icon: typeof Facebook }> = {
  messenger: { label: "Messenger", icon: Facebook },
  instagram: { label: "Instagram", icon: Instagram },
  web: { label: "Web", icon: Globe },
};

export function ChannelBadge({ channel }: { channel: Channel }) {
  const meta = CHANNEL_META[channel] ?? CHANNEL_META.web;
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className="gap-1 font-normal">
      <Icon className="size-3" />
      {meta.label}
    </Badge>
  );
}

export function HandlerBadge({ handler }: { handler: Handler }) {
  return handler === "ai" ? (
    <Badge variant="secondary" className="gap-1 font-normal">
      <Bot className="size-3" />
      AI
    </Badge>
  ) : (
    <Badge className="gap-1 font-normal">
      <UserRound className="size-3" />
      Human
    </Badge>
  );
}

export function StatusDot({ status }: { status: string }) {
  const tone =
    status === "active"
      ? "bg-success"
      : status === "pending"
        ? "bg-warning"
        : "bg-muted-foreground";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs capitalize text-muted-foreground">
      <span className={`size-2 rounded-full ${tone}`} />
      {status}
    </span>
  );
}

export function ConnectionBadge({ connected }: { connected: boolean }) {
  return connected ? (
    <Badge className="font-normal">Connected</Badge>
  ) : (
    <Badge variant="outline" className="font-normal text-muted-foreground">
      Not Connected
    </Badge>
  );
}

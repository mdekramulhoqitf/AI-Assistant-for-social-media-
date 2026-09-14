import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bot, Send, UserRound } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { ConnectionBadge } from "@/components/indicators";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAiStatus, runAiTest } from "@/lib/ai.functions";
import type { EngineResult } from "@/lib/ai/types";

export const Route = createFileRoute("/_authenticated/ai-test")({
  head: () => ({
    meta: [
      { title: "AI Test Console — DigitalHub AI Assistant" },
      {
        name: "description",
        content:
          "Internal test console to inspect detected intent, retrieved knowledge, decision and the generated assistant reply.",
      },
      { property: "og:title", content: "AI Test Console — DigitalHub AI Assistant" },
      {
        property: "og:description",
        content: "Try a customer message and inspect how the DigitalHub assistant would respond.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AiTestPage,
});

type Turn = { role: "customer" | "assistant"; content: string };

function AiTestPage() {
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState<"web" | "messenger" | "instagram">("web");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [result, setResult] = useState<EngineResult | null>(null);

  const status = useQuery({ queryKey: ["ai-status"], queryFn: () => getAiStatus() });

  const run = useMutation({
    mutationFn: async (text: string) =>
      runAiTest({ data: { message: text, channel, conversationId } }),
    onSuccess: (data) => {
      setConversationId(data.conversation_id);
      setResult(data);
      setTurns((prev) => [...prev, { role: "assistant", content: data.reply }]);
    },
    onError: (error: Error) => {
      setResult(null);
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: `Test failed: ${error.message}` },
      ]);
    },
  });

  const send = () => {
    const text = message.trim();
    if (!text || run.isPending) return;
    setTurns((prev) => [...prev, { role: "customer", content: text }]);
    setMessage("");
    run.mutate(text);
  };

  return (
    <div>
      <PageHeader
        title="AI Test Console"
        description="Internal tool for the team. Nothing here is sent to a real customer."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="gap-1 border-warning text-warning">
          <AlertTriangle className="size-3" />
          Test tool — no messages are delivered
        </Badge>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          OpenAI
          <ConnectionBadge connected={Boolean(status.data?.openaiConnected)} />
        </span>
      </div>

      {status.isSuccess && !status.data.openaiConnected ? (
        <p className="mb-4 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          OpenAI is not connected. Add an <code>OPENAI_API_KEY</code> secret in Project Settings →
          Secrets. Until then the engine replies with the configured safe fallback.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="surface-card flex min-h-[420px] flex-col p-4">
          <div className="flex-1 space-y-3 overflow-y-auto">
            {turns.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Send a test customer message to see the intent, knowledge used, decision and reply.
              </p>
            ) : (
              turns.map((turn, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${turn.role === "customer" ? "justify-end" : "justify-start"}`}
                >
                  {turn.role === "assistant" ? (
                    <Bot className="mt-2 size-4 shrink-0 text-muted-foreground" />
                  ) : null}
                  <div
                    className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                      turn.role === "customer"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {turn.content}
                  </div>
                  {turn.role === "customer" ? (
                    <UserRound className="mt-2 size-4 shrink-0 text-muted-foreground" />
                  ) : null}
                </div>
              ))
            )}
            {run.isPending ? (
              <p className="text-sm text-muted-foreground">Assistant is thinking…</p>
            ) : null}
          </div>

          <div className="mt-4 space-y-3 border-t border-border pt-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-40 space-y-1">
                <Label className="text-xs">Simulated channel</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="web">Web</SelectItem>
                    <SelectItem value="messenger">Messenger</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setConversationId(null);
                  setTurns([]);
                  setResult(null);
                }}
              >
                New test conversation
              </Button>
            </div>
            <Textarea
              rows={3}
              value={message}
              placeholder="e.g. Website banate koto taka lagbe?"
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <Button onClick={send} disabled={run.isPending || !message.trim()} className="gap-2">
              <Send className="size-4" />
              {run.isPending ? "Running…" : "Run test message"}
            </Button>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="surface-card space-y-3 p-4">
            <h2 className="text-sm font-semibold">Engine output</h2>
            {!result ? (
              <p className="text-sm text-muted-foreground">No run yet.</p>
            ) : (
              <dl className="space-y-2 text-sm">
                <Row label="Intent" value={result.intent} />
                <Row label="Confidence" value={result.confidence.toFixed(2)} />
                <Row label="Decision" value={result.decision} />
                <Row label="Language" value={result.language} />
                <Row label="Handoff" value={result.handoff ? "yes" : "no"} />
                <Row label="Status" value={result.status} />
                <Row label="Model" value={result.model ?? "—"} />
                <Row label="Latency" value={`${result.latency_ms} ms`} />
                {result.error ? (
                  <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                    {result.error}
                  </p>
                ) : null}
              </dl>
            )}
          </section>

          <section className="surface-card space-y-3 p-4">
            <h2 className="text-sm font-semibold">Knowledge used</h2>
            {!result || result.knowledge.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {result ? "No matching knowledge found." : "No run yet."}
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {result.knowledge.map((ref) => (
                  <li key={`${ref.kind}-${ref.id}`} className="flex items-start gap-2">
                    <Badge variant="outline" className="shrink-0 font-normal">
                      {ref.category ?? ref.kind}
                    </Badge>
                    <span className="min-w-0 break-words">{ref.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="surface-card space-y-3 p-4">
            <h2 className="text-sm font-semibold">Lead signals detected</h2>
            {!result?.lead ? (
              <p className="text-sm text-muted-foreground">None.</p>
            ) : (
              <dl className="space-y-2 text-sm">
                {Object.entries(result.lead)
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <Row key={k} label={k.replace(/_/g, " ")} value={String(v)} />
                  ))}
              </dl>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="capitalize text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium break-words">{value}</dd>
    </div>
  );
}

// Facebook Messenger webhook handling (server-only).
// Verifies Meta's webhook handshake and signed events, runs incoming text
// messages through the shared AI engine, and pushes the reply back via the
// Send API when auto-reply is enabled in AI settings.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { processMessage } from "@/lib/ai/engine.server";

const GRAPH_API_VERSION = "v21.0";
const MESSENGER_TEXT_LIMIT = 2000;

function log(event: string, data: Record<string, unknown>) {
  console.log(`[messenger] ${event}`, JSON.stringify(data));
}

function getEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : null;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** GET /api/messenger/webhook — Meta's one-time verification handshake. */
export function handleMessengerVerify(request: Request): Response {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const verifyToken = getEnv("FB_VERIFY_TOKEN");

  if (!verifyToken) {
    log("verify_not_configured", {});
    return new Response("Webhook verify token not configured.", { status: 500 });
  }
  if (mode === "subscribe" && token === verifyToken && challenge) {
    log("verified", {});
    return new Response(challenge, { status: 200 });
  }
  log("verify_failed", { mode });
  return new Response("Forbidden", { status: 403 });
}

type MessengerAttachment = { type: string };
type MessengerMessage = {
  mid?: string;
  text?: string;
  is_echo?: boolean;
  attachments?: MessengerAttachment[];
};
type MessagingEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: MessengerMessage;
};
type WebhookPayload = {
  object?: string;
  entry?: Array<{ id?: string; messaging?: MessagingEvent[] }>;
};

async function sendMessengerText(recipientId: string, text: string, pageAccessToken: string): Promise<void> {
  const body = {
    recipient: { id: recipientId },
    message: { text: text.slice(0, MESSENGER_TEXT_LIMIT) },
    messaging_type: "RESPONSE",
  };
  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      log("send_failed", { status: res.status, body: errBody.slice(0, 500) });
    }
  } catch (err) {
    log("send_network_error", { error: (err as Error).message });
  }
}

async function alreadyProcessed(mid: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from("messages").select("id").eq("external_message_id", mid).maybeSingle();
  return Boolean(data);
}

async function handleOneEvent(event: MessagingEvent, pageAccessToken: string | null): Promise<void> {
  const senderId = event.sender?.id;
  const message = event.message;
  if (!senderId || !message) return;
  if (message.is_echo) return; // our own reply bouncing back through the webhook
  const text = message.text?.trim();
  if (!text) {
    log("skipped_non_text", { senderId, hasAttachments: Boolean(message.attachments?.length) });
    return;
  }
  if (message.mid && (await alreadyProcessed(message.mid))) {
    log("duplicate_delivery_skipped", { mid: message.mid });
    return;
  }

  const result = await processMessage(supabaseAdmin, {
    channel: "messenger",
    externalUserId: senderId,
    externalConversationId: senderId,
    message: text,
    metadata: { mid: message.mid ?? null },
  });

  log("processed", { senderId, intent: result.intent, decision: result.decision, autoReplied: result.auto_replied });

  if (result.auto_replied && result.reply && pageAccessToken) {
    await sendMessengerText(senderId, result.reply, pageAccessToken);
  }
}

async function processPayload(payload: WebhookPayload): Promise<void> {
  const pageAccessToken = getEnv("FB_PAGE_ACCESS_TOKEN");
  if (!pageAccessToken) log("page_token_missing", {});

  for (const entry of payload.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      try {
        await handleOneEvent(event, pageAccessToken);
      } catch (err) {
        log("event_failed", { error: (err as Error).message });
      }
    }
  }
}

type WorkerCtx = { waitUntil?: (promise: Promise<unknown>) => void };

/** POST /api/messenger/webhook — signed page events from Meta. */
export async function handleMessengerEvent(request: Request, ctx: unknown): Promise<Response> {
  const appSecret = getEnv("FB_APP_SECRET");
  const rawBody = await request.text();

  if (appSecret) {
    const signatureHeader = request.headers.get("x-hub-signature-256") ?? "";
    const expected = `sha256=${await hmacSha256Hex(appSecret, rawBody)}`;
    if (!timingSafeEqual(signatureHeader, expected)) {
      log("signature_invalid", {});
      return new Response("Forbidden", { status: 403 });
    }
  } else {
    log("app_secret_not_configured_skipping_verification", {});
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const work = processPayload(payload).catch((err) => log("payload_failed", { error: (err as Error).message }));
  const workerCtx = ctx as WorkerCtx;
  if (typeof workerCtx?.waitUntil === "function") {
    workerCtx.waitUntil(work);
  } else {
    await work;
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
}

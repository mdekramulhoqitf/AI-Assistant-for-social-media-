import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { processMessage, type EngineInput } from "@/lib/ai/engine.server";
import { isOpenAiConfigured } from "@/lib/ai/openai.server";
import type { EngineResult } from "@/lib/ai/types";

/** OpenAI connection status — reports whether the server secret is present. */
export const getAiStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ openaiConnected: isOpenAiConfigured() }));

const TestInput = z.object({
  message: z.string().min(1, "Enter a test message"),
  conversationId: z.string().uuid().nullable().optional(),
  channel: z.enum(["messenger", "instagram", "web"]).default("web"),
});

/**
 * Developer test run. Uses a dedicated test conversation, never writes an
 * assistant message into a live customer thread and never sends anything out.
 */
export const runAiTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => TestInput.parse(data))
  .handler(async ({ data, context }): Promise<EngineResult> => {
    const input: EngineInput = {
      channel: data.channel,
      message: data.message,
      conversationId: data.conversationId ?? null,
      customer: { fullName: "Test customer" },
      metadata: { source: "admin_test_console" },
      test: true,
    };
    return processMessage(context.supabase, input);
  });

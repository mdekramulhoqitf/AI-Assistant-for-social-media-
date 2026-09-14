import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { BrandLockup } from "@/components/brand";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DigitalHub AI Assistant — Support & Sales Workspace" },
      {
        name: "description",
        content:
          "Admin workspace for DigitalHub: track conversations, leads, services and the AI knowledge base in one place.",
      },
      { property: "og:title", content: "DigitalHub AI Assistant" },
      {
        property: "og:description",
        content:
          "Admin workspace for DigitalHub: conversations, leads, services and AI knowledge in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    navigate({ to: session ? "/dashboard" : "/auth", replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/40">
      <BrandLockup />
      <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

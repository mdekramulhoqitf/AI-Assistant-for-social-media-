import { useState } from "react";
import {
  Link,
  Outlet,
  createFileRoute,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import {
  BookOpen,
  FlaskConical,
  Bot,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  MessagesSquare,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/conversations", label: "Conversations", icon: MessagesSquare },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/knowledge", label: "Knowledge Base", icon: BookOpen },
  { to: "/services", label: "Services", icon: Sparkles },
  { to: "/templates", label: "Templates", icon: MessageSquareText },
  { to: "/ai-settings", label: "AI Settings", icon: Bot },
  { to: "/ai-test", label: "AI Test Console", icon: FlaskConical },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;


function AuthenticatedLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/auth", replace: true });
    }
  }, [loading, session, navigate]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const email = session.user.email ?? "Team member";

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div className="leading-tight">
              <p className="font-display text-sm font-semibold text-sidebar-accent-foreground">
                DigitalHub
              </p>
              <p className="text-xs opacity-70">AI Assistant</p>
            </div>
          </div>
          <button
            className="rounded-md p-1.5 hover:bg-sidebar-accent lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium opacity-80 transition-colors hover:bg-sidebar-accent hover:opacity-100"
              activeProps={{
                className:
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-sidebar-primary text-sidebar-primary-foreground opacity-100 hover:bg-sidebar-primary",
              }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <p className="truncate px-2 text-xs opacity-70">{email}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth", replace: true });
            }}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {open ? (
        <div
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur lg:hidden">
          <button
            className="rounded-md p-2 hover:bg-muted"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <span className="font-display text-sm font-semibold">DigitalHub AI Assistant</span>
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

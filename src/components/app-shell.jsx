// App shell: header (brand, sections, account), the not-a-medical-device note, and the page column.
import { useState } from "react";
import { NavLink } from "react-router";
import { Key, SignOut } from "@phosphor-icons/react";
import { useAuth } from "@/auth-context";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RecoveryPrompt } from "@/components/recovery-codes";
import { ChangePasswordForm } from "@/screens/account";

export const DISCLAIMER =
  "GaitScan is an experimental measurement tool, not a medical device. It does not diagnose " +
  "conditions or predict outcomes, and its measurements have not been clinically validated.";

export function Disclaimer() {
  return (
    <div
      role="note"
      className="border-b bg-muted px-4 py-2 text-center text-xs leading-relaxed text-muted-foreground"
    >
      {DISCLAIMER}
    </div>
  );
}

export function Brand() {
  return (
    <span className="flex items-center gap-2">
      <BrandMark className="size-6 text-primary" />
      <span className="text-[17px] font-semibold tracking-tight">GaitScan</span>
    </span>
  );
}

// sections: [{ to, label, icon, end }], rendered as links (the router marks the current one).
export function AppShell({ sections, children }) {
  const { user, logout } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const role = user?.role === "clinician" ? "Clinician" : "Patient";

  return (
    <div className="min-h-[100dvh] bg-background">
      <a
        href="#main"
        className="sr-only rounded-md bg-surface px-3 py-2 text-sm focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-10"
      >
        Skip to content
      </a>
      <header className="border-b bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:h-16 sm:flex-nowrap sm:py-0">
          <Brand />
          {/* Phones: the sections get their own full-width row below the brand and account buttons. */}
          <nav
            aria-label="Sections"
            className="order-last grid w-full auto-cols-fr grid-flow-col gap-1 sm:order-none sm:flex sm:w-auto sm:items-center"
          >
            {sections.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
                    isActive ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {Icon && (
                      <Icon
                        size={16}
                        weight={isActive ? "fill" : "regular"}
                        aria-hidden
                        className="hidden shrink-0 sm:block"
                      />
                    )}
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-sm font-medium">{user?.name || "User"}</div>
              <div className="text-xs text-muted-foreground">{role}</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPassword((v) => !v)}
              aria-expanded={showPassword}
            >
              <Key aria-hidden />
              <span className="hidden md:inline">Change password</span>
              <span className="sr-only md:hidden">Change password</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={logout}>
              <SignOut aria-hidden />
              <span className="hidden md:inline">Sign out</span>
              <span className="sr-only md:hidden">Sign out</span>
            </Button>
          </div>
        </div>
        {showPassword && (
          <div className="border-t">
            <div className="mx-auto max-w-5xl px-4 py-4">
              <ChangePasswordForm />
            </div>
          </div>
        )}
      </header>
      <RecoveryPrompt />
      <Disclaimer />
      <main id="main" className="mx-auto max-w-5xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}

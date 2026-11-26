"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isLight = mounted && resolvedTheme === "light";
  const nextTheme = isLight ? "dark" : "light";

  return (
    <button
      type="button"
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card/60 text-muted-foreground transition-colors hover:border-primary/60 hover:bg-primary/10 hover:text-primary"
      aria-label="Light mode"
      aria-pressed={isLight}
      title={mounted ? `Switch to ${nextTheme} mode` : undefined}
      disabled={!mounted}
      onClick={() => setTheme(nextTheme)}
    >
      <Sun size={18} className="hidden dark:block" aria-hidden="true" />
      <Moon size={18} className="dark:hidden" aria-hidden="true" />
    </button>
  );
}

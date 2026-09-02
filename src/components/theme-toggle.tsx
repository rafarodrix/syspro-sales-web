"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ variant = "switch" }: { variant?: "icon" | "switch" }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  if (variant === "icon") {
    return (
      <Button
        aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
        onClick={() => setTheme(isDark ? "light" : "dark")}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        {isDark ? <SunIcon /> : <MoonIcon />}
      </Button>
    );
  }

  return (
    <button
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      className="inline-flex items-center gap-1.5 rounded-full border bg-muted/60 p-1 text-muted-foreground transition-colors hover:bg-muted"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      type="button"
    >
      <SunIcon className={`size-3.5 ${!isDark ? "text-amber-500 font-bold" : "opacity-60"}`} />
      <span className="relative flex h-4 w-7 items-center rounded-full bg-primary/20 transition-colors">
        <span
          className={`inline-block size-3 rounded-full bg-primary transition-transform ${
            isDark ? "translate-x-3.5 bg-blue-500" : "translate-x-0.5 bg-blue-600"
          }`}
        />
      </span>
      <MoonIcon className={`size-3.5 ${isDark ? "text-blue-400 font-bold" : "opacity-60"}`} />
    </button>
  );
}

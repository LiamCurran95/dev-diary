"use client";

import { useEffect, useState } from "react";
import { HeaderGlobalAction } from "@carbon/react";
import { Laptop, Moon, Sun } from "@carbon/icons-react";

import { THEME_STORAGE_KEY, type ThemeChoice } from "@/lib/theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function readStored(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* storage can throw in private modes; fall back to the system theme */
  }
  return "system";
}

/**
 * System / light / dark. "System" leaves the page on prefers-color-scheme and
 * labels which way the system currently points, so it's visible that the
 * theme is being picked up rather than hard-coded.
 */
export function ThemeSwitcher() {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    setChoice(readStored());

    const media = window.matchMedia(DARK_QUERY);
    setSystemDark(media.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const select = (next: ThemeChoice) => {
    setChoice(next);
    const root = document.documentElement;
    try {
      if (next === "system") {
        delete root.dataset.theme;
        localStorage.removeItem(THEME_STORAGE_KEY);
      } else {
        root.dataset.theme = next;
        localStorage.setItem(THEME_STORAGE_KEY, next);
      }
    } catch {
      /* the attribute is set regardless; only persistence is lost */
    }
  };

  const systemLabel = `Match system (currently ${systemDark ? "dark" : "light"})`;

  return (
    <>
      {choice === "system" && (
        <span className="theme-status" aria-live="polite">
          System · {systemDark ? "dark" : "light"}
        </span>
      )}
      <HeaderGlobalAction
        aria-label={systemLabel}
        isActive={choice === "system"}
        onClick={() => select("system")}
        tooltipAlignment="center"
      >
        <Laptop size={20} />
      </HeaderGlobalAction>
      <HeaderGlobalAction
        aria-label="Light theme"
        isActive={choice === "light"}
        onClick={() => select("light")}
        tooltipAlignment="center"
      >
        <Sun size={20} />
      </HeaderGlobalAction>
      <HeaderGlobalAction
        aria-label="Dark theme"
        isActive={choice === "dark"}
        onClick={() => select("dark")}
        tooltipAlignment="end"
      >
        <Moon size={20} />
      </HeaderGlobalAction>
    </>
  );
}

"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/** The current theme (dark unless the visitor chose light), kept in sync with the data-theme attribute on <html>. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getSnapshot, () => "dark");
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("ff-theme", theme);
  } catch {
    // private browsing: the choice simply lasts for this visit
  }
}

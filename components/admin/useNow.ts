"use client";

import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  const timer = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(timer);
};
// Rounded to the minute, so the value only changes when it should.
const read = () => Math.floor(Date.now() / 60_000) * 60_000;

/** The current time in the browser, updated every minute. Zero while rendering on the server. */
export function useNow() {
  return useSyncExternalStore(subscribe, read, () => 0);
}

"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { sendMagicLink, signInWithPassword, type LoginState } from "@/app/login/actions";

const linkErrors: Record<string, string> = {
  link: "That sign-in link has expired or was already used. Ask for a new one below.",
  denied: "That account cannot use the admin area.",
};

/** A field people never see. Spam bots fill it in, which gives them away. */
function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

export function LoginForm() {
  const params = useSearchParams();
  const [tab, setTab] = useState<"password" | "link">("password");
  const [pwState, pwAction, pwPending] = useActionState<LoginState, FormData>(signInWithPassword, {});
  const [linkState, linkAction, linkPending] = useActionState<LoginState, FormData>(sendMagicLink, {});
  const urlError = linkErrors[params.get("error") ?? ""];

  return (
    <div className="mt-6">
      <div role="tablist" aria-label="Sign-in method" className="grid grid-cols-2 gap-1 rounded-full bg-bg-soft p-1">
        {(
          [
            ["password", "Password"],
            ["link", "Email me a link"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            type="button"
            id={`tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`panel-${key}`}
            onClick={() => setTab(key)}
            className={`rounded-full px-3 py-2 text-sm font-medium transition ${
              tab === key ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {urlError && (
        <p role="alert" className="mt-5 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-ink">
          {urlError}
        </p>
      )}

      {tab === "password" ? (
        <form id="panel-password" role="tabpanel" aria-labelledby="tab-password" action={pwAction} className="relative mt-6 space-y-4">
          <Honeypot />
          <div>
            <label htmlFor="pw-email" className="label">Email</label>
            <input id="pw-email" name="email" type="email" required autoComplete="username" defaultValue={pwState.email} className="field" />
          </div>
          <div>
            <label htmlFor="pw-password" className="label">Password</label>
            <input id="pw-password" name="password" type="password" required autoComplete="current-password" className="field" />
          </div>
          {pwState.error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-300">{pwState.error}</p>
          )}
          <button type="submit" disabled={pwPending} className="btn-primary w-full py-2.5">
            {pwPending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      ) : (
        <form id="panel-link" role="tabpanel" aria-labelledby="tab-link" action={linkAction} className="relative mt-6 space-y-4">
          <Honeypot />
          <div>
            <label htmlFor="link-email" className="label">Email</label>
            <input id="link-email" name="email" type="email" required autoComplete="email" defaultValue={linkState.email} className="field" />
            <p className="hint">We will email a one-time link that signs you in. No password needed.</p>
          </div>
          {linkState.error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-300">{linkState.error}</p>
          )}
          {linkState.message && (
            <p role="status" className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-ink">{linkState.message}</p>
          )}
          <button type="submit" disabled={linkPending} className="btn-primary w-full py-2.5">
            {linkPending ? "Sending…" : "Email me a sign-in link"}
          </button>
        </form>
      )}
    </div>
  );
}

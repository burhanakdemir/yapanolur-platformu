"use client";

import { useEffect, useState } from "react";
import { clientApiUrl } from "@/lib/clientApi";
import { NewAdEmailOptInGradientBox } from "@/components/NewAdEmailOptInGradientBox";

type Labels = {
  optInLabel: string;
  optInHelp: string;
  saveHint: string;
  saving: string;
  error: string;
};

type Variant = "default" | "hero";

function messageClass(variant: Variant, kind: "ok" | "err" | "saving") {
  if (variant === "hero") {
    if (kind === "ok") return "text-sm text-emerald-200";
    if (kind === "err") return "text-sm text-amber-100";
    return "text-xs text-white/80";
  }
  if (kind === "ok") return "text-xs text-emerald-700";
  if (kind === "err") return "text-xs text-red-600";
  return "text-xs text-slate-500";
}

export default function UserPanelNewAdEmailOptIn({
  initial,
  labels,
  variant = "default",
}: {
  initial: boolean;
  labels: Labels;
  /** hero: üst bant (turuncu) üzerinde; mesaj renkleri açık zemin içindir */
  variant?: Variant;
}) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<"" | "ok" | "err">("");

  useEffect(() => {
    setValue(initial);
  }, [initial]);

  async function onChange(next: boolean) {
    setValue(next);
    setMessage("");
    setSaving(true);
    try {
      const res = await fetch(clientApiUrl("/api/member-profile"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ newAdEmailOptIn: next }),
      });
      if (!res.ok) {
        setMessage("err");
        setValue(!next);
        return;
      }
      setMessage("ok");
      window.setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("err");
      setValue(!next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <NewAdEmailOptInGradientBox>
        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={value}
            disabled={saving}
            onChange={(e) => void onChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border border-white/50 bg-white/10 accent-white disabled:opacity-60"
            aria-label={labels.optInLabel}
          />
          <span>
            <span className="font-semibold text-white">{labels.optInLabel}</span>
            <span className="mt-0.5 block text-xs font-normal leading-relaxed text-white/95">
              {labels.optInHelp}
            </span>
          </span>
        </label>
      </NewAdEmailOptInGradientBox>
      {message === "ok" ? (
        <p className={messageClass(variant, "ok")} role="status">
          {labels.saveHint}
        </p>
      ) : null}
      {message === "err" ? (
        <p className={messageClass(variant, "err")} role="alert">
          {labels.error}
        </p>
      ) : null}
      {saving && message !== "ok" ? (
        <p className={messageClass(variant, "saving")}>{labels.saving}</p>
      ) : null}
    </div>
  );
}

"use client";

import { adminUrl } from "@/lib/adminUrls";

const fetchOpt = { credentials: "include" as const };

export default function AdminGateLogout() {
  return (
    <p className="text-center">
      <button
        type="button"
        className="rounded-full border border-orange-200/90 bg-white/90 px-4 py-2 text-xs font-medium text-orange-900 shadow-sm transition hover:border-orange-300 hover:bg-orange-50/90 hover:shadow"
        onClick={async () => {
          try {
            await Promise.all([
              fetch("/api/auth/logout", { method: "POST", ...fetchOpt }),
              fetch("/api/admin/gate", { method: "DELETE", ...fetchOpt }),
            ]);
          } finally {
            window.location.replace(adminUrl());
          }
        }}
      >
        Oturumu kapat
      </button>
    </p>
  );
}

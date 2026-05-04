import { Suspense } from "react";
import EditAdClient from "@/app/ads/[id]/edit/edit-ad-client";

export default function EditAdPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-3xl p-6 text-slate-600">Yükleniyor…</main>
      }
    >
      <EditAdClient />
    </Suspense>
  );
}

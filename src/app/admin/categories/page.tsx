"use client";

import AdminCategoryNameEditor from "@/components/AdminCategoryNameEditor";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import Link from "next/link";

type CategoryNode = {
  id: string;
  name: string;
  imageUrl?: string | null;
  children: CategoryNode[];
};

function isLikelyImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
}

function SubcategoryImageUpload({
  categoryId,
  imageUrl,
  onUpdated,
  onNotify,
}: {
  categoryId: string;
  imageUrl: string | null | undefined;
  onUpdated: () => void | Promise<void>;
  onNotify?: (msg: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  /** Yükle tıklanınca closure'daki state eski kalmasın diye dosya referansı burada tutulur. */
  const pendingFileRef = useRef<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  async function runUpload() {
    const file = pendingFileRef.current;
    if (!file) {
      setLocalError("Önce dosya seçin.");
      return;
    }
    setLocalError(null);
    const byMime = file.type.startsWith("image/");
    const byName = /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
    if (!byMime && !byName) {
      setLocalError("Yalnizca resim dosyasi (JPEG, PNG, WebP, GIF).");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setLocalError("Dosya en fazla 4 MB olabilir.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("categoryId", categoryId);
      fd.set("file", file);
      const res = await fetch("/api/admin/category-image", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        body: fd,
      });
      let body: { ok?: boolean; url?: string; error?: string };
      try {
        body = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      } catch {
        const hint =
          res.status === 401 || res.status === 403
            ? "Yetkisiz: once /admin uzerinden giris yapin."
            : `Sunucu yaniti okunamadi (HTTP ${res.status}).`;
        setLocalError(hint);
        onNotify?.(hint);
        return;
      }
      if (!res.ok || !body.url) {
        const err =
          typeof body.error === "string" ? body.error : "Yukleme basarisiz.";
        setLocalError(err);
        onNotify?.(err);
        return;
      }
      setPendingFile(null);
      pendingFileRef.current = null;
      setPendingPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      if (inputRef.current) inputRef.current.value = "";
      onNotify?.("Kategori gorseli kaydedildi.");
      await onUpdated();
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Baglanti hatasi; tekrar deneyin.";
      setLocalError(msg);
      onNotify?.(msg);
    } finally {
      setBusy(false);
    }
  }

  function onFileInputChange(file: File | null) {
    setLocalError(null);
    setPendingPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (!file) {
      setPendingFile(null);
      pendingFileRef.current = null;
      return;
    }
    if (!isLikelyImageFile(file)) {
      setLocalError("Gecersiz dosya turu.");
      setPendingFile(null);
      pendingFileRef.current = null;
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setLocalError("Dosya en fazla 4 MB olabilir.");
      setPendingFile(null);
      pendingFileRef.current = null;
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    pendingFileRef.current = file;
    setPendingFile(file);
    setPendingPreviewUrl(URL.createObjectURL(file));
  }

  async function clearImage() {
    if (!window.confirm("Bu alt kategori gorselini silmek istediginize emin misiniz?")) return;
    setPendingFile(null);
    pendingFileRef.current = null;
    setLocalError(null);
    setPendingPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (inputRef.current) inputRef.current.value = "";
    setBusy(true);
    try {
      const patch = await fetch(`/api/admin/categories/${encodeURIComponent(categoryId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ imageUrl: null }),
      });
      const p = (await patch.json()) as { error?: string };
      if (!patch.ok) {
        window.alert(typeof p.error === "string" ? p.error : "Kaldirilamadi.");
        return;
      }
      onNotify?.("Kategori gorseli kaldirildi.");
      await onUpdated();
    } finally {
      setBusy(false);
    }
  }

  const previewSrc = pendingPreviewUrl ?? imageUrl ?? null;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,.heic,.heif"
        className="hidden"
        disabled={busy}
        onChange={(e) => onFileInputChange(e.target.files?.[0] ?? null)}
      />
      <div
        className="relative shrink-0 overflow-hidden rounded-xl border border-orange-200/90 bg-white shadow-[0_1px_6px_rgba(194,65,12,0.08)]"
        title={previewSrc ? "Onizleme" : "Henuz resim yok"}
      >
        {previewSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob: veya yuklenen URL
          <img
            src={previewSrc}
            alt=""
            className="block h-16 w-[5.5rem] object-cover sm:h-[4.5rem] sm:w-24"
          />
        ) : (
          <div className="flex h-16 w-[5.5rem] flex-col items-center justify-center gap-0.5 bg-gradient-to-b from-orange-50/80 to-slate-50/90 px-1 text-center sm:h-[4.5rem] sm:w-24">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
              Onizleme
            </span>
            <span className="text-[10px] leading-tight text-slate-400">Resim yok</span>
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            className="shrink-0 rounded-lg border border-orange-300/90 bg-white px-2.5 py-1.5 text-xs font-semibold text-orange-900 shadow-sm transition hover:bg-orange-50 disabled:opacity-50"
            onClick={() => inputRef.current?.click()}
          >
            {imageUrl ? "Dosya seç (değiştir)" : "Dosya seç"}
          </button>
          {pendingFile ? (
            <>
              <button
                type="button"
                disabled={busy}
                className="shrink-0 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-orange-600 hover:to-amber-600 disabled:opacity-50"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void runUpload();
                }}
              >
                {busy ? "Yükleniyor…" : "Yükle"}
              </button>
              <button
                type="button"
                disabled={busy}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                onClick={() => {
                  setPendingFile(null);
                  pendingFileRef.current = null;
                  setLocalError(null);
                  setPendingPreviewUrl((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return null;
                  });
                  if (inputRef.current) inputRef.current.value = "";
                }}
              >
                İptal
              </button>
            </>
          ) : null}
          {imageUrl && !pendingFile ? (
            <>
              <button
                type="button"
                disabled={busy}
                className="shrink-0 rounded-lg border border-red-200/90 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                onClick={() => void clearImage()}
              >
                Sil
              </button>
            </>
          ) : null}
        </div>
        {pendingFile ? (
          <p className="truncate text-[11px] text-slate-600" title={pendingFile.name}>
            Seçildi: <span className="font-medium">{pendingFile.name}</span>
          </p>
        ) : null}
        {localError ? (
          <p className="text-[11px] font-medium text-red-700">{localError}</p>
        ) : null}
      </div>
    </div>
  );
}

function CategoryReorderButtons({
  categoryId,
  index,
  total,
  onDone,
  dense,
}: {
  categoryId: string;
  index: number;
  total: number;
  onDone: () => void | Promise<void>;
  dense?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function move(direction: "up" | "down") {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/categories/${encodeURIComponent(categoryId)}/reorder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ direction }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        window.alert(data.error || "Sira degistirilemedi.");
        return;
      }
      await onDone();
    } finally {
      setBusy(false);
    }
  }

  const up = index > 0;
  const down = index < total - 1;
  const btn =
    "flex h-8 w-8 items-center justify-center rounded-md border border-orange-200/90 bg-white text-sm font-bold text-orange-800 shadow-sm transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-35";

  return (
    <div
      className={`flex shrink-0 items-center gap-1 ${dense ? "" : "border-l border-orange-100 pl-2"}`}
      title="Sürükle değil — aynı seviyede yukarı / aşağı taşı"
    >
      <span
        className="hidden select-none leading-none text-slate-400 sm:block"
        aria-hidden
      >
        ⋮⋮
      </span>
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          className={btn}
          disabled={busy || !up}
          aria-label="Yukari tasi"
          onClick={() => void move("up")}
        >
          ↑
        </button>
        <button
          type="button"
          className={btn}
          disabled={busy || !down}
          aria-label="Asagi tasi"
          onClick={() => void move("down")}
        >
          ↓
        </button>
      </div>
    </div>
  );
}

function countDescendants(node: CategoryNode): number {
  return node.children.reduce((acc, ch) => acc + 1 + countDescendants(ch), 0);
}

function findCategoryNode(nodes: CategoryNode[], id: string): CategoryNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const inner = findCategoryNode(n.children, id);
    if (inner) return inner;
  }
  return null;
}

function formatCategoryApiError(data: unknown): string {
  if (!data || typeof data !== "object") return "Hata.";
  const err = (data as { error?: unknown }).error;
  if (typeof err === "string") return err;
  if (Array.isArray(err)) {
    const msgs = err.map((item) => {
      if (item && typeof item === "object" && "message" in item) {
        return String((item as { message: unknown }).message);
      }
      return typeof item === "string" ? item : "";
    });
    return msgs.filter(Boolean).join("; ") || "Gecersiz veri.";
  }
  return "Hata.";
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [newTopCategory, setNewTopCategory] = useState("");
  /** Alt kategori paneli yalnizca tiklaninca acilir (hover yok). */
  const [expandedRootIds, setExpandedRootIds] = useState<Set<string>>(() => new Set());
  /** Her ana kategori için alt ekleme alanı */
  const [subNameByParent, setSubNameByParent] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [bulkDeleting, setBulkDeleting] = useState(false);

  async function loadCategories() {
    const res = await fetch("/api/admin/categories", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!res.ok) {
      setMessage(
        res.status === 401
          ? "Yetkisiz: once /admin uzerinden yonetici girisi yapin."
          : "Kategori listesi yuklenemedi.",
      );
      setCategories([]);
      return;
    }
    const categoryTree = await res.json();
    setCategories(Array.isArray(categoryTree) ? categoryTree : []);
  }

  useEffect(() => {
    void loadCategories();
  }, []);

  const toggleRootExpanded = useCallback((id: string) => {
    setExpandedRootIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  async function addTopCategory() {
    const name = newTopCategory.trim();
    if (!name) return;
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ name, parentId: null }),
    });
    const data = await res.json();
    setMessage(res.ok ? "Kategori eklendi." : formatCategoryApiError(data));
    if (res.ok) {
      setNewTopCategory("");
      await loadCategories();
    }
  }

  async function addSubCategory(parentId: string) {
    const name = (subNameByParent[parentId] ?? "").trim();
    if (!name) return;
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ name, parentId }),
    });
    const data = await res.json();
    setMessage(res.ok ? "Kategori eklendi." : formatCategoryApiError(data));
    if (res.ok) {
      setSubNameByParent((prev) => ({ ...prev, [parentId]: "" }));
      await loadCategories();
    }
  }

  const totalSubcategoryCount = categories.reduce((acc, c) => acc + countDescendants(c), 0);

  async function deleteAllSubcategories() {
    if (totalSubcategoryCount === 0) return;
    if (
      !window.confirm(
        `Tum alt kategoriler (${totalSubcategoryCount} adet) kalici olarak silinecek. Ana kategoriler (1, 2, 3 …) korunacak.\n\n` +
          `Bu alt kategorilerdeki ilanlarin kategori baglantisi kaldirilir (kategori secimi bosalir). Devam edilsin mi?`,
      )
    ) {
      return;
    }
    setBulkDeleting(true);
    try {
      let res: Response;
      try {
        res = await fetch("/api/admin/categories", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deleteAllSubcategories: true }),
        });
      } catch {
        setMessage("Baglanti hatasi: istek gonderilemedi.");
        return;
      }
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        deleted?: number;
        adsDetached?: number;
      };
      if (!res.ok) {
        setMessage(
          data.error ||
            (res.status === 405 || res.status === 404
              ? "API bulunamadi veya yontem desteklenmiyor; sayfayi yenileyip tekrar deneyin."
              : "Alt kategoriler silinemedi."),
        );
        return;
      }
      const d = data.deleted ?? 0;
      const a = data.adsDetached ?? 0;
      setMessage(
        `Silindi: ${d} alt kategori.` + (a > 0 ? ` ${a} ilanin kategori baglantisi kaldirildi.` : ""),
      );
      setExpandedRootIds(new Set());
      await loadCategories();
    } finally {
      setBulkDeleting(false);
    }
  }

  async function deleteCategory(id: string) {
    const node = findCategoryNode(categories, id);
    if (!node) return;

    if (node.children.length > 0) {
      window.alert(
        "Bu kategorinin altinda alt kategoriler var. Once tum alt kategorileri silin; ust kategori alt kategoriler varken silinemez.",
      );
      return;
    }

    const isMainCategory = categories.some((c) => c.id === id);
    const confirmText = isMainCategory
      ? `"${node.name}" ana kategorisini silmek istediginize emin misiniz?`
      : `"${node.name}" alt kategorisini silmek istediginize emin misiniz?`;

    if (!window.confirm(confirmText)) return;

    const res = await fetch(`/api/admin/categories/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    const data = await res.json();
    setMessage(res.ok ? "Kategori silindi." : data.error || "Hata.");
    if (res.ok) {
      setExpandedRootIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await loadCategories();
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
      <Link className="admin-back-link" href="/admin">
        ← Yonetici Ana Panel
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Kategori Ayarlari</h1>

      <section className="overflow-hidden rounded-2xl border border-orange-200/90 bg-white shadow-[0_4px_24px_rgba(194,65,12,0.07)]">
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-4 sm:px-6 sm:py-5">
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Kategori Yonetimi</h2>
          <p className="mt-1.5 max-w-3xl text-sm leading-snug text-white/95">
            Ana sayfa, ilan formu ve filtreler bu agaci kullanir; ayri bir kategori listesi yoktur.
          </p>
        </div>
        <div className="space-y-5 bg-gradient-to-b from-white via-orange-50/25 to-orange-50/50 px-4 pb-16 pt-5 sm:px-8 sm:pb-24 sm:pt-6">
          {message ? (
            <div
              role="status"
              className="rounded-xl border border-amber-200/90 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950"
            >
              {message}
            </div>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
            <input
              className="min-w-0 flex-1 rounded-xl border border-orange-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none ring-orange-300/40 focus:ring-2"
              placeholder="Yeni ana kategori adi"
              value={newTopCategory}
              onChange={(e) => setNewTopCategory(e.target.value)}
            />
            <button
              className="btn-primary shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-md"
              type="button"
              onClick={() => void addTopCategory()}
            >
              Ana kategori ekle
            </button>
          </div>

          {totalSubcategoryCount > 0 && (
            <div className="flex flex-col gap-2 rounded-xl border border-red-200/90 bg-red-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-red-900/90">
                <strong className="font-semibold">Toplu islem:</strong> Kok kategoriler kalir; tum alt agac (
                <span className="tabular-nums">{totalSubcategoryCount}</span> kategori) silinir.
              </p>
              <button
                type="button"
                disabled={bulkDeleting}
                className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-800 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void deleteAllSubcategories()}
              >
                {bulkDeleting ? "Siliniyor…" : "Tum alt kategorileri sil"}
              </button>
            </div>
          )}

          {categories.length === 0 ? (
            <p className="rounded-xl border border-dashed border-orange-200 bg-white/60 px-4 py-6 text-center text-sm text-slate-600">
              Henuz ana kategori yok. Yukaridan ekleyin.
            </p>
          ) : (
            <ul className="space-y-3">
              {categories.map((cat, rootIndex) => {
                const mainNum = rootIndex + 1;
                const isExpanded = expandedRootIds.has(cat.id);
                return (
                  <li
                    key={cat.id}
                    className="overflow-hidden rounded-xl border border-orange-200/70 bg-white shadow-sm"
                  >
                    <div className="flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
                      <CategoryReorderButtons
                        categoryId={cat.id}
                        index={rootIndex}
                        total={categories.length}
                        onDone={loadCategories}
                      />
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span
                          className="flex h-9 min-w-[2.25rem] shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 text-sm font-bold tabular-nums text-white shadow-sm"
                          title={`Ana kategori no: ${mainNum}`}
                        >
                          {mainNum}
                        </span>
                        <AdminCategoryNameEditor
                          categoryId={cat.id}
                          initialName={cat.name}
                          variant="main"
                          onRenamed={loadCategories}
                        />
                      </div>
                      <button
                        type="button"
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-orange-200/90 bg-white text-orange-700 transition hover:bg-orange-50 ${
                          isExpanded ? "ring-2 ring-orange-300/50" : ""
                        }`}
                        onClick={() => toggleRootExpanded(cat.id)}
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? "Alt kategorileri gizle" : "Alt kategorileri goster"}
                        title={isExpanded ? "Alt kategorileri gizle" : "Alt kategorileri goster"}
                      >
                        <span className="text-lg leading-none" aria-hidden>
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center border-l border-orange-100 pl-2">
                        <button
                          className={`chip shrink-0 border-orange-300 text-xs font-medium ${
                            cat.children.length > 0
                              ? "cursor-not-allowed bg-orange-50/80 text-orange-800/50"
                              : "bg-white text-orange-900 hover:bg-orange-50"
                          }`}
                          type="button"
                          disabled={cat.children.length > 0}
                          title={
                            cat.children.length > 0
                              ? "Once tum alt kategorileri silin"
                              : "Ana kategoriyi sil"
                          }
                          onClick={() => void deleteCategory(cat.id)}
                        >
                          Sil
                        </button>
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="border-t border-orange-100 bg-gradient-to-b from-slate-50/90 to-white px-3 pb-5 pt-4 sm:px-5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                          <input
                            className="min-w-0 flex-1 rounded-lg border border-orange-200 bg-white p-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                            placeholder="Yeni alt kategori adi"
                            value={subNameByParent[cat.id] ?? ""}
                            onChange={(e) =>
                              setSubNameByParent((prev) => ({ ...prev, [cat.id]: e.target.value }))
                            }
                          />
                          <button
                            className="shrink-0 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-orange-600 hover:to-amber-600"
                            type="button"
                            onClick={() => void addSubCategory(cat.id)}
                          >
                            Alt ekle
                          </button>
                        </div>
                        <div className="mt-4 max-h-[min(70vh,640px)] overflow-y-auto overscroll-y-contain pr-0.5 [-webkit-overflow-scrolling:touch]">
                          {cat.children.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-orange-200 bg-white px-3 py-6 text-center text-sm text-slate-600">
                              Bu ana kategori altinda henuz alt yok.
                            </p>
                          ) : (
                            <ul className="space-y-2">
                              {cat.children.map((child, cIdx) => (
                                <AltCategoryBranch
                                  key={child.id}
                                  node={child}
                                  numberLabel={`${mainNum}.${cIdx + 1}`}
                                  siblingIndex={cIdx}
                                  siblingCount={cat.children.length}
                                  onDelete={deleteCategory}
                                  onRenamed={loadCategories}
                                  onNotify={setMessage}
                                  subNameByParent={subNameByParent}
                                  setSubNameByParent={setSubNameByParent}
                                  onAddSubCategory={addSubCategory}
                                />
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <div className="border-t border-slate-200 pt-6">
        <p className="text-sm text-slate-600">
          <Link href="/admin/listings" className="font-medium text-orange-800 underline decoration-orange-300 underline-offset-2 hover:text-orange-950">
            Ilan ayarlari
          </Link>
          <span className="text-slate-500"> — ilan inceleme ve vitrin</span>
        </p>
      </div>
    </main>
  );
}

/** Alt kategori: her satir turuncu temali buton karti; ic ice dugumler solda cizgi ile. */
function AltCategoryBranch({
  node,
  numberLabel,
  siblingIndex,
  siblingCount,
  onDelete,
  onRenamed,
  onNotify,
  subNameByParent,
  setSubNameByParent,
  onAddSubCategory,
  depth = 0,
}: {
  node: CategoryNode;
  /** Hiyerarşik no: 1.1, 1.2, 2.1.1 … */
  numberLabel: string;
  siblingIndex: number;
  siblingCount: number;
  onDelete: (id: string) => void;
  onRenamed: () => void | Promise<void>;
  onNotify?: (msg: string) => void;
  subNameByParent: Record<string, string>;
  setSubNameByParent: Dispatch<SetStateAction<Record<string, string>>>;
  onAddSubCategory: (parentId: string) => void | Promise<void>;
  depth?: number;
}) {
  return (
    <li className="list-none">
      <div
        role="group"
        className="rounded-xl border border-orange-200/80 bg-white shadow-sm transition hover:border-orange-300/90 hover:shadow"
      >
        <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-2 px-3 py-3 sm:px-4">
          <CategoryReorderButtons
            categoryId={node.id}
            index={siblingIndex}
            total={siblingCount}
            onDone={onRenamed}
            dense
          />
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className="shrink-0 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 px-2 py-1 font-mono text-[11px] font-bold tabular-nums text-white shadow-sm"
              title={`Kategori no: ${numberLabel}`}
            >
              {numberLabel}
            </span>
            <span className={`shrink-0 select-none ${depth === 0 ? "text-orange-400" : "text-slate-400"}`} aria-hidden>
              {depth === 0 ? "↳" : "·"}
            </span>
            <AdminCategoryNameEditor
              categoryId={node.id}
              initialName={node.name}
              variant="sub"
              onRenamed={onRenamed}
            />
          </div>
          <button
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              node.children.length > 0
                ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                : "border-orange-200 bg-white text-orange-900 hover:border-red-300 hover:bg-red-50 hover:text-red-800"
            }`}
            type="button"
            disabled={node.children.length > 0}
            title={node.children.length > 0 ? "Once alt kategorileri silin" : "Sil"}
            onClick={() => void onDelete(node.id)}
          >
            Sil
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-orange-100 bg-orange-50/30 px-3 py-2 sm:px-4">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Gorunum
          </span>
          <SubcategoryImageUpload
            categoryId={node.id}
            imageUrl={node.imageUrl}
            onUpdated={onRenamed}
            onNotify={onNotify}
          />
        </div>
        <div className="flex flex-col gap-1.5 border-t border-orange-100 bg-slate-50/80 px-3 py-2 sm:flex-row sm:items-center">
          <input
            className="min-w-0 flex-1 rounded-lg border border-orange-200 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
            placeholder="Bu altin altina yeni kategori"
            value={subNameByParent[node.id] ?? ""}
            onChange={(e) =>
              setSubNameByParent((prev) => ({ ...prev, [node.id]: e.target.value }))
            }
            aria-label={`${node.name} altina yeni kategori adi`}
          />
          <button
            type="button"
            className="shrink-0 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-amber-600 hover:to-orange-600"
            onClick={() => void onAddSubCategory(node.id)}
          >
            Alt ekle
          </button>
        </div>
      </div>
          {node.children.length > 0 && (
        <ul className="mt-2 space-y-2 border-l-2 border-orange-100 pl-3 sm:pl-4">
          {node.children.map((ch, i) => (
            <AltCategoryBranch
              key={ch.id}
              node={ch}
              numberLabel={`${numberLabel}.${i + 1}`}
              siblingIndex={i}
              siblingCount={node.children.length}
              onDelete={onDelete}
              onRenamed={onRenamed}
              onNotify={onNotify}
              subNameByParent={subNameByParent}
              setSubNameByParent={setSubNameByParent}
              onAddSubCategory={onAddSubCategory}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

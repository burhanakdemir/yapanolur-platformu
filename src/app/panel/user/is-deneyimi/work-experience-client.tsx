"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import FileInputTr from "@/components/FileInputTr";
import ProvinceDistrictSelect from "@/components/ProvinceDistrictSelect";
import { apiErrorMessage, apiErrorMessageWithIssues } from "@/lib/apiErrorMessage";
import { clientApiUrl } from "@/lib/clientApi";
import { uploadMemberImage } from "@/lib/uploadMemberImage";

export type WorkExperienceItem = {
  id: string;
  title: string;
  description: string;
  province: string;
  district: string;
  blockParcel: string | null;
  durationYears: number;
  durationMonths: number;
  durationDays: number;
  durationLabelTr: string;
  durationLabelEn: string;
  professionId: string | null;
  professionName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
};

type Props = {
  lang: "tr" | "en";
  backHref: string;
  labels: {
    title: string;
    subtitle: string;
    back: string;
    add: string;
    save: string;
    cancel: string;
    edit: string;
    delete: string;
    deleteConfirm: string;
    jobTitle: string;
    description: string;
    province: string;
    district: string;
    blockParcel: string;
    blockParcelHint: string;
    durationSection: string;
    durationHint: string;
    durationYear: string;
    durationMonth: string;
    durationDay: string;
    images: string;
    imagesHint: string;
    listTitle: string;
    empty: string;
    loading: string;
    durationSummaryLabel: string;
    locationLabel: string;
    professionLabel: string;
    categoryLabel: string;
    selectProfession: string;
    selectCategory: string;
    professionCategoryHint: string;
    imageSlot1: string;
    imageSlot2: string;
    imageSlot3: string;
    imageChipUploaded: string;
    imageChipMissing: string;
    imageNotUploadedYet: string;
    uploadImagesButton: string;
    removeImageFromSlot: string;
    imagesUploadSuccess: string;
    chooseFilesFirst: string;
    pendingImagesNotUploaded: string;
  };
};

const SLOT_COUNT = 3;

type ImageSlot = { url: string | null; pendingFile: File | null };

function emptyImageSlots(): ImageSlot[] {
  return Array.from({ length: SLOT_COUNT }, () => ({ url: null, pendingFile: null }));
}

function imageSlotsFromUrls(urls: string[]): ImageSlot[] {
  const s = emptyImageSlots();
  for (let i = 0; i < Math.min(urls.length, SLOT_COUNT); i++) {
    const u = urls[i];
    if (u) s[i] = { url: u, pendingFile: null };
  }
  return s;
}

function collectImageUrls(slots: ImageSlot[]): string[] {
  return slots.map((x) => x.url).filter((u): u is string => u != null && u.length > 0);
}

export default function WorkExperienceClient({ lang, backHref, labels }: Props) {
  const [items, setItems] = useState<WorkExperienceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [mode, setMode] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [blockParcel, setBlockParcel] = useState("");
  const [initialProvince, setInitialProvince] = useState<string | null>(null);
  const [initialDistrict, setInitialDistrict] = useState<string | null>(null);
  const [pdKey, setPdKey] = useState(0);

  const [durY, setDurY] = useState(0);
  const [durM, setDurM] = useState(0);
  const [durD, setDurD] = useState(0);

  const [imageSlots, setImageSlots] = useState<ImageSlot[]>(emptyImageSlots);
  const [imagesUploading, setImagesUploading] = useState(false);

  const [professionOptions, setProfessionOptions] = useState<{ id: string; name: string }[]>([]);
  const [categoryFlat, setCategoryFlat] = useState<{ id: string; name: string; depth: number }[]>([]);
  const [professionId, setProfessionId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(clientApiUrl("/api/member-work-experience"), {
        credentials: "include",
      });
      const data = (await res.json()) as { items?: WorkExperienceItem[]; error?: unknown };
      if (!res.ok) {
        setMessage(apiErrorMessage(data.error, lang === "tr" ? "Liste alinamadi." : "Could not load."));
        return;
      }
      setItems(Array.isArray(data.items) ? data.items : []);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    fetch(clientApiUrl("/api/professions"), { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setProfessionOptions(Array.isArray(data) ? data : []))
      .catch(() => setProfessionOptions([]));
    fetch(clientApiUrl("/api/categories"), { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { flat?: { id: string; name: string; depth: number }[] }) =>
        setCategoryFlat(Array.isArray(data.flat) ? data.flat : []),
      )
      .catch(() => setCategoryFlat([]));
  }, []);

  function openCreate() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setBlockParcel("");
    setInitialProvince(null);
    setInitialDistrict(null);
    setPdKey((k) => k + 1);
    setDurY(0);
    setDurM(0);
    setDurD(0);
    setImageSlots(emptyImageSlots());
    setProfessionId("");
    setCategoryId("");
    setMode("form");
    setMessage("");
  }

  function openEdit(item: WorkExperienceItem) {
    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.description);
    setBlockParcel(item.blockParcel ?? "");
    setInitialProvince(item.province);
    setInitialDistrict(item.district);
    setPdKey((k) => k + 1);
    setDurY(item.durationYears ?? 0);
    setDurM(item.durationMonths ?? 0);
    setDurD(item.durationDays ?? 0);
    setImageSlots(imageSlotsFromUrls(item.imageUrls));
    setProfessionId(item.professionId ?? "");
    setCategoryId(item.categoryId ?? "");
    setMode("form");
    setMessage("");
  }

  function closeForm() {
    setMode("list");
    setEditingId(null);
    setMessage("");
  }

  const imageSlotTitles = [labels.imageSlot1, labels.imageSlot2, labels.imageSlot3];

  async function onUploadImages() {
    setMessage("");
    const hasPending = imageSlots.some((s) => s.pendingFile && s.pendingFile.size > 0);
    if (!hasPending) {
      setMessage(labels.chooseFilesFirst);
      return;
    }
    setImagesUploading(true);
    try {
      const next = [...imageSlots];
      for (let i = 0; i < SLOT_COUNT; i++) {
        const pending = next[i]?.pendingFile;
        if (pending && pending.size > 0) {
          const isImage =
            pending.type.startsWith("image/") ||
            /\.(jpe?g|png|webp)$/i.test(pending.name);
          if (!isImage) continue;
          const url = await uploadMemberImage(pending);
          next[i] = { url, pendingFile: null };
        }
      }
      setImageSlots(next);
      setMessage(labels.imagesUploadSuccess);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : lang === "tr" ? "Yükleme hatası." : "Upload error.");
    } finally {
      setImagesUploading(false);
    }
  }

  async function onSubmitForm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    const province = String(fd.get("province") || "").trim();
    const district = String(fd.get("district") || "").trim();
    if (!province || !district) {
      setMessage(lang === "tr" ? "Il ve ilce secin." : "Select province and district.");
      return;
    }
    if (!professionId.trim() || !categoryId.trim()) {
      setMessage(lang === "tr" ? "Meslek ve kategori secin." : "Select profession and category.");
      return;
    }
    if (durY === 0 && durM === 0 && durD === 0) {
      setMessage(lang === "tr" ? "Bitis suresi icin en az yil, ay veya gun girin." : "Enter at least one of years, months, or days.");
      return;
    }
    if (imageSlots.some((s) => s.pendingFile && s.pendingFile.size > 0)) {
      setMessage(labels.pendingImagesNotUploaded);
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        province,
        district,
        blockParcel: blockParcel.trim() || undefined,
        durationYears: durY,
        durationMonths: durM,
        durationDays: durD,
        professionId: professionId.trim(),
        categoryId: categoryId.trim(),
        imageUrls: collectImageUrls(imageSlots),
      };
      const url = editingId
        ? clientApiUrl(`/api/member-work-experience/${editingId}`)
        : clientApiUrl("/api/member-work-experience");
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      let data: { error?: unknown; issues?: unknown; item?: WorkExperienceItem };
      try {
        data = (await res.json()) as typeof data;
      } catch {
        setMessage(lang === "tr" ? "Sunucu yaniti okunamadi." : "Could not read server response.");
        return;
      }
      if (!res.ok) {
        setMessage(
          apiErrorMessageWithIssues(data as Record<string, unknown>, lang === "tr" ? "Kaydedilemedi." : "Could not save."),
        );
        return;
      }
      await load();
      closeForm();
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm(labels.deleteConfirm)) return;
    setMessage("");
    const res = await fetch(clientApiUrl(`/api/member-work-experience/${id}`), {
      method: "DELETE",
      credentials: "include",
    });
    let data: { error?: unknown; issues?: unknown };
    try {
      data = (await res.json()) as typeof data;
    } catch {
      setMessage(lang === "tr" ? "Sunucu yaniti okunamadi." : "Could not read server response.");
      return;
    }
    if (!res.ok) {
      setMessage(
        apiErrorMessageWithIssues(data as Record<string, unknown>, lang === "tr" ? "Silinemedi." : "Could not delete."),
      );
      return;
    }
    await load();
  }

  function durationLine(item: WorkExperienceItem): string {
    return lang === "tr" ? item.durationLabelTr : item.durationLabelEn;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={backHref}
          className="chip inline-flex w-fit items-center gap-1 border-orange-300/80 bg-white/90 font-medium text-orange-900 shadow-sm transition hover:border-orange-400 hover:shadow"
        >
          ← {labels.back}
        </Link>
        {mode === "list" ? (
          <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={openCreate}>
            {labels.add}
          </button>
        ) : null}
      </div>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-orange-950">{labels.title}</h1>
        <p className="text-sm text-slate-600">{labels.subtitle}</p>
      </header>

      {message && mode === "list" ? (
        <p className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-950">{message}</p>
      ) : null}

      {mode === "form" ? (
        <section className="glass-card space-y-4 rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-orange-950">
            {editingId ? labels.edit : labels.add}
          </h2>
          <form className="space-y-4" onSubmit={onSubmitForm}>
            <div>
              <label className="block text-sm font-medium text-slate-700">{labels.jobTitle}</label>
              <input
                className="mt-1 w-full rounded-lg border p-2 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">{labels.description}</label>
              <textarea
                className="mt-1 min-h-[120px] w-full rounded-lg border p-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                maxLength={2000}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">{labels.professionLabel}</label>
              <select
                className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"
                value={professionId}
                onChange={(e) => setProfessionId(e.target.value)}
                required
              >
                <option value="">{labels.selectProfession}</option>
                {professionOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">{labels.categoryLabel}</label>
              <p className="text-xs text-slate-500">{labels.professionCategoryHint}</p>
              <select
                className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                <option value="">{labels.selectCategory}</option>
                {categoryFlat.map((c) => (
                  <option key={c.id} value={c.id}>
                    {"\u00A0".repeat(c.depth * 2)}
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <ProvinceDistrictSelect
              key={pdKey}
              initialProvince={initialProvince}
              initialDistrict={initialDistrict}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700">{labels.blockParcel}</label>
              <input
                className="mt-1 w-full rounded-lg border p-2 text-sm"
                value={blockParcel}
                onChange={(e) => setBlockParcel(e.target.value)}
                maxLength={120}
                placeholder={labels.blockParcelHint}
              />
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-700">{labels.durationSection}</legend>
              <p className="text-xs text-slate-500">{labels.durationHint}</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-slate-500">{labels.durationYear}</label>
                  <input
                    type="number"
                    className="mt-0.5 w-full rounded-lg border bg-white p-2 text-sm"
                    min={0}
                    max={50}
                    step={1}
                    value={durY}
                    onChange={(e) => setDurY(Math.max(0, Math.min(50, Number.parseInt(e.target.value, 10) || 0)))}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">{labels.durationMonth}</label>
                  <input
                    type="number"
                    className="mt-0.5 w-full rounded-lg border bg-white p-2 text-sm"
                    min={0}
                    max={11}
                    step={1}
                    value={durM}
                    onChange={(e) => setDurM(Math.max(0, Math.min(11, Number.parseInt(e.target.value, 10) || 0)))}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">{labels.durationDay}</label>
                  <input
                    type="number"
                    className="mt-0.5 w-full rounded-lg border bg-white p-2 text-sm"
                    min={0}
                    max={9999}
                    step={1}
                    value={durD}
                    onChange={(e) => setDurD(Math.max(0, Math.min(9999, Number.parseInt(e.target.value, 10) || 0)))}
                  />
                </div>
              </div>
            </fieldset>

            <div>
              <p className="text-sm font-medium text-slate-700">{labels.images}</p>
              <p className="text-xs text-slate-500">{labels.imagesHint}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {imageSlots.map((slot, i) => (
                  <div key={i} className="space-y-2 rounded-lg border border-orange-200 bg-white p-2 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-slate-800">{imageSlotTitles[i]}</p>
                      <span className="chip shrink-0 text-[10px] sm:text-xs">
                        {slot.url ? labels.imageChipUploaded : labels.imageChipMissing}
                      </span>
                    </div>
                    {slot.url ? (
                      <Image
                        src={slot.url}
                        alt=""
                        width={220}
                        height={140}
                        className="h-28 w-full rounded-lg border border-orange-100 object-cover"
                        unoptimized
                      />
                    ) : (
                      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-2 py-6 text-center text-xs text-slate-600">
                        {labels.imageNotUploadedYet}
                      </p>
                    )}
                    <FileInputTr
                      name={`workExpImg-${i}`}
                      accept="image/jpeg,image/png,image/webp"
                      chooseButtonText={lang === "en" ? "Choose file" : "Dosya seç"}
                      chosenFileName={slot.pendingFile?.name ?? null}
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setImageSlots((prev) =>
                          prev.map((s, j) => (j === i ? { ...s, pendingFile: f } : s)),
                        );
                      }}
                    />
                    {slot.url || slot.pendingFile ? (
                      <button
                        type="button"
                        className="text-xs font-medium text-red-700 underline decoration-red-300 underline-offset-2 hover:text-red-900"
                        onClick={() =>
                          setImageSlots((prev) =>
                            prev.map((s, j) => (j === i ? { url: null, pendingFile: null } : s)),
                          )
                        }
                      >
                        {labels.removeImageFromSlot}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn-primary mt-3"
                disabled={imagesUploading || submitting}
                onClick={() => void onUploadImages()}
              >
                {imagesUploading ? labels.loading : labels.uploadImagesButton}
              </button>
            </div>

            {message && mode === "form" ? (
              <p className="text-sm text-red-600">{message}</p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn-primary px-4 py-2 text-sm" disabled={submitting}>
                {submitting ? "…" : labels.save}
              </button>
              <button type="button" className="rounded-lg border border-slate-300 px-4 py-2 text-sm" onClick={closeForm}>
                {labels.cancel}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {mode === "list" ? (
        <section className="glass-card space-y-2 rounded-2xl p-4 sm:p-5">
          <h2 className="text-base font-semibold text-orange-950 sm:text-lg">{labels.listTitle}</h2>
          {loading ? (
            <p className="text-sm text-slate-600">{labels.loading}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-600">{labels.empty}</p>
          ) : (
            <ul className="space-y-1.5">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-orange-200/80 bg-white/90 p-2 shadow-sm sm:p-2.5"
                >
                  <div className="flex gap-2 sm:gap-2.5">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-sm font-semibold leading-tight text-orange-950">
                          {item.title}
                        </p>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            className="rounded border border-orange-300 bg-white px-2 py-0.5 text-[11px] font-medium leading-none text-orange-900"
                            onClick={() => openEdit(item)}
                          >
                            {labels.edit}
                          </button>
                          <button
                            type="button"
                            className="rounded border border-red-200 bg-white px-2 py-0.5 text-[11px] font-medium leading-none text-red-800"
                            onClick={() => void onDelete(item.id)}
                          >
                            {labels.delete}
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] leading-snug text-slate-600">
                        <span className="text-slate-500">{labels.durationSummaryLabel}:</span> {durationLine(item)}
                        {item.professionName ? (
                          <>
                            {" · "}
                            <span className="text-slate-500">{labels.professionLabel}:</span> {item.professionName}
                          </>
                        ) : null}
                        {item.categoryName ? (
                          <>
                            {" · "}
                            <span className="text-slate-500">{labels.categoryLabel}:</span> {item.categoryName}
                          </>
                        ) : null}
                        {" · "}
                        <span className="text-slate-500">{labels.locationLabel}:</span> {item.province} /{" "}
                        {item.district}
                        {item.blockParcel ? ` · ${item.blockParcel}` : ""}
                      </p>
                      {item.description ? (
                        <p className="line-clamp-2 text-xs leading-snug text-slate-800">{item.description}</p>
                      ) : null}
                    </div>
                    {item.imageUrls.length > 0 ? (
                      <div className="flex shrink-0 flex-col gap-0.5 self-start">
                        {item.imageUrls.map((url) => (
                          <div
                            key={url}
                            className="h-9 w-9 shrink-0 overflow-hidden rounded border border-orange-100 sm:h-10 sm:w-10"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="" className="h-full w-full object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

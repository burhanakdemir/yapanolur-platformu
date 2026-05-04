"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import HomeBackButtonLink from "@/components/HomeBackButtonLink";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import FileInputTr from "@/components/FileInputTr";
import {
  flattenAllChildren,
  resolveMainSubCategoryIds,
  type CategoryTreeNode,
} from "@/lib/adCategoryTree";
import { uploadListingImageFile } from "@/lib/adListingImageUpload";
import { clientApiUrl } from "@/lib/clientApi";
import { dictionary, getLang } from "@/lib/i18n";
import { TR_PROVINCES_FALLBACK } from "@/lib/trProvincesFallback";
import { normalizeAdTextForStorage, stripHashAndAfter } from "@/lib/adTitleDisplay";
import type { Ad } from "@/app/ads/[id]/adDetailTypes";

type LocationOption = { id: number; name: string };
type ProfessionOption = { id: string; name: string };

function formatStartingPriceTryDisplay(digits: string): string {
  if (!digits) return "";
  const n = Number.parseInt(digits, 10);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("tr-TR");
}

function capitalizeWordsTr(text: string): string {
  const s = stripHashAndAfter(text);
  return s.replace(/\S+/g, (word) => {
    const w = word.toLocaleLowerCase("tr-TR");
    return w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1);
  });
}

function capitalizeSentencesTr(text: string): string {
  const s = stripHashAndAfter(text);
  if (!s) return s;
  return s
    .split("\n")
    .map((line) => {
      const lower = line.toLocaleLowerCase("tr-TR");
      if (!lower.trim()) return line;
      let out = lower.charAt(0).toLocaleUpperCase("tr-TR") + lower.slice(1);
      out = out.replace(/([.!?]\s+)(\p{L})/gu, (_a, punctSpace, letter) => punctSpace + letter.toLocaleUpperCase("tr-TR"));
      return out;
    })
    .join("\n");
}

export default function EditAdClient() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const idRaw = params?.id;
  const id = Array.isArray(idRaw) ? idRaw[0] : idRaw;
  const lang = getLang(searchParams.get("lang") ?? undefined);
  const d = dictionary[lang];

  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ad, setAd] = useState<Ad | null>(null);
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([]);
  const [mainCategoryId, setMainCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [professionId, setProfessionId] = useState("");
  const [professions, setProfessions] = useState<ProfessionOption[]>([]);
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<LocationOption[]>([]);
  const [provinceId, setProvinceId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [provinceName, setProvinceName] = useState("");
  const [districtName, setDistrictName] = useState("");
  const [neighborhoodName, setNeighborhoodName] = useState("");
  const [blockNo, setBlockNo] = useState("");
  const [parcelNo, setParcelNo] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startingPriceLabel, setStartingPriceLabel] = useState("");
  const [keptPhotoUrls, setKeptPhotoUrls] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [locationSynced, setLocationSynced] = useState(false);
  const [categorySynced, setCategorySynced] = useState(false);

  const topCategories = categoryTree;
  const childCategories = useMemo(() => {
    const parent = topCategories.find((c) => c.id === mainCategoryId);
    return parent ? flattenAllChildren(parent.children) : [];
  }, [topCategories, mainCategoryId]);

  const categoryPickedForProfession = Boolean(
    subCategoryId || (mainCategoryId && childCategories.length === 0),
  );

  const homeHref = `/?lang=${lang}`;
  const detailHref = lang === "en" ? `/ads/${id}?lang=en` : `/ads/${id}`;

  useEffect(() => {
    fetch(clientApiUrl("/api/categories"), { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setCategoryTree(Array.isArray(data.tree) ? data.tree : []))
      .catch(() => setCategoryTree([]));
    fetch(clientApiUrl("/api/professions"), { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setProfessions(Array.isArray(data) ? data : []))
      .catch(() => setProfessions([]));
    fetch(clientApiUrl("/api/locations?level=provinces"), { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data) =>
        setProvinces(Array.isArray(data) && data.length > 0 ? data : TR_PROVINCES_FALLBACK),
      )
      .catch(() => setProvinces(TR_PROVINCES_FALLBACK));
  }, []);

  useEffect(() => {
    if (!id || typeof id !== "string") return;
    queueMicrotask(() => setLoadError(null));
    void (async () => {
      const [adRes, meRes] = await Promise.all([
        fetch(clientApiUrl(`/api/ads/${id}/detail`), { credentials: "include", cache: "no-store" }),
        fetch(clientApiUrl("/api/auth/me"), { credentials: "include", cache: "no-store" }),
      ]);
      const me = await meRes.json().catch(() => ({ authenticated: false }));
      if (!adRes.ok) {
        queueMicrotask(() =>
          setLoadError(lang === "en" ? "Listing could not be loaded." : "Ilan yuklenemedi."),
        );
        return;
      }
      const adData = (await adRes.json()) as Ad & { error?: string };
      if (!meRes.ok || !me.authenticated || !me.user) {
        router.replace(`/members?next=${encodeURIComponent(`/ads/${id}/edit`)}`);
        return;
      }
      const uid = typeof me.user.userId === "string" ? me.user.userId : "";
      if (uid !== adData.ownerId) {
        router.replace(detailHref);
        return;
      }
      if ((adData.status ?? "") !== "PENDING" && (adData.status ?? "") !== "APPROVED") {
        queueMicrotask(() =>
          setLoadError(lang === "en" ? "This listing cannot be edited." : "Bu ilan duzenlenemez."),
        );
        return;
      }
      queueMicrotask(() => {
        setAd(adData);
        setTitle(adData.title ?? "");
        setDescription(adData.description ?? "");
        setStartingPriceLabel(
          formatStartingPriceTryDisplay(String(adData.startingPriceTry ?? 0).replace(/\D/g, "")),
        );
        setBlockNo(String(adData.blockNo ?? ""));
        setParcelNo(String(adData.parcelNo ?? ""));
        setKeptPhotoUrls((adData.photos ?? []).sort((a, b) => a.sortOrder - b.sortOrder).map((p) => p.url));
        setLocationSynced(false);
        setCategorySynced(false);
      });
    })();
  }, [id, router, detailHref, lang]);

  useEffect(() => {
    if (!ad || categoryTree.length === 0 || categorySynced) return;
    const { mainCategoryId: main, subCategoryId: sub } = resolveMainSubCategoryIds(
      categoryTree,
      ad.categoryId ?? ad.category?.id,
    );
    queueMicrotask(() => {
      setMainCategoryId(main);
      setSubCategoryId(sub);
      setProfessionId(ad.professionId ?? "");
      setCategorySynced(true);
    });
  }, [ad, categoryTree, categorySynced]);

  useEffect(() => {
    if (!ad || provinces.length === 0 || locationSynced) return;
    const pn = (ad.province || ad.city || "").trim();
    const hit = provinces.find((p) => p.name === pn);
    queueMicrotask(() => {
      if (hit) {
        setProvinceId(String(hit.id));
        setProvinceName(hit.name);
      }
      setLocationSynced(true);
    });
  }, [ad, provinces, locationSynced]);

  useEffect(() => {
    if (!provinceId) return;
    fetch(clientApiUrl(`/api/locations?level=districts&provinceId=${provinceId}`), {
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data) => setDistricts(Array.isArray(data) ? data : []))
      .catch(() => setDistricts([]));
  }, [provinceId]);

  useEffect(() => {
    if (!ad || !locationSynced || districts.length === 0 || districtId) return;
    const dn = (ad.district || "").trim();
    const hit = districts.find((d) => d.name === dn);
    if (hit) {
      queueMicrotask(() => {
        setDistrictId(String(hit.id));
        setDistrictName(hit.name);
      });
    }
  }, [ad, districts, districtId, locationSynced]);

  useEffect(() => {
    if (!districtId) return;
    fetch(clientApiUrl(`/api/locations?level=neighborhoods&districtId=${districtId}`), {
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data) => setNeighborhoods(Array.isArray(data) ? data : []))
      .catch(() => setNeighborhoods([]));
  }, [districtId]);

  useEffect(() => {
    if (!ad || !districtId) return;
    queueMicrotask(() => {
      setNeighborhoodName((prev) => prev || (ad.neighborhood ?? ""));
    });
  }, [ad, districtId]);

  function removePhotoAt(index: number) {
    setKeptPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id || typeof id !== "string") return;
    setMessage("");
    setIsSaving(true);
    const finalCategoryId = subCategoryId || mainCategoryId;
    if (!finalCategoryId) {
      setMessage(lang === "en" ? "Pick categories." : "Kategori secin.");
      setIsSaving(false);
      return;
    }
    if (!professionId) {
      setMessage(lang === "en" ? "Pick a profession." : "Meslek secin.");
      setIsSaving(false);
      return;
    }

    let newUrls: string[] = [];
    try {
      const cap = Math.max(0, 5 - keptPhotoUrls.length);
      const files = newImageFiles.slice(0, cap);
      newUrls = await Promise.all(files.map((f) => uploadListingImageFile(f)));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Yukleme hatasi.");
      setIsSaving(false);
      return;
    }

    const photos = [...keptPhotoUrls, ...newUrls].slice(0, 5);

    const payload = {
      title: normalizeAdTextForStorage(title),
      description: normalizeAdTextForStorage(description),
      city: provinceName,
      province: provinceName,
      district: districtName,
      neighborhood: neighborhoodName,
      blockNo,
      parcelNo,
      categoryId: finalCategoryId,
      professionId,
      photos,
    };

    const res = await fetch(clientApiUrl(`/api/ads/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setIsSaving(false);
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : "Kaydedilemedi.");
      return;
    }
    setNewImageFiles([]);
    router.push(detailHref);
    router.refresh();
  }

  if (!id || typeof id !== "string") {
    return (
      <main className="mx-auto max-w-3xl p-6 text-slate-600">
        {lang === "en" ? "Invalid link." : "Gecersiz baglanti."}
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <HomeBackButtonLink href={homeHref}>← {d.nav.home}</HomeBackButtonLink>
        <p className="text-red-700">{loadError}</p>
        <Link href={detailHref} className="text-sm font-medium text-orange-800 underline">
          {lang === "en" ? "Back to listing" : "Ilan sayfasina don"}
        </Link>
      </main>
    );
  }

  if (!ad) {
    return (
      <main className="mx-auto max-w-3xl p-6 text-slate-600">
        {lang === "en" ? "Loading…" : "Yukleniyor…"}
      </main>
    );
  }

  const photoSlotsUsed = keptPhotoUrls.length + newImageFiles.length;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 rounded-2xl bg-orange-400 p-6">
      <HomeBackButtonLink href={detailHref}>
        ← {lang === "en" ? "Listing" : "Ilan"}
      </HomeBackButtonLink>
      <h1 className="text-3xl font-bold tracking-tight text-white">
        {lang === "en" ? "Edit listing" : "Ilani yeniden duzenle"}
      </h1>
      <p className="text-sm text-orange-50">
        #{ad.listingNumber} · {lang === "en" ? "Status:" : "Durum:"} {ad.status}
      </p>

      <form className="space-y-3 rounded-2xl border border-orange-300 bg-orange-100/95 p-5" onSubmit={onSubmit}>
        <section className="space-y-2 rounded-xl border border-orange-200 bg-orange-50 p-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-orange-900">
            <span className="chip !bg-orange-100 !text-orange-700">1</span>
            <span>{lang === "en" ? "Location" : "Konum"}</span>
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <select
              className="rounded-lg border bg-white p-2"
              value={provinceId}
              onChange={(e) => {
                const nextId = e.target.value;
                setProvinceId(nextId);
                const selected = provinces.find((p) => String(p.id) === nextId);
                setProvinceName(selected?.name || "");
                setDistricts([]);
                setNeighborhoods([]);
                setDistrictId("");
                setDistrictName("");
                setNeighborhoodName("");
              }}
              required
            >
              <option value="">{lang === "en" ? "Province" : "Il"}</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border bg-white p-2 disabled:bg-slate-100"
              value={districtId}
              onChange={(e) => {
                const nextId = e.target.value;
                setDistrictId(nextId);
                const selected = districts.find((x) => String(x.id) === nextId);
                setDistrictName(selected?.name || "");
                setNeighborhoods([]);
                setNeighborhoodName("");
              }}
              disabled={!provinceId}
              required
            >
              <option value="">{lang === "en" ? "District" : "Ilce"}</option>
              {districts.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border bg-white p-2 disabled:bg-slate-100"
              value={neighborhoodName}
              onChange={(e) => setNeighborhoodName(e.target.value)}
              disabled={!districtId}
              required
            >
              <option value="">{lang === "en" ? "Neighborhood" : "Mahalle"}</option>
              {neighborhoods.map((n) => (
                <option key={n.id} value={n.name}>
                  {n.name}
                </option>
              ))}
            </select>
            <input
              value={blockNo}
              onChange={(e) => setBlockNo(e.target.value)}
              className="rounded-lg border bg-white p-2"
              placeholder={lang === "en" ? "Block" : "Ada"}
              required
            />
            <input
              value={parcelNo}
              onChange={(e) => setParcelNo(e.target.value)}
              className="rounded-lg border bg-white p-2"
              placeholder={lang === "en" ? "Parcel" : "Parsel"}
              required
            />
          </div>
        </section>

        <section className="space-y-2 rounded-xl border border-orange-200 bg-orange-50 p-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-orange-900">
            <span className="chip !bg-indigo-100 !text-indigo-700">2</span>
            <span>{lang === "en" ? "Category" : "Kategori"}</span>
          </h2>
          <select
            className="w-full rounded-lg border bg-white p-2"
            value={mainCategoryId}
            onChange={(e) => {
              setMainCategoryId(e.target.value);
              setSubCategoryId("");
              setProfessionId("");
            }}
            required
          >
            <option value="">{lang === "en" ? "Main category" : "Ana kategori"}</option>
            {topCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded-lg border bg-white p-2 disabled:bg-slate-100"
            value={subCategoryId}
            onChange={(e) => {
              setSubCategoryId(e.target.value);
              setProfessionId("");
            }}
            disabled={!mainCategoryId || childCategories.length === 0}
            required={childCategories.length > 0}
          >
            <option value="">{lang === "en" ? "Subcategory" : "Alt kategori"}</option>
            {childCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <label className="block text-xs font-medium text-orange-900/90">
            {lang === "en" ? "Profession" : "Meslek"}
            <select
              className="mt-1 w-full rounded-lg border border-orange-200 bg-white p-2 disabled:bg-slate-100"
              value={professionId}
              onChange={(e) => setProfessionId(e.target.value)}
              disabled={!categoryPickedForProfession}
              required
            >
              <option value="">
                {categoryPickedForProfession
                  ? lang === "en"
                    ? "Select profession"
                    : "Meslek secin"
                  : lang === "en"
                    ? "Choose category first"
                    : "Once kategori"}
              </option>
              {professions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="space-y-2 rounded-xl border border-orange-200 bg-orange-50 p-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-orange-900">
            <span className="chip !bg-sky-100 !text-sky-700">3</span>
            <span>{lang === "en" ? "Project text" : "Proje metni"}</span>
          </h2>
          <input
            value={title}
            onChange={(e) => setTitle(capitalizeWordsTr(e.target.value))}
            className="w-full rounded-lg border bg-white p-2"
            required
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(capitalizeSentencesTr(e.target.value))}
            className="w-full rounded-lg border bg-white p-2"
            required
            rows={5}
          />
          <div>
            <p className="text-[11px] font-medium text-orange-900">
              {lang === "en" ? "Starting price (read-only)" : "Baslangic fiyati (degistirilemez)"}
            </p>
            <input
              type="text"
              readOnly
              value={startingPriceLabel}
              className="mt-1 w-full cursor-not-allowed rounded-lg border bg-slate-100 p-2 tabular-nums text-slate-700"
            />
          </div>
        </section>

        <section className="space-y-2 rounded-xl border border-orange-200 bg-orange-50 p-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-orange-900">
            <span className="chip !bg-emerald-100 !text-emerald-700">4</span>
            <span>{lang === "en" ? "Photos" : "Gorseller"}</span>
          </h2>
          <p className="text-xs leading-snug text-orange-800">
            {lang === "en"
              ? "Remove or add images (max 5). If you remove all and add none, the subcategory image is shown."
              : "Gorsel ekleyin veya kaldirin (en fazla 5). Hepsini kaldirsaniz alt kategori goruntusu kullanilir."}
          </p>
          {keptPhotoUrls.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {keptPhotoUrls.map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  className="relative aspect-[4/3] overflow-hidden rounded-lg border border-orange-200 bg-white"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded bg-white/90 px-2 py-0.5 text-xs font-bold text-red-700 shadow"
                    onClick={() => removePhotoAt(idx)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {photoSlotsUsed < 5 ? (
            <FileInputTr
              name="moreImages"
              multiple
              chooseButtonText={lang === "en" ? "Choose files" : "Dosya sec"}
              chosenFileName={
                newImageFiles.length === 0
                  ? null
                  : newImageFiles.length === 1
                    ? newImageFiles[0].name
                    : `${newImageFiles.length} dosya`
              }
              onChange={(e) => setNewImageFiles(Array.from(e.target.files || []))}
            />
          ) : null}
        </section>

        <button className="btn-primary" type="submit" disabled={isSaving}>
          {isSaving ? "…" : lang === "en" ? "Save changes" : "Kaydet"}
        </button>
        {message ? <p className="text-sm text-red-800">{message}</p> : null}
      </form>
    </main>
  );
}

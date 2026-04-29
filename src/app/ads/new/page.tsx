"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import HomeBackButtonLink from "@/components/HomeBackButtonLink";
import { useRouter, useSearchParams } from "next/navigation";
import { clientApiUrl } from "@/lib/clientApi";
import { dictionary, getLang } from "@/lib/i18n";
import { TR_PROVINCES_FALLBACK } from "@/lib/trProvincesFallback";
import FileInputTr from "@/components/FileInputTr";
import { SHOWCASE_DAY_OPTIONS } from "@/lib/showcaseDurations";
import { normalizeAdTextForStorage, stripHashAndAfter } from "@/lib/adTitleDisplay";

const MIN_STARTING_PRICE_TRY = 100;
const MAX_STARTING_PRICE_TRY = 99_999_999;

function formatStartingPriceTryDisplay(digits: string): string {
  if (!digits) return "";
  const n = Number.parseInt(digits, 10);
  if (!Number.isFinite(n)) return "";
  const clamped = Math.min(Math.max(n, 0), MAX_STARTING_PRICE_TRY);
  return clamped.toLocaleString("tr-TR");
}

/** Başlık: her kelimenin ilk harfi (tr-TR). */
function capitalizeWordsTr(text: string): string {
  const s = stripHashAndAfter(text);
  return s.replace(/\S+/g, (word) => {
    const w = word.toLocaleLowerCase("tr-TR");
    return w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1);
  });
}

/** Açıklama: satır ve cümle başları (. ! ? sonrası) büyük harf (tr-TR). */
function capitalizeSentencesTr(text: string): string {
  const s = stripHashAndAfter(text);
  if (!s) return s;
  return s
    .split("\n")
    .map((line) => {
      const lower = line.toLocaleLowerCase("tr-TR");
      if (!lower.trim()) return line;
      let out = lower.charAt(0).toLocaleUpperCase("tr-TR") + lower.slice(1);
      out = out.replace(/([.!?]\s+)(\p{L})/gu, (a, punctSpace, letter) => punctSpace + letter.toLocaleUpperCase("tr-TR"));
      return out;
    })
    .join("\n");
}

type CategoryTreeNode = { id: string; name: string; children: CategoryTreeNode[] };
type LocationOption = { id: number; name: string };
type ProfessionOption = { id: string; name: string };

function NewAdPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = getLang(searchParams.get("lang") ?? undefined);
  const [message, setMessage] = useState("");
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
  const [projectImageFiles, setProjectImageFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [autoImageEnabled, setAutoImageEnabled] = useState(true);
  const [showcaseEnabled, setShowcaseEnabled] = useState(false);
  const [showcaseDays, setShowcaseDays] = useState(7);
  const [showcasePricing, setShowcasePricing] = useState<Record<string, number>>({});
  const [showcaseBaseFee, setShowcaseBaseFee] = useState(250);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startingPriceTryDisplay, setStartingPriceTryDisplay] = useState("");

  const d = dictionary[lang];
  const topCategories = categoryTree;
  const childCategories = useMemo(() => {
    const parent = topCategories.find((c) => c.id === mainCategoryId);
    return parent ? flattenAllChildren(parent.children) : [];
  }, [topCategories, mainCategoryId]);

  const categoryPickedForProfession = Boolean(
    subCategoryId || (mainCategoryId && childCategories.length === 0),
  );

  const showcaseFee = Number(showcasePricing[String(showcaseDays)] ?? showcaseBaseFee * showcaseDays);

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
        setProvinces(
          Array.isArray(data) && data.length > 0 ? data : TR_PROVINCES_FALLBACK,
        ),
      )
      .catch(() => setProvinces(TR_PROVINCES_FALLBACK));
    fetch(clientApiUrl("/api/admin/settings"), { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setShowcaseBaseFee(Number(data.showcaseFeeAmountTry || 250));
        try {
          setShowcasePricing(JSON.parse(String(data.showcaseDailyPricingJson || "{}")));
        } catch {
          setShowcasePricing({});
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!provinceId) {
      return;
    }
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
    if (!districtId) {
      return;
    }
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

  async function uploadImage(file: File) {
    const base64 = await fileToBase64(file);
    const safeName = `${Date.now()}-${file.name}`.replace(/[^a-zA-Z0-9._-]/g, "_");
    const res = await fetch(clientApiUrl("/api/uploads"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: safeName,
        dataBase64: base64,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gorsel yukleme hatasi.");
    return String(data.url || "");
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    setMessage("");
    setIsUploading(true);
    const form = new FormData(formEl);
    const finalCategoryId = subCategoryId || mainCategoryId;
    if (!finalCategoryId) {
      setMessage("Ana kategori ve alt kategori secin.");
      setIsUploading(false);
      return;
    }
    if (!professionId) {
      setMessage("Meslek secin.");
      setIsUploading(false);
      return;
    }

    let photoUrls: string[] = [];
    try {
      if (projectImageFiles.length > 0) {
        photoUrls = await Promise.all(projectImageFiles.slice(0, 5).map((f) => uploadImage(f)));
      } else if (autoImageEnabled) {
        photoUrls = [getAutoProjectImage(title, getSelectedCategoryName(categoryTree, finalCategoryId))];
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gorseller yuklenemedi.");
      setIsUploading(false);
      return;
    }
    if (photoUrls.length === 0) {
      setMessage("En az bir proje gorseli secin ya da otomatik gorseli acik tutun.");
      setIsUploading(false);
      return;
    }

    const priceDigits = startingPriceTryDisplay.replace(/\D/g, "");
    const startingPriceTry = priceDigits === "" ? NaN : Number.parseInt(priceDigits, 10);
    if (
      !Number.isFinite(startingPriceTry) ||
      startingPriceTry < MIN_STARTING_PRICE_TRY ||
      startingPriceTry > MAX_STARTING_PRICE_TRY
    ) {
      setMessage(
        `Baslangic fiyati ${MIN_STARTING_PRICE_TRY.toLocaleString("tr-TR")} TL ile ${MAX_STARTING_PRICE_TRY.toLocaleString("tr-TR")} TL arasinda olmalidir.`,
      );
      setIsUploading(false);
      return;
    }

    const payload = {
      categoryId: finalCategoryId,
      professionId,
      title: normalizeAdTextForStorage(title),
      description: normalizeAdTextForStorage(description),
      startingPriceTry,
      auctionDurationDays: Number(form.get("auctionDurationDays") || 7),
      city: provinceName,
      province: provinceName,
      district: districtName,
      neighborhood: neighborhoodName,
      blockNo: String(form.get("blockNo") || ""),
      parcelNo: String(form.get("parcelNo") || ""),
      photos: photoUrls,
    };

    const res = await fetch(clientApiUrl("/api/ads"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Hata.");
      setIsUploading(false);
      return;
    }
    if (showcaseEnabled) {
      setIsUploading(false);
      router.push(
        `/panel/user/topup?lang=${lang}&reason=showcase&adId=${data.adId}&days=${showcaseDays}&amount=${showcaseFee}`,
      );
      return;
    }
    setMessage("Ilan olusturuldu ve yonetici onayina gonderildi.");
    setProjectImageFiles([]);
    setTitle("");
    setDescription("");
    setStartingPriceTryDisplay("");
    setIsUploading(false);
    formEl.reset();
  }

  return (
    <main className="mx-auto w-full max-w-3xl p-6 space-y-4 rounded-2xl bg-orange-400">
      <HomeBackButtonLink href={`/?lang=${lang}`}>
        ← {d.nav.home}
      </HomeBackButtonLink>
      <h1 className="text-3xl font-bold tracking-tight text-white">{d.nav.newAd}</h1>
      <form className="space-y-3 rounded-2xl border border-orange-300 bg-orange-100/95 p-5" onSubmit={onSubmit}>
        <section className="rounded-xl border border-orange-200 bg-orange-50 p-3 space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-orange-900">
            <span className="chip !bg-orange-100 !text-orange-700">1/5</span>
            <span>📍 Konum Bilgileri</span>
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <select
              className="border rounded-lg p-2 bg-white"
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
              <option value="">Il secin</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              className="border rounded-lg p-2 bg-white disabled:bg-slate-100"
              value={districtId}
              onChange={(e) => {
                const nextId = e.target.value;
                setDistrictId(nextId);
                const selected = districts.find((d) => String(d.id) === nextId);
                setDistrictName(selected?.name || "");
                setNeighborhoods([]);
                setNeighborhoodName("");
              }}
              disabled={!provinceId}
              required
            >
              <option value="">Ilce secin</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              className="border rounded-lg p-2 bg-white disabled:bg-slate-100"
              value={neighborhoodName}
              onChange={(e) => setNeighborhoodName(e.target.value)}
              disabled={!districtId}
              required
            >
              <option value="">Mahalle secin</option>
              {neighborhoods.map((n) => (
                <option key={n.id} value={n.name}>
                  {n.name}
                </option>
              ))}
            </select>
            <input name="blockNo" className="border rounded-lg p-2 bg-white" placeholder="Ada" required />
            <input name="parcelNo" className="border rounded-lg p-2 bg-white" placeholder="Parsel" required />
          </div>
        </section>
        <div>
        </div>
        <section className="rounded-xl border border-orange-200 bg-orange-50 p-3 space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-orange-900">
            <span className="chip !bg-indigo-100 !text-indigo-700">2/5</span>
            <span>🗂️ Kategori Bilgileri</span>
          </h2>
          <select
            className="w-full border rounded-lg p-2 bg-white"
            value={mainCategoryId}
            onChange={(e) => {
              setMainCategoryId(e.target.value);
              setSubCategoryId("");
              setProfessionId("");
            }}
            required
          >
            <option value="">Ana kategori secin</option>
            {topCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="w-full border rounded-lg p-2 bg-white disabled:bg-slate-100"
            value={subCategoryId}
            onChange={(e) => {
              setSubCategoryId(e.target.value);
              setProfessionId("");
            }}
            disabled={!mainCategoryId}
            required
          >
            <option value="">Alt kategori secin</option>
            {childCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <label className="block text-xs font-medium text-orange-900/90">
            Meslek secin
            <select
              className="mt-1 w-full rounded-lg border border-orange-200 bg-white p-2 disabled:bg-slate-100"
              value={professionId}
              onChange={(e) => setProfessionId(e.target.value)}
              disabled={!categoryPickedForProfession}
              required
            >
              <option value="">
                {categoryPickedForProfession ? "Meslek secin" : "Once kategoriyi tamamlayin"}
              </option>
              {professions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </section>
        <section className="rounded-xl border border-orange-200 bg-orange-50 p-3 space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-orange-900">
            <span className="chip !bg-sky-100 !text-sky-700">3/5</span>
            <span>📝 Proje Bilgileri</span>
          </h2>
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(capitalizeWordsTr(e.target.value))}
            className="w-full border rounded-lg p-2 bg-white"
            placeholder="Baslik"
            required
          />
          <textarea
            name="description"
            value={description}
            onChange={(e) => setDescription(capitalizeSentencesTr(e.target.value))}
            className="w-full border rounded-lg p-2 bg-white"
            placeholder="Isin tanimi"
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={startingPriceTryDisplay}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
                  if (digits === "") {
                    setStartingPriceTryDisplay("");
                    return;
                  }
                  setStartingPriceTryDisplay(formatStartingPriceTryDisplay(digits));
                }}
                className="w-full rounded-lg border bg-white p-2 tabular-nums placeholder:text-slate-400/80"
                placeholder="Fiyat Girin"
                aria-label="Baslangic fiyati TL"
                required
              />
              <p className="text-[10px] leading-snug text-orange-800/90">
                100 – 99.999.999 TL (binlik ayirac: 1.000)
              </p>
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <input
                name="auctionDurationDays"
                type="number"
                min={1}
                max={30}
                className="w-full rounded-lg border bg-white p-2 tabular-nums placeholder:text-slate-400/80"
                placeholder="Süre"
                required
              />
              <p className="text-[10px] leading-snug text-transparent select-none" aria-hidden>
                100 – 99.999.999 TL (binlik ayirac: 1.000)
              </p>
            </div>
          </div>
        </section>
        <section className="rounded-xl border border-orange-200 bg-orange-50 p-3 space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-orange-900">
            <span className="chip !bg-emerald-100 !text-emerald-700">4/5</span>
            <span>🖼️ Gorsel Bilgileri</span>
          </h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoImageEnabled}
              onChange={(e) => setAutoImageEnabled(e.target.checked)}
            />
            Proje adina gore otomatik gorsel kullan
          </label>
          <FileInputTr
            name="projectImages"
            multiple
            chooseButtonText="Dosya seç"
            chosenFileName={
              projectImageFiles.length === 0
                ? null
                : projectImageFiles.length === 1
                  ? projectImageFiles[0].name
                  : `${projectImageFiles.length} dosya: ${projectImageFiles.map((f) => f.name).join(", ")}`
            }
            onChange={(e) => setProjectImageFiles(Array.from(e.target.files || []))}
          />
          <p className="text-xs text-orange-700">En fazla 5 adet resim yuklenir.</p>
        </section>
        <section className="rounded-xl border border-orange-200 bg-orange-50 p-3 space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-orange-900">
            <span className="chip !bg-amber-100 !text-amber-700">5/5</span>
            <span>⭐ Vitrin Ayarlari</span>
          </h2>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={showcaseEnabled} onChange={(e) => setShowcaseEnabled(e.target.checked)} />
            Ilani vitrine al
          </label>
          {showcaseEnabled && (
            <div className="grid grid-cols-2 gap-2">
              <select
                className="border rounded-lg p-2 bg-white"
                value={showcaseDays}
                onChange={(e) => setShowcaseDays(Number(e.target.value))}
              >
                {SHOWCASE_DAY_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <div className="rounded-lg border p-2 text-sm">Vitrin ucreti: {showcaseFee} TL</div>
            </div>
          )}
          <p className="text-xs text-orange-700">Kayit sonrasi odeme ekranina yonlendirilirsiniz.</p>
        </section>
        <button className="btn-primary" type="submit" disabled={isUploading}>
          {d.common.submit}
        </button>
        {message && <p className="text-sm">{message}</p>}
      </form>
    </main>
  );
}

function flattenAllChildren(
  nodes: CategoryTreeNode[],
  depth = 0,
): Array<{ id: string; label: string }> {
  return nodes.flatMap((node) => [
    { id: node.id, label: `${" - ".repeat(depth)}${node.name}` },
    ...flattenAllChildren(node.children, depth + 1),
  ]);
}

function findCategoryName(nodes: CategoryTreeNode[], id: string): string {
  for (const node of nodes) {
    if (node.id === id) return node.name;
    const child = findCategoryName(node.children, id);
    if (child) return child;
  }
  return "";
}

function getSelectedCategoryName(nodes: CategoryTreeNode[], id: string): string {
  return findCategoryName(nodes, id);
}

function getAutoProjectImage(title: string, categoryName: string) {
  const key = `${title} ${categoryName}`.toLowerCase();
  if (key.includes("muhendis")) return "https://images.unsplash.com/photo-1465804575741-338df8554e02?auto=format&fit=crop&w=1200&q=80";
  if (key.includes("sehir") || key.includes("plan")) return "https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?auto=format&fit=crop&w=1200&q=80";
  if (key.includes("renov") || key.includes("tadilat")) return "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80";
  if (key.includes("insaat") || key.includes("yapi")) return "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=80";
  return "https://images.unsplash.com/photo-1465804575741-338df8554e02?auto=format&fit=crop&w=1200&q=80";
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Dosya okunamadi."));
    reader.readAsDataURL(file);
  });
}

export default function NewAdPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-3xl p-6 text-slate-600">Yükleniyor…</main>
      }
    >
      <NewAdPageInner />
    </Suspense>
  );
}

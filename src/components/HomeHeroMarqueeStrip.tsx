"use client";

import Link from "next/link";
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type RefObject,
} from "react";
import type { Lang } from "@/lib/i18n";
import type { HomeHeroTickerDisplayKind } from "@/lib/homeHeroTickerMode";
import type { HomeHeroSlideClientPayload } from "@/lib/homeHeroSlidesQuery";

function subscribeReducedMotion(onStoreChange: () => void): () => void {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

const EMPTY_SLIDE: HomeHeroSlideClientPayload = {
  id: "__empty",
  title: "",
  subtitle: null,
  imageUrl: null,
  ctaUrl: null,
  ctaLabel: null,
  isSponsor: false,
};

/** Başlık ile aynı satırda; önceki 0.5em’e göre alt başlık %50 büyük → 0.75em */
const SUBTITLE_SCALE_EM = 0.75;

/** Sponsorlar arası boşluk (çok geniş olmasın diye ~8 karakter) */
const SPONSOR_BETWEEN_GAP_CH = 8;

/** Animasyon süresi kısaldıkça kayma hızı artar; %25 daha hızlı ≈ süre / 1.25 */
const MARQUEE_SPEED_INCREASE = 1.25;

/** Koyu lacivert dolgu; parlama `globals.css` (sarmalayıcıda inherit). */
const SPONSOR_TICKER_TEXT = "text-[#002f5e]";

/** Gövde punto: önceki text-base / md:text-xl / lg:text-2xl üzerinden %115 */
const SPONSOR_TICKER_SIZE =
  "text-[1.15rem] md:text-[1.4375rem] lg:text-[1.725rem] font-bold leading-snug tracking-tight";

/** Boş durum: text-sm / md:text-base → %115 */
const SPONSOR_TICKER_SIZE_EMPTY = "text-[1.00625rem] md:text-[1.15rem]";

/** Beyaz halka (tüm satırlar); parlama yalnızca ortadaki satırda (JS ile). */
const SPONSOR_TICKER_RING = "home-hero-sponsor-ticker-white-ring";
const TICKER_IDLE_CLASS = "home-hero-sponsor-ticker-idle";
const TICKER_SPOTLIGHT_CLASS = "home-hero-sponsor-ticker-spotlight";

const sponsorProfileLinkClass =
  "inline-flex shrink-0 cursor-pointer items-baseline gap-0 whitespace-nowrap text-inherit no-underline decoration-[#002f5e]/75 underline-offset-[0.2em] outline-none hover:underline focus-visible:underline";

/** Yalnızca görünüm; veritabanı kaydı değişmez (tr-TR: i→İ, ı→I). */
function tickerDisplayUpper(text: string, lang: Lang): string {
  return text.toLocaleUpperCase(lang === "en" ? "en-US" : "tr-TR");
}

function SponsorSlideInner({
  slide,
  slidesLength,
  lang,
}: {
  slide: HomeHeroSlideClientPayload;
  slidesLength: number;
  lang: Lang;
}) {
  const isEmptyPlaceholder = slidesLength === 0;
  const title = tickerDisplayUpper(slide.title, lang);
  const subtitle = slide.subtitle ? tickerDisplayUpper(slide.subtitle, lang) : null;

  const titleAndSubtitle = (
    <>
      <span className="shrink-0">{title}</span>
      {subtitle ? (
        <span
          className="shrink-0 font-semibold opacity-95"
          style={{ fontSize: `${SUBTITLE_SCALE_EM}em` }}
        >
          {" — "}
          {subtitle}
        </span>
      ) : null}
    </>
  );

  const profileHref =
    slide.ctaUrl &&
    (slide.isSponsor || slide.ctaUrl.startsWith("/uye/") || slide.id.startsWith("member-ticker-"));

  if (!isEmptyPlaceholder && profileHref) {
    return (
      <Link href={slide.ctaUrl!} className={sponsorProfileLinkClass} prefetch={false}>
        {titleAndSubtitle}
      </Link>
    );
  }

  return (
    <>
      {titleAndSubtitle}
      {slide.ctaUrl && slide.ctaLabel && !slide.isSponsor ? (
        <span className="shrink-0 font-semibold">
          {" · "}
          {tickerDisplayUpper(slide.ctaLabel, lang)}
        </span>
      ) : null}
    </>
  );
}

function TickerBetweenGap() {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 select-none"
      style={{ width: `${SPONSOR_BETWEEN_GAP_CH}ch` }}
    />
  );
}

function SponsorStripSegments({
  items,
  slidesLength,
  lang,
}: {
  items: HomeHeroSlideClientPayload[];
  slidesLength: number;
  lang: Lang;
}) {
  return (
    <>
      {items.map((slide, i) => (
        <Fragment key={`${slide.id}-${i}`}>
          {i > 0 ? <TickerBetweenGap /> : null}
          <span
            data-ticker-entry
            data-slide-id={slide.id}
            className={`inline-flex items-baseline whitespace-nowrap ${SPONSOR_TICKER_SIZE} ${SPONSOR_TICKER_TEXT} ${SPONSOR_TICKER_RING} ${TICKER_IDLE_CLASS}`}
          >
            <SponsorSlideInner slide={slide} slidesLength={slidesLength} lang={lang} />
          </span>
        </Fragment>
      ))}
    </>
  );
}

function tickerAriaLabel(lang: Lang, kind: HomeHeroTickerDisplayKind): string {
  if (kind === "new_members") {
    return lang === "en" ? "Recently joined members" : "Yeni katılan üyeler";
  }
  return lang === "en" ? "Featured sponsors" : "Öne çıkan sponsorlar";
}

function tickerKindHeading(lang: Lang, kind: HomeHeroTickerDisplayKind): string {
  if (kind === "new_members") {
    return lang === "en" ? "New Members" : "Yeni Üyeler";
  }
  return lang === "en" ? "Sponsor Members" : "Sponsor Üyeler";
}

/** Görünür alanın tam ortasına en yakın üye satırını parlatır (marquee kopyaları aynı anda değil). */
function useTickerCenterSpotlight(viewportRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    let frame = 0;
    const tick = () => {
      const viewport = viewportRef.current;
      if (!viewport) {
        frame = requestAnimationFrame(tick);
        return;
      }
      const entries = viewport.querySelectorAll<HTMLElement>("[data-ticker-entry]");
      if (entries.length === 0) {
        frame = requestAnimationFrame(tick);
        return;
      }

      const box = viewport.getBoundingClientRect();
      const centerX = box.left + box.width / 2;

      const measure = (el: HTMLElement, requireVisible: boolean) => {
        const r = el.getBoundingClientRect();
        if (requireVisible && (r.right <= box.left || r.left >= box.right)) return null;
        const slideId = el.dataset.slideId ?? el.textContent ?? "";
        return { el, slideId, dist: Math.abs(r.left + r.width / 2 - centerX) };
      };

      /** Aynı slaytın iki kopyasından yalnızca ortaya daha yakın olanı aday. */
      const pickBest = (requireVisible: boolean) => {
        const nearestBySlide = new Map<string, { el: HTMLElement; dist: number }>();
        entries.forEach((el) => {
          const m = measure(el, requireVisible);
          if (!m) return;
          const prev = nearestBySlide.get(m.slideId);
          if (!prev || m.dist < prev.dist) nearestBySlide.set(m.slideId, { el: m.el, dist: m.dist });
        });
        let winner: HTMLElement | null = null;
        let winnerDist = Infinity;
        for (const { el, dist } of nearestBySlide.values()) {
          if (dist < winnerDist) {
            winnerDist = dist;
            winner = el;
          }
        }
        return winner;
      };

      let best = pickBest(true);
      if (!best) best = pickBest(false);

      entries.forEach((el) => {
        const on = el === best;
        el.classList.toggle(TICKER_SPOTLIGHT_CLASS, on);
        el.classList.toggle(TICKER_IDLE_CLASS, !on);
      });

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      viewportRef.current?.querySelectorAll<HTMLElement>("[data-ticker-entry]").forEach((el) => {
        el.classList.remove(TICKER_SPOTLIGHT_CLASS, TICKER_IDLE_CLASS);
      });
    };
  }, [viewportRef, enabled]);
}

function tickerEmptyTitle(lang: Lang, kind: HomeHeroTickerDisplayKind): string {
  if (kind === "new_members") {
    return lang === "en" ? "No new members to show yet." : "Henüz gösterilecek yeni üye yok.";
  }
  return lang === "en" ? "No featured sponsor slides yet." : "Henüz öne çıkan sponsor slaytı yok.";
}

function SponsorMarqueeStrip({
  slides,
  lang,
  displayKind,
}: {
  slides: HomeHeroSlideClientPayload[];
  lang: Lang;
  displayKind: HomeHeroTickerDisplayKind;
}) {
  const reduced = usePrefersReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const emptyTitle = tickerEmptyTitle(lang, displayKind);
  const ariaLabel = tickerAriaLabel(lang, displayKind);

  useTickerCenterSpotlight(viewportRef, !reduced && slides.length > 0);

  const items = useMemo(() => {
    if (slides.length === 0) return [{ ...EMPTY_SLIDE, title: emptyTitle }];
    return slides;
  }, [slides, emptyTitle]);

  const loopDurSec = useMemo(() => {
    let n = 0;
    items.forEach((slide, i) => {
      if (i > 0) n += SPONSOR_BETWEEN_GAP_CH;
      n += slide.title.length;
      if (slide.subtitle) n += slide.subtitle.length + 3;
      if (slide.ctaUrl && slide.ctaLabel && !slide.isSponsor) n += slide.ctaLabel.length + 3;
    });
    if (items.length > 0) n += SPONSOR_BETWEEN_GAP_CH;
    const baseSec = Math.max(28, Math.min(120, 18 + n * 0.14));
    return baseSec / MARQUEE_SPEED_INCREASE;
  }, [items]);

  /** Slayt yokken çift kopya marquee aynı cümleyi iki kez gösterir; tek satır statik metin. */
  if (slides.length === 0) {
    return (
      <div
        className="relative flex min-h-[2.35rem] items-center justify-center overflow-hidden border-b border-white/15 px-1 pb-1.5 text-center"
        aria-label={ariaLabel}
      >
        <p
          className={`font-semibold leading-snug ${SPONSOR_TICKER_SIZE_EMPTY} ${SPONSOR_TICKER_TEXT} ${SPONSOR_TICKER_RING}`}
        >
          {tickerDisplayUpper(emptyTitle, lang)}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={viewportRef}
      className="relative flex min-h-[2.35rem] w-full items-center overflow-hidden border-b border-white/15 pb-1.5 [container-type:inline-size]"
      aria-label={ariaLabel}
    >
      {reduced ? (
        <div
          className={`flex w-full flex-wrap items-baseline justify-center gap-x-0 text-center ${SPONSOR_TICKER_SIZE}`}
        >
          <SponsorStripSegments items={items} slidesLength={slides.length} lang={lang} />
        </div>
      ) : (
        <div className="min-w-0 w-full flex-1 overflow-hidden py-1">
          <div
            className="home-hero-marquee-loop flex w-max"
            style={{
              animation: `home-hero-loop-rtl ${loopDurSec}s linear infinite`,
            }}
          >
            <div className="inline-flex flex-none flex-row flex-nowrap items-center">
              <SponsorStripSegments items={items} slidesLength={slides.length} lang={lang} />
              <TickerBetweenGap />
            </div>
            <div
              className="inline-flex flex-none flex-row flex-nowrap items-center"
              aria-hidden
            >
              <SponsorStripSegments items={items} slidesLength={slides.length} lang={lang} />
              <TickerBetweenGap />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type Props = {
  lang: Lang;
  slides: HomeHeroSlideClientPayload[];
  displayKind: HomeHeroTickerDisplayKind;
  title: string;
  subtitle: string;
};

export default function HomeHeroMarqueeStrip({ lang, slides, displayKind, title, subtitle }: Props) {
  return (
    <section
      className="relative w-full rounded-xl bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 px-4 pb-2.5 pt-7 text-white shadow-sm outline-none md:rounded-2xl md:px-5 md:pb-3.5 md:pt-8"
      aria-label={lang === "en" ? "Home hero" : "Ana sayfa üst şerit"}
    >
      <h3 className="pointer-events-none absolute left-1/2 top-2.5 z-10 w-full -translate-x-1/2 px-2 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-white sm:top-3 sm:text-xs md:text-[0.8125rem]">
        {tickerKindHeading(lang, displayKind)}
      </h3>
      <div className="flex flex-col justify-center gap-1 md:gap-1.5">
        <SponsorMarqueeStrip slides={slides} lang={lang} displayKind={displayKind} />

        <div className="flex flex-col gap-0.5 px-0.5 text-center">
          <h2 className="text-[1.485rem] font-bold leading-tight tracking-tight text-white sm:text-[1.65rem] md:text-[1.925rem] lg:text-[2.2rem]">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-[12.1px] font-semibold leading-snug text-orange-100 sm:text-[0.825rem] md:text-[0.9625rem] lg:text-[1.03125rem]">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

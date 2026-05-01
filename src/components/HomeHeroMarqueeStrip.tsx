"use client";

import Link from "next/link";
import { Fragment, useMemo, useSyncExternalStore } from "react";
import type { Lang } from "@/lib/i18n";
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

/** Beyaz halka + parlama/sönme — doğrudan metin span’ında kullanılmaz (animasyonu bozar); sarmalayıcıya verilir. */
const SPONSOR_TICKER_GLOW_WRAP = "home-hero-sponsor-ticker-white-ring home-hero-sponsor-ticker-pulse";

const sponsorProfileLinkClass =
  "inline-flex shrink-0 cursor-pointer items-baseline gap-0 whitespace-nowrap text-inherit no-underline decoration-[#002f5e]/75 underline-offset-[0.2em] outline-none hover:underline focus-visible:underline";

function SponsorSlideInner({
  slide,
  slidesLength,
}: {
  slide: HomeHeroSlideClientPayload;
  slidesLength: number;
}) {
  const isEmptyPlaceholder = slidesLength === 0;

  const titleAndSubtitle = (
    <>
      <span className="shrink-0">{slide.title}</span>
      {slide.subtitle ? (
        <span
          className="shrink-0 font-semibold opacity-95"
          style={{ fontSize: `${SUBTITLE_SCALE_EM}em` }}
        >
          {" — "}
          {slide.subtitle}
        </span>
      ) : null}
    </>
  );

  if (!isEmptyPlaceholder && slide.isSponsor && slide.ctaUrl) {
    return (
      <Link href={slide.ctaUrl} className={sponsorProfileLinkClass} prefetch={false}>
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
          {slide.ctaLabel}
        </span>
      ) : null}
    </>
  );
}

function SponsorStripSegments({
  items,
  slidesLength,
}: {
  items: HomeHeroSlideClientPayload[];
  slidesLength: number;
}) {
  return (
    <>
      {items.map((slide, i) => (
        <Fragment key={`${slide.id}-${i}`}>
          {i > 0 ? (
            <span
              aria-hidden
              className="inline-block shrink-0 select-none"
              style={{ width: `${SPONSOR_BETWEEN_GAP_CH}ch` }}
            />
          ) : null}
          <span
            className={`inline-flex items-baseline whitespace-nowrap ${SPONSOR_TICKER_SIZE} ${SPONSOR_TICKER_TEXT}`}
          >
            <SponsorSlideInner slide={slide} slidesLength={slidesLength} />
          </span>
        </Fragment>
      ))}
    </>
  );
}

function SponsorMarqueeStrip({
  slides,
  lang,
}: {
  slides: HomeHeroSlideClientPayload[];
  lang: Lang;
}) {
  const reduced = usePrefersReducedMotion();
  const emptyTitle =
    lang === "en" ? "No featured sponsor slides yet." : "Henüz öne çıkan sponsor slaytı yok.";

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
    const baseSec = Math.max(28, Math.min(120, 18 + n * 0.14));
    return baseSec / MARQUEE_SPEED_INCREASE;
  }, [items]);

  /** Slayt yokken çift kopya marquee aynı cümleyi iki kez gösterir; tek satır statik metin. */
  if (slides.length === 0) {
    return (
      <div
        className="relative flex min-h-[2.35rem] items-center justify-center overflow-hidden border-b border-white/15 px-1 pb-1.5 text-center"
        aria-label={lang === "en" ? "Featured sponsors" : "Öne çıkan sponsorlar"}
      >
        <p
          className={`font-semibold leading-snug ${SPONSOR_TICKER_SIZE_EMPTY} ${SPONSOR_TICKER_TEXT} ${SPONSOR_TICKER_GLOW_WRAP}`}
        >
          {emptyTitle}
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-[2.35rem] items-center overflow-hidden border-b border-white/15 pb-1.5 [container-type:inline-size]"
      aria-label={lang === "en" ? "Featured sponsors" : "Öne çıkan sponsorlar"}
    >
      {reduced ? (
        <div
          className={`flex w-full flex-wrap items-baseline justify-center gap-x-0 text-center ${SPONSOR_TICKER_SIZE} ${SPONSOR_TICKER_GLOW_WRAP}`}
        >
          <SponsorStripSegments items={items} slidesLength={slides.length} />
        </div>
      ) : (
        <div className="min-w-0 overflow-hidden py-1">
          <div
            className="home-hero-marquee-loop flex w-max"
            style={{
              animation: `home-hero-loop-rtl ${loopDurSec}s linear infinite`,
            }}
          >
            <div
              className={`inline-flex flex-none flex-row flex-nowrap items-center ${SPONSOR_TICKER_GLOW_WRAP}`}
            >
              <SponsorStripSegments items={items} slidesLength={slides.length} />
            </div>
            <div
              className={`inline-flex flex-none flex-row flex-nowrap items-center ${SPONSOR_TICKER_GLOW_WRAP}`}
              aria-hidden
            >
              <SponsorStripSegments items={items} slidesLength={slides.length} />
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
  title: string;
  subtitle: string;
};

export default function HomeHeroMarqueeStrip({ lang, slides, title, subtitle }: Props) {
  return (
    <section
      className="w-full rounded-xl bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 px-4 py-2.5 text-white shadow-sm outline-none md:rounded-2xl md:px-5 md:py-3.5"
      aria-label={lang === "en" ? "Home hero" : "Ana sayfa üst şerit"}
    >
      <div className="flex flex-col justify-center gap-1 md:gap-1.5">
        <SponsorMarqueeStrip slides={slides} lang={lang} />

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

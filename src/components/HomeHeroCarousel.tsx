"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { Lang } from "@/lib/i18n";
import type { HomeHeroSlideClientPayload } from "@/lib/homeHeroSlidesQuery";

type Props = {
  lang: Lang;
  slides: HomeHeroSlideClientPayload[];
  fallbackTitle: string;
  fallbackSubtitle: string;
  showHeroAuthLinks: boolean;
  primaryButtonHref: string;
  secondaryButtonHref: string;
  primaryButtonLabel: string;
  secondaryButtonLabel: string;
};

const INTERVAL_MS = 6500;

function chipClass(): string {
  return "chip inline-flex min-h-[44px] touch-manipulation items-center whitespace-nowrap border border-white/70 bg-white/10 !text-[#722f37] px-4 py-2 text-xs font-semibold hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-sm";
}

function SlideCta({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const external = /^https?:\/\//i.test(href);
  const cls = chipClass();
  if (external) {
    return (
      <a href={href} className={cls} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {label}
    </Link>
  );
}

function SlideBackground({
  imageUrl,
  alt,
  priority,
}: {
  imageUrl: string | null;
  alt: string;
  priority: boolean;
}) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("/")) {
    return (
      <Image
        src={imageUrl}
        alt={alt}
        fill
        priority={priority}
        className="object-cover"
        sizes="100vw"
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Harici S3/blob hostları next.config remotePatterns dışında kalabilir
    <img
      src={imageUrl}
      alt={alt}
      className="absolute inset-0 h-full w-full object-cover"
      decoding="async"
    />
  );
}

export default function HomeHeroCarousel({
  lang,
  slides,
  fallbackTitle,
  fallbackSubtitle,
  showHeroAuthLinks,
  primaryButtonHref,
  secondaryButtonHref,
  primaryButtonLabel,
  secondaryButtonLabel,
}: Props) {
  const resolvedSlides = useMemo<HomeHeroSlideClientPayload[]>(() => {
    if (slides.length > 0) return slides;
    return [
      {
        id: "__fallback",
        title: fallbackTitle,
        subtitle: fallbackSubtitle,
        imageUrl: null,
        ctaUrl: null,
        ctaLabel: null,
        isSponsor: false,
      },
    ];
  }, [slides, fallbackTitle, fallbackSubtitle]);

  const len = resolvedSlides.length;
  const multi = len > 1;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const regionRef = useRef<HTMLElement>(null);
  const labelId = useId();

  useEffect(() => {
    setIndex(0);
  }, [len, slides]);

  useEffect(() => {
    if (!multi || paused) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % len);
    }, INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [multi, paused, len]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + len) % len);
  }, [len]);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % len);
  }, [len]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!multi) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    },
    [multi, goPrev, goNext],
  );

  const sponsorWord = lang === "en" ? "Advertisement" : "Sponsor";

  return (
    <section
      ref={regionRef}
      tabIndex={0}
      className="w-full rounded-2xl text-white outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-orange-600"
      aria-roledescription="carousel"
      aria-labelledby={labelId}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!regionRef.current?.contains(e.relatedTarget)) setPaused(false);
      }}
    >
      <p id={labelId} className="sr-only">
        {lang === "en" ? "Featured announcements" : "Öne çıkan duyurular"}
      </p>

      <div className="relative min-h-[148px] overflow-hidden rounded-2xl md:min-h-[156px]">
        {resolvedSlides.map((slide, idx) => {
          const active = idx === index;
          const showImage = Boolean(slide.imageUrl);
          const overlayClass = showImage
            ? "bg-gradient-to-r from-orange-950/85 via-orange-800/75 to-amber-900/70"
            : "bg-gradient-to-r from-orange-500 to-amber-500";

          return (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${idx + 1} / ${len}`}
              aria-hidden={!active}
              className={
                active
                  ? "relative flex min-h-[148px] flex-col md:min-h-[156px]"
                  : "pointer-events-none absolute inset-0 opacity-0"
              }
            >
              {showImage ? (
                <div className="absolute inset-0 z-0" aria-hidden>
                  <SlideBackground
                    imageUrl={slide.imageUrl}
                    alt={slide.title}
                    priority={index === 0 && idx === 0}
                  />
                </div>
              ) : null}
              <div className={`absolute inset-0 z-[1] ${overlayClass}`} aria-hidden />

              <div className="relative z-[2] flex min-h-[inherit] flex-1 flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-4 md:px-5 md:py-3.5">
                <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {slide.isSponsor ? (
                      <span className="rounded bg-black/25 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-100 ring-1 ring-white/25">
                        {sponsorWord}
                      </span>
                    ) : null}
                    <h2 className="w-full min-w-0 text-lg font-bold leading-tight sm:text-xl md:text-2xl">
                      {slide.title}
                    </h2>
                  </div>
                  {slide.subtitle ? (
                    <p className="w-full min-w-0 text-xs font-semibold leading-snug text-orange-100 sm:text-sm md:text-[0.9375rem] md:whitespace-nowrap md:overflow-hidden md:text-ellipsis">
                      {slide.subtitle}
                    </p>
                  ) : null}
                  {slide.ctaUrl && slide.ctaLabel ? (
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      <SlideCta href={slide.ctaUrl} label={slide.ctaLabel} />
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-row flex-wrap items-center gap-2 md:justify-end">
                  {showHeroAuthLinks ? (
                    <>
                      <Link className={chipClass()} href={primaryButtonHref}>
                        {primaryButtonLabel}
                      </Link>
                      <Link className={chipClass()} href={secondaryButtonHref}>
                        {secondaryButtonLabel}
                      </Link>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {multi ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex gap-1.5">
            <button
              type="button"
              className="rounded-lg border border-white/40 bg-white/10 px-2 py-1 text-xs font-semibold text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              aria-label={lang === "en" ? "Previous slide" : "Önceki slayt"}
              onClick={goPrev}
            >
              ‹
            </button>
            <button
              type="button"
              className="rounded-lg border border-white/40 bg-white/10 px-2 py-1 text-xs font-semibold text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              aria-label={lang === "en" ? "Next slide" : "Sonraki slayt"}
              onClick={goNext}
            >
              ›
            </button>
          </div>
          <div className="flex gap-1.5" role="tablist" aria-label={lang === "en" ? "Slides" : "Slaytlar"}>
            {resolvedSlides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-current={i === index ? "true" : undefined}
                className={
                  i === index
                    ? "h-2 w-2 rounded-full bg-white shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    : "h-2 w-2 rounded-full bg-white/35 hover:bg-white/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                }
                aria-label={`${lang === "en" ? "Go to slide" : "Slayta git"} ${i + 1}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {lang === "en" ? "Slide" : "Slayt"} {index + 1} / {len}: {resolvedSlides[index]?.title}
      </p>
    </section>
  );
}

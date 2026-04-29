import type { Lang } from "@/lib/i18n";

/** Yardım merkezi e-postası — yalnızca `.env` içinde `NEXT_PUBLIC_HELP_CENTER_EMAIL`. */
const HELP_CENTER_EMAIL = process.env.NEXT_PUBLIC_HELP_CENTER_EMAIL?.trim() ?? "";

const SUPPORT_PHONE_DISPLAY = "0 242 326 00 85";
const SUPPORT_PHONE_TEL = "+902423260085";

type Props = {
  lang: Lang;
};

export default function FooterSupportStrip({ lang }: Props) {
  const label =
    lang === "tr" ? "7/24 Müşteri Hizmetleri" : "24/7 Customer Service";
  const helpLabel = lang === "tr" ? "Yardım Merkezi" : "Help Center";

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-slate-600 md:justify-start">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-800 ring-1 ring-orange-200/80">
        <PhoneWithPersonIcon className="h-6 w-6" aria-hidden />
      </span>
      <span className="font-medium text-slate-700">{label}</span>
      <a
        href={`tel:${SUPPORT_PHONE_TEL}`}
        className="font-semibold tabular-nums text-slate-800 hover:text-orange-800 hover:underline"
      >
        {SUPPORT_PHONE_DISPLAY}
      </a>
      <span className="hidden text-slate-300 sm:inline" aria-hidden>
        |
      </span>
      <span className="inline-flex items-center gap-2">
        <span
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-orange-400/90 bg-orange-50 text-orange-900"
          title={helpLabel}
        >
          <QuestionInCircleIcon className="h-4 w-4" aria-hidden />
        </span>
        {HELP_CENTER_EMAIL ? (
          <a
            href={`mailto:${HELP_CENTER_EMAIL}?subject=${encodeURIComponent(
              lang === "tr" ? "Yardım Merkezi" : "Help Center",
            )}`}
            className="text-orange-800 hover:underline"
          >
            {helpLabel}: {HELP_CENTER_EMAIL}
          </a>
        ) : (
          <span className="text-slate-500">{helpLabel}</span>
        )}
      </span>
    </div>
  );
}

/** Telefon ile konuşan kişi — ahize (sol) + kadın silüeti (saç + omuz). */
function PhoneWithPersonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <g transform="translate(0 1) scale(0.52)" vectorEffect="non-scaling-stroke">
        <path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
      </g>
      <g transform="translate(11 2.5) scale(0.42)">
        <path
          d="M14 5.5c-1.2-1.8-3.8-2-5.5-.5S6.5 9 8 11c.8 1 2 1.5 3.2 1.4"
          fill="none"
          strokeWidth="1.35"
        />
        <circle cx="10" cy="11" r="3.2" fill="none" strokeWidth="1.35" />
        <path d="M4.5 21.5c.5-4 3.8-6.8 7.5-6.8s7 2.8 7.5 6.8" fill="none" strokeWidth="1.35" />
      </g>
    </svg>
  );
}

function QuestionInCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 4.2-1.7c.6.6.9 1.4.8 2.3-.1 1.2-1 1.9-1.8 2.4-.4.3-.7.5-.7 1v.3" />
      <path d="M12 17h.01" strokeWidth="2.5" />
    </svg>
  );
}

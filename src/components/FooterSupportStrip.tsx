import type { Lang } from "@/lib/i18n";

const HELP_CENTER_EMAIL =
  process.env.NEXT_PUBLIC_HELP_CENTER_EMAIL?.trim() || "bilgi@yapanolur.com";

type Props = {
  lang: Lang;
};

export default function FooterSupportStrip({ lang }: Props) {
  const helpText =
    lang === "tr"
      ? `Yardım Merkezi E-Posta; ${HELP_CENTER_EMAIL}`
      : `Help Center Email; ${HELP_CENTER_EMAIL}`;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-slate-600 md:justify-start">
      <span
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-orange-400/90 bg-orange-50 text-orange-900"
        title={helpText}
      >
        <QuestionInCircleIcon className="h-4 w-4" aria-hidden />
      </span>
      <a
        href={`mailto:${HELP_CENTER_EMAIL}?subject=${encodeURIComponent(
          lang === "tr" ? "Yardım Merkezi" : "Help Center",
        )}`}
        className="font-medium text-orange-800 hover:underline"
      >
        {helpText}
      </a>
    </div>
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

import { formatMemberWorkDuration } from "@/lib/memberWorkDuration";

type Row = {
  id: string;
  title: string;
  description: string;
  province: string;
  district: string;
  blockParcel: string | null;
  durationYears: number;
  durationMonths: number;
  durationDays: number;
  imageUrl1: string | null;
  imageUrl2: string | null;
  imageUrl3: string | null;
  profession: { name: string } | null;
  category: { name: string } | null;
};

export default function MemberWorkExperiencePublic({
  items,
  lang,
  copy,
}: {
  items: Row[];
  lang: "tr" | "en";
  copy: {
    sectionTitle: string;
    durationLabel: string;
    locationLabel: string;
    professionLabel: string;
    categoryLabel: string;
  };
}) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">{copy.sectionTitle}</h2>
      <ul className="space-y-1.5">
        {items.map((item) => {
          const imgs = [item.imageUrl1, item.imageUrl2, item.imageUrl3].filter(Boolean) as string[];
          const durationText = formatMemberWorkDuration(
            lang,
            item.durationYears,
            item.durationMonths,
            item.durationDays,
          );
          return (
            <li
              key={item.id}
              className="rounded-lg border border-orange-200/90 bg-orange-50/40 p-2 shadow-sm sm:p-2.5"
            >
              <div className="flex gap-2 sm:gap-2.5">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate text-sm font-semibold leading-tight text-orange-950">{item.title}</p>
                  <p className="text-[11px] leading-snug text-slate-700">
                    <span className="text-slate-500">{copy.durationLabel}:</span> {durationText}
                    {item.profession?.name ? (
                      <>
                        {" · "}
                        <span className="text-slate-500">{copy.professionLabel}:</span> {item.profession.name}
                      </>
                    ) : null}
                    {item.category?.name ? (
                      <>
                        {" · "}
                        <span className="text-slate-500">{copy.categoryLabel}:</span> {item.category.name}
                      </>
                    ) : null}
                    {" · "}
                    <span className="text-slate-500">{copy.locationLabel}:</span> {item.province} /{" "}
                    {item.district}
                    {item.blockParcel ? ` · ${item.blockParcel}` : ""}
                  </p>
                  {item.description ? (
                    <p className="line-clamp-2 text-xs leading-snug text-slate-800">{item.description}</p>
                  ) : null}
                </div>
                {imgs.length > 0 ? (
                  <div className="flex shrink-0 flex-col gap-0.5 self-start">
                    {imgs.map((url) => (
                      <div
                        key={url}
                        className="h-9 w-9 shrink-0 overflow-hidden rounded border border-orange-200 bg-white sm:h-10 sm:w-10"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

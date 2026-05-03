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
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">{copy.sectionTitle}</h2>
      <ul className="space-y-4">
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
              className="rounded-xl border border-orange-200/90 bg-orange-50/40 p-4 shadow-sm"
            >
              <p className="font-semibold text-orange-950">{item.title}</p>
              <p className="mt-1 text-sm text-slate-700">
                <span className="text-slate-500">{copy.durationLabel}: </span>
                {durationText}
              </p>
              {item.profession?.name ? (
                <p className="mt-1 text-sm text-slate-700">
                  <span className="text-slate-500">{copy.professionLabel}: </span>
                  {item.profession.name}
                </p>
              ) : null}
              {item.category?.name ? (
                <p className="mt-1 text-sm text-slate-700">
                  <span className="text-slate-500">{copy.categoryLabel}: </span>
                  {item.category.name}
                </p>
              ) : null}
              <p className="mt-1 text-sm text-slate-700">
                {copy.locationLabel}: {item.province} / {item.district}
                {item.blockParcel ? ` · ${item.blockParcel}` : ""}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{item.description}</p>
              {imgs.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {imgs.map((url) => (
                    <div
                      key={url}
                      className="h-20 w-20 overflow-hidden rounded-lg border border-orange-200 bg-white"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

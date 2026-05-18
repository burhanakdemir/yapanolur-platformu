"use client";

import type { LocationOption } from "@/lib/locationSelect";

type ProvinceSelectFieldProps = {
  provinces: LocationOption[];
  provinceId: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  /** form: etiket + kutu; bare: yalnızca alan (arama / ilan formları) */
  variant?: "form" | "bare";
  label?: string;
  selectClassName?: string;
  onChange: (provinceId: string, provinceName: string) => void;
};

export default function ProvinceSelectField({
  provinces,
  provinceId,
  disabled,
  required = true,
  placeholder = "İl seçin",
  variant = "bare",
  label = "İl",
  selectClassName = "h-9 w-full rounded-lg border bg-white px-2.5 py-0 text-sm leading-tight disabled:cursor-not-allowed disabled:bg-orange-100",
  onChange,
}: ProvinceSelectFieldProps) {
  const single = provinces.length === 1 ? provinces[0]! : null;

  if (single) {
    if (variant === "form") {
      return (
        <div className="rounded-lg border border-orange-100 bg-orange-50/50 px-2.5 py-1.5 text-sm text-slate-800">
          <span className="text-xs font-medium text-slate-600">{label}</span>
          <p className="font-semibold text-orange-950">{single.name}</p>
        </div>
      );
    }
    const bareClass =
      selectClassName.includes("min-h-") || selectClassName.includes("rounded-lg")
        ? `${selectClassName} flex items-center font-semibold text-slate-800 !bg-orange-50/60`
        : "flex min-h-[44px] items-center rounded-lg border border-slate-200 bg-orange-50/60 px-3 py-2.5 text-base font-semibold text-slate-800 sm:min-h-0 sm:py-2 sm:text-sm";
    return (
      <div className={bareClass} aria-label={label}>
        {single.name}
      </div>
    );
  }

  if (variant === "form") {
    return (
      <>
        <label className="block text-xs font-medium text-slate-700">{label}</label>
        <select
          className={selectClassName}
          value={provinceId}
          disabled={disabled}
          required={required && !disabled}
          onChange={(e) => {
            const nextId = e.target.value;
            const p = provinces.find((x) => String(x.id) === nextId);
            onChange(nextId, p?.name ?? "");
          }}
        >
          <option value="">{placeholder}</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </>
    );
  }

  return (
    <select
      className={selectClassName}
      value={provinceId}
      disabled={disabled}
      required={required && !disabled}
      onChange={(e) => {
        const nextId = e.target.value;
        const p = provinces.find((x) => String(x.id) === nextId);
        onChange(nextId, p?.name ?? "");
      }}
    >
      <option value="">{placeholder}</option>
      {provinces.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

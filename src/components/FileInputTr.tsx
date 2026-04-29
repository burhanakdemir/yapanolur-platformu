"use client";

import { useId } from "react";

type Props = {
  name: string;
  accept?: string;
  required?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  className?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Secilen dosya ozeti (tek veya cok); bos/null ise "Dosya secilmedi" */
  chosenFileName: string | null;
  /** Coklu secimde buton metni */
  chooseButtonText?: string;
};

/**
 * Tarayicinin "Choose file / No file chosen" metnini gizler; Turkce etiket kullanir.
 */
export default function FileInputTr({
  name,
  accept = "image/*",
  required,
  disabled,
  multiple,
  className,
  onChange,
  chosenFileName,
  chooseButtonText = "Dosya seç",
}: Props) {
  const id = useId();
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
        disabled={disabled}
        multiple={multiple}
        onChange={onChange}
        className="sr-only"
      />
      <label
        htmlFor={id}
        className="inline-flex cursor-pointer rounded-lg border border-orange-300 bg-white px-3 py-1.5 text-xs font-medium text-orange-900 shadow-sm hover:bg-orange-50"
      >
        {chooseButtonText}
      </label>
      <span
        className="min-w-0 max-w-[min(100%,24rem)] truncate text-xs text-slate-600"
        title={chosenFileName || undefined}
      >
        {chosenFileName ? chosenFileName : "Dosya seçilmedi"}
      </span>
    </div>
  );
}

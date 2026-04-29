"use client";

import { useEffect } from "react";

type Props = {
  token: string;
};

export default function PaytrIframeClient({ token }: Props) {
  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://www.paytr.com/js/iframeResizer.min.js";
    s.async = true;
    document.body.appendChild(s);
    return () => {
      s.remove();
    };
  }, []);

  return (
    <iframe
      title="PayTR odeme"
      src={`https://www.paytr.com/odeme/guvenli/${token}`}
      id="paytriframe"
      className="w-full min-h-[600px] rounded-xl border border-slate-200 bg-white"
      style={{ minHeight: 520 }}
    />
  );
}

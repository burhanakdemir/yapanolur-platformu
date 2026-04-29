"use client";

import { useState } from "react";
import MemberContactModal from "@/components/MemberContactModal";

export default function MemberProfileContactButton({
  targetUserId,
  lang,
}: {
  targetUserId: string;
  lang: "tr" | "en";
}) {
  const [open, setOpen] = useState(false);
  const loginNext = lang === "en" ? `/uye/${targetUserId}?lang=en` : `/uye/${targetUserId}`;
  const label = lang === "tr" ? "İletişim bilgileri" : "Contact details";

  return (
    <>
      <button type="button" className="btn-primary w-full sm:w-auto" onClick={() => setOpen(true)}>
        {label}
      </button>
      <MemberContactModal
        userId={targetUserId}
        open={open}
        onClose={() => setOpen(false)}
        lang={lang}
        loginNextPath={loginNext}
      />
    </>
  );
}

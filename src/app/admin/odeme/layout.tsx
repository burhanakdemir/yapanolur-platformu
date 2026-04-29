import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Ödeme sağlayıcıları",
  description: "iyzico ve PayTR API anahtarları ve geri dönüş adresleri",
};

export default function OdemeSaglayicilariLayout({ children }: { children: ReactNode }) {
  return children;
}

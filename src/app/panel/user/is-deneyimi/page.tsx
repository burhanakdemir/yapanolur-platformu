import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import WorkExperienceClient from "./work-experience-client";

type Props = {
  searchParams: Promise<{ lang?: string }>;
};

export default async function IsDeneyimiPage({ searchParams }: Props) {
  const params = await searchParams;
  const lang = params.lang === "en" ? "en" : "tr";
  const token = (await cookies()).get("session_token")?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    const nextPath = lang === "en" ? "/panel/user/is-deneyimi?lang=en" : "/panel/user/is-deneyimi";
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true },
  });

  if (!dbUser || dbUser.role !== "MEMBER") {
    redirect(lang === "en" ? "/panel/user?lang=en" : "/panel/user");
  }

  const backHref = lang === "en" ? "/panel/user?lang=en" : "/panel/user";

  const labels =
    lang === "tr"
      ? {
          title: "İş deneyimi",
          subtitle:
            "Tamamladığınız işleri ekleyin; onaylı profilinizde ziyaretçiler görebilir. En fazla 3 fotoğraf.",
          back: "Üye paneline dön",
          add: "Yeni iş ekle",
          save: "Kaydet",
          cancel: "Vazgeç",
          edit: "Düzenle",
          delete: "Sil",
          deleteConfirm: "Bu iş kaydını silmek istediğinize emin misiniz?",
          jobTitle: "İşin adı",
          description: "Kısa tanım",
          province: "İl",
          district: "İlçe",
          blockParcel: "Ada / parsel",
          blockParcelHint: "İsteğe bağlı",
          durationSection: "Bitiş süresi",
          durationHint:
            "İşin tamamlanma süresini yıl, ay ve gün olarak girin. Sıfır olan birimler listede gösterilmez (ör. yalnızca 20 gün).",
          durationYear: "Yıl",
          durationMonth: "Ay",
          durationDay: "Gün",
          images: "Görseller",
          imagesHint:
            "Üye belgelerinde olduğu gibi dosya seçip «Seçilen görselleri yükle» ile yükleyin; ardından Kaydet. En fazla 3 adet (JPEG, PNG, WebP).",
          imageSlot1: "Görsel 1",
          imageSlot2: "Görsel 2",
          imageSlot3: "Görsel 3",
          imageChipUploaded: "Yüklü",
          imageChipMissing: "Yok",
          imageNotUploadedYet: "Henüz yüklenmedi.",
          uploadImagesButton: "Seçilen görselleri yükle",
          removeImageFromSlot: "Kaldır",
          imagesUploadSuccess: "Görseller yüklendi. İş kaydını güncellemek için Kaydet’e basın.",
          chooseFilesFirst: "Önce bir veya daha fazla görsel dosyası seçin.",
          pendingImagesNotUploaded:
            "Kaydetmeden önce seçilen görselleri «Seçilen görselleri yükle» ile yükleyin veya dosya seçimini temizleyin.",
          listTitle: "Kayıtlı işler",
          empty: "Henüz iş eklenmedi.",
          loading: "Yükleniyor…",
          durationSummaryLabel: "Bitiş süresi",
          locationLabel: "Konum",
          professionLabel: "Meslek",
          categoryLabel: "Kategori",
          selectProfession: "Meslek seçin",
          selectCategory: "Kategori seçin",
          professionCategoryHint: "İlan oluştururken kullandığınız kategori hiyerarşisinden seçin.",
          modalClose: "Kapat",
          detailModalHint: "İş kaydı ayrıntıları",
          openDetailAria: "Ayrıntıları göster",
          enlargeImageAria: "Görseli büyüt",
        }
      : {
          title: "Work experience",
          subtitle:
            "Add completed jobs; they appear on your approved public profile. Up to three photos.",
          back: "Back to dashboard",
          add: "Add job",
          save: "Save",
          cancel: "Cancel",
          edit: "Edit",
          delete: "Delete",
          deleteConfirm: "Delete this work entry?",
          jobTitle: "Job title",
          description: "Short description",
          province: "Province",
          district: "District",
          blockParcel: "Block / parcel",
          blockParcelHint: "Optional",
          durationSection: "Duration",
          durationHint:
            "Enter years, months, and days to complete the job. Zero units are omitted in lists (e.g. only “20 days”).",
          durationYear: "Years",
          durationMonth: "Months",
          durationDay: "Days",
          images: "Images",
          imagesHint:
            "Like member documents: pick files, click «Upload selected images», then Save. Up to three (JPEG, PNG, WebP).",
          imageSlot1: "Image 1",
          imageSlot2: "Image 2",
          imageSlot3: "Image 3",
          imageChipUploaded: "Uploaded",
          imageChipMissing: "None",
          imageNotUploadedYet: "Not uploaded yet.",
          uploadImagesButton: "Upload selected images",
          removeImageFromSlot: "Remove",
          imagesUploadSuccess: "Images uploaded. Click Save to store this job entry.",
          chooseFilesFirst: "Choose one or more image files first.",
          pendingImagesNotUploaded:
            "Upload selected images first with «Upload selected images», or clear the file selection.",
          listTitle: "Your entries",
          empty: "No entries yet.",
          loading: "Loading…",
          durationSummaryLabel: "Duration",
          locationLabel: "Location",
          professionLabel: "Profession",
          categoryLabel: "Category",
          selectProfession: "Select profession",
          selectCategory: "Select category",
          professionCategoryHint: "Pick from the same category tree used when posting listings.",
          modalClose: "Close",
          detailModalHint: "Job entry details",
          openDetailAria: "Show details",
          enlargeImageAria: "Enlarge image",
        };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <WorkExperienceClient lang={lang} backHref={backHref} labels={labels} />
    </main>
  );
}

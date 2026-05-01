import StaticSitePage from "@/components/StaticSitePage";
import DataControllerDisclosure from "@/components/legal/DataControllerDisclosure";
import Link from "next/link";
import { getCanonicalHostname, getPublicLegalEntity } from "@/lib/legalEntity";
import { getLang } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

type Props = {
  searchParams: Promise<{ lang?: string }>;
};

const LAST_UPDATED_TR = "1 Mayıs 2026";
const LAST_UPDATED_EN = "1 May 2026";

/** KVKK md. 10 aydınlatma metni — veri sorumlusu kimliği `LEGAL_ENTITY_*` ortam değişkenleri ve site iletişim ayarıyla kesinleştirilir. */
export default async function KvkkPage({ searchParams }: Props) {
  const params = await searchParams;
  const lang = getLang(params.lang);
  const legal = getPublicLegalEntity();
  const canonicalHost = getCanonicalHostname();
  const adminSettings = await prisma.adminSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  const contactPublished = adminSettings.homeFooterContact ?? "";

  const title =
    lang === "tr"
      ? "Kişisel Verilerin Korunması ve İşlenmesi Hakkında Aydınlatma Metni"
      : "Privacy Notice — Personal Data (KVKK-Aligned)";

  const iletisimHref = `/iletisim?lang=${lang}`;
  const cerezHref = `/cerez-politikasi?lang=${lang}`;
  const kvkkLawHref = "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6698&MevzuatTur=1&MevzuatTertip=5";

  return (
    <StaticSitePage lang={lang} title={title}>
      {lang === "tr" ? (
        <div className="space-y-6">
          <p className="text-xs font-medium text-slate-500">Son güncelleme: {LAST_UPDATED_TR}</p>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">1. Giriş ve kapsam</h2>
            <p>
              Bu Aydınlatma Metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu (“
              <a href={kvkkLawHref} className="text-orange-800 underline" target="_blank" rel="noopener noreferrer">
                KVKK
              </a>
              ”)’nın 10. maddesi uyarınca, yapanolur.com alan adı üzerinden sunulan ilan, ihale/teklif ve üyelik
              hizmetlerini kullanan gerçek ve tüzel kişilere yönelik olarak hazırlanmıştır. Metin, platformu
              işleten veri sorumlusunun kişisel veri işleme faaliyetlerini genel hatlarıyla açıklar; özel
              sözleşmeler veya rıza metinleri (ör. pazarlama iletişimi) bunlara ek olarak uygulanabilir.
            </p>
          </section>

          <DataControllerDisclosure
            lang="tr"
            canonicalHost={canonicalHost}
            legal={legal}
            contactPublished={contactPublished}
            iletisimHref={iletisimHref}
          />

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">3. İşlenen kişisel veri kategorileri</h2>
            <p>Platformun işleyişine bağlı olarak aşağıdaki kategorilerde veriler işlenebilir:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Kimlik ve hesap:</strong> ad-soyad, üyelik numarası, e-posta; kayıt veya fatura
                kapsamında T.C. kimlik numarası, vergi kimlik numarası (VKN), unvan; profil fotoğrafı.
              </li>
              <li>
                <strong>İletişim:</strong> telefon numarası, il/ilçe ve adres bilgileri (fatura ve profil
                doğrulama amaçlarıyla).
              </li>
              <li>
                <strong>Mesleki / ilan içeriği:</strong> meslek seçimi, ilan başlığı ve açıklaması, konum
                bilgileri (il, ilçe, mahalle vb.), proje veya ihaleye ilişkin kullanıcı tarafından girilen
                metin ve görseller.
              </li>
              <li>
                <strong>Belge ve doğrulama:</strong> diploma, mesleki belge, vergi levhası gibi yüklenen
                görseller veya dosyalar (isteğe bağlı veya süreç gereği).
              </li>
              <li>
                <strong>İşlem güvenliği:</strong> oturum ve kimlik doğrulama bilgileri, cihaz/tarayıcı ve
                bağlantı günlükleri, IP adresi, işlem zamanı, şüpheli aktivite kayıtları.
              </li>
              <li>
                <strong>Ödeme ve finans:</strong> ödeme emri, tutar, ödeme sağlayıcı referansı; faturalama
                için gerekli mali veriler (ödeme kuruluşları aracılığıyla işlenen kart bilgileri doğrudan
                tarafımızda saklanmaz; sağlayıcının politikaları geçerlidir).
              </li>
              <li>
                <strong>Müşteri ilişkileri:</strong> destek talepleri, canlı destek veya bildirim içerikleri,
                şikâyet ve geri bildirim kayıtları.
              </li>
              <li>
                <strong>Tercihler:</strong> bildirim ve e-posta bilgilendirme tercihleri (ör. yeni ilan
                bildirimi).
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">4. Kişisel verilerin işlenme amaçları</h2>
            <p>Verileriniz başlıca şu amaçlarla işlenir:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Üyelik oluşturma, hesap yönetimi ve kimlik / iletişim doğrulama (e-posta, SMS OTP vb.).</li>
              <li>İlan yayınlama, ihale/teklif süreçlerinin yürütülmesi ve ilgili içeriklerin sunulması.</li>
              <li>Ödeme, kredi/bakiye, ücretli hizmetler ve muhasebe/finans süreçlerinin yürütülmesi.</li>
              <li>Dolandırıcılığın önlenmesi, bilgi güvenliği, kötüye kullanımın tespiti ve iç denetim.</li>
              <li>Hukuki yükümlülüklerin yerine getirilmesi ve yetkili kurum taleplerine cevap verilmesi.</li>
              <li>Hizmet kalitesinin geliştirilmesi, istatistiksel analiz (mümkün olduğunca anonim/özet veri ile).</li>
              <li>Açık rızanız bulunduğu ölçüde pazarlama ve bilgilendirme iletişimi.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">5. Hukuki sebepler</h2>
            <p>
              İşleme faaliyetleri; KVKK’nın 5. ve 6. maddelerinde düzenlenen şartlara dayanır. Özetle:{" "}
              <strong>kanunlarda açıkça öngörülmesi</strong>, <strong>fiili imkânsızlık hâllerinde</strong>{" "}
              ilgili kişinin kendisi tarafından alenileştirilmiş olması, <strong>sözleşmenin kurulması veya
              ifasıyla doğrudan doğruya ilgili olması</strong>, <strong>veri sorumlusunun hukuki
              yükümlülüğünü yerine getirebilmesi</strong>, <strong>ilgili kişinin temel hak ve özgürlüklerine
              zarar vermemek kaydıyla veri sorumlusunun meşru menfaatleri</strong> ve gerektiğinde{" "}
              <strong>açık rıza</strong>. Özel nitelikli kişisel veri işlenmesi söz konusu ise ilgili kanuni
              şartlar ve — gerekiyorsa — açık rıza ayrıca değerlendirilir.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">6. Kişisel verilerin aktarılması</h2>
            <p>
              Verileriniz; amaçların gerçekleştirilmesi için sınırlı ve ölçülü şekilde, KVKK ve ikincil
              düzenlemelere uygun olarak aşağıdaki alıcı gruplarına aktarılabilir:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Barındırma, altyapı ve yazılım hizmeti sağlayıcıları (bulut / sunucu).</li>
              <li>E-posta, SMS ve bildirim hizmeti sağlayıcıları.</li>
              <li>Ödeme hizmeti sağlayıcıları ve bankalar / ödeme kuruluşları.</li>
              <li>Hukuki danışmanlık, denetim veya teknik destek veren iş ortakları (gizlilik yükümlülüğü altında).</li>
              <li>Kanuni yetki sahibi kamu kurum ve kuruluşları.</li>
            </ul>
            <p>
              <strong>Yurt dışı aktarım:</strong> Hizmet sağlayıcılarınızın sunucuları yurt dışında ise,
              KVKK’nın 9. maddesi ve Kurul kararları çerçevesinde gerekli şartların (yeterlilik kararı,
              standart sözleşme, açık rıza vb.) sağlanması gerekir. Kullanılan sağlayıcılar için güncel hukuki
              zemini operasyonunuz izler.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">7. Kişisel veri toplanmasının zorunluluğu</h2>
            <p>
              Üyelik, ilan verme veya ödeme gibi hizmetlerin bir kısmı için belirli verilerin paylaşılması
              teknik ve hukuki olarak zorunlu olabilir. Bu veriler sağlanmadığında ilgili hizmetin kısmen veya
              tamamen sunulamayabileceği tarafınıza bildirilir.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">8. Saklama süreleri</h2>
            <p>
              Kişisel veriler, işlendikleri amaç için gerekli olan süre ve ilgili mevzuatta öngörülen zamanaşımı
              süreleri kadar saklanır; süre sonunda silinir, yok edilir veya anonim hale getirilir. Örneğin
              muhasebe ve vergi mevzuatı uyarınca saklanması gereken kayıtlar, ilgili süre boyunca tutulabilir.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">9. İlgili kişi olarak haklarınız</h2>
            <p>KVKK’nın 11. maddesi uyarınca veri sorumlusuna başvurarak:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme,</li>
              <li>İşlenmişse buna ilişkin bilgi talep etme,</li>
              <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
              <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme,</li>
              <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme,</li>
              <li>KVKK’nın 7. maddesi çerçevesinde silinmesini veya yok edilmesini isteme,</li>
              <li>Düzeltme, silme, yok etme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme,</li>
              <li>Münhasıran otomatik sistemler ile analiz edilmesi suretiyle aleyhinize bir sonucun ortaya
                çıkmasına itiraz etme,</li>
              <li>Kanuna aykırı işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme</li>
            </ul>
            <p>haklarına sahipsiniz.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">10. Başvuru yöntemi</h2>
            <p>
              Taleplerinizi, veri sorumlusunun yukarıda belirtilen iletişim kanallarına iletebilirsiniz.
              Kimliğinizi doğrulamak amacıyla ek bilgi veya belge talep edilebilir. Başvurunuza yasal süreler
              içinde yanıt verilir. Şikâyetlerinizi ayrıca Kişisel Verileri Koruma Kurulu’na iletme hakkınız
              saklıdır (
              <a
                href="https://www.kvkk.gov.tr"
                className="text-orange-800 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                kvkk.gov.tr
              </a>
              ).
            </p>
            <p>
              İletişim:{" "}
              <Link href={iletisimHref} className="font-medium text-orange-800 underline">
                İletişim sayfası
              </Link>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">11. Çerezler ve benzeri teknolojiler</h2>
            <p>
              Oturum, güvenlik ve kayıt doğrulaması için zorunlu çerezler kullanılır. Çerez tercihiniz ekran altı
              bildirimi ile kaydedilir; istemci tarafında üçüncü taraf hata izleme (Sentry) yalnızca “Tümünü
              kabul et” seçilirse yüklenir. Güncel liste ve süreler için{" "}
              <Link href={cerezHref} className="font-medium text-orange-800 underline">
                Çerez politikası
              </Link>{" "}
              sayfasına bakınız.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">12. Metnin yürürlüğü ve güncellemeler</h2>
            <p>
              Platform özellikleri veya mevzuat değişiklikleri nedeniyle bu metin güncellenebilir. Önemli
              değişiklikler mümkün olduğunda sitede duyurulur. Güncel metin her zaman bu sayfada yayımlanır.
            </p>
          </section>

          <p className="rounded-lg border border-orange-200/90 bg-orange-50/50 p-4 text-xs leading-relaxed text-slate-700">
            <strong className="text-orange-950">Yürürlük:</strong> Bu metin{" "}
            <strong className="font-semibold text-slate-900">{canonicalHost}</strong> hizmeti için hazırlanmıştır.
            Ticari unvan, adres ve MERSİS için üretim ortamında{" "}
            <code className="rounded bg-white px-1 text-[11px]">LEGAL_ENTITY_*</code> değişkenlerini ve paneldeki
            iletişim metnini güncel tutunuz.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-xs font-medium text-slate-500">Last updated: {LAST_UPDATED_EN}</p>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">1. Introduction</h2>
            <p>
              This notice explains how the operator of the yapanolur.com marketplace (“we”, “us”) processes
              personal data when you use our listing, tender/bid and membership services. It is designed to
              align with Turkish Law no. 6698 on the Protection of Personal Data (“KVKK”), especially Article
              10. Additional agreements or consents (e.g. marketing) may apply alongside this notice.
            </p>
          </section>

          <DataControllerDisclosure
            lang="en"
            canonicalHost={canonicalHost}
            legal={legal}
            contactPublished={contactPublished}
            iletisimHref={iletisimHref}
          />

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">3. Categories of data</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Identity &amp; account:</strong> name, membership number, e-mail; tax/ID data where
                required for billing; profile photo.
              </li>
              <li>
                <strong>Contact:</strong> phone, province/district, address for invoicing or verification.
              </li>
              <li>
                <strong>Listing &amp; professional:</strong> profession, listing text and media, location
                fields you provide.
              </li>
              <li>
                <strong>Documents:</strong> optional uploads such as diploma, professional or tax documents.
              </li>
              <li>
                <strong>Security &amp; logs:</strong> session data, IP, device/browser signals, timestamps,
                anti-fraud records.
              </li>
              <li>
                <strong>Payments:</strong> transaction metadata with payment providers; card data is handled
                by the provider under its terms.
              </li>
              <li>
                <strong>Support &amp; preferences:</strong> support threads, notifications, e-mail opt-ins.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">4. Purposes</h2>
            <p>
              We process data to provide accounts, verify contact details, publish and display listings, run
              bids/tenders, process payments and credits, comply with law, secure the platform, improve the
              service, and—where you consent—to send marketing or informational messages.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">5. Legal bases (KVKK)</h2>
            <p>
              Processing relies on KVKK Articles 5 and 6, including where applicable: legal obligation,
              performance of a contract, establishment or performance of a contract, legitimate interests
              balanced against your rights, data made public by you, and explicit consent where required
              (including certain special categories).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">6. Recipients &amp; transfers</h2>
            <p>
              We may share data with hosting and infrastructure providers, messaging (e-mail/SMS) services,
              payment processors, professional advisers, and public authorities when legally required. If
              data is transferred outside Türkiye, we rely on KVKK Article 9 mechanisms (adequacy, safeguards,
              or consent as applicable).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">7. Retention</h2>
            <p>
              We keep data only as long as needed for the purposes above and as required by tax, accounting,
              or other applicable retention rules, then delete, destroy, or anonymise it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">8. Your rights</h2>
            <p>
              Under KVKK Article 11 you may request information, correction, deletion where applicable,
              information on third-country transfers, and object to certain automated outcomes, among other
              rights. You may also lodge a complaint with the Turkish Personal Data Protection Authority.
            </p>
            <p>
              Contact:{" "}
              <Link href={iletisimHref} className="font-medium text-orange-800 underline">
                Contact page
              </Link>
              . Official authority:{" "}
              <a href="https://www.kvkk.gov.tr" className="text-orange-800 underline" target="_blank" rel="noopener noreferrer">
                kvkk.gov.tr
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">9. Cookies</h2>
            <p>
              Essential cookies are used for session, security and signup verification. Preferences can be set via
              the bottom banner; optional third‑party client monitoring (Sentry) loads only if you choose{" "}
              <strong>Accept all</strong>. See the{" "}
              <Link href={cerezHref} className="font-medium text-orange-800 underline">
                Cookie policy
              </Link>{" "}
              for names, durations and storage keys.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">10. Changes</h2>
            <p>
              We may update this notice to reflect product or legal changes. The current version is always
              published on this page.
            </p>
          </section>

          <p className="rounded-lg border border-orange-200/90 bg-orange-50/50 p-4 text-xs leading-relaxed text-slate-700">
            <strong className="text-orange-950">Publication:</strong> This notice applies to the service at{" "}
            <strong className="font-semibold text-slate-900">{canonicalHost}</strong>. Set{" "}
            <code className="rounded bg-white px-1 text-[11px]">LEGAL_ENTITY_*</code> in production and keep the
            admin contact line current.
          </p>
        </div>
      )}
    </StaticSitePage>
  );
}

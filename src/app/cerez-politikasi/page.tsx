import Link from "next/link";
import StaticSitePage from "@/components/StaticSitePage";
import ResetCookiePreferencesButton from "@/components/ResetCookiePreferencesButton";
import { ADMIN_GATE_COOKIE } from "@/lib/adminGate";
import { COOKIE_CONSENT_CLIENT_COOKIE, COOKIE_CONSENT_STORAGE_KEY } from "@/lib/cookieConsent";
import { SIGNUP_EMAIL_COOKIE } from "@/lib/signupEmailProof";
import { SIGNUP_PHONE_COOKIE } from "@/lib/signupPhoneProof";
import { SUPPORT_VISITOR_COOKIE } from "@/lib/supportConstants";
import { getLang } from "@/lib/i18n";

type Props = {
  searchParams: Promise<{ lang?: string }>;
};

const LAST_UPDATED_TR = "1 Mayıs 2026";
const LAST_UPDATED_EN = "1 May 2026";

export default async function CerezPolitikasiPage({ searchParams }: Props) {
  const params = await searchParams;
  const lang = getLang(params.lang);
  const title = lang === "tr" ? "Çerez politikası" : "Cookie policy";

  return (
    <StaticSitePage lang={lang} title={title}>
      {lang === "tr" ? (
        <div className="space-y-6">
          <p className="text-xs font-medium text-slate-500">Son güncelleme: {LAST_UPDATED_TR}</p>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">1. Genel</h2>
            <p>
              Bu politika, yapanolur.com üzerinden sunulan ilan ve ihale/teklif platformunda çerez ve benzeri
              yerel depolama teknolojilerinin nasıl kullanıldığını açıklar. Zorunlu çerezler hizmetin güvenli
              şekilde çalışması için gereklidir. Üçüncü taraf hata izleme (Sentry) istemci tarafında yalnızca
              alt çubukta “Tümünü kabul et” seçildiğinde yüklenir; “Yalnızca zorunlu” seçildiğinde yüklenmez.
              Veri sorumlusunun kimlik bilgileri{" "}
              <Link href={`/kvkk?lang=${lang}`} className="font-medium text-orange-800 underline">
                KVKK aydınlatma metni
              </Link>{" "}
              ile uyumludur.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">2. Birinci taraf çerezler (tablo)</h2>
            <div className="overflow-x-auto rounded-xl border border-orange-100/90 bg-white/80">
              <table className="min-w-[640px] w-full border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-orange-200 bg-orange-50/90">
                    <th className="p-3 font-semibold text-orange-950">Ad</th>
                    <th className="p-3 font-semibold text-orange-950">Amaç</th>
                    <th className="p-3 font-semibold text-orange-950">Süre / kapsam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-orange-100">
                  <tr>
                    <td className="p-3 font-mono text-[11px] sm:text-xs">
                      <code>session_token</code>
                    </td>
                    <td className="p-3">
                      Oturum (giriş sonrası kimlik doğrulama).{" "}
                      <strong className="font-semibold text-orange-900">httpOnly</strong>, güvenlik için
                      JavaScript erişemez.
                    </td>
                    <td className="p-3 tabular-nums">
                      Yaklaşık 7 gün veya çıkış; <code>path=/</code>, <code>SameSite=Lax</code>.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-[11px] sm:text-xs">
                      <code>{SIGNUP_EMAIL_COOKIE}</code>
                    </td>
                    <td className="p-3">
                      Kayıt akışında e-posta OTP doğrulamasının tamamlandığını güvenli şekilde kanıtlamak.
                    </td>
                    <td className="p-3">Kısa ömürlü (JWT); kayıt tamamlanınca veya süre dolunca silinir.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-[11px] sm:text-xs">
                      <code>{SIGNUP_PHONE_COOKIE}</code>
                    </td>
                    <td className="p-3">Kayıt akışında telefon OTP doğrulamasını bağlamak.</td>
                    <td className="p-3">Kısa ömürlü (JWT); akış bitince veya süre dolunca silinir.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-[11px] sm:text-xs">
                      <code>{ADMIN_GATE_COOKIE}</code>
                    </td>
                    <td className="p-3">Yönetici giriş sayfasına ek koruma katmanı (gate).</td>
                    <td className="p-3">Sınırlı süre (JWT); yalnız ilgili giriş akışında.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-[11px] sm:text-xs">
                      <code>{SUPPORT_VISITOR_COOKIE}</code>
                    </td>
                    <td className="p-3">Üye olmadan destek sohbetinde konuşmayı oturuma bağlamak.</td>
                    <td className="p-3">Sunucu yapılandırmasına bağlı süre; oturum mantığında kullanılır.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-[11px] sm:text-xs">
                      <code>{COOKIE_CONSENT_CLIENT_COOKIE}</code>
                    </td>
                    <td className="p-3">
                      Çerez tercihinizi (<code>essential</code> veya <code>full</code>) hatırlamak.
                    </td>
                    <td className="p-3">
                      İsteğe bağlı; tercih kaydedildiğinde yaklaşık 400 gün, <code>SameSite=Lax</code>.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">3. Tarayıcı yerel depolama</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Tercih kaydı:</strong> Çerez bildirimi seçiminiz{" "}
                <code className="rounded bg-slate-100 px-1">{COOKIE_CONSENT_STORAGE_KEY}</code> anahtarıyla{" "}
                <code className="rounded bg-slate-100 px-1">localStorage</code> içinde tutulur.
              </li>
              <li>
                <strong>Panel:</strong> Kullanıcı panelinde bölüm sabitleme tercihleri{" "}
                <code className="rounded bg-slate-100 px-1">panelPin:…</code> anahtarlarıyla saklanabilir.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">4. Üçüncü taraf ve isteğe bağlı izleme</h2>
            <p>
              <strong>Sentry</strong> (yalnızca ortamda <code>NEXT_PUBLIC_SENTRY_DSN</code> tanımlıysa): İstemci
              tarafında hata raporlama için kullanılabilir ve “Tümünü kabul et” ile rıza vermediyseniz istemci
              SDK yüklenmez. Ödeme sağlayıcıları (Iyzico, PayTR vb.) ödeme sayfasına geçildiğinde kendi çerez /
              politikalarına tabidir.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">5. Tercihlerinizi yönetme</h2>
            <p>
              İlk ziyarette ekran altında gösterilen bildirimden seçim yapabilirsiniz. Sonradan tercihi sıfırlamak
              için:
            </p>
            <ResetCookiePreferencesButton lang={lang} />
            <p className="text-slate-600">
              Tarayıcı ayarlarından çerezleri silmek veya engellemek mümkündür; zorunlu çerezleri
              engellerseniz giriş veya kayıt adımları çalışmayabilir.
            </p>
          </section>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-xs font-medium text-slate-500">Last updated: {LAST_UPDATED_EN}</p>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">1. Overview</h2>
            <p>
              This policy describes cookies and similar technologies used on the yapanolur.com marketplace.
              Essential cookies are required for secure operation. Third‑party client error monitoring (Sentry)
              loads only if you choose <strong>Accept all</strong> in the bottom banner;{" "}
              <strong>Essential only</strong> skips the Sentry browser SDK. The identity of the data controller
              aligns with our{" "}
              <Link href={`/kvkk?lang=${lang}`} className="font-medium text-orange-800 underline">
                privacy notice
              </Link>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">2. First-party cookies</h2>
            <div className="overflow-x-auto rounded-xl border border-orange-100/90 bg-white/80">
              <table className="min-w-[640px] w-full border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-orange-200 bg-orange-50/90">
                    <th className="p-3 font-semibold text-orange-950">Name</th>
                    <th className="p-3 font-semibold text-orange-950">Purpose</th>
                    <th className="p-3 font-semibold text-orange-950">Duration / scope</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-orange-100">
                  <tr>
                    <td className="p-3 font-mono text-[11px] sm:text-xs">
                      <code>session_token</code>
                    </td>
                    <td className="p-3">
                      Session after login. <strong className="font-semibold text-orange-900">httpOnly</strong>{" "}
                      (not readable by page scripts).
                    </td>
                    <td className="p-3 tabular-nums">
                      ~7 days or logout; <code>path=/</code>, <code>SameSite=Lax</code>.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-[11px] sm:text-xs">
                      <code>{SIGNUP_EMAIL_COOKIE}</code>
                    </td>
                    <td className="p-3">Proves email OTP completion during registration.</td>
                    <td className="p-3">Short-lived JWT; cleared when signup completes or expires.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-[11px] sm:text-xs">
                      <code>{SIGNUP_PHONE_COOKIE}</code>
                    </td>
                    <td className="p-3">Binds phone OTP verification during registration.</td>
                    <td className="p-3">Short-lived JWT.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-[11px] sm:text-xs">
                      <code>{ADMIN_GATE_COOKIE}</code>
                    </td>
                    <td className="p-3">Extra gate cookie for admin login flows.</td>
                    <td className="p-3">Limited JWT lifetime.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-[11px] sm:text-xs">
                      <code>{SUPPORT_VISITOR_COOKIE}</code>
                    </td>
                    <td className="p-3">Associates anonymous support chat sessions.</td>
                    <td className="p-3">Server-defined lifetime.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-[11px] sm:text-xs">
                      <code>{COOKIE_CONSENT_CLIENT_COOKIE}</code>
                    </td>
                    <td className="p-3">
                      Remembers your choice (<code>essential</code> or <code>full</code>).
                    </td>
                    <td className="p-3">When set, ~400 days, <code>SameSite=Lax</code>.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">3. Local storage</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Consent record key <code className="rounded bg-slate-100 px-1">{COOKIE_CONSENT_STORAGE_KEY}</code>{" "}
                in <code className="rounded bg-slate-100 px-1">localStorage</code>.
              </li>
              <li>
                User panel section pins under <code className="rounded bg-slate-100 px-1">panelPin:…</code> keys.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">4. Third parties</h2>
            <p>
              <strong>Sentry</strong> (if <code>NEXT_PUBLIC_SENTRY_DSN</code> is set): optional client SDK only
              after <strong>Accept all</strong>. Payment providers apply their own cookies when you enter their
              payment flow.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">5. Managing preferences</h2>
            <p>Use the first-visit banner to choose. To change later:</p>
            <ResetCookiePreferencesButton lang={lang} />
            <p className="text-slate-600">
              You can also clear cookies in the browser; blocking essential cookies may break login or signup.
            </p>
          </section>
        </div>
      )}
    </StaticSitePage>
  );
}

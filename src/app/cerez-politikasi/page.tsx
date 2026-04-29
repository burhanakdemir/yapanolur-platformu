import StaticSitePage from "@/components/StaticSitePage";
import { getLang } from "@/lib/i18n";

type Props = {
  searchParams: Promise<{ lang?: string }>;
};

export default async function CerezPolitikasiPage({ searchParams }: Props) {
  const params = await searchParams;
  const lang = getLang(params.lang);
  const title = lang === "tr" ? "Çerez politikası" : "Cookie policy";

  return (
    <StaticSitePage lang={lang} title={title}>
      {lang === "tr" ? (
        <>
          <p>
            Bu site; oturum açma, güvenlik, tercihler ve (varsa) analitik için çerez ve benzeri
            teknolojiler kullanabilir. Zorunlu çerezler hizmetin çalışması için gereklidir; diğerleri için
            yasal dayanak ve tercih yönetimi operasyonunuza göre yapılandırılmalıdır.
          </p>
          <h2 className="text-lg font-semibold text-slate-900">Hangi çerezler?</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Oturum / kimlik doğrulama:</strong> güvenli giriş sonrası httpOnly oturum çerezi.
            </li>
            <li>
              <strong>Kayıt doğrulama:</strong> e-posta ve telefon OTP kanıtı için kısa ömürlü çerezler.
            </li>
            <li>
              <strong>Yönetici paneli (varsa):</strong> ek erişim veya güvenlik çerezleri.
            </li>
          </ul>
          <h2 className="text-lg font-semibold text-slate-900">Süre ve üçüncü taraflar</h2>
          <p>
            Oturum çerezleri çıkışta veya süre dolunca geçersiz olur. Ödeme, analitik veya destek
            sağlayıcıları kendi çerezlerini kullanıyorsa bu sayfa ve gerekirse “çerez tercih paneli” ile
            açıkça listelenmelidir.
          </p>
          <h2 className="text-lg font-semibold text-slate-900">Yönetim</h2>
          <p>
            Tarayıcı ayarlarından çerezleri silebilir veya engelleyebilirsiniz; zorunlu çerezleri
            kapatırsanız oturum veya kayıt adımları çalışmayabilir. Sorular için{" "}
            <a className="font-medium text-orange-800 underline" href={`/iletisim?lang=${lang}`}>
              İletişim
            </a>
            .
          </p>
        </>
      ) : (
        <>
          <p>
            We may use cookies and similar technologies for authentication, security, preferences, and
            optional analytics. Essential cookies are required for the service; configure consent for
            non-essential use according to your legal setup.
          </p>
          <h2 className="text-lg font-semibold text-slate-900">Types of cookies</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Session / auth:</strong> httpOnly session cookie after login.
            </li>
            <li>
              <strong>Signup verification:</strong> short-lived proof cookies for email/phone OTP.
            </li>
            <li>
              <strong>Admin (if applicable):</strong> additional access or security cookies.
            </li>
          </ul>
          <h2 className="text-lg font-semibold text-slate-900">Duration and third parties</h2>
          <p>
            Session cookies expire on logout or timeout. List third-party cookies from payments, analytics,
            or support widgets explicitly if you enable them.
          </p>
          <h2 className="text-lg font-semibold text-slate-900">Managing cookies</h2>
          <p>
            You can clear or block cookies in browser settings; blocking essential cookies may break login
            or registration. Questions:{" "}
            <a className="font-medium text-orange-800 underline" href={`/iletisim?lang=${lang}`}>
              Contact
            </a>
            .
          </p>
        </>
      )}
    </StaticSitePage>
  );
}

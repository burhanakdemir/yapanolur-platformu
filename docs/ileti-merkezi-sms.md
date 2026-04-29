# İleti Merkezi SMS — kullanıcı rehberi

İleti Merkezi JSON API’si yalnızca bir adres değildir; her istekte **API anahtarı** (panelde “kullanıcı”), **gizli anahtar** (HMAC / “şifre”) ve **onaylı gönderici başlığı** gerekir. Bu projede bu bilgiler **iki ayrı yönetici ekranına** ve isteğe bağlı **ortam değişkenlerine** yazılır.

## Veritabanı ve Prisma (Unknown field hatası)

`AdminSettings` modelinde `iletiMerkeziUser`, `iletiMerkeziPass`, `iletiMerkeziSender` sütunları `prisma/migrations/20260427130000_ileti_merkezi_json_admin` migration’ı ile eklenir. Repoyu çektikten veya yeni bir ortam kurduktan sonra:

1. **Migration uygula:** `npm run db:migrate` (`prisma migrate deploy` — üretim ve mevcut DB’ler için). Geliştirirken yeni migration üretmek için: `npm run db:migrate:dev` veya `npx prisma migrate dev`.
2. **Prisma Client üret:** `npx prisma generate` (`npm install` sırasında `postinstall` da `prisma generate` çalıştırır).

`Unknown field 'iletiMerkeziUser' ... on model 'AdminSettings'` hatası: migration uygulanmamış veya `prisma generate` güncel şema ile çalıştırılmamış demektir. `npm run build` üretimde migrate + generate + next build zincirini zaten içerir.

**Not:** `/api/admin/ileti-merkezi-json` kayıt ve okuma ile `sendIletiMerkeziJsonSms` DB kimliği, Prisma model alanlarına takılmamak için **doğrudan SQL** (`$queryRaw` / `$executeRaw`) kullanır; yine de tür güvenliği ve diğer modüller için `npx prisma generate` güncel tutulmalıdır.

## İki panelin farkı

| | **İleti Merkezi JSON SMS (genel)** | **Kayıt telefon SMS** |
|---|-----------------------------------|------------------------|
| **Yol** | `/admin/ileti-merkezi-json` (süper yönetici) | `/admin/signup-sms-provider` (süper yönetici) |
| **Ne için?** | Kodda `sendIletiMerkeziJsonSms` ile çağrılan **genel** SMS (ör. admin test, ileride diğer modüller). | **Üyelik kayıt** akışında, e-posta doğrulandıktan sonra giden **telefon OTP** SMS’i. |
| **Veritabanı alanları** | `iletiMerkeziUser`, `iletiMerkeziPass`, `iletiMerkeziSender` | `signupIletiMerkeziEnabled` + `signupIletiMerkeziApiKey`, `signupIletiMerkeziApiSecret`, `signupIletiMerkeziSender` |
| **.env yedeği** | `ILETI_MERKEZI_USER`, `ILETI_MERKEZI_PASS`, `ILETI_MERKEZI_SENDER` | Kayıt SMS tarafında doğrudan bu üç env yok; yedek **Twilio** (`TWILIO_*`) veya **HTTP webhook** tanımlanabilir. |

Aynı İleti hesabını her iki panelde de kullanabilirsiniz; alan isimleri farklıdır, değerleri aynı girebilirsiniz. **Biri dolu olsa bile diğeri otomatik paylaşılmaz** — kullanacağınız akışa göre her iki yeri de doldurmanız gerekir (veya sadece kullandığınız akışı doldurun).

---

## Panel ile `.env` önceliği

### Genel JSON SMS — `sendIletiMerkeziJsonSms`

- **Süper yönetici** ekranında *Kullanıcı + Şifre + Gönderici* üçünün de **dolu** olduğu bir kayıt varsa, kimlik **veritabanından** okunur.
- Bu üçünü veritabanında tam sağlayamıyorsanız, **`ILETI_MERKEZI_USER`**, **`ILETI_MERKEZI_PASS`**, **`ILETI_MERKEZI_SENDER`** ortam değişkenleri kullanılır.
- Öncelik mantığı: `resolveIletiMerkeziJsonCredentials` önce DB, sonra env (`src/lib/iletMerkeziJsonSms.ts`).

`sendIletiMerkeziJsonSms` içinde, `options.prisma` verilmeden çağrılırsa yalnızca env (ve isteğe bağlı `options.credentials`) devreye girer; hem prisma hem env verilmişse çözümleme yine aynı dosyadaki sıraya göredir.

### Kayıt telefon OTP — `sendSignupSmsOtpDispatch`

Üyelik formunda “Telefona kod gönder” dendiğinde devreye giren dağıtıcı `sendSignupSmsOtpDispatch`’tir (`src/lib/signupSmsDispatch.ts`). **Öncelik sırası:**

1. **İleti Merkezi** — *Kayıt SMS* panelinde “İleti Merkezi” açık ve API anahtarı + gizli + gönderici doluysa.
2. **Genel HTTP(S) webhook** — panelde etkin ve URL tanımlıysa.
3. **Twilio** — `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` hepsi doluysa.
4. **SMS yok (günlük / geliştirme)** — üretimde `SIGNUP_OTP_ALLOW_LOG_FALLBACK` açık değilse istek **reddedilebilir**; ayrıntı için o paneldeki metin.

Bu zincir, **`/admin/ileti-merkezi-json` veya `ILETI_MERKEZI_*` env ile otomatik bağlanmaz**; kayıt SMS için mutlaka **Kayıt telefon SMS** ekranını (veya sıradaki yöntemleri) yapılandırın.

---

## Nereye ne yazmalıyım? (kısa)

**Genel İleti SMS + .env yedeği**

- Panel: **Admin → İleti Merkezi JSON SMS** (`/admin/ileti-merkezi-json`): Kullanıcı (API anahtarı), Şifre (gizli), Gönderici.
- İsteğe bağlı: `.env` → `ILETI_MERKEZI_USER`, `ILETI_MERKEZI_PASS`, `ILETI_MERKEZI_SENDER` (reponun `.env.example` dosyasına bakın).

**Sadece üyelik telefon kodu**

- Panel: **Admin → Kayıt telefon SMS** (`/admin/signup-sms-provider`): İleti Merkezi bölümünde etkinleştirme + API anahtarı + gizli + gönderici; veya aynı sayfada HTTP webhook / Twilio.

---

## “Kaydet” ve test

- **`/admin/ileti-merkezi-json`**: Formda **Kaydet**; aşağıda **Test SMS gönder** ile telefona test (sunucu `PUT` ile `sendIletiMerkeziJsonSms` çağırır). Env kullanımı ekranda kısaca (✓/—) gösterilebilir.
- **`/admin/signup-sms-provider`**: **Kaydet**; **Test gönderimi** bölümünde numara → **Test SMS** (kayıt SMS kanallarını dener, gerçek OTP değil).

Gizli anahtarı ilk kez veya değiştirince, ilgili panelde **yeni değeri yazıp Kaydet** demeniz gerekir; sadece boş bırakırsanız sunucudaki eski gizli korunur (o panelin metnine uygun).

---

## Kod referansı (özet)

- Genel SMS kimlik ve env önceliği: `src/lib/iletMerkeziJsonSms.ts` (`resolveIletiMerkeziJsonCredentials`, `sendIletiMerkeziJsonSms`).
- Kayıt OTP gönderim sırası: `src/lib/signupSmsDispatch.ts` — `sendSignupSmsOtpDispatch` yorumu ve `imOn` / `httpOn` / Twilio dalları.
- Fiziksel API çağrısı (JSON gövde, HMAC, `sendDateTime` vb.): `src/lib/iletMerkeziSignupSms.ts` (`sendIletiMerkeziSignupOtp`); hem genel hem kayıt akışı bu modülü kullanır, kimlik farklı ayarlardan beslenir.

---

## Erişim

Her iki ekran da **süper yönetici** (`SUPER_ADMIN`) oturumu gerektirir. Menüde hızlı linkler: **İleti SMS**, **Kayıt SMS**; ana “Ödeme & vitrin” bölümünde ilgili kartlar bulunur.

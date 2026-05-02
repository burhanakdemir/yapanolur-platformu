# Android kabuğu (Capacitor)

Next.js uygulaması **değiştirilmez**; bu klasör yalnızca **Google Play** için WebView kabuğudur. Ağ trafiği varsayılan olarak **`https://yapanolur.com`** adresine gider.

## Gereksinimler

- [Android Studio](https://developer.android.com/studio) (SDK, platform tools)
- JDK 17+ (Android Studio ile gelir)
- Node.js (repo kökünden `npm install`)

## Ortam değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `CAPACITOR_SERVER_URL` | WebView yükü (ör. `https://192.168.1.5:3000` yerel test). Boşsa `https://yapanolur.com`. |
| `CAPACITOR_ALLOW_CLEARTEXT=1` | Yalnızca **HTTP** testi; `capacitor.config.ts` içinde `cleartext: true` olur. Üretimde kullanmayın. |

## İlk kurulum (bir kez)

Repo kökünden:

```bash
npm install
npx cap add android
npx cap sync android
```

`mobile/android` oluşmazsa: `npx cap add android` çıktısını kontrol edin.

## Geliştirme

```bash
npm run mobile:sync
npm run mobile:open:android
```

Android Studio’da cihaz/emülatör seçip **Run**.

## Release `.aab` (Play Console)

1. **Keystore** (commit etmeyin):  
   `keytool -genkey -v -keystore yapanolur-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias yapanolur`
2. Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle**.
3. Keystore yolunu ve şifreleri girin; **release** derleyin.
4. Oluşan `.aab` dosyasını Play Console’a yükleyin. **Play App Signing** açık önerilir; upload key’i siz yönetirsiniz.

Gizli anahtar, parola ve `yapanolur-release.jks` **asla** repoya eklenmemelidir.

## Yapma listesi (web’i bozmama)

- `src/app`, `middleware`, `next.config` üzerinde “Capacitor için” kalıcı değişiklik yapmayın; site normal tarayıcı + mobil WebView’da aynı URL’den çalışmalıdır.
- Ödeme ve `window.open` WebView’da farklı davranabilir; `docs/mobile-capacitor.md` risk bölümüne bakın.

## İsteğe bağlı CI

Bu repo `.aab` üretimini zorunlu tutmaz. İsterseniz ayrı bir workflow’da `gradlew bundleRelease` + imzalama (GitHub Secrets) tanımlanabilir.

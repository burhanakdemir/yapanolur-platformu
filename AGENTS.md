<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Windows / LAN dev ve bundler

- `npm run dev` ve `run-dev-lan.cjs` **Windows’ta varsayılan olarak `--webpack`** kullanır (`run-dev-plain.cjs` ile aynı mantık: Turbopack + Prisma/pg + bazı yollarda HMR panikleri azaltılır).
- **Turbopack** zorlamak için: `NEXT_DEV_TURBOPACK=1` (veya `true`) ile `npm run dev`.
- **Webpack** açıkça: `NEXT_DEV_WEBPACK=1` (Win’de zaten varsayılan; diğer OS’ta zorlamak için kullanılır).
- Turbopack hatası örneği: `FATAL: Turbopack error`, `Failed to write app endpoint …`, `Next.js package not found` → `npm run clean` (`.next` siler), sunucuyu kapatıp yeniden `npm run dev`; gerekirse sadece HTTP: `npm run dev:plain` veya `npm run dev:http`.
- Kalıcı “ürün hızı” kıyası: `next build` + `next start` (dev her zaman daha ağırdır).

## E-posta (profil bildirimleri)

- Profil sahibine **yeni yorum** ve **beğeni/olumsuz oy** bildirimi: `src/lib/memberProfileNotificationEmail.ts` (`sendTransactionalEmail`; SMTP yoksa API yine başarılı kalır).
- Tümünü kapatmak için: **`MEMBER_PROFILE_EMAIL_NOTIFY=0`** (veya `false` / `off`).

## GitHub / uzaktan gönderim

- **`git push`**, uzak repoya branch gönderme, **PR açma** veya eşdeğer uzaktan yayın adımlarını yalnızca kullanıcı **açıkça onay verdiyse** yap. Onay yoksa değişiklikleri yerelde bırak; gerekirse commit mesajı veya diff özeti öner, push etme.

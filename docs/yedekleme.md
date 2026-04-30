# Veritabanı ve üretim yedekleme

Uygulama **PostgreSQL** kullanır (`DATABASE_URL`). Mimari özeti: **`docs/veritabani-ortamlar.md`**.

---

## Yerel (Docker)

`docker-compose.yml` ile açılan volume (`ilan_pgdata`) veritabanı dosyalarını saklar. Tam yedek için:

- Konteyner çalışırken: `pg_dump` ile mantıksal döküm (önerilir), veya
- Docker volume’ünü periyodik olarak dosya sistemi seviyesinde yedekleyin.

Örnek (PowerShell / bash, parolayı `.env` ile uyumlu verin):

```bash
pg_dump "postgresql://ilan:ilan@127.0.0.1:5432/ilan_dev" -Fc -f backups/ilan-dev-YYYYMMDD.dump
```

---

## Üretim yedekleme politikası (özet)

| Ortam | Ana kaynak | Politika |
|--------|------------|----------|
| **Yönetilen PostgreSQL** (Neon, RDS, Supabase, …) | `DATABASE_URL` | Sağlayıcının otomatik yedek + mümkünse PITR; ek olarak periyodik `pg_dump` farklı bölgeye. |
| **Kendi sunucunuzda PostgreSQL** | Aynı | `pg_dump` + zamanlama + şifreli uzak depolama. |

### Uygulama dışı varlıklar

- **S3/Cloud storage** sağlayıcılarında: sürümleme ve yaşam döngüsü kurallarını açın.
- **Gizli anahtarlar:** Veritabanı yedeği yetmez; `AUTH_SECRET` ve API anahtarları güvenli kasada tutulur.

---

## Özet

| Yer | Eylem |
|-----|--------|
| **Yerel** | `pg_dump` veya volume yedek; `backups/` git’e konmaz. |
| **Üretim** | Yönetilen DB yedekleri + isteğe bağlı `pg_dump`; RPO/RTO ve yıllık kurtarma testi. |

# Category Import Fixtures

Bu klasor, `scripts/import-categories-from-sqlite-export.ts` icin manuel test fixture'larini icerir.

## Kullanim

1. Istedigin fixture dosyasini `yedek/category-export-from-sqlite.json` yoluna kopyala.
2. Once dry-run:
   - `npx tsx scripts/import-categories-from-sqlite-export.ts --dry-run`
3. Sonra gercek import:
   - `npx tsx scripts/import-categories-from-sqlite-export.ts`
4. Gerekirse image zorla guncelleme:
   - `npx tsx scripts/import-categories-from-sqlite-export.ts --force-image-update`

## Senaryolar

- `01-baseline-tree.json`: mevcut agac + alt kategori resimleri (baseline).
- `02-add-new-subcategory.json`: var olan parent altina yeni alt kategori ekleme.
- `03-add-image-to-empty-subcategory.json`: image'i bos alt kategoriye image ekleme.
- `04-conflict-slug-fallback.json`: id farkli ama slug ayni kayit ile deterministic eslesme.
- `05-idempotency-same-input.json`: ayni dosyayi iki kez calistirinca duplicate olusmama.

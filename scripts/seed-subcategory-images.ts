/**
 * Tüm alt kategorilere (parentId dolu) isimle uygun Unsplash gorseli atar.
 * Mevcut imageUrl uzerine yazar; daha iyi eslestirme icin tekrar calistirilabilir.
 * Calistir: npx tsx scripts/seed-subcategory-images.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

/** Tematik Unsplash gorselleri (auto=format&fit=crop&w=640&q=80). */
const U = {
  blueprint: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=640&q=80",
  site: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=640&q=80",
  crane: "https://images.unsplash.com/photo-1590644365607-1c5a8d4a0e0e?auto=format&fit=crop&w=640&q=80",
  excavator: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=640&q=80",
  concrete: "https://images.unsplash.com/photo-1541976590-713941ab7b3c?auto=format&fit=crop&w=640&q=80",
  steel: "https://images.unsplash.com/photo-1504917595217-d0023a3c7463?auto=format&fit=crop&w=640&q=80",
  welding: "https://images.unsplash.com/photo-1504917595217-d0023a3c7463?auto=format&fit=crop&w=640&q=80",
  electrical: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=640&q=80",
  panel: "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=640&q=80",
  plumbing: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=640&q=80",
  hvac: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=640&q=80",
  duct: "https://images.unsplash.com/photo-1565008576549-57b0b8a0a0b0?auto=format&fit=crop&w=640&q=80",
  paint: "https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?auto=format&fit=crop&w=640&q=80",
  floor: "https://images.unsplash.com/photo-1581858726788-75bc0f1a4c35?auto=format&fit=crop&w=640&q=80",
  tile: "https://images.unsplash.com/photo-1615529328331-f8917597711f?auto=format&fit=crop&w=640&q=80",
  roof: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=640&q=80",
  landscape: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=640&q=80",
  survey: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=640&q=80",
  theodolite: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=640&q=80",
  drilling: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=640&q=80",
  soil: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=640&q=80",
  lab: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=640&q=80",
  it: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=640&q=80",
  meeting: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=640&q=80",
  safety: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=640&q=80",
  fire: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=640&q=80",
  solar: "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=640&q=80",
  wind: "https://images.unsplash.com/photo-1532601224476-15c042f9a57b?auto=format&fit=crop&w=640&q=80",
  road: "https://images.unsplash.com/photo-1519817914152-22d216bb9179?auto=format&fit=crop&w=640&q=80",
  bridge: "https://images.unsplash.com/photo-1545558014-19807bcea28b?auto=format&fit=crop&w=640&q=80",
  tunnel: "https://images.unsplash.com/photo-1516937941344-00b4e0331252?auto=format&fit=crop&w=640&q=80",
  dam: "https://images.unsplash.com/photo-1432405972618-c60b022a0956?auto=format&fit=crop&w=640&q=80",
  marine: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=640&q=80",
  rail: "https://images.unsplash.com/photo-1474487548417-781cb714cbcc?auto=format&fit=crop&w=640&q=80",
  airport: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=640&q=80",
  port: "https://images.unsplash.com/photo-1566438480900-0609be27a4be?auto=format&fit=crop&w=640&q=80",
  elevator: "https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?auto=format&fit=crop&w=640&q=80",
  wood: "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=640&q=80",
  glass: "https://images.unsplash.com/photo-1496307653780-47ee926d7e40?auto=format&fit=crop&w=640&q=80",
  pool: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=640&q=80",
  waterTreatment: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=640&q=80",
  gas: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=640&q=80",
  acoustic: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=640&q=80",
  insulation: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=640&q=80",
  automation: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=640&q=80",
  chemical: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=640&q=80",
  mining: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=640&q=80",
  environment: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=640&q=80",
  energy: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=640&q=80",
  default: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=640&q=80",
};

/** Once en ozel kalıplar (ilk eslesen kullanilir). */
const RULES: { test: RegExp; url: string }[] = [
  { test: /güneş|ges|solar|fotovoltaik|pv\b/i, url: U.solar },
  { test: /rüzgar|res|türbin|wind/i, url: U.wind },
  { test: /hidro|baraj|dam|nehir enerji/i, url: U.dam },
  { test: /nükleer|termik|santral|enerji üret|kojenerasyon/i, url: U.energy },
  { test: /demiryolu|metro|tren|raylı|vagon/i, url: U.rail },
  { test: /havalimanı|uçak|terminal havacılık| apron/i, url: U.airport },
  { test: /liman|iskele|deniz|marine|gemi|port\b/i, url: U.marine },
  { test: /otoyol|karayolu|yol yap|asfalt|kavşak/i, url: U.road },
  { test: /köprü|bridge|viyadük/i, url: U.bridge },
  { test: /tünel|tunnel/i, url: U.tunnel },
  { test: /maden|ocak|kazı maden|yeraltı/i, url: U.mining },
  { test: /kimya|proses|reaktör|petrokimya/i, url: U.chemical },
  { test: /arıtma|atık su|wwtp|çamurla|deşarj/i, url: U.waterTreatment },
  { test: /havuz|yüzme|hidrolik test/i, url: U.pool },
  { test: /doğalgaz|gaz tesisat|kombi|brülör/i, url: U.gas },
  { test: /asansör|elevator|yürüyen merdiven/i, url: U.elevator },
  { test: /yangın|sprinkler|fire|söndür/i, url: U.fire },
  { test: /akustik|ses yalıt|akustik/i, url: U.acoustic },
  { test: /yalıtım|isolasyon|ısı yalıt|mantolama/i, url: U.insulation },
  { test: /otomasyon|scada|plc|kontrol sistem|bms\b/i, url: U.automation },
  { test: /elektrik|elektriksel|kablo|pan|aydınlat|led|motor elektrik/i, url: U.electrical },
  { test: /tesisat|sıhhi|sihhi|su tesisat|boru|sifon|musluk/i, url: U.plumbing },
  { test: /mekanik|havalandır|klima|vrf|chiller|ısı pomp/i, url: U.hvac },
  { test: /kanal|duct|menfez/i, url: U.duct },
  { test: /boya|badana|dekor|sıva üst|kaplama dekor/i, url: U.paint },
  { test: /zemin|şap|epoksi|parke|seramik|fayans|döşeme/i, url: U.floor },
  { test: /fayans|karo|tile/i, url: U.tile },
  { test: /çatı|roof|oluk|membran/i, url: U.roof },
  { test: /peyzaj|bahçe|çim|bitkilendir/i, url: U.landscape },
  { test: /çevre|ÇED|eia|rehabilitasyon|erozyon/i, url: U.environment },
  { test: /harita|kadastro|ölçüm|GNSS|GPS|fotogrametri|drone|lidar|ölçü/i, url: U.survey },
  { test: /jeoloji|jeoteknik|sondaj|kazık|zemin etüt|zet|triazyel/i, url: U.drilling },
  { test: /hidrojeoloji|yeraltı su|kuyu/i, url: U.soil },
  { test: /zorunlu etüt|etüt rapor/i, url: U.blueprint },
  { test: /laboratuvar|test\b|kalibrasyon|numune/i, url: U.lab },
  { test: /yazılım|yazilim|bim\b|cad\b|bilgisayar|yazılı|network|fiber optik/i, url: U.it },
  { test: /proje yönet|danışman|danisman|keşif|keşif|ihale doküman/i, url: U.meeting },
  { test: /iş güven|is guven|İSG|HSE|baret|iş kıyaf/i, url: U.safety },
  { test: /kaynak|çelik yap|çelik konstr|metal konstr/i, url: U.welding },
  { test: /çelik|demir|kafes|prefabrik çelik/i, url: U.steel },
  { test: /beton|armatür|precast|hazır beton/i, url: U.concrete },
  { test: /kaba inşaat|yapı|insaat|şantiye|iskele/i, url: U.site },
  { test: /hafriyat|kazı|ekskavatör|yükleyici/i, url: U.excavator },
  { test: /vinç|crane|monoray/i, url: U.crane },
  { test: /ahşap|ağaç|doğrama|marangoz/i, url: U.wood },
  { test: /cam|cephe|curtain wall|skylight/i, url: U.glass },
  { test: /tadilat|restorasyon|onarım|güçlendirme/i, url: U.paint },
  { test: /statik|deprem|yapısal analiz|mimari proje/i, url: U.blueprint },
  { test: /endüstri|fabrika|üretim hatt/i, url: U.site },
];

const POOL_FALLBACK = Object.values(U);

function pickUrl(name: string): string {
  const n = name.normalize("NFC");
  for (const { test, url } of RULES) {
    if (test.test(n)) return url;
  }
  let h = 0;
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) | 0;
  return POOL_FALLBACK[Math.abs(h) % POOL_FALLBACK.length];
}

async function main() {
  const subs = await prisma.category.findMany({
    where: { parentId: { not: null } },
    select: { id: true, name: true },
  });
  let updated = 0;
  for (const c of subs) {
    const url = pickUrl(c.name);
    await prisma.category.update({
      where: { id: c.id },
      data: { imageUrl: url },
    });
    updated++;
  }
  console.log(`Guncellenen alt kategori: ${updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

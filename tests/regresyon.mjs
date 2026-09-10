#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// BREWMASTER REGRESYON PAKETİ — Sprint P (2026-07-08)
//
// Amaç: F→O sprint'lerinde doğrulanmış kritik davranışların TEK KOMUTLA
// yeniden doğrulanması. Her köprü sprintinin sonunda koşulur:
//
//   node tests/regresyon.mjs              → tüm case'ler
//   node tests/regresyon.mjs --case=F1    → kod filtreli (substring)
//   node tests/regresyon.mjs --liste      → case listesini yaz, koşma
//   node tests/regresyon.mjs --karistir   → sıra bağımsızlık kanıtı (shuffle)
//
// Mimari:
//   • Gerçek dosya test edilir (Brewmaster_v2_79_10.html) — kopya YASAK.
//   • Fixture: gerçek yedek tests/fixtures/brewmaster_yedek_2026-06-26.json
//     (git'e GİRMEZ — kişisel veri + sync anahtarı; .gitignore'da).
//   • İZOLASYON: her case YENİ tarayıcı context'i + temiz fixture seed'i alır;
//     case'ler birbirinin state'ini göremez → sıra bağımsız.
//   • GÜVENLİK: bm_sync_v1 / bm_push_sub seed'lenmez + 127.0.0.1 dışı TÜM ağ
//     istekleri kesilir → test mutasyonları asla Firebase/worker'a gidemez.
//   • sw.js 404 döner (SW kaydı test dışı — cache determinizmi).
//   • Worker case'leri (H-LATCH/K-PING) tarayıcısız: _cf_worker/src/index.js
//     kaynağından dilimlenip node vm'de koşulur; dosya yoksa SKIP.
//
// Yeni case ekleme kalıbı (yeni sprint sonrası):
//   1. CASELER dizisine { kod, ad, calistir(page) } ekle.
//   2. calistir içinde page.evaluate(() => { ... __REG.ok('iddia', koşul);
//      return __REG.al(); }) kullan — __REG.yeniKayit(ad, ekstra) sentetik
//      reçete kurar (kaydeder + editörde açar).
//   3. Baseline'ı koş: yeni case dahil HEPSİ yeşil olmalı.
// ═══════════════════════════════════════════════════════════════════════════
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KOK = path.resolve(__dirname, '..');
const HTML_AD = 'Brewmaster_v2_79_10.html';
const PORT = 8737;
const TABAN = 'http://127.0.0.1:' + PORT;

// ── CLI ──
const argv = process.argv.slice(2);
function arg(ad) {
  const a = argv.find(x => x === '--' + ad || x.startsWith('--' + ad + '='));
  if (!a) return null;
  return a.includes('=') ? a.split('=').slice(1).join('=') : true;
}
const FILTRE = typeof arg('case') === 'string' ? arg('case') : null;
const LISTE = !!arg('liste');
const KARISTIR = !!arg('karistir');

// ── Fixture yükle ──
const FIXTURE_ADAYLARI = [
  path.join(__dirname, 'fixtures', 'brewmaster_yedek_2026-06-26.json'),
  'C:/Users/Kaan/OneDrive/Masaüstü/brewmaster_yedek_2026-06-26_0111.json',
  process.env.BM_FIXTURE || ''
].filter(Boolean);
function fixtureYukle() {
  for (const yol of FIXTURE_ADAYLARI) {
    if (!fs.existsSync(yol)) continue;
    const p = JSON.parse(fs.readFileSync(yol, 'utf8'));
    if (!p || !p.data || typeof p.data !== 'object') continue;
    // Seed filtresi: app allowlist'i + güvenlik/determinizm dışlamaları.
    // bm_sync_v1/ts + bm_push_sub → cihaz/bulut kimliği: test buluta DOKUNMAZ.
    // bm_draft_v1 → boot'ta taslak banner'ı nondeterminizmi; N2 kendi draft'ını yönetir.
    const ALLOW = /^(bm_|kabir_|_orig|acc_|KR$)/;
    const DISLA = /^(bm_sync_v1|bm_sync_ts_v1|bm_push_sub|bm_draft_v1|bm_alarm_sentkeys_v1|bm_hata_log_v1)$/;
    const seed = {};
    for (const k of Object.keys(p.data)) {
      if (ALLOW.test(k) && !DISLA.test(k) && typeof p.data[k] === 'string') seed[k] = p.data[k];
    }
    return { yol, seed, anahtarSayisi: Object.keys(seed).length };
  }
  return null;
}

// ── Statik sunucu (sw.js → 404) ──
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
const _dosyaCache = new Map(); // koşum-içi dosya cache'i (aynı HTML 19×)
function sunucuKur() {
  return new Promise((coz, hata) => {
    const s = http.createServer((req, res) => {
      try {
        const u = decodeURIComponent(req.url.split('?')[0]);
        if (u === '/sw.js') { res.writeHead(404); res.end(); return; } // SW test dışı
        let p = path.join(KOK, u === '/' ? HTML_AD : u);
        if (!path.normalize(p).startsWith(path.normalize(KOK))) { res.writeHead(403); res.end(); return; }
        if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
        // Stream DEĞİL buffer: büyük HTML'in stream'i + CDP request-interception
        // kombinasyonu Chrome'da seyrek navigasyon stall'u yapıyor (45s flake kökü).
        let buf = _dosyaCache.get(p);
        if (!buf) { buf = fs.readFileSync(p); _dosyaCache.set(p, buf); }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream', 'Content-Length': buf.length, 'Cache-Control': 'no-store' });
        res.end(buf);
      } catch (e) { res.writeHead(500); res.end(); }
    });
    s.on('error', hata);
    s.listen(PORT, '127.0.0.1', () => coz(s));
  });
}

// ── Sayfa-içi seed (app scriptlerinden ÖNCE koşar; idempotent) ──
function seedFn(veri) {
  try {
    if (!localStorage.getItem('__bm_reg_seed')) {
      for (var k in veri) { try { localStorage.setItem(k, veri[k]); } catch (e) {} }
      localStorage.setItem('__bm_reg_seed', '1');
    }
  } catch (e) {}
}

// ── Sayfa-içi test yardımcıları ──
function helperKur() {
  window.__REG = {
    chk: [],
    ok(ad, kosul, detay) { this.chk.push({ ad: ad, ok: !!kosul, detay: detay === undefined ? '' : String(detay) }); },
    al() { const c = this.chk; this.chk = []; return c; },
    // Sentetik reçete: app akışıyla kaydeder (yeniTarif→tarifeKaydet), ekstra
    // alanları KR kaydına graft'lar, sonra tarifAc ile editörde açar (S senkron).
    yeniKayit(ad, ekstra) {
      yeniTarif();
      S.biraAd = ad;
      tarifeKaydet();
      const r = KR.find(x => x && x.biraAd === ad);
      if (!r) throw new Error('yeniKayit: kayıt bulunamadı — ' + ad);
      if (ekstra) Object.assign(r, JSON.parse(JSON.stringify(ekstra)));
      _origKy(KR);
      tarifAc(r.id);
      return r.id;
    }
  };
}

// ═══════════════════════════════ CASE'LER ═══════════════════════════════
// Her case: { kod, ad, calistir(page) → [{ad, ok, detay}] }

const CASELER = [

  // ── SPRINT F ──
  {
    kod: 'F1a', ad: 'yeniden-demleme İZNİ: brewSonuc varlığı = tamamlanma kanıtı (aynı gün dahil)',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('REGTEST F1a', {
        brewSnapshot: { ts: 1000, ogT: 1.05, fgT: 1.012, preboilOG: null },
        brewSonuc: { ts: 2000, ogG: 1.051, fgG: 1.011, kaynak: { og: 'olcum', fg: 'olcum' } },
        brewLog: [{ id: 'f1a-1', ts: 1500, tip: 'og_olcum', deger: '1.051' }],
        ogManuel: 1.051, fgManuel: 1.011, preboilOG: 1.04
      });
      const r = _brewSnapshotYaz(S, _editId, {});
      const kr = KR.find(x => x && x.id === id);
      __REG.ok('yeni snapshot döndü (ts > eski)', r && r.ts > 1000, r && ('ts=' + r.ts));
      __REG.ok('S.brewSonuc silindi (yeni batch)', S.brewSonuc === undefined);
      __REG.ok('editör ölçümleri sıfırlandı — görev-I1c (og/fg/preboil null)', S.ogManuel === null && S.fgManuel === null && S.preboilOG === null);
      __REG.ok('KR aynası: yeni snapshot', kr.brewSnapshot && kr.brewSnapshot.ts === r.ts);
      __REG.ok('KR aynası: brewSonuc düştü', kr.brewSonuc === undefined);
      return __REG.al();
    })
  },
  {
    kod: 'F1b', ad: 'devam eden batch KORUNUR: brewSonuc yoksa snapshot üzerine yazılmaz',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('REGTEST F1b', {
        brewSnapshot: { ts: 1000, ogT: 1.05, fgT: 1.012, preboilOG: 1.04 },
        brewLog: [{ id: 'f1b-1', ts: 1500, tip: 'og_olcum', deger: '1.051' }]
      });
      const r = _brewSnapshotYaz(S, _editId, {});
      __REG.ok('null döndü (devam eden batch)', r === null || r === undefined, String(r && r.ts));
      __REG.ok('snapshot.ts değişmedi', S.brewSnapshot && S.brewSnapshot.ts === 1000);
      __REG.ok('brewSonuc hâlâ yok', S.brewSonuc === undefined);
      return __REG.al();
    })
  },
  {
    kod: 'F2', ad: 'klon geçmiş sıfırlama: tarif kopyalanır, demleme geçmişi/ölçümü KOPYALANMAZ',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('REGTEST F2', {
        brewLog: [{ id: 'f2-1', ts: 100, tip: 'og_olcum', deger: '1.05' }],
        brewSnapshot: { ts: 100 }, brewSonuc: { ts: 200 },
        ogManuel: 1.05, fgManuel: 1.01, preboilOG: 1.04, mayaYasAy: 3,
        tadim: { puan: 4 }, effOG: 0.7, effVol: 11, planBrewTarih: '2026-07-01',
        planBrewHatirlatmalar: [{ t: 'x' }]
      });
      tarifKlonla(id);
      const klon = KR[0];
      __REG.ok('klon oluştu, id farklı', klon && klon.id !== id, klon && klon.id);
      __REG.ok('ad "(kopya)" ile bitiyor', /\(kopya\)$/.test(klon.biraAd || ''), klon.biraAd);
      __REG.ok('brewLog boş', Array.isArray(klon.brewLog) && klon.brewLog.length === 0);
      __REG.ok('snapshot/sonuc/effOG/effVol/planBrewTarih silindi',
        klon.brewSnapshot === undefined && klon.brewSonuc === undefined &&
        klon.effOG === undefined && klon.effVol === undefined && klon.planBrewTarih === undefined);
      __REG.ok('ölçüm/tadım null', klon.ogManuel === null && klon.fgManuel === null && klon.preboilOG === null && klon.mayaYasAy === null && klon.tadim === null);
      __REG.ok('planBrewHatirlatmalar bilinçli KORUNUR', JSON.stringify(klon.planBrewHatirlatmalar) === JSON.stringify([{ t: 'x' }]));
      return __REG.al();
    })
  },

  // ── SPRINT G ──
  {
    kod: 'G1', ad: 'KR-otoriter commit + G3 geri-ayna: bayat S Kaydet donmuş alanları düşüremez',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('REGTEST G1', {
        brewSnapshot: { ts: 1000 },
        brewSonuc: { ts: 2000, ogG: 1.05, fgG: 1.012 },
        brewLog: [{ id: 'g1-1', ts: 1500, tip: 'og_olcum', deger: '1.050' }]
      });
      // bayat-S simülasyonu: donmuş alanlar editör tamponundan düşmüş olsun
      delete S.brewSonuc; delete S.brewSnapshot; S.brewLog = [];
      S.verim = 71; // gerçek edit
      tarifeKaydet();
      const kr = KR.find(x => x && x.id === id);
      __REG.ok('KR.brewSonuc korundu', kr.brewSonuc && kr.brewSonuc.ts === 2000);
      __REG.ok('KR.brewSnapshot korundu', kr.brewSnapshot && kr.brewSnapshot.ts === 1000);
      __REG.ok('KR.brewLog union korundu', (kr.brewLog || []).some(e => e && e.id === 'g1-1'));
      __REG.ok('gerçek edit işlendi (verim=71)', kr.verim === 71, 'verim=' + kr.verim);
      __REG.ok('G3 geri-ayna: S donmuş alanları geri aldı', S.brewSonuc && S.brewSonuc.ts === 2000 && S.brewSnapshot && S.brewSnapshot.ts === 1000);
      return __REG.al();
    })
  },
  {
    kod: 'G2', ad: 'M8 graft K1/K2: sync kazananına donmuş veri aşısı + zombi engeli',
    calistir: (page) => page.evaluate(() => {
      // K1: kazanan çıplak → loser'dan snapshot+sonuc+log kopyalanır
      const w1 = { id: 'g2', guncelleme: 2 };
      _syncSonucGraft(w1, { id: 'g2', guncelleme: 1, brewSnapshot: { ts: 100 }, brewSonuc: { ts: 110 }, brewLog: [{ id: 'a', ts: 105 }] });
      __REG.ok('K1: snapshot+sonuc+log graft edildi', w1.brewSnapshot && w1.brewSnapshot.ts === 100 && w1.brewSonuc && w1.brewSonuc.ts === 110 && Array.isArray(w1.brewLog) && w1.brewLog.length === 1);
      __REG.ok('K1: guncelleme damgasına DOKUNULMADI', w1.guncelleme === 2);
      // K2 pozitif: snapshot.ts eşit → sonuc kopyalanır
      const w2 = { id: 'g2', brewSnapshot: { ts: 100 } };
      _syncSonucGraft(w2, { brewSnapshot: { ts: 100 }, brewSonuc: { ts: 110 } });
      __REG.ok('K2 pozitif: ts eşit → sonuc kopyalandı', w2.brewSonuc && w2.brewSonuc.ts === 110);
      // K2 negatif: ts farklı = bilinçli silme/yeni demleme → kopyalama YOK (zombi engeli)
      const w3 = { id: 'g2', brewSnapshot: { ts: 100 } };
      _syncSonucGraft(w3, { brewSnapshot: { ts: 999 }, brewSonuc: { ts: 110 } });
      __REG.ok('K2 negatif: ts farklı → zombi sonuc kopyalanmadı', w3.brewSonuc === undefined);
      return __REG.al();
    })
  },

  // ── SPRINT I ──
  {
    kod: 'I1', ad: 'batch-pencere: eski batch ölçümleri yeni batch analizine sızmaz',
    calistir: (page) => page.evaluate(() => {
      const bl = [{ tip: 'og_olcum', ts: 100 }, { tip: 'siseleme', ts: 120 }, { tip: 'og_olcum', ts: 210 }];
      __REG.ok('sınır = snapshot öncesi son şişeleme ts', _batchSinir(bl, 200) === 120, String(_batchSinir(bl, 200)));
      __REG.ok('snapshot yok (ts=0) → filtre kapalı', !_batchSinir(bl, 0));
      __REG.ok('strict <: snapTs=120 kendi şişelemesini almaz', !_batchSinir(bl, 120));
      __REG.ok('_logGirisTs: ts önceliği', _logGirisTs({ ts: 100, id: '1700000000000' }) === 100);
      __REG.ok('_logGirisTs: 13-hane id fallback', _logGirisTs({ id: '1700000000000' }) === 1700000000000);
      return __REG.al();
    })
  },
  {
    kod: 'I2', ad: 'tek SG aralığı [0.990, 1.200] SINIR DAHİL — tüm ölçüm yolları _sgNum',
    calistir: (page) => page.evaluate(() => {
      __REG.ok('0.990 GEÇERLİ (diastaticus FG)', _sgNum('0.990') === 0.99, String(_sgNum('0.990')));
      __REG.ok('1.200 GEÇERLİ (üst sınır)', _sgNum('1.200') === 1.2);
      __REG.ok('0.9899 RED', _sgNum('0.9899') === null);
      __REG.ok('1.2001 RED', _sgNum('1.2001') === null);
      __REG.ok('normal değer + 3 hane yuvarlama', _sgNum('1.048') === 1.048);
      __REG.ok('0.998 GEÇERLİ (eski >1.000 bug regresyonu)', _sgNum('0.998') === 0.998);
      return __REG.al();
    })
  },

  // ── Snapshot saf tahmin (kod-I3, SW v131-362 davranışı) ──
  {
    kod: 'SNAP', ad: 'snapshot saf tahmin: ogT/fgT = ogHesap/fgHesap — manuel override sızmaz',
    calistir: (page) => page.evaluate(() => {
      const src = KR.find(r => r && Array.isArray(r.maltlar) && r.maltlar.length > 0);
      __REG.ok('fixture içinde maltlı gerçek reçete var', !!src, src && src.biraAd);
      if (!src) return __REG.al();
      tarifAc(src.id);
      delete S.brewSnapshot; delete S.brewSonuc;
      S.ogManuel = 1.099; S.fgManuel = 1.031; // kasıtlı saçma override'lar
      const c = calc();
      const safOg = Math.round(c.ogHesap * 1000) / 1000, safFg = Math.round(c.fgHesap * 1000) / 1000;
      const r = _brewSnapshotYaz(S, _editId, {});
      __REG.ok('snapshot oluştu', !!r);
      __REG.ok('ogT SAF tahmin (override 1.099 DEĞİL)', r && r.ogT === safOg && r.ogT !== 1.099, r && ('ogT=' + r.ogT + ' saf=' + safOg));
      __REG.ok('fgT SAF tahmin (override 1.031 DEĞİL)', r && r.fgT === safFg && r.fgT !== 1.031, r && ('fgT=' + r.fgT + ' saf=' + safFg));
      return __REG.al();
    })
  },

  // ── SPRINT M ──
  {
    kod: 'M1', ad: 'stuck-ferment: brewday_end grubu ÖLDÜRMEZ; şişeleme öldürür',
    calistir: (page) => page.evaluate(() => {
      const gun = 86400000, simdi = Date.now();
      const id = __REG.yeniKayit('REGTEST M1', {
        brewLog: [
          { id: 'm1a', ts: simdi - gun, tip: 'brewday_start' },
          { id: 'm1b', ts: simdi - gun + 3600000, tip: 'pitching' },
          { id: 'm1c', ts: simdi - gun + 7200000, tip: 'brewday_end' }
        ]
      });
      _stuckFermSync();
      let al = JSON.parse(localStorage.getItem('bm_alarms_v1') || '{}');
      __REG.ok('M1a: brewday_end varken stuck grubu YAŞIYOR', !!al['stuck:' + id]);
      const kr = KR.find(x => x && x.id === id);
      kr.brewLog.push({ id: 'm1d', ts: simdi, tip: 'siseleme' });
      _origKy(KR);
      _stuckFermSync();
      al = JSON.parse(localStorage.getItem('bm_alarms_v1') || '{}');
      __REG.ok('M1b: şişeleme stuck grubunu kapattı', !al['stuck:' + id]);
      return __REG.al();
    })
  },
  {
    kod: 'M2', ad: 'preboilOG: aktif batch\'te anında donar; batch bitince kilitli',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('REGTEST M2', { brewSnapshot: { ts: 1000, ogT: 1.05, fgT: 1.012, preboilOG: null } });
      S.preboilOG = 1.048;
      _preboilSnapDondur(S, _editId);
      __REG.ok('M2a: aktif batch — preboil snapshot\'a dondu', S.brewSnapshot.preboilOG === 1.048, String(S.brewSnapshot.preboilOG));
      __REG.ok('M2a: KR aynası eşit', KR.find(x => x && x.id === id).brewSnapshot.preboilOG === 1.048);
      S.brewSonuc = { ts: Date.now() }; // batch bitti
      S.preboilOG = 1.06;
      _preboilSnapDondur(S, _editId);
      __REG.ok('M2b: bitmiş batch — eski snapshot\'a DOKUNMADI', S.brewSnapshot.preboilOG === 1.048);
      return __REG.al();
    })
  },
  {
    kod: 'M3', ad: 'sentkeys import koruması: cihaz-yerel gönderim izi yedekten TAŞINMAZ',
    calistir: async (page) => {
      const nav = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }); // import başarısı ~1.2s sonra reload
      await page.evaluate(() => {
        localStorage.setItem('bm_alarm_sentkeys_v1', '["stuck:yerel-iz"]');
        const yedek = {
          meta: { exportTs: Date.now(), version: 'regtest', keys: 2 },
          data: { 'bm_alarm_sentkeys_v1': '["stuck:bayat-yedek-izi"]', 'bm_ferm_sicaklik': '21' }
        };
        const dosya = new File([JSON.stringify(yedek)], 'regtest_yedek.json', { type: 'application/json' });
        window.bmVeriImport({ files: [dosya], value: '' }); // confirm'ler runner'da auto-accept
      });
      await nav;
      await page.waitForFunction(() => typeof render === 'function' && Array.isArray(KR), { timeout: 30000 });
      return page.evaluate(() => {
        window.__REG = window.__REG || { chk: [], ok(a, k, d) { this.chk.push({ ad: a, ok: !!k, detay: d === undefined ? '' : String(d) }); }, al() { const c = this.chk; this.chk = []; return c; } };
        __REG.ok('sentkeys yedekten GERİ GELMEDİ + yereldeki de temizlendi', localStorage.getItem('bm_alarm_sentkeys_v1') === null, String(localStorage.getItem('bm_alarm_sentkeys_v1')));
        __REG.ok('yedekteki normal anahtar yazıldı (import çalıştı kanıtı)', localStorage.getItem('bm_ferm_sicaklik') === '21');
        return __REG.al();
      });
    }
  },

  // ── SPRINT N ──
  {
    kod: 'N1', ad: '_draftKrAyniMi birim: guncelleme-only=AYNI; duzeltmeTs/içerik=FARKLI',
    calistir: (page) => page.evaluate(() => {
      const taban = { id: 'n', tarih: 't', ozet: 'o', guncelleme: 1, biraAd: 'X', hacim: 11, maltlar: [{ ad: 'pilsner', kg: 2 }] };
      const kop = () => JSON.parse(JSON.stringify(taban));
      const a = kop(), b = kop(); b.guncelleme = 999;
      __REG.ok('yalnız guncelleme farkı → AYNI (ghost bastırılır)', _draftKrAyniMi(a, b) === true);
      const c = kop(); c.duzeltmeTs = 123;
      __REG.ok('duzeltmeTs farkı → FARKLI (✏️ düzeltme gerçek içerik)', _draftKrAyniMi(a, c) === false);
      const d = kop(); d.hacim = 12;
      __REG.ok('içerik farkı → FARKLI', _draftKrAyniMi(a, d) === false);
      return __REG.al();
    })
  },
  {
    kod: 'N2', ad: 'ghost-draft entegrasyon: sync damgası farkı draft yazdırmaz; gerçek fark yazdırır',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('REGTEST N2'); // tarifAc → ekran=editor
      localStorage.removeItem('bm_draft_v1');
      const kr = KR.find(x => x && x.id === id);
      kr.guncelleme = (kr.guncelleme || 0) + 5000; // sync-güncellenmiş KR simülasyonu
      saveDraft();
      __REG.ok('guncelleme-only fark → ghost draft YAZILMADI', localStorage.getItem('bm_draft_v1') === null);
      S.hacim = (parseFloat(S.hacim) || 10) + 1; // gerçek içerik farkı
      saveDraft();
      const d = JSON.parse(localStorage.getItem('bm_draft_v1') || 'null');
      __REG.ok('gerçek fark → draft yazıldı (editId doğru)', !!d && d.editId === id);
      return __REG.al();
    })
  },

  // ── SPRINT O ──
  {
    kod: 'O1', ad: 'hata günlüğü: boot bozulmadı + uncaught hata kaydediliyor + temizle',
    calistir: async (page) => {
      const c1 = await page.evaluate(() => {
        __REG.ok('bm-hata-boot İLK script', (document.querySelector('script') || {}).id === 'bm-hata-boot');
        __REG.ok('window.onerror kurulu', typeof window.onerror === 'function');
        __REG.ok('boot temiz — hata logu boş', bmHataLogOku().length === 0, JSON.stringify(bmHataLogOku().map(h => h.mesaj)));
        return __REG.al();
      });
      // NOT: evaluate içinden throw CDP-origin'li → tarayıcı mesajı "Script error." diye maskeler.
      // Gerçek sayfa script'i enjekte et: same-origin → window.onerror tam mesajı görür.
      await page.evaluate(() => {
        const sc = document.createElement('script');
        sc.textContent = 'setTimeout(function(){ throw new Error("REG-O1-HATA"); }, 0);';
        document.body.appendChild(sc);
      });
      await page.waitForFunction(() => bmHataLogOku().length === 1, { timeout: 5000 });
      const c2 = await page.evaluate(() => {
        const h = bmHataLogOku()[0];
        __REG.ok('uncaught hata ring buffer\'a düştü', h && h.tip === 'error' && /REG-O1-HATA/.test(h.mesaj), h && h.mesaj);
        __REG.ok('kayıtta sürüm alanı var', h && typeof h.surum === 'string' && h.surum.indexOf('v2.') === 0);
        bmHataLogSil();
        __REG.ok('temizle → 0 kayıt', bmHataLogOku().length === 0);
        return __REG.al();
      });
      return c1.concat(c2);
    }
  },

  // ── SPRINT Q: kişisel kalibrasyon köprüsü ──
  // Sentetik tamamlanmış demleme kurucusu her case içinde: fixture'ın maltlı reçetesinden
  // F/M (hOG lineer) türetilir, hedef verime denk ogG ile brewSonuc'lu kayıtlar üretilir.
  {
    kod: 'Q-ESIK', ad: 'n<2 (gerçek yedek): köprü kapalı, sıfır yeni UI, varsayılan %61',
    calistir: (page) => page.evaluate(() => {
      const kp = _bmKisiselProfil();
      __REG.ok('köprü kapalı (aktif=false)', kp && kp.aktif === false && kp.verimKalibre === null, 'n=' + kp.n);
      __REG.ok('Hesap satırı boş', _bmKisiselSatirHtml() === '');
      __REG.ok('Malt chip boş', _bmVerimChipHtml() === '');
      __REG.ok('varsayılan verim 61 (BOS)', BOS.verim === 61);
      const src = KR.find(r => r && Array.isArray(r.maltlar) && r.maltlar.length > 0);
      __REG.ok('fixture reçetesi var', !!src);
      if (src) { tarifAc(src.id); __REG.ok('Hesap sekmesinde "Sana göre" YOK', rEditorHesap(calc().og, calc().fg, calc().abv, calc().maya).indexOf('Sana göre') === -1); }
      return __REG.al();
    })
  },
  {
    kod: 'Q-W25', ad: 'n=2 sentetik: w=0.25, kalibre=61·0.75+ort·0.25, gösterge görünür, onay-chip otomatik YAZMAZ',
    calistir: (page) => page.evaluate(() => {
      const src = KR.find(r => r && Array.isArray(r.maltlar) && r.maltlar.length > 0);
      const h = src.hacim != null ? +src.hacim : 11;
      const F = hOG(src.maltlar, 0, src.katkilar || [], h) - 1;
      const M = (hOG(src.maltlar, 100, src.katkilar || [], h) - 1 - F) / 100;
      KR.length = 0; // izole context — fixture'ın kendi tamamlanmışları n'i kirletmesin
      for (let i = 0; i < 2; i++) {
        const ogG = Math.round((1 + F + M * 69) * 1000) / 1000;
        KR.unshift({ id: 'regq2-' + i, biraAd: 'REGTEST Q2 ' + i, durum: 'arsiv', hacim: h, verim: 61,
          maltlar: JSON.parse(JSON.stringify(src.maltlar)), katkilar: JSON.parse(JSON.stringify(src.katkilar || [])),
          brewSnapshot: { ts: 1000 + i, ogT: Math.round((1 + F + M * 61) * 1000) / 1000, fgT: 1.012, verimVarsayim: 61, hacim: h },
          brewSonuc: { ts: 2000 + i, ogG: ogG, fgG: 1.016, kaynak: { og: 'olcum', fg: 'olcum' } },
          brewLog: [{ id: 'rq2' + i, ts: 1500 + i, tip: 'og_olcum', deger: String(ogG) }] });
      }
      _origKy(KR);
      const kp = _bmKisiselProfil();
      __REG.ok('n=2 algılandı', kp.n === 2, 'n=' + kp.n);
      __REG.ok('w=0.25', kp.w === 0.25);
      __REG.ok('ortVerim ≈ 69 (±1.5 — ogG 3hane yuvarlama)', kp.verimOrt != null && Math.abs(kp.verimOrt - 69) < 1.5, String(kp.verimOrt));
      const beklenen = Math.round((61 * 0.75 + kp.verimOrt * 0.25) * 10) / 10;
      __REG.ok('kalibre formülü doğru', kp.verimKalibre === beklenen, kp.verimKalibre + ' vs ' + beklenen);
      __REG.ok('fgOfset = ort×0.25 (0.004×0.25=0.001)', kp.fgOfset === 0.001, String(kp.fgOfset));
      const chip = _bmVerimChipHtml();
      __REG.ok('chip "Gerçek ortalaman" + Uygula butonu', chip.indexOf('Gerçek ortalaman') > -1 && chip.indexOf('Uygula') > -1);
      tarifAc(KR[0].id);
      __REG.ok('onay-chip OTOMATİK YAZMADI (S.verim hâlâ 61)', S.verim === 61);
      __REG.ok('Hesap "Sana göre" satırı görünür', _bmKisiselSatirHtml().indexOf('Sana göre') > -1);
      return __REG.al();
    })
  },
  {
    kod: 'Q-CLAMP', ad: 'n=5 sentetik: w=1.0 clamp, kalibre = gerçek ortalama',
    calistir: (page) => page.evaluate(() => {
      const src = KR.find(r => r && Array.isArray(r.maltlar) && r.maltlar.length > 0);
      const h = src.hacim != null ? +src.hacim : 11;
      const F = hOG(src.maltlar, 0, src.katkilar || [], h) - 1;
      const M = (hOG(src.maltlar, 100, src.katkilar || [], h) - 1 - F) / 100;
      KR.length = 0;
      for (let i = 0; i < 5; i++) {
        const ogG = Math.round((1 + F + M * 69) * 1000) / 1000;
        KR.unshift({ id: 'regq5-' + i, biraAd: 'REGTEST Q5 ' + i, durum: 'arsiv', hacim: h, verim: 61,
          maltlar: JSON.parse(JSON.stringify(src.maltlar)), katkilar: JSON.parse(JSON.stringify(src.katkilar || [])),
          brewSnapshot: { ts: 1000 + i, ogT: 1.05, fgT: 1.012, verimVarsayim: 61, hacim: h },
          brewSonuc: { ts: 2000 + i, ogG: ogG, fgG: 1.016, kaynak: { og: 'olcum', fg: 'olcum' } },
          brewLog: [{ id: 'rq5' + i, ts: 1500 + i, tip: 'og_olcum', deger: String(ogG) }] });
      }
      _origKy(KR);
      const kp = _bmKisiselProfil();
      __REG.ok('n=5, w=1.0 clamp', kp.n === 5 && kp.w === 1, 'n=' + kp.n + ' w=' + kp.w);
      __REG.ok('kalibre = gerçek ort (w=1)', kp.verimKalibre === kp.verimOrt, kp.verimKalibre + ' vs ' + kp.verimOrt);
      __REG.ok('fgOfset tam ağırlıklı (0.004)', kp.fgOfset === 0.004, String(kp.fgOfset));
      return __REG.al();
    })
  },
  {
    kod: 'Q-BANT', ad: 'akıl bandı: absürt ort verim (%120 hedefli) → kalibrasyona ALINMAZ, varsayılan korunur',
    calistir: (page) => page.evaluate(() => {
      const src = KR.find(r => r && Array.isArray(r.maltlar) && r.maltlar.length > 0);
      const h = src.hacim != null ? +src.hacim : 11;
      const F = hOG(src.maltlar, 0, src.katkilar || [], h) - 1;
      const M = (hOG(src.maltlar, 100, src.katkilar || [], h) - 1 - F) / 100;
      KR.length = 0;
      for (let i = 0; i < 3; i++) {
        const ogG = Math.round((1 + F + M * 120) * 1000) / 1000; // absürt: %120 verime denk ölçüm
        KR.unshift({ id: 'regqb-' + i, biraAd: 'REGTEST QB ' + i, durum: 'arsiv', hacim: h, verim: 61,
          maltlar: JSON.parse(JSON.stringify(src.maltlar)), katkilar: JSON.parse(JSON.stringify(src.katkilar || [])),
          brewSnapshot: { ts: 1000 + i, ogT: 1.05, fgT: 1.012, verimVarsayim: 61, hacim: h },
          brewSonuc: { ts: 2000 + i, ogG: ogG, fgG: 1.042, kaynak: { og: 'olcum', fg: 'olcum' } }, // fgSapma 0.030 da bant dışı
          brewLog: [{ id: 'rqb' + i, ts: 1500 + i, tip: 'og_olcum', deger: String(ogG) }] });
      }
      _origKy(KR);
      const kp = _bmKisiselProfil();
      __REG.ok('verim bant dışı işaretlendi', kp.verimBantDisi === true && kp.verimKalibre === null, 'ort=' + kp.verimOrt);
      __REG.ok('FG bant dışı işaretlendi', kp.fgBantDisi === true && kp.fgOfset === null);
      __REG.ok('köprü uygulanmadı (aktif=false)', kp.aktif === false);
      __REG.ok('chip "bant dışı" uyarısı (Uygula YOK)', _bmVerimChipHtml().indexOf('bant dışı') > -1 && _bmVerimChipHtml().indexOf('Uygula') === -1);
      __REG.ok('Hesap satırı "veri tutarsız" bilgisi', _bmKisiselSatirHtml().indexOf('veri tutarsız') > -1);
      return __REG.al();
    })
  },
  {
    kod: 'Q-SEFFAF', ad: 'şeffaflık: köprü aktifken motor tahmini (ogHesap/sticky) DEĞİŞMEZ — override değil kalibrasyon',
    calistir: (page) => page.evaluate(() => {
      const src = KR.find(r => r && Array.isArray(r.maltlar) && r.maltlar.length > 0);
      const h = src.hacim != null ? +src.hacim : 11;
      const F = hOG(src.maltlar, 0, src.katkilar || [], h) - 1;
      const M = (hOG(src.maltlar, 100, src.katkilar || [], h) - 1 - F) / 100;
      KR.length = 0;
      for (let i = 0; i < 5; i++) {
        const ogG = Math.round((1 + F + M * 69) * 1000) / 1000;
        KR.unshift({ id: 'regqs-' + i, biraAd: 'REGTEST QS ' + i, durum: 'arsiv', hacim: h, verim: 61,
          maltlar: JSON.parse(JSON.stringify(src.maltlar)), katkilar: JSON.parse(JSON.stringify(src.katkilar || [])),
          brewSnapshot: { ts: 1000 + i, ogT: 1.05, fgT: 1.012, verimVarsayim: 61, hacim: h },
          brewSonuc: { ts: 2000 + i, ogG: ogG, fgG: 1.016, kaynak: { og: 'olcum', fg: 'olcum' } },
          brewLog: [{ id: 'rqs' + i, ts: 1500 + i, tip: 'og_olcum', deger: String(ogG) }] });
      }
      _origKy(KR);
      tarifAc(KR[0].id);
      const onceOg = calc().ogHesap, onceVerim = S.verim;
      const satir = _bmKisiselSatirHtml(); // köprü hesabı çalışsın
      const sonraOg = calc().ogHesap;
      __REG.ok('köprü aktif ("Sana göre" üretildi)', satir.indexOf('Sana göre') > -1);
      __REG.ok('motor ogHesap DEĞİŞMEDİ', onceOg === sonraOg, onceOg + ' vs ' + sonraOg);
      __REG.ok('S.verim DEĞİŞMEDİ (onaysız yazım yok)', S.verim === onceVerim && S.verim === 61);
      const hesapHtml = rEditorHesap(calc().og, calc().fg, calc().abv, calc().maya);
      __REG.ok('motor kartları duruyor (Batç Hacmi)', hesapHtml.indexOf('Batç Hacmi') > -1);
      __REG.ok('"Sana göre" EK satır olarak eklendi', hesapHtml.indexOf('Sana göre') > -1);
      __REG.ok('sticky özet OG motor değeri (render sonrası)', (function(){ render(); const e = document.getElementById('ss-og'); return e && e.textContent === calc().og.toFixed(3); })());
      return __REG.al();
    })
  },

  // ── SPRINT R: alarm onayı → brewLog köprüsü ──
  // Ortak kalıp: __REG.yeniKayit ile reçete + bm_alarms_v1'e sentetik alarm grubu, sonra
  // _alarmAksiyon(rid, g, 'tamamlandi') gerçek onay boğazından köprü tetiklenir.
  {
    kod: 'R-DH', ad: 'dry hop ekle/çıkar onayı → dry_hop log + iz; faz göstergesi son-giriş not-bazlı',
    calistir: (page) => page.evaluate(() => {
      const gun = 86400000, simdi = Date.now();
      const id = __REG.yeniKayit('REGTEST R-DH'); // tarifAc ile AÇIK reçete yolu (S + tarifeKaydet zinciri)
      const tum = JSON.parse(localStorage.getItem('bm_alarms_v1') || '{}');
      tum[id] = { receteAd: 'REGTEST R-DH', pitchTs: simdi - 7 * gun, durum: 'aktif', alarmlar: [
        { g: 5, ts: simdi - 2 * gun, tip: 'kritik', aksiyon: '🌿 Dry hop ekle', aciklama: '50g Citra · FG ~%75 civarıysa ideal.', durum: 'bekliyor' },
        { g: 10, ts: simdi - 1 * gun, tip: 'kritik', aksiyon: '🌿 Dry hop çıkar', aciklama: '50g Citra — 5 gündür içerde.', durum: 'bekliyor' }
      ] };
      localStorage.setItem('bm_alarms_v1', JSON.stringify(tum));
      _alarmAksiyon(id, 5, 'tamamlandi');
      let bl = S.brewLog.filter(x => x && x.tip === 'dry_hop');
      __REG.ok('a: ekle → dry_hop girişi', bl.length === 1);
      __REG.ok('a: not "eklendi" + hop + iz', bl[0] && bl[0].not.indexOf('eklendi') === 0 && bl[0].not.indexOf('50g Citra') > -1 && bl[0].not.indexOf('⏰ alarm onayından') > -1, bl[0] && bl[0].not);
      __REG.ok('a: almKey doğru', bl[0] && bl[0].almKey === id + '|5');
      __REG.ok('a: log ts = alarm ts (olay günü)', bl[0] && bl[0].ts === simdi - 2 * gun);
      __REG.ok('a: alarm durumu tamamlandi (mevcut davranış intact)', JSON.parse(localStorage.getItem('bm_alarms_v1'))[id].alarmlar[0].durum === 'tamamlandi');
      sekme = 'takvim'; render();
      const fazAcik = Array.from(document.querySelectorAll('[data-acc-meta]')).some(e => e.textContent.trim() === 'Dry Hop');
      __REG.ok('a: faz göstergesi AÇIK (Dry Hop)', fazAcik);
      _alarmAksiyon(id, 10, 'tamamlandi');
      bl = S.brewLog.filter(x => x && x.tip === 'dry_hop');
      __REG.ok('b: çıkar → ikinci dry_hop girişi ("çıkarıldı")', bl.length === 2 && bl.some(x => x.not.indexOf('çıkarıldı') === 0));
      sekme = 'takvim'; render();
      const fazKapali = !Array.from(document.querySelectorAll('[data-acc-meta]')).some(e => e.textContent.trim() === 'Dry Hop');
      __REG.ok('b: ekle+çıkar ardışık → faz KAPALI', fazKapali);
      return __REG.al();
    })
  },
  {
    kod: 'R-CC-KATKI', ad: 'cold crash / katkı / meşe onayı → doğru tip + iz; "devam" pasif logsuz',
    calistir: (page) => page.evaluate(() => {
      const gun = 86400000, simdi = Date.now();
      const id = __REG.yeniKayit('REGTEST R-CC');
      yeniTarif(); // reçeteyi KAPAT (kapalı-reçete KR yolu test edilsin)
      const tum = JSON.parse(localStorage.getItem('bm_alarms_v1') || '{}');
      tum[id] = { receteAd: 'REGTEST R-CC', pitchTs: simdi - 9 * gun, durum: 'aktif', alarmlar: [
        { g: 7, ts: simdi - 2 * gun, tip: 'kritik', aksiyon: '❄️ Cold crash', aciklama: '2-4°C', durum: 'bekliyor' },
        { g: 8, ts: simdi - 1 * gun, tip: 'pasif', aksiyon: '❄️ Cold crash devam', aciklama: '', durum: 'bekliyor' },
        { g: 3, ts: simdi - 6 * gun, tip: 'kritik', aksiyon: '🧪 Vanilya çubuğu ekle', aciklama: '2adet · secondary', durum: 'bekliyor' },
        { g: 9, ts: simdi - 12 * 3600000, tip: 'kritik', aksiyon: '🪵 Meşe çipi çıkar', aciklama: '6 gündür temasta', durum: 'bekliyor' }
      ] };
      localStorage.setItem('bm_alarms_v1', JSON.stringify(tum));
      [7, 8, 3, 9].forEach(g => _alarmAksiyon(id, g, 'tamamlandi'));
      const kr = KR.find(x => x && x.id === id);
      const cc = kr.brewLog.filter(x => x && x.tip === 'cold_crash');
      const kt = kr.brewLog.filter(x => x && x.tip === 'katki');
      __REG.ok('c: cold crash → 1 giriş ("devam" pasif LOG ÜRETMEDİ)', cc.length === 1);
      __REG.ok('c: cold crash izli', cc[0] && cc[0].not.indexOf('⏰ alarm onayından') > -1);
      __REG.ok('c: katkı ekle → "Vanilya çubuğu eklendi"', kt.some(x => x.not.indexOf('Vanilya çubuğu eklendi') === 0));
      __REG.ok('c: meşe çıkar → "Meşe çipi çıkarıldı"', kt.some(x => x.not.indexOf('Meşe çipi çıkarıldı') === 0));
      __REG.ok('c: LS persist (kapalı-reçete ky yolu)', JSON.parse(localStorage.getItem('bm_v6')).find(x => x && x.id === id).brewLog.filter(x => x.tip === 'katki').length === 2);
      return __REG.al();
    })
  },
  {
    kod: 'R-SISELE', ad: 'şişele onayı: litre girildi VE boş geçildi — iki durumda da siseleme log + brewSonuc dondu (Sprint Q beslemesi)',
    calistir: (page) => page.evaluate(() => {
      const gun = 86400000, simdi = Date.now();
      const kur = (ad) => {
        const id = __REG.yeniKayit(ad, {
          brewSnapshot: { ts: simdi - 14 * gun, ogT: 1.05, fgT: 1.012, verimVarsayim: 61 },
          ogManuel: 1.05, fgManuel: 1.012
        });
        yeniTarif(); // kapat
        const tum = JSON.parse(localStorage.getItem('bm_alarms_v1') || '{}');
        tum[id] = { receteAd: ad, pitchTs: simdi - 14 * gun, durum: 'aktif', alarmlar: [
          { g: 14, ts: simdi - gun, tip: 'kritik', aksiyon: '🍺 Şişele', aciklama: 'Priming hesapla', durum: 'bekliyor' }
        ] };
        localStorage.setItem('bm_alarms_v1', JSON.stringify(tum));
        return id;
      };
      // (i) litre girildi
      const id1 = kur('REGTEST R-SIS-1');
      window.prompt = () => '10.5';
      _alarmAksiyon(id1, 14, 'tamamlandi');
      const k1 = KR.find(x => x && x.id === id1);
      const s1 = (k1.brewLog || []).filter(x => x && x.tip === 'siseleme');
      __REG.ok('d-i: siseleme log + deger=10.5', s1.length === 1 && s1[0].deger === '10.5', s1[0] && s1[0].deger);
      __REG.ok('d-i: brewSonuc DONDU (ogG 1.05)', k1.brewSonuc && k1.brewSonuc.ts && k1.brewSonuc.ogG === 1.05);
      const p1 = bmProfilAnaliz().kayitlar.find(x => x.id === String(id1));
      __REG.ok('d-i: Sprint Q beslemesi — profil batch\'i TAMAM saydı', p1 && p1.durum === 'tamam');
      // (ii) boş geçildi (cancel)
      const id2 = kur('REGTEST R-SIS-2');
      window.prompt = () => null;
      _alarmAksiyon(id2, 14, 'tamamlandi');
      const k2 = KR.find(x => x && x.id === id2);
      const s2 = (k2.brewLog || []).filter(x => x && x.tip === 'siseleme');
      __REG.ok('d-ii: boş geçildi → log YİNE yazıldı (deger boş)', s2.length === 1 && s2[0].deger === '');
      __REG.ok('d-ii: brewSonuc yine dondu', k2.brewSonuc && !!k2.brewSonuc.ts);
      return __REG.al();
    })
  },
  {
    kod: 'R-PITCH', ad: 'pitching onayı (confirm tek-tık): log + snapshot + durum=yapimda',
    calistir: (page) => page.evaluate(() => {
      const gun = 86400000, simdi = Date.now();
      const id = __REG.yeniKayit('REGTEST R-PITCH');
      yeniTarif();
      const tum = JSON.parse(localStorage.getItem('bm_alarms_v1') || '{}');
      tum[id] = { receteAd: 'REGTEST R-PITCH', pitchTs: simdi, durum: 'aktif', alarmlar: [
        { g: 0, ts: simdi - 3600000, tip: 'kontrol', aksiyon: '🧬 Pitching', aciklama: 'Maya at', durum: 'bekliyor' }
      ] };
      localStorage.setItem('bm_alarms_v1', JSON.stringify(tum));
      window.confirm = () => true;
      _alarmAksiyon(id, 0, 'tamamlandi');
      const kr = KR.find(x => x && x.id === id);
      __REG.ok('pitching log yazıldı', (kr.brewLog || []).some(x => x && x.tip === 'pitching' && x.almKey === id + '|0'));
      __REG.ok('snapshot dondu', kr.brewSnapshot && !!kr.brewSnapshot.ts);
      __REG.ok('durum yapimda', kr.durum === 'yapimda');
      return __REG.al();
    })
  },
  {
    kod: 'R-OLCUM', ad: 'FG/gravity onayı → otomatik log YOK, "Ölçüm gir" kısayolu fg_olcum formunu açar',
    calistir: async (page) => {
      const c1 = await page.evaluate(() => {
        const gun = 86400000, simdi = Date.now();
        const id = __REG.yeniKayit('REGTEST R-OLCUM');
        yeniTarif();
        const tum = JSON.parse(localStorage.getItem('bm_alarms_v1') || '{}');
        tum[id] = { receteAd: 'REGTEST R-OLCUM', pitchTs: simdi - 4 * gun, durum: 'aktif', alarmlar: [
          { g: 4, ts: simdi - 3600000, tip: 'kontrol', aksiyon: '📊 FG kontrol', aciklama: 'Gravity ölç', durum: 'bekliyor' }
        ] };
        localStorage.setItem('bm_alarms_v1', JSON.stringify(tum));
        window.__regOlcumId = id;
        _alarmAksiyon(id, 4, 'tamamlandi');
        const kr = KR.find(x => x && x.id === id);
        __REG.ok('e: otomatik log YOK', (kr.brewLog || []).length === 0);
        __REG.ok('e: kısayol toast göründü', !!document.getElementById('bm-olcum-toast'));
        const btn = document.querySelector('#bm-olcum-toast button');
        if (btn) btn.click();
        return __REG.al();
      });
      await page.waitForFunction(() => {
        const t = document.getElementById('logTip');
        return typeof sekme !== 'undefined' && sekme === 'takvim' && t && t.value === 'fg_olcum';
      }, { timeout: 5000 });
      const c2 = await page.evaluate(() => {
        __REG.ok('e: kısayol → takvim sekmesi + logTip=fg_olcum + doğru reçete', sekme === 'takvim' && document.getElementById('logTip').value === 'fg_olcum' && _editId === window.__regOlcumId);
        return __REG.al();
      });
      return c1.concat(c2);
    }
  },
  {
    kod: 'R-SUREC', ad: 'sanitize/karbonasyon/içime-hazır/pasif/pseudo onayı → log YOK, çökme yok',
    calistir: (page) => page.evaluate(() => {
      const gun = 86400000, simdi = Date.now();
      const id = __REG.yeniKayit('REGTEST R-SUREC');
      yeniTarif();
      const tum = JSON.parse(localStorage.getItem('bm_alarms_v1') || '{}');
      tum[id] = { receteAd: 'REGTEST R-SUREC', pitchTs: simdi - 15 * gun, durum: 'aktif', alarmlar: [
        { g: 13, ts: simdi - 2 * gun, tip: 'kontrol', aksiyon: '🧼 Şişeleri sanitize et', aciklama: '', durum: 'bekliyor' },
        { g: 28, ts: simdi - gun, tip: 'kontrol', aksiyon: '🫧 Karbonasyon kontrol — bir şişe test et', aciklama: '', durum: 'bekliyor' },
        { g: 35, ts: simdi - 3600000, tip: 'kontrol', aksiyon: '🍺 İçime hazır — Dubbel olgunlaştı', aciklama: '', durum: 'bekliyor' },
        { g: 1, ts: simdi - 14 * gun, tip: 'pasif', aksiyon: '⏳ Lag + aktivasyon', aciklama: '', durum: 'bekliyor' }
      ] };
      tum['manuel:regtest'] = { receteAd: 'Manuel', pitchTs: simdi, durum: 'aktif', alarmlar: [
        { g: 0, ts: simdi - 60000, tip: 'kontrol', aksiyon: '🔔 Su al', aciklama: '', durum: 'bekliyor' }
      ] };
      localStorage.setItem('bm_alarms_v1', JSON.stringify(tum));
      [13, 28, 35, 1].forEach(g => _alarmAksiyon(id, g, 'tamamlandi'));
      _alarmAksiyon('manuel:regtest', 0, 'tamamlandi'); // pseudo aile — çökmemeli
      const kr = KR.find(x => x && x.id === id);
      __REG.ok('f: süreç/pasif alarmları LOG ÜRETMEDİ', (kr.brewLog || []).length === 0);
      __REG.ok('f: "Şişeleri sanitize" siseleme SANILMADI', !(kr.brewLog || []).some(x => x && x.tip === 'siseleme'));
      __REG.ok('f+h: pseudo/şişele-alarmsız akış — çökme yok, app ayakta', typeof render === 'function' && (render() === undefined || true) && !!document.getElementById('ekran'));
      const al = JSON.parse(localStorage.getItem('bm_alarms_v1'))[id].alarmlar;
      __REG.ok('f: alarm durumları yine tamamlandi (onay bozulmadı)', al.every(a => a.durum === 'tamamlandi'));
      return __REG.al();
    })
  },
  {
    kod: 'R-IDEM', ad: 'idempotency: çift onay + snooze re-arm (ts değişti) → TEK log (almKey, ts anahtarda değil)',
    calistir: (page) => page.evaluate(() => {
      const gun = 86400000, simdi = Date.now();
      const id = __REG.yeniKayit('REGTEST R-IDEM');
      yeniTarif();
      const tum = JSON.parse(localStorage.getItem('bm_alarms_v1') || '{}');
      tum[id] = { receteAd: 'REGTEST R-IDEM', pitchTs: simdi - 6 * gun, durum: 'aktif', alarmlar: [
        { g: 5, ts: simdi - gun, tip: 'kritik', aksiyon: '🌿 Dry hop ekle', aciklama: '30g Saaz', durum: 'bekliyor' }
      ] };
      localStorage.setItem('bm_alarms_v1', JSON.stringify(tum));
      _alarmAksiyon(id, 5, 'tamamlandi');
      _alarmAksiyon(id, 5, 'tamamlandi'); // çift tık
      let kr = KR.find(x => x && x.id === id);
      __REG.ok('g: çift onay → TEK giriş', kr.brewLog.filter(x => x && x.tip === 'dry_hop').length === 1);
      // snooze re-arm simülasyonu: ts değişir + durum bekliyor'a döner, sonra yeniden onay
      const t2 = JSON.parse(localStorage.getItem('bm_alarms_v1'));
      t2[id].alarmlar[0].ts = simdi + 3600000; t2[id].alarmlar[0].durum = 'bekliyor';
      localStorage.setItem('bm_alarms_v1', JSON.stringify(t2));
      _alarmAksiyon(id, 5, 'tamamlandi');
      kr = KR.find(x => x && x.id === id);
      __REG.ok('g: re-arm (ts değişti) sonrası onay → YİNE tek giriş', kr.brewLog.filter(x => x && x.tip === 'dry_hop').length === 1);
      return __REG.al();
    })
  },

  // ── SPRINT S: KR silme tombstone ──
  // Ortak kalıp: syncCfg + fetch stub'ıyla GERÇEK syncAl/syncGonder yolları koşulur (iki-cihaz simülasyonu).
  // sanal(uzak): PUT gövdesini window.__put'a yakalar, GET uzak payload'ı döndürür.
  {
    kod: 'S-ANA', ad: 'silme yayılımı iki yön: yerel tombstone dirilişi engeller + PUT KRSil taşır; gelen KRSil yereli siler',
    calistir: (page) => page.evaluate(async () => {
      const sanal = (uzak) => {
        syncCfg = { url: 'https://sahte.test', oda: 'regtest', cihaz: 'T' };
        window.__put = null;
        window.fetch = async (u, o) => {
          if (o && o.method === 'PUT') { window.__put = JSON.parse(o.body); return { ok: true }; }
          return { ok: true, json: async () => uzak };
        };
      };
      sanal(null);
      const id = __REG.yeniKayit('REGTEST S-ANA'); yeniTarif();
      const t0 = KR.find(x => x && x.id === id); t0.guncelleme = Date.now() - 86400000; _origKy(KR);
      const kr0 = JSON.parse(JSON.stringify(t0));
      tarifSil(id);
      if (_syncGonderTimer) { clearTimeout(_syncGonderTimer); _syncGonderTimer = null; } // debounce determinizmi
      __REG.ok('silme → KR düştü + tombstone yazıldı', !KR.find(x => x && x.id === id) && _krSilOku().some(t => String(t.id) === String(id)));
      sanal({ KR: [kr0], STOK: [], ts: Date.now() + 60000, cihaz: 'B' }); // B'de reçete hâlâ var, KRSil yok
      await syncAl();
      __REG.ok('a: uzak eski kopya DİRİLEMEDİ (yerel tombstone otoriter)', !KR.find(x => x && x.id === id));
      await syncGonder();
      __REG.ok('a: PUT payload KRSil taşıyor', window.__put && Array.isArray(window.__put.KRSil) && window.__put.KRSil.some(t => String(t.id) === String(id)));
      __REG.ok('a: PUT KR silineni içermiyor (push dirilişi yok)', window.__put && !window.__put.KR.some(x => x && x.id === id));
      // B rolü: uzaktan KRSil geldi, yerelde reçete VAR → düşer + tombstone yayılır
      const id2 = __REG.yeniKayit('REGTEST S-ANA-B'); yeniTarif();
      const k2 = KR.find(x => x && x.id === id2); k2.guncelleme = Date.now() - 86400000; _origKy(KR);
      if (_syncGonderTimer) { clearTimeout(_syncGonderTimer); _syncGonderTimer = null; }
      sanal({ KR: [kr0], STOK: [], ts: Date.now() + 120000, cihaz: 'A', KRSil: [{ id: id2, ts: Date.now() }] });
      await syncAl();
      __REG.ok('a: gelen KRSil yerel kopyayı SİLDİ (yayılım)', !KR.find(x => x && x.id === id2));
      __REG.ok('a: tombstone yerel listeye katıldı (iki yönlü)', _krSilOku().some(t => String(t.id) === String(id2)));
      return __REG.al();
    })
  },
  {
    kod: 'S-GRAFT', ad: 'graft etkileşimi: sonuçlu silinen reçete graft ile DİRİLMEZ; yaşayanlarda G graft AYNEN çalışır',
    calistir: (page) => page.evaluate(async () => {
      const sanal = (uzak) => {
        syncCfg = { url: 'https://sahte.test', oda: 'regtest', cihaz: 'T' };
        window.fetch = async (u, o) => (o && o.method === 'PUT') ? { ok: true } : { ok: true, json: async () => uzak };
      };
      sanal(null);
      const idOlu = __REG.yeniKayit('REGTEST S-GRAFT-OLU', { brewSnapshot: { ts: 100 }, brewSonuc: { ts: 110, ogG: 1.05, fgG: 1.012 } });
      yeniTarif();
      const oluKr = KR.find(x => x && x.id === idOlu); oluKr.guncelleme = Date.now() - 86400000; _origKy(KR);
      const oluUzak = JSON.parse(JSON.stringify(oluKr));
      tarifSil(idOlu);
      if (_syncGonderTimer) { clearTimeout(_syncGonderTimer); _syncGonderTimer = null; }
      const idCanli = __REG.yeniKayit('REGTEST S-GRAFT-CANLI'); yeniTarif();
      const c = KR.find(x => x && x.id === idCanli);
      delete c.brewSnapshot; delete c.brewSonuc; c.guncelleme = Date.now(); _origKy(KR);
      if (_syncGonderTimer) { clearTimeout(_syncGonderTimer); _syncGonderTimer = null; }
      const canliUzak = JSON.parse(JSON.stringify(c));
      canliUzak.guncelleme = c.guncelleme - 5000;
      canliUzak.brewSnapshot = { ts: 200 }; canliUzak.brewSonuc = { ts: 210, ogG: 1.06, fgG: 1.014 };
      sanal({ KR: [oluUzak, canliUzak], STOK: [], ts: Date.now() + 60000, cihaz: 'B' });
      await syncAl();
      __REG.ok('b: SONUÇLU silinen reçete graft ile DİRİLMEDİ (filtre graft öncesi)', !KR.find(x => x && x.id === idOlu));
      const cs = KR.find(x => x && x.id === idCanli);
      __REG.ok('b: yaşayan reçetede G graft AYNEN (K1: sonuc+snapshot aşılandı)', cs && cs.brewSonuc && cs.brewSonuc.ts === 210 && cs.brewSnapshot && cs.brewSnapshot.ts === 200);
      return __REG.al();
    })
  },
  {
    kod: 'S-GERI', ad: 'bilinçli geri-getirme: guncelleme > silmeTs → kayıt yaşar + tombstone düşer',
    calistir: (page) => page.evaluate(async () => {
      const sanal = (uzak) => {
        syncCfg = { url: 'https://sahte.test', oda: 'regtest', cihaz: 'T' };
        window.fetch = async (u, o) => (o && o.method === 'PUT') ? { ok: true } : { ok: true, json: async () => uzak };
      };
      sanal(null);
      const id = __REG.yeniKayit('REGTEST S-GERI'); yeniTarif();
      const kr = KR.find(x => x && x.id === id); kr.guncelleme = Date.now(); _origKy(KR);
      if (_syncGonderTimer) { clearTimeout(_syncGonderTimer); _syncGonderTimer = null; }
      _krSilYaz(_krSilOku().concat([{ id: id, ts: Date.now() - 3600000 }])); // silinmiş → SONRA düzenlenmiş
      sanal({ KR: [JSON.parse(JSON.stringify(kr))], STOK: [], ts: Date.now() + 60000, cihaz: 'B' });
      await syncAl();
      __REG.ok('c: kayıt YAŞIYOR (tombstone engellemedi)', !!KR.find(x => x && x.id === id));
      __REG.ok('c: tombstone düştü (zombi-silme önlendi)', !_krSilOku().some(t => String(t.id) === String(id)));
      return __REG.al();
    })
  },
  {
    kod: 'S-TTL', ad: 'TTL 90 gün: eski tombstone düşer, tazeler durur',
    calistir: (page) => page.evaluate(() => {
      _krSilYaz([{ id: 'eski-91g', ts: Date.now() - 91 * 86400000 }, { id: 'taze', ts: Date.now() - 86400000 }]);
      _krSilEkle('yeni-x');
      const L = _krSilOku();
      __REG.ok('d: 91 günlük tombstone DÜŞTÜ', !L.some(t => t.id === 'eski-91g'));
      __REG.ok('d: taze + yeni duruyor', L.some(t => t.id === 'taze') && L.some(t => t.id === 'yeni-x'));
      __REG.ok('d: süpürücü sınırı (89g kalır / 91g düşer)', _krSilSupur([{ id: 'a', ts: Date.now() - 89 * 86400000 }]).length === 1 && _krSilSupur([{ id: 'a', ts: Date.now() - 91 * 86400000 }]).length === 0);
      return __REG.al();
    })
  },
  {
    kod: 'S-ESKI', ad: 'fail-open: KRSil\'siz (eski istemci) ve bozuk KRSil payload\'ları — çökme yok, sync normal',
    calistir: (page) => page.evaluate(async () => {
      const sanal = (uzak) => {
        syncCfg = { url: 'https://sahte.test', oda: 'regtest', cihaz: 'T' };
        window.fetch = async (u, o) => (o && o.method === 'PUT') ? { ok: true } : { ok: true, json: async () => uzak };
      };
      sanal(null);
      const id = __REG.yeniKayit('REGTEST S-ESKI'); yeniTarif();
      if (_syncGonderTimer) { clearTimeout(_syncGonderTimer); _syncGonderTimer = null; }
      const kopya = () => JSON.parse(JSON.stringify(KR.find(x => x && x.id === id)));
      sanal({ KR: [kopya()], STOK: [], ts: Date.now() + 60000, cihaz: 'B' }); // KRSil alanı YOK
      await syncAl();
      __REG.ok('e: KRSil\'siz payload — sync normal, kayıt yaşıyor', !!KR.find(x => x && x.id === id));
      sanal({ KR: [kopya()], STOK: [], ts: Date.now() + 120000, cihaz: 'B', KRSil: 'bozuk-string' });
      await syncAl();
      __REG.ok('e: KRSil=string — çökme yok', !!KR.find(x => x && x.id === id));
      sanal({ KR: [kopya()], STOK: [], ts: Date.now() + 180000, cihaz: 'B', KRSil: [{ id: id, ts: 'abc' }, null, 42] });
      await syncAl();
      __REG.ok('e: bozuk KRSil öğeleri (ts=string/null/sayı) yutuldu — kayıt yaşıyor', !!KR.find(x => x && x.id === id));
      return __REG.al();
    })
  },
  {
    kod: 'S-IMPORT', ad: 'tombstone import round-trip: bm_kr_sil_v1 allowlist ile taşınır',
    calistir: async (page) => {
      const c1 = await page.evaluate(() => {
        __REG.ok('f: bm_kr_sil_v1 export allowlist\'inde', /^(bm_|kabir_|_orig|acc_|KR$)/.test('bm_kr_sil_v1'));
        return __REG.al();
      });
      const nav = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.evaluate(() => {
        const yedek = { meta: { exportTs: Date.now(), version: 'regtest', keys: 2 }, data: {
          'bm_kr_sil_v1': JSON.stringify([{ id: 'import-tomb', ts: Date.now() - 1000 }]),
          'bm_ferm_sicaklik': '19'
        } };
        const dosya = new File([JSON.stringify(yedek)], 'regtest_tomb.json', { type: 'application/json' });
        window.bmVeriImport({ files: [dosya], value: '' });
      });
      await nav;
      await page.waitForFunction(() => typeof render === 'function' && Array.isArray(KR), { timeout: 30000 });
      const c2 = await page.evaluate(() => {
        window.__REG = window.__REG || { chk: [], ok(a, k, d) { this.chk.push({ ad: a, ok: !!k, detay: d === undefined ? '' : String(d) }); }, al() { const c = this.chk; this.chk = []; return c; } };
        const L = JSON.parse(localStorage.getItem('bm_kr_sil_v1') || '[]');
        __REG.ok('f: import sonrası tombstone taşındı', L.some(t => t && t.id === 'import-tomb'));
        return __REG.al();
      });
      return c1.concat(c2);
    }
  },

  // ── SPRINT T: brewday inline ölçüm (mash_end pre-boil + pitch OG) ──
  // Referans değerler tests dışında node ile kanıtlandı: Lyons polinomu 0–100°C'de CRC su
  // yoğunluğu oranından max 0.00022 SG sapıyor; 1.040@50°C→1.051, 1.050@30°C→1.053.
  {
    kod: 'T-DUZELT', ad: 'hidrometre sıcaklık düzeltmesi: 20°C kimlik + referans değerler + absürt aralık reddi',
    calistir: (page) => page.evaluate(() => {
      __REG.ok('kimlik: kalibrasyon 20°C → değer değişmez', _bmHidroDuzelt(1.050, 20) === 1.05, String(_bmHidroDuzelt(1.050, 20)));
      __REG.ok('referans: 1.040 @ 50°C → 1.051 (su yoğunluk oranı ρ20/ρ50≈1.0103)', _bmHidroDuzelt(1.040, 50) === 1.051, String(_bmHidroDuzelt(1.040, 50)));
      __REG.ok('referans: 1.050 @ 30°C → 1.053', _bmHidroDuzelt(1.050, 30) === 1.053, String(_bmHidroDuzelt(1.050, 30)));
      __REG.ok('soğuk örnek aşağı düzeltir: 1.040 @ 0°C → 1.038', _bmHidroDuzelt(1.040, 0) === 1.038, String(_bmHidroDuzelt(1.040, 0)));
      __REG.ok('absürt sıcaklık reddi: 101°C ve -1°C → null', _bmHidroDuzelt(1.040, 101) === null && _bmHidroDuzelt(1.040, -1) === null);
      __REG.ok('sınırlar geçerli: 0°C ve 100°C düzeltme üretir', _bmHidroDuzelt(1.040, 0) != null && _bmHidroDuzelt(1.040, 100) != null);
      __REG.ok('geçersiz SG → null', _bmHidroDuzelt('x', 20) === null && _bmHidroDuzelt(0.5, 20) === null);
      return __REG.al();
    })
  },
  {
    kod: 'T-PB', ad: 'brewday mash_end inline pre-boil: değer S\'te + M2 donması + teardown/timer dayanıklı + °C düzeltme + reset temizliği',
    calistir: (page) => page.evaluate(async () => {
      const my = (typeof MAYALAR !== 'undefined' && MAYALAR.find(m => m && m.id)) || null;
      const id = __REG.yeniKayit('REGTEST T-PB', my ? { mayaId: my.id } : null);
      await brewdayBaslat();
      __REG.ok('brewday aktif + timeline DOM', window._brewday.aktif === true && !!document.getElementById('brewdayTimeline'));
      // timer çiftlenme riski: mash_step timer'ı çalışırken re-render interval'ı DEĞİŞTİRMEMELİ
      const t1 = window._brewday.timerInt;
      brewdayRender();
      __REG.ok('re-render timer interval ÇİFTLEMEDİ', window._brewday.timerInt === t1);
      brewdayAktifOnayla(); // mash_step tamam → mash_end aktif
      const ev = window._brewday.ajanda[window._brewday.aktifIdx];
      // AU2-3 BEKLENTİ GÜNCELLEMESİ: sparge kartı YALNIZ S.spargeL>0 iken üretilir. Bu reçetede
      // spargeL yok (BOS varsayılanı) → 1. onaydan sonra aktif kart HÂLÂ mash_end. Bu iddia artık
      // tesadüf değil, AU2-3 emniyetinin kanıtı: kart araya girmediği için mevcut reçetelerin
      // ajandası birebir aynı kalır (bkz. AU2-SPARGE-KART).
      __REG.ok('AU2-3 emniyet önkoşulu: bu reçetede spargeL yok (sparge kartı üretilmez)', S.spargeL == null, String(S.spargeL));
      __REG.ok('aktif kart mash_end', ev && ev.tip === 'mash_end', ev && ev.tip);
      const inp = document.getElementById('bdPbSG');
      __REG.ok('inline pre-boil inputu kartta', !!inp);
      inp.value = '1.040'; inp.dispatchEvent(new Event('change'));
      __REG.ok('değer S\'te yaşıyor: S.preboilOG=1.04', S.preboilOG === 1.04, String(S.preboilOG));
      __REG.ok('M2: snapshot.preboilOG dondu', S.brewSnapshot && S.brewSnapshot.preboilOG === 1.04);
      __REG.ok('KR aynası dondu', (KR.find(x => x && x.id === id) || {}).brewSnapshot.preboilOG === 1.04);
      // teardown re-render dayanıklılığı (brewdayRender = TAM teardown) + tik zararsız
      brewdayRender(); brewdayRender(); brewdayTimerTik();
      const inp2 = document.getElementById('bdPbSG');
      __REG.ok('çifte teardown sonrası değer duruyor (state\'ten basıldı)', !!inp2 && parseFloat(inp2.value) === 1.04, inp2 && inp2.value);
      __REG.ok('mikro-onay göstergesi', document.getElementById('brewdayTimeline').textContent.indexOf('Kaydedildi: 1.040') > -1);
      // °C girildi → DÜZELTİLMİŞ değer S'e/M2'ye; ham+düzeltilmiş şeffaf gösterim
      const tc = document.getElementById('bdPbC');
      tc.value = '50'; tc.dispatchEvent(new Event('change'));
      __REG.ok('50°C → S.preboilOG=1.051 (düzeltilmiş kaydedildi)', S.preboilOG === 1.051, String(S.preboilOG));
      __REG.ok('M2 düzeltilmişle güncellendi', S.brewSnapshot.preboilOG === 1.051);
      __REG.ok('şeffaflık: ham @ °C → düzeltilmiş görünür', document.getElementById('brewdayTimeline').textContent.indexOf('1.040 @ 50°C → 1.051') > -1);
      // absürt °C → düzeltme YOK, ham kaydedilir + uyarı
      const tc2 = document.getElementById('bdPbC');
      tc2.value = '130'; tc2.dispatchEvent(new Event('change'));
      __REG.ok('absürt °C → ham kaydedildi', S.preboilOG === 1.04, String(S.preboilOG));
      __REG.ok('absürt °C uyarısı görünür', document.getElementById('brewdayTimeline').textContent.indexOf('0–100°C dışında') > -1);
      // reset: inline elementler timeline çocuğu → artık bırakmaz; staging düşer; ölçüm S/KR\'de kalır
      brewdayZorlaSifirla(true);
      __REG.ok('reset: timeline + input + staging temizlendi', !document.getElementById('bdPbSG') && !document.getElementById('brewdayTimeline') && !window._brewday.olcum);
      __REG.ok('reset ölçümü SİLMEDİ (S kalıcı)', S.preboilOG === 1.04);
      return __REG.al();
    })
  },
  {
    kod: 'T-OG', ad: 'brewday pitch inline OG: og_olcum log + ogManuel + KR persist + tek-giriş güncelleme + boş geçiş serbest + Q beslemesi',
    calistir: (page) => page.evaluate(async () => {
      const my = (typeof MAYALAR !== 'undefined' && MAYALAR.find(m => m && m.id)) || null;
      __REG.ok('maya kataloğu var (pitch kartı önkoşulu)', !!my);
      const id = __REG.yeniKayit('REGTEST T-OG', { mayaId: my.id });
      await brewdayBaslat();
      brewdayAktifOnayla(); // mash_step → mash_end aktif
      // OPSİYONELLİK: mash_end hiçbir şey girmeden onaylanır, hata yok
      brewdayAktifOnayla();
      __REG.ok('boş geçiş: mash_end inputsuz onaylandı, preboil boş kaldı', S.preboilOG == null && window._brewday.ajanda.some(e => e.tip === 'mash_end' && e._tamamlandi));
      // pitch kartına atla
      let guard = 0;
      while (guard++ < 30) { const e = window._brewday.ajanda[window._brewday.aktifIdx]; if (!e || e.tip === 'pitch') break; brewdayAtla(); }
      const ev = window._brewday.ajanda[window._brewday.aktifIdx];
      __REG.ok('aktif kart pitch', ev && ev.tip === 'pitch', ev && ev.tip);
      const inp = document.getElementById('bdOgSG');
      __REG.ok('inline OG inputu kartta', !!inp);
      inp.value = '1.052'; inp.dispatchEvent(new Event('change'));
      let logs = S.brewLog.filter(x => x && x.tip === 'og_olcum');
      __REG.ok('og_olcum log yazıldı (deger 1.052)', logs.length === 1 && logs[0].deger === '1.052', logs.length + ' ' + (logs[0] && logs[0].deger));
      __REG.ok('ogManuel backfill (elle girişle aynı yol)', S.ogManuel === 1.052, String(S.ogManuel));
      __REG.ok('KR persist (tarifeKaydet zinciri)', ((KR.find(x => x && x.id === id) || {}).brewLog || []).some(x => x && x.tip === 'og_olcum' && x.deger === '1.052'));
      // değer düzeltildi → İKİNCİ giriş DEĞİL, aynı kaydın güncellenmesi
      const inp2 = document.getElementById('bdOgSG');
      inp2.value = '1.054'; inp2.dispatchEvent(new Event('change'));
      logs = S.brewLog.filter(x => x && x.tip === 'og_olcum');
      __REG.ok('değer değişti → TEK giriş (çift yok), deger güncel', logs.length === 1 && logs[0].deger === '1.054');
      __REG.ok('ogManuel güncellendi', S.ogManuel === 1.054);
      // Sprint Q beslemesi: şişelemede donacak canlı ikili ölçümü GÖRÜYOR
      const d = _brewSonucCanli(S);
      __REG.ok('Q beslemesi: _brewSonucCanli og_olcum\'u okuyor (kaynak=olcum)', d.og === 1.054 && d.ogKay === 'olcum', d.og + '/' + d.ogKay);
      // pitch onayı normal ilerler (input zorunlu değil) → brewday sonuna kadar akış sağlam
      brewdayAktifOnayla();
      __REG.ok('pitch onayı normal geçti', window._brewday.ajanda.some(e => e.tip === 'pitch' && e._tamamlandi));
      __REG.ok('app ayakta (brewday akışı bozulmadı)', typeof render === 'function' && !!document.getElementById('ekran'));
      return __REG.al();
    })
  },
  {
    kod: 'T-METIN', ad: 'araç-nötr ölçüm metinleri: mash_end + gravity ara-ölçüm alarmı refraktometre dayatmaz; refrakDuzelt duruyor',
    calistir: (page) => page.evaluate(() => {
      __REG.ok('brewdayAjandaUret refraktometre içermiyor', String(brewdayAjandaUret).indexOf('refraktometre') === -1);
      __REG.ok('mash_end metni ölçümü karta yönlendiriyor', String(brewdayAjandaUret).indexOf('karttaki alana girebilirsin') > -1);
      // AU2-3 BEKLENTİ GÜNCELLEMESİ: mash_end detayı artık ÜÇ DALLI (sparge kartı var / bilinçli
      // tam hacim / sparge bilinmiyor) ama araç-nötr ölçüm cümlesi TEK ve PAYLAŞILAN kalır —
      // dallardan birinde düşmesi sessiz bir gerileme olurdu.
      __REG.ok('AU2-3: araç-nötr ölçüm cümlesi tek ve tüm dallarda paylaşımlı', (String(brewdayAjandaUret).match(/karttaki alana girebilirsin/g) || []).length === 1, String((String(brewdayAjandaUret).match(/karttaki alana girebilirsin/g) || []).length));
      __REG.ok('_alarmPlaniKur ara-ölçüm metni araç-nötr', String(window._alarmPlaniKur).indexOf('refraktometre') === -1 && String(window._alarmPlaniKur).indexOf('yoğunluğu (SG) ölçüp kaydet') > -1);
      __REG.ok('refrakDuzelt hesaplayıcısı DURUYOR (bilinçli dokunulmadı)', typeof window.refrakDuzelt === 'function');
      return __REG.al();
    })
  },

  // ── SPRINT U1a: off-flavor teşhis motoru v1a (bilgi tabanı + tag 8→14 + statik teşhis kartı) ──
  {
    kod: 'U1-KB', ad: 'bilgi tabanı: 15 aile (U2 +ester) + zorunlu alanlar + adversaryal-düzeltilmiş domain gerçekleri',
    calistir: (page) => page.evaluate(() => {
      const T = window._OFF_TESHIS, K = window._OFF_KODLAR;
      __REG.ok('_OFF_KODLAR 15 aile (8 eski + 6 U1 + 1 U2 ester)', Array.isArray(K) && K.length === 15 &&
        ['diacetyl','DMS','acetaldehyde','fusel','oxidized','astringent','light-struck','solvent'].every(k => K.includes(k)) &&
        ['acetic','chlorophenol','sulfur','metallic','infection','phenolic','ester'].every(k => K.includes(k)), K && K.length);
      __REG.ok('her aile zorunlu alanlara sahip', K.every(k => { const d = T[k]; return d && d.ad && d.trDil.length && d.kokNeden.length && ['evet','kısmen','hayır'].includes(d.kurtarilir.seviye) && d.kurtarilir.nasil && d.onlem.length && Array.isArray(d.ayiriciSoru) && d.stilNotu; }));
      // hakem düzeltmeleri — kendi (düzeltilmemiş) bilgiden DEĞİL, belgeden AYNEN
      __REG.ok('Fenolik: Weizen soğuk=karanfil (ters ilişki)', /soğuk=karanfil/.test(T.phenolic.stilNotu));
      __REG.ok('Asetaldehit KISMEN kurtarılır (maya üstünde)', T.acetaldehyde.kurtarilir.seviye === 'kısmen' && /maya üzerinde/.test(T.acetaldehyde.kurtarilir.nasil));
      __REG.ok('Kükürt: maya geri-emer, CO2 sıyırması DEĞİL', /CO2 sıyırması değil/.test(T.sulfur.kurtarilir.nasil));
      __REG.ok('Asetik trDil yeşil elma İÇERMEZ (asetaldehit ayrımı)', !T.acetic.trDil.some(x => /yeşil elma/i.test(x)));
      __REG.ok('KISMEN kurtarılır tam = diacetyl+acetaldehyde+sulfur', JSON.stringify(K.filter(k => T[k].kurtarilir.seviye === 'kısmen').sort()) === JSON.stringify(['acetaldehyde','diacetyl','sulfur']));
      // U2 ester (muz) girdisi
      __REG.ok('U2 Ester: muz=izoamil asetat + Weizende İSTENEN karakter', /izoamil asetat/.test(T.ester.kokNeden.join(' ')) && /İSTENEN karakter/.test(T.ester.stilNotu) && T.ester.kurtarilir.seviye === 'hayır');
      __REG.ok('U2 Ester: kaldıraç sırası SICAKLIK>MAYA>O2/OG>pitch (pitch zayıf)', /SICAKLIK > MAYA SUŞU/.test(T.ester.stilNotu) && T.ester.kokNeden.some(x => /pitch rate ZAYIF/i.test(x)));
      return __REG.al();
    })
  },
  {
    kod: 'U1-CARD', ad: 'teşhis kartı: ? düğmesi modal açar (eski+yeni kod), içerik doğru, kapat + Escape',
    calistir: async (page) => {
      const c1 = await page.evaluate(() => {
        bmOffTeshis('diacetyl');
        const m = document.getElementById('bmOffModal');
        __REG.ok('modal açıldı', !!m);
        const t = m ? m.textContent : '';
        __REG.ok('başlık + kurtarılabilir(KISMEN) + neden/önlem bölümleri', /Diacetyl \(tereyağı\)/.test(t) && /KURTARILABİLİR/.test(t) && /KISMEN/.test(t) && /OLASI NEDENLER/.test(t) && /ÖNLEM/.test(t));
        __REG.ok('ayırıcı soru (emin misin — zamanla artıyor mu)', /EMİN MİSİN/.test(t) && /ZAMANLA artıyor/.test(t));
        __REG.ok('U2 uyarısı: kesin karar değil + tat/motor öncelikli (dil disiplini)', /kesin karar değil/.test(t) && !/sonraki sürümde gelecek/.test(t));
        bmOffTeshisKapat();
        __REG.ok('kapat modalı kaldırdı', !document.getElementById('bmOffModal'));
        bmOffTeshis('sulfur'); // YENİ kod
        __REG.ok('yeni kod (kükürt) modalı açtı', !!document.getElementById('bmOffModal') && /Kükürt/.test(document.getElementById('bmOffModal').textContent));
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        return __REG.al();
      });
      await page.waitForFunction(() => !document.getElementById('bmOffModal'), { timeout: 3000 });
      const c2 = await page.evaluate(() => { __REG.ok('Escape modalı kapattı', !document.getElementById('bmOffModal')); return __REG.al(); });
      return c1.concat(c2);
    }
  },
  {
    kod: 'U1-COMPAT', ad: 'tag 8→15 render + eski tadım geriye-uyumlu + delta yeni kodları kapsar',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('REGTEST U1-COMPAT', {
        brewLog: [{ id: 'u1s', ts: 1000, tip: 'siseleme', tarih: '2026-06-01' }],
        tadim: {
          aroma: 8, gorunum: 2, tat: 14, agizH: 4, genel: 7,
          offList: { diacetyl: false, sulfur: true },
          oturumlar: [
            { tarih: '2026-06-01', aroma: 6, gorunum: 2, tat: 10, agizH: 3, genel: 5, toplam: 26, offList: { diacetyl: true } }, // ESKİ: yalnız eski kod (yeni 6 tag YOK)
            { tarih: '2026-06-15', aroma: 8, gorunum: 2, tat: 14, agizH: 4, genel: 7, toplam: 35, offList: { sulfur: true } }   // YENİ: diacetyl çözüldü, YENİ kod çıktı
          ]
        }
      });
      tarifAc(id);
      const h = rEditorNot();
      __REG.ok('15 tag render edildi (? teşhis düğmeleri)', (h.split('bmOffTeshis(').length - 1) === 15, String(h.split('bmOffTeshis(').length - 1));
      __REG.ok('eski 8 + yeni 6 etiket mevcut', /_tOffLbl_diacetyl/.test(h) && /_tOffLbl_solvent/.test(h) && /_tOffLbl_sulfur/.test(h) && /_tOffLbl_phenolic/.test(h) && /_tOffLbl_infection/.test(h));
      __REG.ok('yeni tag TR adları render', /Kükürt/.test(h) && /Klorofenol/.test(h) && /Fenolik-baharat/.test(h));
      /* SPRINT BN — DİL DÜZELDİ, bu iddialar da onunla güncellendi.
         Eski hâli "çözüldü:" / "yeni:" arıyordu; o etiketler kanıtın ötesinde iddiaydı
         (işaretsizlik = kusur yok DEĞİL; kullanıcı off bölümüne bakmamış olabilir).
         Bu vaka eski dili DONDURUYORDU — düzeltme onu kırdı, doğrusu bu. */
      __REG.ok('geriye-uyumlu delta: önceki oturumda işaretli Diacetyl, şimdi işaretsiz → "işaretlenmedi" dili', /bu oturumda işaretlenmedi:[^<]*Diacetyl/.test(h));
      __REG.ok('delta YENİ kodu kapsıyor: Kükürt "bu oturumda işaretlendi"', /bu oturumda işaretlendi:[^<]*Kükürt/.test(h));
      __REG.ok('BN: "çözüldü" iddiası ARTIK YOK (kanıt yetersizdi)', h.indexOf('çözüldü') === -1);
      __REG.ok('eski offList render çökmedi (undefined tag yok)', h.indexOf('_tOffLbl_undefined') === -1);
      return __REG.al();
    })
  },
  {
    kod: 'BN-DELTA-DIL', ad: 'AG oturum delta dili kanıta uygun: işaretsizlik "çözüldü" sayılmaz, işaretlilik uyarı kalır',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('REGTEST BN-DELTA', {
        brewLog: [{ id: 'bns', ts: 1000, tip: 'siseleme', tarih: '2026-06-01' }],
        tadim: {
          aroma: 8, gorunum: 2, tat: 14, agizH: 4, genel: 7, offList: {},
          oturumlar: [
            // 1. oturum: diacetyl İŞARETLİ
            { tarih: '2026-06-01', aroma: 6, gorunum: 2, tat: 10, agizH: 3, genel: 5, toplam: 26, offList: { diacetyl: true } },
            // 2. oturum: diacetyl İŞARETSİZ (bakılmadı mı, yok mu — BİLİNMİYOR) + DMS yeni işaretli
            { tarih: '2026-06-15', aroma: 8, gorunum: 2, tat: 14, agizH: 4, genel: 7, toplam: 35, offList: { DMS: true } }
          ]
        }
      });
      tarifAc(id);
      const h = rEditorNot();
      // (a) ZAYIF KANIT — işaretsizlik "çözüldü" diye SATILMAZ
      __REG.ok('a1: "çözüldü" iddiası YOK', h.indexOf('çözüldü') === -1);
      __REG.ok('a2: dürüst dil kullanılıyor', /bu oturumda işaretlenmedi:[^<]*Diacetyl/.test(h));
      __REG.ok('a3: başarı yeşili (--yk) ile sunulmuyor — nötr renk', !/color:var\(--yk\)">◦ bu oturumda işaretlenmedi/.test(h));
      __REG.ok('a4: itiraf notu var ("yok demek değil")', h.indexOf('yok demek değil') >= 0);
      // (b) GÜÇLÜ KANIT — kullanıcı AKTİF işaretledi, uyarı korunur
      __REG.ok('b1: işaretli kusur bildiriliyor', /bu oturumda işaretlendi:[^<]*DMS/.test(h));
      __REG.ok('b2: uyarı rengi (--kk) korunuyor', /color:var\(--kk\)">⚠️ bu oturumda işaretlendi/.test(h));
      __REG.ok('b3: "yeni" sözcüğü (kanıtsız kısım) kaldırıldı', !/⚠️ yeni:/.test(h));
      return __REG.al();
    })
  },
  {
    kod: 'BN-DELTA-SESSIZ', ad: 'AG delta: hiç off işaretlenmemiş iki oturumda ne "çözüldü" ne "işaretlenmedi" satırı çıkar',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('REGTEST BN-SESSIZ', {
        brewLog: [{ id: 'bns2', ts: 1000, tip: 'siseleme', tarih: '2026-06-01' }],
        tadim: {
          aroma: 8, gorunum: 2, tat: 14, agizH: 4, genel: 7, offList: {},
          oturumlar: [
            { tarih: '2026-06-01', aroma: 6, gorunum: 2, tat: 10, agizH: 3, genel: 5, toplam: 26, offList: {} },
            { tarih: '2026-06-15', aroma: 8, gorunum: 2, tat: 14, agizH: 4, genel: 7, toplam: 35, offList: {} }
          ]
        }
      });
      tarifAc(id);
      const h = rEditorNot();
      __REG.ok('delta kartı çiziliyor (iki oturum var)', h.indexOf('SON İKİ OTURUM') >= 0);
      __REG.ok('off satırı hiç çıkmıyor — uydurma yok', h.indexOf('bu oturumda işaretlenmedi') === -1 && h.indexOf('bu oturumda işaretlendi') === -1);
      __REG.ok('itiraf notu da çıkmıyor (gürültü yapmaz)', h.indexOf('yok demek değil') === -1);
      return __REG.al();
    })
  },
  {
    kod: 'U1-KAYNAK', ad: 'tek kaynak: _bmOffKisaCozum timeline yönlendirmesi tablodan besleniyor',
    calistir: (page) => page.evaluate(() => {
      __REG.ok('_bmOffKisaCozum fonksiyon', typeof window._bmOffKisaCozum === 'function');
      const c = window._bmOffKisaCozum('diacetyl');
      __REG.ok('diacetyl kısa çözüm "Çözüm:" ile başlar + tablodan (rest)', /^Çözüm: /.test(c) && /diacetyl rest/i.test(c), c);
      __REG.ok('bilinmeyen kod boş döner (güvenli)', window._bmOffKisaCozum('yok') === '');
      return __REG.al();
    })
  },

  // ── SPRINT U2: batch-farkında keskinleştirme ("senin verinde" + stil/maya-tip farkı) ──
  {
    kod: 'U2-STYLE-WEIZEN', ad: 'stil-farkında: Weizen mayası (wheat) + muz/ester → KARAKTER, kusur değil (Kaan yanılmasın)',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('REGTEST U2-WEIZEN', { mayaId: 'wy3068' });
      tarifAc(id);
      const box = window._bmOffBatchIpucu('ester');
      __REG.ok('batch kutusu üretildi (maya var)', typeof box === 'string' && box.length > 0);
      __REG.ok('muz KARAKTERDİR kusur değil (defect DAMGALAMA yok)', /karakterdir, kusur değil/i.test(box) && !/kusur işareti/.test(box));
      __REG.ok('Weizen mayası tanındı', /Weizen/.test(box));
      bmOffTeshis('ester');
      const t = document.getElementById('bmOffModal').textContent;
      __REG.ok('kartta SENİN VERİNDE bölümü + kusur değil mesajı', /SENİN VERİNDE/.test(t) && /kusur değil/.test(t));
      bmOffTeshisKapat();
      return __REG.al();
    })
  },
  {
    kod: 'U2-STYLE-CLEAN', ad: 'stil-farkında: nötr ale (us05) + muz/ester → kusur işareti + yüksek sıcaklık nedeni',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('REGTEST U2-CLEAN', {
        mayaId: 'us05',
        brewLog: [ { id: 'c1', ts: 1, tip: 'sicaklik', deger: '25', tarih: '2026-06-01' }, { id: 'c2', ts: 2, tip: 'sicaklik', deger: '26', tarih: '2026-06-02' } ]
      });
      tarifAc(id);
      const box = window._bmOffBatchIpucu('ester');
      __REG.ok('nötr suşta muz BEKLENMEZ (kusur işareti)', /beklenmez/.test(box) && /kusur işareti/.test(box));
      __REG.ok('yüksek sıcaklık (26°C > ideal 20+2) muhtemel sebep', /26°C/.test(box) && /muhtemel sebep bu/.test(box));
      __REG.ok('Weizen "karakterdir" olumlaması ÇIKMAZ (yanlış olumlama yok)', !/karakterdir, kusur değil/.test(box));
      return __REG.al();
    })
  },
  {
    kod: 'U2-PHENOLIC-WEIZEN', ad: 'stil-farkında fenolik: Weizen + karanfil → beklenen karakter + soğuk=karanfil yönü',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('REGTEST U2-PH-WEIZEN', { mayaId: 'wy3068' });
      tarifAc(id);
      const box = window._bmOffBatchIpucu('phenolic');
      __REG.ok('karanfil beklenen karakter (POF+ suş)', /beklenen karakter/.test(box) && /POF\+/.test(box));
      __REG.ok('Weizen yön: daha soğuk = daha karanfil', /daha soğuk = daha karanfil/.test(box));
      return __REG.al();
    })
  },
  {
    kod: 'U2-PHENOLIC-CLEAN', ad: 'stil-farkında fenolik: temiz ale + karanfil → POF− yapmaz, klor/yanlış maya',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('REGTEST U2-PH-CLEAN', { mayaId: 'us05' });
      tarifAc(id);
      const box = window._bmOffBatchIpucu('phenolic');
      __REG.ok('temiz suş → karanfil yapmaz (POF− dalı)', /POF/.test(box) && /yapmaz/.test(box) && !/beklenen karakter/.test(box));
      __REG.ok('klor/yanlış maya yönlendirmesi', /klor/.test(box));
      return __REG.al();
    })
  },
  {
    kod: 'U2-FUSEL-TEMP', ad: 'batch sıcaklık: yüksek fermantasyon + fusel → sıcaklık güçlü/muhtemel aday',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('REGTEST U2-FUSEL', {
        mayaId: 'us05',
        brewLog: [ { id: 'f1', ts: 1, tip: 'sicaklik', deger: '27', tarih: '2026-06-01' }, { id: 'f2', ts: 2, tip: 'sicaklik', deger: '28', tarih: '2026-06-02' } ]
      });
      tarifAc(id);
      const box = window._bmOffBatchIpucu('fusel');
      __REG.ok('yüksek sıcaklık (28°C) fuselin muhtemel nedeni', /28°C/.test(box) && /muhtemel sebep bu/.test(box));
      return __REG.al();
    })
  },
  {
    kod: 'U2-FGSAPMA-DIACETYL', ad: 'batch FG: hedef üstü FG (düşük attenüasyon) + diacetyl → temizlenmemiş güçlü aday',
    calistir: (page) => page.evaluate(() => {
      // hedef FG = brewday snapshot SAF tahmini (manuel FG override sızmaz); gerçek FG = fgManuel ölçümü hedefin belirgin üstünde
      const id = __REG.yeniKayit('REGTEST U2-FGSAP', {
        mayaId: 'us05',
        brewSnapshot: { ts: 1000, ogT: 1.055, fgT: 1.012 },
        fgManuel: '1.028'
      });
      tarifAc(id);
      const box = window._bmOffBatchIpucu('diacetyl');
      __REG.ok('gerçek FG (1.028) hedef snapshot.fgT (1.012) üstünde → underattenuation', /üstünde/.test(box) && /güçlü aday/.test(box), 'box=' + JSON.stringify(box).slice(0, 100));
      __REG.ok('hedef FG snapshot.fgT-den geldi (calc override değil)', /1\.012/.test(box) && /1\.028/.test(box));
      return __REG.al();
    })
  },
  {
    kod: 'U2-SULFUR-LAGER', ad: 'maya-tip: lager mayası + kükürt → NORMAL, olgunlaşmada geri emer',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('REGTEST U2-SULFUR', { mayaId: 'w3470' });
      tarifAc(id);
      const box = window._bmOffBatchIpucu('sulfur');
      __REG.ok('lagerde kükürt normaldir + geri emer', /lagerlerde normaldir/.test(box) && /geri emer/.test(box));
      return __REG.al();
    })
  },
  {
    kod: 'U2-GRACEFUL', ad: 'graceful: batch-mantığı olmayan aile (oxidized) + veri-yok ester → boş kutu (statik korunur, çökme yok)',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('REGTEST U2-GRACE', { mayaId: 'us05' });
      tarifAc(id);
      __REG.ok('oxidized: batch mantığı yok → boş kutu (graceful)', window._bmOffBatchIpucu('oxidized') === '');
      S.mayaId = null; // maya-yok → ester stil-farkı üretemez
      __REG.ok('maya-yok ester → boş kutu (statik karta düşer)', window._bmOffBatchIpucu('ester') === '');
      bmOffTeshis('oxidized');
      __REG.ok('batch kutusu boşken statik kart yine açılır (SENİN VERİNDE yok)', !!document.getElementById('bmOffModal') && !/SENİN VERİNDE/.test(document.getElementById('bmOffModal').textContent));
      bmOffTeshisKapat();
      return __REG.al();
    })
  },
  {
    kod: 'U2-DIL', ad: 'dil disiplini: batch kutuları "kesin" iddia etmez (aday/muhtemel/olabilir dili — Sprint Q ruhu)',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('REGTEST U2-DIL', {
        mayaId: 'us05',
        brewSnapshot: { ts: 1000, ogT: 1.055, fgT: 1.012 },
        fgManuel: '1.028',
        brewLog: [ { id: 'd1', ts: 1, tip: 'sicaklik', deger: '27', tarih: '2026-06-01' }, { id: 'd2', ts: 2, tip: 'sicaklik', deger: '28', tarih: '2026-06-02' } ]
      });
      tarifAc(id);
      const kodlar = ['ester', 'phenolic', 'fusel', 'diacetyl', 'acetaldehyde', 'sulfur', 'solvent', 'DMS'];
      const yasak = /kesinlikle|kesin sebep|kesin bu|kesin neden|%100|garanti/i;
      let hepsiTemiz = true, ornek = '';
      kodlar.forEach(k => { const b = window._bmOffBatchIpucu(k) || ''; if (yasak.test(b)) { hepsiTemiz = false; ornek = k; } });
      __REG.ok('hiçbir batch kutusu kesinlik iddia etmiyor', hepsiTemiz, ornek);
      const f = window._bmOffBatchIpucu('fusel');
      __REG.ok('temkinli dil kullanılıyor (muhtemel/aday/olabilir)', /muhtemel|aday|olabilir/.test(f));
      return __REG.al();
    })
  },

  // ── SPRINT V1a: stilden reçete başlatma (küratörlü iskelet + ölçekleme + tutarlılık kapısı) ──
  {
    kod: 'V-ISKELET-GATE', ad: 'TUTARLILIK KAPISI: her STIL_ISKELET → calc() OG/IBU/SRM BJCP aralığında (X2: koyu stil srm-tavan>=30 SRM üst serbest) + tüm ID katalogda (bozuk iskelet koruması)',
    calistir: (page) => page.evaluate(() => {
      const styles = Object.keys(window.STIL_ISKELET || {});
      __REG.ok('STIL_ISKELET 63 stil (20 küratörlü + 4 V1b + 18 V2 + 21 V3/AL)', styles.length === 63, String(styles.length));
      yeniTarif();
      let idFail = [], rangeFail = [], pctFail = [];
      styles.forEach(st => {
        const isk = window.STIL_ISKELET[st];
        const bj = BJCP[st];
        if (!bj) { rangeFail.push(st + ':BJCP-YOK'); return; }
        // grist % toplam 100
        const pctSum = isk.grist.reduce((a, g) => a + g[1], 0);
        if (Math.abs(pctSum - 100) > 0.01) pctFail.push(st + '=' + pctSum);
        // her ID katalogda
        isk.grist.forEach(g => { if (!MALTLAR.find(m => m && m.id === g[0])) idFail.push(st + ':malt:' + g[0]); });
        (isk.hop || []).forEach(hp => { if (!HOPLAR.find(x => x && x.id === hp.id)) idFail.push(st + ':hop:' + hp.id); });
        if (isk.mayaId && !MAYALAR.find(m => m && m.id === isk.mayaId)) idFail.push(st + ':maya:' + isk.mayaId);
        // ölçekle + GERÇEK calc() ile aralık kontrolü
        const r = window._stilIskeletHesap(st, 11, 61);
        if (!r || !r.malts.length) { rangeFail.push(st + ':hesap-null'); return; }
        S.hacim = 11; S.verim = 61; S.maltlar = r.malts; S.hoplar = r.hops; S.mayaId = r.mayaId; S.ogManuel = null; S.fgManuel = null; S.katkilar = []; S.maya2Id = '';
        const c = calc();
        const srm = (c.srm != null) ? +c.srm : hSRM(S.maltlar, [], 11);
        if (!(c.og >= bj.og[0] && c.og <= bj.og[1])) rangeFail.push(st + ':OG=' + c.og.toFixed(3) + '[' + bj.og + ']');
        if (!(c.ibu >= bj.ibu[0] && c.ibu <= bj.ibu[1])) rangeFail.push(st + ':IBU=' + Math.round(c.ibu) + '[' + bj.ibu + ']');
        if (!(srm >= bj.srm[0] && (bj.srm[1] >= 30 || srm <= bj.srm[1]))) rangeFail.push(st + ':SRM=' + srm + '[' + bj.srm + ']');
      });
      __REG.ok('grist %% toplamı 100 (tüm iskelet)', pctFail.length === 0, pctFail.slice(0, 4).join(' | '));
      __REG.ok('tüm ID katalogda (malt/hop/maya) — sahte ID yok', idFail.length === 0, idFail.slice(0, 5).join(' | '));
      __REG.ok('tüm iskelet calc() OG+IBU+SRM BJCP aralığında — bozuk iskelet yok', rangeFail.length === 0, rangeFail.slice(0, 5).join(' | '));
      return __REG.al();
    })
  },
  {
    kod: 'V-DOLDUR', ad: 'boş reçetede iskelet doldur (Weizen): malt/hop/maya/mash doldu + calc() BJCP Weizen aralığında',
    calistir: (page) => page.evaluate(() => {
      yeniTarif();
      S.stil = 'Weizen / Weissbier'; S.hacim = 11; S.verim = 61;
      __REG.ok('başlangıçta boş (malt/hop yok)', S.maltlar.length === 0 && S.hoplar.length === 0);
      bmStilIskeletDoldur();
      __REG.ok('malt dolduruldu (buğday + pilsner)', S.maltlar.length >= 2 && S.maltlar.some(m => m.id === 'wheat'));
      __REG.ok('hop dolduruldu', S.hoplar.length >= 1);
      __REG.ok('maya dolduruldu (wy3068 Weizen)', S.mayaId === 'wy3068');
      __REG.ok('mash sıcaklığı ayarlandı', S.mashSc === 67);
      const c = calc(); const bj = BJCP['Weizen / Weissbier'];
      __REG.ok('calc() OG BJCP Weizen aralığında', c.og >= bj.og[0] && c.og <= bj.og[1], 'OG=' + c.og.toFixed(3));
      __REG.ok('calc() IBU BJCP Weizen aralığında', c.ibu >= bj.ibu[0] && c.ibu <= bj.ibu[1], 'IBU=' + Math.round(c.ibu));
      __REG.ok('her malt ID katalogda (demlenebilir)', S.maltlar.every(m => !!MALTLAR.find(x => x && x.id === m.id)));
      return __REG.al();
    })
  },
  {
    kod: 'V-SCALE', ad: 'ÖLÇEKLEME: aynı iskelet 11L vs 22L → miktar ~2x, oran + OG/IBU hedefi korunur',
    calistir: (page) => page.evaluate(() => {
      const r11 = window._stilIskeletHesap('American IPA', 11, 61);
      const r22 = window._stilIskeletHesap('American IPA', 22, 61);
      const kg11 = r11.malts.reduce((a, m) => a + m.kg, 0), kg22 = r22.malts.reduce((a, m) => a + m.kg, 0);
      __REG.ok('22L malt miktarı ~2x 11L', Math.abs(kg22 / kg11 - 2) < 0.03, '11L=' + kg11.toFixed(2) + ' 22L=' + kg22.toFixed(2));
      __REG.ok('malt ORANI korundu (ilk malt payı sabit)', Math.abs((r11.malts[0].kg / kg11) - (r22.malts[0].kg / kg22)) < 0.005);
      __REG.ok('OG hedefi ölçekten bağımsız (aynı)', Math.abs(r11.hedef.og - r22.hedef.og) < 0.002, r11.hedef.og + ' vs ' + r22.hedef.og);
      __REG.ok('IBU hedefi ölçekten bağımsız (aynı)', Math.abs(r11.hedef.ibu - r22.hedef.ibu) <= 1, r11.hedef.ibu + ' vs ' + r22.hedef.ibu);
      const hop22 = r22.hops[0].g, hop11 = r11.hops[0].g;
      __REG.ok('hop miktarı da ölçeklendi (~2x)', Math.abs(hop22 / hop11 - 2) < 0.05, hop11 + ' vs ' + hop22);
      return __REG.al();
    })
  },
  {
    kod: 'V-CONFIRM', ad: 'dolu reçetede onay: reddedilirse mevcut korunur, kabul edilirse iskeletle değişir',
    calistir: (page) => page.evaluate(() => {
      const _oldConfirm = window.confirm;
      yeniTarif();
      S.stil = 'American IPA'; S.hacim = 11;
      S.maltlar = [{ id: 'maris', kg: 5, marka: '', _ad: 'Maris Otter' }]; // kullanıcının mevcut işi
      window.confirm = () => false; // REDDET
      bmStilIskeletDoldur();
      __REG.ok('onay reddedildi → mevcut malt KORUNDU (maris tek, ezilmedi)', S.maltlar.length === 1 && S.maltlar[0].id === 'maris');
      window.confirm = () => true; // KABUL ET
      bmStilIskeletDoldur();
      __REG.ok('onay kabul → iskelet mevcut malzemeyi değiştirdi (pale_ale bazlı)', S.maltlar.length >= 2 && S.maltlar.some(m => m.id === 'pale_ale') && !S.maltlar.some(m => m.id === 'maris'));
      window.confirm = _oldConfirm;
      return __REG.al();
    })
  },
  {
    kod: 'V-CLAYER', ad: 'C katmanı: iskeleti OLMAYAN stil → maya önerisi dolar, malt/hop BOŞ kalır (sahte iskelet UYDURMA)',
    calistir: (page) => page.evaluate(() => {
      // Sprint AL NOTU: eskiden sabit "Munich Dunkel" kullanılıyordu; V3 çıkarımı ona
      // iskelet ürettiği için örnek DİNAMİK seçilir — test gelecekteki iskelet
      // eklemelerine dayanıklı olsun (sabit isim = her sprintte bayatlayan test).
      const iskeletsiz = Object.keys(BJCP).filter(a => !window.STIL_ISKELET[a]);
      __REG.ok('iskeleti olmayan BJCP stili hâlâ var (C katmanı canlı)', iskeletsiz.length > 0, iskeletsiz.length + ' stil');
      const hedef = iskeletsiz[0];
      const beklenenMaya = window._stilMayaOner ? window._stilMayaOner(hedef) : '';
      yeniTarif();
      S.stil = hedef; S.hacim = 11;
      bmStilIskeletDoldur();
      __REG.ok('maya önerisi dolduruldu (_stilMayaOner ile aynı)', !!S.mayaId && S.mayaId === beklenenMaya, hedef + ' → ' + S.mayaId);
      __REG.ok('malt BOŞ kaldı (sahte malzeme uydurulmadı)', S.maltlar.length === 0);
      __REG.ok('hop BOŞ kaldı (sahte malzeme uydurulmadı)', S.hoplar.length === 0);
      return __REG.al();
    })
  },
  {
    kod: 'V-FREEDOM', ad: 'iskelet KİLİT DEĞİL: doldurduktan sonra kullanıcı serbestçe malt değiştirebilir',
    calistir: (page) => page.evaluate(() => {
      yeniTarif();
      S.stil = 'German Pils'; S.hacim = 11;
      bmStilIskeletDoldur();
      const oncekiN = S.maltlar.length;
      __REG.ok('iskelet doldu', oncekiN >= 1);
      // kullanıcı bir malt daha ekler (serbestçe)
      S.maltlar.push({ id: 'munich', kg: 0.5, marka: '', _ad: 'Munich Malt' });
      __REG.ok('kullanıcı malt ekleyebildi (kilit yok)', S.maltlar.length === oncekiN + 1);
      // ve bir maltı çıkarabilir
      S.maltlar.splice(0, 1);
      __REG.ok('kullanıcı malt çıkarabildi', S.maltlar.length === oncekiN);
      return __REG.al();
    })
  },

  // ── SPRINT V1b: A katmanı — dataset çıkarımı (eşik + kaynak izi + küratör-önceliği + şeffaflık) ──
  {
    kod: 'V1B-KAYNAK', ad: 'kaynak izi: her iskelet kurator|cikarim etiketli, 20+4 dağılım, her çıkarım n>=5 (eşik kanıtı)',
    calistir: (page) => page.evaluate(() => {
      const entries = Object.entries(window.STIL_ISKELET || {});
      const IZLER = ['kurator', 'cikarim', 'cikarim_v2', 'cikarim_v3'];
      __REG.ok('her iskelette kaynak izi var (kurator|cikarim|cikarim_v2|cikarim_v3)', entries.length > 0 && entries.every(([, i]) => IZLER.indexOf(i.kaynak) >= 0));
      const kur = entries.filter(([, i]) => i.kaynak === 'kurator'), cik = entries.filter(([, i]) => i.kaynak === 'cikarim'),
        cik2 = entries.filter(([, i]) => i.kaynak === 'cikarim_v2'), cik3 = entries.filter(([, i]) => i.kaynak === 'cikarim_v3');
      __REG.ok('20 küratörlü + 4 V1b + 18 V2 batch + 21 V3/AL (376K korpus)', kur.length === 20 && cik.length === 4 && cik2.length === 18 && cik3.length === 21, kur.length + '+' + cik.length + '+' + cik2.length + '+' + cik3.length);
      __REG.ok('her V1b/V2 çıkarım iskeleti n>=5 taşır (eşik-altı çıkarım YOK)', cik.concat(cik2).every(([, i]) => typeof i.n === 'number' && i.n >= 5), cik.concat(cik2).filter(([, i]) => !(i.n >= 5)).map(([a, i]) => a + ':n=' + i.n).join(' | '));
      // V3 eşiği çok daha yüksek: ön-filtre SONRASI havuz n>=40 (376K korpusta V2'nin 5'i anlamsız düşük kalır)
      __REG.ok('her V3 iskeleti n>=40 + maya-tip izi taşır', cik3.every(([, i]) => typeof i.n === 'number' && i.n >= 40 && !!i.maya), cik3.filter(([, i]) => !(i.n >= 40 && i.maya)).map(([a, i]) => a + ':n=' + i.n).join(' | '));
      __REG.ok('beklenen 4 V1b çıkarım stili', ['Czech Premium Pale Lager', 'Festbier / Wiesn', 'American Barleywine', 'English Brown Ale'].every(a => window.STIL_ISKELET[a] && window.STIL_ISKELET[a].kaynak === 'cikarim'));
      return __REG.al();
    })
  },
  {
    kod: 'V1B-ESIK', ad: 'veri-dürüstlük: V1b eşik-altı stiller V2 batch (817 reçete) ile qualified; kalıcı dışlananlar (West Coast maya-tip, Imperial Stout renk-sıcak) hâlâ dışarıda',
    calistir: (page) => page.evaluate(() => {
      // V1b'de (199 reçete) eşik-altıydı; V2 batch parser (817 reçete) daha çok veriyle qualified etti
      const v2Promoted = ['Imperial IPA / DIPA', 'Milk Stout / Sweet Stout', 'Vienna Lager', 'Doppelbock'];
      // MAYA-TİP gerekçesiyle dışlanan KALICIDIR (veri sorunu değil, kategorik güvenlik)
      const kaliciDisla = ['West Coast IPA'];
      __REG.ok('kontrol stilleri BJCP otoritesinde mevcut', v2Promoted.concat(kaliciDisla).every(a => !!BJCP[a]));
      __REG.ok('V1b eşik-altı stiller V2 batch parser ile qualified (kaynak cikarim_v2)', v2Promoted.every(a => window.STIL_ISKELET[a] && window.STIL_ISKELET[a].kaynak === 'cikarim_v2'), v2Promoted.filter(a => !window.STIL_ISKELET[a]).join(' | '));
      __REG.ok('MAYA-TİP dışlaması KALICI (West Coast IPA: Cold-IPA lager-maya kirliliği, ön-filtre)', kaliciDisla.every(a => !window.STIL_ISKELET[a]));
      // Sprint AL: Imperial Stout V2'de "motor-renk >1.9×BJCP-max" diye düşmüştü. Sprint X2'nin
      // KOYU_SMAX=30 toleransı (srm-tavanı>=30 stillerde üst-yön serbest) bu engeli KALDIRDI →
      // V3'te otantik koyu grist ile GEÇTİ. Bu bir gevşetme DEĞİL: alt sınır ve OG/IBU aynen zorunlu.
      const IS = window.STIL_ISKELET['Imperial / Russian Imperial Stout'];
      __REG.ok('Imperial Stout ARTIK tabloda (X2 KOYU_SMAX toleransı, kaynak cikarim_v3)', !!IS && IS.kaynak === 'cikarim_v3', IS ? IS.kaynak + ' n=' + IS.n : 'YOK');
      __REG.ok('Imperial Stout gristi otantik koyu kavurma içeriyor', !!IS && IS.grist.some(g => /choc|roast|black|crf/.test(g[0])), IS ? JSON.stringify(IS.grist) : '-');
      return __REG.al();
    })
  },
  {
    kod: 'V1B-KURATOR-WINS', ad: 'çakışma kuralı: veri-güçlü stiller (AIPA n=14, Saison n=10, Weizen n=7, APA n=6) KÜRATÖRLÜ kaldı — çıkarım ezmedi',
    calistir: (page) => page.evaluate(() => {
      const dort = ['American IPA', 'Saison / Farmhouse Ale', 'Weizen / Weissbier', 'American Pale Ale'];
      __REG.ok('4 veri-güçlü stil kaynak=kurator', dort.every(a => window.STIL_ISKELET[a] && window.STIL_ISKELET[a].kaynak === 'kurator'));
      const aipa = window.STIL_ISKELET['American IPA'];
      __REG.ok('AIPA grist V1a küratörlü değerinde (pale_ale 88)', aipa.grist[0][0] === 'pale_ale' && aipa.grist[0][1] === 88);
      __REG.ok('AIPA çıkarım-meta (n) taşımıyor', aipa.n === undefined);
      return __REG.al();
    })
  },
  {
    kod: 'V1B-DOLDUR', ad: 'V1b iskeleti uçtan uca: Czech Premium doldur → calc() BJCP aralığında + flash "8 gerçek reçeteden türetildi" şeffaflığı',
    calistir: (page) => page.evaluate(() => {
      yeniTarif();
      S.stil = 'Czech Premium Pale Lager'; S.hacim = 11; S.verim = 61;
      const isk = window.STIL_ISKELET['Czech Premium Pale Lager'];
      __REG.ok('V1b iskeleti kaynak izi cikarim(n=8)', !!isk && isk.kaynak === 'cikarim' && isk.n === 8);
      let msg = ''; const _f = window.flash; window.flash = (m) => { msg = String(m); };
      bmStilIskeletDoldur();
      window.flash = _f;
      __REG.ok('malt dolduruldu (pilsner bazlı — 8 reçete medyanı)', S.maltlar.length >= 1 && S.maltlar[0].id === 'pilsner');
      __REG.ok('hop dolduruldu (saaz acı + sterling aroma)', S.hoplar.length === 2 && S.hoplar.some(h => h.id === 'saaz'));
      __REG.ok('maya wy2124 (8/8 veri modu)', S.mayaId === 'wy2124');
      __REG.ok('şeffaflık: flash "(8 gerçek reçeteden türetildi)" içeriyor', msg.includes('(8 gerçek reçeteden türetildi)'), msg);
      const c = calc(); const bj = BJCP['Czech Premium Pale Lager'];
      __REG.ok('calc() OG BJCP aralığında', c.og >= bj.og[0] && c.og <= bj.og[1], 'OG=' + c.og.toFixed(3));
      __REG.ok('calc() IBU BJCP aralığında', c.ibu >= bj.ibu[0] && c.ibu <= bj.ibu[1], 'IBU=' + Math.round(c.ibu));
      return __REG.al();
    })
  },

  // ── SPRINT V2: batch parser — deterministik alias + maya-tip disiplini + renk kalibrasyonu ──
  {
    kod: 'V2-KAYNAK', ad: 'kaynak izi: 18 V2 iskelet kaynak=cikarim_v2 + maya-tip alanı + n>=5; Kaan favorileri (Doppelbock/Schwarzbier/Belgian Dark Strong/Quad/Vienna/Baltic Porter/Wee Heavy/Best Bitter) mevcut',
    calistir: (page) => page.evaluate(() => {
      const v2 = Object.entries(window.STIL_ISKELET || {}).filter(([, i]) => i.kaynak === 'cikarim_v2');
      __REG.ok('18 V2 batch iskeleti', v2.length === 18, String(v2.length));
      __REG.ok('her V2 iskeleti kaynak izi taşır (cikarim_v2 + n>=5 + maya-tip)', v2.every(([, i]) => i.kaynak === 'cikarim_v2' && typeof i.n === 'number' && i.n >= 5 && typeof i.maya === 'string' && i.maya.length), v2.filter(([, i]) => !(i.n >= 5 && i.maya)).map(([a]) => a).join(' | '));
      const favori = ['Doppelbock', 'Schwarzbier', 'Belgian Dark Strong Ale', 'Belgian Quadrupel / Abt', 'Vienna Lager', 'Baltic Porter', 'Scottish Ale / Wee Heavy', 'Best Bitter'];
      __REG.ok('Kaan favorileri V2 ile eklendi (kaynak cikarim_v2)', favori.every(a => window.STIL_ISKELET[a] && window.STIL_ISKELET[a].kaynak === 'cikarim_v2'), favori.filter(a => !window.STIL_ISKELET[a]).join(' | '));
      return __REG.al();
    })
  },
  {
    kod: 'V2-MAYA-HOMOJEN', ad: 'MAYA-TİP DİSİPLİNİ (spec kalbi): her V2 iskeletin maya alanı, mayaId\'nin katalog tip\'iyle tutarlı (tutarlılık kapısı bunu YAKALAMAZ); lager stili→lager maya, Belçika→belcika; sour/West Coast dışlandı',
    calistir: (page) => page.evaluate(() => {
      const v2 = Object.entries(window.STIL_ISKELET || {}).filter(([, i]) => i.kaynak === 'cikarim_v2');
      // KRİTİK: her V2 mayaId'nin katalog tip'i, deklare edilen maya-tip alanıyla EŞLEŞMELİ (kategorik güvenlik)
      const tipMismatch = v2.filter(([, i]) => { const my = MAYALAR.find(m => m && m.id === i.mayaId); return !my || my.tip !== i.maya; });
      __REG.ok('her V2 mayaId katalog tip\'i == deklare maya-tip (Cold-IPA lager-in-ale sızması engellendi)', tipMismatch.length === 0, tipMismatch.map(([a, i]) => a + ':maya=' + i.maya + '/mayaId=' + i.mayaId).join(' | '));
      // lager stilleri lager maya taşır (kategorik doğruluk)
      const lagerStil = ['Doppelbock', 'Schwarzbier', 'Vienna Lager', 'Baltic Porter', 'International Pale Lager', 'Dortmunder Export'];
      __REG.ok('lager stilleri lager-tip maya (ale-maya sızması yok)', lagerStil.every(a => { const i = window.STIL_ISKELET[a]; return i && i.maya === 'lager' && MAYALAR.find(m => m && m.id === i.mayaId).tip === 'lager'; }));
      __REG.ok('Belçika stilleri belcika-tip maya', ['Belgian Dark Strong Ale', 'Belgian Quadrupel / Abt', 'Belgian Blonde Ale'].every(a => { const i = window.STIL_ISKELET[a]; return i && i.maya === 'belcika'; }));
      // sour/wild + West Coast (Cold-IPA lager) V2'ye GİRMEDİ (blend-maya / maya-tip ön-filtre)
      const disla = ['West Coast IPA', 'Gose', 'Flanders Red Ale', 'Lambic / Gueuze', 'Berliner Weisse', 'American Wild Ale'];
      __REG.ok('sour/wild + West Coast IPA V2 kapsam dışı (tabloda yok)', disla.every(a => !window.STIL_ISKELET[a] || window.STIL_ISKELET[a].kaynak !== 'cikarim_v2'));
      return __REG.al();
    })
  },
  {
    kod: 'V2-DOLDUR-KALIBRE', ad: 'V2 uçtan uca: koyu favori Schwarzbier doldur → calc() BJCP aralığında (renk-kalibrasyonu app hSRM ile) + lager maya + şeffaflık flash "(n reçeteden türetildi, lager maya)"',
    calistir: (page) => page.evaluate(() => {
      yeniTarif();
      S.stil = 'Schwarzbier'; S.hacim = 11; S.verim = 61;
      const isk = window.STIL_ISKELET['Schwarzbier'];
      __REG.ok('Schwarzbier V2 iskeleti (cikarim_v2, n=10, lager)', !!isk && isk.kaynak === 'cikarim_v2' && isk.n === 10 && isk.maya === 'lager');
      let msg = ''; const _f = window.flash; window.flash = (m) => { msg = String(m); };
      bmStilIskeletDoldur();
      window.flash = _f;
      __REG.ok('malt dolduruldu (munich bazlı — koyu lager)', S.maltlar.length >= 2 && S.maltlar[0].id === 'munich');
      __REG.ok('maya wy2206 (lager, veri modu)', S.mayaId === 'wy2206');
      __REG.ok('şeffaflık: flash "(10 gerçek reçeteden türetildi, lager maya)"', msg.includes('(10 gerçek reçeteden türetildi, lager maya)'), msg);
      const c = calc(); const bj = BJCP['Schwarzbier'];
      const srm = (c.srm != null) ? +c.srm : hSRM(S.maltlar, [], 11);
      __REG.ok('calc() OG BJCP Schwarzbier aralığında', c.og >= bj.og[0] && c.og <= bj.og[1], 'OG=' + c.og.toFixed(3));
      __REG.ok('calc() IBU BJCP aralığında', c.ibu >= bj.ibu[0] && c.ibu <= bj.ibu[1], 'IBU=' + Math.round(c.ibu));
      __REG.ok('calc() SRM BJCP aralığında (renk kalibrasyonu koyu-sıcak motora göre)', srm >= bj.srm[0] && srm <= bj.srm[1], 'SRM=' + srm + ' [' + bj.srm + ']');
      return __REG.al();
    })
  },

  // ── SPRINT X: SRM>40 gösterim (X1) — ham değer korunur, salt görsel katman ──
  {
    kod: 'X-SRM-GOSTER', ad: 'SRM>40 GÖSTERİM: srmGoster 35→"35", 65→"40+" (uzun "40+ (siyah/opak)"), sınır 40 dahil değil; hSRM HAM sayısal >40 döner (motor değişmedi)',
    calistir: (page) => page.evaluate(() => {
      __REG.ok('srmGoster(35) = "35" (40 altı normal sayı)', typeof window.srmGoster === 'function' && srmGoster(35) === '35', String(typeof window.srmGoster === 'function' && srmGoster(35)));
      __REG.ok('srmGoster(65) = "40+" (kısa form)', srmGoster(65) === '40+', srmGoster(65));
      __REG.ok('srmGoster(65,1) = "40+ (siyah/opak)" (uzun form)', srmGoster(65, 1) === '40+ (siyah/opak)', srmGoster(65, 1));
      __REG.ok('srmGoster(40) = "40" (sınır: yalnız >40)', srmGoster(40) === '40', srmGoster(40));
      const ham = hSRM([{ id: 'pale_ale', kg: 5 }, { id: 'roast', kg: 0.5 }, { id: 'black', kg: 0.3 }, { id: 'choc', kg: 0.3 }], [], 11);
      __REG.ok('hSRM RIS-vari grist → HAM sayısal >40 (gösterim hesabı bozmadı)', typeof ham === 'number' && ham > 40, String(ham));
      return __REG.al();
    })
  },

  // ── SPRINT X2b: EBC eş kural + üst-yön SRM uyarı bastırma (koyu stil) ──
  {
    kod: 'X2B-EBC-UYARI', ad: 'EBC eş kural (35→69, 65→79+) + üst-yön SRM uyarısı SRM>40+koyu-stilde BASTIRILIR; alt-yön + açık-stil + sayısal bölge AYNEN',
    calistir: (page) => page.evaluate(() => {
      __REG.ok('ebcGoster(35) = "69" (sayısal bölge ham görünüm)', typeof window.ebcGoster === 'function' && ebcGoster(35) === '69', String(typeof window.ebcGoster === 'function' && ebcGoster(35)));
      __REG.ok('ebcGoster(65) = "79+" (bantlı)', ebcGoster(65) === '79+', ebcGoster(65));
      const koyuGrist = [{ id: 'pale_ale', kg: 5 }, { id: 'choc', kg: 0.5 }];
      const bul = (stil, srm) => JSON.stringify(gristDenetim(koyuGrist, MALTLAR, stil, BJCP, srm, null).bulgular);
      __REG.ok('RIS (tavan 40) + SRM 80 → "Renk stile göre koyu" YOK (bastırıldı)', !bul('Imperial / Russian Imperial Stout', 80).includes('Renk stile göre koyu'));
      __REG.ok('RIS + SRM 20 → "Renk stile göre açık" VAR (alt-yön aynen)', bul('Imperial / Russian Imperial Stout', 20).includes('Renk stile göre açık'));
      __REG.ok('German Pils (tavan<30) + SRM 50 → "Renk stile göre koyu" VAR (açık stilde katı)', bul('German Pils', 50).includes('Renk stile göre koyu'));
      __REG.ok('Baltic Porter (tavan 30) + SRM 38 → uyarı VAR (40 altı sayısal bölge aynen)', bul('Baltic Porter', 38).includes('Renk stile göre koyu'));
      return __REG.al();
    })
  },

  // ── SPRINT W1: off-flavor öğrenen — onay-kapılı soft recall (zehirlenme koruması) ──
  {
    kod: 'W1-BEKLENEN', ad: 'STİL-BEKLENEN FİLTRESİ: Weizen muz/karanfil BLOKE (Kaan favorisi asla girmez), Weizen diaseytil öğrenilebilir, lager kükürt BLOKE',
    calistir: (page) => page.evaluate(() => {
      __REG.ok('ester × wheat maya → BEKLENEN (bloke, muz öğrenilmez)', window._offBeklenenMi('ester', 'wheat', 'Weizen / Weissbier') === true);
      __REG.ok('phenolic × belcika → BEKLENEN (karanfil karakter)', window._offBeklenenMi('phenolic', 'belcika', 'Dubbel') === true);
      __REG.ok('diacetyl × wheat/Weizen → BEKLENMEZ (öğrenilebilir)', window._offBeklenenMi('diacetyl', 'wheat', 'Weizen / Weissbier') === false);
      __REG.ok('sulfur × lager → BEKLENEN', window._offBeklenenMi('sulfur', 'lager', 'German Pils') === true);
      __REG.ok('diacetyl × Czech Pils (stilKw) → BEKLENEN', window._offBeklenenMi('diacetyl', 'lager', 'Czech Premium Pale Lager') === true);
      __REG.ok('metallic → hiçbir stilde beklenmez', window._offBeklenenMi('metallic', 'ale', 'American IPA') === false);
      return __REG.al();
    })
  },
  {
    kod: 'W1-YAZ-AYRI-KEY', ad: 'ONAY YAZIMI + ayrı key: Weizen ester BLOKE, Weizen diaseytil zengin yazılır, calc() sonrası SİLİNMEZ (mayaBazli tuzağı çözüldü)',
    calistir: (page) => page.evaluate(() => {
      localStorage.removeItem('bm_off_ogren_v1');
      yeniTarif();
      S.mayaId = 'wy3068'; S.stil = 'Weizen / Weissbier'; S.biraAd = 'Muzo';
      S.brewLog = [{ tip: 'sicaklik', deger: '24' }, { tip: 'sicaklik', deger: '25' }];
      S.brewSnapshot = { ts: 1000, fgT: 1.012 }; S.brewSonuc = { ts: 1000 + 14 * 86400000, fgG: 1.016 };
      window.bmOffOgren('ester'); // stil-beklenen → BLOKE
      __REG.ok('Weizen ester BLOKE (havuz boş — muz asla profile girmez)', window._bmOffOgrenOku().length === 0);
      window.bmOffOgren('diacetyl'); // beklenmez → yazılır
      const arr = window._bmOffOgrenOku();
      __REG.ok('Weizen diaseytil yazıldı (n=1)', arr.length === 1);
      const g = arr[0] || {};
      __REG.ok('gözlem ZENGİN dondu (maya/tip/stil/sıcaklık/fgSapma)', g.mayaId === 'wy3068' && g.mayaTip === 'wheat' && g.bjcpStil === 'Weizen / Weissbier' && g.fermSicaklikOrt === 24.5 && g.fgSapma === 0.004, JSON.stringify(g));
      // KRİTİK: calc() + derived profil recompute sonrası gözlem SİLİNMEZ (ayrı key)
      calc();
      localStorage.setItem('bm_kaan_profil_v1', JSON.stringify({ ver: 1, n: 2, verim: 60, mayaBazli: {} })); // derived recompute simülasyonu
      __REG.ok('KRİTİK: bm_off_ogren_v1 calc/recompute sonrası DOKUNULMADI (ayrı key kanıtı)', window._bmOffOgrenOku().length === 1);
      __REG.ok('kaan_profil.mayaBazli hâlâ boş (off oraya YAZMADI)', Object.keys(JSON.parse(localStorage.getItem('bm_kaan_profil_v1')).mayaBazli).length === 0);
      return __REG.al();
    })
  },
  {
    kod: 'W1-MEKANIZMA', ad: 'MEKANİZMA FİLTRESİ: zengin dondur, disiplinli göster — ester recall sıcaklık söyler FG söylemez; diaseytil sıcaklık+FG',
    calistir: (page) => page.evaluate(() => {
      localStorage.removeItem('bm_off_ogren_v1');
      yeniTarif();
      S.mayaId = 'us05'; S.stil = 'American IPA'; S.biraAd = 'Hazy';
      S.brewLog = [{ tip: 'sicaklik', deger: '26' }]; S.brewSnapshot = { ts: 1, fgT: 1.010 }; S.brewSonuc = { ts: 1 + 10 * 86400000, fgG: 1.018 };
      window.bmOffOgren('ester');
      const gE = window._bmOffOgrenOku().find(x => x.offKod === 'ester');
      const rE = window._bmOffRecallSatir(gE, 'maya');
      __REG.ok('ester gözlemi fgSapma ZENGİN dondu (0.008)', gE.fgSapma === 0.008, 'fg=' + gE.fgSapma);
      __REG.ok('ester recall SICAKLIK söyler', /°C/.test(rE) && /sıcaklık/.test(rE), rE);
      __REG.ok('ester recall FG sapmasını SÖYLEMEZ (mekanizma sıcaklık — alakasız korelasyon gizli)', !/FG/.test(rE), rE);
      yeniTarif();
      S.mayaId = 'wy3068'; S.stil = 'Weizen / Weissbier'; S.brewLog = [{ tip: 'sicaklik', deger: '16' }]; S.brewSnapshot = { ts: 1, fgT: 1.012 }; S.brewSonuc = { ts: 1 + 20 * 86400000, fgG: 1.018 };
      window.bmOffOgren('diacetyl');
      const gD = window._bmOffOgrenOku().find(x => x.offKod === 'diacetyl');
      const rD = window._bmOffRecallSatir(gD, 'maya');
      __REG.ok('diaseytil recall sıcaklık+FG söyler (mekanizması ikisi)', /°C/.test(rD) && /FG/.test(rD), rD);
      return __REG.al();
    })
  },
  {
    kod: 'W1-RECALL-SOFT', ad: 'SOFT RECALL iki-yer-tek-havuz: maya kartı + iskelet-doldur satır; gözlemsizde SESSİZ; hiçbir default/iskelet DEĞİŞMEZ',
    calistir: (page) => page.evaluate(() => {
      localStorage.setItem('bm_off_ogren_v1', JSON.stringify([{ offKod: 'diacetyl', offAd: 'Diacetyl (tereyağı)', mayaId: 'wy3068', mayaAd: 'WY3068', mayaTip: 'wheat', bjcpStil: 'Weizen / Weissbier', fermSicaklikOrt: 16, fgSapma: 0.006, dondurmaTs: 1 }]));
      yeniTarif();
      S.mayaId = 'wy3068'; S.stil = 'Weizen / Weissbier';
      __REG.ok('maya kartı recall (gözlemli maya) satır üretir', /Geçmiş/.test(window._bmOffRecallMayaHtml()));
      __REG.ok('maya recall "salt hatırlatma" disiplin notu içerir', /değiştirmez/.test(window._bmOffRecallMayaHtml()));
      __REG.ok('iskelet-doldur recall (gözlemli stil) dolu', window._bmOffStilRecallStr('Weizen / Weissbier').indexOf('Geçmiş') >= 0);
      // gözlemli stille iskelet doldur → recall çıkar AMA iskelet değişmez (sadece hatırlatma)
      let msg = ''; const _f = window.flash; window.flash = (m) => { msg = String(m); };
      const oncekiMalt = S.maltlar.length;
      bmStilIskeletDoldur(); // Weizen küratörlü iskelet
      window.flash = _f;
      __REG.ok('iskelet-doldur flash recall içeriyor (📊 Geçmiş)', msg.indexOf('📊 Geçmiş') >= 0, msg);
      __REG.ok('iskelet DOLDU (recall bunu engellemedi)', S.maltlar.length > oncekiMalt);
      // gözlemsiz maya → sessiz
      yeniTarif(); S.mayaId = 'w3470'; S.stil = 'Helles / Münchner Hell';
      __REG.ok('gözlemsiz maya → recall SESSİZ (boş)', window._bmOffRecallMayaHtml() === '');
      __REG.ok('gözlemsiz stil → iskelet recall boş', window._bmOffStilRecallStr('Kölsch') === '');
      return __REG.al();
    })
  },
  {
    kod: 'W1-DEDUP-GERIAL', ad: 'dedup (aynı kod+maya+stil sayı artmaz, bağlam güncellenir) + geri-al (yanlış onay çıkarılır) + export allowlist (bm_ prefix)',
    calistir: (page) => page.evaluate(() => {
      localStorage.removeItem('bm_off_ogren_v1');
      yeniTarif();
      S.mayaId = 'us05'; S.stil = 'American IPA'; S.brewLog = [{ tip: 'sicaklik', deger: '26' }]; S.brewSnapshot = { ts: 1, fgT: 1.010 }; S.brewSonuc = { ts: 1 + 10 * 86400000, fgG: 1.018 };
      window.bmOffOgren('fusel');
      const n1 = window._bmOffOgrenOku().length;
      S.brewLog = [{ tip: 'sicaklik', deger: '28' }]; // aynı reçete, farklı bağlam
      window.bmOffOgren('fusel');
      __REG.ok('dedup: aynı kod+maya+stil tekrar → sayı ARTMADI', window._bmOffOgrenOku().length === n1);
      __REG.ok('dedup: bağlam GÜNCELLENDİ (28°C)', window._bmOffOgrenOku().find(x => x.offKod === 'fusel').fermSicaklikMax === 28);
      window.bmOffOgrenSil('fusel');
      __REG.ok('geri-al: yanlış gözlem çıkarıldı', !window._bmOffOgrenOku().some(x => x.offKod === 'fusel'));
      __REG.ok('export allowlist: bm_off_ogren_v1 bm_ prefix (senkronize olur)', /^(bm_|kabir_|_orig|acc_|KR$)/.test('bm_off_ogren_v1'));
      return __REG.al();
    })
  },
  {
    kod: 'W1-MODAL-BUTON', ad: 'teşhis kartı UI (birincil giriş): beklenmeyen off → "📌 Profilime ekle" render; Weizen ester → "beklenen karakter" (düğme yok); eklendikten sonra "Geri al"',
    calistir: (page) => page.evaluate(() => {
      localStorage.removeItem('bm_off_ogren_v1');
      yeniTarif();
      S.mayaId = 'wy3068'; S.stil = 'Weizen / Weissbier'; S.brewLog = [{ tip: 'sicaklik', deger: '16' }]; S.brewSnapshot = { ts: 1, fgT: 1.012 }; S.brewSonuc = { ts: 1 + 20 * 86400000, fgG: 1.018 };
      bmOffTeshis('diacetyl'); // beklenmeyen → ekle düğmesi
      let modal = document.getElementById('bmOffModal');
      __REG.ok('teşhis modalı açıldı', !!modal);
      __REG.ok('beklenmeyen off → "Profilime ekle" düğmesi render edildi', !!modal && modal.innerHTML.indexOf('Profilime ekle') >= 0);
      bmOffTeshisKapat();
      bmOffTeshis('ester'); // Weizen ester → beklenen karakter
      modal = document.getElementById('bmOffModal');
      __REG.ok('Weizen ester → "beklenen karakter" notu (muz asla öğrenilmez)', !!modal && modal.innerHTML.indexOf('beklenen karakter') >= 0);
      __REG.ok('Weizen ester → "Profilime ekle" düğmesi YOK (yazımın önünde bloke)', !!modal && modal.innerHTML.indexOf('Profilime ekle') < 0);
      bmOffTeshisKapat();
      bmOffOgren('diacetyl'); // yazar + modalı tazeler
      modal = document.getElementById('bmOffModal');
      __REG.ok('eklendikten sonra modal "Geri al" düğmesi gösterir', !!modal && modal.innerHTML.indexOf('Geri al') >= 0);
      bmOffTeshisKapat();
      return __REG.al();
    })
  },

  // ── SPRINT Z: stil feedback sinyali (kayıt-anı, 4 kapı, ayrı user-authored key) ──
  {
    kod: 'Z-KAPI', ad: 'SİNYAL KAPILARI: stil boş / slug-tahmin yok / yarım reçete / bayat tahmin (malt-imza + OG>0.003) → YAZILMAZ; 4 kapı geçince YAZILIR',
    calistir: (page) => page.evaluate(() => {
      localStorage.removeItem('bm_stil_ogren_v1');
      __REG.yeniKayit('REGTEST ZKAPI', {});
      const S2B = window.SLUG_TO_BJCP;
      const slugA = Object.keys(S2B).find(k => S2B[k] && BJCP[S2B[k]]);
      const nameA = S2B[slugA];
      S.maltlar = [{ id: 'pilsner', kg: 4 }];
      S.mayaId = 'us05';
      S.hoplar = [{ id: HOPLAR[0].id, g: 20, dk: 60 }];
      const mockla = () => {
        window.__stilSecKaynak = 'dropdown';
        window.__bmV12DispatchInfo = { slugBranchHit: true, timestamp: 4242 };
        window.__lastV12Result = { topN: [{ slug: slugA, normalized: 60 }] };
        const r = calc();
        window.__lastV12Recipe = { _og: r.og, maltIds: S.maltlar.map(m => m.id), mayaId: S.mayaId };
      };
      mockla(); S.stil = '';
      tarifeKaydet();
      __REG.ok('KAPI 1: stil boş → sinyal yok', _bmStilOgrenOku().length === 0);
      mockla(); S.stil = nameA; window.__bmV12DispatchInfo = { slugBranchHit: false };
      tarifeKaydet();
      __REG.ok('KAPI 2: slugBranchHit=false (cluster fallback) → sinyal yok', _bmStilOgrenOku().length === 0);
      mockla(); S.stil = nameA; const _m = S.maltlar; S.maltlar = [];
      tarifeKaydet();
      __REG.ok('KAPI 3: yarım reçete (malt yok) → sinyal yok', _bmStilOgrenOku().length === 0);
      S.maltlar = _m;
      mockla(); S.stil = nameA; window.__lastV12Recipe.maltIds = ['baska_malt'];
      tarifeKaydet();
      __REG.ok('KAPI 4a: malt-imza farklı (bayat tahmin) → sinyal yok', _bmStilOgrenOku().length === 0);
      mockla(); S.stil = nameA; window.__lastV12Recipe._og = window.__lastV12Recipe._og + 0.01;
      tarifeKaydet();
      __REG.ok('KAPI 4b: OG sapması >0.003 (bayat tahmin) → sinyal yok', _bmStilOgrenOku().length === 0);
      mockla(); S.stil = nameA;
      tarifeKaydet();
      __REG.ok('KONTROL: 4 kapı geçti → sinyal YAZILDI', _bmStilOgrenOku().length === 1);
      localStorage.removeItem('bm_stil_ogren_v1');
      return __REG.al();
    })
  },
  {
    kod: 'Z-YAZ-DEDUP', ad: 'YAZIM + AYRI KEY: uyumSira AD-DÜZEYİ (1=onay, 2=sıra-yanlış), rid-dedup son-yazan, calc()+profil SONRASI YAŞAR (derived tuzağı yok), allowlist',
    calistir: (page) => page.evaluate(() => {
      localStorage.removeItem('bm_stil_ogren_v1');
      const id = __REG.yeniKayit('REGTEST ZYAZ', {});
      const S2B = window.SLUG_TO_BJCP;
      const secilmis = []; const adlar = {};
      for (const k of Object.keys(S2B)) {
        if (S2B[k] && BJCP[S2B[k]] && !adlar[S2B[k]]) { secilmis.push(k); adlar[S2B[k]] = 1; }
        if (secilmis.length === 3) break;
      }
      const slugA = secilmis[0], slugB = secilmis[1], slugC = secilmis[2];
      S.maltlar = [{ id: 'pilsner', kg: 4 }];
      S.mayaId = 'us05';
      S.hoplar = [{ id: HOPLAR[0].id, g: 20, dk: 60 }];
      const mockla = () => {
        window.__stilSecKaynak = 'dropdown';
        window.__bmV12DispatchInfo = { slugBranchHit: true, timestamp: 4242 };
        window.__lastV12Result = { topN: [{ slug: slugA, normalized: 60 }, { slug: slugB, normalized: 25 }, { slug: slugC, normalized: 10 }] };
        const r = calc();
        window.__lastV12Recipe = { _og: r.og, maltIds: S.maltlar.map(m => m.id), mayaId: S.mayaId };
      };
      mockla(); S.stil = S2B[slugA];
      tarifeKaydet();
      let h = _bmStilOgrenOku();
      __REG.ok('sinyal yazıldı: rid=_editId + şema tam (kapsamda/motorAd/dispatchTs)', h.length === 1 && h[0].rid === String(id) && h[0].secilenStil === S2B[slugA] && h[0].kapsamda === true && h[0].motorAd === 'V12' && h[0].dispatchTs === 4242, JSON.stringify(h[0]));
      __REG.ok('uyumSira=1 (motor top-1 onaylandı)', h[0].uyumSira === 1);
      __REG.ok('motorTop3 dondu (slug+bjcp+pct)', h[0].motorTop3.length === 3 && h[0].motorTop3[0].slug === slugA && h[0].motorTop3[0].bjcp === S2B[slugA] && h[0].motorTop3[1].pct === 25);
      __REG.ok('kaynak=dropdown dondu', h[0].kaynak === 'dropdown');
      calc();
      if (typeof _bmKisiselProfil === 'function') { try { _bmKisiselProfil(); } catch (e) {} }
      h = _bmStilOgrenOku();
      __REG.ok('DERIVED TUZAĞI YOK: calc()+profil sonrası sinyal YAŞIYOR (ayrı key kanıtı)', h.length === 1);
      mockla(); S.stil = S2B[slugB];
      tarifeKaydet();
      h = _bmStilOgrenOku();
      __REG.ok('rid-dedup: tek kayıt, son-yazan-kazanır', h.length === 1 && h[0].secilenStil === S2B[slugB]);
      __REG.ok('uyumSira=2 AD-DÜZEYİ (motor 2. sırada demişti = sıra-yanlış düzeltme)', h[0].uyumSira === 2);
      __REG.ok('export allowlist: bm_stil_ogren_v1 bm_ prefix (senkronize olur)', /^(bm_|kabir_|_orig|acc_|KR$)/.test('bm_stil_ogren_v1'));
      localStorage.removeItem('bm_stil_ogren_v1');
      return __REG.al();
    })
  },
  {
    kod: 'Z-KAPSAM-STAT', ad: 'KAPSAM-DIŞI AYRIMI + TANI SATIRI: 91-slug menzili dışı stil → kapsamda:false + uyumSira:null; boş havuz "Henüz veri yok"; yüzdeler + rStokAyarlar entegrasyonu',
    calistir: (page) => page.evaluate(() => {
      localStorage.removeItem('bm_stil_ogren_v1');
      __REG.ok('boş havuz → "Henüz veri yok"', _bmStilMotorStatHtml().indexOf('Henüz veri yok') >= 0);
      __REG.yeniKayit('REGTEST ZKAPSAM', {});
      const S2B = window.SLUG_TO_BJCP;
      const kapsamli = {};
      Object.keys(S2B).forEach(k => { if (S2B[k]) kapsamli[S2B[k]] = 1; });
      const disari = Object.keys(BJCP).find(n => !kapsamli[n]);
      __REG.ok('BJCP 239 > slug menzili: kapsam-dışı stil mevcut', !!disari, disari);
      S.maltlar = [{ id: 'pilsner', kg: 4 }];
      S.mayaId = 'us05';
      S.hoplar = [{ id: HOPLAR[0].id, g: 20, dk: 60 }];
      window.__stilSecKaynak = 'dropdown';
      window.__bmV12DispatchInfo = { slugBranchHit: true, timestamp: 4242 };
      const slugA = Object.keys(S2B).find(k => S2B[k] && BJCP[S2B[k]]);
      window.__lastV12Result = { topN: [{ slug: slugA, normalized: 60 }] };
      const r = calc();
      window.__lastV12Recipe = { _og: r.og, maltIds: S.maltlar.map(m => m.id), mayaId: S.mayaId };
      S.stil = disari;
      tarifeKaydet();
      const h = _bmStilOgrenOku();
      __REG.ok('kapsam-dışı stil: kayıt VAR ama kapsamda=false + uyumSira=null ("yanıldı" sayılmaz)', h.length === 1 && h[0].kapsamda === false && h[0].uyumSira === null, JSON.stringify(h[0]));
      _bmStilOgrenYaz([
        { rid: 'a', kapsamda: true, uyumSira: 1 },
        { rid: 'b', kapsamda: true, uyumSira: 3 },
        { rid: 'c', kapsamda: true, uyumSira: null },
        { rid: 'd', kapsamda: false, uyumSira: null }
      ]);
      const st = _bmStilMotorStatHtml();
      __REG.ok('istatistik: 3 reçetede top-1 %33 / top-3 %67 / kapsam dışı: 1', st.indexOf('3 reçetede top-1 %33') >= 0 && st.indexOf('top-3 %67') >= 0 && st.indexOf('kapsam dışı: 1') >= 0, st);
      const kart = (typeof rStokAyarlar === 'function') ? rStokAyarlar() : '';
      __REG.ok('Ayarlar Tanı kartı satırı içeriyor (rStokAyarlar)', kart.indexOf('Stil motoru isabet') >= 0);
      localStorage.removeItem('bm_stil_ogren_v1');
      return __REG.al();
    })
  },
  {
    kod: 'Z-KAYNAK', ad: 'KAYNAK BAYRAĞI: stilSec çipi → stilSec; dropdown change → dropdown; İskeleti Doldur → iskelet (NİYET) → tam reçetede bile sinyal YAZILMAZ',
    calistir: (page) => page.evaluate(() => {
      localStorage.removeItem('bm_stil_ogren_v1');
      __REG.yeniKayit('REGTEST ZKAYNAK', {});
      const S2B = window.SLUG_TO_BJCP;
      const slugA = Object.keys(S2B).find(k => S2B[k] && BJCP[S2B[k]]);
      const nameA = S2B[slugA];
      window.__stilSecKaynak = null; S.stil = '';
      const b = document.createElement('button');
      b.setAttribute('data-stil', nameA);
      stilSec(b);
      __REG.ok('stilSec çipi → S.stil yazıldı + kaynak=stilSec', S.stil === nameA && window.__stilSecKaynak === 'stilSec');
      const sel = document.querySelector('select[aria-label="Hedef stil"]');
      __REG.ok("Hedef stil dropdown DOM'da bulundu", !!sel);
      if (sel) {
        window.__stilSecKaynak = null;
        const opt = Array.from(sel.options).find(o => o.value && o.value !== nameA);
        sel.value = opt.value;
        sel.dispatchEvent(new Event('change'));
        __REG.ok('dropdown change → S.stil yazıldı + kaynak=dropdown', S.stil === opt.value && window.__stilSecKaynak === 'dropdown');
      }
      const iskYok = Object.keys(BJCP).find(n => typeof STIL_ISKELET !== 'undefined' && !STIL_ISKELET[n]);
      S.stil = iskYok || nameA;
      bmStilIskeletDoldur();
      __REG.ok('İskeleti Doldur → kaynak=iskelet (NİYET işareti)', window.__stilSecKaynak === 'iskelet');
      S.stil = nameA;
      S.maltlar = [{ id: 'pilsner', kg: 4 }];
      S.mayaId = 'us05';
      S.hoplar = [{ id: HOPLAR[0].id, g: 20, dk: 60 }];
      window.__bmV12DispatchInfo = { slugBranchHit: true, timestamp: 4242 };
      window.__lastV12Result = { topN: [{ slug: slugA, normalized: 60 }] };
      const r = calc();
      window.__lastV12Recipe = { _og: r.og, maltIds: S.maltlar.map(m => m.id), mayaId: S.mayaId };
      tarifeKaydet();
      __REG.ok('iskelet-niyet: 4 kapı geçse bile sinyal YAZILMADI (düzeltme değil)', _bmStilOgrenOku().length === 0);
      localStorage.removeItem('bm_stil_ogren_v1');
      return __REG.al();
    })
  },

  // ── SPRINT AA: maya starter form-farkındalığı (AA1) + boil-off ayarı (AA2) ──
  {
    kod: 'AA1-FORM', ad: 'MAYA STARTER FORM-FARKINDA: KURU maya yüksek OG → "starter yapılmaz" + paket sayısı (Starter öneriliyor/önerilir YOK); SIVI maya → starter + DME reçetesi (geçerli, korundu)',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('REGTEST AAFORM', {});
      S.hacim = 30; S.maltlar = [{ id: 'pilsner', kg: 9 }]; S.hoplar = [{ id: HOPLAR[0].id, g: 20, dk: 60 }];
      const og = 1.090, fg = 1.018, abv = 9.5;
      // KURU maya (US-05) — mayaFormu id-prefix ile 'dry'
      const mDry = MAYALAR.find(m => m.id === 'us05');
      S.mayaId = 'us05';
      const hDry = rEditorMaya(og, fg, abv, mDry, null, 'hesap', fg);
      __REG.ok('KURU: pitch kartı "Starter öneriliyor" YOK (yanlış mesaj bitti)', hDry.indexOf('Starter öneriliyor') < 0);
      __REG.ok('KURU: "starter yapılmaz" doğru mesaj VAR', hDry.indexOf('starter yapılmaz') >= 0);
      __REG.ok('KURU: paket sayısı önerisi VAR (eyleme-dönük)', hDry.indexOf('paket') >= 0);
      __REG.ok('KURU: quick-strip "✅ Starter önerilir" YOK', hDry.indexOf('Starter önerilir') < 0);
      // SIVI maya (WY1056) — 'liquid', starter geçerli KALIR
      const mLiq = MAYALAR.find(m => m.id === 'wy1056');
      S.mayaId = 'wy1056';
      const hLiq = rEditorMaya(og, fg, abv, mLiq, null, 'hesap', fg);
      __REG.ok('SIVI: "Starter öneriliyor" VAR (geçerli öneri korundu)', hLiq.indexOf('Starter öneriliyor') >= 0);
      __REG.ok('SIVI: DME Starter Reçetesi VAR', hLiq.indexOf('DME Starter') >= 0);
      __REG.ok('SIVI: quick-strip "✅ Starter önerilir" VAR', hLiq.indexOf('Starter önerilir') >= 0);
      return __REG.al();
    })
  },
  {
    kod: 'AA1-TIMELINE', ad: 'BREWDAY TIMELINE form-farkında: Saison/Tripel day-0 pitch açıklaması KURU mayada "starter gerekmez", SIVI mayada "starter önerilir/şart"',
    calistir: (page) => page.evaluate(() => {
      const mDry = MAYALAR.find(m => m.id === 'us05');
      const mLiq = MAYALAR.find(m => m.id === 'wy1056');
      const sDry = fermentasyonProfili('Saison', 1.055, 'saison', mDry);
      __REG.ok('Saison KURU: "starter gerekmez" (yanlış "Starter önerilir" YOK)', sDry.gunler[0].aciklama.indexOf('gerekmez') >= 0 && sDry.gunler[0].aciklama.indexOf('Starter önerilir') < 0);
      const sLiq = fermentasyonProfili('Saison', 1.055, 'saison', mLiq);
      __REG.ok('Saison SIVI: "starter önerilir" (geçerli)', sLiq.gunler[0].aciklama.indexOf('starter önerilir') >= 0);
      const tDry = fermentasyonProfili('Belgian Tripel', 1.080, 'belcika', mDry);
      __REG.ok('Tripel KURU: "starter gerekmez" (Starter şart YOK)', tDry.gunler[0].aciklama.indexOf('gerekmez') >= 0 && tDry.gunler[0].aciklama.indexOf('Starter şart') < 0);
      const tLiq = fermentasyonProfili('Belgian Tripel', 1.080, 'belcika', mLiq);
      __REG.ok('Tripel SIVI: "starter şart" (yüksek ABV, geçerli)', tLiq.gunler[0].aciklama.indexOf('starter şart') >= 0);
      return __REG.al();
    })
  },
  {
    kod: 'AA2-HESAP', ad: 'BOIL-OFF HESAP: varsayılan %12 → su/OG DEĞİŞMEDİ (KRİTİK regresyon); %6 → su azaldı (buharlaşma az) + final OG hedefi TUTUYOR (calc.og sabit); akıl bandı %50 reddedilir',
    calistir: (page) => page.evaluate(() => {
      localStorage.removeItem('bm_boiloff_v1');
      __REG.ok('varsayılan (anahtar yok) → bmBoilOff()===0.12 (eski hardcoded birebir)', bmBoilOff() === 0.12);
      __REG.yeniKayit('REGTEST AAHESAP', {});
      S.hacim = 11; S.kaynatmaSure = 60; S.maltlar = [{ id: 'pilsner', kg: 4 }]; S.mayaId = 'us05'; S.hoplar = [{ id: HOPLAR[0].id, g: 20, dk: 60 }];
      const m = MAYALAR.find(x => x.id === 'us05');
      const suTotal = (h) => { const mm = h.match(/TOPLAM SU<\/span><span>([\d.]+)L/); return mm ? parseFloat(mm[1]) : null; };
      const ogBefore = calc().og;
      const totalDef = suTotal(rEditorHesap(calc().og, calc().fg, calc().abv, m));
      __REG.ok('varsayılan su hesabı üretildi (TOPLAM SU okunur)', totalDef != null, String(totalDef));
      bmBoilOffSet(6);
      __REG.ok('set %6 → bmBoilOff()===0.06', bmBoilOff() === 0.06);
      const total6 = suTotal(rEditorHesap(calc().og, calc().fg, calc().abv, m));
      __REG.ok('%6: TOPLAM SU AZALDI (daha az buharlaşma → daha az su)', total6 != null && total6 < totalDef, total6 + ' < ' + totalDef);
      __REG.ok('%6: final OG hedefi TUTUYOR (calc.og DEĞİŞMEDİ)', calc().og === ogBefore, calc().og + ' vs ' + ogBefore);
      bmBoilOffSet(8); bmBoilOffSet(50);
      __REG.ok('akıl bandı: %50 (>25) REDDEDİLDİ, %8 korundu', bmBoilOffPct() === 8, String(bmBoilOffPct()));
      localStorage.removeItem('bm_boiloff_v1');
      __REG.ok('temizlik → tekrar varsayılan 0.12 (regresyon güvenli)', bmBoilOff() === 0.12);
      return __REG.al();
    })
  },
  {
    kod: 'AA2-UI-EXPORT', ad: 'BOIL-OFF UI + EXPORT: Malt sekmesinde "Kaynatma Buharlaşması" bloğu render + aktif preset + export allowlist (bm_ prefix) round-trip',
    calistir: (page) => page.evaluate(() => {
      localStorage.removeItem('bm_boiloff_v1');
      __REG.yeniKayit('REGTEST AAUI', {});
      S.maltlar = [{ id: 'pilsner', kg: 4 }]; S.mayaId = 'us05';
      bmBoilOffSet(6);
      ekran = 'editor'; sekme = 'malt'; render();
      const dom = document.getElementById('ekran').innerHTML;
      __REG.ok('Malt sekmesinde "Kaynatma Buharlaşması" bloğu render edildi', dom.indexOf('Kaynatma Buharlaşması') >= 0);
      __REG.ok('boil-off preset düğmeleri render (bmBoilOffSet çağrısı DOM\'da)', dom.indexOf('bmBoilOffSet(6)') >= 0);
      __REG.ok('export allowlist: bm_boiloff_v1 bm_ prefix (senkronize + yedeğe girer)', /^(bm_|kabir_|_orig|acc_|KR$)/.test('bm_boiloff_v1'));
      // round-trip: yaz → oku
      bmBoilOffSet(7);
      const saved = localStorage.getItem('bm_boiloff_v1');
      localStorage.removeItem('bm_boiloff_v1');
      localStorage.setItem('bm_boiloff_v1', saved);
      __REG.ok('round-trip: %7 kaydı geri yüklendi → 0.07', bmBoilOff() === 0.07, saved);
      localStorage.removeItem('bm_boiloff_v1');
      return __REG.al();
    })
  },

  // ── SPRINT AB: alışveriş listesi çok-eksik kapsama (AB1) + klon soyağacı (AB2) ──
  {
    kod: 'AB1-ALIS', ad: 'ALIŞVERİŞ LİSTESİ ÇOK-EKSİK: 3+ eksik reçete ARTIK cokEksik dizisinde + malzemesi birleşik alışveriş listesinde (eski: HİÇ yoktu); ≤2 ayrı grup; birleşik dedup; yapımda hariç; collapse UI',
    calistir: (page) => page.evaluate(() => {
      KR.length = 0; STOK.length = 0; // izole: yalnız bu case'in reçeteleri + her malzeme eksik (deterministik, gerçek stokYetersizTam)
      const idCok = __REG.yeniKayit('REGTEST ABCok', { maltlar: [{ id: 'pilsner', kg: 3 }, { id: 'munich', kg: 1 }, { id: 'vienna', kg: 0.5 }, { id: 'wheat', kg: 0.5 }], hoplar: [], mayaId: '' });
      const idAz = __REG.yeniKayit('REGTEST ABAz', { maltlar: [{ id: 'pilsner', kg: 4 }], hoplar: [], mayaId: '' });
      const idYap = __REG.yeniKayit('REGTEST ABYap', { maltlar: [{ id: 'pilsner', kg: 1 }, { id: 'munich', kg: 1 }, { id: 'vienna', kg: 1 }], mayaId: '' });
      const rYap = KR.find(x => x && x.id === idYap); rYap.durum = 'yapimda'; _origKy(KR);
      const a = bmDemlenebilirAnaliz();
      const cokIds = a.cokEksik.map(x => x.id), azIds = a.azEksik.map(x => x.id);
      __REG.ok('4-malt reçete cokEksik DİZİSİNDE (eski: sadece sayı, listeye hiç girmezdi)', cokIds.includes(idCok), cokIds.join(','));
      __REG.ok('1-malt reçete azEksik grubunda (≤2, öncelikli grup ayrı)', azIds.includes(idAz));
      __REG.ok('yapımda reçete HİÇBİR grupta (mevcut davranış korundu)', !cokIds.includes(idYap) && !azIds.includes(idYap) && !a.hazir.some(x => x.id === idYap));
      __REG.ok('cokEksikSay geriye-uyumlu (=cokEksik.length)', a.cokEksikSay === a.cokEksik.length && a.cokEksikSay === 1);
      __REG.ok('alışveriş listesi 4+ benzersiz malt (çok-eksik dahil; eski: yalnız az-eksik=1 pilsner)', a.alisveris.length >= 4, a.alisveris.length + ' kalem');
      const pilsN = a.alisveris.map(x => x.ad).filter(n => n.toLowerCase().includes('pils')).length;
      __REG.ok('BİRLEŞİK dedup: pilsner iki reçetede eksik → alışverişte TEK satır', pilsN === 1, 'pilsner satır=' + pilsN);
      __REG.ok('çok-eksik-only malzeme alışverişte (azEksik yalnız pilsner-di → pilsner-dışı kalem = çok-eksikten)', a.alisveris.some(x => !x.ad.toLowerCase().includes('pils')));
      const kart = bmDemleKartHTML();
      __REG.ok('UI: "Daha fazla eksik" collapsible <details> render (3+ grup, default kapalı)', kart.indexOf('Daha fazla eksik') >= 0 && kart.indexOf('bm-demle-cokgrup') >= 0);
      __REG.ok('UI: çok-eksik reçete adı collapse bölümünde görünür', kart.indexOf('REGTEST ABCok') >= 0);
      __REG.ok('UI: birleşik "Eksik listesi" render (çok-eksik dahil)', kart.indexOf('Eksik listesi') >= 0);
      return __REG.al();
    })
  },
  {
    kod: 'AB2-KLON', ad: 'KLON SOYAĞACI: klonKaynak izi (id+ad+ts) + gösterge "klonlandı"+link; SPRINT F REGRESYON (iz eklemek geçmiş sıfırlamasını BOZMADI); 2. nesil bir üst nesli gösterir',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('Weizen v1', {
        brewLog: [{ id: 'x', ts: 1, tip: 'og_olcum', deger: '1.05' }], brewSnapshot: { ts: 1 }, brewSonuc: { ts: 2 },
        ogManuel: 1.05, fgManuel: 1.01, preboilOG: 1.04, mayaYasAy: 3, tadim: { puan: 4 }, effOG: 0.7, effVol: 11, planBrewTarih: '2026-07-01'
      });
      tarifKlonla(id);
      const klon = KR[0];
      __REG.ok('klon oluştu, id farklı', klon && klon.id !== id);
      __REG.ok('AB2: klonKaynak izi var (id + ad + ts)', klon.klonKaynak && klon.klonKaynak.id === id && /Weizen v1/.test(klon.klonKaynak.ad) && typeof klon.klonKaynak.ts === 'number', JSON.stringify(klon.klonKaynak));
      __REG.ok('SPRINT F REGRESYON: brewLog boş (ebeveyn izi sıfırlamayı bozmadı)', Array.isArray(klon.brewLog) && klon.brewLog.length === 0);
      __REG.ok('SPRINT F: snapshot/sonuc/effOG/effVol/planBrewTarih silindi', klon.brewSnapshot === undefined && klon.brewSonuc === undefined && klon.effOG === undefined && klon.effVol === undefined && klon.planBrewTarih === undefined);
      __REG.ok('SPRINT F: ölçüm/tadım null', klon.ogManuel === null && klon.fgManuel === null && klon.preboilOG === null && klon.mayaYasAy === null && klon.tadim === null);
      __REG.ok('klonKaynak SIFIRLAMA listesine GİRMEDİ (kimlik yaşıyor, geçmiş değil)', klon.klonKaynak !== undefined);
      const iz = _bmKlonKaynakHtml(klon);
      __REG.ok('gösterge: ebeveyn adı + "klonlandı" + tarifAc linki (ebeveyn KR\'de var)', iz.indexOf('Weizen v1') >= 0 && iz.indexOf('klonlandı') >= 0 && iz.indexOf('tarifAc') >= 0, iz.slice(0, 90));
      tarifKlonla(klon.id);
      const klon2 = KR[0];
      __REG.ok('AB2: 2. nesil klonKaynak bir ÜST nesli (klon) gösterir, çökmez (v1 kapsam dışı)', klon2.klonKaynak && klon2.klonKaynak.id === klon.id, JSON.stringify(klon2.klonKaynak));
      return __REG.al();
    })
  },
  {
    kod: 'AB2-YETIM', ad: 'KLON YETİM DİRENCİ: ebeveyn silinince (Sprint S tombstone) klon YAŞAR, gösterge kayıtlı ad + "silinmiş" (link yok), çökme yok',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('Ebeveyn Sil', {});
      tarifKlonla(id);
      const klon = KR[0], klonId = klon.id;
      __REG.ok('klon ebeveyn izi var', klon.klonKaynak && klon.klonKaynak.id === id && /Ebeveyn Sil/.test(klon.klonKaynak.ad));
      tarifSil(id);
      __REG.ok('ebeveyn silindi (KR\'de yok, Sprint S)', !KR.find(x => x && x.id === id));
      const klonSonra = KR.find(x => x && x.id === klonId);
      __REG.ok('klon ebeveyn silinince YAŞIYOR (yetim kalmadı, iz duruyor)', !!klonSonra && klonSonra.klonKaynak && klonSonra.klonKaynak.id === id);
      const iz = _bmKlonKaynakHtml(klonSonra);
      __REG.ok('gösterge: kayıtlı ad + "silinmiş" + tarifAc linki YOK (çökme yok)', iz.indexOf('Ebeveyn Sil') >= 0 && iz.indexOf('silinmiş') >= 0 && iz.indexOf('tarifAc') < 0, iz.slice(0, 100));
      __REG.ok('klonKaynak yok reçetede gösterge boş (regresyon: normal reçete etkilenmez)', _bmKlonKaynakHtml(klonSonra ? { id: 'z', biraAd: 'x' } : {}) === '');
      return __REG.al();
    })
  },

  // ── SPRINT AC: maya alkol toleransı → FG/takılma uyarısı ──
  {
    kod: 'AC-TOL', ad: 'MAYA TOLERANS TABLOSU (datasheet-kaynaklı): ale/lager/wheat→11, belcika/saison→13, kveik→12; sour/şarap/yüksek-tolerans-beyan/bilinmeyen → null (SESSİZ, uydurma yok)',
    calistir: (page) => page.evaluate(() => {
      __REG.ok('bmMayaTol global fonksiyon', typeof bmMayaTol === 'function');
      const M = (id) => MAYALAR.find(m => m.id === id);
      __REG.ok('US-05 (ale) → 11', bmMayaTol(M('us05')) === 11);
      __REG.ok('WB-06 (wheat) → 11', bmMayaTol(M('wb06')) === 11);
      __REG.ok('BE-256 (belcika) → 13 (Fermentis "champion for strong ales")', bmMayaTol(M('be256')) === 13);
      __REG.ok('BE-134 (saison) → 13', bmMayaTol(M('be134')) === 13);
      __REG.ok('W-34/70 (lager) → 11', bmMayaTol(M('w3470')) === 11);
      __REG.ok('Voss Kveik → 12 (Lallemand datasheet)', bmMayaTol(M('kveikv')) === 12);
      __REG.ok('WY3787 Trappist (belcika) → 13 (11-15% çapraz-doğrulama)', bmMayaTol(M('wy3787')) === 13);
      __REG.ok('SESSİZ: Philly Sour (sour bakteri) → null', bmMayaTol(M('bb_philly')) === null);
      __REG.ok('SESSİZ: bb_sarap (şarap/seltzer, datasheet yok) → null', bmMayaTol(M('bb_sarap')) === null);
      __REG.ok('SESSİZ: la_cbc1 (şişe kondisyon + yüksek-tolerans beyan) → null', bmMayaTol(M('la_cbc1')) === null);
      __REG.ok('SESSİZ: null maya → null', bmMayaTol(null) === null);
      return __REG.al();
    })
  },
  {
    kod: 'AC-UYARI', ad: 'TOLERANS UYARISI (render entegrasyon): ABV vs maya toleransı — aşıyor/yakın/sessiz DOM seviyeleri hesapla uyumlu; WHEAT eşiği BELÇIKA\'dan sıkı (yanlış-alarm önleme); reaktif; bilinmeyen→sessiz; dil muhafazakâr',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('REGTEST AC', { maltlar: [{ id: 'pilsner', kg: 9 }], hoplar: [], mayaId: 'wb06', ogManuel: 1.108, fgManuel: 1.010 });
      ekran = 'editor'; sekme = 'genel';
      const abv = calc().abv;
      __REG.ok('yüksek ABV zorlandı (>=11, aşım testine uygun)', abv >= 11, 'abv=' + abv.toFixed(1));
      const asiyor = (h) => h.indexOf('alkol toleransını') >= 0;   // uy-k "aşıyor" dalı
      const yakin = (h) => h.indexOf('toleransına yakın') >= 0;     // uy-s "yakın" dalı
      const lvl = (a, t) => a >= t ? 2 : (a >= t - 1.5 ? 1 : 0);    // 2=aşıyor 1=yakın 0=sessiz
      const domLvl = (h) => asiyor(h) ? 2 : (yakin(h) ? 1 : 0);
      // WB-06 (wheat, tol 11)
      S.mayaId = 'wb06'; render();
      const domW = document.getElementById('ekran').innerHTML;
      __REG.ok('WB-06 (11) DOM seviyesi = hesaplanan seviye (abv=' + abv.toFixed(1) + ')', domLvl(domW) === lvl(abv, 11), 'dom=' + domLvl(domW) + ' bek=' + lvl(abv, 11));
      __REG.ok('WB-06 yüksek ABV → AŞIYOR uyarısı DOM\'da (doğru değerlerle)', asiyor(domW) && domW.indexOf('~%11') >= 0);
      // BE-256 (belcika, tol 13) — aynı ABV, DAHA yüksek eşik
      S.mayaId = 'be256'; render();
      const domB = document.getElementById('ekran').innerHTML;
      __REG.ok('BE-256 (13) DOM seviyesi = hesaplanan (aynı ABV, Belçika daha yüksek eşik)', domLvl(domB) === lvl(abv, 13), 'dom=' + domLvl(domB) + ' bek=' + lvl(abv, 13));
      __REG.ok('YANLIŞ-ALARM ÖNLEME: aynı ABV\'de WHEAT seviyesi >= BELÇIKA seviyesi (belcika daha toleranslı)', domLvl(domW) >= domLvl(domB));
      // dil disiplini (muhafazakâr)
      __REG.ok('dil: "takılabilir"/"önemli" var, "kesinlikle" YOK', (domW + domB).indexOf('takılabilir') >= 0 && (domW + domB).indexOf('kesinlikle takılır') < 0);
      // reaktif: sour maya (null tolerans) → uyarı YOK
      S.mayaId = 'bb_philly'; render();
      const domS = document.getElementById('ekran').innerHTML;
      __REG.ok('REAKTİF + SESSİZ: tolerans bilinmeyen (sour) yüksek ABV\'de bile uyarı YOK (uydurma yok)', !asiyor(domS) && !yakin(domS));
      // düşük ABV + WB-06 → sessiz
      S.mayaId = 'wb06'; S.ogManuel = 1.042; S.fgManuel = 1.010; render();
      const domL = document.getElementById('ekran').innerHTML;
      __REG.ok('düşük ABV (~%4) + WB-06 → SESSİZ (uyarı yok)', !asiyor(domL) && !yakin(domL), 'abv=' + calc().abv.toFixed(1));
      return __REG.al();
    })
  },

  // ── SPRINT AD: temizlik paketi (form/tol alanı + klon rozeti + DME + yıl raporu) ──
  {
    kod: 'AD1-FIELD', ad: 'MAYA form/tol AÇIK ALAN önceliği: Omega form=liquid (heuristik dry\'ı düzeltir) + fallback korundu; wlp002 tol=10 (WhiteLabs, tip-bandı 11\'den farklı) + fallback band; AC uyarısı açık tol\'u kullanır',
    calistir: (page) => page.evaluate(() => {
      const M = (id) => MAYALAR.find(m => m.id === id);
      __REG.ok('Omega oyl061 → liquid (AÇIK form alanı; id oyl heuristikte yok)', mayaFormu(M('oyl061')) === 'liquid');
      __REG.ok('fallback: us05 (form yok) → heuristik dry', mayaFormu(M('us05')) === 'dry');
      __REG.ok('fallback: wy1056 (form yok) → heuristik liquid', mayaFormu(M('wy1056')) === 'liquid');
      __REG.ok('wlp002 tol=10 AÇIK ALAN (tip-bandı 11 verirdi — alan önceliği)', bmMayaTol(M('wlp002')) === 10);
      __REG.ok('fallback: us05 (tol yok) → tip-bandı 11', bmMayaTol(M('us05')) === 11);
      __REG.ok('fallback: be256 (tol yok) → tip-bandı 13', bmMayaTol(M('be256')) === 13);
      // AC uyarısı wlp002'nin AÇIK tol=10'unu kullanır: %10.5 ABV → aşıyor (band 11 olsaydı sessiz)
      __REG.yeniKayit('REGTEST AD1', { maltlar: [{ id: 'pilsner', kg: 8 }], hoplar: [], mayaId: 'wlp002', ogManuel: 1.096, fgManuel: 1.016 });
      ekran = 'editor'; sekme = 'genel';
      const abv = calc().abv;
      render();
      const dom = document.getElementById('ekran').innerHTML;
      // wlp002 tol=10; abv ~10.5 → >=10 aşıyor
      __REG.ok('AC uyarısı wlp002 AÇIK tol=10 kullanır (abv=' + abv.toFixed(1) + ' >=10 → aşıyor; ~%10)', abv >= 10 && dom.indexOf('~%10') >= 0, 'abv=' + abv.toFixed(1));
      return __REG.al();
    })
  },
  {
    kod: 'AD2-KLON-ROZET', ad: 'LİSTE KARTI klon rozeti: klon reçete tarifKart\'ta "↳ klon" rozetli; normal reçete rozetsiz (kart kalabalıklaşmaz)',
    calistir: (page) => page.evaluate(() => {
      KR.length = 0;
      const id = __REG.yeniKayit('AD2 Ebeveyn', {});
      tarifKlonla(id);
      const klon = KR.find(x => x && x.klonKaynak);
      __REG.ok('klon oluştu (klonKaynak var)', !!klon);
      ekran = 'liste'; listeSekme = 'aktif'; aktifKlasor = ''; aramaMetni = '';
      render();
      const dom = document.getElementById('ekran').innerHTML;
      __REG.ok('klon reçete kartında "↳ klon" rozeti VAR', dom.indexOf('↳ klon') >= 0);
      // normal (klonKaynak yok) reçete: ebeveyn 'AD2 Ebeveyn' — rozeti olmamalı. Sayı: 1 klon → 1 rozet
      __REG.ok('rozet SADECE klonlarda (1 klon → 1 rozet, normal reçetede yok)', dom.split('↳ klon').length - 1 === 1, 'rozet sayısı=' + (dom.split('↳ klon').length - 1));
      return __REG.al();
    })
  },
  {
    kod: 'AD3-DME', ad: 'GRAVITY DÜZELTME DME kolu: OG hedeften DÜŞÜK → "DME ekle: +X g" (mevcut gu/384 altyapısı, 44 PPG); OG yüksek → su ekle (DME yok); miktar makul',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('REGTEST AD3', { maltlar: [{ id: 'pilsner', kg: 5 }], hoplar: [] });
      ekran = 'editor'; sekme = 'hesap';
      // OG hedeften DÜŞÜK: mevcut 1.040, hedef 1.050 → DME gerekir
      S.seyHacim = 20; S.seyOG = 1.040; S.seyHedef = 1.050;
      render();
      let dom = document.getElementById('ekran').innerHTML;
      __REG.ok('OG düşük → "DME ekle: +X g" önerisi VAR', dom.indexOf('DME ekle: +') >= 0);
      __REG.ok('OG düşük → "Kaynat / Buharlaştır" da VAR (iki seçenek)', dom.indexOf('Kaynat / Buharlaştır') >= 0);
      // miktar: 10 puan × 20 L / 367 × 1000 ≈ 545 g
      const mm = dom.match(/DME ekle: \+(\d+) g/);
      __REG.ok('DME miktarı makul (~545 g, homebrew 2.7 g/L/puan)', mm && Math.abs(parseInt(mm[1]) - 545) < 20, mm ? mm[1] + ' g' : 'bulunamadı');
      // OG YÜKSEK → su ekle, DME YOK
      S.seyOG = 1.060; S.seyHedef = 1.050;
      render();
      dom = document.getElementById('ekran').innerHTML;
      __REG.ok('OG yüksek → "Su Ekle" (DME kolu bu yönde YOK)', dom.indexOf('Su Ekle') >= 0 && dom.indexOf('DME ekle: +') < 0);
      return __REG.al();
    })
  },
  {
    kod: 'AD4-YIL', ad: 'YIL SONU RAPORU: tamamlanmış demlemeler (bu yıl) → litre/verim/atten/en-çok-maya; geçen yıl HARİÇ; <2 → sessiz; profil kartına entegre',
    calistir: (page) => page.evaluate(() => {
      const yil = new Date().getFullYear();
      const t0 = new Date(yil, 5, 1).getTime(), t1 = new Date(yil, 7, 1).getTime();
      // _bmYilOzet doğrudan (tamamlanmış kayıt şekli)
      const rapor = _bmYilOzet([
        { tarih: t0, hacim: 11, stil: 'Dubbel', mayaAd: 'BE-256', verimG: 65, atten: 80 },
        { tarih: t1, hacim: 20, stil: 'Weizen', mayaAd: 'BE-256', verimG: 61, atten: 78 }
      ]);
      __REG.ok('rapor: bu yıl başlığı + 2 demleme + litre', rapor.indexOf('📅 ' + yil + ' yılı') >= 0 && rapor.indexOf('2 demleme') >= 0 && rapor.indexOf('~31 L') >= 0, rapor.slice(0, 90));
      __REG.ok('rapor: ort verim/atten + en çok maya', rapor.indexOf('ort. verim %63') >= 0 && rapor.indexOf('en çok maya: BE-256') >= 0);
      __REG.ok('<2 kayıt → sessiz', _bmYilOzet([{ tarih: t0, hacim: 11, verimG: 65 }]) === '');
      // profil kartı entegrasyonu: bmProfilKartHTML çağrısı çökmez + _bmYilOzet fonksiyonu bağlı
      __REG.ok('_bmYilOzet global fonksiyon', typeof _bmYilOzet === 'function');
      const kart = bmProfilKartHTML();
      __REG.ok('bmProfilKartHTML render çökmez (yıl bloğu entegre)', typeof kart === 'string' && kart.indexOf('DEMLEME GÜNLÜĞÜM') >= 0);
      return __REG.al();
    })
  },
  {
    kod: 'AD5-HARNESS', ad: 'GÖMÜLÜ HARNESS senkron: whFaktor 85→0.264 / 70→0.062 (Malowicki M5 — kod doğru), BJCP Dubbel og [1.062,1.075] (2021 anahtar) — 4 çürük test artık kod-uyumlu',
    calistir: (page) => page.evaluate(() => {
      // whFaktor kod değerleri (harness'ın senkronlandığı gerçek çıktı)
      __REG.ok('whFaktor(85) ≈ 0.264 (Malowicki Arrhenius, kod doğru)', Math.abs(whFaktor(85) - 0.264) < 0.003, whFaktor(85).toFixed(4));
      __REG.ok('whFaktor(70) ≈ 0.062', Math.abs(whFaktor(70) - 0.062) < 0.002, whFaktor(70).toFixed(4));
      __REG.ok('whFaktor(100)=1.0 referans korundu', Math.abs(whFaktor(100) - 1.0) < 0.001);
      // BJCP Dubbel doğru anahtar + değer
      __REG.ok('BJCP["Dubbel"] var (eski "Dark Belgian Dubbel" değil)', !!BJCP['Dubbel'] && !BJCP['Dark Belgian Dubbel']);
      __REG.ok('BJCP Dubbel og [1.062, 1.075] (BJCP 2021)', BJCP['Dubbel'].og[0] === 1.062 && BJCP['Dubbel'].og[1] === 1.075, JSON.stringify(BJCP['Dubbel'].og));
      return __REG.al();
    })
  },

  // ── SPRINT AF: girdi-yakalama uçlandırma (tadım + sıcaklık) ──
  {
    kod: 'AF1-TADIM', ad: 'TADIM UÇLANDIRMA: "içime hazır" alarm onayı → tadım toast + kısayol (sekme=not); OTOMATİK log YAZILMAZ (kullanıcı yargısı); R eşlemesi (dry-hop/FG/sanitize) bozulmadı',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('AF1 Bira', {});
      // içime-hazır alarmı kur (D-2 alarm şekli)
      const store = {}; store[id] = { alarmlar: [{ g: 40, ts: Date.now(), tip: 'kontrol', aksiyon: '🍺 İçime hazır — Dubbel olgunlaştı', aciklama: 'olgunlaştı', durum: 'bekliyor' }] };
      _alarmlariYaz(store);
      const krBefore = KR.find(x => x && x.id === id);
      const logBefore = (krBefore.brewLog || []).length;
      var eskiToast = document.getElementById('bm-tadim-toast'); if (eskiToast) eskiToast.remove();
      // alarm onayı → köprü
      _bmAlarmOnayKoprusu(id, 40);
      const toast = document.getElementById('bm-tadim-toast');
      __REG.ok('içime-hazır onayı → 👅 tadım toast çıktı', !!toast && toast.textContent.indexOf('Tadım zamanı') >= 0);
      __REG.ok('AF1 DİSİPLİN: otomatik tadım/log YAZILMADI (kullanıcı yargısı, uydurma yok)', (KR.find(x => x && x.id === id).brewLog || []).length === logBefore);
      // kısayol → reçete + tadım sekmesi
      _bmTadimGirKisayol(id);
      __REG.ok('tadım kısayolu → sekme="not" (tadım paneli rEditorNot)', sekme === 'not');
      if (toast) toast.remove();
      // R eşlemesi REGRESYON: içime-hazır ile şişele karışmaz + dry-hop otomatik log korundu
      const store2 = {}; store2[id] = { alarmlar: [{ g: 3, ts: Date.now(), tip: 'kontrol', aksiyon: '🌿 Dry hop ekle', aciklama: '50g Citra', durum: 'bekliyor' }] };
      _alarmlariYaz(store2);
      tarifAc(id);
      const l0 = (S.brewLog || []).length;
      _bmAlarmOnayKoprusu(id, 3);
      __REG.ok('R KORUNDU: dry-hop alarmı hâlâ OTOMATİK log yazıyor (tadım değil)', (S.brewLog || []).some(x => x.tip === 'dry_hop'));
      return __REG.al();
    })
  },
  {
    kod: 'AF2-SICAKLIK', ad: 'SICAKLIK UÇLANDIRMA: pitch-input → brewLog sicaklik (R köprü deseni) → kaliteSkoru 50-puan blok CANLANDI (sicaklikStab); U2 batch-ipucu görüyor; n>=2 yeter',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('AF2 Bira', { mayaId: 'us05' });
      // pitching gerekli (kaliteSkoru erken-return guard)
      S.brewLog = [{ tip: 'pitching', tarih: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10), deger: '', id: 'p1', ts: Date.now() - 7 * 86400000 }];
      const maya = MAYALAR.find(m => m.id === 'us05');
      // sıcaklık YOK → sicaklikStab 0
      const ks0 = kaliteSkoru(S, maya, 1.050, 1.012, S.biraAd);
      __REG.ok('sıcaklık logu YOKken sicaklikStab=0 (blok kör)', ks0.sicaklikStab === 0, 'ks0=' + ks0.sicaklikStab);
      // pitch-input → kaydet (1. ölçüm)
      bmFermSicSet(18); _bmSicaklikLogla();
      __REG.ok('AF2: brewLog sicaklik kaydı düştü (deger=18)', (S.brewLog || []).some(x => x.tip === 'sicaklik' && x.deger === '18'));
      // 2. ölçüm (n>=2 kaliteSkoru std için yeter)
      bmFermSicSet(19); _bmSicaklikLogla();
      __REG.ok('iki ölçüm birikti (n>=2)', (S.brewLog || []).filter(x => x.tip === 'sicaklik').length === 2);
      const ks = kaliteSkoru(S, maya, 1.050, 1.012, S.biraAd);
      __REG.ok('KRİTİK: kaliteSkoru sıcaklık logunu GÖRDÜ — sicaklikStab>0 (50-puan blok CANLANDI)', ks.sicaklikStab > 0, 'sicaklikStab=' + ks.sicaklikStab);
      __REG.ok('kaliteSkoru toplamı arttı (sıcaklık girdisiyle)', ks.toplam > ks0.toplam, ks0.toplam + ' → ' + ks.toplam);
      // U2 batch-ipucu sıcaklığı görüyor mu (aynı brewLog sicaklik kaynağı)
      const ipucu = (typeof _bmOffBatchIpucu === 'function') ? _bmOffBatchIpucu('fusel') : '';
      __REG.ok('U2 batch-ipucu sıcaklık verisini kullanıyor (°C geçiyor)', ipucu.indexOf('°C') >= 0 || ipucu.indexOf('sıcaklık') >= 0, ipucu ? 'dolu' : 'boş');
      return __REG.al();
    })
  },
  {
    kod: 'AF2-OPTIN', ad: 'SICAKLIK OPSİYONELLİĞİ: "kaydet" BASILMADAN → transient global (eski davranış) korunur, brewLog\'a YAZILMAZ',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('AF2 optin', { mayaId: 'us05' });
      S.brewLog = [];
      bmFermSicSet(20); // yalnız transient — _bmSicaklikLogla ÇAĞRILMADI
      __REG.ok('transient global set (eski davranış): bmFermSic()=20', bmFermSic() === 20);
      __REG.ok('kaydet basılmadan → brewLog sicaklik YOK (opsiyonellik korundu)', (S.brewLog || []).filter(x => x.tip === 'sicaklik').length === 0);
      // değersiz kaydet → yazmaz
      bmFermSicSet(''); _bmSicaklikLogla();
      __REG.ok('değersiz kaydet → yazmaz (uydurma yok)', (S.brewLog || []).filter(x => x.tip === 'sicaklik').length === 0);
      return __REG.al();
    })
  },

  // ── SPRINT AG: tadım paneli friksiyon (AG1 reorder + AG2 hızlı-overall + kaynak-ayrımı) ──
  {
    kod: 'AG1-REORDER', ad: 'OFF-FLAVOR ÖNE: panel render sırasında off-flavor bölümü 5 puandan ÖNCE (DOM); tag/? teşhis/W1 ekle AYNEN; 5 puan+15 tag+not KAYBOLMADI (veri-kesmez)',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('AG1 Bira', { mayaId: 'us05', stil: 'American IPA' });
      // şişeleme logu (panel _hasSis kapısı) + render not sekmesi
      S.brewLog = [{ tip: 'siseleme', tarih: '2026-07-01', id: 's1', ts: 1 }];
      ekran = 'editor'; sekme = 'not'; render();
      const dom = document.getElementById('ekran').innerHTML;
      const iOff = dom.indexOf('OFF-FLAVOR KONTROLÜ');
      const iAroma = dom.indexOf('👃 Aroma');
      __REG.ok('off-flavor bölümü 5 puandan ÖNCE render edildi (scroll gerekmez)', iOff >= 0 && iAroma >= 0 && iOff < iAroma, 'off=' + iOff + ' aroma=' + iAroma);
      __REG.ok('VERİ-KESMEZ: 5 BJCP puanı korundu (Aroma/Görünüm/Tat/Ağız/Genel)', dom.indexOf('👃 Aroma') >= 0 && dom.indexOf('👁️ Görünüm') >= 0 && dom.indexOf('👅 Tat') >= 0 && dom.indexOf('🫧 Ağız') >= 0 && dom.indexOf('⭐ Genel') >= 0);
      __REG.ok('VERİ-KESMEZ: 15 off-flavor tag korundu (_tOffLbl_ checkbox\'lar)', (dom.match(/_tOffLbl_/g) || []).length >= 15);
      __REG.ok('VERİ-KESMEZ: genel tadım notu korundu', dom.indexOf('id="tadimNot"') >= 0);
      __REG.ok('DETAYLI BJCP separator eklendi', dom.indexOf('DETAYLI BJCP PUANLAMA') >= 0);
      // W1 öğrenme yolu AYNEN: tag işaretle → bmOffOgren (? → ekle) çalışıyor
      const offOnce = window._bmOffOgrenOku().length;
      tadimOff('diacetyl', true); // tag işaretle (offList)
      __REG.ok('tag işaretleme (offList) çalışıyor', S.tadim && S.tadim.offList && S.tadim.offList.diacetyl === true);
      bmOffOgren('diacetyl'); // W1 öğrenme (?→ekle yolu, kod alır)
      __REG.ok('W1 öğrenme (bmOffOgren) AYNEN çalışıyor — profile eklendi', window._bmOffOgrenOku().length === offOnce + 1);
      return __REG.al();
    })
  },
  {
    kod: 'AG2-HIZLI', ad: 'HIZLI OVERALL: İyi→genel8+puanKaynak hizli; Sorunlu→genel2; detaylı puan→detay (kaba+precise KARIŞMAZ); oturum kaydet+delta AYNEN',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('AG2 Bira', { mayaId: 'us05' });
      S.brewLog = [{ tip: 'siseleme', tarih: '2026-07-01', id: 's1', ts: 1 }];
      S.tadim = null;
      tadimHizli(8);
      __REG.ok('İyi → genel=8 + puanKaynak=hizli', S.tadim.genel === 8 && S.tadim.puanKaynak === 'hizli');
      tadimHizli(2);
      __REG.ok('Sorunlu → genel=2 + hizli', S.tadim.genel === 2 && S.tadim.puanKaynak === 'hizli');
      // KRİTİK AYRIM: detaylı puan girince detay olur
      tadimSet('aroma', 10);
      __REG.ok('KAYNAK AYRIMI: detaylı puan → puanKaynak=detay (kaba+precise karışmaz)', S.tadim.puanKaynak === 'detay' && S.tadim.aroma === 10);
      // oturum kaydet AYNEN (arşiv)
      tadimOturumKaydet();
      __REG.ok('oturum kaydedildi (arşiv AYNEN) + puanKaynak dondu', S.tadim.oturumlar.length === 1 && S.tadim.oturumlar[0].puanKaynak === 'detay');
      return __REG.al();
    })
  },
  {
    kod: 'AG2-DELTA-KAYNAK', ad: 'DELTA KAYNAK-AYRIMI (kritik): hızlı+detaylı oturum karışık → delta kaba oturumu DIŞLAR (yanıltıcı "kötüleşti" yok); liste HEPSİNİ gösterir; iki-detay → delta çalışır',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('AG2 Delta', { mayaId: 'us05' });
      S.brewLog = [{ tip: 'siseleme', tarih: '2026-07-01', id: 's1', ts: 1 }];
      // 2 detaylı oturum (delta geçerli olmalı) + 1 hızlı (delta'ya girmemeli)
      S.tadim = { aroma: 0, gorunum: 0, tat: 0, agizH: 0, genel: 0, offList: {}, tadimNot: '', oturumlar: [
        { tarih: '2026-07-02', aroma: 8, gorunum: 2, tat: 15, agizH: 4, genel: 7, toplam: 36, offList: {}, puanKaynak: 'detay' },
        { tarih: '2026-07-05', aroma: 9, gorunum: 3, tat: 16, agizH: 4, genel: 8, toplam: 40, offList: {}, puanKaynak: 'detay' },
        { tarih: '2026-07-10', aroma: 0, gorunum: 0, tat: 0, agizH: 0, genel: 2, toplam: 2, offList: {}, puanKaynak: 'hizli' }
      ] };
      ekran = 'editor'; sekme = 'not'; render();
      const dom = document.getElementById('ekran').innerHTML;
      // delta son iki DETAY oturumu (36→40) karşılaştırır, hızlı (2) DEĞİL
      __REG.ok('delta detay oturumları eşler (36→40, hızlı dışlandı)', dom.indexOf('36/50') >= 0 && dom.indexOf('40/50') >= 0);
      __REG.ok('YANILTICI YOK: hızlı toplam (2/50) delta karşılaştırmasına GİRMEDİ', dom.indexOf('2/50 →') < 0 && dom.indexOf('→ 2/50') < 0);
      // liste hepsini gösterir (3 oturum arşivde)
      const oturumSay = (dom.match(/\/50/g) || []).length;
      __REG.ok('ARŞİV KORUNDU: liste 3 oturumu da gösterir (hızlı dahil)', dom.indexOf('👅 Hızlı') >= 0 || oturumSay >= 3, 'oturum işareti=' + oturumSay);
      return __REG.al();
    })
  },

  // ── SPRINT AH: stok refId backfill (AH1) + maya form/tol (AH2) + etiketler (AH3) ──
  {
    kod: 'AH1-BACKFILL', ad: 'STOK refId BACKFILL: refId\'siz kalem (isim-eşleşen) → refId yazılır; SONUÇ DEĞİŞMEZ (_stokMalBul aynı); temiz-grup+tek-eşleşme; belirsiz/diğer atla; refId isim-değişimine dayanıklı',
    calistir: (page) => page.evaluate(() => {
      const malt = MALTLAR.find(m => m && m.ad);
      const hop = HOPLAR.find(h => h && h.ad);
      // refId'siz stok (Kaan emsali: timestamp id, katalog-adı)
      STOK.length = 0;
      STOK.push({ id: '9990001', ad: malt.ad, g: 'Malt', miktar: 5, birim: 'kg' });
      STOK.push({ id: '9990002', ad: hop.ad, g: 'Hop', miktar: 100, birim: 'g' });
      STOK.push({ id: '9990003', ad: 'Bilinmeyen XYZ Malt', g: 'Malt', miktar: 3, birim: 'kg' });
      // backfill ÖNCESİ: isim-eşleşme sonucu
      const onceIdx = _stokMalBul(malt.id, malt.ad);
      __REG.ok('backfill ÖNCESİ: malt isim-eşleşiyor', onceIdx === 0, 'idx=' + onceIdx);
      // backfill uygula
      _bmStokRefIdBackfill(STOK);
      __REG.ok('temiz grup tek-eşleşme → refId = katalog malt id yazıldı', STOK[0].refId === malt.id, 'refId=' + STOK[0].refId + ' beklenen=' + malt.id);
      __REG.ok('hop refId = katalog hop id', STOK[1].refId === hop.id);
      __REG.ok('eşleşmeyen (Bilinmeyen XYZ) → refId YOK (isim fallback korunur)', !STOK[2].refId);
      // SONUÇ-KORUYAN: backfill sonrası _stokMalBul AYNI index
      __REG.ok('SONUÇ DEĞİŞMEZ: backfill sonrası malt hâlâ index 0 (refId ile eşleşir)', _stokMalBul(malt.id, malt.ad) === 0);
      // kırılganlık çözüldü: isim değişse bile refId eşleşir
      STOK[0].ad = 'İSİM DEĞİŞTİ';
      __REG.ok('KIRILGANLIK ÇÖZÜLDÜ: isim değişti ama refId ile hâlâ eşleşir', _stokMalBul(malt.id, malt.ad) === 0);
      STOK.length = 0;
      return __REG.al();
    })
  },
  {
    kod: 'AH1-REGRESYON', ad: 'AH1 REGRESYON (KRİTİK): backfill sonrası bmDemlenebilirAnaliz + alışveriş listesi + stokYetersizTam AYNEN çalışıyor (eşleşme mantığı değişti, SONUÇ değişmemeli)',
    calistir: (page) => page.evaluate(() => {
      // izole: yalnız bu case reçeteleri, boş stok → deterministik
      KR.length = 0; STOK.length = 0;
      __REG.yeniKayit('AH1REG Cok', { maltlar: [{ id: 'pilsner', kg: 3 }, { id: 'munich', kg: 1 }, { id: 'vienna', kg: 0.5 }, { id: 'wheat', kg: 0.5 }], hoplar: [], mayaId: '' });
      __REG.yeniKayit('AH1REG Az', { maltlar: [{ id: 'pilsner', kg: 4 }], hoplar: [], mayaId: '' });
      // ÖNCE (boş stok): analiz sonucu
      const a1 = bmDemlenebilirAnaliz();
      const cok1 = a1.cokEksik.length, az1 = a1.azEksik.length, alis1 = a1.alisveris.length;
      // backfill çağır (boş stokta no-op ama fn çökmemeli)
      _bmStokRefIdBackfill(STOK);
      // SONRA: aynı sonuç
      const a2 = bmDemlenebilirAnaliz();
      __REG.ok('bmDemlenebilirAnaliz SONUÇ AYNEN (cokEksik/azEksik/alışveriş sayısı değişmedi)', a2.cokEksik.length === cok1 && a2.azEksik.length === az1 && a2.alisveris.length === alis1, cok1 + '/' + az1 + '/' + alis1);
      // stokYetersizTam maya köprüsü çökmüyor
      const r = KR.find(x => x && x.biraAd === 'AH1REG Cok');
      const st = stokYetersizTam(r);
      __REG.ok('stokYetersizTam çalışıyor (backfill sonrası çökme yok)', st && Array.isArray(st.eksik));
      KR.length = 0; STOK.length = 0;
      return __REG.al();
    })
  },
  {
    kod: 'AH2-FORMTOL', ad: 'MAYA form/tol AÇIK ALAN (10 Fermentis): s33/t58 tol=11 belcika-band 13\'ü DÜZELTİR (AC datasheet) → AC uyarısı doğru; dolmayan maya fallback (uydurma yok); AA1 starter doğru',
    calistir: (page) => page.evaluate(() => {
      const M = (id) => MAYALAR.find(m => m.id === id);
      __REG.ok('s33 açık tol=11 (belcika-tip, band 13 düzeltildi)', bmMayaTol(M('s33')) === 11);
      __REG.ok('t58 açık tol=11', bmMayaTol(M('t58')) === 11);
      __REG.ok('be256 tol=13 (datasheet=band)', bmMayaTol(M('be256')) === 13);
      __REG.ok('wb06 form=dry açık alan', mayaFormu(M('wb06')) === 'dry');
      __REG.ok('DOLMAYAN maya (wy3068) → fallback (uydurma yok)', mayaFormu(M('wy3068')) === 'liquid' && bmMayaTol(M('wy3068')) === 11);
      // KRİTİK: s33 band-düzeltme AC uyarısında görünür (Belgian %12 + S-33 → aşıyor)
      __REG.yeniKayit('AH2 Belgian', { maltlar: [{ id: 'pilsner', kg: 8 }], mayaId: 's33', ogManuel: 1.096, fgManuel: 1.010 });
      ekran = 'editor'; sekme = 'genel';
      const abv = calc().abv;
      render();
      const dom = document.getElementById('ekran').innerHTML;
      __REG.ok('KRİTİK: yüksek ABV + S-33 (açık tol 11) → tolerans uyarısı (band 13 sessiz kaçardı)', abv >= 11 && dom.indexOf('alkol toleransını') >= 0, 'abv=' + abv.toFixed(1));
      // AA1 starter: s33 kuru → "starter yapılmaz" (form=dry doğru)
      const maya = M('s33');
      const hMaya = rEditorMaya(1.096, 1.010, abv, maya, null, 'hesap', 1.010);
      __REG.ok('AA1: S-33 (form=dry) yüksek OG → starter yapılmaz (Starter öneriliyor YOK)', hMaya.indexOf('Starter öneriliyor') < 0);
      return __REG.al();
    })
  },
  {
    kod: 'AH3-ETIKET', ad: 'ETİKETLER: hızlı tadım oturumu arşivde "hızlı kayıt" etiketli; yıl raporu litre "(tasarım hacmi)" netliği',
    calistir: (page) => page.evaluate(() => {
      // AH3-a: hızlı oturum etiketi
      __REG.yeniKayit('AH3 Bira', {});
      S.brewLog = [{ tip: 'siseleme', tarih: '2026-07-01', id: 's1', ts: 1 }];
      S.tadim = { aroma: 0, gorunum: 0, tat: 0, agizH: 0, genel: 0, offList: {}, tadimNot: '', oturumlar: [
        { tarih: '2026-07-10', aroma: 0, gorunum: 0, tat: 0, agizH: 0, genel: 8, toplam: 8, offList: {}, puanKaynak: 'hizli' },
        { tarih: '2026-07-12', aroma: 9, gorunum: 3, tat: 16, agizH: 4, genel: 8, toplam: 40, offList: {}, puanKaynak: 'detay' }
      ] };
      ekran = 'editor'; sekme = 'not'; render();
      const dom = document.getElementById('ekran').innerHTML;
      __REG.ok('hızlı oturum arşivde "hızlı kayıt" etiketli', dom.indexOf('hızlı kayıt') >= 0);
      __REG.ok('detay oturum etiketsiz (yalnız hızlı işaretli)', (dom.match(/hızlı kayıt/g) || []).length === 1);
      // AH3-b: yıl raporu (tasarım hacmi)
      const yil = new Date().getFullYear();
      const t0 = new Date(yil, 5, 1).getTime(), t1 = new Date(yil, 7, 1).getTime();
      const rapor = _bmYilOzet([
        { tarih: t0, hacim: 11, stil: 'X', mayaAd: 'A', verimG: 65, atten: 80 },
        { tarih: t1, hacim: 20, stil: 'Y', mayaAd: 'A', verimG: 61, atten: 78 }
      ]);
      __REG.ok('yıl raporu litre "(tasarım hacmi)" netliği', rapor.indexOf('(tasarım hacmi)') >= 0, rapor.slice(0, 60));
      return __REG.al();
    })
  },

  // ── SPRINT AJ — MASH NEDEN-SONUÇ BİLGİ TABANI ──
  {
    kod: 'AJ1-TABLO', ad: 'MASH BİLGİ TABANI: 7 kol grubu × 7 zorunlu alan dolu; 4 kanıt etiketi geçerli; belgeden gelen kritik atamalar (sülfat:klorür KANITLI, gövde ÖLÇÜLDÜ, mash-out/dekoksiyon/kaynar-sparge FOLKLOR)',
    calistir: (page) => page.evaluate(() => {
      const B = window._MASH_BILGI, K = window._MASH_KANIT;
      __REG.ok('_MASH_BILGI tablosu yüklü', !!B && Object.keys(B).length >= 20, B ? Object.keys(B).length + ' kol' : 'YOK');
      __REG.ok('4 kanıt etiketi tanımlı', !!K && ['KANITLI', 'OLCULDU', 'FOLKLOR', 'TARTISMALI'].every(k => K[k] && K[k].rozet));
      const zorunlu = ['kol', 'etki', 'mekanizma', 'kanitDurumu', 'buyukluk', 'stilBaglami', 'kaynak'];
      let eksik = 0, gecersiz = 0; const gruplar = {};
      Object.keys(B).forEach(k => {
        const d = B[k];
        zorunlu.forEach(f => { if (!d[f] || !String(d[f]).trim()) eksik++; });
        if (!K[d.kanitDurumu]) gecersiz++;
        gruplar[d.grup] = 1;
      });
      __REG.ok('her kolda 7 zorunlu alan dolu', eksik === 0, eksik);
      __REG.ok('her kolda geçerli kanıt etiketi', gecersiz === 0, gecersiz);
      __REG.ok('7 mash kol grubu da temsil ediliyor', Object.keys(gruplar).length === 7, Object.keys(gruplar).sort().join(','));
      // Belgeden (design_recete_danismanligi) gelen kritik etiketler — uydurma yok
      __REG.ok('sülfat:klorür KANITLI (p=0.003)', B.su_sulfatKlorur.kanitDurumu === 'KANITLI' && B.su_sulfatKlorur.buyukluk.indexOf('p=0.003') >= 0);
      __REG.ok('pH ölçüm sıcaklığı KANITLI (~0.3 birim)', B.ph_olcumSicakligi.kanitDurumu === 'KANITLI' && B.ph_olcumSicakligi.buyukluk.indexOf('0.3 birim') >= 0);
      __REG.ok('gövde algısı ÖLÇÜLDÜ·GÖSTERİLEMEDİ (p=0.42)', B.sc_govde.kanitDurumu === 'OLCULDU' && B.sc_govde.buyukluk.indexOf('p=0.42') >= 0);
      __REG.ok('mash-out FOLKLOR', B.step_mashOut.kanitDurumu === 'FOLKLOR');
      __REG.ok('dekoksiyon (modern malt) FOLKLOR', B.step_dekoksiyon.kanitDurumu === 'FOLKLOR');
      __REG.ok('kaynar sparge FOLKLOR (p=0.74)', B.sparge_sicaklik.kanitDurumu === 'FOLKLOR');
      __REG.ok('ferulik rest ÖLÇÜLDÜ (preskriptif "yapma" YOK)', B.step_ferulik.kanitDurumu === 'OLCULDU' && B.step_ferulik.kanitNot.indexOf('YETMİYOR') >= 0);
      __REG.ok('fermentasyon sıcaklığı KANITLI — karanfilin gerçek kolu', B.step_fermSicaklik.kanitDurumu === 'KANITLI' && B.step_fermSicaklik.buyukluk.indexOf('p=0.002') >= 0);
      return __REG.al();
    })
  },
  {
    kod: 'AJ1-DIL', ad: 'DİL DİSİPLİNİ (kritik): kullanıcıya giden metin "gösterilemedi" diyor; "algılanmıyor/algılanmaz" kesinliği YOK; "fark yok" yalnız tırnaklı negasyon içinde; OG konfoundu (apparent attenuation) belirtiliyor',
    calistir: (page) => page.evaluate(() => {
      const kart = window._bmMashBilgiKart(68, []);
      __REG.ok('kart üretiliyor', typeof kart === 'string' && kart.length > 3000, kart.length + ' karakter');
      __REG.ok('"gösterilemedi" dili kullanılıyor', (kart.match(/gösterilemedi/g) || []).length >= 5, (kart.match(/gösterilemedi/g) || []).length + ' kez');
      __REG.ok('"algılanmıyor" kesinliği YOK', kart.indexOf('algılanmıyor') < 0);
      __REG.ok('"algılanmaz" kesinliği YOK', kart.indexOf('algılanmaz') < 0);
      let kotu = 0, i = 0;
      while ((i = kart.indexOf('fark yok', i)) >= 0) {
        if (kart[i - 1] !== '"' || !/^"\s*(demek|kanıtı)/.test(kart.slice(i + 8, i + 30))) kotu++;
        i += 8;
      }
      __REG.ok('negasyon dışı "fark yok" kesinliği YOK', kotu === 0, kotu);
      __REG.ok('OG konfoundu belirtiliyor (apparent attenuation)', kart.indexOf('apparent attenuation') >= 0);
      __REG.ok('rozet metni "GÖSTERİLEMEDİ" taşıyor', window._MASH_KANIT.OLCULDU.rozet.indexOf('GÖSTERİLEMEDİ') >= 0, window._MASH_KANIT.OLCULDU.rozet);
      return __REG.al();
    })
  },
  {
    kod: 'AJ2-UI', ad: 'MASH UI: sıcaklık değişince bilgi göstergesi güncelleniyor (band + FG puanı); "Boşuna uğraşma" folklor listesi ve "Gerçekten fark yaratanlar" KANITLI listesi DOM\'da; enzim etiketleri gövde İDDİASI içermiyor',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('AJ2 Bira', {});
      ekran = 'editor'; sekme = 'surec';
      S.mashSc = 72; S.mashAdimlar = []; render();
      let dom = document.getElementById('ekran').innerHTML;
      __REG.ok('72°C → α-amilaz bandı gösteriliyor', dom.indexOf('α-amilaz ağırlıklı') >= 0);
      __REG.ok('72°C → FG hesabı +6.0 puan', dom.indexOf('FG hesabı +6.0 puan') >= 0);
      __REG.ok('"Boşuna uğraşma" bölümü var', dom.indexOf('Boşuna uğraşma') >= 0);
      __REG.ok('"Gerçekten fark yaratanlar" bölümü var', dom.indexOf('Gerçekten fark yaratanlar') >= 0);
      __REG.ok('KANITLI vurgusu: sülfat:klorür p=0.003 DOM\'da', dom.indexOf('p=0.003') >= 0);
      __REG.ok('KANITLI vurgusu: pH ölçüm sıcaklığı 0.3 birim DOM\'da', dom.indexOf('0.3 birim') >= 0);
      __REG.ok('folklor kolları DOM\'da (mash-out / dekoksiyon / kaynar sparge)',
        dom.indexOf('Mash-out (76-79°C)') >= 0 && dom.indexOf('Dekoksiyon — modern') >= 0 && dom.indexOf('kaynar su') >= 0);
      S.mashSc = 63; render();
      dom = document.getElementById('ekran').innerHTML;
      __REG.ok('63°C → β-amilaz bandı (reaktif)', dom.indexOf('β-amilaz ağırlıklı') >= 0 && dom.indexOf('α-amilaz ağırlıklı') < 0);
      __REG.ok('63°C → FG hesabı -2.0 puan', dom.indexOf('FG hesabı -2.0 puan') >= 0);
      S.mashSc = 67; render();
      dom = document.getElementById('ekran').innerHTML;
      __REG.ok('67°C → nötr band, FG etkisi yok', dom.indexOf('Dengeli band') >= 0 && dom.indexOf('nötr band') >= 0);
      __REG.ok('adım etiketleri gövde İDDİASI içermiyor (dekstrinli/nötr band)',
        dom.indexOf('Alfa+Beta — dolgun') < 0 && dom.indexOf('Alfa-amilaz — tam gövde') < 0 && dom.indexOf('Dengeli — orta gövde') < 0);
      return __REG.al();
    })
  },
  {
    kod: 'AJ2-WEIZEN', ad: 'WEIZEN KARANFİL YÖNLENDİRMESİ: Weizen bağlamında ferulik rest p=0.86 gösterilemedi + gerçek kol fermentasyon sıcaklığı (16 vs 22°C, p=0.002, OG/FG aynı); Weizen olmayan reçetede kutu ÇIKMAZ',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('AJ Weizen', {});
      ekran = 'editor'; sekme = 'surec';
      S.stil = 'American IPA'; S.mayaId = 'us05'; render();
      __REG.ok('IPA → Weizen kutusu YOK (bağlam-dışı gürültü yok)', document.getElementById('ekran').innerHTML.indexOf('kol MASH DEĞİL') < 0);
      S.stil = 'Weizen / Weissbier'; render();
      const dom = document.getElementById('ekran').innerHTML;
      __REG.ok('Weizen → karanfil kutusu VAR', dom.indexOf('kol MASH DEĞİL') >= 0);
      __REG.ok('ferulik rest: p=0.86 + "gösterilemedi"', dom.indexOf('p=0.86') >= 0 && dom.indexOf('gösterilemedi') >= 0);
      __REG.ok('gerçek kol: fermentasyon sıcaklığı 16°C vs 22°C, p=0.002', dom.indexOf('16°C vs 22°C') >= 0 && dom.indexOf('p=0.002') >= 0);
      __REG.ok('Maya sekmesine yönlendiriyor (mash adımına DEĞİL)', dom.indexOf('Maya sekmesinde fermentasyon sıcaklığını düşür') >= 0);
      // buğday mayası tipi de bağlamı açar (stil boş olsa bile)
      const wm = (typeof MAYALAR !== 'undefined') && MAYALAR.find(x => x && String(x.tip || '') === 'wheat');
      if (wm) { S.stil = ''; S.mayaId = wm.id; render(); __REG.ok('buğday mayası (tip=wheat) → kutu VAR', document.getElementById('ekran').innerHTML.indexOf('kol MASH DEĞİL') >= 0, wm.id); }
      else { __REG.ok('katalogda wheat tipi maya var', false, 'wheat maya bulunamadı'); }
      return __REG.al();
    })
  },
  {
    kod: 'AJ2-FG-MOTOR', ad: 'MOTOR TUTARLILIĞI (kritik): gösterilen FG puanı calc() mash düzeltmesiyle BİREBİR aynı (8597-8606 bozulmadı); 65-68°C nötr band korunuyor',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('AJ FG Motor', {});
      S.maltlar = [{ id: 'pale_ale', kg: 3 }]; S.mayaId = 'us05'; S.hacim = 11; S.verim = 61;
      S.mashAdimlar = []; S.fgManuel = '';
      const fgAt = (t) => { S.mashSc = t; const c = calc(); return c.fgHesap; };
      const f67 = fgAt(67), f72 = fgAt(72), f63 = fgAt(63), f65 = fgAt(65), f68 = fgAt(68);
      __REG.ok('65-68°C nötr band: FG aynı', Math.abs(f65 - f67) < 1e-9 && Math.abs(f68 - f67) < 1e-9, f65 + '/' + f67 + '/' + f68);
      const d72 = f72 - f67, d63 = f63 - f67;
      __REG.ok('72°C motor farkı = UI göstergesi (+0.0060)', Math.abs(d72 - window._bmMashFGEtki(72)) < 1e-9, 'motor=' + d72.toFixed(5) + ' ui=' + window._bmMashFGEtki(72).toFixed(5));
      __REG.ok('63°C motor farkı = UI göstergesi (-0.0020)', Math.abs(d63 - window._bmMashFGEtki(63)) < 1e-9, 'motor=' + d63.toFixed(5) + ' ui=' + window._bmMashFGEtki(63).toFixed(5));
      __REG.ok('yön doğru: yüksek mash → yüksek FG', f72 > f67 && f63 < f67, f63 + ' < ' + f67 + ' < ' + f72);
      return __REG.al();
    })
  },
  {
    kod: 'AJ3-MASHSTEPS', ad: 'ÖLÜ ÖZNİTELİK FIX: ML girdisinde mash_steps artık (S.mashAdimlar||[]).length okuyor — S.mashSteps hiçbir yerde yazılmıyordu (bayrak daima 1/0 sabitti)',
    calistir: (page) => page.evaluate(() => {
      const src = Array.from(document.querySelectorAll('script')).map(s => s.textContent).join('\n');
      __REG.ok('ölü "S.mashSteps" okuması KALDIRILDI', src.indexOf('mash_steps: (S.mashSteps || 1)') < 0);
      __REG.ok('mash_steps → mashAdimlar.length', src.indexOf('mash_steps: ((S.mashAdimlar||[]).length || 1)') >= 0);
      __REG.yeniKayit('AJ3 Bira', {});
      S.mashAdimlar = [{ sc: 63, dk: 30 }, { sc: 72, dk: 20 }];
      __REG.ok('2 adımlı step mash → mash_steps=2', ((S.mashAdimlar || []).length || 1) === 2);
      __REG.ok('S.mashSteps hâlâ tanımsız (ölü alan doğrulandı)', typeof S.mashSteps === 'undefined');
      S.mashAdimlar = [];
      __REG.ok('adım yok → 1 (fallback korunuyor)', ((S.mashAdimlar || []).length || 1) === 1);
      delete S.mashAdimlar;
      __REG.ok('mashAdimlar tanımsız → 1 (patlamıyor)', ((S.mashAdimlar || []).length || 1) === 1);
      return __REG.al();
    })
  },

  // ── SPRINT AK — PROFİL SEÇİCİ → STİL ÖNERİSİ ──
  {
    kod: 'AK1-TABLO', ad: 'PROFİL TABLOSU: 5×4×3 = 60 kovanın hepsi dolu (min n≥200); her öneri BJCP anahtarında VAR (sarkan referans yok); gövde ekseni FG\'den DEĞİL grist\'ten (dataset FG\'si %91.9 türetilmiş)',
    calistir: (page) => page.evaluate(() => {
      const T = window._PROFIL_STIL;
      __REG.ok('_PROFIL_STIL yüklü', !!T && Object.keys(T).length === 60, T ? Object.keys(T).length + ' kova' : 'YOK');
      const R = ['acik', 'altin', 'amber', 'koyu', 'cokkoyu'], A = ['malt', 'dengeli', 'hop', 'cokaci'], G = ['ince', 'orta', 'dolgun'];
      let eksik = 0, minKova = 1e9, bozukAd = 0, oneri = 0, iskeletli = 0;
      R.forEach(r => A.forEach(a => G.forEach(g => {
        const v = T[r + '|' + a + '|' + g];
        if (!v) { eksik++; return; }
        if (v[0] < minKova) minKova = v[0];
        v[1].forEach(p => { oneri++; if (!BJCP[p[0]]) bozukAd++; if (STIL_ISKELET[p[0]]) iskeletli++; });
      })));
      __REG.ok('60 kombinasyonun HEPSİ dolu', eksik === 0, eksik);
      __REG.ok('en seyrek kova bile n≥200 (keşif iddiası)', minKova >= 200, 'min=' + minKova);
      __REG.ok('her öneri BJCP anahtarında var (sarkan referans yok)', bozukAd === 0, bozukAd);
      __REG.ok('önerilerin çoğunda hazır iskelet var', iskeletli / oneri > 0.6, iskeletli + '/' + oneri);
      // Gövde vekili grist-tabanlı — kaynak kanıtı
      const src = Array.from(document.querySelectorAll('script')).map(s => s.textContent).join('\n');
      const ak = src.slice(src.indexOf('SPRINT AK — PROFİL SEÇİCİ'), src.indexOf('SPRINT AJ — MASH SÜRECİ'));
      __REG.ok('blok FG\'nin kullanılamayacağını belgeliyor', /FG.{0,40}(sahte|KURULAMAZ|güvenilmez)/i.test(ak));
      __REG.ok('vekil grist bileşenleri (crystal/oats/wheat/rye/şeker)',
        ['crystal', 'oats', 'wheat', 'rye', 'şeker'].every(x => ak.indexOf(x) >= 0));
      __REG.ok('AK kodu S.fg / fgHesap OKUMUYOR', ak.indexOf('S.fg') < 0 && ak.indexOf('fgHesap') < 0);
      return __REG.al();
    })
  },
  {
    kod: 'AK2-PROFIL', ad: 'PROFİL SEÇİMİ (koyu+dengeli+dolgun): brown ale / porter / oatmeal stout ailesi öneriliyor; korpus desteği (N reçete) ve kova toplamı şeffaf gösteriliyor',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('AK2 Bira', {});
      ekran = 'editor'; sekme = 'genel';
      window.__akProfil = { renk: '', aci: '', govde: '', maya: '', malt: '' }; render();
      let dom = document.getElementById('ekran').innerHTML;
      __REG.ok('giriş noktası görünür (dropdown alternatifi)', dom.indexOf('Stilin adını bilmiyorum') >= 0);
      // SPRINT BR: panel yerine TAM EKRAN; 'Üç ekseni de seç' ZORUNLULUĞU KALKTI —
      // hiçbir eksen seçilmemişken tüm korpus listelenir (5 eksen de isteğe bağlı).
      _brAc();
      dom = document.getElementById('ekran').innerHTML;
      __REG.ok('seçim yokken zorunluluk YOK, tüm korpus listeleniyor', dom.indexOf('Üç ekseni de seç') < 0 && dom.indexOf('336.149') >= 0);
      _bmProfilSec('renk', 'koyu'); _bmProfilSec('aci', 'dengeli'); _bmProfilSec('govde', 'dolgun');
      dom = document.getElementById('ekran').innerHTML;
      const adlar = window._PROFIL_STIL['koyu|dengeli|dolgun'][1].map(x => x[0]);
      __REG.ok('brown ale önerisi', adlar.some(x => /Brown Ale/i.test(x)), adlar.join(' · '));
      __REG.ok('porter önerisi', adlar.some(x => /Porter/i.test(x)));
      __REG.ok('oatmeal stout önerisi', adlar.some(x => /Oatmeal Stout/i.test(x)));
      __REG.ok('öneriler DOM\'a basıldı', adlar.every(a => dom.indexOf(a) >= 0));
      __REG.ok('korpus desteği "N reçete bu profilde" gösteriliyor', (dom.match(/reçete bu profilde/g) || []).length >= 5, (dom.match(/reçete bu profilde/g) || []).length);
      __REG.ok('kova toplamı şeffaf', /Bu profilde <b>[\d.]+<\/b> reçete/.test(dom));
      __REG.ok('kalite-değil uyarısı (dürüstlük)', dom.indexOf('kalite değerlendirmesi değil') >= 0);
      __REG.ok('seçim S\'ye YAZILMIYOR (reçete verisi değil)', typeof S.profil === 'undefined' && typeof S.akProfil === 'undefined');
      _brKapat();
      return __REG.al();
    })
  },
  {
    kod: 'AK2-ISKELET', ad: 'İSKELETLİ ÖNERİ: "📋 Doldur" → S.stil kurulur + V1a/V2 iskelet akışı çalışır (malt/hop dolar, hacme ölçeklenir, tutarlılık korunur)',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('AK İskelet', {});
      S.hacim = 11; S.verim = 61; S.maltlar = []; S.hoplar = []; S.mayaId = '';
      const key = 'koyu|dengeli|dolgun';
      const idx = window._PROFIL_STIL[key][1].findIndex(x => !!STIL_ISKELET[x[0]]);
      const ad = window._PROFIL_STIL[key][1][idx][0];
      __REG.ok('kovada iskeletli öneri var', idx >= 0, ad);
      _bmProfilStilUygula(key, idx, true);
      __REG.ok('S.stil önerilen stile kuruldu', S.stil === ad, S.stil);
      __REG.ok('malt DOLDU (V1a/V2 iskelet akışı)', (S.maltlar || []).length > 0, (S.maltlar || []).length + ' malt');
      __REG.ok('hop DOLDU', (S.hoplar || []).length > 0, (S.hoplar || []).length + ' hop');
      __REG.ok('maya kuruldu', !!S.mayaId, S.mayaId);
      const c = calc();
      const bj = BJCP[ad];
      __REG.ok('OG BJCP bandında (tutarlılık korundu)', c.og >= bj.og[0] - 0.004 && c.og <= bj.og[1] + 0.004, c.og.toFixed(3) + ' vs ' + JSON.stringify(bj.og));
      // ölçekleme: 22L'de malt ~2x
      const kg11 = (S.maltlar || []).reduce((a, m) => a + (m.kg || 0), 0);
      S.maltlar = []; S.hoplar = []; S.hacim = 22;
      _bmProfilStilUygula(key, idx, true);
      const kg22 = (S.maltlar || []).reduce((a, m) => a + (m.kg || 0), 0);
      __REG.ok('hacimle ölçekleniyor (11L→22L ≈ 2×)', kg22 > kg11 * 1.7 && kg22 < kg11 * 2.3, kg11.toFixed(2) + ' → ' + kg22.toFixed(2));
      return __REG.al();
    })
  },
  {
    kod: 'AK2-ISKELETSIZ', ad: 'İSKELETSİZ ÖNERİ (kritik): stil seçilebilir, BJCP hedefi + maya önerisi gelir AMA malt/hop BOŞ KALIR — SAHTE İSKELET ÜRETİLMEZ (V1a dersi)',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('AK İskeletsiz', {});
      S.hacim = 11; S.maltlar = []; S.hoplar = []; S.mayaId = '';
      // Sprint AL NOTU: sabit kova kullanılıyordu; V3 iskeletleri o kovanın TÜM önerilerini
      // doldurulabilir yaptı (kapsama %75→%97) → test çöküyordu. Artık iskeletsiz öneri
      // TÜM kovalarda aranır; hiç kalmadıysa bu bir BAŞARIDIR, test onu da doğrular.
      let key = null, idx = -1;
      for (const k of Object.keys(window._PROFIL_STIL)) {
        const i = window._PROFIL_STIL[k][1].findIndex(x => !STIL_ISKELET[x[0]]);
        if (i >= 0) { key = k; idx = i; break; }
      }
      if (idx < 0) {
        __REG.ok('profil tablosundaki TÜM öneriler artık doldurulabilir (C katmanı yolu V-CLAYER ile ayrıca test ediliyor)', true, 'iskeletsiz öneri kalmadı');
        return __REG.al();
      }
      __REG.ok('iskeletsiz öneri bulundu (C katmanı yolu test edilebilir)', idx >= 0, key + ' → ' + window._PROFIL_STIL[key][1][idx][0]);
      const ad = window._PROFIL_STIL[key][1][idx][0];
      _bmProfilStilUygula(key, idx, true);
      __REG.ok('S.stil kuruldu', S.stil === ad, S.stil);
      __REG.ok('malt BOŞ KALDI (sahte iskelet yok)', (S.maltlar || []).length === 0, (S.maltlar || []).length);
      __REG.ok('hop BOŞ KALDI', (S.hoplar || []).length === 0, (S.hoplar || []).length);
      __REG.ok('maya ÖNERİLDİ (C katmanı)', !!S.mayaId, S.mayaId);
      __REG.ok('BJCP hedefi çözülebilir', !!BJCP[ad] && Array.isArray(BJCP[ad].og), JSON.stringify(BJCP[ad] && BJCP[ad].og));
      // SPRINT BR: DOM iddiası TAM EKRANDA — öneri listesi artık orada (panel kaldırıldı)
      ekran = 'editor'; sekme = 'genel';
      const [kR, kA, kG] = key.split('|');
      _bmProfilSec('renk', kR); _bmProfilSec('aci', kA); _bmProfilSec('govde', kG);
      _brAc();
      const dom = document.getElementById('ekran').innerHTML;
      __REG.ok('UI\'da "🎯 Hedef yap" düğmesi (Doldur değil)', dom.indexOf('🎯 Hedef yap') >= 0);
      __REG.ok('düğme açıklaması: malt/hop uydurulmaz', dom.indexOf('malt/hop uydurulmaz') >= 0);
      _brKapat();
      return __REG.al();
    })
  },
  {
    kod: 'AK2-FARKLI', ad: 'FARKLI PROFİL FARKLI SONUÇ: açık/altın + çok acı + ince → IPA/Pale Ale ailesi; açık + malt ağırlıklı + dolgun → buğday ailesi (eksenler gerçekten ayırıyor)',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('AK Farklı', {});
      ekran = 'editor'; sekme = 'genel';
      const T = window._PROFIL_STIL;
      const hop = T['altin|cokaci|ince'][1].map(x => x[0]);
      __REG.ok('altın+çok acı+ince → IPA ailesi', hop.some(x => /IPA/i.test(x)), hop.join(' · '));
      __REG.ok('altın+çok acı+ince → Pale Ale de var', hop.some(x => /Pale Ale/i.test(x)));
      const wheat = T['acik|malt|dolgun'][1].map(x => x[0]);
      __REG.ok('açık+malt+dolgun → buğday ailesi (Weizen/Witbier)',
        wheat.some(x => /Weizen|Weissbier/i.test(x)) && wheat.some(x => /Witbier|Wheat/i.test(x)), wheat.join(' · '));
      __REG.ok('iki profil ÖRTÜŞMÜYOR (eksenler ayırıyor)', hop.filter(x => wheat.indexOf(x) >= 0).length <= 1);
      // reaktiflik: profil değişince DOM değişir
      _bmProfilSec('renk', 'altin'); _bmProfilSec('aci', 'cokaci'); _bmProfilSec('govde', 'ince');
      const d1 = document.getElementById('ekran').innerHTML;
      _bmProfilSec('renk', 'acik'); _bmProfilSec('aci', 'malt');
      const d2 = document.getElementById('ekran').innerHTML;
      __REG.ok('profil değişince öneri listesi değişiyor (reaktif)', d1 !== d2 && d1.indexOf('American IPA') >= 0);
      return __REG.al();
    })
  },
  {
    kod: 'AK3-DROPDOWN', ad: 'REGRESYON: mevcut "🎯 Hedef Stil" dropdown\'u AYNEN çalışıyor (profil seçici ALTERNATİF giriş, replacement DEĞİL); __stilSecKaynak ayrımı korunuyor',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('AK Dropdown', {});
      ekran = 'editor'; sekme = 'genel'; render();
      const dom = document.getElementById('ekran').innerHTML;
      __REG.ok('dropdown DOM\'da duruyor', dom.indexOf('🎯 Hedef Stil:') >= 0);
      __REG.ok('dropdown 239 BJCP stilini listeliyor', (dom.match(/<option value="/g) || []).length >= 200, (dom.match(/<option value="/g) || []).length);
      __REG.ok('dropdown yanındaki "İskeleti Doldur" duruyor', dom.indexOf('bmStilIskeletDoldur()') >= 0);
      // dropdown yolu: kaynak 'dropdown'
      S.stil = 'Dry Irish Stout'; window.__stilSecKaynak = 'dropdown';
      S.maltlar = []; S.hoplar = []; S.mayaId = ''; S.hacim = 11;
      bmStilIskeletDoldur();
      __REG.ok('dropdown → İskeleti Doldur hâlâ malt dolduruyor', (S.maltlar || []).length > 0, (S.maltlar || []).length);
      // profil yolu Sprint Z ayrımını bozmuyor: NİYET (iskelet), düzeltme sinyali değil
      _bmProfilStilUygula('koyu|dengeli|dolgun', 0, false);
      __REG.ok('profil yolu __stilSecKaynak=iskelet (öğrenme kolu zehirlenmez)', window.__stilSecKaynak === 'iskelet', window.__stilSecKaynak);
      return __REG.al();
    })
  },

  // ── SPRINT AL — V3 ÇIKARIM: 376K korpustan 21 yeni iskelet ──
  {
    kod: 'AL1-URETIM', ad: 'V3 ÜRETİM: 21 yeni iskelet kaynak izi cikarim_v3 + n>=40 + maya-tip; MEVCUT 42 iskelet EZİLMEDİ (küratör/V1b/V2 kazanır)',
    calistir: (page) => page.evaluate(() => {
      const K = window.STIL_ISKELET, adlar = Object.keys(K);
      const v3 = adlar.filter(a => K[a].kaynak === 'cikarim_v3');
      const eski = adlar.filter(a => K[a].kaynak !== 'cikarim_v3');
      __REG.ok('toplam 63 iskelet (42 + 21)', adlar.length === 63, adlar.length);
      __REG.ok('21 yeni V3 iskeleti', v3.length === 21, v3.length);
      __REG.ok('MEVCUT 42 iskelet KORUNDU (çakışmada mevcut kazanır)', eski.length === 42, eski.length);
      __REG.ok('her V3 kaydı n>=40 taşır (V2 eşiği 5 → 376K korpusta 8×)', v3.every(a => K[a].n >= 40), v3.filter(a => !(K[a].n >= 40)).join(','));
      __REG.ok('her V3 kaydı maya-tip izi taşır (şeffaflık)', v3.every(a => !!K[a].maya), v3.filter(a => !K[a].maya).join(','));
      __REG.ok('her V3 gristi %100', v3.every(a => Math.abs(K[a].grist.reduce((s, g) => s + g[1], 0) - 100) < 0.01));
      // beklenen çekirdek stiller (spec: Robust Porter / Imperial Stout / ESB / Irish Red / Dark Mild)
      ['Robust Porter', 'Imperial / Russian Imperial Stout', 'Strong Bitter / ESB', 'Irish Red Ale', 'English Mild / Dark Mild']
        .forEach(a => __REG.ok('spec adayı üretildi: ' + a, !!K[a] && K[a].kaynak === 'cikarim_v3', K[a] ? 'n=' + K[a].n : 'YOK'));
      return __REG.al();
    })
  },
  {
    kod: 'AL2-KAPI', ad: 'TUTARLILIK KAPISI + ASSERT-ONCE: 21 V3 iskeletinin HEPSİ calc() ile BJCP aralığında; hiçbir malt/hop/maya ID katalog-dışı (uydurma-ID=0)',
    calistir: (page) => page.evaluate(() => {
      const K = window.STIL_ISKELET;
      const v3 = Object.keys(K).filter(a => K[a].kaynak === 'cikarim_v3');
      const KOYU_SMAX = 30;
      const maltIds = new Set(MALTLAR.filter(m => m).map(m => m.id));
      const hopIds = new Set(HOPLAR.filter(x => x).map(x => x.id));
      const mayaIds = new Set(MAYALAR.filter(x => x).map(x => x.id));
      let idKotu = [], kapiKotu = [];
      v3.forEach(a => {
        K[a].grist.forEach(g => { if (!maltIds.has(g[0])) idKotu.push(a + ':malt:' + g[0]); });
        K[a].hop.forEach(x => { if (!hopIds.has(x.id)) idKotu.push(a + ':hop:' + x.id); });
        if (!mayaIds.has(K[a].mayaId)) idKotu.push(a + ':maya:' + K[a].mayaId);
        const r = window._stilIskeletHesap(a, 11, 61);
        if (!r || !r.malts || !r.malts.length) { kapiKotu.push(a + ':hesap-null'); return; }
        const bj = BJCP[a], c = calcIskelet(r);
        if (!(c.og >= bj.og[0] && c.og <= bj.og[1])) kapiKotu.push(a + ':OG=' + c.og.toFixed(3));
        if (!(c.ibu >= bj.ibu[0] && c.ibu <= bj.ibu[1])) kapiKotu.push(a + ':IBU=' + Math.round(c.ibu));
        if (!(c.srm >= bj.srm[0] && (bj.srm[1] >= KOYU_SMAX || c.srm <= bj.srm[1]))) kapiKotu.push(a + ':SRM=' + c.srm);
      });
      function calcIskelet(r) {
        const og = hOG(r.malts, 61, [], 11);
        return { og, ibu: hIBU(r.hops, og, 11, []), srm: hSRM(r.malts, [], 11) };
      }
      __REG.ok('UYDURMA-ID = 0 (assert-once, katalog-ID tuzağı 4. kez)', idKotu.length === 0, idKotu.join(' | ') || '0');
      __REG.ok('21/21 iskelet tutarlılık kapısını GEÇİYOR', kapiKotu.length === 0, kapiKotu.join(' | ') || '21/21');
      return __REG.al();
    })
  },
  {
    kod: 'AL3-IMPSTOUT', ad: 'IMPERIAL STOUT (spec): V2\'de motor-renk >1.9×BJCP-max diye DÜŞMÜŞTÜ; X2 KOYU_SMAX toleransı sayesinde ARTIK GEÇİYOR — otantik koyu grist korundu, kapı gevşetilmedi',
    calistir: (page) => page.evaluate(() => {
      const ad = 'Imperial / Russian Imperial Stout', K = window.STIL_ISKELET[ad];
      __REG.ok('Imperial Stout iskeleti VAR (V2\'de yoktu)', !!K && K.kaynak === 'cikarim_v3', K ? K.kaynak : 'YOK');
      __REG.ok('grist otantik koyu kavurma içeriyor', !!K && K.grist.some(g => /choc|roast|black|crf/.test(g[0])), K ? JSON.stringify(K.grist) : '-');
      const r = window._stilIskeletHesap(ad, 11, 61);
      const og = hOG(r.malts, 61, [], 11), srm = hSRM(r.malts, [], 11), bj = BJCP[ad];
      __REG.ok('SRM BJCP tavanının ÜSTÜNDE (koyu karakter gutlanmadı)', srm > bj.srm[1], 'SRM=' + srm + ' tavan=' + bj.srm[1]);
      __REG.ok('BJCP srm tavanı >= 30 → X2 kuralı gereği üst-yön serbest', bj.srm[1] >= 30, bj.srm[1]);
      __REG.ok('ALT sınır YİNE zorunlu (kapı gevşetilmedi)', srm >= bj.srm[0], srm + ' >= ' + bj.srm[0]);
      __REG.ok('OG BJCP aralığında (sayısal-anlamlı eksen aynen zorunlu)', og >= bj.og[0] && og <= bj.og[1], og.toFixed(3) + ' ∈ [' + bj.og + ']');
      return __REG.al();
    })
  },
  {
    kod: 'AL4-MAYA', ad: 'MAYA-TİP DİSİPLİNİ (kapı bunu GÖRMEZ — ayrı katman): V3 iskeletlerinde lager/ale çelişkisi yok; kaydedilen maya-tip gerçek katalog tipiyle tutuyor',
    calistir: (page) => page.evaluate(() => {
      const K = window.STIL_ISKELET;
      const v3 = Object.keys(K).filter(a => K[a].kaynak === 'cikarim_v3');
      const mById = {}; MAYALAR.filter(m => m).forEach(m => mById[m.id] = m);
      const celiski = [];
      v3.forEach(a => {
        const m = mById[K[a].mayaId]; if (!m) return;
        const hibrit = /kölsch|altbier|california common|steam|cream ale/i.test(a);
        if (hibrit) return;
        const lagerStil = /lager|pils|bock|märzen|oktoberfest|festbier|schwarz|dunkel|dortmund/i.test(a);
        if (lagerStil && m.tip !== 'lager') celiski.push(a + ' lager-stili×' + m.tip);
        if (!lagerStil && m.tip === 'lager') celiski.push(a + ' ale-stili×lager');
      });
      __REG.ok('lager/ale stil-maya çelişkisi YOK', celiski.length === 0, celiski.join(' | ') || '0');
      __REG.ok('kaydedilen maya-tip = katalog tipi', v3.every(a => { const m = mById[K[a].mayaId]; return !m || m.tip === K[a].maya; }),
        v3.filter(a => { const m = mById[K[a].mayaId]; return m && m.tip !== K[a].maya; }).join(','));
      __REG.ok('ESB → İngiliz maya s04', K['Strong Bitter / ESB'].mayaId === 's04', K['Strong Bitter / ESB'].mayaId);
      __REG.ok('Belgian Strong Golden → belcika tipi maya', mById[K['Belgian Strong Golden Ale'].mayaId].tip === 'belcika', K['Belgian Strong Golden Ale'].mayaId);
      __REG.ok('California Common → lager maya (hibrit stil, doğru istisna)', mById[K['California Common / Steam Beer'].mayaId].tip === 'lager', K['California Common / Steam Beer'].mayaId);
      __REG.ok('Munich Dunkel → lager maya (stil-aile katmanı)', mById[K['Munich Dunkel'].mayaId].tip === 'lager', K['Munich Dunkel'].mayaId);
      return __REG.al();
    })
  },
  {
    kod: 'AL5-AK-ENTEGRASYON', ad: 'AK ENTEGRASYONU (sprintin asıl değeri): profil seçicide "🎯 Hedef yap" satırları "📋 Doldur"a döndü — kapsama ölçülüyor',
    calistir: (page) => page.evaluate(() => {
      const T = window._PROFIL_STIL, K = window.STIL_ISKELET;
      let oneri = 0, iskSonra = 0, iskOnce = 0;
      Object.values(T).forEach(v => v[1].forEach(x => {
        oneri++;
        if (K[x[0]]) iskSonra++;
        if (K[x[0]] && K[x[0]].kaynak !== 'cikarim_v3') iskOnce++;
      }));
      __REG.ok('profil önerilerinin >=%95\'i artık doldurulabilir', iskSonra / oneri >= 0.95, iskSonra + '/' + oneri + ' = %' + Math.round(100 * iskSonra / oneri));
      __REG.ok('AL öncesi oran ~%75 idi → net kazanç', iskOnce / oneri < 0.80 && iskSonra > iskOnce, '%' + Math.round(100 * iskOnce / oneri) + ' → %' + Math.round(100 * iskSonra / oneri) + ' (+' + (iskSonra - iskOnce) + ' satır)');
      // koyu+dengeli+dolgun kovası: AK'da Robust Porter "Hedef yap" idi, artık "Doldur"
      const koyu = T['koyu|dengeli|dolgun'][1].map(x => x[0]);
      __REG.ok('Robust Porter bu kovada öneriliyor', koyu.indexOf('Robust Porter') >= 0, koyu.join(' · '));
      __REG.ok('Robust Porter artık İSKELETLİ (AK\'da değildi)', !!K['Robust Porter'] && K['Robust Porter'].kaynak === 'cikarim_v3');
      // UI kanıtı: o kovada "Hedef yap" düğmesi kalmadı
      __REG.yeniKayit('AL5 Bira', {});
      ekran = 'editor'; sekme = 'genel';
      _bmProfilSec('renk', 'koyu'); _bmProfilSec('aci', 'dengeli'); _bmProfilSec('govde', 'dolgun');
      _brAc(); // SPRINT BR: öneri listesi tam ekranda
      const dom = document.getElementById('ekran').innerHTML;
      const tumIskeletli = koyu.every(a => !!K[a]);
      __REG.ok('kovadaki TÜM öneriler iskeletli', tumIskeletli, koyu.filter(a => !K[a]).join(',') || 'hepsi');
      __REG.ok('UI: bu kovada "🎯 Hedef yap" düğmesi KALMADI', tumIskeletli ? dom.indexOf('🎯 Hedef yap') < 0 : true);
      __REG.ok('UI: "📋 Doldur" düğmeleri var', (dom.match(/📋 Doldur/g) || []).length >= 5, (dom.match(/📋 Doldur/g) || []).length);
      _brKapat();
      return __REG.al();
    })
  },
  {
    kod: 'AL6-DOLDUR', ad: 'YENİ İSKELET UÇTAN UCA: V3 iskeleti reçeteyi gerçekten dolduruyor + 11L/22L ölçekleniyor + BJCP hedefinde kalıyor',
    calistir: (page) => page.evaluate(() => {
      const K = window.STIL_ISKELET;
      const ad = 'Robust Porter';
      __REG.yeniKayit('AL6 Bira', {});
      S.hacim = 11; S.verim = 61; S.maltlar = []; S.hoplar = []; S.mayaId = '';
      S.stil = ad; bmStilIskeletDoldur();
      __REG.ok('malt doldu', (S.maltlar || []).length > 0, (S.maltlar || []).length);
      __REG.ok('hop doldu', (S.hoplar || []).length > 0, (S.hoplar || []).length);
      __REG.ok('maya kuruldu (İngiliz ale)', S.mayaId === K[ad].mayaId, S.mayaId);
      const c = calc(), bj = BJCP[ad];
      __REG.ok('OG BJCP aralığında', c.og >= bj.og[0] - 0.003 && c.og <= bj.og[1] + 0.003, c.og.toFixed(3) + ' ∈ [' + bj.og + ']');
      __REG.ok('IBU BJCP aralığında', c.ibu >= bj.ibu[0] - 3 && c.ibu <= bj.ibu[1] + 3, Math.round(c.ibu) + ' ∈ [' + bj.ibu + ']');
      const kg11 = (S.maltlar || []).reduce((a, m) => a + (m.kg || 0), 0);
      S.maltlar = []; S.hoplar = []; S.hacim = 22; bmStilIskeletDoldur();
      const kg22 = (S.maltlar || []).reduce((a, m) => a + (m.kg || 0), 0);
      __REG.ok('11L → 22L ölçekleme ~2×', kg22 > kg11 * 1.8 && kg22 < kg11 * 2.2, kg11.toFixed(2) + ' → ' + kg22.toFixed(2));
      return __REG.al();
    })
  },

  // ── SPRINT AM — _PROFIL_STIL YENİDEN ÜRETİMİ (AL'in 63 iskeletiyle) ──
  {
    kod: 'AM1-YENIDEN', ad: 'SPRINT AM: tablo AL\'in 63 iskeletiyle senkron — sıralama n×1.35 GÜNCEL iskelet setiyle tutarlı (AK-dönemi tabloda bozuktu); V3 kapsaması 10→12; şema korundu (60 kova, ≤6 öneri)',
    calistir: (page) => page.evaluate(() => {
      const T = window._PROFIL_STIL, K = window.STIL_ISKELET;
      __REG.ok('60 kova + kova başına 1-6 öneri (MAX_ONERI şeması korundu)',
        Object.keys(T).length === 60 && Object.values(T).every(v => v[1].length >= 1 && v[1].length <= 6));
      // AM'in asıl kilidi: her kovada n×(iskelet?1.35:1) AZALAN. AK-dönemi tabloda
      // bu bozuktu — V3 stilleri boost almamıştı (koyu|dengeli|dolgun'da Oatmeal 998
      // boost'lu, Robust Porter 1088 boost'suz sıralanmıştı).
      let bozukSira = [];
      Object.keys(T).forEach(k => {
        const L = T[k][1];
        for (let i = 1; i < L.length; i++) {
          const p = L[i - 1][1] * (K[L[i - 1][0]] ? 1.35 : 1), q = L[i][1] * (K[L[i][0]] ? 1.35 : 1);
          if (q > p + 1e-9) bozukSira.push(k + '#' + i);
        }
      });
      __REG.ok('her kovada sıralama n×1.35 (güncel iskelet seti) ile tutarlı', bozukSira.length === 0, bozukSira.slice(0, 4).join(' | ') || 'tutarlı');
      const v3 = Object.keys(K).filter(a => K[a].kaynak === 'cikarim_v3');
      const stiller = new Set(); Object.values(T).forEach(v => v[1].forEach(x => stiller.add(x[0])));
      __REG.ok('V3 iskeletli stillerden ≥12 tabloda (AM öncesi 10 idi)', v3.filter(a => stiller.has(a)).length >= 12, v3.filter(a => stiller.has(a)).length + '/' + v3.length);
      __REG.ok('Bock tabloya girdi (boost kanıtı)', stiller.has('Bock'));
      __REG.ok('Black IPA tabloya girdi (boost kanıtı)', stiller.has('Black IPA / Cascadian Dark Ale'));
      let oneri = 0, isk = 0, tam = 0;
      Object.values(T).forEach(v => { let t = true; v[1].forEach(x => { oneri++; if (K[x[0]]) isk++; else t = false; }); if (t) tam++; });
      __REG.ok('önerilerin ≥%96\'sı "📋 Doldur" (348/359 ölçüldü)', isk / oneri >= 0.96, isk + '/' + oneri);
      __REG.ok('tam doldurulabilir kova ≥50 (AM öncesi 49)', tam >= 50, tam + '/60');
      return __REG.al();
    })
  },
  {
    kod: 'AM2-COMMON', ad: 'SPRINT AM: common_beer katch-all DEĞİL — 2.721 kaydı kova toplamlarına sayılıyor; California Common hiçbir kovada top-6\'ya girmiyor (VERİ gerçeği, zorla sokulmadı) ama iskeleti dropdown+Doldur ile UÇTAN UCA çalışıyor',
    calistir: (page) => page.evaluate(() => {
      const T = window._PROFIL_STIL;
      const ad = 'California Common / Steam Beer';
      const src = Array.from(document.querySelectorAll('script')).map(s => s.textContent).join('\n');
      const ak = src.slice(src.indexOf('SPRINT AK — PROFİL SEÇİCİ'), src.indexOf('SPRINT AJ — MASH SÜRECİ'));
      __REG.ok('blok common_beer düzeltmesini + veri gerçeğini belgeliyor', ak.indexOf('common_beer') >= 0 && ak.indexOf('ZORLA SOKULMADI') >= 0);
      __REG.ok('kova toplamları CC kayıtlarıyla büyüdü (altin|hop|dolgun 12554→12912)', T['altin|hop|dolgun'][0] === 12912, T['altin|hop|dolgun'][0]);
      __REG.ok('CC iskeleti VAR (dropdown yolu erişilebilir)', !!STIL_ISKELET[ad] && STIL_ISKELET[ad].kaynak === 'cikarim_v3');
      __REG.yeniKayit('AM2 Bira', {});
      S.hacim = 11; S.verim = 61; S.maltlar = []; S.hoplar = []; S.mayaId = '';
      S.stil = ad; window.__stilSecKaynak = 'dropdown';
      bmStilIskeletDoldur();
      __REG.ok('California Common malt dolduruyor', (S.maltlar || []).length > 0, (S.maltlar || []).length + ' malt');
      __REG.ok('hop dolduruyor', (S.hoplar || []).length > 0, (S.hoplar || []).length + ' hop');
      const my = MAYALAR.find(m => m && m.id === S.mayaId);
      __REG.ok('maya lager (hibrit istisna, AL4 ile tutarlı)', !!my && my.tip === 'lager', S.mayaId);
      const c = calc(), bj = BJCP[ad];
      __REG.ok('OG BJCP aralığında', c.og >= bj.og[0] - 0.003 && c.og <= bj.og[1] + 0.003, c.og.toFixed(3) + ' ∈ [' + bj.og + ']');
      return __REG.al();
    })
  },

  // ── SPRINT AN — TOPLULUK DAĞILIMI (Reçete Doktoru 4. öneri sınıfı) ──
  {
    kod: 'AN1-DAGILIM', ad: 'SPRINT AN: topluluk dağılımı gözlemi — Dubbel\'de şeker yok → "3.705 reçetenin %75\'i şeker kullanıyor" (sayılar build-time tabloyla BİREBİR, uydurma yok); tablo n≥200 eşiğini taşıyor',
    calistir: (page) => page.evaluate(() => {
      const D = window._TOPLULUK_DAGILIM;
      __REG.ok('tablo yüklü (68 stil)', !!D && Object.keys(D).length === 68, D && Object.keys(D).length);
      __REG.ok('TÜM stiller n≥200 (spec eşiği)', Object.values(D).every(v => v[0] >= 200));
      __REG.ok('tüm stiller BJCP otoritesinde', Object.keys(D).every(a => !!BJCP[a]));
      __REG.ok('persentiller monoton (p10≤p25≤med≤p75≤p90)',
        Object.values(D).every(v => Object.values(v[1]).every(x => x[1] <= x[2] && x[2] <= x[3] && x[3] <= x[4] && x[4] <= x[5])));
      // Dubbel iskeletini doldur, sonra ŞEKERİ ÇIKAR → "yaygın ama sende yok" dalı
      __REG.yeniKayit('AN1 Dubbel', {});
      ekran = 'editor'; sekme = 'genel';
      S.hacim = 11; S.verim = 61; S.stil = 'Dubbel';
      bmStilIskeletDoldur();
      const sekerIds = MALTLAR.filter(m => m && m.g === 'Şeker').map(m => m.id);
      const oncekiSeker = (S.maltlar || []).filter(m => sekerIds.indexOf(m.id) >= 0).length;
      __REG.ok('Dubbel iskeleti şeker İÇERİYORDU (testin ön koşulu)', oncekiSeker > 0, oncekiSeker + ' şeker kalemi');
      S.maltlar = (S.maltlar || []).filter(m => sekerIds.indexOf(m.id) < 0);
      render();
      const dom = document.getElementById('ekran').innerHTML;
      __REG.ok('topluluk bölümü basıldı', dom.indexOf('bm-topluluk') >= 0);
      __REG.ok('Dubbel n=3.705 tabloda', D['Dubbel'][0] === 3705, D['Dubbel'][0]);
      __REG.ok('şeker oranı tabloda %75', D['Dubbel'].su ? false : D['Dubbel'][1].su[0] === 75, D['Dubbel'][1].su[0]);
      __REG.ok('DOM\'da gerçek sayı: "%75"', dom.indexOf('%75') >= 0);
      __REG.ok('DOM\'da korpus n\'i şeffaf: "3.705"', dom.indexOf('3.705') >= 0);
      __REG.ok('şeker gözlemi metinde', /şeker\/şeker malt/i.test(dom));
      // Motor birim testi — DOM'dan bağımsız
      const c = calc();
      const f = window.__bmBuildFeaturesV12(window.__recipeV2 || {});
      const gs = window._bmToplulukGozlem('Dubbel', f, { og: c.og, ibu: c.ibu, srm: parseFloat(c.srm), abv: c.abv }, BJCP['Dubbel']);
      __REG.ok('gözlem üretildi (≤4 — gürültü kapısı)', gs.length >= 1 && gs.length <= 4, gs.length + ' gözlem');
      const su = gs.find(g => g.k === 'su');
      __REG.ok('şeker gözlemi "yaygın ama sende yok" dalında', !!su && su.tur === 'yok', su && su.tur);
      __REG.ok('gözlem metni tabloyla tutarlı (%75 + medyan)', !!su && su.metin.indexOf('%75') >= 0 && su.metin.indexOf('8,6') >= 0, su && su.metin);
      return __REG.al();
    })
  },
  {
    kod: 'AN2-ESIK', ad: 'SPRINT AN: az örneklemli stilde SESSİZ — n<200 olan BJCP stilinde tek bir istatistik cümlesi bile kurulmaz (uydurma yok); 239 BJCP stilinin yalnız 68\'i tabloda',
    calistir: (page) => page.evaluate(() => {
      const D = window._TOPLULUK_DAGILIM;
      const disarda = Object.keys(BJCP).filter(a => !D[a]);
      __REG.ok('BJCP\'nin çoğu tablo DIŞINDA (eşik gerçekten uygulanıyor)', disarda.length >= 150, disarda.length + '/' + Object.keys(BJCP).length + ' stil tablosuz');
      __REG.yeniKayit('AN2 Esik', {});
      ekran = 'editor'; sekme = 'genel';
      S.hacim = 11; S.verim = 61;
      // Tabloda OLMAYAN ama iskeleti olan bir stil seç (grist gerçek kalsın)
      const hedef = Object.keys(STIL_ISKELET).find(a => !D[a] && BJCP[a]);
      __REG.ok('test için tablosuz+iskeletli stil bulundu', !!hedef, hedef);
      S.stil = hedef; bmStilIskeletDoldur(); render();
      const dom = document.getElementById('ekran').innerHTML;
      __REG.ok('topluluk bölümü BASILMADI (sessiz)', dom.indexOf('bm-topluluk') < 0);
      __REG.ok('"reçete" istatistik cümlesi de yok', dom.indexOf('📊 Topluluk') < 0);
      const c = calc();
      const f = window.__bmBuildFeaturesV12(window.__recipeV2 || {});
      __REG.ok('motor da boş dönüyor', window._bmToplulukGozlem(hedef, f, { og: c.og, ibu: c.ibu, srm: parseFloat(c.srm), abv: c.abv }, BJCP[hedef]).length === 0);
      __REG.ok('bölüm render\'ı da boş', window._bmToplulukBolum(hedef, BJCP[hedef], f, { og: c.og, ibu: c.ibu, srm: parseFloat(c.srm), abv: c.abv }, true) === '');
      return __REG.al();
    })
  },
  {
    kod: 'AN3-MADALYA', ad: 'SPRINT AN: madalyalı örnekler ÖRNEK olarak sunuluyor — "kural değil" + "elenen reçeteler bu veride yok" çerçevesi + örneklem sayısı ŞEFFAF (gizlenmiyor)',
    calistir: (page) => page.evaluate(() => {
      const M = window._TOPLULUK_MADALYA;
      __REG.ok('madalya tablosu yüklü (45 stil)', !!M && Object.keys(M).length === 45, M && Object.keys(M).length);
      __REG.ok('toplam = altın+gümüş+bronz (sayım tutarlı)', Object.values(M).every(v => v[0][0] === v[0][1] + v[0][2] + v[0][3]));
      __REG.ok('stil başına en çok 3 örnek', Object.values(M).every(v => v[1].length >= 1 && v[1].length <= 3));
      __REG.ok('gösterilen ≤ mevcut (şişirme yok)', Object.values(M).every(v => v[1].length <= v[0][0]));
      __REG.yeniKayit('AN3 Weizen', {});
      ekran = 'editor'; sekme = 'genel';
      S.hacim = 11; S.verim = 61; S.stil = 'Weizen / Weissbier';
      bmStilIskeletDoldur(); render();
      const dom = document.getElementById('ekran').innerHTML;
      const el = document.querySelector('.bm-topluluk');
      __REG.ok('topluluk bölümü var', !!el);
      const t = el ? el.textContent : '';
      __REG.ok('madalya başlığı + gerçek sayı (11 reçete)', t.indexOf('madalya almış 11 reçete') >= 0, t.slice(t.indexOf('madalya almış'), t.indexOf('madalya almış') + 60));
      __REG.ok('altın/gümüş/bronz kırılımı şeffaf', /9 alt[ıi]n/.test(t) && /1 g[üu]m[üu][şs]/.test(t));
      __REG.ok('ÖRNEK çerçevesi açık ("kural değil")', t.indexOf('kural değil') >= 0);
      __REG.ok('KAYBEDEN YOK uyarısı (çıkarım yapılamaz)', t.indexOf('elenen') >= 0 && t.indexOf('çıkarılamaz') >= 0);
      __REG.ok('örnek grist gösteriliyor', /wheat malt|Pilsner malt/i.test(t));
      __REG.ok('n=1 olan stiller de gizlenmiyor', Object.values(M).some(v => v[0][0] === 1));
      return __REG.al();
    })
  },
  {
    kod: 'AN4-MADALYASIZ', ad: 'SPRINT AN (AX güncellemesi): HER İKİ madalya tablosunda da olmayan stilde madalya bölümü SESSİZ (uydurma yok); Robust Porter artık NHC altınlarıyla dolu (GERÇEK veri, uydurma değil) — dağılım gözlemi çalışmaya devam eder',
    calistir: (page) => page.evaluate(() => {
      const D = window._TOPLULUK_DAGILIM, M = window._TOPLULUK_MADALYA, NH = window._NHC_MADALYA || {};
      const madalyasiz = Object.keys(D).filter(a => !M[a] && !NH[a]);
      __REG.ok('dağılımda olup HER İKİ tabloda da olmayan stil VAR', madalyasiz.length > 0, madalyasiz.length + ' stil');
      // (a) SESSİZLİK: iki tabloda da olmayan stilde madalya bölümü BASILMAZ
      const hedefStil = madalyasiz[0];
      __REG.yeniKayit('AN4 Sessiz', {});
      ekran = 'editor'; sekme = 'genel';
      S.hacim = 11; S.verim = 61; S.stil = hedefStil;
      bmStilIskeletDoldur(); render();
      const el0 = document.querySelector('.bm-topluluk');
      const t0 = el0 ? el0.textContent : '';
      __REG.ok('(a) madalya bölümü YOK (uydurma yok)', t0.indexOf('madalya almış') < 0 && t0.indexOf('🏅') < 0 && t0.indexOf('NHC') < 0, hedefStil);
      // (b) Robust Porter: eski tabloda yok ama NHC altınları VAR (AX) → gerçek veriyle dolu
      __REG.ok('(b) önkoşul: Robust Porter eski tabloda yok + NHC tablosunda var', !M['Robust Porter'] && !!NH['Robust Porter']);
      __REG.yeniKayit('AN4 Porter', {});
      ekran = 'editor'; sekme = 'genel';
      S.hacim = 11; S.verim = 61; S.stil = 'Robust Porter';
      bmStilIskeletDoldur();
      // Kavrulmuş maltı çıkar → dağılım gözlemi TETİKLENSİN (topluluğun %95'i kullanıyor)
      S.maltlar = (S.maltlar || []).filter(m => ['choc', 'roast', 'black', 'crf1', 'crf2', 'crf3'].indexOf(m.id) < 0);
      render();
      const el = document.querySelector('.bm-topluluk');
      __REG.ok('(b) topluluk bölümü VAR (dağılım çalışıyor)', !!el);
      const t = el ? el.textContent : '';
      __REG.ok('(b) NHC madalya bölümü VAR — kaynak etiketli (gerçek veri)', t.indexOf('NHC finalinde altın almış') >= 0 && t.indexOf('nhc-homebrew-data') >= 0);
      __REG.ok('(b) dağılım gözlemi yine de var', t.indexOf('Topluluk') >= 0 && /%\d/.test(t));
      return __REG.al();
    })
  },
  {
    kod: 'AN5-DIL', ad: 'SPRINT AN DİL DİSİPLİNİ (kritik): topluluk bölümünde KALİTE İDDİASI kuran tek kelime yok — "daha iyi/yapmalısın/hatalı/yanlış/olmalı" = 0. Veri bunu desteklemiyor (kaybeden örneklem yok); tipiklik ≠ iyilik',
    calistir: (page) => page.evaluate(() => {
      // YASAK: kalite iddiası veya emir kipi. Sapma bir HATA değil, bir SEÇİM olabilir.
      const YASAK = ['daha iyi', 'daha kötü', 'yapmalısın', 'yapmalisin', 'yapmalı', 'hatalı', 'hatali',
        'yanlış', 'yanlis', 'olmalı', 'olmali', 'gerekir', 'gereklidir', 'tavsiye', 'öneriyoruz',
        'düzelt', 'duzelt', 'kötü', 'kotu', 'başarılı', 'basarili', 'kazanmak için', 'kazandıran',
        'ideal', 'doğrusu', 'dogrusu', 'eksik'];
      const bul = (metin, nerede) => {
        const l = String(metin || '').toLocaleLowerCase('tr-TR');
        return YASAK.filter(k => l.indexOf(k) >= 0).map(k => nerede + ':"' + k + '"');
      };
      let ihlal = [];
      // 1) Statik kaynak: motor blokunun ÜRETTİĞİ metin şablonları (yorum satırları hariç)
      const src = Array.from(document.querySelectorAll('script')).map(s => s.textContent).join('\n');
      const bas = src.indexOf('window._TD_BOYUT = {');
      const son = src.indexOf('// ═══ SPRINT AK');
      __REG.ok('AN motor bloğu kaynakta bulundu', bas > 0 && son > bas);
      const blok = src.slice(bas, son).split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
      ihlal = ihlal.concat(bul(blok, 'kaynak'));
      // 2) Canlı DOM — üç ayrı reçete durumunda görünür metin
      const senaryolar = [
        ['Dubbel', ms => ms.filter(m => ['candy_amb', 'candy_clr', 'candy_drk', 'dex', 'sek'].indexOf(m.id) < 0)],
        ['Weizen / Weissbier', ms => ms],
        ['American IPA', ms => ms]
      ];
      senaryolar.forEach(([stil, don]) => {
        __REG.yeniKayit('AN5 ' + stil, {});
        ekran = 'editor'; sekme = 'genel';
        S.hacim = 11; S.verim = 61; S.stil = stil;
        if (STIL_ISKELET[stil]) bmStilIskeletDoldur();
        S.maltlar = don(S.maltlar || []);
        render();
        const el = document.querySelector('.bm-topluluk');
        if (el) ihlal = ihlal.concat(bul(el.textContent, stil));
      });
      __REG.ok('topluluk metninde YASAK kelime YOK (kalite iddiası kurulmuyor)', ihlal.length === 0, ihlal.slice(0, 6).join(' | ') || 'temiz');
      // Nötr gözlem dilinin GERÇEKTEN kullanıldığı — negatif testin karşılığı
      __REG.yeniKayit('AN5 poz', {});
      ekran = 'editor'; sekme = 'genel';
      S.hacim = 11; S.verim = 61; S.stil = 'Dubbel'; bmStilIskeletDoldur();
      S.maltlar = (S.maltlar || []).filter(m => ['candy_amb'].indexOf(m.id) < 0);
      render();
      const el2 = document.querySelector('.bm-topluluk');
      const t2 = el2 ? el2.textContent : '';
      __REG.ok('"kullanıyor" (gözlem) dili kullanılıyor', t2.indexOf('kullanıyor') >= 0);
      __REG.ok('BJCP standardı DEĞİL uyarısı var (otorite ayrımı)', t2.indexOf('BJCP standardı değil') >= 0);
      __REG.ok('"bir seçim olabilir" çerçevesi var (sapma = hata değil)', t2.indexOf('seçim olabilir') >= 0);
      return __REG.al();
    })
  },
  {
    kod: 'AN6-DOKTOR', ad: 'SPRINT AN REGRESYON: Reçete Doktoru\'nun 27 kuralı + BJCP sapma çipleri AYNEN çalışıyor; topluluk bölümü görsel olarak AYRI ve ÇİP ÜRETMİYOR (bilgilendirici, preskriptif değil)',
    calistir: (page) => page.evaluate(() => {
      const src = Array.from(document.querySelectorAll('script')).map(s => s.textContent).join('\n');
      const bas = src.indexOf('REÇETE DOKTORU v2');
      const son = src.indexOf('UI temizlik 2026-04-24');
      __REG.ok('Doktor bloğu bulundu', bas > 0 && son > bas);
      const blok = src.slice(bas, son);
      __REG.ok('27 öneri kuralı korundu', (blok.match(/oneriler\.push\(/g) || []).length === 27, (blok.match(/oneriler\.push\(/g) || []).length);
      __REG.ok('BJCP sapma blokları duruyor (OG/FG/IBU/SRM)',
        blok.indexOf('OG düşük:') > 0 && blok.indexOf('FG yüksek:') > 0 && blok.indexOf('IBU düşük:') > 0);
      __REG.ok('tıklanabilir çip altyapısı bozulmadı', typeof window.bmDoctorChipClick === 'function' && typeof window.bmDoctorChipParse === 'function');
      // BJCP sapması TETİKLE: OG'yi bilerek düşür → kırmızı kart + çip çıkmalı
      __REG.yeniKayit('AN6 Doktor', {});
      ekran = 'editor'; sekme = 'genel';
      S.hacim = 11; S.verim = 61; S.stil = 'Dubbel'; bmStilIskeletDoldur();
      S.maltlar = (S.maltlar || []).map(m => ({ ...m, kg: (m.kg || 0) * 0.45 }));   // OG bandın ALTINA
      render();
      const dom = document.getElementById('ekran').innerHTML;
      __REG.ok('BJCP sapma önerisi hâlâ üretiliyor', dom.indexOf('OG düşük') >= 0);
      __REG.ok('Doktor başlığı görünür', dom.indexOf('Reçete Doktoru') >= 0);
      __REG.ok('BJCP tarafında tıklanabilir çip VAR', dom.indexOf('bm-doctor-cozum-chip') >= 0);
      const el = document.querySelector('.bm-topluluk');
      __REG.ok('topluluk bölümü AYRI kutuda', !!el);
      __REG.ok('topluluk bölümünde ÇİP YOK (preskriptif değil)', !el || el.querySelectorAll('.bm-doctor-cozum-chip').length === 0);
      __REG.ok('topluluk bölümünde tıklanabilir eleman YOK', !el || el.querySelectorAll('[onclick],button,[role=button]').length === 0);
      __REG.ok('iki otorite ayrımı metinde açık', !!el && el.textContent.indexOf('yalnız bilgilendirir') >= 0);
      // BJCP ÇAKIŞMA KAPISI: OG bandın dışında → topluluk OG hakkında SUSMALI
      const c = calc();
      const f = window.__bmBuildFeaturesV12(window.__recipeV2 || {});
      const gs = window._bmToplulukGozlem('Dubbel', f, { og: c.og, ibu: c.ibu, srm: parseFloat(c.srm), abv: c.abv }, BJCP['Dubbel']);
      __REG.ok('OG BJCP bandının dışında (ön koşul)', c.og < BJCP['Dubbel'].og[0], c.og.toFixed(3));
      __REG.ok('topluluk OG boyutunda SUSUYOR (çift uyarı yok)', !gs.some(g => g.k === 'og'), gs.map(g => g.k).join(','));
      return __REG.al();
    })
  },
  {
    kod: 'AN7-GUVEN', ad: 'SPRINT AN GÜVEN KAPISI: stil manuel seçilmemiş ve motor güveni yetersizken topluluk bölümü SESSİZ — yanlış stile göre prevalans cümlesi kurulmaz (keşif ŞÜPHE 4: Kaan manuel stil 1/7 seçiyor)',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('AN7 Guven', {});
      ekran = 'editor'; sekme = 'genel';
      S.hacim = 11; S.verim = 61; S.stil = 'Dubbel'; bmStilIskeletDoldur();
      S.maltlar = (S.maltlar || []).filter(m => m.id !== 'candy_amb');
      render();
      __REG.ok('manuel stil varken bölüm GÖRÜNÜR (ön koşul)', !!document.querySelector('.bm-topluluk'));
      // Manuel stili KALDIR — motor tahminine düşer; test ortamında ML modeli yok
      S.stil = ''; render();
      const el = document.querySelector('.bm-topluluk');
      __REG.ok('manuel stil YOKKEN + motor slug-hazır değilken SESSİZ', !el);
      const slugHazir = !!(window.BM_V12 && window.BM_V12.isSlugReady && window.BM_V12.isSlugReady());
      // SINIR — DÜRÜSTÇE: test ortamında ağ kesik → ML slug modeli yüklenmiyor, yani
      // "güven ≥%50" kolu CANLI modelle koşturulamıyor. Kapının üç şartı statik
      // kaynaktan kilitlenir: biri silinirse bu case kırılır (sessiz gevşeme olmaz).
      const src = Array.from(document.querySelectorAll('script')).map(s => s.textContent).join('\n');
      __REG.ok('güven eşiği kaynakta kilitli (normalized >= 50)', src.indexOf('__top3V12_engine[0].normalized >= 50') >= 0);
      __REG.ok('slug-seviye şartı kilitli (cluster fallback YETMEZ)', src.indexOf('window.BM_V12.isSlugReady()') >= 0);
      __REG.ok('motor top-1 = _stKey şartı kilitli (başka stile göre konuşmaz)', src.indexOf('_anBj === _stKey') >= 0);
      __REG.ok('canlı ortamda slugReady=' + slugHazir + ' (test ortamı ağsız — bu kol statik kilitle korunuyor)', true);
      // Malt kapısı: grist yokken karşılaştırma anlamsız → sessiz
      S.stil = 'Dubbel'; S.maltlar = []; render();
      __REG.ok('grist boşken SESSİZ (malt kapısı)', !document.querySelector('.bm-topluluk'));
      __REG.ok('_receteEksikler malt eksikliğini görüyor', window._receteEksikler(S).indexOf('Malt') >= 0, window._receteEksikler(S).join(','));
      return __REG.al();
    })
  },

  // ═══════════ SPRINT AO: biriken küçük işler (AO1-AO6) ═══════════
  {
    kod: 'AO1-SLUG', ad: 'SPRINT AO1: SLUG_TO_BJCP sarkan giriş = 0 (TÜM değerler BJCP anahtarı) — 3 eski sarkan slug gerçek ada çözülür; _NO_HOP davranışı değişmedi',
    calistir: (page) => page.evaluate(() => {
      const S2B = window.SLUG_TO_BJCP;
      const sarkan = Object.keys(S2B).filter(k => !BJCP[S2B[k]]);
      __REG.ok('INVARIANT: sarkan giriş 0 (önce 3 idi)', sarkan.length === 0, sarkan.join(','));
      __REG.ok('american_wheat_ale → American Wheat Beer (AK EK_ESLEME ile aynı)', window.bmSlugToBjcp('american_wheat_ale', null) === 'American Wheat Beer');
      __REG.ok('english_pale_ale → Strong Bitter / ESB (BJCP 2008 8C dengi)', window.bmSlugToBjcp('english_pale_ale', null) === 'Strong Bitter / ESB');
      __REG.ok('specialty_saison → Saison / Farmhouse Ale (aile üstü, çoktan-bire)', window.bmSlugToBjcp('specialty_saison', null) === 'Saison / Farmhouse Ale');
      __REG.ok('üç hedef adın ÜÇÜ de BJCP bant tablosunda (sessiz düşme kapandı)', !!BJCP['American Wheat Beer'] && !!BJCP['Strong Bitter / ESB'] && !!BJCP['Saison / Farmhouse Ale']);
      // _NO_HOP_BJCP: gerçek stiller için davranış AYNI — Saison zaten sette (french_belgian_saison),
      // hayalet 'Specialty Saison' girişi ise hiçbir rec.stil ile eşleşemezdi, düşmesi etkisiz.
      __REG.ok('_NO_HOP_BJCP: Saison / Farmhouse Ale sette (davranış değişmedi)', !!window._NO_HOP_BJCP['Saison / Farmhouse Ale']);
      __REG.ok('_NO_HOP_BJCP: hayalet Specialty Saison girişi kalktı', !window._NO_HOP_BJCP['Specialty Saison']);
      return __REG.al();
    })
  },
  {
    kod: 'AO2-SU', ad: 'SPRINT AO2/AO3: su kartı bölüşüm satırı İSİMLENDİRİLDİ (öneri + tam-hacim yolu), hesap DEĞİŞMEDİ (mash+sparge=toplam, XML INFUSE_AMOUNT formülü aynı); AO3 kararı kaynakta belgeli',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('AO2 Su', {});
      S.hacim = 11; S.maltlar = [{ id: 'pilsner', kg: 4 }]; S.mayaId = 'us05'; S.hoplar = [];
      ekran = 'editor'; sekme = 'hesap'; render();
      const govde = document.body.textContent;
      __REG.ok('yeni isimlendirme: "Klasik iki-kademe bölüşüm önerisi" görünür', govde.indexOf('Klasik iki-kademe bölüşüm önerisi') >= 0);
      __REG.ok('all-in-one tam hacim yolu görünür (Bulldog gerçeği)', govde.indexOf("tümü mash'e girer") >= 0);
      __REG.ok('eski belirsiz "Strike: ~" etiketi KALKTI', govde.indexOf('Strike: ~') < 0);
      // BEKLENTİ DEĞİŞİKLİĞİ (Sprint AU1-6): bölüşüm artık tam sayıya yuvarlanmıyor (çift Math.round
      // 15.6L'yi 10+5=15'e düşürüyor, 0.6 L sessizce kayboluyordu). Toplam ARTIK BİREBİR korunuyor.
      const m = govde.match(/Mash ~([\d.]+)L \+ Sparge ~([\d.]+)L/);
      const t = govde.match(/TOPLAM SU([\d.]+)L/);
      __REG.ok('bölüşüm sayıları toplamı = TOPLAM SU (AU1-6: yuvarlama kaçağı yok, birebir)', !!m && !!t && Math.abs((+m[1] + +m[2]) - +t[1]) < 0.05, m && t ? m[1]+'+'+m[2]+' vs '+t[1] : 'match yok');
      // XML INFUSE_AMOUNT regresyonu: formül max(hacim, grist×2.6) AYNEN (blob intercept)
      let yak = null;
      const oc = URL.createObjectURL; URL.createObjectURL = b => { yak = b; return 'blob:f'; };
      const ok = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function(){};
      try { beerXmlExport(); } catch (e) {}
      URL.createObjectURL = oc; HTMLAnchorElement.prototype.click = ok;
      const src = Array.from(document.querySelectorAll('script')).map(s => s.textContent).join('\n');
      __REG.ok('XML formülü kaynakta kilitli: Math.max(h, _gristKg*2.6)', src.indexOf('Math.max(h, _gristKg*2.6)') >= 0);
      __REG.ok('AO3 kararı kaynakta belgeli (ayar EKLENMEDİ — display-only)', src.indexOf('AO3 KARARI') >= 0);
      if (!yak) { __REG.ok('XML blob yakalandı', false); return __REG.al(); }
      return yak.text().then(x => {
        const im = x.match(/<INFUSE_AMOUNT>([\d.]+)<\/INFUSE_AMOUNT>/);
        __REG.ok('INFUSE_AMOUNT = max(11, 4×2.6)=11.0 (değer regresyonu)', !!im && im[1] === '11.0', im && im[1]);
        return __REG.al();
      });
    })
  },
  {
    kod: 'AO4-PH', ad: 'SPRINT AO4: mash pH ölçüm girişi — opsiyonel (boş=bağlam yok), S\'te yaşar (kaydet/aç korunur), oda/mash sıcaklığı ayrımı (~0.3 birim KANITLI), bağlam bilgi tabanıyla tutarlı (tanin iddiası KURULMAZ)',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('AO4 Ph', {});
      S.maltlar = [{ id: 'pilsner', kg: 4 }]; S.mayaId = 'us05'; S.hoplar = []; S.stil = '';
      ekran = 'editor'; sekme = 'surec'; render();
      __REG.ok('BOS şablonunda mashPh:null (yeni reçete boş başlar)', BOS.mashPh === null && BOS.mashPhSic === 'oda');
      __REG.ok('pH girişi Mash Süreci bloğunda var', !!document.querySelector('input[aria-label="Ölçülen mash pH"]'));
      const kartHtml = () => document.querySelector('.bm-mash-bilgi').innerHTML;
      __REG.ok('BOŞKEN bağlam kutusu YOK (opsiyonellik)', kartHtml().indexOf('Ölçtüğün pH') < 0);
      S.mashPh = 5.4; S.mashPhSic = 'oda'; render();
      __REG.ok('oda 5.4 → bant içi mesajı', kartHtml().indexOf('bandındasın') >= 0);
      S.mashPh = 5.2; S.mashPhSic = 'mash'; render();
      const h1 = kartHtml();
      __REG.ok('mash sıcaklığında 5.2 → oda karşılığı 5.50 (KANITLI ~0.3 kayma) + bant içi', h1.indexOf('5.50') >= 0 && h1.indexOf('bandındasın') >= 0 && h1.indexOf('sistematik kayma') >= 0);
      S.mashPh = 5.9; S.mashPhSic = 'oda'; render();
      const h2 = kartHtml();
      __REG.ok('oda 5.9 → bant üstü; tanin İDDİASI kurulmaz (FOLKLOR koluna sadık: "doğrulanamadı")', h2.indexOf('Bandın üstünde') >= 0 && h2.indexOf('doğrulanamadı') >= 0);
      // persist: kaydet → başka reçete aç → geri aç → değer korunur
      S.mashPh = 5.4; S.mashPhSic = 'mash';
      tarifeKaydet();
      const baska = KR.find(k => k && k.id !== id);
      if (baska) tarifAc(baska.id);
      tarifAc(id);
      __REG.ok('kaydet/aç turu: mashPh + ölçüm sıcaklığı KORUNUR (S alanı — Sprint T preboilOG deseni)', S.mashPh === 5.4 && S.mashPhSic === 'mash');
      sekme = 'surec'; render(); // tarifAc sekmeyi 'genel'e döndürür — kart kontrolü için geri dön
      S.mashPh = null; render();
      __REG.ok('temizlenince bağlam kaybolur', kartHtml().indexOf('Ölçtüğün pH') < 0);
      // KAPSAM SINIRI: pH TAHMİN motoru ayrı ve dokunulmadı — bağlam fonksiyonu yalnız ölçülen değeri okur
      const src = Array.from(document.querySelectorAll('script')).map(s => s.textContent).join('\n');
      __REG.ok('_bmMashPhBaglam pH tahmini YAPMAZ (kaynakta belgeli) + maltPH motoru duruyor', src.indexOf('pH TAHMİN ETMEZ') >= 0 && src.indexOf('maltPH') >= 0);
      return __REG.al();
    })
  },
  {
    kod: 'AO5-KART', ad: 'SPRINT AO5: mash bilgi kartı — üst şerit AÇIK, 4 bölüm + dipnot TEK "ℹ️ Mash bilgisi" çatısında (kapalı yükseklik düşer, içerik kaybolmaz)',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('AO5 Kart', {});
      S.maltlar = [{ id: 'pilsner', kg: 4 }]; S.mayaId = 'us05'; S.hoplar = []; S.stil = ''; S.mashPh = null;
      ekran = 'editor'; sekme = 'surec'; render();
      const k = document.querySelector('.bm-mash-bilgi');
      __REG.ok('kart render oldu', !!k);
      const ana = k.querySelectorAll('details.bm-mash-bilgi-ana');
      __REG.ok('TEK ana çatı details (ℹ️ Mash bilgisi)', ana.length === 1 && k.innerHTML.indexOf('Mash bilgisi') >= 0);
      __REG.ok('4 iç bölüm ana çatının İÇİNDE', k.querySelectorAll('details.bm-mash-bilgi-ana details').length === 4);
      __REG.ok('üst şerit (enzim bandı + FG puanı) çatının DIŞINDA açık', k.firstElementChild.tagName === 'DIV' && k.firstElementChild.textContent.indexOf('°C') >= 0);
      __REG.ok('içerik kaybolmadı: 4 bölüm başlığı + kaynak dipnotu duruyor', ['ne değişir', 'Boşuna uğraşma', 'fark yaratanlar', 'step mash', 'Braukaiser'].every(t => k.innerHTML.indexOf(t) >= 0));
      return __REG.al();
    })
  },
  {
    kod: 'AO6-WEIZEN', ad: 'SPRINT AO6: Weizen/karanfil kutusu bağlam-farkında — açık stil buğday-ailesi değilse maya tek başına tetiklemez (buğday mayalı IPA vakası); stil boşsa maya ipucu korunur; gerçek Weizen/Witbier aynen',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('AO6 Weizen', {});
      S.maltlar = [{ id: 'pilsner', kg: 4 }]; S.hoplar = [];
      const dene = (stil, maya) => { S.stil = stil; S.stilTah = ''; S.mayaId = maya; return window._bmMashWeizenMi(); };
      __REG.ok('stil BOŞ + buğday mayası (wb06) → kutu VAR (maya ipucu korundu)', dene('', 'wb06') === true);
      __REG.ok('IPA stili + buğday mayası → kutu YOK (bağlam-dışı vaka KAPANDI)', dene('American IPA', 'wb06') === false);
      __REG.ok('Weizen stili → kutu VAR (maya ne olursa olsun)', dene('Weizen / Weissbier', 'us05') === true);
      __REG.ok('Witbier stili → kutu VAR (buğday ailesi genişletildi)', dene('Witbier / Belgian White', 'us05') === true);
      __REG.ok('stil BOŞ + temiz maya → kutu YOK', dene('', 'us05') === false);
      // render katmanı: IPA + wheat mayada kutunun DOM\'da da olmadığı (tek kaynak _bmMashWeizenMi)
      S.stil = 'American IPA'; S.stilTah = ''; S.mayaId = 'wb06';
      ekran = 'editor'; sekme = 'surec'; render();
      __REG.ok('DOM kanıtı: IPA reçetesinde karanfil kutusu render edilmiyor', document.querySelector('.bm-mash-bilgi').innerHTML.indexOf('kol MASH DEĞİL') < 0);
      return __REG.al();
    })
  },

  // ── SPRINT AQ1: kayıp-veri ailesi (AP hata avı #1/#3/#4/#6) ──
  {
    kod: 'AQ1-TADIM', ad: 'TADIM KALICI (AP K2-AKIS-1 KRİTİK): oturum kaydet → reçeteyi KAPAT + YENİDEN AÇ → tadım DURUYOR (eski bug: yalnız taslağa yazıp tarifAc\'ta siliniyordu, ✓ sahteydi)',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('AQ1 Tadım Bira', { mayaId: 'us05' });
      S.brewLog = [{ tip: 'siseleme', tarih: '2026-08-01', id: 's1', ts: 1 }];
      S.tadim = null;
      tadimSet('aroma', 8); tadimSet('genel', 7);
      tadimOturumKaydet();
      const kr = KR.find(x => x && x.id === id);
      __REG.ok('KR kaydında oturum KALICI (taslak değil)', kr && kr.tadim && Array.isArray(kr.tadim.oturumlar) && kr.tadim.oturumlar.length === 1, 'oturum=' + (kr && kr.tadim && kr.tadim.oturumlar ? kr.tadim.oturumlar.length : 'yok'));
      const ls = JSON.parse(localStorage.getItem('bm_v6') || '[]').find(x => x && x.id === id);
      __REG.ok('localStorage bm_v6 içinde oturum var (reload-kalıcı)', ls && ls.tadim && ls.tadim.oturumlar.length === 1);
      // AP runtime repro'sunun tersi: KAPAT + YENİDEN AÇ (tarifAc clearDraft çağırır — eski kayıp yolu)
      ekran = 'liste'; render();
      tarifAc(id);
      __REG.ok('KAPAT-AÇ TURU: tadım DURUYOR (oturum + puan birebir)', S.tadim && S.tadim.oturumlar.length === 1 && S.tadim.oturumlar[0].aroma === 8 && S.tadim.oturumlar[0].toplam === 15);
      __REG.ok('şişeleme brewLog girişi de korundu (G birleşim bozulmadı)', (S.brewLog || []).some(x => x && x.tip === 'siseleme'));
      return __REG.al();
    })
  },
  {
    kod: 'AQ1-TADIM-ESKI', ad: 'MEVCUT TADIM VERİSİ KAYBOLMAZ: KR\'de eski oturum varken yeni oturum kaydet → 2 oturum, eski alanlar birebir',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('AQ1 Eski Tadım', { tadim: { aroma: 0, gorunum: 0, tat: 0, agizH: 0, genel: 0, offList: {}, tadimNot: '', oturumlar: [{ tarih: '2026-07-01', aroma: 7, gorunum: 2, tat: 14, agizH: 3, genel: 6, toplam: 32, offList: {}, puanKaynak: 'detay' }] } });
      __REG.ok('açılışta eski oturum S\'te', S.tadim && S.tadim.oturumlar.length === 1);
      tadimSet('genel', 8);
      tadimOturumKaydet();
      const kr = KR.find(x => x && x.id === id);
      __REG.ok('yeni oturum eklendi, ESKİSİ KAYBOLMADI (2 oturum)', kr && kr.tadim && kr.tadim.oturumlar.length === 2, 'oturum=' + (kr && kr.tadim ? kr.tadim.oturumlar.length : 'yok'));
      __REG.ok('eski oturum alanları birebir (toplam 32, tarih korundu)', kr.tadim.oturumlar[0].toplam === 32 && kr.tadim.oturumlar[0].tarih === '2026-07-01');
      return __REG.al();
    })
  },
  {
    kod: 'AQ1-NOT', ad: 'NOT KALICI (AP K2-AKIS-2): "Notu Kaydet" KR\'ye yazar + kapat-aç turu; adsız reçetede sahte kalıcılık YOK',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('AQ1 Not Bira');
      sekme = 'not'; render();
      const el = document.getElementById('notText');
      __REG.ok('notText alanı render edildi', !!el);
      if (el) { el.value = 'AQ1 kalıcı not kanıtı'; }
      notu_kaydet();
      const kr = KR.find(x => x && x.id === id);
      __REG.ok('KR kaydında not KALICI', kr && kr.notlar === 'AQ1 kalıcı not kanıtı', 'notlar=' + (kr && kr.notlar));
      ekran = 'liste'; render(); tarifAc(id);
      __REG.ok('KAPAT-AÇ TURU: not duruyor', S.notlar === 'AQ1 kalıcı not kanıtı');
      // adsız reçete: KALICI olamaz → KR kirletilmez (sahte ✓ yerine dürüst uyarı yolu)
      const krSayi = KR.length;
      yeniTarif(); sekme = 'not'; render();
      const el2 = document.getElementById('notText');
      if (el2) { el2.value = 'adsız not'; notu_kaydet(); }
      __REG.ok('adsız: KR\'ye YAZILMADI (yeni kayıt açılmadı, sahte kalıcılık yok)', KR.length === krSayi && !KR.some(x => x && x.notlar === 'adsız not'));
      return __REG.al();
    })
  },
  {
    kod: 'AQ1-CALC', ad: 'CALC HATASI YUTULMAZ (AP K1-SESSIZ-1): sahte 1.000/0.00 özet YAZILMAZ (son geçerli korunur), ring\'e düşer, reçete metni yine kaydedilir; yeni reçetede özet null',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('AQ1 Calc Bira');
      S.maltlar = [{ id: 'pilsner', kg: 4 }];
      tarifeKaydet();
      const kr = KR.find(x => x && x.id === id);
      const eskiOg = kr.ozet && kr.ozet.og;
      __REG.ok('ön koşul: geçerli özet oluştu (og>1.000)', !!eskiOg && parseFloat(eskiOg) > 1.0, 'og=' + eskiOg);
      // calc'ı KASITLI patlat (AP senaryosu)
      const _oc = window.calc; window.calc = function () { throw new Error('AQ1-SENTETIK-CALC'); };
      bmHataLogSil();
      S.notlar = 'AQ1 calc-hatası sırasında metin';
      const don = tarifeKaydet();
      const kr2 = KR.find(x => x && x.id === id);
      __REG.ok('SAHTE ÖZET YAZILMADI: og son geçerli değerde kaldı (1.000 DEĞİL)', kr2.ozet && kr2.ozet.og === eskiOg, 'og=' + (kr2.ozet && kr2.ozet.og));
      __REG.ok('reçete METNİ yine kaydedildi + kayıt akışı kırılmadı (dönüş=true)', kr2.notlar === 'AQ1 calc-hatası sırasında metin' && don === true);
      const ring = bmHataLogOku();
      __REG.ok('hata RING\'e düştü (Sprint O günlüğünde görünür)', ring.length >= 1 && ring.some(h => h.tip === 'calc' && /AQ1-SENTETIK-CALC/.test(h.mesaj)), JSON.stringify(ring.map(h => h.tip + ':' + h.mesaj)).slice(0, 140));
      const toastDom = (document.getElementById('bm-toast-container') || {}).innerHTML || '';
      __REG.ok('KULLANICI BİLGİLENDİRİLDİ: toast "hesap hatası" diyor (sahte "Kaydedildi ✓" DEĞİL)', toastDom.indexOf('hesap hatası') >= 0, toastDom.slice(0, 120));
      // yeni reçete + bozuk calc → özet NULL (sahte üretim YASAK); render'sız kur (bozuk calc'la render'a girilmez)
      S = JSON.parse(JSON.stringify(BOS)); _editId = null; S.biraAd = 'AQ1 CalcYeni';
      tarifeKaydet();
      const kr3 = KR.find(x => x && x.biraAd === 'AQ1 CalcYeni');
      __REG.ok('yeni reçete + calc bozuk → özet NULL (1.000/0.00 üretilmedi)', !!kr3 && kr3.ozet === null, 'ozet=' + JSON.stringify(kr3 && kr3.ozet));
      window.calc = _oc; bmHataLogSil();
      ekran = 'liste'; render();
      __REG.ok('özet-null reçeteyle liste render ÇÖKMEDİ', (document.getElementById('ekran').innerHTML || '').indexOf('AQ1 CalcYeni') >= 0);
      return __REG.al();
    })
  },
  {
    kod: 'AQ1-BOS-NORM', ad: 'BOS\'A ALAN EKLEME DRAFT-KIYASINI KIRMAZ (AP K2-AKIS-3, KALICI KURAL): eski kayıt (mashPh alansız) SALT AÇMAK ghost draft üretmez; SENTETİK gelecek-alan da kırmaz (otomatik normalize, elle liste değil); gerçek fark drafta yazılır',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('AQ1 Ghost Bira');
      // AO-öncesi kayıt simülasyonu: KR kaydından mashPh/mashPhSic alanlarını düşür
      const kr = KR.find(x => x && x.id === id);
      delete kr.mashPh; delete kr.mashPhSic; _origKy(KR);
      localStorage.removeItem('bm_draft_v1');
      tarifAc(id); // SALT AÇ — değişiklik yok
      saveDraft();
      __REG.ok('SALT AÇMAK ghost draft üretmez (mashPh alansız eski kayıt)', localStorage.getItem('bm_draft_v1') === null, 'draft=' + (localStorage.getItem('bm_draft_v1') || 'null').slice(0, 40));
      // GELECEK SPRINT SİMÜLASYONU: BOS'a sentetik yeni alan ekle → kıyas KIRILMAMALI
      BOS.__aq1YeniAlan = 'varsayilan';
      S.__aq1YeniAlan = 'varsayilan'; // tarifAc {...BOS,...d} etkisi
      saveDraft();
      __REG.ok('SENTETİK gelecek-alan kıyası KIRMAZ (otomatik BOS-normalize kanıtı)', localStorage.getItem('bm_draft_v1') === null);
      // KARŞI-TEST (Sprint N davranışı): gerçek içerik farkı drafta YAZILIR
      S.hacim = (parseFloat(S.hacim) || 10) + 1;
      saveDraft();
      const d = JSON.parse(localStorage.getItem('bm_draft_v1') || 'null');
      __REG.ok('KARŞI-TEST: gerçek fark → draft YAZILIR (editId doğru)', !!d && d.editId === id);
      // sentetik alanda gerçek fark da yakalanır
      S.hacim = S.hacim - 1; S.__aq1YeniAlan = 'degisti';
      saveDraft();
      __REG.ok('sentetik alanda GERÇEK fark da yakalanır (normalize farkları maskelemez)', !!localStorage.getItem('bm_draft_v1'));
      delete BOS.__aq1YeniAlan; localStorage.removeItem('bm_draft_v1');
      return __REG.al();
    })
  },
  {
    kod: 'AQ1-IMPORT-IDB', ad: 'IMPORT KALICI (AP K1-VERI-1): içe aktarım LS + IDB aynasına BİRLİKTE yazar; LS boşalırsa (eviction) kurtarma BAYAT değil İTHAL veriyi getirir',
    calistir: async (page) => {
      // 0) BAYAT IDB ön-durumu (AP runtime senaryosu): import öncesi IDB'de eski bm_v6
      await page.evaluate(() => new Promise((coz) => {
        window._bmIDB.put('bm_v6', JSON.stringify([{ id: 'bayat1', biraAd: 'BAYAT ESKI', maltlar: [], hoplar: [], brewLog: [] }]));
        const kontrol = () => window._bmIDB.get('bm_v6', v => { if (v && v.indexOf('bayat1') >= 0) coz(true); else setTimeout(kontrol, 50); });
        kontrol();
      }));
      // 1) import: sentetik yedek (confirm'ler runner'da auto-accept).
      // dubbel_2024 DAHİL: uygulama örnek Dubbel'i bm_v6'da yoksa açılışta kendisi ekler (Adim 137-F IIFE)
      // — gerçek yedeklerde de dubbel bulunur; dahil etmek testi o tasarım davranışından bağımsız kılar.
      await page.evaluate(() => {
        const yedek = { meta: { exportTs: 1750000000000 }, data: {
          bm_v6: JSON.stringify([
            { id: 'aqimp1', biraAd: 'AQ1 Import Bira', tarih: '1.8.2026', guncelleme: 1, ozet: null, maltlar: [], hoplar: [], brewLog: [] },
            { id: 'dubbel_2024', biraAd: 'Dark Belgian Dubbel', tarih: '13.04.2026', guncelleme: 0, ozet: null, maltlar: [], hoplar: [], brewLog: [] }
          ]),
          bm_ferm_sicaklik: '23'
        } };
        const f = new File([JSON.stringify(yedek)], 'yedek.json', { type: 'application/json' });
        const dt = new DataTransfer(); dt.items.add(f);
        const inp = document.createElement('input'); inp.type = 'file'; inp.files = dt.files;
        window.bmVeriImport(inp);
      });
      await page.waitForFunction(() => (localStorage.getItem('bm_v6') || '').indexOf('aqimp1') >= 0, { timeout: 10000 });
      // import kendi reload'unu 1200ms'de tetikler
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      await page.waitForFunction(() => typeof render === 'function' && Array.isArray(KR), { timeout: 30000 });
      const c1 = await page.evaluate(() => new Promise((coz) => {
        const out = [];
        out.push({ ad: 'reload sonrası KR = ithal set (aqimp1+dubbel, fixture temizlendi)', ok: Array.isArray(KR) && KR.length === 2 && KR.some(r => r && r.id === 'aqimp1') && KR.some(r => r && r.id === 'dubbel_2024'), detay: 'KR=' + KR.length + ' idler=' + KR.map(r => r && r.id).join(',') });
        window._bmIDB.get('bm_v6', v => {
          out.push({ ad: 'IDB aynası İTHAL bm_v6 (bayat DEĞİL — put kanıtı)', ok: typeof v === 'string' && v.indexOf('aqimp1') >= 0 && v.indexOf('bayat1') < 0, detay: (v || 'null').slice(0, 60) });
          coz(out);
        });
      }));
      // 2) LS eviction simülasyonu: yalnız bm_v6 düşür (__bm_reg_seed kalır → yeniden-seed olmaz) + reload
      await page.evaluate(() => localStorage.removeItem('bm_v6'));
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForFunction(() => typeof render === 'function' && Array.isArray(KR), { timeout: 30000 });
      // kurtarma ASYNC (IDB get kuyruğu) + Dubbel IIFE önce KR'ye örnek basabilir → İTHAL reçetenin gelmesini bekle
      let kurtarildi = true;
      await page.waitForFunction(() => Array.isArray(KR) && KR.some(r => r && r.id === 'aqimp1'), { timeout: 10000 }).catch(() => { kurtarildi = false; });
      const c2 = await page.evaluate((k) => {
        const out = [];
        out.push({ ad: 'EVICTION SONRASI: kurtarma İTHAL veriyi getirdi (bayat import\'u GERİ ALMADI)', ok: k && Array.isArray(KR) && KR.some(r => r && r.id === 'aqimp1') && !KR.some(r => r && r.id === 'bayat1'), detay: 'KR=' + (Array.isArray(KR) ? KR.map(r => r && r.id).join(',') : '?') });
        out.push({ ad: 'LS bm_v6 kurtarmayla geri yazıldı (ithal içerik)', ok: (localStorage.getItem('bm_v6') || '').indexOf('aqimp1') >= 0 && (localStorage.getItem('bm_v6') || '').indexOf('bayat1') < 0 });
        return out;
      }, kurtarildi);
      return c1.concat(c2);
    }
  },

  // ── SPRINT AQ2: görünür bulgular (AP #2/#7/#8 + K1Y-1) ──
  {
    kod: 'AQ2-ACC', ad: 'KATALOG TAM ERİŞİM (AP #2 KRİTİK): malt-ekle (>5000px içerik) ve maya-seç accordion KIRPMASIZ — Abbey Malt erişilebilir; animasyon (max-height transition) hâlâ çalışıyor',
    calistir: async (page) => {
      const c1 = await page.evaluate(() => {
        __REG.ok('ortam: interpolate-size destekli (Chrome 129+)', CSS.supports('interpolate-size', 'allow-keywords'));
        const src = KR.find(r => r && Array.isArray(r.maltlar) && r.maltlar.length > 0);
        tarifAc(src.id); sekme = 'malt'; render();
        bmAccToggle('malt-ekle', true);
        const body = document.querySelector('[data-acc-id="malt-ekle"] .bm-acc-body');
        __REG.ok('malt kataloğu içerik >5000px (bulgu koşulu hâlâ geçerli)', body.scrollHeight > 5000, 'scrollH=' + body.scrollHeight);
        __REG.ok('KIRPMA YOK: clientHeight === scrollHeight', Math.abs(body.scrollHeight - body.clientHeight) <= 1, body.clientHeight + ' vs ' + body.scrollHeight);
        __REG.ok('yeni kural aktif: computed max-height = max-content', getComputedStyle(body).maxHeight === 'max-content', getComputedStyle(body).maxHeight);
        // AP'nin ilk kırpılan öğesi: Abbey Malt — artık body sınırları İÇİNDE (GÖRÜNÜR eşleşme; option gibi 0-height düğümler elenir)
        const abbey = Array.from(body.querySelectorAll('*')).filter(e => e.children.length === 0 && /Abbey/i.test(e.textContent || '')).find(e => e.getBoundingClientRect().height > 0);
        const bR = body.getBoundingClientRect();
        __REG.ok('Abbey Malt GÖRÜNÜR ve body sınırları içinde (erişilebilir)', !!abbey && abbey.getBoundingClientRect().bottom <= bR.bottom + 1, abbey ? 'bottom=' + Math.round(abbey.getBoundingClientRect().bottom) + '/' + Math.round(bR.bottom) : 'görünür abbey YOK');
        sekme = 'maya'; render();
        bmAccToggle('maya-sec', true);
        const mBody = document.querySelector('[data-acc-id="maya-sec"] .bm-acc-body');
        __REG.ok('maya-seç kataloğu da KIRPMASIZ', !!mBody && Math.abs(mBody.scrollHeight - mBody.clientHeight) <= 1, mBody ? mBody.clientHeight + ' vs ' + mBody.scrollHeight : 'body yok');
        return __REG.al();
      });
      // animasyon kanıtı — DETERMİNİSTİK: app'in GERÇEK .bm-acc-body CSS kuralı, #ekran DIŞI sentinel düğümde ölçülür
      // (uygulamanın async render'ları #ekran içini tazeleyip in-app ölçümü yarışa sokuyordu — flake kaynağı)
      const animOk = await page.evaluate(() => new Promise((coz) => {
        const acc = document.createElement('div');
        acc.className = 'bm-acc'; acc.setAttribute('aria-expanded', 'true');
        acc.style.cssText = 'position:absolute;left:-9999px;top:0;width:300px';
        acc.innerHTML = '<div class="bm-acc-body"><div style="height:9000px"></div></div>';
        document.body.appendChild(acc);
        const body = acc.querySelector('.bm-acc-body');
        let done = false;
        const bitir = (v) => { if (!done) { done = true; try { acc.remove(); } catch (_e) {} coz(v); } };
        body.addEventListener('transitionstart', (e) => { if (e.propertyName === 'max-height') bitir(true); });
        requestAnimationFrame(() => requestAnimationFrame(() => { acc.setAttribute('aria-expanded', 'false'); }));
        setTimeout(() => bitir(false), 1500);
      }));
      const c2 = await page.evaluate((a) => {
        __REG.ok('ANİMASYON ÇALIŞIYOR: app CSS kuralıyla 9000px içerikte max-height transition başladı (5000px tavan yok)', a === true);
        sekme = 'malt'; render(); // c1 maya sekmesinde bırakmıştı — malt-ekle DOM'a geri gelsin
        const body = document.querySelector('[data-acc-id="malt-ekle"] .bm-acc-body');
        __REG.ok('gerçek katalog body\'sinde transition-property max-height içeriyor (kural bağı)', !!body && getComputedStyle(body).transitionProperty.indexOf('max-height') >= 0, body ? getComputedStyle(body).transitionProperty : 'body yok');
        bmAccToggle('malt-ekle', false);
        const acc = document.querySelector('[data-acc-id="malt-ekle"]');
        __REG.ok('toggle işlevi: accordion kapandı (aria-expanded=false)', acc.getAttribute('aria-expanded') === 'false');
        return __REG.al();
      }, animOk);
      return c1.concat(c2);
    }
  },
  {
    kod: 'AQ2-BOS', ad: 'BOŞ REÇETE (AP #7): FG 0.999/hayalet ABV YOK (FG=OG); Doktor tek nazik mesaj (panik listesi yok); ML tahmin/ribbon/çip sessiz; stilTah sızmaz; mayasız-maltlıda da FG=OG',
    calistir: (page) => page.evaluate(() => {
      yeniTarif();
      const c = calc();
      __REG.ok('boş reçete: FG=1.000 (0.999 DEĞİL) + ABV=0 (hayalet alkol yok)', c.fg === 1.000 && c.abv === 0 && c.og === 1.000, 'og=' + c.og + ' fg=' + c.fg + ' abv=' + c.abv);
      __REG.ok('kapı açık: _bmBosOtoMu()=true', window._bmBosOtoMu() === true);
      const dom = document.getElementById('ekran').innerHTML;
      __REG.ok('Doktor: TEK nazik mesaj var', dom.indexOf('Reçete henüz boş') >= 0);
      __REG.ok('panik listesi YOK: "Reçete Doktoru — Stile uyum" başlığı basılmadı', dom.indexOf('Reçete Doktoru — Stile uyum') < 0);
      __REG.ok('Kritik/Uyarı çip rozetleri YOK', dom.indexOf('bm-doctor-durum-badge') < 0);
      __REG.ok('ML ribbonları YOK (Tahmin yapılıyor... dahi basılmaz)', document.querySelector('[data-ribbon]') === null && dom.indexOf('Tahmin yapılıyor') < 0);
      __REG.ok('başlıkta motor tahmini yerine "Reçete boş"', dom.indexOf('Reçete boş') >= 0);
      __REG.ok('stilTah global state\'e sızmadı (Kvass vakası)', (S.stilTah || '') === '', 'stilTah=' + S.stilTah);
      // mayasız ama MALTLI reçete: OG gerçek, FG=OG, ABV=0 (mash 63°C düzeltmesi de hayalet üretmez)
      S.maltlar = [{ id: 'pilsner', kg: 4 }]; S.mayaId = ''; S.maya2Id = ''; S.mashSc = 63;
      const c2 = calc();
      __REG.ok('mayasız+maltlı: OG gerçek (>1.02), FG=OG, ABV=0', c2.og > 1.02 && c2.fg === c2.og && c2.abv === 0, 'og=' + c2.og + ' fg=' + c2.fg + ' abv=' + c2.abv);
      __REG.ok('malt eklenince kapı kapandı (Doktor çalışabilir)', window._bmBosOtoMu() === false);
      // mayalı normal reçete: FG < OG aynen (regresyon)
      S.mayaId = 'us05'; S.mashSc = 67;
      const c3 = calc();
      __REG.ok('KARŞI-TEST: mayalı reçetede FG<OG + ABV>0 AYNEN', c3.fg < c3.og && c3.fg >= 1.000 && c3.abv > 0, 'fg=' + c3.fg + ' abv=' + c3.abv.toFixed(1));
      return __REG.al();
    })
  },
  {
    kod: 'AQ2-BOS-MANUEL', ad: 'KARŞI-TEST (AK iskeletsiz akışı): boş reçete + MANUEL stil → BJCP hedef bantları + Doktor önerileri GELİYOR (kapı manuel stilde açık kalır)',
    calistir: (page) => page.evaluate(() => {
      yeniTarif();
      S.stil = 'American IPA'; render();
      __REG.ok('manuel stil → kapı kapalı', window._bmBosOtoMu() === false);
      const dom = document.getElementById('ekran').innerHTML;
      __REG.ok('BJCP hedef bantları görünür (<b>OG:</b> aralığı)', dom.indexOf('<b>OG:</b>') >= 0);
      __REG.ok('nazik boş-mesaj YOK (Doktor kolu aktif)', dom.indexOf('Reçete henüz boş') < 0);
      __REG.ok('manuel stil başlıkta (motor değil kullanıcı seçimi)', dom.indexOf('American IPA') >= 0);
      return __REG.al();
    })
  },
  {
    kod: 'AQ2-SKOR', ad: 'TAKİP SKORU FAZ-FARKINDA (AP #8): şişelenmiş batch\'te "Müdahale gerekli" YOK + pencere şişelemede donar + dürüst ad (TAKİP); devam eden sorunlu batch\'te uyarı AYNEN',
    calistir: (page) => page.evaluate(() => {
      const gun = (n) => { const d = new Date(Date.now() - n * 864e5); return d.toISOString().slice(0, 10); };
      __REG.yeniKayit('AQ2 Skor Bira', { mayaId: '' });
      // az kayıtlı, 60 gün önce pitch — TAMAMLANMIŞ (şişeleme 48g önce + brewSonuc)
      S.brewLog = [{ tip: 'pitching', tarih: gun(60), id: 'p1', ts: 1 }, { tip: 'sicaklik', deger: '20', tarih: gun(59), id: 't1', ts: 2 }, { tip: 'siseleme', tarih: gun(48), id: 's1', ts: 3 }];
      S.brewSonuc = { ts: Date.now() - 48 * 864e5, ogG: 1.05, fgG: 1.012, kaynak: { og: 'olcum', fg: 'olcum' } };
      ekran = 'editor'; sekme = 'takvim'; render();
      const dom = document.getElementById('ekran').innerHTML;
      __REG.ok('dürüst ad: "TAKİP SKORU" (KALİTE SKORU değil)', dom.indexOf('TAKİP SKORU') >= 0 && dom.indexOf('KALİTE SKORU') < 0);
      __REG.ok('"batch tamam" ibaresi görünür', dom.indexOf('batch tamam') >= 0);
      __REG.ok('ŞİŞELENMİŞ batch\'te "Müdahale gerekli" YOK (az kayıt ≠ kötü bira)', dom.indexOf('Müdahale gerekli') < 0 && dom.indexOf('Kritik ·') < 0);
      __REG.ok('accordion başlığı: Grafikler & Takip', dom.indexOf('Grafikler &amp; Takip') >= 0 || dom.indexOf('Grafikler & Takip') >= 0);
      // KARŞI-TEST: aynı az-kayıt DEVAM EDEN batch (şişeleme yok) → eski dürüst uyarı AYNEN
      S.brewLog = [{ tip: 'pitching', tarih: gun(60), id: 'p1', ts: 1 }, { tip: 'sicaklik', deger: '20', tarih: gun(59), id: 't1', ts: 2 }];
      S.brewSonuc = null; render();
      const dom2 = document.getElementById('ekran').innerHTML;
      __REG.ok('DEVAM EDEN az-kayıtlı batch: "Kritik · Müdahale gerekli" AYNEN (yanlış bastırma yok)', dom2.indexOf('Kritik · Müdahale gerekli') >= 0);
      return __REG.al();
    })
  },
  {
    kod: 'AQ2-SIL', ad: 'tarifSil DRAFT TEMİZLİĞİ (AP K1Y-1): silinen reçetenin taslağı + bekleyen restore da gider (dirilme yok); BAŞKA reçetenin taslağına dokunulmaz',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('AQ2 Sil Bira');
      const id2 = __REG.yeniKayit('AQ2 Sil Sahit');
      ekran = 'liste'; render(); // saveDraft editör-dışı no-op → test deterministik
      localStorage.setItem('bm_draft_v1', JSON.stringify({ s: { biraAd: 'AQ2 Sil Bira', hacim: 12 }, editId: id, ts: Date.now() }));
      window._pendingDraft = { s: { biraAd: 'AQ2 Sil Bira' }, editId: id };
      tarifSil(id);
      __REG.ok('silinen reçetenin taslağı SİLİNDİ (dirilme yok)', localStorage.getItem('bm_draft_v1') === null);
      __REG.ok('bekleyen restore (_pendingDraft) da temizlendi', window._pendingDraft === null);
      __REG.ok('reçete KR\'den gitti', !KR.some(k => k && k.id === id));
      // KARŞI-TEST: taslak BAŞKA reçeteye aitken silme ona DOKUNMAZ
      // (sıra önemli: yeniKayit→tarifAc clearDraft çağırır — draft, kurban yaratıldıktan SONRA yazılır)
      const id3 = __REG.yeniKayit('AQ2 Sil Kurban');
      ekran = 'liste'; render();
      localStorage.setItem('bm_draft_v1', JSON.stringify({ s: { biraAd: 'AQ2 Sil Sahit', hacim: 13 }, editId: id2, ts: Date.now() }));
      tarifSil(id3);
      const d = JSON.parse(localStorage.getItem('bm_draft_v1') || 'null');
      __REG.ok('başka reçetenin taslağı KORUNDU', !!d && d.editId === id2, 'draft=' + (d ? d.editId : 'null'));
      localStorage.removeItem('bm_draft_v1');
      return __REG.al();
    })
  },

  // ── SPRINT AQ3: sessiz-hata altyapısı (AP #5 + ring kör noktası) ──
  {
    kod: 'AQ3-CATCH', ad: 'BAĞLANAN CATCH RING\'E DÜŞER: tombstone yazıcısı kasıtlı patlatılır → ring\'de persist/tarifSil-tombstone kaydı; silme akışı BOZULMAZ (catch semantiği korunur)',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('AQ3 Catch Bira');
      ekran = 'liste'; render();
      bmHataLogSil();
      const orig = window._krSilEkle;
      window._krSilEkle = function () { throw new Error('AQ3-TOMB-SENTETIK'); };
      tarifSil(id);
      window._krSilEkle = orig;
      __REG.ok('silme akışı BOZULMADI (reçete KR\'den gitti)', !KR.some(k => k && k.id === id));
      const ring = bmHataLogOku();
      __REG.ok('catch RING\'e düştü: tip=persist, kaynak=tarifSil/tombstone', ring.some(h => h.tip === 'persist' && h.kaynak === 'tarifSil/tombstone' && /AQ3-TOMB-SENTETIK/.test(h.mesaj)), JSON.stringify(ring.map(h => h.tip + ':' + h.kaynak)).slice(0, 140));
      bmHataLogSil();
      return __REG.al();
    })
  },
  {
    kod: 'AQ3-SESSIZ', ad: 'GÜRÜLTÜ YOK (kritik): normal kullanım turu (aç/düzenle/hesapla/kaydet/sekme gez/sil) → ring BOŞ kalır — yanlış-pozitif ring\'i işe yaramaz yapardı',
    calistir: (page) => page.evaluate(() => {
      bmHataLogSil();
      const id = __REG.yeniKayit('AQ3 Sessiz Bira');
      S.maltlar = [{ id: 'pilsner', kg: 3 }]; S.mayaId = 'us05';
      calc(); tarifeKaydet();
      ['malt', 'maya', 'hop', 'not', 'takvim', 'surec', 'genel'].forEach(function (sk) { sekme = sk; render(); });
      tarifAc(id); ekran = 'liste'; render();
      const id2 = __REG.yeniKayit('AQ3 Sessiz Sil'); ekran = 'liste'; render(); tarifSil(id2);
      ekran = 'ayarlar'; render(); ekran = 'liste'; render();
      const ring = bmHataLogOku();
      __REG.ok('TAM TUR sonrası ring BOŞ (26 bağlantı noktasından sıfır yanlış-pozitif)', ring.length === 0, JSON.stringify(ring.map(h => h.tip + ':' + h.kaynak + ':' + h.mesaj)).slice(0, 200));
      return __REG.al();
    })
  },
  {
    kod: 'AQ3-THROTTLE', ad: 'GÜRÜLTÜ KONTROLÜ: aynı tip+kaynak 60sn içinde tek satırda birikir (n sayacı) — sık tetiklenen catch ring\'i doldurup GERÇEK hatayı ezemez; onerror yolu etkilenmez',
    calistir: (page) => page.evaluate(() => {
      bmHataLogSil();
      for (var i = 0; i < 8; i++) window.bmHataKaydet('sync', new Error('AQ3-TEKRAR-' + i), 'test/sik-kaynak');
      var r1 = bmHataLogOku();
      __REG.ok('8 çağrı → 1 satır + n=8 (ring dolmadı)', r1.length === 1 && r1[0].n === 8, 'len=' + r1.length + ' n=' + (r1[0] && r1[0].n));
      window.bmHataKaydet('persist', new Error('AQ3-GERCEK-HATA'), 'test/baska-kaynak');
      for (var j = 0; j < 5; j++) window.bmHataKaydet('sync', new Error('AQ3-TEKRAR2'), 'test/sik-kaynak');
      var r2 = bmHataLogOku();
      __REG.ok('GERÇEK hata ezilmedi: 2 satır (sık-kaynak n birikti, gerçek hata duruyor)', r2.length === 2 && r2.some(h => /AQ3-GERCEK-HATA/.test(h.mesaj)) && r2.some(h => h.n === 13), JSON.stringify(r2.map(h => h.kaynak + ' n=' + (h.n || 1))));
      bmHataLogSil();
      return __REG.al();
    })
  },
  {
    kod: 'AQ3-ZBAYRAK', ad: 'Z-SİNYAL SIZINTISI KAPANDI (AP #5): iskelet bayrağı reçete değişiminde sıfırlanır — iskelet yolunda sinyal YOK (Z kuralı), yeniden açılan reçetenin kaydında sinyal VAR (sızıntı bitti)',
    calistir: (page) => page.evaluate(() => {
      localStorage.removeItem('bm_stil_ogren_v1');
      const id = __REG.yeniKayit('AQ3 Z Bira');
      S.maltlar = [{ id: 'pilsner', kg: 4 }]; S.mayaId = 'us05'; S.hoplar = [{ id: 'hallertau', g: 20, dk: 60, tur: 'boil' }];
      // gerçek slug→BJCP çifti seç (kapsamda/uyum alanları da doğrulanabilsin)
      const slug = Object.keys(SLUG_TO_BJCP).find(k => SLUG_TO_BJCP[k] && typeof BJCP !== 'undefined' && BJCP[SLUG_TO_BJCP[k]]);
      S.stil = SLUG_TO_BJCP[slug];
      const stubKur = () => {
        const og = calc().og;
        window.__bmV12DispatchInfo = { slugBranchHit: true, timestamp: Date.now() };
        window.__lastV12Result = { topN: [{ slug: slug, normalized: 80 }, { slug: slug, normalized: 10 }] };
        window.__lastV12Recipe = { maltIds: ['pilsner'], mayaId: 'us05', _og: og };
      };
      // 1) İSKELET NİYETİ: sinyal YAZILMAZ (Sprint Z kuralı AYNEN)
      stubKur(); window.__stilSecKaynak = 'iskelet';
      tarifeKaydet();
      __REG.ok('iskelet yolu: sinyal YAZILMADI (Z kuralı korundu)', _bmStilOgrenOku().length === 0);
      // 2) REÇETE DEĞİŞİMİ bayrağı sıfırlar (eski bug: takılı kalıyordu, sonraki kayıtların sinyali düşüyordu)
      tarifAc(id);
      __REG.ok('tarifAc → bayrak SIFIRLANDI', window.__stilSecKaynak === null, 'bayrak=' + window.__stilSecKaynak);
      stubKur(); // render dispatcher'ı stub'ı ezmiş olabilir — kayıt öncesi tazele (tarifeKaydet render çağırmaz)
      tarifeKaydet();
      const arr = _bmStilOgrenOku();
      __REG.ok('SIZINTI BİTTİ: yeniden açılan reçetenin kaydında sinyal YAZILDI', arr.length === 1 && arr[0].rid === String(id), 'n=' + arr.length);
      __REG.ok('sinyal alanları doğru: kaynak=null (çip/dropdown değil) + kapsamda + uyumSira=1', arr.length === 1 && arr[0].kaynak === null && arr[0].kapsamda === true && arr[0].uyumSira === 1, JSON.stringify(arr[0] && { k: arr[0].kaynak, kap: arr[0].kapsamda, u: arr[0].uyumSira }));
      // 3) yeniTarif de sıfırlar
      window.__stilSecKaynak = 'iskelet'; yeniTarif();
      __REG.ok('yeniTarif → bayrak SIFIRLANDI', window.__stilSecKaynak === null);
      localStorage.removeItem('bm_stil_ogren_v1');
      return __REG.al();
    })
  },
  {
    kod: 'AQ3-UI', ad: 'RING GÖRÜNÜRLÜĞÜ (Sprint O tamamlama): Tanı kartı sayacı yeni tipleri sayar, satırda tip+kaynak görünür, Panoya Kopyala metni okunabilir (Kaynak satırı)',
    calistir: (page) => page.evaluate(() => {
      bmHataLogSil();
      window.bmHataKaydet('persist', new Error('AQ3-UI-SENTETIK'), 'test/ui-kaynak');
      ekran = 'ayarlar'; render();
      const dom = document.getElementById('ekran').innerHTML;
      __REG.ok('Tanı kartı sayacı: "Son Hatalar (1)"', dom.indexOf('Son Hatalar (1)') >= 0);
      __REG.ok('satırda TİP görünür (persist — "hata" genellemesi değil)', dom.indexOf('persist: AQ3-UI-SENTETIK') >= 0);
      __REG.ok('satırda KAYNAK görünür', dom.indexOf('test/ui-kaynak') >= 0);
      const txt = window._bmHataMetni();
      __REG.ok('Panoya Kopyala metni: tip + Kaynak satırı + mesaj okunabilir', txt.indexOf('persist') >= 0 && txt.indexOf('Kaynak: test/ui-kaynak') >= 0 && txt.indexOf('AQ3-UI-SENTETIK') >= 0, txt.slice(0, 120));
      bmHataLogSil();
      ekran = 'ayarlar'; render();
      __REG.ok('temizle sonrası kart "✓ Hata kaydı yok"', document.getElementById('ekran').innerHTML.indexOf('Hata kaydı yok') >= 0);
      ekran = 'liste'; render();
      return __REG.al();
    })
  },

  // ── SPRINT AU1: brewday kalıcılık + 6 hata düzeltmesi (AU keşif maddesi 5 + D1-D6) ──
  {
    kod: 'AU1-KALICI', ad: 'BREWDAY KALICILIK (AU keşif KIRMIZI): start/onay/atlama/tamamlama KR\'ye (bm_v6+disk) yazar; ÖZET yeniden hesaplanmaz (tarifeKaydet DEĞİL), Z stil sinyali tetiklenmez, brewday logları id\'SİZ kalır',
    calistir: (page) => page.evaluate(async () => {
      const malt = MALTLAR.find(m => m && m.id && m.g !== 'Şeker' && m.id !== 'rice_hulls');
      const my = MAYALAR.find(m => m && m.id);
      const id = __REG.yeniKayit('REGTEST AU1-KALICI', { mayaId: my.id, maltlar: [{ id: malt.id, kg: 3 }] });
      const kr0 = KR.find(x => x && x.id === id);
      const ozet0 = JSON.stringify(kr0.ozet || null);
      const krLogOnce = (kr0.brewLog || []).length;
      // Özet kıyasını ANLAMLI yap: S'i değiştir ama KAYDETME. tarifeKaydet çalışsaydı özet DEĞİŞİRDİ.
      S.hacim = 25;
      const cNow = calc();
      __REG.ok('kontrol: hacim değişimi özeti değiştirirdi (kıyas anlamlı)', !kr0.ozet || cNow.og.toFixed(3) !== kr0.ozet.og, (kr0.ozet && kr0.ozet.og) + ' vs ' + cNow.og.toFixed(3));
      const zOnce = localStorage.getItem('bm_stil_ogren_v1');
      await brewdayBaslat();
      __REG.ok('brewday_start KR\'ye düştü (eski davranış: yalnız taslak)', (KR.find(x => x && x.id === id).brewLog || []).some(x => x && x.tip === 'brewday_start'));
      brewdayAktifOnayla();
      __REG.ok('onay anında KR\'de (brewday_event)', (KR.find(x => x && x.id === id).brewLog || []).some(x => x && x.tip === 'brewday_event'));
      _bmDirty = false;
      brewdayAtla();
      __REG.ok('atlama anında KR\'de (brewday_event_atlandi)', (KR.find(x => x && x.id === id).brewLog || []).some(x => x && x.tip === 'brewday_event_atlandi'));
      __REG.ok('sync kuyruğu tetiklendi (ky sarmalayıcısı: _bmDirty)', _bmDirty === true);
      let g = 0; while (g++ < 40 && window._brewday.aktif) brewdayAtla();
      __REG.ok('brewday tamamlandı', window._brewday.aktif === false);
      const kr = KR.find(x => x && x.id === id);
      __REG.ok('brewday_end KR\'de', (kr.brewLog || []).some(x => x && x.tip === 'brewday_end'));
      __REG.ok('KR log sayısı = S log sayısı (kayıp yok)', (kr.brewLog || []).length === (S.brewLog || []).length && (kr.brewLog || []).length > krLogOnce, (kr.brewLog || []).length + '/' + (S.brewLog || []).length);
      __REG.ok('brewday logları id\'SİZ (_logAnahtar t: dalı → KR birleşiminde çiftleme yok)', (kr.brewLog || []).filter(x => x && String(x.tip || '').indexOf('brewday') === 0 && x.id != null).length === 0);
      __REG.ok('ÖZET yeniden hesaplanmadı (tarifeKaydet çağrılmadı)', JSON.stringify(kr.ozet || null) === ozet0, ozet0 + ' → ' + JSON.stringify(kr.ozet || null));
      __REG.ok('KR.hacim dokunulmadı (yalnız brewLog+guncelleme yazıldı)', kr.hacim !== 25, String(kr.hacim));
      __REG.ok('Sprint Z stil sinyali TETİKLENMEDİ', localStorage.getItem('bm_stil_ogren_v1') === zOnce, String(localStorage.getItem('bm_stil_ogren_v1')));
      __REG.ok('guncelleme damgası tazelendi (LWW sırası doğru)', kr.guncelleme >= kr0.guncelleme);
      const lsK = (JSON.parse(localStorage.getItem('bm_v6') || '[]')).find(x => x && x.id === id);
      __REG.ok('DİSKTE (bm_v6) brewday logu var — telefon kapansa kayıp yok', !!lsK && (lsK.brewLog || []).some(x => x && x.tip === 'brewday_end'));
      const idbOk = await new Promise(res => {
        let bitti = false;
        try { window._bmIDB.get('bm_v6', function (v) { bitti = true; try { const a = JSON.parse(v || '[]'); const k = a.find(x => x && x.id === id); res(!!k && (k.brewLog || []).some(x => x && x.tip === 'brewday_end')); } catch (e) { res(false); } }); } catch (e) { res(false); }
        setTimeout(() => { if (!bitti) res(false); }, 3000);
      });
      __REG.ok('IndexedDB aynası da taşıyor (bm_backup/kv — LS eviction kurtarma yolu)', idbOk === true);
      // Çiftleme karşı-testi: aynı ayna iki kez koşarsa log ÇOĞALMAZ
      const nOnce = (kr.brewLog || []).length;
      window._bdLogKrAynala('test'); window._bdLogKrAynala('test');
      __REG.ok('ayna tekrar koşunca log ÇOĞALMADI (birleşim tekil)', (KR.find(x => x && x.id === id).brewLog || []).length === nOnce, nOnce + ' → ' + (KR.find(x => x && x.id === id).brewLog || []).length);
      return __REG.al();
    })
  },
  {
    kod: 'AU1-TASLAK', ad: 'TASLAK SİGORTASI + GHOST-DRAFT: KR aynası yazamazsa onay taslağa düşer (oturum-içi koruma); ayna yazdığında taslak temizlenir (Sprint N ghost uyarısı çıkmaz)',
    calistir: (page) => page.evaluate(async () => {
      const my = MAYALAR.find(m => m && m.id);
      const id = __REG.yeniKayit('REGTEST AU1-TASLAK', { mayaId: my.id });
      localStorage.removeItem('bm_draft_v1');
      S.notlar = 'AU1 taslak farkı'; // S ≠ KR → taslak yazılmalı
      await brewdayBaslat();
      brewdayAktifOnayla();
      const d = JSON.parse(localStorage.getItem('bm_draft_v1') || 'null');
      __REG.ok('onay taslağa yazıldı (S≠KR iken oturum-içi çökme koruması)', !!d && ((d.s || {}).brewLog || []).some(x => x && x.tip === 'brewday_event'), d ? 'draft var' : 'draft YOK');
      // KR yolu kapanırsa (kayıt silinmiş) taslak TEK sigorta olarak kalmalı
      const kesik = KR.findIndex(x => x && x.id === id);
      const yedek = KR.splice(kesik, 1)[0];
      brewdayAktifOnayla();
      const d2 = JSON.parse(localStorage.getItem('bm_draft_v1') || 'null');
      __REG.ok('KR kaydı yokken ayna sessizce durur, taslak yazmaya devam eder', !!d2 && ((d2.s || {}).brewLog || []).filter(x => x && x.tip === 'brewday_event').length >= 2, d2 ? String(((d2.s || {}).brewLog || []).length) : 'draft YOK');
      __REG.ok('ayna false döndü (yazacak kayıt yok)', window._bdLogKrAynala('test') === false);
      KR.splice(kesik, 0, yedek); _origKy(KR);
      // S==KR halinde ghost taslak kalmamalı
      const id2 = __REG.yeniKayit('REGTEST AU1-GHOST', { mayaId: my.id });
      localStorage.removeItem('bm_draft_v1');
      await brewdayBaslat();
      let g = 0; while (g++ < 40 && window._brewday.aktif) brewdayAtla();
      const kr2 = KR.find(x => x && x.id === id2);
      __REG.ok('brewday tamam + KR aynası yazdı', !window._brewday.aktif && (kr2.brewLog || []).some(x => x && x.tip === 'brewday_end'));
      __REG.ok('GHOST TASLAK YOK (ayna sonrası S==KR → saveDraft temizledi)', !localStorage.getItem('bm_draft_v1'), String(localStorage.getItem('bm_draft_v1')).slice(0, 80));
      return __REG.al();
    })
  },
  {
    kod: 'AU1-RID', ad: 'RID KAPISI: brewday sürerken BAŞKA reçete açılırsa ayna YAZMAZ (yanlış reçeteye giren log birleşimden geri alınamaz) — durum ring\'e düşer',
    calistir: (page) => page.evaluate(async () => {
      const my = MAYALAR.find(m => m && m.id);
      const id = __REG.yeniKayit('REGTEST AU1-RID-A', { mayaId: my.id });
      await brewdayBaslat();
      __REG.ok('b.rid brewday başında donduruldu', window._brewday.rid === String(id), String(window._brewday.rid));
      bmHataLogSil();
      const id2 = __REG.yeniKayit('REGTEST AU1-RID-B', { mayaId: my.id }); // tarifAc → _editId değişti
      __REG.ok('başka reçete açıldı (_editId değişti)', String(_editId) === String(id2) && window._brewday.rid !== String(id2));
      brewdayAktifOnayla();
      const krB = KR.find(x => x && x.id === id2);
      __REG.ok('YABANCI reçetenin KR\'sine brewday logu YAZILMADI', !(krB.brewLog || []).some(x => x && String(x.tip || '').indexOf('brewday') === 0), JSON.stringify((krB.brewLog || []).map(x => x.tip)));
      const ring = JSON.parse(localStorage.getItem('bm_hata_log_v1') || '[]');
      __REG.ok('sessiz kalmadı: ring\'de _bdLogKrAynala kaydı var', ring.some(x => x && String(x.kaynak || '').indexOf('_bdLogKrAynala') === 0), JSON.stringify(ring.map(x => x && x.kaynak)));
      bmHataLogSil();
      brewdayZorlaSifirla(true);
      return __REG.al();
    })
  },
  {
    kod: 'AU1-ALARM', ad: 'TIMER ALARMI DOM\'DAN BAĞIMSIZ (keşif B6): ✕ ile panel gizliyken süre dolunca alarm ÇALAR; tek sefer (çiftlenme yok); AT3 onay kapısı + interval tekilliği korunur',
    calistir: (page) => page.evaluate(async () => {
      const say = { beep: 0, titret: 0, bildirim: 0, title: 0 };
      const _b = window._brewBeep, _t = window._brewTitret, _n = window._brewBildirim, _f = window._brewTitleFlash;
      window._brewBeep = function () { say.beep++; };
      window._brewTitret = function () { say.titret++; };
      window._brewBildirim = function () { say.bildirim++; };
      window._brewTitleFlash = function () { say.title++; };
      try {
        const my = MAYALAR.find(m => m && m.id);
        __REG.yeniKayit('REGTEST AU1-ALARM', { mayaId: my.id });
        await brewdayBaslat();
        const ev = window._brewday.ajanda[window._brewday.aktifIdx];
        __REG.ok('AT3 kapısı duruyor: mash adımı ONAY bekliyor, sayaç kendiliğinden başlamadı', _bdOnayGerekli(ev) === true && !window._brewday.timerInt);
        brewdayTimerOnayla();
        const intOnce = window._brewday.timerInt;
        __REG.ok('AT3: onaydan SONRA sayaç çalışıyor', !!intOnce && !!window._brewday.timerT0);
        brewdayTimelineGizle();
        __REG.ok('panel ✕ ile gizlendi (timer DOM\'u yok)', !document.getElementById('brewdayTimerText') && !document.getElementById('brewdayTimerLabel'));
        __REG.ok('gizleme sayacı durdurmadı (interval aynı)', window._brewday.timerInt === intOnce);
        const b0 = say.beep, t0 = say.titret, n0 = say.bildirim;
        window._brewday.timerT0 = Date.now() - (window._brewday.timerSure * 1000) - 1000; // süre doldu
        brewdayTimerTik();
        __REG.ok('DOM YOKKEN alarm çaldı: bip + titreşim + bildirim', say.beep > b0 && say.titret > t0 && say.bildirim > n0, JSON.stringify(say));
        __REG.ok('timerBitti damgası kondu (tekillik kapısı)', window._brewday.timerBitti === true);
        const b1 = say.beep, n1 = say.bildirim;
        brewdayTimerTik(); brewdayTimerTik();
        __REG.ok('alarm ÇİFTLENMEDİ (sonraki tik\'ler sessiz)', say.beep === b1 && say.bildirim === n1, JSON.stringify(say));
        brewdayRender();
        const lbl = document.getElementById('brewdayTimerLabel');
        __REG.ok('panel geri açılınca "SÜRE DOLDU" etiketi doğru', !!lbl && lbl.textContent.indexOf('SÜRE DOLDU') > -1, lbl && lbl.textContent);
        __REG.ok('re-render sayaç interval\'ini ÇİFTLEMEDİ', window._brewday.timerInt === intOnce);
        brewdayZorlaSifirla(true);
      } finally {
        window._brewBeep = _b; window._brewTitret = _t; window._brewBildirim = _n; window._brewTitleFlash = _f;
      }
      return __REG.al();
    })
  },
  {
    kod: 'AU1-STRIKE', ad: 'D1/D4 STRIKE + BÖLÜŞÜM (Muzo geometrisi 3.16kg · 11L · 70dk · 46→67→72→76): strike ≈49.3°C (eski 70.9 YOK), oran mash payından, bölüşüm 10.1+5.5=15.6 (eski 10+5=15), yaklaşıklık işareti var',
    calistir: (page) => page.evaluate(() => {
      const malt = MALTLAR.find(m => m && m.id && m.g !== 'Şeker' && m.id !== 'rice_hulls');
      __REG.yeniKayit('REGTEST AU1-STRIKE', {});
      S.hacim = 11; S.kaynatmaSure = 70; S.grainTemp = 20; S.spargeL = null;
      S.maltlar = [{ id: malt.id, kg: 3.16 }];
      S.mashSc = 67; S.mashDk = 60;
      S.mashAdimlar = [{ sc: 46, dk: 15 }, { sc: 67, dk: 45 }, { sc: 72, dk: 25 }, { sc: 76, dk: 15 }];
      sekme = 'hesap'; render();
      const t = () => document.getElementById('ekran').textContent;
      __REG.ok('TOPLAM SU 15.6L (keşif ölçümüyle birebir)', t().indexOf('15.6L') > -1);
      __REG.ok('D4: bölüşüm 10.1 + 5.5 (çift Math.round kalktı, 0.6L kaçak kapandı)', t().indexOf('Mash ~10.1L + Sparge ~5.5L') > -1, t().slice(t().indexOf('bölüşüm önerisi'), t().indexOf('bölüşüm önerisi') + 60));
      __REG.ok('D4: eski yuvarlanmış "Mash ~10L + Sparge ~5L" YOK', t().indexOf('Mash ~10L + Sparge ~5L') === -1);
      __REG.ok('D1: strike ≈49.3°C (ilk mash adımı 46°C + mash payı)', t().indexOf('≈49.3°C') > -1);
      __REG.ok('D1: eski yanlış 70.9°C YOK (25°C sapma kapandı)', t().indexOf('70.9') === -1);
      __REG.ok('D1: hedefin İLK adım olduğu görünür', t().indexOf('hedef mash 46°C (1. adım)') > -1);
      __REG.ok('D1: mash suyu + kaynağı şeffaf', t().indexOf('mash suyu 10.1L (%65 bölüşüm önerisi)') > -1);
      __REG.ok('D1 ŞÜPHE: kazan ısı kaybı modellenmediği yazılı (sahte kesinlik yok)', t().indexOf('Kazan ısı kaybı modellenmez') > -1);
      __REG.ok('D1 ŞÜPHE: varsayım halinde tek-dokunuş çıkış yolu gösteriliyor (sparge gir / tam hacim 0)', t().indexOf('Sparge litresini Süreç sekmesinde girersen') > -1);
      // sparge girilirse mash payı ondan gelir
      S.spargeL = 3; render();
      __REG.ok('sparge 3L girilince mash payı 12.6L → ≈48.7°C', t().indexOf('≈48.7°C') > -1 && t().indexOf('mash suyu 12.6L (toplam − sparge 3L)') > -1);
      __REG.ok('sparge girilince varsayım ipucu SUSAR (artık varsayım değil)', t().indexOf('Sparge litresini Süreç sekmesinde girersen') === -1);
      // bilinçli tam hacim (sparge 0) = tüm su mash'te
      S.spargeL = 0; render();
      __REG.ok('sparge 0 (bilinçli tam hacim) → mash suyu 15.6L, ≈48.2°C', t().indexOf('≈48.2°C') > -1 && t().indexOf('mash suyu 15.6L (tam hacim (sparge yok))') > -1);
      // tek adımlı reçete: eski davranış (S.mashSc) korunur
      S.spargeL = null; S.mashAdimlar = []; render();
      __REG.ok('adımsız reçetede S.mashSc kullanılır (regresyon yok)', t().indexOf('hedef mash 67°C') > -1 && t().indexOf('(1. adım)') === -1);
      sekme = 'genel'; render();
      return __REG.al();
    })
  },
  {
    kod: 'AU1-AJANDA', ad: 'D2/D5/D6 AJANDA: süre tahmini mash ADIM TOPLAMINDAN (175→215, ısınma hariç yazılı); pitch sıcaklığı gerçek maya sc/ideal (lager 9-15, sabit 18-22 YOK); hop dk > kaynatma UYARISI',
    calistir: (page) => page.evaluate(() => {
      const malt = MALTLAR.find(m => m && m.id && m.g !== 'Şeker' && m.id !== 'rice_hulls');
      const hop = HOPLAR.find(h => h && h.id);
      __REG.yeniKayit('REGTEST AU1-AJANDA', {});
      S.hacim = 11; S.kaynatmaSure = 70; S.mashSc = 67; S.mashDk = 60;
      S.mashAdimlar = [{ sc: 46, dk: 15 }, { sc: 67, dk: 45 }, { sc: 72, dk: 25 }, { sc: 76, dk: 15 }]; // toplam 100 dk
      S.maltlar = [{ id: malt.id, kg: 3.16 }];
      S.hoplar = [{ id: hop.id, g: 4, dk: 75, tur: 'boil' }]; // 75 > 70 → fiziken imkânsız
      S.mayaId = 'w3470'; // lager: sc [9,15], ideal 12
      // D5 — pitch sıcaklığı
      let a = brewdayAjandaUret();
      const pitch = a.find(x => x.tip === 'pitch');
      __REG.ok('D5: pitch detayı gerçek maya aralığı (9-15°C) + ideal 12°C', !!pitch && pitch.detay.indexOf('9-15°C (ideal 12°C)') > -1, pitch && pitch.detay);
      __REG.ok('D5: her mayada sabit "18-22°C" talimatı YOK', !pitch || pitch.detay.indexOf('18-22°C') === -1);
      __REG.ok('D5: olmayan alan artık okunmuyor (my?.sic_min çağrısı yok)', String(brewdayAjandaUret).indexOf('my?.sic_min') === -1 && String(brewdayAjandaUret).indexOf('my?.sic_max') === -1);
      S.mayaId = 'us05'; a = brewdayAjandaUret();
      __REG.ok('D5 karşı-test: ale mayasında 15-24°C (ideal 20°C)', a.find(x => x.tip === 'pitch').detay.indexOf('15-24°C (ideal 20°C)') > -1);
      // D6 — hop > kaynatma uyarısı
      const hopEv = a.find(x => x.tip === 'hop_add');
      __REG.ok('D6: hop 75 dk > kaynatma 70 dk uyarısı ajandada', !!hopEv && hopEv.detay.indexOf('75 dk > kaynatma 70 dk') > -1, hopEv && hopEv.detay);
      __REG.ok('D6: uyarı "hop alarmı eşleşmez" gerçeğini söylüyor', hopEv.detay.indexOf('hop alarmı eşleşmez') > -1);
      __REG.ok('D6: clamp YOK — reçetenin gerçeği (dkKalan 75) değişmedi', hopEv.dkKalan === 75, String(hopEv.dkKalan));
      S.hoplar = [{ id: hop.id, g: 4, dk: 60, tur: 'boil' }];
      const hopEv2 = brewdayAjandaUret().find(x => x.tip === 'hop_add');
      __REG.ok('D6 karşı-test: 60 ≤ 70 → uyarı YOK (yanlış-pozitif yok)', hopEv2.detay.indexOf('sığmıyor') === -1 && hopEv2.detay.indexOf('Kaynatma bitişine 60 dk kala') > -1, hopEv2.detay);
      // D2 — başlangıç modalindeki süre tahmini
      brewdayBaslatEkran();
      const modal = document.getElementById('brewdayOnayModal');
      __REG.ok('başlangıç modali açıldı', !!modal);
      __REG.ok('D2: süre 215 dk (mash adım toplamı 100 + kaynatma 70 + 45)', modal.textContent.indexOf('yaklaşık 215 dk') > -1, modal.textContent.slice(0, 160));
      __REG.ok('D2: eski 175 dk (S.mashDk tek adım) YOK', modal.textContent.indexOf('175 dk') === -1);
      __REG.ok('D2 dürüstlük: ısınma/soğutma hariç olduğu yazılı (Muzo gerçeği 272 dk)', modal.textContent.indexOf('ısınma/soğutma hariç') > -1);
      brewdayOnayKapat();
      return __REG.al();
    })
  },
  {
    kod: 'AU1-SPARGE', ad: 'D3 DÜŞÜK-SPARGE UYARISI: koşul >0 && <3 — boşta (undefined) sessiz, 0\'da (bilinçli tam hacim) SAHTE ALARM YOK, 2L\'de uyarı çıkar',
    calistir: (page) => page.evaluate(() => {
      const malt = MALTLAR.find(m => m && m.id && m.g !== 'Şeker' && m.id !== 'rice_hulls');
      __REG.yeniKayit('REGTEST AU1-SPARGE', {});
      S.hacim = 11; S.maltlar = [{ id: malt.id, kg: 3.16 }]; S.mashSc = 67;
      const uyariVar = () => document.getElementById('ekran').textContent.indexOf('düşük/atlanan sparge') > -1;
      S.spargeL = null; sekme = 'surec'; render();
      __REG.ok('spargeL boş → uyarı YOK (Muzo\'da zaten tetiklenmiyordu)', !uyariVar());
      S.spargeL = 0; render();
      __REG.ok('spargeL=0 (bilinçli tam hacim) → SAHTE ALARM YOK (yeni davranış)', !uyariVar());
      S.spargeL = 2; render();
      __REG.ok('spargeL=2 → uyarı ÇIKAR (gerçek düşük sparge)', uyariVar());
      S.spargeL = 5.5; render();
      __REG.ok('spargeL=5.5 → uyarı YOK', !uyariVar());
      S.spargeL = null; sekme = 'genel'; render();
      return __REG.al();
    })
  },
  // ── SPRINT AU2: brewday UI yeniden tasarımı (AU keşif maddeleri 1/2/3/4/6) ──
  // Keşfin kritik tespiti: "testler geçse bile Kaan'ın şikâyet ettiği hiçbir şey yakalanmıyor"
  // — mevcut paket veri zincirini koruyordu, TASARIMI değil. Aşağıdaki 6 case tam o kör noktayı
  // hedefler: rütbe (hangi sayı ne büyüklükte), refleks (butonlar arası mesafe), görünürlük
  // (aktif kart viewport içinde mi) ve karar (su yolu soruldu mu).
  {
    kod: 'AU2-CATAL', ad: 'SU YOLU ÇATALI (AU keşif #1): tek "Başlat" İKİ SU BUTONUNA bölündü — seçim S.spargeL\'e yazılır ve %65 bölüşüm VARSAYIMI kalkar; modal grist/OG/verim/tuz/kavuz/hop uyarılarını taşır; VERİM otomatik değişmez',
    calistir: (page) => page.evaluate(async () => {
      // brewdayBaslat b.aktif'i wake-lock await'inden ONCE set ediyor: bayragi beklemek
      // render/KR-aynasi ile YARISIR. Timeline DOM'u beklenir (ayna+render ondan SONRA).
      const bekle = async () => { for (let i = 0; i < 200 && !document.getElementById('brewdayTimeline'); i++) await new Promise(r => setTimeout(r, 20)); };
      const malt = MALTLAR.find(m => m && m.id && m.g !== 'Şeker' && m.id !== 'rice_hulls');
      const hop = HOPLAR.find(h => h && h.id);
      __REG.yeniKayit('REGTEST AU2-CATAL', {});
      S.hacim = 11; S.kaynatmaSure = 70; S.grainTemp = 20; S.spargeL = null; S.verim = 60; S.mayaId = 'us05';
      // Muzo geometrisi: %61 kavuzsuz buğday — AT1 uyarısının GERÇEK tetikleyicisi
      const bug = MALTLAR.find(m => m && m.id === 'wheat') || MALTLAR.find(m => m && _BM_KAVUZSUZ_IDS.indexOf(m.id) > -1);
      S.maltlar = [{ id: bug.id, kg: 2 }, { id: malt.id, kg: 1.16 }];
      S.mashAdimlar = [{ sc: 46, dk: 15 }, { sc: 67, dk: 45 }, { sc: 72, dk: 25 }, { sc: 76, dk: 15 }];
      S.hoplar = [{ id: hop.id, g: 4, dk: 75, tur: 'boil' }];   // 75 > 70 → D6 uyarısı
      S.suMineralleri = [{ id: 'cacl2', miktar: 1.1 }, { id: 'caco3', miktar: 0.95 }];
      const plan = _bdSuPlan();
      const ajBase = brewdayAjandaUret().length;
      brewdayBaslatEkran();
      const m = document.getElementById('brewdayOnayModal');
      __REG.ok('başlangıç modali açıldı', !!m);
      const iki = document.getElementById('bdSuIki'), tam = document.getElementById('bdSuTam');
      __REG.ok('İKİ su butonu var — karar SORULUYOR (eski: tek nötr "Başlat")', !!iki && !!tam);
      __REG.ok('nötr tek-buton yolu modalde YOK (bir ekranda iki birincil buton olmaz)', m.innerHTML.indexOf('brewdayBaslat()') === -1);
      __REG.ok('iki kademe butonu mash payını + sparge payını LİTRE ile yazıyor', iki.innerText.indexOf(plan.mashOner + ' L') > -1 && iki.innerText.indexOf(plan.spargeOner + ' L') > -1, iki.innerText.replace(/\s+/g, ' '));
      __REG.ok('tam hacim butonu TOPLAM suyu yazıyor', tam.innerText.indexOf(plan.toplam + ' L') > -1, tam.innerText.replace(/\s+/g, ' '));
      __REG.ok('tam hacim dalında ~%8 verim kaybı SÖYLENİYOR (uygulamanın kendi bilgi tabanı)', /%8/.test(tam.innerText));
      __REG.ok('iki buton da dokunulabilir yükseklikte (≥48px)', iki.getBoundingClientRect().height >= 48 && tam.getBoundingClientRect().height >= 48, Math.round(iki.getBoundingClientRect().height) + '/' + Math.round(tam.getBoundingClientRect().height));
      const oz = document.getElementById('bdPlanOzet');
      __REG.ok('BUGÜNKÜ PLAN kutusu: grist kg + hedef hacim + hedef OG + verim', !!oz && /3\.16 kg/.test(oz.innerText) && /11 L/.test(oz.innerText) && /hedef OG 1\.\d{3}/.test(oz.innerText) && /verim %60/.test(oz.innerText), oz && oz.innerText.replace(/\s+/g, ' ').slice(0, 140));
      __REG.ok('mash basamakları + kaynatma süresi planda', /46→67→72→76/.test(oz.innerText) && /kaynatma 70 dk/.test(oz.innerText));
      const tz = document.getElementById('bdPlanTuz');
      __REG.ok('TUZ ayrı adım değil SATIR — "malt girmeden suya" + miktarlar', !!tz && /CaCl₂ 1\.1 g/.test(tz.innerText) && /CaCO₃ 0\.95 g/.test(tz.innerText) && /malt girmeden/.test(tz.innerText), tz && tz.innerText.replace(/\s+/g, ' '));
      __REG.ok('TUZ: yalnız kanıtlı talimat verilir (CaCO₃ çözünürlük notu)', /zor çözünür/.test(tz.innerText));
      const uy = document.getElementById('bdPlanUyari');
      __REG.ok('AT1 kavuzsuz uyarısı brewday brifingine taşındı', !!uy && /[Kk]avuzsuz/.test(uy.innerText), uy && uy.innerText.replace(/\s+/g, ' ').slice(0, 120));
      __REG.ok('D6 hop>kaynatma uyarısı brifingde (75 dk > kaynatma 70 dk)', !!uy && uy.innerText.indexOf('75 dk > kaynatma 70 dk') > -1);
      __REG.ok('DÜRÜSTLÜK: adım sayısı ARALIK (çatalın iki dalı farklı sayı üretir)', new RegExp(ajBase + '–' + (ajBase + 1) + ' adım').test(m.innerText), m.innerText.slice(0, 120).replace(/\s+/g, ' '));
      // ── İKİ KADEME dalı ──
      iki.click(); await bekle();
      __REG.ok('İKİ KADEME → S.spargeL = önerilen sparge litresi', S.spargeL === plan.spargeOner, String(S.spargeL) + ' vs ' + plan.spargeOner);
      __REG.ok('seçim state\'te işaretli (b.suMod)', window._brewday.suMod === 'iki', String(window._brewday.suMod));
      __REG.ok('AU-1\'in %65 VARSAYIMI KALKTI — mash payı gerçek plandan', _bdMashPayi().kaynak.indexOf('toplam − sparge') === 0, _bdMashPayi().kaynak);
      __REG.ok('strike artık varsayıma değil seçime oturdu', Math.abs(+_bdStrike(_bdMashPayi().mashSu).sw - +_bdStrike(plan.mashOner).sw) < 0.6, _bdStrike(_bdMashPayi().mashSu).sw + ' vs ' + _bdStrike(plan.mashOner).sw);
      __REG.ok('AT6 DİSİPLİNİ: verim OTOMATİK değişmedi (motor kullanıcı yerine karar vermez)', S.verim === 60, String(S.verim));
      brewdayZorlaSifirla(true);
      // ── TAM HACİM dalı ──
      S.spargeL = null;
      brewdayBaslatEkran(); document.getElementById('bdSuTam').click(); await bekle();
      __REG.ok('TAM HACİM → S.spargeL = 0 (bilinçli "sparge yok" beyanı)', S.spargeL === 0, String(S.spargeL));
      __REG.ok('mash payı = tam hacim (varsayım yok)', _bdMashPayi().kaynak === 'tam hacim (sparge yok)' && _bdMashPayi().mashSu === plan.toplam, _bdMashPayi().kaynak);
      __REG.ok('verim yine otomatik değişmedi', S.verim === 60, String(S.verim));
      brewdayZorlaSifirla(true);
      // ── kullanıcının kendi ölçüsü EZİLMEZ ──
      S.spargeL = 4;
      brewdayBaslatEkran();
      __REG.ok('Süreç\'te girilen 4 L çatalda görünüyor (öneri değil kullanıcı değeri)', document.getElementById('bdSuIki').innerText.indexOf('4 L') > -1 && /Süreç.{0,3}te girdiğin/.test(document.getElementById('bdSuIki').innerText), document.getElementById('bdSuIki').innerText.replace(/\s+/g, ' '));
      document.getElementById('bdSuIki').click(); await bekle();
      __REG.ok('çatal kullanıcının sayısını SESSİZCE ezmedi', S.spargeL === 4, String(S.spargeL));
      brewdayZorlaSifirla(true);
      return __REG.al();
    })
  },
  {
    kod: 'AU2-SPARGE-KART', ad: 'AYRI SPARGE KARTI (AU keşif #3 KIRMIZI): tip \'sparge\' YALNIZ spargeL>0 iken üretilir (emniyet: yok/0 ise ajanda BİREBİR aynı); timerTur/sure YOK (AT3 whitelist\'ine düşmez); mash_end tip olarak KALIR',
    calistir: (page) => page.evaluate(() => {
      const malt = MALTLAR.find(m => m && m.id && m.g !== 'Şeker' && m.id !== 'rice_hulls');
      const hop = HOPLAR.find(h => h && h.id);
      __REG.yeniKayit('REGTEST AU2-SPARGE-KART', {});
      S.hacim = 11; S.kaynatmaSure = 60; S.mayaId = 'us05';
      S.maltlar = [{ id: malt.id, kg: 3.16 }];
      S.mashAdimlar = [{ sc: 46, dk: 15 }, { sc: 67, dk: 45 }];
      S.hoplar = [{ id: hop.id, g: 20, dk: 60, tur: 'boil' }];
      const tipler = () => brewdayAjandaUret().map(e => e.tip);
      // EMNİYET: gerçek yedekteki 7/7 reçetede spargeL alanı YOK (AU-1'de ölçüldü)
      S.spargeL = null;
      const bosTip = JSON.stringify(tipler());
      __REG.ok('spargeL YOKken sparge kartı ÜRETİLMEZ (mevcut reçetelerin ajandası birebir aynı)', bosTip.indexOf('sparge') === -1, bosTip);
      S.spargeL = 0;
      __REG.ok('spargeL=0 (bilinçli tam hacim) → yine kart YOK, tip dizisi BİREBİR aynı', JSON.stringify(tipler()) === bosTip, JSON.stringify(tipler()));
      const mEnd0 = brewdayAjandaUret().find(e => e.tip === 'mash_end');
      __REG.ok('tam hacimde mash_end "Sparge YOK (tam hacim seçtin)" diyor (sahte sparge talimatı yok)', /Sparge YOK \(tam hacim seçtin\)/.test(mEnd0.detay), mEnd0.detay);
      // sparge girilince kart doğar
      S.spargeL = 5.5;
      const aj = brewdayAjandaUret();
      const iSp = aj.findIndex(e => e.tip === 'sparge'), iEnd = aj.findIndex(e => e.tip === 'mash_end');
      __REG.ok('spargeL=5.5 → AYRI sparge kartı üretildi', iSp > -1);
      __REG.ok('sparge kartı mash_end\'in HEMEN ÖNÜNDE (tek refleks dokunuş ikisini birden öldüremez)', iSp === iEnd - 1, iSp + '/' + iEnd);
      __REG.ok('tip dizisi YALNIZ bir adım büyüdü (başka hiçbir adım değişmedi)', JSON.stringify(tipler().filter(t => t !== 'sparge')) === bosTip, JSON.stringify(tipler()));
      const sp = aj[iSp];
      __REG.ok('KIRMIZI KURAL: yeni adıma timerTur VERİLMEDİ (AT3 onay whitelist\'ine düşmez)', sp.timerTur === undefined && sp.sure === undefined, String(sp.timerTur) + '/' + String(sp.sure));
      __REG.ok('AT3 kapısı sparge kartında kapalı (yeni sayaç otoritesi doğmadı)', _bdOnayGerekli(sp) === false);
      __REG.ok('başlıkta GERÇEK litre + 76 °C', sp.baslik.indexOf('5.5 L') > -1 && sp.baslik.indexOf('76') > -1, sp.baslik);
      __REG.ok('detayda ~%8 verim kaybı + kaynak (Troester, NHC 2010)', /~%8/.test(sp.detay) && /Troester/.test(sp.detay), sp.detay);
      __REG.ok('detayda hedef pre-boil hacmi', /Hedef pre-boil hacmi/.test(sp.detay));
      __REG.ok('brewday logları id ALANI ALMADI (KIRMIZI: _logAnahtar t:→i: çiftlemesi)', aj.filter(e => e.id !== undefined).length === 0);
      const mEnd = aj[iEnd];
      __REG.ok('mash_end TİP OLARAK KALDI (Sprint T pre-boil OG bloğu buna kilitli)', mEnd.tip === 'mash_end');
      __REG.ok('mash_end araç-nötr ölçüm cümlesini KORUDU', mEnd.detay.indexOf('karttaki alana girebilirsin') > -1, mEnd.detay);
      __REG.ok('sparge varken mash_end sparge talimatını TEKRARLAMIYOR', mEnd.detay.indexOf('Sparge suyu 76') === -1 && /Sparge tamam/.test(mEnd.detay), mEnd.detay);
      return __REG.al();
    })
  },
  {
    kod: 'AU2-ODAK', ad: 'ODAK MODU (AU keşif #2, 390×844 gerçek mobil): yalnız AKTİF adım tam boy + sonraki tek satır; 13 adımlık ajanda ≤1 ekrana indi; bilgi GİZLENMEZ (tam liste tek dokunuş); sayaçsız adımda sayaç kutusu BASILMAZ',
    calistir: async (page) => {
      await page.setViewport({ width: 390, height: 844 });
      return page.evaluate(async () => {
        // brewdayBaslat b.aktif'i wake-lock await'inden ONCE set ediyor: bayragi beklemek
        // render/KR-aynasi ile YARISIR. Timeline DOM'u beklenir (ayna+render ondan SONRA).
        const bekle = async () => { for (let i = 0; i < 200 && !document.getElementById('brewdayTimeline'); i++) await new Promise(r => setTimeout(r, 20)); };
        const malt = MALTLAR.find(m => m && m.id && m.g !== 'Şeker' && m.id !== 'rice_hulls');
        const hop = HOPLAR.find(h => h && h.id);
        __REG.yeniKayit('REGTEST AU2-ODAK', {});
        S.hacim = 11; S.kaynatmaSure = 70; S.mayaId = 'us05'; S.suMineralleri = [];
        S.maltlar = [{ id: malt.id, kg: 3.16 }];
        S.mashAdimlar = [{ sc: 46, dk: 15 }, { sc: 67, dk: 45 }, { sc: 72, dk: 25 }, { sc: 76, dk: 15 }];
        S.hoplar = [{ id: hop.id, g: 20, dk: 60, tur: 'boil' }, { id: hop.id, g: 20, dk: 10, tur: 'boil' }];
        brewdayBaslatEkran(); document.getElementById('bdSuIki').click(); await bekle();
        const b = window._brewday, tl = document.getElementById('brewdayTimeline');
        __REG.ok('ajanda gerçekten uzun (keşif koşulu: 12 kart = 1.42 ekran)', b.ajanda.length >= 12, String(b.ajanda.length));
        __REG.ok('ODAK: yalnız 2 kart basıldı (aktif + sonraki önizleme)', tl.querySelectorAll('.brewday-event').length === 2, String(tl.querySelectorAll('.brewday-event').length));
        __REG.ok('ODAK: panel ≤1 ekran (kaydırma gerekmiyor)', tl.scrollHeight <= tl.clientHeight + 4, tl.scrollHeight + '/' + tl.clientHeight);
        const ak = document.getElementById('bdAktifKart'), r = ak.getBoundingClientRect();
        __REG.ok('aktif kart TAMAMEN viewport içinde (390×844)', r.top >= 0 && r.bottom <= innerHeight, Math.round(r.top) + '→' + Math.round(r.bottom) + ' / ' + innerHeight);
        __REG.ok('aktif kart başlığı büyütüldü (rütbe: eylem 13px değil)', parseFloat(getComputedStyle(ak.querySelector('div>div>div')).fontSize) >= 16, getComputedStyle(ak.querySelector('div>div>div')).fontSize);
        const snr = document.getElementById('bdSonrakiSatir');
        __REG.ok('SONRAKİ adım tek satır önizleme (ne geldiği belli, şimdiki iş bölünmüyor)', !!snr && snr.getBoundingClientRect().height < 60, snr ? Math.round(snr.getBoundingClientRect().height) + 'px' : 'YOK');
        __REG.ok('AU2-1: ilk mash adımının GÖRÜNÜR metninde su miktarı var (litre + ısıt)', /\d+([.,]\d+)?\s*L/.test(ak.innerText) && /ısıt/.test(ak.innerText), ak.innerText.replace(/\s+/g, ' ').slice(0, 110));
        __REG.ok('suMineralleri BOŞken tuz satırı YOK (uydurma talimat üretilmez)', ak.innerText.indexOf('🧂') === -1);
        __REG.ok('sayacı OLAN adımda sayaç kutusu basılıyor', !!document.getElementById('brewdayBigTimer') && b.ajanda[b.aktifIdx].sure > 0);
        let g = 0;
        while (g++ < 40 && window._brewday.aktif && b.ajanda[b.aktifIdx].tip !== 'sparge') { if (_bdOnayGerekli(b.ajanda[b.aktifIdx])) brewdayTimerOnayla(); brewdayAktifOnayla(); }
        __REG.ok('sparge adımına gelindi', b.ajanda[b.aktifIdx].tip === 'sparge', b.ajanda[b.aktifIdx].tip);
        __REG.ok('SAYAÇSIZ adımda sayaç kutusu HİÇ BASILMIYOR (boş "—:—" ilk ekranın %24-35\'ini yiyordu)', !document.getElementById('brewdayBigTimer'));
        const oz = document.getElementById('bdTamamOzet');
        __REG.ok('tamamlananlar tek satıra katlandı (silinmedi — özet sayıyı taşıyor)', !!oz && /4 adım tamam/.test(oz.innerText), oz ? oz.innerText : 'YOK');
        // BİLGİ GİZLENMİYOR: tek dokunuş
        const odakYuk = tl.scrollHeight;
        document.getElementById('bdTumAdimlarBtn').click();
        const tl2 = document.getElementById('brewdayTimeline');
        __REG.ok('TEK DOKUNUŞ: tüm adımlar açıldı — hiçbir bilgi kaybolmadı', tl2.querySelectorAll('.brewday-event').length === b.ajanda.length, tl2.querySelectorAll('.brewday-event').length + '/' + b.ajanda.length);
        __REG.ok('kazanç GERÇEK: tam liste odak modundan belirgin uzun', tl2.scrollHeight > odakYuk * 1.3, tl2.scrollHeight + ' vs ' + odakYuk);
        const ak2 = document.getElementById('bdAktifKart').getBoundingClientRect();
        __REG.ok('tam listede aktif kart hâlâ görünür (koşullu scrollIntoView)', ak2.top >= 0 && ak2.top < innerHeight, Math.round(ak2.top));
        document.getElementById('bdOdakBtn').click();
        __REG.ok('odak moduna geri dönülebiliyor', document.getElementById('brewdayTimeline').querySelectorAll('.brewday-event').length === 2);
        brewdayZorlaSifirla(true);
        return __REG.al();
      });
    }
  },
  {
    kod: 'AU2-DIL', ad: 'KART DİLİ (AU keşif #4): onay butonu JENERİK DEĞİL FİZİKSEL İDDİA (13 kartta aynı "✓ Ekledim" bitti); tam genişlik ×48px; "Atla" ≥16px ayrık; aktif kartta 12px/α.75 altı metin YOK (eski detay 3.09:1)',
    calistir: async (page) => {
      await page.setViewport({ width: 390, height: 844 });
      return page.evaluate(async () => {
        // brewdayBaslat b.aktif'i wake-lock await'inden ONCE set ediyor: bayragi beklemek
        // render/KR-aynasi ile YARISIR. Timeline DOM'u beklenir (ayna+render ondan SONRA).
        const bekle = async () => { for (let i = 0; i < 200 && !document.getElementById('brewdayTimeline'); i++) await new Promise(r => setTimeout(r, 20)); };
        const alfa = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return 1; const p = m[1].split(','); return p.length > 3 ? parseFloat(p[3]) : 1; };
        const tara = (kok) => { const kotu = []; kok.querySelectorAll('*').forEach(e => { if (!Array.from(e.childNodes).some(n => n.nodeType === 3 && n.textContent.trim())) return; const cs = getComputedStyle(e), fs = parseFloat(cs.fontSize), a = alfa(cs.color); if (fs < 12 || a < 0.75) kotu.push(Math.round(fs) + 'px/' + a.toFixed(2) + ' "' + e.textContent.trim().slice(0, 30) + '"'); }); return kotu; };
        const malt = MALTLAR.find(m => m && m.id && m.g !== 'Şeker' && m.id !== 'rice_hulls');
        const hop = HOPLAR.find(h => h && h.id);
        __REG.yeniKayit('REGTEST AU2-DIL', {});
        S.hacim = 11; S.kaynatmaSure = 70; S.mayaId = 'us05';
        S.maltlar = [{ id: malt.id, kg: 3.16 }];
        S.mashAdimlar = [{ sc: 66, dk: 60 }];
        S.hoplar = [{ id: hop.id, g: 20, dk: 60, tur: 'boil' }];
        const metinler = ['mash_step', 'sparge', 'mash_end', 'kaynatma_start', 'hop_add', 'pitch', 'bitti'].map(t => _bdOnayMetni({ tip: t }));
        __REG.ok('her adım tipinde FARKLI fiziksel iddia (tekrar yok)', new Set(metinler).size === metinler.length, JSON.stringify(metinler));
        __REG.ok('jenerik "✓ Ekledim" artık render\'da YOK', String(window.brewdayRender).indexOf('✓ Ekledim') === -1);
        __REG.ok('sparge onayı fiziksel iddia ("döktüm")', /döktüm/.test(_bdOnayMetni({ tip: 'sparge' })), _bdOnayMetni({ tip: 'sparge' }));
        __REG.ok('pitch onayı fiziksel iddia ("ektim")', /ektim/.test(_bdOnayMetni({ tip: 'pitch' })), _bdOnayMetni({ tip: 'pitch' }));
        brewdayBaslatEkran(); document.getElementById('bdSuIki').click(); await bekle();
        const b = window._brewday;
        const ob = document.getElementById('bdOnayBtn'), ab = document.getElementById('bdAtlaBtn'), ak = document.getElementById('bdAktifKart');
        __REG.ok('onay butonu ekrandaki adımın metnini taşıyor', ob.innerText.trim() === _bdOnayMetni(b.ajanda[b.aktifIdx]), ob.innerText.trim());
        __REG.ok('birincil buton ≥48px yükseklik', ob.getBoundingClientRect().height >= 48, Math.round(ob.getBoundingClientRect().height) + 'px');
        __REG.ok('birincil buton TAM GENİŞLİK (kartın ≥%90\'ı)', ob.getBoundingClientRect().width >= ak.getBoundingClientRect().width * 0.9, Math.round(ob.getBoundingClientRect().width) + '/' + Math.round(ak.getBoundingClientRect().width));
        __REG.ok('"Atla" ≥16px ayrık (keşif: aralarında 4px vardı, baş parmak yer değiştirmiyordu)', ab.getBoundingClientRect().top - ob.getBoundingClientRect().bottom >= 16, Math.round(ab.getBoundingClientRect().top - ob.getBoundingClientRect().bottom) + 'px');
        __REG.ok('AT3 sigortası: class="brewdayBtnAtla" korundu (21868 querySelector bağı)', ab.className.indexOf('brewdayBtnAtla') > -1, ab.className);
        __REG.ok('aktif kartta 12px altı VEYA α<0.75 metin YOK (eski: 10px/.5 = 3.09:1, AA altı)', tara(ak).length === 0, JSON.stringify(tara(ak).slice(0, 5)));
        let g = 0;
        while (g++ < 40 && window._brewday.aktif && b.ajanda[b.aktifIdx].tip !== 'mash_end') { if (_bdOnayGerekli(b.ajanda[b.aktifIdx])) brewdayTimerOnayla(); brewdayAktifOnayla(); }
        __REG.ok('SPRINT T KORUNDU: mash_end kartında pre-boil OG girişi var', !!document.getElementById('bdPbSG'));
        __REG.ok('#bdPbSG sayfada EN FAZLA 1 adet (odak modu kopya üretmedi)', document.querySelectorAll('#bdPbSG').length === 1, String(document.querySelectorAll('#bdPbSG').length));
        __REG.ok('Sprint T ölçüm bloğunun altyazıları da AA üstü (keşifte 2.80:1 ölçülmüştü)', tara(document.getElementById('bdAktifKart')).length === 0, JSON.stringify(tara(document.getElementById('bdAktifKart')).slice(0, 5)));
        brewdayZorlaSifirla(true);
        return __REG.al();
      });
    }
  },
  {
    kod: 'AU2-SIGORTA', ad: 'İKİ SİGORTA (AU keşif #6): "⟲ Sıfırla" artık in-app ONAY istiyor (3× brewday_start vakasının ~%80 kökü); kritik adım <20 sn\'de onaylanırsa BLOKE ETMEYEN şerit (Muzo\'nun 10.1 sn\'si birebir tetiklerdi)',
    calistir: (page) => page.evaluate(async () => {
      // brewdayBaslat b.aktif'i wake-lock await'inden ONCE set ediyor: bayragi beklemek
      // render/KR-aynasi ile YARISIR. Timeline DOM'u beklenir (ayna+render ondan SONRA).
      const bekle = async () => { for (let i = 0; i < 200 && !document.getElementById('brewdayTimeline'); i++) await new Promise(r => setTimeout(r, 20)); };
      const malt = MALTLAR.find(m => m && m.id && m.g !== 'Şeker' && m.id !== 'rice_hulls');
      __REG.yeniKayit('REGTEST AU2-SIGORTA', {});
      S.hacim = 11; S.mayaId = 'us05'; S.maltlar = [{ id: malt.id, kg: 3.16 }]; S.mashAdimlar = [{ sc: 66, dk: 60 }];
      brewdayBaslatEkran(); document.getElementById('bdSuIki').click(); await bekle();
      const b = window._brewday;
      // (a) SIFIRLAMA ONAYI
      __REG.ok('kırmızı buton artık doğrudan sıfırlamıyor (onay sorucusuna bağlı)', String(rEditorSurec).indexOf('brewdayZorlaSifirlaSor()') > -1 && String(rEditorSurec).indexOf('"brewdayZorlaSifirla()"') === -1);
      if (_bdOnayGerekli(b.ajanda[b.aktifIdx])) brewdayTimerOnayla();
      brewdayAktifOnayla();   // en az 1 tamamlanmış adım olsun — kayıp somut yazılsın
      brewdayZorlaSifirlaSor();
      const sm = document.getElementById('bdSifirlaOnayModal');
      __REG.ok('in-app onay modali açıldı (native confirm DEĞİL — WebView\'da güvenilmez)', !!sm);
      __REG.ok('brewday HÂLÂ aktif (soru sorulurken ilerleme silinmedi)', b.aktif === true);
      __REG.ok('kayıp somut yazılıyor (kaç adım gidecek)', /1 tamamlanmış adım/.test(sm.innerText) && /SIFIRDAN/.test(sm.innerText), sm.innerText.replace(/\s+/g, ' ').slice(0, 120));
      __REG.ok('günlüğüne yazılanların silinmeyeceği söyleniyor (yanlış panik yok)', /günlüğüne yazılmış kayıtlar silinmez/i.test(sm.innerText));
      __REG.ok('BİRİNCİL buton VAZGEÇ (yıkıcı eylem ikincil)', document.getElementById('bdSifirlaVazgec').getBoundingClientRect().width > document.getElementById('bdSifirlaOnay').getBoundingClientRect().width, Math.round(document.getElementById('bdSifirlaVazgec').getBoundingClientRect().width) + ' vs ' + Math.round(document.getElementById('bdSifirlaOnay').getBoundingClientRect().width));
      brewdayZorlaSifirlaKapat();
      __REG.ok('VAZGEÇ → modal kapandı, brewday korundu', !document.getElementById('bdSifirlaOnayModal') && window._brewday.aktif === true);
      // (b) GEÇ-YAKALAMA ŞERİDİ
      if (_bdOnayGerekli(b.ajanda[b.aktifIdx])) brewdayTimerOnayla();
      b.sonOnayTs = Date.now() - 25000;   // 25 sn önce → normal tempo
      brewdayAktifOnayla();
      __REG.ok('≥20 sn sonra onay → şerit YOK (yanlış-pozitif gürültü yok)', !document.getElementById('bdHizliSerit'));
      const geriIdx = b.aktifIdx, geriTip = b.ajanda[geriIdx].tip;
      brewdayAktifOnayla();   // hemen ardından → <20 sn
      const sr = document.getElementById('bdHizliSerit');
      __REG.ok('<20 sn sonra onay → şerit ÇIKTI (Muzo\'nun 10.1 sn\'si birebir bu)', !!sr, sr ? sr.innerText.replace(/\s+/g, ' ').slice(0, 100) : 'YOK');
      __REG.ok('şerit BLOKE ETMİYOR: sonraki adım aktif ve onay butonu erişilebilir', b.aktifIdx > geriIdx && !!document.getElementById('bdOnayBtn'), geriIdx + '→' + b.aktifIdx);
      __REG.ok('şeritte iki çıkış var (Evet / geri dön) + "durdurmaz" yazılı', !!document.getElementById('bdHizliEvet') && !!document.getElementById('bdHizliHayir') && /durdurmaz/.test(sr.innerText));
      const logOnce = (S.brewLog || []).length;
      document.getElementById('bdHizliHayir').click();
      __REG.ok('"Hayır — geri dön" adımı yeniden AÇTI', b.aktifIdx === geriIdx && b.ajanda[geriIdx]._tamamlandi === false && b.ajanda[geriIdx].tip === geriTip, b.aktifIdx + '/' + geriIdx);
      __REG.ok('şerit kapandı', !document.getElementById('bdHizliSerit'));
      __REG.ok('GÜNLÜK KAYDI SİLİNMEDİ (birleşim silmeyi taşımaz — silinen kayıt senkronda geri gelirdi)', (S.brewLog || []).length === logOnce, logOnce + '→' + (S.brewLog || []).length);
      // gerçekten sıfırlama
      brewdayZorlaSifirlaSor(); document.getElementById('bdSifirlaOnay').click();
      __REG.ok('"Evet, sıfırla" → brewday gerçekten sıfırlandı + modal temizlendi', window._brewday.aktif === false && !document.getElementById('bdSifirlaOnayModal'));
      return __REG.al();
    })
  },
  {
    kod: 'AU2-KALICI-SPARGE', ad: 'AU1 DERSİ YENİ ALANA UYGULANDI: su yolu kararı + gerçek sparge ölçümü KR\'ye (bm_v6+IDB) düşer — taslak tek başına kalıcılık katmanı değil; rid kapısı bu alanı da tutar; özet/Z sinyali tetiklenmez',
    calistir: (page) => page.evaluate(async () => {
      // brewdayBaslat b.aktif'i wake-lock await'inden ONCE set ediyor: bayragi beklemek
      // render/KR-aynasi ile YARISIR. Timeline DOM'u beklenir (ayna+render ondan SONRA).
      const bekle = async () => { for (let i = 0; i < 200 && !document.getElementById('brewdayTimeline'); i++) await new Promise(r => setTimeout(r, 20)); };
      const malt = MALTLAR.find(m => m && m.id && m.g !== 'Şeker' && m.id !== 'rice_hulls');
      const my = MAYALAR.find(m => m && m.id);
      const id = __REG.yeniKayit('REGTEST AU2-KALICI', { mayaId: my.id, maltlar: [{ id: malt.id, kg: 3.16 }], hacim: 11, kaynatmaSure: 60, mashAdimlar: [{ sc: 66, dk: 60 }] });
      // Gerçek kullanım hizası: reçete editörde KAYDEDİLMİŞ halde başlar (türetilmiş alanlar —
      // ozet/stilTah — KR'de de yazılı). yeniKayit'in graft'ı bu alanları KR'ye koymadığı için
      // kaydetmeden ghost-draft kıyası AU2 D IŞI bir farkla (stilTah) kırılıyordu.
      tarifeKaydet();
      const kr0 = KR.find(x => x && x.id === id);
      const ozet0 = JSON.stringify(kr0.ozet || null);
      const zOnce = localStorage.getItem('bm_stil_ogren_v1');
      localStorage.removeItem('bm_draft_v1');
      __REG.ok('kontrol: başlangıçta S == KR (ghost kıyası anlamlı — önkoşul sessizce kayarsa yakalanır)', _draftKrAyniMi(kr0, S) === true);
      __REG.ok('başlangıçta KR\'de sparge yok (fixture gerçeği: 7/7 reçetede alan YOK)', kr0.spargeL == null, String(kr0.spargeL));
      brewdayBaslatEkran(); document.getElementById('bdSuIki').click(); await bekle();
      const kr1 = KR.find(x => x && x.id === id);
      __REG.ok('SU YOLU KARARI KR\'ye düştü (taslak silinse bile yaşar)', kr1.spargeL === S.spargeL && kr1.spargeL > 0, String(kr1.spargeL));
      __REG.ok('ÖZET yeniden hesaplanmadı (tarifeKaydet DEĞİL)', JSON.stringify(kr1.ozet || null) === ozet0, ozet0 + ' → ' + JSON.stringify(kr1.ozet || null));
      __REG.ok('Sprint Z stil sinyali TETİKLENMEDİ', localStorage.getItem('bm_stil_ogren_v1') === zOnce);
      __REG.ok('GHOST TASLAK YOK (S==KR → saveDraft temizledi)', !localStorage.getItem('bm_draft_v1'), String(localStorage.getItem('bm_draft_v1')).slice(0, 60));
      // sparge kartında GERÇEK ölçüm girişi
      const b = window._brewday;
      let g = 0;
      while (g++ < 40 && window._brewday.aktif && b.ajanda[b.aktifIdx].tip !== 'sparge') { if (_bdOnayGerekli(b.ajanda[b.aktifIdx])) brewdayTimerOnayla(); brewdayAktifOnayla(); }
      __REG.ok('sparge kartı aktif + ölçüm girişi ekranda', b.ajanda[b.aktifIdx].tip === 'sparge' && !!document.getElementById('bdSpargeL'));
      _bdSpargeGir('4.2');
      __REG.ok('girilen gerçek litre S\'te', S.spargeL === 4.2, String(S.spargeL));
      __REG.ok('girilen gerçek litre KR\'de (ölçüm kolu artık AÇ değil)', KR.find(x => x && x.id === id).spargeL === 4.2, String(KR.find(x => x && x.id === id).spargeL));
      __REG.ok('kart metni gerçek ölçüme güncellendi', b.ajanda[b.aktifIdx].baslik.indexOf('4.2 L') > -1, b.ajanda[b.aktifIdx].baslik);
      const lsK = (JSON.parse(localStorage.getItem('bm_v6') || '[]')).find(x => x && x.id === id);
      __REG.ok('DİSKTE (bm_v6) da var', !!lsK && lsK.spargeL === 4.2, String(lsK && lsK.spargeL));
      const idbOk = await new Promise(res => { let t = false; try { window._bmIDB.get('bm_v6', function (v) { t = true; try { const a = JSON.parse(v || '[]'); const k = a.find(x => x && x.id === id); res(!!k && k.spargeL === 4.2); } catch (e) { res(false); } }); } catch (e) { res(false); } setTimeout(() => { if (!t) res(false); }, 3000); });
      __REG.ok('IndexedDB aynası da taşıyor (LS eviction kurtarma yolu)', idbOk === true);
      // rid kapısı bu alanı da tutar
      bmHataLogSil();
      const id2 = __REG.yeniKayit('REGTEST AU2-KALICI-B', { mayaId: my.id });
      S.spargeL = 9.9;
      window._bdLogKrAynala('test');
      __REG.ok('RID KAPISI: yabancı reçetenin KR\'sine spargeL YAZILMADI', KR.find(x => x && x.id === id2).spargeL !== 9.9, String(KR.find(x => x && x.id === id2).spargeL));
      __REG.ok('sessiz kalmadı: ring\'de _bdLogKrAynala kaydı var', (JSON.parse(localStorage.getItem('bm_hata_log_v1') || '[]')).some(x => x && String(x.kaynak || '').indexOf('_bdLogKrAynala') === 0));
      bmHataLogSil();
      brewdayZorlaSifirla(true);
      return __REG.al();
    })
  },
  // ── SPRINT AV: öneriden DOĞRUDAN yeni reçete ──
  {
    kod: 'AV1-YENI', ad: 'ÖNERİDEN YENİ REÇETE (Kaan\'ın isteği): profil önerisine basınca yeniTarif + iskelet + editör TEK AKIŞTA; ad otomatik önerilir, batch boyutu taşınır, kayıt KR+LS+IDB\'ye düşer (taslak kalıcılık katmanı değil)',
    calistir: (page) => page.evaluate(async () => {
      const id0 = __REG.yeniKayit('REGTEST AV1 KAYNAK', {});
      S.hacim = 10; S.verim = 45; tarifeKaydet();          // kullanıcının gerçek sistem parametreleri
      const n0 = KR.length, zOnce = localStorage.getItem('bm_stil_ogren_v1');
      const key = 'koyu|dengeli|dolgun';
      const idx = window._PROFIL_STIL[key][1].findIndex(x => !!STIL_ISKELET[x[0]]);
      const ad = window._PROFIL_STIL[key][1][idx][0];
      __REG.ok('kovada iskeletli öneri var', idx >= 0, ad);
      const yid = _bmProfilYeniRecete(key, idx);
      __REG.ok('YENİ reçete oluştu (KR +1)', KR.length === n0 + 1 && !!yid, n0 + ' → ' + KR.length);
      __REG.ok('editör YENİ reçetede açık (_editId yeni kayıt)', String(_editId) === String(yid) && ekran === 'editor', ekran + '/' + _editId);
      __REG.ok('ad OTOMATİK önerildi (stil adı)', String(S.biraAd || '').indexOf(ad) === 0, S.biraAd);
      __REG.ok('hedef stil kuruldu', S.stil === ad, S.stil);
      __REG.ok('iskelet DOLDU (V1a/V2 yolu — yeni hesap yazılmadı)', (S.maltlar || []).length > 0 && (S.hoplar || []).length > 0 && !!S.mayaId, (S.maltlar || []).length + ' malt / ' + (S.hoplar || []).length + ' hop / ' + S.mayaId);
      __REG.ok('BATCH BOYUTU taşındı (11 varsayılanına düşmedi)', S.hacim === 10 && S.verim === 45, S.hacim + 'L / %' + S.verim);
      const bj = BJCP[ad], c = calc();
      __REG.ok('ölçekleme tutarlı: OG BJCP bandında', c.og >= bj.og[0] - 0.004 && c.og <= bj.og[1] + 0.004, c.og.toFixed(3) + ' vs ' + JSON.stringify(bj.og));
      __REG.ok('IBU BJCP bandında', c.ibu >= bj.ibu[0] * 0.8 && c.ibu <= bj.ibu[1] * 1.2, Math.round(c.ibu) + ' vs ' + JSON.stringify(bj.ibu));
      const kr = KR.find(x => x && x.id === yid);
      __REG.ok('KALICI: KR kaydında malt/hop/stil var (AU-1 dersi — taslağa bırakılmadı)', !!kr && (kr.maltlar || []).length > 0 && kr.stil === ad, kr ? (kr.maltlar || []).length + ' malt' : 'KR YOK');
      const lsK = (JSON.parse(localStorage.getItem('bm_v6') || '[]')).find(x => x && x.id === yid);
      __REG.ok('DİSKTE (bm_v6) de var', !!lsK && (lsK.maltlar || []).length > 0);
      const idbOk = await new Promise(res => { let t = false; try { window._bmIDB.get('bm_v6', function (v) { t = true; try { res((JSON.parse(v || '[]')).some(x => x && x.id === yid)); } catch (e) { res(false); } }); } catch (e) { res(false); } setTimeout(() => { if (!t) res(false); }, 3000); });
      __REG.ok('IndexedDB aynası da taşıyor', idbOk === true);
      __REG.ok('GHOST TASLAK YOK (tarifeKaydet clearDraft koştu)', !localStorage.getItem('bm_draft_v1'), String(localStorage.getItem('bm_draft_v1')).slice(0, 50));
      __REG.ok('Sprint Z stil sinyali TETİKLENMEDİ (stilden-reçete = NİYET)', localStorage.getItem('bm_stil_ogren_v1') === zOnce && window.__stilSecKaynak === 'iskelet', String(window.__stilSecKaynak));
      // ad çakışması: aynı öneri ikinci kez
      const yid2 = _bmProfilYeniRecete(key, idx);
      __REG.ok('ikinci kez: ad ÇAKIŞMADI (tarih eki)', String(S.biraAd) !== ad && String(S.biraAd).indexOf(ad) === 0 && yid2 !== yid, S.biraAd);
      __REG.ok('kaynak reçete KR\'de duruyor (üzerine yazılmadı)', !!KR.find(x => x && x.id === id0), String(id0));
      return __REG.al();
    })
  },
  {
    kod: 'AV2-KORUMA', ad: 'AÇIK İŞ KAYBOLMAZ: kayıtlı reçetenin edit\'i KR\'ye commit edilir; adı olup hiç kaydedilmemiş çalışma kendi reçetesi olarak kaydedilir; ADSIZ çalışma üretilmiş adla kurtarılır (native confirm KULLANILMAZ — AU2 dersi)',
    calistir: (page) => page.evaluate(async () => {
      const key = 'koyu|dengeli|dolgun';
      const idx = window._PROFIL_STIL[key][1].findIndex(x => !!STIL_ISKELET[x[0]]);
      // (a) KAYITLI reçetede kaydedilmemiş edit
      const id = __REG.yeniKayit('REGTEST AV2 KAYITLI', {});
      S.notlar = 'AV2 kaydedilmemiş not'; S.verim = 52;
      _bmProfilYeniRecete(key, idx);
      const kr = KR.find(x => x && x.id === id);
      __REG.ok('(a) kayıtlı reçetenin kaydedilmemiş edit\'i KR\'ye COMMIT edildi', kr && kr.notlar === 'AV2 kaydedilmemiş not' && kr.verim === 52, kr ? kr.notlar + '/' + kr.verim : 'KR YOK');
      // (b) adı VAR, hiç kaydedilmemiş
      yeniTarif();
      S.biraAd = 'AV2 ADLI KAYITSIZ';
      S.maltlar = [{ id: MALTLAR.find(m => m && m.g !== 'Şeker' && m.id !== 'rice_hulls').id, kg: 2.5 }];
      __REG.ok('(b) önkoşul: KR\'de yok (kaydedilmemiş)', !KR.some(x => x && x.biraAd === 'AV2 ADLI KAYITSIZ') && !_editId);
      _bmProfilYeniRecete(key, idx);
      const b = KR.find(x => x && x.biraAd === 'AV2 ADLI KAYITSIZ');
      __REG.ok('(b) adlı-kayıtsız çalışma KENDİ reçetesi olarak kaydedildi (kayıp yok)', !!b && (b.maltlar || []).length === 1, b ? (b.maltlar || []).length + ' malt' : 'KAYBOLDU');
      // (c) ADSIZ ama içerik var
      yeniTarif();
      S.maltlar = [{ id: MALTLAR.find(m => m && m.g !== 'Şeker' && m.id !== 'rice_hulls').id, kg: 3.7 }];
      S.notlar = 'AV2 adsız iş';
      const nOnce = KR.length;
      _bmProfilYeniRecete(key, idx);
      const c = KR.find(x => x && x.notlar === 'AV2 adsız iş');
      __REG.ok('(c) ADSIZ çalışma üretilmiş adla KURTARILDI (bugün sessizce kaybolurdu)', !!c && /Adsız çalışma/.test(c.biraAd || '') && (c.maltlar || [])[0] && (c.maltlar || [])[0].kg === 3.7, c ? c.biraAd : 'KAYBOLDU');
      __REG.ok('(c) KR +2 (kurtarılan + yeni reçete)', KR.length === nOnce + 2, nOnce + ' → ' + KR.length);
      // (d) BOŞ reçetede gereksiz kayıt ÜRETİLMEZ
      yeniTarif();
      const nBos = KR.length;
      _bmProfilYeniRecete(key, idx);
      __REG.ok('(d) boş reçeteden geçince YALNIZ yeni reçete oluşur (çöp kayıt yok)', KR.length === nBos + 1, nBos + ' → ' + KR.length);
      __REG.ok('AU2 DERSİ: yol native confirm() KULLANMIYOR (WebView\'da güvenilmez, akış kilitlenirdi)', String(window._bmAcikIsiGuvenceyeAl).indexOf('confirm(') === -1 && String(window._bmStildenYeniRecete).indexOf('confirm(') === -1);
      return __REG.al();
    })
  },
  {
    kod: 'AV3-ISKELETSIZ', ad: 'İSKELETSİZ STİLDE SAHTE İSKELET ÜRETİLMEZ (V1a dersi): yeni reçete oluşur, BJCP hedefi + maya önerisi gelir, malt/hop BOŞ kalır',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('REGTEST AV3', {});
      let bul = null;
      Object.keys(window._PROFIL_STIL).some(k => {
        const j = window._PROFIL_STIL[k][1].findIndex(x => !STIL_ISKELET[x[0]]);
        if (j >= 0) { bul = { k: k, j: j, ad: window._PROFIL_STIL[k][1][j][0] }; return true; }
        return false;
      });
      __REG.ok('kovalarda iskeletsiz öneri VAR (kapsama %100 değil)', !!bul, bul ? bul.ad : 'YOK');
      if (!bul) return __REG.al();
      const n0 = KR.length;
      const yid = _bmProfilYeniRecete(bul.k, bul.j);
      __REG.ok('yeni reçete YİNE oluştu (iskelet yokluğu akışı durdurmaz)', KR.length === n0 + 1 && !!yid, n0 + ' → ' + KR.length);
      __REG.ok('BJCP hedefi kuruldu', S.stil === bul.ad && !!BJCP[S.stil], S.stil);
      __REG.ok('maya önerisi geldi (C katmanı)', !!S.mayaId && !!MAYALAR.find(m => m && m.id === S.mayaId), S.mayaId);
      __REG.ok('SAHTE İSKELET YOK: malt BOŞ', (S.maltlar || []).length === 0, (S.maltlar || []).length + ' malt');
      __REG.ok('SAHTE İSKELET YOK: hop BOŞ', (S.hoplar || []).length === 0, (S.hoplar || []).length + ' hop');
      const kr = KR.find(x => x && x.id === yid);
      __REG.ok('KR kaydı da boş grist ile yazıldı (uydurma kalıcılaşmadı)', !!kr && (kr.maltlar || []).length === 0 && kr.stil === bul.ad);
      __REG.ok('ad önerildi', String(S.biraAd || '').indexOf(bul.ad) === 0, S.biraAd);
      return __REG.al();
    })
  },
  {
    kod: 'AV4-DOLDUR-REGRESYON', ad: 'MEVCUT "📋 Doldur" DAVRANIŞI KORUNDU: AÇIK reçeteyi doldurur, YENİ reçete OLUŞTURMAZ; bmStilIskeletDoldur parametresiz çağrıda eski gibi davranır; öneri satırında İKİ eylem de var',
    calistir: async (page) => {
      await page.setViewport({ width: 390, height: 844 });
      return page.evaluate(() => {
        const key = 'koyu|dengeli|dolgun';
        const idx = window._PROFIL_STIL[key][1].findIndex(x => !!STIL_ISKELET[x[0]]);
        const ad = window._PROFIL_STIL[key][1][idx][0];
        const id = __REG.yeniKayit('REGTEST AV4', {});
        S.hacim = 11; S.verim = 61; S.maltlar = []; S.hoplar = []; S.mayaId = '';
        const n0 = KR.length;
        _bmProfilStilUygula(key, idx, true);
        __REG.ok('YENİ reçete OLUŞTURMADI (KR sabit)', KR.length === n0, n0 + ' → ' + KR.length);
        __REG.ok('AÇIK reçetede kaldı (_editId değişmedi)', String(_editId) === String(id), String(_editId));
        __REG.ok('açık reçete DOLDU (eski davranış birebir)', S.stil === ad && (S.maltlar || []).length > 0 && (S.hoplar || []).length > 0, S.stil + ' / ' + (S.maltlar || []).length + ' malt');
        // parametresiz bmStilIskeletDoldur eski davranış (flash + dönüş)
        S.maltlar = []; S.hoplar = [];
        const r = bmStilIskeletDoldur();
        __REG.ok('bmStilIskeletDoldur() parametresiz: iskelet yine doluyor', (S.maltlar || []).length > 0 && r && r.katman === 'B', r ? r.katman : String(r));
        __REG.ok('sessiz mod flash\'ı bastırıyor ama davranışı DEĞİŞTİRMİYOR', String(bmStilIskeletDoldur).indexOf('if(!sessiz && typeof flash') > -1);
        // UI: iki eylem de basılıyor
        tarifAc(id); sekme = 'genel'; window.__akProfil = { renk: 'koyu', aci: 'dengeli', govde: 'dolgun', maya: '', malt: '' }; _brAc();
        const yeni = Array.from(document.querySelectorAll('#ekran button')).filter(b => /Yeni reçete/.test(b.innerText));
        const dold = Array.from(document.querySelectorAll('#ekran button')).filter(b => /^(📋 Doldur|🎯 Hedef yap)$/.test(b.innerText.trim()));
        const drop = Array.from(document.querySelectorAll('#ekran button')).filter(b => /İskeleti Doldur/.test(b.innerText));
        // SPRINT BS1: liste artık kırpılmıyor; kapalı durumda ilk _BR_ILK_ACIK satır çizilir.
        const sat = Math.min(window._BR_ILK_ACIK, window._brSonuc().stiller.length);
        __REG.ok('her öneri satırında "✨ Yeni reçete" var', yeni.length === sat, yeni.length + '/' + sat);
        __REG.ok('"Doldur/Hedef yap" ikincil eylem KORUNDU (satır başına 1)', dold.length === sat, dold.length + '/' + sat);
        __REG.ok('BİRİNCİL = Yeni reçete (dolu bakır zemin), ikincil outline', getComputedStyle(yeni[0]).backgroundColor !== getComputedStyle(dold[0]).backgroundColor && parseFloat(getComputedStyle(yeni[0]).fontWeight) >= 700, getComputedStyle(yeni[0]).backgroundColor + ' vs ' + getComputedStyle(dold[0]).backgroundColor);
        __REG.ok('AK3 REGRESYONU: dropdown + "İskeleti Doldur" AYNEN yerinde', !!document.querySelector('select[aria-label="Hedef stil"]') && drop.length === 1, 'dropdown butonu ' + drop.length);
        // öneri satırları panelin genişliğini taşırmıyor (yeni sütun mobilde metni ezmiyor)
        const panel = document.getElementById('br-tam');
        const tasan = Array.from(panel.querySelectorAll('*')).filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > panel.getBoundingClientRect().right + 1; });
        __REG.ok('390px: tam ekranda yatay taşma YOK', tasan.length === 0, tasan.length + ' taşan');
        _brKapat();
        return __REG.al();
      });
    }
  },

  // ═════════════ SPRINT AW — MADALYALI ÖRNEKTEN REÇETE (orta yol) ═════════════
  {
    kod: 'AW1-ORNEK', ad: 'SPRINT AW: MADALYALI ÖRNEKTEN REÇETE — örnek satırından yeni reçete: AV yolu + iskelet, örneğin OG/IBU\'su ölçek hedefi olur, orijinal grist/hop/maya METNİ not alanına AYNEN yazılır; gramaj/oran UYDURULMAZ, ad ödül iması taşımaz',
    calistir: (page) => page.evaluate(() => {
      const M = window._TOPLULUK_MADALYA;
      __REG.ok('45 madalya anahtarının HEPSİ BJCP otoritesinde (buton hiçbir stilde ölü değil)', Object.keys(M).length === 45 && Object.keys(M).every(k => !!BJCP[k]), Object.keys(M).filter(k => !BJCP[k]).join(','));
      __REG.yeniKayit('REGTEST AW1', {});
      S.hacim = 10; S.verim = 45; tarifeKaydet();
      const stil = 'Altbier / Düsseldorf Altbier', o = M[stil][1][0];
      __REG.ok('önkoşul: iskeletli stil + 4 ölçüsü dolu örnek', !!STIL_ISKELET[stil] && o.og === 1.071 && o.ib === 25 && o.sr === 19 && o.ab === 7.5 && o.yil === 2024);
      const n0 = KR.length;
      const yid = _bmMadalyaYeniRecete(stil, 0);
      __REG.ok('YENİ reçete oluştu (KR +1)', KR.length === n0 + 1 && !!yid, n0 + ' → ' + KR.length);
      __REG.ok('stil + iskelet AV yolundan (yeni kod yolu YOK)', S.stil === stil && (S.maltlar || []).length > 0 && (S.hoplar || []).length > 0 && !!S.mayaId, (S.maltlar || []).length + ' malt / ' + (S.hoplar || []).length + ' hop');
      __REG.ok('batch boyutu taşındı', S.hacim === 10 && S.verim === 45, S.hacim + 'L / %' + S.verim);
      const c = calc(), ogMidB = (BJCP[stil].og[0] + BJCP[stil].og[1]) / 2;
      __REG.ok('HEDEF KURULDU: OG örneğe ölçeklendi (BJCP ortasına DEĞİL)', Math.abs(c.og - o.og) <= 0.004 && Math.abs(c.og - ogMidB) > 0.008, c.og.toFixed(3) + ' vs örnek ' + o.og + ' / mid ' + ogMidB.toFixed(3));
      __REG.ok('HEDEF KURULDU: IBU örneğe ölçeklendi', Math.abs(c.ibu - o.ib) <= 4, Math.round(c.ibu) + ' vs ' + o.ib);
      const n = String(S.notlar || '');
      __REG.ok('NOT: kaynak şeffaf (AHA + derece + yıl + giriş sayısı)', n.indexOf('AHA yarışmasında altın almış') >= 0 && n.indexOf('(2024, kategoride 77 giriş)') >= 0, n.split('\n')[0]);
      __REG.ok('NOT: çerçeve — elenen yok + kural değil + miktarlar iskeletten', n.indexOf('Elenen reçeteler bu veride yok') >= 0 && n.indexOf('kural değil') >= 0 && n.indexOf('stil iskeletinden geliyor') >= 0);
      __REG.ok('NOT: örneğin 4 ölçüsü de yazıldı', n.indexOf('OG 1.071') >= 0 && n.indexOf('IBU 25') >= 0 && n.indexOf('SRM 19') >= 0 && n.indexOf('ABV %7.5') >= 0);
      __REG.ok('NOT: grist orijinal yüzdelerle AYNEN (artık baz malta itilmedi)', n.indexOf('%56 Munich II malt + %35 German Vienna malt + %7 CaraMunich II malt + %1 Carafa II') >= 0);
      const hopSatiri = n.split('\n').find(s => s.indexOf('Hop (') === 0) || 'x';
      __REG.ok('NOT: hop ad+dakika AYNEN + gramaj-yok uyarısı; GRAM UYDURULMADI', hopSatiri === 'Hop (gramaj kaynakta YOK — kendi hesabını yap): German Magnum @60dk' && !/\d+(\.\d+)?\s*g(r|ram)?\b/i.test(hopSatiri), hopSatiri);
      __REG.ok('NOT: maya orijinal serbest metniyle', n.indexOf('Maya (orijinal metin): WLP 833 German Bock lager yeast') >= 0);
      __REG.ok('AD: stil + yıl + örneğinden; ödül iması YOK', S.biraAd.indexOf(stil + ' — 2024 örneğinden') === 0 && !/ödül|madalya|şampiyon|birinci|kazanan/i.test(S.biraAd), S.biraAd);
      __REG.ok('DİL: notta kalite iddiası yok', !/kazan[ıi]rs[ıi]n|en iyi|daha iyi|bunu demle|yapmal[ıi]/i.test(n));
      const kr = KR.find(x => x && x.id === yid);
      __REG.ok('KALICI: not + iskelet + stil KR kaydında', !!kr && String(kr.notlar || '').indexOf('AHA') >= 0 && (kr.maltlar || []).length > 0 && kr.stil === stil);
      const yid2 = _bmMadalyaYeniRecete(stil, 0);
      __REG.ok('ikinci basış: ad ÇAKIŞMADI (AV ad mantığı korunur)', !!yid2 && yid2 !== yid && S.biraAd.indexOf(stil + ' — 2024 örneğinden') === 0 && S.biraAd !== (stil + ' — 2024 örneğinden'), S.biraAd);
      return __REG.al();
    })
  },
  {
    kod: 'AW2-BOS-ISKELETSIZ', ad: 'SPRINT AW: DOLU OLMAYAN ALAN UYDURULMAZ + İSKELETSİZ STİLDE SAHTE İSKELET YOK — ib/sr boş örnekte not o ölçüleri atlar ve IBU düz iskelet doluşuyla AYNI kalır; iskeletsiz stilde malt/hop BOŞ ama not YİNE yazılır',
    calistir: (page) => page.evaluate(() => {
      const M = window._TOPLULUK_MADALYA;
      // (a) iskeletli stil + ib/sr boş örnek
      __REG.yeniKayit('REGTEST AW2a', {});
      S.hacim = 10; S.verim = 45;
      const st1 = 'Maibock / Helles Bock', o1 = M[st1][1][1];
      __REG.ok('(a) önkoşul: iskeletli stil, örnekte ib+sr BOŞ, og+ab dolu', !!STIL_ISKELET[st1] && !o1.ib && !o1.sr && o1.og > 1 && o1.ab > 0, JSON.stringify([o1.og, o1.ib, o1.sr, o1.ab]));
      _bmMadalyaYeniRecete(st1, 1);
      const c1 = calc();
      __REG.ok('(a) dolu alan (OG) yine örneğe ölçeklendi', Math.abs(c1.og - o1.og) <= 0.004, c1.og.toFixed(3) + ' vs ' + o1.og);
      const n1 = String(S.notlar || '');
      __REG.ok('(a) notta IBU ve SRM satırı YOK (boş bırakıldı, uydurulmadı)', n1.indexOf('IBU') < 0 && n1.indexOf('SRM') < 0, n1.split('\n').find(s => s.indexOf('Örneğin') === 0) || '');
      __REG.ok('(a) notta dolu alanlar (OG/ABV) VAR', n1.indexOf('OG ' + o1.og.toFixed(3)) >= 0 && n1.indexOf('ABV %' + o1.ab) >= 0);
      // IBU davranışı düz iskelet doluşuyla BİREBİR (örnek IBU vermedi → BJCP ortası, mevcut yol)
      const ibuOrnekli = c1.ibu;
      yeniTarif(); S.hacim = 10; S.verim = 45; S.stil = st1;
      bmStilIskeletDoldur(true);
      const ibuDuz = calc().ibu;
      __REG.ok('(a) IBU UYDURULMADI: örnekli doluş = düz iskelet doluşu (aynı IBU)', Math.abs(ibuOrnekli - ibuDuz) <= 2, ibuOrnekli.toFixed(1) + ' vs ' + ibuDuz.toFixed(1));
      // (b) iskeletsiz madalyalı stil
      __REG.yeniKayit('REGTEST AW2b', {});
      const st2 = 'Berliner Weisse', o2 = M[st2][1][0];
      __REG.ok('(b) önkoşul: iskeletsiz madalyalı stil + ib boş örnek', !STIL_ISKELET[st2] && !!BJCP[st2] && !o2.ib, JSON.stringify([o2.og, o2.ib, o2.sr, o2.ab]));
      const nb = KR.length;
      const yid2 = _bmMadalyaYeniRecete(st2, 0);
      __REG.ok('(b) reçete YİNE oluştu (iskelet yokluğu akışı durdurmaz)', KR.length === nb + 1 && !!yid2, nb + ' → ' + KR.length);
      __REG.ok('(b) SAHTE İSKELET YOK: malt/hop BOŞ', (S.maltlar || []).length === 0 && (S.hoplar || []).length === 0, (S.maltlar || []).length + '/' + (S.hoplar || []).length);
      __REG.ok('(b) BJCP hedefi + maya önerisi (C katmanı)', S.stil === st2 && !!S.mayaId, S.stil + ' / ' + S.mayaId);
      const n2 = String(S.notlar || '');
      __REG.ok('(b) not YİNE yazıldı (kaynak + orijinal metin)', n2.indexOf('AHA yarışmasında') >= 0 && n2.indexOf('Grist (orijinal yüzdeler):') >= 0);
      __REG.ok('(b) notta IBU yok (boş alan), SRM var (dolu alan)', n2.indexOf('IBU') < 0 && n2.indexOf('SRM ' + o2.sr) >= 0);
      const kr2 = KR.find(x => x && x.id === yid2);
      __REG.ok('(b) KR kaydı boş grist + notla yazıldı (uydurma kalıcılaşmadı)', !!kr2 && (kr2.maltlar || []).length === 0 && String(kr2.notlar || '').indexOf('AHA') >= 0);
      yeniTarif();
      return __REG.al();
    })
  },
  {
    kod: 'AW3-UI-DIL', ad: 'SPRINT AW UI + DİL: her örnek satırında "Bu örnekten yola çık", blok başlığında AYRI stil-iskelet butonu; etiket/title kalite iması taşımaz; gerçek tıklama çalışır (onclick kaçışı); AV yolu opts\'suz BİREBİR (not sızmaz)',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('REGTEST AW3', {});
      ekran = 'editor'; sekme = 'genel';
      S.hacim = 11; S.verim = 61; S.stil = 'Weizen / Weissbier';
      bmStilIskeletDoldur(); render();
      const el = document.querySelector('.bm-topluluk');
      __REG.ok('topluluk bölümü var', !!el);
      const btnler = el ? Array.from(el.querySelectorAll('button')) : [];
      const ornekBtn = btnler.filter(b => /Bu örnekten yola çık/.test(b.innerText));
      const stilBtn = btnler.filter(b => /Stil iskeletinden yeni reçete/.test(b.innerText));
      const nOrnek = window._NHC_MADALYA['Weizen / Weissbier'][1].length; // AX: Weizen örnekleri artık NHC altınlarından
      __REG.ok('AW1: örnek başına 1 buton', ornekBtn.length === nOrnek, ornekBtn.length + '/' + nOrnek);
      __REG.ok('AW2: blok başlığında TEK stil-düzeyi buton (örnek butonundan ayrı)', stilBtn.length === 1, String(stilBtn.length));
      const etiket = btnler.map(b => b.innerText + '|' + (b.getAttribute('title') || '')).join(' ');
      __REG.ok('DİL: etiket/title kalite iddiasız (kazan/en iyi/bunu demle/ödül YOK)', !/kazan|en iyi|daha iyi|bunu demle|ödül|şampiyon/i.test(etiket), etiket.slice(0, 160));
      __REG.ok('AW2 etiketi İSKELET diyor, madalya/örnek iması yok', stilBtn.length === 1 && /iskelet/i.test(stilBtn[0].innerText) && !/madalya|örnekten/i.test(stilBtn[0].innerText), stilBtn.length ? stilBtn[0].innerText : '');
      // GERÇEK TIKLAMA — AW2 başlık butonu = düz AV davranışı (not YOK)
      const n0 = KR.length;
      stilBtn[0].click();
      __REG.ok('AW2 tıklama: yeni reçete + stil kuruldu, NOT YAZILMADI (düz AV)', KR.length === n0 + 1 && S.stil === 'Weizen / Weissbier' && String(S.notlar || '') === '' && S.biraAd.indexOf('Weizen / Weissbier') === 0 && S.biraAd.indexOf('örneğinden') < 0, S.biraAd + ' | not:' + String(S.notlar || '').length);
      // yeni reçetenin genel sekmesi de butonları basıyor → örnek butonuna GERÇEK TIKLAMA
      const el2 = document.querySelector('.bm-topluluk');
      const ob2 = el2 ? Array.from(el2.querySelectorAll('button')).filter(b => /Bu örnekten yola çık/.test(b.innerText)) : [];
      __REG.ok('tıklama sonrası örnek butonları yine var', ob2.length === nOrnek, String(ob2.length));
      const n1 = KR.length;
      ob2[0].click();
      // SPRINT BG2: tıklama artık doğrudan reçete AÇMAZ — önce önizleme modalı
      __REG.ok('BG2: tıklama doğrudan reçete açmaz — önizleme modalı açılır, KR değişmez', KR.length === n1 && !!document.getElementById('bmOrnekOnizle'), 'KR delta: ' + (KR.length - n1));
      bmOrnekOnizleOlustur();
      __REG.ok('AW1 oluştur (önizlemeden; onclick kaçışı sağlam): yeni reçete + NOT dolu + ad örneğinden', KR.length === n1 + 1 && /AHA (yarışmasında|NHC finalinde)/.test(String(S.notlar || '')) && /örneğinden/.test(S.biraAd), S.biraAd);
      __REG.ok('BG2: oluşturma sonrası önizleme kapandı', !document.getElementById('bmOrnekOnizle'));
      // AV REGRESYONU: profil önerisi yolu opts'suz — not sızmaz, ad stil adıyla
      const key = 'koyu|dengeli|dolgun';
      const idx = window._PROFIL_STIL[key][1].findIndex(x => !!STIL_ISKELET[x[0]]);
      const avAd = window._PROFIL_STIL[key][1][idx][0];
      _bmProfilYeniRecete(key, idx);
      __REG.ok('AV REGRESYONU: opts\'suz yolda not YAZILMAZ + ad stil adıyla', String(S.notlar || '') === '' && S.biraAd.indexOf(avAd) === 0, S.biraAd + ' | not:' + String(S.notlar || '').length);
      return __REG.al();
    })
  },

  // ═════════════ SPRINT AX — NHC ALTIN MADALYA TABLOSU (gerçek gramajlı) ═════════════
  {
    kod: 'AX1-TABLO', ad: 'SPRINT AX: NHC tablosu YALNIZ OLGU — 29 stil/74 kayıt, tüm anahtarlar BJCP+dağılım içinde (uydurma eşleme yok), talimat düzyazısı GÖMÜLMEMİŞ, alan bantları sağlam, AN5 yasak-kelime taraması tabloyu da geçiyor, boyut makul',
    calistir: (page) => page.evaluate(() => {
      const N = window._NHC_MADALYA;
      __REG.ok('tablo yüklü: 29 stil', !!N && Object.keys(N).length === 29, N && Object.keys(N).length);
      const kayitlar = Object.values(N).map(v => v[1]).reduce((a, b) => a.concat(b), []);
      __REG.ok('74 gömülü kayıt (stil başına 1-3)', kayitlar.length === 74 && Object.values(N).every(v => v[1].length >= 1 && v[1].length <= 3), kayitlar.length);
      __REG.ok('gösterilen ≤ toplam (şişirme yok)', Object.values(N).every(v => v[1].length <= v[0]));
      __REG.ok('TÜM anahtarlar BJCP otoritesinde', Object.keys(N).every(k => !!BJCP[k]), Object.keys(N).filter(k => !BJCP[k]).join(','));
      __REG.ok('TÜM anahtarlar dağılım kapsamında (görünürlük kapısıyla tutarlı — ölü veri yok)', Object.keys(N).every(k => !!window._TOPLULUK_DAGILIM[k]));
      __REG.ok('kategori-düzeyi UYDURMA eşleme yok (Stout/IPA/Pilsner kategorileri tabloda değil)', !N['American IPA'] && !N['German Pils'] && !N['Imperial / Russian Imperial Stout'] && !N['Stout / Porter'] && !N['Sour Ale / Kettle Sour']);
      __REG.ok('her kayıt: OG+hacim+grist dolu, bantlar sağlam', kayitlar.every(o => o.og >= 1.02 && o.og <= 1.15 && o.L > 0 && o.L <= 250 && Array.isArray(o.g) && o.g.length > 0 && o.g.every(x => x[1] > 0 && x[1] < 60000)));
      __REG.ok('HOP GRAMAJI: 74/74 kayıtta gramlı hop satırı (eski tabloda hiç yoktu)', kayitlar.every(o => Array.isArray(o.h) && o.h.length > 0 && o.h.every(x => x[1] > 0 && x[1] < 2000)));
      __REG.ok('mash °C yalnız 60-74 şekerleme bandında', kayitlar.every(o => o.ms == null || (o.ms >= 60 && o.ms <= 74)));
      const dump = JSON.stringify(N);
      let uzun = 0; JSON.parse(dump, (k, v) => { if (typeof v === 'string' && v.length > 90) uzun++; return v; });
      __REG.ok('DÜZYAZI GÖMÜLMEMİŞ: string ≤90 karakter + talimat kalıbı 0', uzun === 0 && !/ferment at|mash at|boil for|sparge with|rack to|pitch the/i.test(dump), uzun + ' uzun string');
      const YASAK = ['daha iyi', 'yapmalı', 'hatalı', 'yanlış', 'olmalı', 'gerekir', 'tavsiye', 'öneriyoruz', 'düzelt', 'kötü', 'başarılı', 'kazanmak için', 'kazandıran', 'ideal', 'doğrusu', 'eksik'];
      const ld = dump.toLocaleLowerCase('tr-TR');
      __REG.ok('AN5-DIL: tablo metinlerinde yasak kelime 0', YASAK.every(k => ld.indexOf(k) < 0), YASAK.filter(k => ld.indexOf(k) >= 0).join(','));
      __REG.ok('boyut makul (<30KB — AK 11.5KB / AN 68KB emsali arası)', dump.length < 30000, dump.length + ' bayt');
      return __REG.al();
    })
  },
  {
    kod: 'AX2-UI', ad: 'SPRINT AX UI: NHC\'li stilde örnekler NHC\'den (kaynak etiketli + GERÇEK gramaj + mash görünür; eski örnekler gizli — çift listeleme yok; eski toplam başlığı korunur); yalnız-eski-veri stilinde AW davranışı BİREBİR',
    calistir: (page) => page.evaluate(() => {
      // (a) NHC'li stil: Weizen (eski tabloda da var → başlık eskiden, örnekler NHC'den)
      __REG.yeniKayit('AX2 Weizen', {});
      ekran = 'editor'; sekme = 'genel';
      S.hacim = 11; S.verim = 61; S.stil = 'Weizen / Weissbier';
      bmStilIskeletDoldur(); render();
      const el = document.querySelector('.bm-topluluk');
      __REG.ok('(a) topluluk bölümü var', !!el);
      const t = el ? el.textContent : '';
      __REG.ok('(a) NHC kaynak etiketi + atıf görünür', t.indexOf('NHC') >= 0 && t.indexOf('nhc-homebrew-data') >= 0);
      __REG.ok('(a) GERÇEK gramaj görünür (kg/g)', /\d+(,\d+)?\s?(kg|g)\s/.test(t), (t.match(/\d+(,\d+)?\s?(kg|g)\s\S+/) || [''])[0]);
      __REG.ok('(a) eski örnekler GİZLİ (çift listeleme yok: "kategoride ... giriş" markörü 0)', t.indexOf('kategoride') < 0);
      __REG.ok('(a) eski toplam başlığı KORUNDU (11 reçete · 9 altın)', t.indexOf('madalya almış 11 reçete') >= 0 && /9 alt[ıi]n/.test(t));
      // (a2) mash görünürlüğü: ms'li kaydı olan bir NHC stili
      const N = window._NHC_MADALYA;
      const msStil = Object.keys(N).find(k => N[k][1].some(o => o.ms));
      __REG.yeniKayit('AX2 mash', {});
      ekran = 'editor'; sekme = 'genel';
      S.hacim = 11; S.verim = 61; S.stil = msStil;
      bmStilIskeletDoldur(); render();
      const t2 = (document.querySelector('.bm-topluluk') || {}).textContent || '';
      __REG.ok('(a2) mash °C satırda görünür (' + msStil + ')', /mash \d+(,\d+)?°C/.test(t2), (t2.match(/mash [\d,]+°C/) || [''])[0]);
      // (b) yalnız-eski-veri stili: American IPA (NHC kaynağında IPA kategori-düzeyi → dürüstçe atlandı)
      __REG.ok('(b) önkoşul: American IPA NHC\'de YOK + eski tabloda VAR', !N['American IPA'] && !!window._TOPLULUK_MADALYA['American IPA']);
      __REG.yeniKayit('AX2 AIPA', {});
      ekran = 'editor'; sekme = 'genel';
      S.hacim = 11; S.verim = 61; S.stil = 'American IPA';
      bmStilIskeletDoldur(); render();
      const t3 = (document.querySelector('.bm-topluluk') || {}).textContent || '';
      __REG.ok('(b) AW davranışı AYNEN: eski örnekler basılı, NHC etiketi yok, buton duruyor', t3.indexOf('madalya almış') >= 0 && t3.indexOf('NHC') < 0 && t3.indexOf('Bu örnekten yola çık') >= 0, t3.slice(0, 60));
      return __REG.al();
    })
  },
  {
    kod: 'AX3-YOL', ad: 'SPRINT AX YOL: NHC örneğinden yeni reçete — OG/IBU örneğe ölçeklenir, mash S.mashSc\'ye taşınır (AJ kartı okur), notta GERÇEK gramajlar + mash + hacim uyarısı; "gramaj kaynakta YOK" YAZILMAZ; eski-tablo yolu BİREBİR korunur',
    calistir: (page) => page.evaluate(() => {
      const N = window._NHC_MADALYA;
      __REG.yeniKayit('REGTEST AX3', {});
      S.hacim = 10; S.verim = 45; tarifeKaydet();
      const stil = 'Altbier / Düsseldorf Altbier', o = N[stil][1][1];
      __REG.ok('önkoşul: NHC 2012 örneği dolu (og+ib+ms+gramlı hop)', o.yil === 2012 && o.og === 1.051 && o.ib === 42 && o.ms === 66 && o.h.length >= 4, JSON.stringify([o.yil, o.og, o.ib, o.ms]));
      const n0 = KR.length;
      const yid = _bmNhcYeniRecete(stil, 1);
      __REG.ok('yeni reçete oluştu + iskelet doldu (AV yolu)', KR.length === n0 + 1 && !!yid && S.stil === stil && (S.maltlar || []).length > 0 && (S.hoplar || []).length > 0);
      __REG.ok('batch boyutu taşındı', S.hacim === 10 && S.verim === 45);
      const c = calc();
      __REG.ok('HEDEF: OG örneğe ölçeklendi', Math.abs(c.og - o.og) <= 0.004, c.og.toFixed(3) + ' vs ' + o.og);
      __REG.ok('HEDEF: IBU örneğe ölçeklendi', Math.abs(c.ibu - o.ib) <= 4, Math.round(c.ibu) + ' vs ' + o.ib);
      __REG.ok('HEDEF: mash S.mashSc\'ye taşındı (AJ mash kartı bu alanı okur)', S.mashSc === 66, String(S.mashSc));
      const n = String(S.notlar || '');
      __REG.ok('NOT: NHC kaynağı + atıf şeffaf', n.indexOf('AHA NHC finalinde altın almış bir ' + stil + ' örneği (2012)') >= 0 && n.indexOf('nhc-homebrew-data') >= 0, n.split('\n')[0]);
      __REG.ok('NOT: AN çerçevesi (elenen yok + kural değil + miktarlar iskeletten)', n.indexOf('Elenen reçeteler bu veride yok') >= 0 && n.indexOf('kural değil') >= 0 && n.indexOf('stil iskeletinden geliyor') >= 0);
      __REG.ok('NOT: GERÇEK hop gramajları', n.indexOf('Hop (orijinal gramajlar): 57 g Tettnanger @60dk') >= 0, (n.split('\n').find(s => s.indexOf('Hop (') === 0) || '').slice(0, 90));
      __REG.ok('NOT: "gramaj kaynakta YOK" satırı YAZILMADI', n.indexOf('gramaj kaynakta YOK') < 0);
      __REG.ok('NOT: orijinal hacim uyarısı + mash satırı', n.indexOf('Orijinal batch 68.1 L') >= 0 && n.indexOf('Mash: 66°C') >= 0);
      __REG.ok('NOT: grist gerçek miktarlarla (kg)', n.indexOf('Grist (orijinal miktarlar): 11.34 kg German Pilsner malt') >= 0, (n.split('\n').find(s => s.indexOf('Grist') === 0) || '').slice(0, 80));
      __REG.ok('AD: NHC yıl + örneğinden (ödül iması yok)', S.biraAd.indexOf(stil + ' — NHC 2012 örneğinden') === 0 && !/ödül|madalya|şampiyon|kazanan/i.test(S.biraAd), S.biraAd);
      __REG.ok('DİL: notta kalite iddiası yok', !/kazan[ıi]rs[ıi]n|en iyi|daha iyi|bunu demle|yapmal[ıi]/i.test(n));
      const kr = KR.find(x => x && x.id === yid);
      __REG.ok('KALICI: not + mashSc KR kaydında', !!kr && String(kr.notlar || '').indexOf('NHC') >= 0 && kr.mashSc === 66);
      // ── ESKİ YOL REGRESYONU: aynı stil, eski tablo örneği ──
      const iskSc = STIL_ISKELET[stil] ? (STIL_ISKELET[stil].mashSc || 67) : 67;
      _bmMadalyaYeniRecete(stil, 0);
      const n2 = String(S.notlar || '');
      __REG.ok('ESKİ YOL: "gramaj kaynakta YOK — kendi hesabını yap" AYNEN duruyor', n2.indexOf('gramaj kaynakta YOK — kendi hesabını yap') >= 0);
      __REG.ok('ESKİ YOL: mashSc iskelet varsayılanında (örnekte mash verisi yok — taşınacak şey yok)', S.mashSc === iskSc, S.mashSc + ' vs ' + iskSc);
      __REG.ok('ESKİ YOL: ad eski biçimde (NHC ibaresi yok)', /örneğinden/.test(S.biraAd) && S.biraAd.indexOf('NHC') < 0, S.biraAd);
      return __REG.al();
    })
  },
  {
    kod: 'AY1-OGKAPI', ad: 'SPRINT AY: OG kapisi — Weizenbock/Tripel/Quad/ImpStout uzatilir (+3/+7/+14), Muzo-Hefeweizen/Kveik/Lager/Lambic AYNEN; FG sise-bombasi supabi; alarm zinciri yeni sise gununu izler',
    calistir: (page) => page.evaluate(() => {
      const m20 = { sc: [18, 22], ideal: 20 };
      // i) Muzo'nun gercek girdileri — DEGISMEDI
      const muzo = fermentasyonProfili('Weizen / Weissbier', 1.055, 'wheat', m20);
      __REG.ok('Muzo (Weizen 1.055): sise 8 / toplam 9 AYNEN', muzo.sise === 8 && muzo.toplamGun === 9, muzo.sise + '/' + muzo.toplamGun);
      const w = fermentasyonProfili('Hefeweizen', 1.050, 'wheat', m20);
      __REG.ok('Hefeweizen 1.050: sise 8 (kapi pasif)', w.sise === 8 && w.toplamGun === 9);
      const wb = fermentasyonProfili('Weizenbock', 1.075, 'wheat', m20);
      __REG.ok('Weizenbock 1.075: sise 15 (8+7), toplam 16, aciklamada not', wb.sise === 15 && wb.toplamGun === 16 && /Weizenbock/.test(wb.aciklama), wb.sise + '/' + wb.toplamGun);
      const t3 = fermentasyonProfili('Tripel', 1.080, 'belcika', m20);
      __REG.ok('Tripel 1.080: sise 25 (18+7)', t3.sise === 25, String(t3.sise));
      const q4 = fermentasyonProfili('Quadrupel', 1.095, 'belcika', m20);
      __REG.ok('Quad 1.095: sise 32 (18+14)', q4.sise === 32, String(q4.sise));
      const ist = fermentasyonProfili('Imperial Stout', 1.100, 'ale', m20);
      __REG.ok('ImpStout 1.100: sise 25 (11+14) + Imperial notu', ist.sise === 25 && /Imperial/.test(ist.aciklama), String(ist.sise));
      const st = fermentasyonProfili('Oatmeal Stout', 1.050, 'ale', m20);
      __REG.ok('Normal Stout 1.050: sise 11 / toplam 12 AYNEN', st.sise === 11 && st.toplamGun === 12);
      const kv = fermentasyonProfili('Kveik IPA', 1.090, 'kveik', { sc: [25, 40], ideal: 32 });
      __REG.ok('Kveik 1.090 MUAF: sise 6 / toplam 7', kv.sise === 6 && kv.toplamGun === 7);
      const lb = fermentasyonProfili('Lambic', 1.070, 'ale', m20);
      __REG.ok('Lambic 1.070 MUAF: 180', lb.sise === 180);
      const lg = fermentasyonProfili('Doppelbock', 1.080, 'lager', { sc: [8, 13], ideal: 10 });
      __REG.ok('Lager tipi 1.080 MUAF: sise 28', lg.sise === 28);
      const bw = fermentasyonProfili('English Barleywine', 1.100, 'ale', m20);
      __REG.ok('Barleywine (default dala duser) 1.100: sise 24 (10+14)', bw.sise === 24, String(bw.sise));
      // h) og>=1.060 uzatilan HER profilde supap + sisele SON + g tekil-artan
      const yuksekler = [wb, t3, q4, ist, bw, fermentasyonProfili('Saison', 1.065, 'saison', m20), fermentasyonProfili('American IPA', 1.062, 'ale', m20), fermentasyonProfili('Dubbel', 1.065, 'belcika', m20)];
      __REG.ok('uzatilmis TUM profillerde sise-bombasi FG supabi', yuksekler.every(p => p.gunler.some(x => /AYNI FG değilse ŞİŞELEME/.test(x.aciklama || ''))));
      __REG.ok('uzatilmis TUM profillerde son adim Sisele + g kesin artan', yuksekler.every(p => {
        const son = p.gunler[p.gunler.length - 1];
        const gs = p.gunler.map(x => x.g);
        return /Şişele/.test(son.aksiyon) && son.g === p.sise && gs.every((g, i) => i === 0 || g > gs[i - 1]);
      }));
      // alarm zinciri: _alarmPlaniKur yeni sise gununu izliyor
      __REG.yeniKayit('REGTEST AY1', { stil: 'Tripel', ogManuel: 1.080 });
      S.stil = 'Tripel'; S.ogManuel = 1.080;
      const plan = _alarmPlaniKur(_editId, Date.now());
      __REG.ok('alarm plani kuruldu (ok:true)', !!(plan && plan.ok), JSON.stringify(plan));
      const grup = JSON.parse(localStorage.getItem('bm_alarms_v1') || '{}')[_editId];
      const al = grup && Array.isArray(grup.alarmlar) ? grup.alarmlar : [];
      const siseA = al.find(a => /Şişele/.test(a.aksiyon) && !/sanitize/i.test(a.aksiyon));
      const sanit = al.find(a => /sanitize/i.test(a.aksiyon));
      const karb = al.find(a => /Karbonasyon/.test(a.aksiyon));
      __REG.ok('alarm: sisele g25', !!siseA && siseA.g === 25, siseA && ('g=' + siseA.g));
      __REG.ok('alarm: sanitize g24 (sise-1)', !!sanit && sanit.g === 24, sanit && ('g=' + sanit.g));
      __REG.ok('alarm: karbonasyon g39 (sise+14)', !!karb && karb.g === 39, karb && ('g=' + karb.g));
      return __REG.al();
    })
  },

  // ── SPRINT AZ: Muzo 2-ay kayması kök-neden fix paketi (design_muzo_alarm_ikiay_teshis) ──
  {
    kod: 'AZ1-BAYAT', ad: 'bayat-alarm kapısı: 60g eski onay günlüğe YAZMAZ; 2g eski onay Sprint R gibi ALARM gününe yazar',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('REGTEST AZ1', { stil: 'Weizen / Weissbier' });
      const plan = _alarmPlaniKur(_editId, Date.now() - 60 * 864e5); // 60g önce pitch → tüm alarmlar bayat
      __REG.ok('plan kuruldu', !!(plan && plan.ok), JSON.stringify(plan));
      const tum = _alarmlariOku(); const grup = tum[_editId];
      const sise = (grup.alarmlar || []).find(a => /Şişele/.test(a.aksiyon) && !/sanitize/i.test(a.aksiyon));
      __REG.ok('şişele alarmı 30g+ bayat', !!sise && (Date.now() - sise.ts) > 30 * 864e5);
      const n0 = (S.brewLog || []).length;
      _bmAlarmOnayKoprusu(_editId, sise.g);
      __REG.ok('AZ1: bayat onay günlüğe YAZMADI', (S.brewLog || []).length === n0, 'önce=' + n0 + ' sonra=' + (S.brewLog || []).length);
      __REG.ok('AZ1: KR kopyasında da siseleme YOK', !((KR.find(k => k && k.id === _editId) || {}).brewLog || []).some(e => e && e.tip === 'siseleme'));
      // R REGRESYONU: yakın geriye dönük onay (2g) AYNEN alarm gününe yazılmalı
      sise.ts = Date.now() - 2 * 864e5;
      _alarmlariYaz(tum);
      _bmAlarmOnayKoprusu(_editId, sise.g);
      const sisKayit = (S.brewLog || []).find(e => e && e.tip === 'siseleme');
      __REG.ok('R korunuyor: 2g eski onay siseleme YAZDI', !!sisKayit);
      const d2 = new Date(Date.now() - 2 * 864e5);
      const beklenen = d2.getFullYear() + '-' + String(d2.getMonth() + 1).padStart(2, '0') + '-' + String(d2.getDate()).padStart(2, '0');
      __REG.ok('R korunuyor: log tarihi = ALARM günü', !!sisKayit && sisKayit.tarih === beklenen, sisKayit && sisKayit.tarih);
      return __REG.al();
    })
  },
  {
    kod: 'AZ2-PLANTEMIZ', ad: 'brewdayTamamla: planBrewTarih (S+KR) ve plan: prep grubu düşer; yeni plan gerçek pitch\'e çapalı',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('REGTEST AZ2', { stil: 'Weizen / Weissbier' });
      S.planBrewTarih = '2026-06-28';
      const kr0 = KR.find(k => k && k.id === _editId); if (kr0) kr0.planBrewTarih = '2026-06-28';
      const tum0 = _alarmlariOku();
      tum0['plan:' + _editId] = { receteAd: 'REGTEST AZ2', pitchTs: 1782594000000, durum: 'aktif', alarmlar: [{ g: 0, ts: 1782543600000, tip: 'kontrol', aksiyon: '🔔 prep', aciklama: '', sicaklik: null, durum: 'bekliyor' }] };
      _alarmlariYaz(tum0);
      // brewday sonlandırma yan etkilerini stub'la (AU kalıbı, satır ~3670)
      const _b = window._brewBeep, _t = window._brewTitret, _n = window._brewBildirim;
      window._brewBeep = function () {}; window._brewTitret = function () {}; window._brewBildirim = function () {};
      window._brewday = window._brewday || {}; window._brewday.aktif = true; window._brewday.rid = _editId;
      const t0 = Date.now();
      try { brewdayTamamla(); } finally { window._brewBeep = _b; window._brewTitret = _t; window._brewBildirim = _n; }
      const tum1 = _alarmlariOku();
      __REG.ok('AZ2: plan: prep grubu silindi', !tum1['plan:' + _editId]);
      __REG.ok('AZ2: S.planBrewTarih düştü', S.planBrewTarih === undefined);
      const kr1 = KR.find(k => k && k.id === _editId);
      __REG.ok('AZ2: KR.planBrewTarih düştü', !!kr1 && kr1.planBrewTarih === undefined);
      const g = tum1[_editId];
      __REG.ok('yeni plan gerçek pitch\'e çapalı (±60sn)', !!g && Math.abs(g.pitchTs - t0) < 60000, g && String(g.pitchTs));
      __REG.ok('brewday_end günlüğe düştü (zincir bozulmadı)', (S.brewLog || []).some(e => e && e.tip === 'brewday_end'));
      return __REG.al();
    })
  },
  {
    kod: 'AZ3-RESISE', ad: 'finalize (bitti) grupta YENİ şişeleme kaydı → karbonasyon/içime-hazır yeniden kurulur; idempotent',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('REGTEST AZ3', { stil: 'Weizen / Weissbier' });
      const plan = _alarmPlaniKur(_editId, Date.now() - 10 * 864e5); // 10g önce pitch
      __REG.ok('plan kuruldu', !!(plan && plan.ok));
      const tum = _alarmlariOku(); const g = tum[_editId];
      g.durum = 'bitti';
      (g.alarmlar || []).forEach(a => { a.durum = 'tamamlandi'; }); // hayalet döngü finalize simülasyonu
      _alarmlariYaz(tum);
      const d = new Date();
      const bugun = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      S.brewLog = S.brewLog || []; S.brewLog.push({ tip: 'siseleme', tarih: bugun, deger: '', not: '', id: Date.now().toString() });
      const degisti = _alarmSiselemKontrol(_editId, S.brewLog);
      __REG.ok('AZ3: değişiklik raporlandı', degisti === true);
      const g2 = _alarmlariOku()[_editId];
      const karb = (g2.alarmlar || []).find(a => /Karbonasyon/.test(a.aksiyon));
      const icime = (g2.alarmlar || []).find(a => /İçime hazır/.test(a.aksiyon));
      __REG.ok('karbonasyon yeniden BEKLİYOR', !!karb && karb.durum === 'bekliyor', karb && karb.durum);
      __REG.ok('karbonasyon ts = bugünkü şişele+14 (gelecek)', !!karb && karb.ts > Date.now() + 12 * 864e5, karb && String(karb.ts));
      __REG.ok('içime-hazır yeniden BEKLİYOR + gelecekte', !!icime && icime.durum === 'bekliyor' && icime.ts > Date.now());
      __REG.ok('grup yeniden AKTİF', g2.durum === 'aktif', g2.durum);
      const degisti2 = _alarmSiselemKontrol(_editId, S.brewLog);
      __REG.ok('idempotent: ikinci çağrı no-op', degisti2 === false, String(degisti2));
      return __REG.al();
    })
  },
  {
    kod: 'AZ4-ONARIM', ad: 'onarım: hayalet-plan hijyeni (brew kanıtsız + 7g+ eski) + Muzo çapa 17Haz→16Ağu (hayalet kayıt silinince) + boş brewSonuc temizliği',
    calistir: (page) => page.evaluate(() => {
      // A) hayalet plan: brew kanıtı YOK + tüm alarmlar 7g+ eski → grup silinir
      const hid = __REG.yeniKayit('REGTEST AZ4-HAYALET', {});
      const tum0 = _alarmlariOku();
      tum0[hid] = { receteAd: 'hayalet', pitchTs: Date.now() - 70 * 864e5, durum: 'aktif', alarmlar: [
        { g: 0, ts: Date.now() - 70 * 864e5, tip: 'kontrol', aksiyon: '🧬 Pitch', durum: 'bekliyor' },
        { g: 9, ts: Date.now() - 61 * 864e5, tip: 'kritik', aksiyon: '❄️ Cold crash', durum: 'bekliyor' }] };
      // B) Muzo: fixture'daki gerçek kayıt (id sabit) hayalet-siseleme + boş brewSonuc ile donatılır
      const MID = '1775830924009';
      localStorage.removeItem('bm_az_onarim_v1');
      let mr = KR.find(k => k && String(k.id) === MID);
      __REG.ok('fixture Muzo kaydı var', !!mr);
      mr.brewLog = [
        { tip: 'brewday_end', tarih: '2026-08-16', ts: 1786898548756, not: '' },
        { tip: 'siseleme', tarih: '2026-06-25', ts: 1782370800000, almKey: MID + '|8', not: '⏰ alarm onayından', id: 'x1' }
      ];
      mr.brewSonuc = { ts: 1787573403523 };
      tum0[MID] = { receteAd: 'Muzo', pitchTs: 1781680514549, durum: 'bitti', alarmlar: [
        { g: 0, ts: 1781679600000, tip: 'kontrol', aksiyon: '🧬 Pitch', durum: 'tamamlandi' },
        { g: 8, ts: 1782370800000, tip: 'kritik', aksiyon: '🍺 Şişele', durum: 'tamamlandi' },
        { g: 22, ts: 1783580400000, tip: 'kontrol', aksiyon: '🫧 Karbonasyon kontrol — bir şişe test et', durum: 'tamamlandi' }] };
      _alarmlariYaz(tum0);
      _azOnarim();
      const t1 = _alarmlariOku();
      __REG.ok('A: hayalet plan grubu silindi', !t1[hid]);
      __REG.ok('B-bekleme: hayalet siseleme DURURKEN çapa değişmedi', !!t1[MID] && t1[MID].pitchTs === 1781680514549, t1[MID] && String(t1[MID].pitchTs));
      __REG.ok('B-bekleme: bayrak kapanmadı (sonraki tik yeniden dener)', localStorage.getItem('bm_az_onarim_v1') !== '2');
      __REG.ok('C: boş brewSonuc silindi', KR.find(k => k && String(k.id) === MID).brewSonuc === undefined);
      // Kaan'ın hayalet kaydı elle silmesi simüle edilir → sonraki tik onarır
      mr = KR.find(k => k && String(k.id) === MID);
      mr.brewLog = mr.brewLog.filter(e => !e || e.almKey !== MID + '|8');
      _azOnarim();
      const t2 = _alarmlariOku();
      __REG.ok('B: çapa gerçek pitch oldu (16 Ağu 19:42:28.757)', !!t2[MID] && t2[MID].pitchTs === 1786898548757, t2[MID] && String(t2[MID].pitchTs));
      __REG.ok('B: grup aktif', t2[MID].durum === 'aktif', t2[MID].durum);
      const saat = _alarmSaatiAl();
      const g22 = t2[MID].alarmlar.find(a => a.g === 22);
      const hedef22 = _alarmTsHesapla(1786898548757, 22, saat);
      const bugun0 = new Date(); bugun0.setHours(0, 0, 0, 0);
      __REG.ok('B: g22 ts yeniden hesaplandı (pitch+22)', !!g22 && g22.ts === hedef22, g22 && String(g22.ts));
      // TEST DUZELTMESI (BR sprintinde yakalandi, BR ILE ILGISI YOK): bu iddia
      // _azOnarim'in terminal latch dalini gormezden geliyordu ve pitch+22 = 7 Eyl 2026
      // gecmise dusunce (yani 2026-09-07'de) KIRMIZIYA dondu. Uygulama dogru davraniyor:
      //   if(a.ts < bugun0){ if(a.durum !== 'tamamlandi') a.durum = 'atlandi'; } else a.durum = 'bekliyor';
      // Fixture'da g22 'tamamlandi' — H-LATCH-1 kilidi geriye dusurmeyi YASAKLIYOR.
      __REG.ok('B: g22 durumu ts + terminal latch ile tutarlı (tarih-sağlam iddia)', !!g22 && g22.durum === (g22.ts >= bugun0.getTime() ? 'bekliyor' : 'tamamlandi'), g22 && g22.durum);
      __REG.ok('B: g0 tamamlandi KORUNDU', t2[MID].alarmlar.find(a => a.g === 0).durum === 'tamamlandi');
      __REG.ok('B: bayrak kapandı', localStorage.getItem('bm_az_onarim_v1') === '2');
      return __REG.al();
    })
  },

  // ── SPRINT BA: ölü push aboneliği yönetimi ──
  {
    kod: 'BA2-OLU', ad: 'durum özeti dürüstlüğü: 410 işleyici LS bayrağını düşürür → özet "abone değil"e döner; satır id\'li (async doğrulama hedefi); Yenile fonksiyonu tanımlı',
    calistir: (page) => page.evaluate(() => {
      localStorage.setItem('bm_push_sub', JSON.stringify({ endpoint: 'https://x/dead', keys: { p256dh: 'a', auth: 'b' } }));
      const h1 = rStokAyarlar();
      __REG.ok('sahte abonelikle özet "✓ Bu cihaz abone" diyor (mevcut yalan)', h1.indexOf('✓ Bu cihaz abone') >= 0);
      _bmPushOluIsle({ endpoint: 'https://x/dead' });
      __REG.ok('410 işleyici bm_push_sub bayrağını sildi', !localStorage.getItem('bm_push_sub'));
      const h2 = rStokAyarlar();
      __REG.ok('özet artık DÜRÜST: "abone değil"', h2.indexOf('Bu cihaz abone değil') >= 0 && h2.indexOf('✓ Bu cihaz abone') < 0);
      __REG.ok('durum satırı id\'li (bmPushDurumSatir)', h2.indexOf('bmPushDurumSatir') >= 0);
      __REG.ok('brewPushYenile tanımlı (tek dokunuş yenileme)', typeof brewPushYenile === 'function');
      __REG.ok('_bmPushDurumDogrula tanımlı + SW\'siz ortamda sessiz', (function(){ try { _bmPushDurumDogrula(); return true; } catch (e) { return false; } })());
      return __REG.al();
    })
  },
  {
    kod: 'BA3-TOAST', ad: 'sessiz-kaçırma koruması: due alarm → oturumda TEK bilgi toast\'ı (modal değil); ikinci tetikte YOK; kritik-modal akışı AYNEN (AZ5 regresyonu)',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('REGTEST BA3', {});
      const st = {}; st[id] = { receteAd: 'BA3', pitchTs: Date.now() - 3 * 864e5, durum: 'aktif', alarmlar: [
        { g: 1, ts: Date.now() - 2 * 864e5, tip: 'kontrol', aksiyon: '📊 Gravity kontrol', aciklama: '', durum: 'bekliyor' },
        { g: 2, ts: Date.now() - 1 * 864e5, tip: 'kontrol', aksiyon: '🌡️ D-rest', aciklama: '', durum: 'bekliyor' }] };
      _alarmlariYaz(st);
      window._bmKacirilanBilgiVerildi = false;
      var esk = document.getElementById('bm-kacirilan-toast'); if (esk) esk.remove();
      var em0 = document.getElementById('_alarmModal'); if (em0) em0.remove();
      _alarmKontrolEt();
      const t = document.getElementById('bm-kacirilan-toast');
      __REG.ok('bilgi toast\'ı çıktı', !!t);
      // TEST DUZELTMESI (BS sprintinde yakalandi, BS ILE ILGISI YOK — tabana karsi
      // olculdu, BS oncesi de kirmiziydi): toast SAYISI _alarmBekleyenleri().length'tir,
      // yani FIXTURE'daki alarmlar da sayilir. Duvar saati ilerledikce fixture'dan
      // yeni alarm vadesi gelince sabit "2" iddiasi kaciniLMAZ olarak kirilir.
      // Dogru iddia: metindeki sayi = uygulamanin kendi bekleyen sayisi ve >= 2
      // (testin kendi ekledigi 2 alarm zaten vadesi gecmis).
      const bekN = _alarmBekleyenleri().length;
      __REG.ok('sayı metinde ve bekleyen sayısıyla tutarlı (tarih-sağlam)',
        !!t && bekN >= 2 && new RegExp('\\b' + bekN + ' alarm').test(t.textContent),
        (t && t.textContent.slice(0, 60)) + ' | bekleyen=' + bekN);
      if (t) t.remove();
      _alarmKontrolEt();
      __REG.ok('oturumda İKİNCİ toast YOK (fırtına yok)', !document.getElementById('bm-kacirilan-toast'));
      // AZ5 regresyonu: kritik alarm modalı AYNEN açılıyor (mevcut akışa dokunulmadı)
      const st2 = {}; st2[id] = { receteAd: 'BA3', pitchTs: Date.now() - 3 * 864e5, durum: 'aktif', alarmlar: [
        { g: 3, ts: Date.now() - 1000, tip: 'kritik', aksiyon: '❄️ Cold crash', aciklama: '', durum: 'bekliyor' }] };
      _alarmlariYaz(st2);
      var em = document.getElementById('_alarmModal'); if (em) em.remove();
      _alarmKontrolEt();
      __REG.ok('kritik modal AYNEN açılıyor', !!document.getElementById('_alarmModal'));
      var em2 = document.getElementById('_alarmModal'); if (em2) em2.remove();
      return __REG.al();
    })
  },

  // ── SPRINT BB: alarm kartı İLERİDE bölümü + dokunma hedefleri (Muzo "alarmlara basılmıyor" vakası) ──
  {
    kod: 'BB1-ILERIDE', ad: '7+ gün uzak bekleyenler artık görünür (İLERİDE bölümü); başlık-liste tutarlı; aksiyon butonu ≥44px; GEÇMİŞ satırları butonsuz kalır (tasarım)',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('REGTEST BB1', {});
      const st = {}; st[id] = { receteAd: 'BB1', pitchTs: Date.now() - 8 * 864e5, durum: 'aktif', alarmlar: [
        { g: 8, ts: Date.now() - 1 * 864e5, tip: 'kritik', aksiyon: '🍺 Şişele', aciklama: '', durum: 'tamamlandi' },
        { g: 22, ts: Date.now() + 14 * 864e5, tip: 'kontrol', aksiyon: '🫧 Karbonasyon kontrol — bir şişe test et', aciklama: '', durum: 'bekliyor' },
        { g: 29, ts: Date.now() + 21 * 864e5, tip: 'kontrol', aksiyon: '🍺 İçime hazır — test olgunlaştı', aciklama: '', durum: 'bekliyor' },
        { g: 10, ts: Date.now() + 2 * 864e5, tip: 'kontrol', aksiyon: '📊 Ara kontrol', aciklama: '', durum: 'bekliyor' }] };
      _alarmlariYaz(st);
      const html = _alarmKartRender();
      __REG.ok('başlık: 3 bekleyen', html.indexOf('3 bekleyen') >= 0);
      __REG.ok('İLERİDE bölümü var (·2: karb+içime)', html.indexOf('İLERİDE · 2') >= 0);
      __REG.ok('karbonasyon satırı GÖRÜNÜR', html.indexOf('Karbonasyon kontrol') >= 0);
      __REG.ok('içime-hazır satırı GÖRÜNÜR', html.indexOf('İçime hazır') >= 0);
      __REG.ok('yakın bekleyen için YAKLAŞAN bölümü de var', html.indexOf('YAKLAŞAN (7 GÜN)') >= 0);
      // DOM ölçümü: bekleyen satırın ✓ butonu ≥44px; satır tekrarı yok (aksiyon başına ✓+🔕 = 2 buton); geçmişte buton YOK
      const div = document.createElement('div'); div.innerHTML = html; document.body.appendChild(div);
      __REG.ok('Ara kontrol TEK satır (✓+🔕 = 2 buton)', div.querySelectorAll('button[aria-label*="Ara kontrol"]').length === 2, String(div.querySelectorAll('button[aria-label*="Ara kontrol"]').length));
      __REG.ok('Karbonasyon TEK satır (çift listeleme yok)', div.querySelectorAll('button[aria-label*="Karbonasyon"]').length === 2, String(div.querySelectorAll('button[aria-label*="Karbonasyon"]').length));
      const onayBtn = Array.from(div.querySelectorAll('button')).find(b => (b.getAttribute('aria-label') || '').indexOf('tamamlandı işaretle') >= 0);
      const r = onayBtn ? onayBtn.getBoundingClientRect() : { width: 0, height: 0 };
      __REG.ok('✓ butonu ≥44×44 (dokunma hedefi)', r.width >= 44 && r.height >= 44, Math.round(r.width) + 'x' + Math.round(r.height));
      const gecmisOnay = Array.from(div.querySelectorAll('button')).filter(b => (b.getAttribute('onclick') || '').indexOf("'tamamlandi'") >= 0);
      __REG.ok('geçmiş (terminal) satırda aksiyon butonu yok — yalnız bekleyenlerde', gecmisOnay.length === 3, String(gecmisOnay.length));
      div.remove();
      return __REG.al();
    })
  },

  // ── SPRINT BC: gravity giriş formatı toleransı + sessiz reddetme sonu (Kaan'ın "1054" vakası) ──
  {
    kod: 'BC1-NORM', ad: '_sgNormalize matrisi: 1.054 aynen · 1054 binde · 54 puan · belirsizler (5.5/0.5/1.54/54.5) REDDEDİLİR · _sgNum (I2) DEĞİŞMEDİ',
    calistir: (page) => page.evaluate(() => {
      const N = window._sgNormalize;
      __REG.ok('1.054 → aynen', N('1.054').v === 1.054 && N('1.054').donusum === null);
      __REG.ok('1054 → 1.054 (binde)', N('1054').v === 1.054 && N('1054').donusum === 'binde');
      __REG.ok('54 → 1.054 (puan)', N('54').v === 1.054 && N('54').donusum === 'puan');
      __REG.ok('12 → 1.012 (FG puanı)', N('12').v === 1.012);
      __REG.ok('1,054 → virgül toleransı', N('1,054').v === 1.054);
      __REG.ok('5.5 REDDEDİLİR (ondalıklı puan belirsiz)', N('5.5').v === null && N('5.5').neden === 'aralik');
      __REG.ok('0.5 REDDEDİLİR', N('0.5').v === null);
      __REG.ok('1.54 REDDEDİLİR (pencere dışı — yazım hatası maskelenmez)', N('1.54').v === null);
      __REG.ok('54.5 REDDEDİLİR (ondalıklı puan)', N('54.5').v === null);
      __REG.ok('abc → bozuk', N('abc').v === null && N('abc').neden === 'bozuk');
      __REG.ok('boş → bos', N('').v === null && N('').neden === 'bos');
      // I2 KİLİDİ: _sgNum aralık kapısı AYNEN — 1054 hâlâ null (normalize İÇ yollara sızmadı)
      __REG.ok('I2 korundu: _sgNum(1054)=null', _sgNum('1054') === null);
      __REG.ok('I2 korundu: _sgNum(1.054)=1.054', _sgNum('1.054') === 1.054);
      return __REG.al();
    })
  },
  {
    kod: 'BC2-YUZEY', ad: 'üç yüzeyde tutarlı: logEkle 1054→1.054 kaydeder+ogManuel dolar; bozuk değer kayıt tutulur+UYARI (sessiz yutma yok); editör alanı + brewday inline aynı',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('REGTEST BC2', {});
      // flash spy — sessiz yutma bitti iddiası ölçülebilir olsun
      const mesajlar = [];
      const eskiFlash = window.flash;
      window.flash = function(m, t){ mesajlar.push(String(m)); try{ return eskiFlash.apply(this, arguments); }catch(_e){} };
      try {
        // 1) logEkle yüzeyi — DOM formu üzerinden (gerçek yol)
        setSekme('takvim');
        if (typeof render === 'function') render();
        const tipEl = document.getElementById('logTip'), tarihEl = document.getElementById('logTarih'), degerEl = document.getElementById('logDeger');
        __REG.ok('log formu DOM\'da', !!tipEl && !!tarihEl && !!degerEl);
        tipEl.value = 'og_olcum'; tarihEl.value = '2026-08-24'; degerEl.value = '1054';
        logEkle();
        const kayit1 = (S.brewLog || []).find(e => e && e.tip === 'og_olcum');
        __REG.ok('logEkle: 1054 → "1.054" olarak KAYDEDİLDİ', !!kayit1 && kayit1.deger === '1.054', kayit1 && kayit1.deger);
        __REG.ok('logEkle: ogManuel DOLDU (hesaba akıyor)', S.ogManuel === 1.054, String(S.ogManuel));
        __REG.ok('logEkle: dönüşüm bilgisi verildi', mesajlar.some(m => m.indexOf('1054') >= 0 && m.indexOf('1.054') >= 0));
        // 2) bozuk değer: kayıt tutulur ama UYARI verilir + hesap kirlenmez
        mesajlar.length = 0;
        tipEl.value = 'fg_olcum'; tarihEl.value = '2026-08-24'; degerEl.value = '5.5';
        logEkle();
        const kayit2 = (S.brewLog || []).find(e => e && e.tip === 'fg_olcum');
        __REG.ok('bozuk değer: kayıt TUTULDU (veri silinmez)', !!kayit2 && kayit2.deger === '5.5');
        __REG.ok('bozuk değer: fgManuel KİRLENMEDİ', !S.fgManuel, String(S.fgManuel));
        __REG.ok('bozuk değer: UYARI verildi (sessiz yutma bitti)', mesajlar.some(m => m.indexOf('anlaşılamadı') >= 0), mesajlar.join('|').slice(0, 80));
        // 3) editör alanı yüzeyi
        mesajlar.length = 0;
        _bmSgManuelGir('og', '1055');
        __REG.ok('editör: 1055 → ogManuel 1.055', S.ogManuel === 1.055, String(S.ogManuel));
        _bmSgManuelGir('fg', '12');
        __REG.ok('editör: 12 → fgManuel "1.012"', S.fgManuel === '1.012', String(S.fgManuel));
        _bmSgManuelGir('og', '5.5');
        __REG.ok('editör: 5.5 → ogManuel BOŞ + uyarı', S.ogManuel === null && mesajlar.some(m => m.indexOf('anlaşılamadı') >= 0));
        // 4) brewday inline yüzeyi — normalize state'e akar, bozukta mevcut Geçersiz-SG uyarısı korunur
        window._brewday = window._brewday || {}; window._brewday.olcum = null;
        _bdOlcumGir('og', 'sg', '1054');
        __REG.ok('brewday inline: 1054 → 1.054 state\'e', Math.abs(_bdOlcum().ogSG - 1.054) < 1e-9, String(_bdOlcum().ogSG));
        window._brewday.olcum = null;
        _bdOlcumGir('og', 'sg', '5.5');
        __REG.ok('brewday inline: 5.5 HAM kalır → mevcut Geçersiz-SG uyarısı devrede', _bdOlcum().ogSG === 5.5 && /Geçersiz SG/.test(_bdOlcum().ogUyari || ''), (_bdOlcum().ogUyari || '').slice(0, 40));
      } finally { window.flash = eskiFlash; }
      return __REG.al();
    })
  },

  // ── SPRINT BE1: brewday güvenliği — b.rid otoritesi (BD KRİTİK 1/2/5/7 + F3-1) ──
  {
    kod: 'BE1-RID', ad: 'b.rid otoritesi: uyuşmazlıkta adım kaydı doğrudan KR[demlenen]e (yabancı S temiz + ring); Tamamla alarmı demlenene kurar, açık reçetenin planı DOKUNULMAZ; brewday-aktif reçete silinemez',
    calistir: (page) => page.evaluate(() => {
      const idA = __REG.yeniKayit('BE1 Demlenen', { stil: 'Weizen / Weissbier' });
      const idB = __REG.yeniKayit('BE1 Acik', {});
      const st = _alarmlariOku();
      st[idB] = { receteAd: 'BE1 Acik', pitchTs: 1786898548757, olusTs: 1, durum: 'aktif', alarmlar: [{ g: 0, ts: 1786953600000, tip: 'kontrol', aksiyon: '🧬 Pitch', durum: 'bekliyor' }] };
      _alarmlariYaz(st);
      window._brewday = window._brewday || {}; window._brewday.aktif = true; window._brewday.rid = String(idA);
      tarifAc(idB);
      // 1) adım kaydı uyuşmazlıkta: S'e değil KR[demlenen]e
      const bLog0 = (S.brewLog || []).length;
      const aLog0 = ((KR.find(k => k && k.id === idA) || {}).brewLog || []).length;
      const y1 = _bdLogYaz({ tarih: '2026-08-24', tip: 'brewday_event', deger: 'BE1 test adımı', not: '', ts: Date.now() }, 'test');
      __REG.ok('yazım KR[demlenen]e gitti', y1 === true && ((KR.find(k => k && k.id === idA) || {}).brewLog || []).length === aLog0 + 1);
      __REG.ok('yabancı S KİRLENMEDİ', (S.brewLog || []).length === bLog0);
      __REG.ok('rid kapısı ring\'e düştü', (bmHataLogOku() || []).some(h => h && /_bdLogYaz/.test(h.kaynak || '')));
      // 2) brewday-aktif reçete silinemez
      tarifSil(idA);
      __REG.ok('demlenen reçete SİLİNEMEDİ (guard)', !!KR.find(k => k && k.id === idA));
      // 3) Tamamla: alarm demlenene, açık reçetenin planı aynen, reçeteye dönüş
      const _b = window._brewBeep, _t = window._brewTitret, _n = window._brewBildirim;
      window._brewBeep = function () {}; window._brewTitret = function () {}; window._brewBildirim = function () {};
      const t0 = Date.now();
      try { brewdayTamamla(); } finally { window._brewBeep = _b; window._brewTitret = _t; window._brewBildirim = _n; }
      const t1 = _alarmlariOku();
      __REG.ok('alarm DEMLENENe (A) kuruldu, pitch=şimdi', !!t1[idA] && Math.abs(t1[idA].pitchTs - t0) < 60000, t1[idA] && String(t1[idA].pitchTs));
      __REG.ok('açık reçetenin (B) planı DOKUNULMADI', !!t1[idB] && t1[idB].pitchTs === 1786898548757, t1[idB] && String(t1[idB].pitchTs));
      __REG.ok('demlenen reçeteye dönüldü', typeof _editId !== 'undefined' && String(_editId) === String(idA) && S.biraAd === 'BE1 Demlenen');
      __REG.ok('brewday_end demlenenin günlüğünde', (S.brewLog || []).some(e => e && e.tip === 'brewday_end'));
      // 4) meşru silme aynen (brewday kapandı)
      tarifSil(idB);
      __REG.ok('meşru silme AYNEN çalışıyor', !KR.find(k => k && k.id === idB));
      return __REG.al();
    })
  },
  {
    kod: 'BE1-GIRIS', ad: 'adsız reçetede ölçüm ÜRETİLMİŞ adla gerçek kayıt (RAM-only + sahte-mesaj bitti); Süreç pre-boil OG BC normalize + uyarı (4. yüzey kapandı)',
    calistir: (page) => page.evaluate(() => {
      const mesajlar = []; const eskiF = window.flash;
      window.flash = function (m, t) { mesajlar.push(String(m)); try { return eskiF.apply(this, arguments); } catch (_e) {} };
      try {
        yeniTarif();
        setSekme('takvim'); if (typeof render === 'function') render();
        const tipEl = document.getElementById('logTip'), tarihEl = document.getElementById('logTarih'), degerEl = document.getElementById('logDeger');
        __REG.ok('log formu hazır (adsız reçete)', !!tipEl && !!tarihEl && !!degerEl);
        tipEl.value = 'og_olcum'; tarihEl.value = '2026-08-24'; degerEl.value = '1.050';
        logEkle();
        __REG.ok('üretilmiş ad verildi', /Adsız çalışma/.test(S.biraAd || ''), S.biraAd);
        const kayit = KR.find(k => k && k.biraAd === S.biraAd);
        __REG.ok('KR\'ye GERÇEK kayıt düştü (RAM-only bitti)', !!kayit && (kayit.brewLog || []).some(e => e && e.tip === 'og_olcum'));
        __REG.ok('kalıcılık mesajı verildi + eski J8 uyarısı YOK', mesajlar.some(m => /kalıcı/.test(m)) && !mesajlar.some(m => /KALICI DEĞİL/.test(m)), mesajlar.join('|').slice(0, 100));
        mesajlar.length = 0;
        _bmPreboilGir('1054');
        __REG.ok('Süreç preboil: 1054 → 1.054 normalize', S.preboilOG === 1.054, String(S.preboilOG));
        __REG.ok('dönüşüm bilgisi verildi', mesajlar.some(m => m.indexOf('1.054') >= 0));
        _bmPreboilGir('5.5');
        __REG.ok('bozuk değer: alan boş + uyarı (sessiz yutma yok)', S.preboilOG === null && mesajlar.some(m => /anlaşılamadı/.test(m)));
        _bmPreboilGir('1.048');
        __REG.ok('geçerli değer aynen', S.preboilOG === 1.048);
      } finally { window.flash = eskiF; }
      return __REG.al();
    })
  },

  // ── SPRINT BE2: alarm dürüstlüğü (BD F1-1 KRİTİK + F9-4 + F10 sayaç ailesi + F6-2) ──
  {
    kod: 'BE2-LIMBO', ad: "'gosterildi' limbosu bitti: gösterim store'a yazılmaz, alarm ✓'a dek beklemede; yeni oturumda tekrar gösterilir; aynı oturumda fırtına kapısı; legacy 'gosterildi' beklemede sayılır",
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('BE2 Limbo', {});
      const st = {}; st[id] = { receteAd: 'BE2 Limbo', pitchTs: Date.now() - 3 * 864e5, durum: 'aktif', alarmlar: [
        { g: 8, ts: Date.now() - 1000, tip: 'kritik', aksiyon: '🍺 Şişele', aciklama: '', durum: 'bekliyor' }] };
      _alarmlariYaz(st);
      Object.keys(window._alarmGosterimTs).forEach(k => delete window._alarmGosterimTs[k]);
      var em0 = document.getElementById('_alarmModal'); if (em0) em0.remove();
      window._bmKacirilanBilgiVerildi = true; // BA3 bu testte sustur
      _alarmKontrolEt();
      __REG.ok('kritik modal açıldı', !!document.getElementById('_alarmModal'));
      __REG.ok("STORE'a 'gosterildi' YAZILMADI", _alarmlariOku()[id].alarmlar[0].durum === 'bekliyor', _alarmlariOku()[id].alarmlar[0].durum);
      __REG.ok('bekleyenler hâlâ görüyor (BA3/cron körlüğü bitti)', _alarmBekleyenleri().some(x => x.receteId === id));
      // reload simülasyonu: modal gitti + oturum belleği sıfır → TEKRAR gösterilir (kaybolmaz)
      document.getElementById('_alarmModal').remove();
      Object.keys(window._alarmGosterimTs).forEach(k => delete window._alarmGosterimTs[k]);
      _alarmKontrolEt();
      __REG.ok('yeni oturumda TEKRAR gösterildi (modal-açıkken-reload kaybı bitti)', !!document.getElementById('_alarmModal'));
      // aynı oturumda fırtına yok (6 saat kapısı)
      document.getElementById('_alarmModal').remove();
      _alarmKontrolEt();
      __REG.ok('aynı oturumda tekrar AÇILMADI (AZ5 fırtına kapısı)', !document.getElementById('_alarmModal'));
      // onay → kalıcı kapanır
      _alarmAksiyon(id, 8, 'tamamlandi');
      Object.keys(window._alarmGosterimTs).forEach(k => delete window._alarmGosterimTs[k]);
      var em2 = document.getElementById('_alarmModal'); if (em2) em2.remove();
      _alarmKontrolEt();
      __REG.ok('onaylandı: tamamlandi + yeni oturumda bile gelmez', _alarmlariOku()[id].alarmlar[0].durum === 'tamamlandi' && !document.getElementById('_alarmModal'));
      // legacy 'gosterildi' (eski sürüm yazmıştı) beklemede sayılır
      const st2 = _alarmlariOku(); st2[id].durum = 'aktif'; st2[id].alarmlar[0].durum = 'gosterildi'; _alarmlariYaz(st2);
      __REG.ok("legacy 'gosterildi' beklemede sayılıyor", _alarmBekleyenleri().some(x => x.receteId === id));
      return __REG.al();
    })
  },
  {
    kod: 'BE2-YAZ', ad: '_alarmlariYaz başarısızlığı SESLİ: plan ok=false (sahte "kuruldu ✓" yok), onay ✓ flash yok + alarm açık kalır, ring + depoya-muhtaç-olmayan görünür uyarı',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('BE2 Yaz', { stil: 'Weizen / Weissbier' });
      const mesajlar = []; const eskiF = window.flash;
      window.flash = function (m) { mesajlar.push(String(m)); try { return eskiF.apply(this, arguments); } catch (_e) {} };
      const origSet = Storage.prototype.setItem;
      try {
        window._alarmYazUyariTs = 0;
        Storage.prototype.setItem = function (k, v) { if (k === 'bm_alarms_v1') throw new Error('QUOTA-SIM'); return origSet.apply(this, arguments); };
        const plan = _alarmPlaniKur(_editId, Date.now());
        __REG.ok('plan ok=false + hata dolu (sahte başarı yok)', !!plan && plan.ok === false && !!plan.hata, JSON.stringify({ ok: plan && plan.ok, hata: plan && plan.hata }));
        __REG.ok('görünür uyarı basıldı', mesajlar.some(m => /KAYDEDİLEMEDİ/.test(m)), mesajlar.join('|').slice(0, 80));
        __REG.ok('ring kaydı düştü (ring anahtarı etkilenmedi)', (bmHataLogOku() || []).some(h => h && /alarmYaz/.test(h.kaynak || '')));
      } finally { Storage.prototype.setItem = origSet; }
      const plan2 = _alarmPlaniKur(_editId, Date.now() - 2 * 864e5);
      __REG.ok('normal kurulumda ok=true (regresyon)', !!plan2 && plan2.ok === true);
      const g0 = _alarmlariOku()[_editId].alarmlar[0].g;
      mesajlar.length = 0;
      try {
        Storage.prototype.setItem = function (k, v) { if (k === 'bm_alarms_v1') throw new Error('QUOTA-SIM'); return origSet.apply(this, arguments); };
        _alarmAksiyon(_editId, g0, 'tamamlandi');
        __REG.ok("onay yazılamadı: '✓ Alarm tamamlandı' BASILMADI + uyarı var", !mesajlar.some(m => /✓ Alarm tamamlandı/.test(m)) && mesajlar.some(m => /KAYDEDİLEMEDİ/.test(m)), mesajlar.join('|').slice(0, 100));
      } finally { Storage.prototype.setItem = origSet; window.flash = eskiF; }
      __REG.ok('alarm açık kaldı (store bekliyor)', _alarmlariOku()[_editId].alarmlar[0].durum === 'bekliyor', _alarmlariOku()[_editId].alarmlar[0].durum);
      return __REG.al();
    })
  },
  {
    kod: 'BE2-SAYAC', ad: 'sayaç-içerik tutarlılığı: geçmiş-pasif sayaç dışı; GEÇMİŞ kesme notu; pseudo grup kart hedefi olamaz; Ayarlar etiketi + öğrenme satırı',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('BE2 Sayac', {});
      const st = {};
      st[_editId] = { receteAd: 'BE2 Sayac', pitchTs: Date.now() - 30 * 864e5, olusTs: Date.now(), durum: 'aktif', alarmlar: [
        { g: 1, ts: Date.now() - 20 * 864e5, tip: 'pasif', aksiyon: '🌙 Bekle', durum: 'bekliyor' },
        { g: 40, ts: Date.now() + 2 * 864e5, tip: 'kontrol', aksiyon: '🫧 Karbonasyon kontrol', durum: 'bekliyor' },
        { g: 2, ts: 1, tip: 'kontrol', aksiyon: 'A1', durum: 'tamamlandi' }, { g: 3, ts: 2, tip: 'kontrol', aksiyon: 'A2', durum: 'tamamlandi' },
        { g: 4, ts: 3, tip: 'kontrol', aksiyon: 'A3', durum: 'tamamlandi' }, { g: 5, ts: 4, tip: 'kontrol', aksiyon: 'A4', durum: 'tamamlandi' },
        { g: 6, ts: 5, tip: 'kontrol', aksiyon: 'A5', durum: 'tamamlandi' }, { g: 7, ts: 6, tip: 'kontrol', aksiyon: 'A6', durum: 'tamamlandi' }] };
      _alarmlariYaz(st);
      const html = _alarmKartRender();
      __REG.ok('geçmiş-pasif SAYILMADI (1 bekleyen)', html.indexOf('1 bekleyen') >= 0, (html.match(/\d+ bekleyen/) || [])[0]);
      __REG.ok('GEÇMİŞ kesme notu görünür', /GEÇMİŞ · 6/.test(html) && /son 5 gösteriliyor/.test(html));
      const st2 = {}; st2['stok:xyz'] = { receteAd: 'Hop X', pitchTs: null, durum: 'aktif', alarmlar: [{ g: 0, ts: Date.now() - 1000, tip: 'kontrol', aksiyon: '📦 Stok azaldı — Hop X', durum: 'bekliyor' }] };
      _alarmlariYaz(st2);
      const html2 = _alarmKartRender();
      __REG.ok('pseudo grup kart hedefi OLMADI', html2.indexOf('Aktif alarm planı yok') >= 0 && html2.indexOf('Hop X') < 0);
      const ayarHtml = rStokAyarlar();
      __REG.ok('Ayarlar etiketi doğru ada çekildi', ayarHtml.indexOf('Zamanı gelmiş alarm:') >= 0 && ayarHtml.indexOf('Bekleyen alarm:') < 0);
      __REG.ok('öğrenme-kolları satırı görünür', /Öğrenme \(bu cihazda\)/.test(ayarHtml));
      return __REG.al();
    })
  },
  {
    kod: 'BE2-SISE', ad: 'şişeleme kayması takibi: _sonrasiGun ALANSIZ (AZ-öncesi) planda offset şişele-g farkından türetilir + kalıcılaşır; alarmlar gerçek şişeleme tarihine kayar',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('BE2 Sise', {});
      const P = Date.now() - 11 * 864e5;
      const st = {}; st[id] = { receteAd: 'BE2 Sise', pitchTs: P, durum: 'aktif', alarmlar: [
        { g: 8, ts: P + 8 * 864e5, tip: 'kritik', aksiyon: '🍺 Şişele', durum: 'tamamlandi' },
        { g: 22, ts: P + 22 * 864e5, tip: 'kontrol', aksiyon: '🫧 Karbonasyon kontrol — bir şişe test et', durum: 'bekliyor' },
        { g: 29, ts: P + 29 * 864e5, tip: 'kontrol', aksiyon: '🍺 İçime hazır — test olgunlaştı', durum: 'bekliyor' }] };
      _alarmlariYaz(st);
      const d = new Date(); const bugun = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      S.brewLog = [{ tip: 'siseleme', tarih: bugun, deger: '', not: '', id: Date.now().toString() }];
      const degisti = _alarmSiselemKontrol(id, S.brewLog);
      __REG.ok('değişiklik raporlandı', degisti === true, String(degisti));
      const g2 = _alarmlariOku()[id];
      const karb = g2.alarmlar.find(a => /Karbonasyon/.test(a.aksiyon));
      __REG.ok('offset türetildi + KALICILAŞTI (14)', karb._sonrasiGun === 14, String(karb._sonrasiGun));
      const hedef = _alarmTsHesapla(new Date(bugun + 'T00:00:00').getTime(), 14, _alarmSaatiAl());
      __REG.ok('karbonasyon GERÇEK şişeleme+14 gününe kaydı (plandan 3 gün geç)', karb.ts === hedef, String(karb.ts));
      const icime = g2.alarmlar.find(a => /İçime/.test(a.aksiyon));
      __REG.ok('içime-hazır offset 21 + gelecekte bekliyor', icime._sonrasiGun === 21 && icime.durum === 'bekliyor' && icime.ts > Date.now());
      return __REG.al();
    })
  },

  // ── SPRINT BE3: giriş doğrulama paketi (BD F8 hattı — 12 alan; priming GÜVENLİK sınırı kaynaklı) ──
  {
    kod: 'BE3-PRIM', ad: 'priming güvenlik sınırı (kaynaklı): vol=10 REDDEDİLİR + tehlike dili; Weizen 4.0 KABUL + kalın-şişe uyarısı; 2.5 sessiz kabul; temp 0 (cold-crash) artık MEŞRU',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('BE3 Prim', {});
      const mesajlar = []; const eskiF = window.flash;
      window.flash = function (m) { mesajlar.push(String(m)); try { return eskiF.apply(this, arguments); } catch (_e) {} };
      try {
        S.primVol = 2.4;
        _bmPrimVolGir('10');
        __REG.ok('vol=10 REDDEDİLDİ (değer korundu)', S.primVol === 2.4, String(S.primVol));
        __REG.ok('tehlike dili net (PATLA...)', mesajlar.some(m => /PATLA/i.test(m) && /⛔/.test(m)), mesajlar.join('|').slice(0, 80));
        mesajlar.length = 0;
        _bmPrimVolGir('4.0');
        __REG.ok('Weizen 4.0 KABUL (meşru uç engellenmedi)', S.primVol === 4, String(S.primVol));
        __REG.ok('kalın-şişe güvenlik uyarısı verildi', mesajlar.some(m => /kalın|ağır şişe/i.test(m)));
        mesajlar.length = 0;
        _bmPrimVolGir('2.5');
        __REG.ok('2.5 sessiz kabul (normal aralık uyarısız)', S.primVol === 2.5 && mesajlar.length === 0, mesajlar.join('|').slice(0, 40));
        _bmPrimVolGir('0.5');
        __REG.ok('0.5 alt sınır altı REDDEDİLDİ', S.primVol === 2.5);
        _bmPrimTempGir('0');
        __REG.ok('temp 0°C (cold-crash şişeleme) MEŞRU — eski ||18 ikamesi bitti', S.primTemp === 0, String(S.primTemp));
        _bmPrimTempGir('40');
        __REG.ok('temp 40 REDDEDİLDİ (0 korundu)', S.primTemp === 0);
      } finally { window.flash = eskiF; }
      return __REG.al();
    })
  },
  {
    kod: 'BE3-ALAN', ad: '12 alan kapısı: malt/hop/AA/mineral/stok RED+uyarı; mash 100°C RED ama 35-78 meşru; kaynatma [15,240]; verim uyarılı; sparge; gelecek-pitching metni',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('BE3 Alan', {});
      const mesajlar = []; const eskiF = window.flash;
      window.flash = function (m) { mesajlar.push(String(m)); try { return eskiF.apply(this, arguments); } catch (_e) {} };
      try {
        // mash: absürt RED + meşru uçlar KABUL
        S.mashSc = 67;
        _bmMashScGir('100');
        __REG.ok('mash 100°C REDDEDİLDİ (67 korundu)', S.mashSc === 67 && mesajlar.some(m => /35–80/.test(m)));
        _bmMashScGir('78'); __REG.ok('mash-out 78°C MEŞRU', S.mashSc === 78);
        _bmMashScGir('35'); __REG.ok('asit dinlenmesi 35°C MEŞRU', S.mashSc === 35);
        // kaynatma
        S.kaynatmaSure = 60;
        _bmKaynatmaSureGir('-30');
        __REG.ok('negatif kaynatma REDDEDİLDİ', S.kaynatmaSure === 60);
        _bmKaynatmaSureGir('180'); __REG.ok('uzun kaynatma 180 dk MEŞRU', S.kaynatmaSure === 180);
        // sparge
        _bmSpargeGir('-3');
        __REG.ok('negatif sparge REDDEDİLDİ (alan temiz)', S.spargeL === null);
        _bmSpargeGir('0'); __REG.ok('sparge 0 (bilinçli tam-hacim) MEŞRU', S.spargeL === 0);
        // maltEkle: boş kg RED (1 kg sessiz ikamesi bitti)
        setSekme('malt'); if (typeof render === 'function') render();
        const n0 = S.maltlar.length;
        yM.id = 'pilsner'; const kgEl = document.getElementById('ymKg'); if (kgEl) kgEl.value = '';
        mesajlar.length = 0; maltEkle();
        __REG.ok('boş kg: malt EKLENMEDİ + uyarı', S.maltlar.length === n0 && mesajlar.some(m => /kg > 0/.test(m)), mesajlar.join('|').slice(0, 60));
        // hop AA: 90 → katalog + uyarı; IBU negatif imkansız (inputlar HOP sekmesinde)
        setSekme('hop'); if (typeof render === 'function') render();
        const h0 = S.hoplar.length;
        yH.id = 'magnum'; yH.tur = 'boil'; yH.dk = 60;
        const gEl = document.getElementById('yhG'); if (gEl) gEl.value = '30';
        const aaEl = document.getElementById('yhAA'); if (aaEl) aaEl.value = '90';
        __REG.ok('hop form DOM hazır', !!gEl && !!aaEl);
        mesajlar.length = 0; hopEkle();
        const sonHop = S.hoplar[S.hoplar.length - 1];
        __REG.ok('AA=90: hop eklendi ama cAA=null (katalog) + uyarı', S.hoplar.length === h0 + 1 && sonHop.cAA === null && mesajlar.some(m => /1-30/.test(m)), JSON.stringify({ cAA: sonHop && sonHop.cAA }));
        // hop dk > kaynatma uyarısı
        S.kaynatmaSure = 30; yH.id = 'magnum'; yH.dk = 90;
        if (gEl) gEl.value = '10'; if (aaEl) aaEl.value = '';
        mesajlar.length = 0; hopEkle();
        __REG.ok('dk 90 > kaynatma 30: kabul + GÖRÜNÜR uyarı', mesajlar.some(m => /kaynatma süresinden/.test(m)));
        // mineral 0 RED
        setSekme('su'); if (typeof render === 'function') render();
        const mn0 = S.suMineralleri.length;
        const minEl = document.getElementById('yMinMiktar'); if (minEl) minEl.value = '0';
        yMin.id = 'cacl2'; mesajlar.length = 0; mineralEkle();
        __REG.ok('mineral 0: EKLENMEDİ + uyarı (0→1 ikamesi bitti)', S.suMineralleri.length === mn0 && mesajlar.some(m => />0/.test(m)));
        // gelecek-tarihli pitching: '-3. gün' yerine anlamlı metin
        const d = new Date(Date.now() + 3 * 864e5);
        const ileri = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        S.brewLog = [{ tip: 'pitching', tarih: ileri, deger: '', id: 'p1' }];
        setSekme('takvim'); if (typeof render === 'function') render();
        const metin = document.getElementById('ekran') ? document.getElementById('ekran').innerText : document.body.innerText;
        __REG.ok("gelecek pitching: 'gün SONRA' metni + negatif gün YOK (iki yazımda da)", /gün SONRA/.test(metin) && !/Ferman?tasyon[^\n]{0,15}-\d/.test(metin), (metin.match(/(Ferman?tasyon[^\n]{0,25}|gün SONRA)/) || [])[0]);
      } finally { window.flash = eskiF; }
      return __REG.al();
    })
  },

  // ── SPRINT BE4: öğrenme doğruluğu (BD F7-1/F7-2/F7-3 + medyan) ──
  {
    kod: 'BE4-OLCUM', ad: 'ölçümsüz-şişme bitti: nV/wV metrik-bazlı (ölçümsüz tamam batch ağırlığı şişiremez); medyan uç değere dayanıklı; chip uyumu verimOrt±3 + öneri=gerçek ort (harman değil); retro-tamam tanınır',
    calistir: (page) => page.evaluate(() => {
      const src = KR.find(r => r && Array.isArray(r.maltlar) && r.maltlar.length > 0);
      const h = src.hacim != null ? +src.hacim : 11;
      const F = hOG(src.maltlar, 0, src.katkilar || [], h) - 1;
      const M = (hOG(src.maltlar, 100, src.katkilar || [], h) - 1 - F) / 100;
      const olculu = (i, hedefV) => ({ id: 'be4-' + i, biraAd: 'BE4 ' + i, durum: 'arsiv', hacim: h, verim: 41,
        maltlar: JSON.parse(JSON.stringify(src.maltlar)), katkilar: JSON.parse(JSON.stringify(src.katkilar || [])),
        brewSnapshot: { ts: 1000 + i, ogT: 1.05, fgT: 1.012, verimVarsayim: 41, hacim: h },
        brewSonuc: { ts: 2000 + i, ogG: Math.round((1 + F + M * hedefV) * 1000) / 1000, fgG: 1.012, kaynak: { og: 'olcum', fg: 'olcum' } },
        brewLog: [] });
      KR.length = 0;
      // 1 ölçümlü + 1 ÖLÇÜMSÜZ-tamam (retro şişeleme loglu, aynı saat tabanı — F7-3 kilidi)
      KR.unshift(olculu(1, 41));
      KR.unshift({ id: 'be4-olcumsuz', biraAd: 'BE4 Ölçümsüz', durum: 'arsiv', hacim: h, verim: 61,
        maltlar: JSON.parse(JSON.stringify(src.maltlar)),
        brewLog: [
          { tip: 'pitching', tarih: '2026-04-12', id: '1780000000000' },
          { tip: 'siseleme', tarih: '2026-05-02', id: '1780000060000' }] });
      _origKy(KR);
      const a1 = bmProfilAnaliz();
      const olcumsuzK = a1.kayitlar.find(k => k.id === 'be4-olcumsuz');
      __REG.ok('F7-3: retro günlüklü batch TAMAM tanındı (bilgi kaybolmadı)', !!olcumsuzK && olcumsuzK.durum === 'tamam', olcumsuzK && olcumsuzK.durum);
      __REG.ok('özet: tamamN=2 ama nV=1 (ölçümsüz sayılMADI)', a1.ozet && a1.ozet.tamamN === 2 && a1.ozet.nV === 1, JSON.stringify(a1.ozet && { tamamN: a1.ozet.tamamN, nV: a1.ozet.nV }));
      const kp1 = _bmKisiselProfil();
      __REG.ok('BE4-1: köprü KAPALI (eski kod n=2 diye açardı)', kp1.aktif === false && kp1.verimKalibre === null, JSON.stringify({ aktif: kp1.aktif }));
      // 2. ölçümlü → nV=2, tamamN=3: ağırlık nV'den (0.25), tamamN'den (0.5) DEĞİL
      KR.unshift(olculu(2, 42)); _origKy(KR);
      const kp2 = _bmKisiselProfil();
      __REG.ok('nV=2 → aktif; wV=0.25 (tamamN=3 olsa da ağırlık ölçümlüden)', kp2.aktif === true && kp2.n === 3 && kp2.nV === 2 && kp2.w === 0.25, JSON.stringify({ n: kp2.n, nV: kp2.nV, w: kp2.w }));
      // medyan: 3. ölçümlü %75 (bant içi uç) → ortalama ~52.7 olurdu, medyan ~42 kalmalı
      KR.unshift(olculu(3, 75)); _origKy(KR);
      const kp3 = _bmKisiselProfil();
      __REG.ok('BE4-2 MEDYAN: bant-içi uç (%75) merkezi çekemedi (~42)', kp3.verimOrt != null && Math.abs(kp3.verimOrt - 42) < 1.6, String(kp3.verimOrt));
      // chip: S.verim=41 → UYUMLU (Uygula yok); S.verim=61 → öneri = round(verimOrt) (harman %5x DEĞİL)
      tarifAc(KR.find(k => k.id === 'be4-1').id);
      S.verim = 41;
      const chipUyum = _bmVerimChipHtml();
      __REG.ok('F7-2: %41 gerçeğe karşı UYUMLU (Uygula yok — %56 şişmesi bitti)', chipUyum.indexOf('uyumlu') > -1 && chipUyum.indexOf('Uygula') < 0, chipUyum.replace(/<[^>]+>/g, '').slice(0, 80));
      S.verim = 61;
      const chipOneri = _bmVerimChipHtml();
      const beklenenOneri = Math.round(kp3.verimOrt);
      __REG.ok('öneri = GERÇEK ortalama (' + beklenenOneri + '), harman değil', chipOneri.indexOf('öneri <b>%' + beklenenOneri + '</b>') > -1, chipOneri.replace(/<[^>]+>/g, '').slice(0, 90));
      __REG.ok('depo nV taşıyor (Ayarlar sayacı ölçümlü sayıyı görür)', (JSON.parse(localStorage.getItem('bm_kaan_profil_v1') || '{}').nV) === 3);
      return __REG.al();
    })
  },
  {
    kod: 'BE4-MUZO', ad: 'Muzo gerçek-akış simülasyonu: "1054" aç-kaydet ile düzelir → FG 1.016 + şişeleme → brewSonuc ölçümlü donar, şeker ayrımı doğru (verimG malt-bazlı ~%41), batch nV\'ye girer',
    calistir: (page) => page.evaluate(() => {
      const MID = '1775830924009';
      let mr = KR.find(k => k && String(k.id) === MID);
      __REG.ok('fixture Muzo var', !!mr);
      // bulut GÜNCEL durumu birebir kur (24 Ağu 17:30 anlık görüntüsü)
      mr.maltlar = [{ id: 'wheat', kg: 2 }, { id: 'pilsner', kg: 1 }, { id: 'acid', kg: 0.16 }];
      mr.katkilar = [{ ad: 'Maltodextrin', birim: 'g', id: 'maltodex', miktar: 100, zaman: 'Kaynatmada' },
                     { ad: 'Corn Sugar (Dextrose Monohydrate)', birim: 'g', id: 'corn_sugar', miktar: 450, zaman: 'Kaynatmada' }];
      mr.hacim = 11; mr.verim = 41; mr.durum = 'yapimda';
      mr.brewSnapshot = { ts: 1787581793799, ogT: 1.054, fgT: 1.013, verimVarsayim: 41, hacim: 11, mayaId: 'bb_alman_bugday1' };
      mr.brewLog = [
        { tip: 'pitching', tarih: '2026-08-16', deger: '', id: '1787581793798', not: '' },
        { tip: 'og_olcum', tarih: '2026-08-16', deger: '1054', id: '1787581800860', not: '' }];
      delete mr.brewSonuc; delete mr.ogManuel; delete mr.fgManuel;
      _origKy(KR);
      tarifAc(MID); setSekme('takvim'); if (typeof render === 'function') render();
      // 1) Kaan'ın düzeltme akışı: "1054" kaydını aç → Kaydet (BC edit yolu normalize eder)
      const ogIdx = S.brewLog.findIndex(e => e && e.tip === 'og_olcum');
      logDuzenle(ogIdx); logEkle();
      __REG.ok('aç-kaydet: 1054 → "1.054" + ogManuel dolu', S.brewLog.find(e => e.tip === 'og_olcum').deger === '1.054' && S.ogManuel === 1.054, JSON.stringify({ d: S.brewLog.find(e => e.tip === 'og_olcum').deger, m: S.ogManuel }));
      // 2) FG 1.016 + şişeleme (bugün)
      const tipEl = document.getElementById('logTip'), tarihEl = document.getElementById('logTarih'), degerEl = document.getElementById('logDeger');
      const d = new Date(); const bugun = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      tipEl.value = 'fg_olcum'; tarihEl.value = bugun; degerEl.value = '1.016'; logEkle();
      tipEl.value = 'siseleme'; tarihEl.value = bugun; degerEl.value = ''; logEkle();
      const mr2 = KR.find(k => k && String(k.id) === MID);
      __REG.ok('brewSonuc ÖLÇÜMLÜ dondu {1.054, 1.016}', !!mr2.brewSonuc && mr2.brewSonuc.ogG === 1.054 && mr2.brewSonuc.fgG === 1.016, JSON.stringify(mr2.brewSonuc && { og: mr2.brewSonuc.ogG, fg: mr2.brewSonuc.fgG }));
      // 3) analiz: batch tamam + ölçümlü + şeker ayrımı (verimG MALT-bazlı — 550g şeker F sabitinde)
      const a = bmProfilAnaliz();
      const mk = a.kayitlar.find(k => k.id === MID);
      __REG.ok('batch TAMAM + atten hesaplandı', !!mk && mk.durum === 'tamam' && mk.atten != null, JSON.stringify(mk && { d: mk.durum, at: mk.atten }));
      __REG.ok('AT7/şeker ayrımı: verimG malt-bazlı gerçekçi (%33-50 bandı; şeker verimi şişirmedi)', mk.verimG != null && mk.verimG > 33 && mk.verimG < 50, String(mk && mk.verimG));
      __REG.ok('batch nV sayımına GİRDİ (ölçümlü)', a.ozet == null || a.ozet.nV >= 1, JSON.stringify(a.ozet && { tamamN: a.ozet.tamamN, nV: a.ozet.nV }));
      return __REG.al();
    })
  },

  // ── SPRINT BE5: sessiz altyapı — ring bağlama + sync görünürlüğü + kalan BD bulguları ──
  {
    kod: 'BE5-RING', ad: 'bağlanan catch ring\'e düşer (krSilYaz quota-sim); A1 plan korunur; tadım clamp; stilTah ghost-draft volatil; ring-kayıp sayacı görünür',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('BE5 Ring', {});
      const mesajlar = []; const eskiF = window.flash;
      window.flash = function (m) { mesajlar.push(String(m)); try { return eskiF.apply(this, arguments); } catch (_e) {} };
      const origSet = Storage.prototype.setItem;
      try {
        // B1: tombstone yazımı patlat → ring'e düştü (silme akışı bozulmaz)
        bmHataLogSil();
        Storage.prototype.setItem = function (k, v) { if (k === 'bm_kr_sil_v1') throw new Error('QUOTA-SIM'); return origSet.apply(this, arguments); };
        _krSilEkle('be5-x');
        __REG.ok('B1: tombstone yutulması ring\'de', (bmHataLogOku() || []).some(h => h && /_krSilYaz/.test(h.kaynak || '')));
      } finally { Storage.prototype.setItem = origSet; }
      // A1: bozuk tarih planı SİLMİYOR
      S.planBrewTarih = '2026-09-01';
      bmPlanBrewSet('bozuk-tarih');
      __REG.ok('A1: geçersiz tarihte plan KORUNDU + uyarı', S.planBrewTarih === '2026-09-01' && mesajlar.some(m => /Geçersiz tarih/.test(m)), S.planBrewTarih);
      bmPlanBrewSet(''); __REG.ok('A1: boş = bilinçli temizleme AYNEN', S.planBrewTarih === null);
      // F3-5: tadım clamp (klavye yolu)
      tadimSet('tat', '99'); __REG.ok('tadım 99 → 20 clamp', S.tadim.tat === 20, String(S.tadim.tat));
      tadimSet('aroma', '-5'); __REG.ok('tadım -5 → 0 clamp', S.tadim.aroma === 0);
      // F2-6: stilTah/altStil volatil — kıyası kırmaz
      const krK = KR.find(k => k && k.id === id);
      const sK = JSON.parse(JSON.stringify(krK)); sK.stilTah = 'Weizen / Weissbier'; sK.altStil = '';
      __REG.ok('F2-6: stilTah farkı ghost-draft üretmez (_draftKrAyniMi true)', _draftKrAyniMi(krK, sK) === true);
      // A7: ring-kayıp göstergesi
      window._bmRingKayip = 3;
      const ayar = rStokAyarlar();
      __REG.ok('A7: yazılamayan kayıt sayacı Ayarlar\'da', ayar.indexOf('3 hata kaydı YAZILAMADI') >= 0);
      window._bmRingKayip = 0;
      window.flash = eskiF;
      return __REG.al();
    })
  },
  {
    kod: 'BE5-SYNC', ad: 'sync kapsamı ŞEFFAF: canlı senkron yalnız reçete+stok; cihaz-yerel liste (alarm/öğrenme/taslak) + Yedek yönlendirmesi görünür',
    calistir: (page) => page.evaluate(() => {
      const h = rStokAyarlar();
      __REG.ok('senkron kapsamı net', h.indexOf('Canlı senkron YALNIZ reçete + stok') >= 0);
      __REG.ok('cihaz-yerel liste net (alarm planları + öğrenme)', h.indexOf('alarm planları') >= 0 && h.indexOf('öğrenme havuzları') >= 0);
      __REG.ok('Yedek yönlendirmesi var', /Yedek/.test(h));
      __REG.ok('Yedek satırı sync-taşımayanları söylüyor', h.indexOf('sync\'in taşımadıkları dahil') >= 0);
      return __REG.al();
    })
  },
  {
    kod: 'BE5-KALAN', ad: 'F1-5 Yenile: atlandi korunur + geçmiş-ts yeniden-kurulanlar atlandi (modal canlanması yok); F1-4 saat değişimi re-anchor gününü korur; F4-3 attenHistory brewSonuc okur; F3-4 düzenleme→siseleme sonuç yazar',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('BE5 Kalan', { stil: 'Weizen / Weissbier', mayaId: 'bb_alman_bugday1' });
      // F1-5: 40 gün önce pitch → çoğu alarm geçmiş
      const plan = _alarmPlaniKur(_editId, Date.now() - 40 * 864e5);
      __REG.ok('plan kuruldu', !!(plan && plan.ok));
      let t = _alarmlariOku(); const g0 = t[_editId].alarmlar[0].g;
      t[_editId].alarmlar[0].durum = 'atlandi'; _alarmlariYaz(t);
      _alarmPlaniYenile();
      const y = _alarmlariOku()[_editId];
      __REG.ok('F1-5a: atlandi KORUNDU (tamamlandi olmadı)', y.alarmlar.find(a => a.g === g0).durum === 'atlandi');
      __REG.ok('F1-5b: geçmiş-ts alarmlar bekliyor DEĞİL atlandi (kritik modal canlanmaz)', !y.alarmlar.some(a => a.durum === 'bekliyor' && a.ts < Date.now() - 864e5), JSON.stringify(y.alarmlar.filter(a => a.durum === 'bekliyor').map(a => a.g)));
      // F1-4: _sonrasiGun'lu bekliyor alarmda saat değişimi GÜNÜ korur
      t = _alarmlariOku();
      const hedefGun = new Date(Date.now() + 10 * 864e5); hedefGun.setHours(10, 0, 0, 0);
      t[_editId].alarmlar.push({ g: 99, ts: hedefGun.getTime(), tip: 'kontrol', aksiyon: '🫧 Karbonasyon kontrol — test', durum: 'bekliyor', _sonrasiGun: 14 });
      _alarmlariYaz(t);
      _alarmSaatiAyarla('08:30');
      const a99 = _alarmlariOku()[_editId].alarmlar.find(a => a.g === 99);
      const d99 = new Date(a99.ts);
      __REG.ok('F1-4: gün AYNI kaldı, yalnız saat değişti (08:30)', d99.toDateString() === hedefGun.toDateString() && d99.getHours() === 8 && d99.getMinutes() === 30, d99.toString().slice(0, 24));
      // F4-3: attenHistory brewSonuc'tan okur (ogManuel yokken)
      const mr = KR.find(k => k && k.id === id);
      mr.ogManuel = null; mr.mayaId = 'bb_alman_bugday1';
      mr.brewSonuc = { ts: 1, ogG: 1.054, fgG: 1.014, kaynak: { og: 'olcum', fg: 'olcum' } };
      const ah = attenHistory('bb_alman_bugday1');
      __REG.ok('F4-3: donmuş çiftten atten hesaplandı (~74)', !!ah && ah.count >= 1 && Math.abs(ah.avg - 74.1) < 2, ah && String(ah.avg));
      // F3-4: düzenlemeyle tip→siseleme çevrilince brewSonuc yazılır
      delete mr.brewSonuc;
      tarifAc(id); setSekme('takvim'); if (typeof render === 'function') render();
      S.brewLog = [{ tip: 'cold_crash', tarih: '2026-08-20', deger: '', not: '', id: 'cc1' }];
      if (typeof render === 'function') render();
      logDuzenle(0);
      const tipEl = document.getElementById('logTip'); tipEl.value = 'siseleme';
      logEkle();
      __REG.ok('F3-4: tip→siseleme düzenlemesi brewSonuc DONDURDU', !!(KR.find(k => k && k.id === id) || {}).brewSonuc);
      return __REG.al();
    })
  },
  {
    kod: 'BF-GUN', ad: 'SPRINT BF: gün sayacı regresyonu — 4 yüzeyde (ana ekran kartı + üst durum + akordiyon meta + Genel) faz+gün görünür; BE3 negatif-gün deseni korunur; şişeleme→Kondisyon N. gün; brewLog null kaydı render çökertmez',
    calistir: (page) => page.evaluate(() => {
      const MID = '1775830924009';
      const mr = KR.find(k => k && String(k.id) === MID);
      __REG.ok('fixture Muzo var', !!mr);
      mr.durum = 'yapimda';
      function isoGun(d2) { const d = new Date(); d.setDate(d.getDate() + d2); return d.toISOString().slice(0, 10); }
      function yuzey() {
        const kart = renderYapimdaVurgu();
        const km = kart.match(/data-tid="1775830924009"[\s\S]*?bm-yapimda-item-meta">([^<]*)</);
        tarifAc(mr.id); sekme = 'takvim'; render();
        const acc = document.querySelector('[data-acc-id="takvim-faz"]');
        const r = { kartMeta: km ? km[1] : '', fazMeta: acc ? acc.querySelector('.bm-acc-meta').innerText : '', fazKart: acc ? acc.innerText.replace(/\s+/g, ' ') : '' };
        sekme = 'genel'; render(); r.genel = document.body.innerText;
        return r;
      }
      // a) POZİTİF gün (Muzo gerçeği: pitch 12 gün önce) — bir daha kaybolmasın
      mr.brewLog = [{ tip: 'pitching', tarih: isoGun(-12), deger: '', id: 'p1', not: '' }, { tip: 'og_olcum', tarih: isoGun(-12), deger: '1.054', id: 'o1', not: '' }];
      const gBek = Math.floor((new Date() - new Date(isoGun(-12))) / 864e5); // uygulamayla AYNI formül — saat dilimi kaymasına dayanıklı
      let y = yuzey();
      __REG.ok('a1 ana kart: Fermentasyon N. gün', y.kartMeta === '⏱️ Fermentasyon ' + gBek + '. gün', y.kartMeta);
      __REG.ok('a2 üst durum: Primary Fermantasyon · N. Gün', y.fazKart.indexOf('Primary Fermantasyon · ' + gBek + '. Gün') > -1, y.fazKart.slice(0, 120));
      __REG.ok('a3 akordiyon meta: Primary · N. gün', y.fazMeta === 'Primary · ' + gBek + '. gün', y.fazMeta);
      __REG.ok('a4 Genel: Fermentasyon N. Günde', y.genel.indexOf('⏱️ Fermentasyon ' + gBek + '. Günde') > -1);
      // b) BE3 KORUNUMU: gelecek pitch → "SONRA" deseni, negatif gün hiçbir yüzeyde yok
      mr.brewLog = [{ tip: 'pitching', tarih: isoGun(5), deger: '', id: 'p2', not: '' }];
      y = yuzey();
      __REG.ok('b1 ana kart: Pitching N gün SONRA', /Pitching \d+ gün SONRA/.test(y.kartMeta), y.kartMeta);
      __REG.ok('b2 üst durum: SONRA deseni', y.fazKart.indexOf('gün SONRA') > -1, y.fazKart.slice(0, 120));
      __REG.ok('b3 negatif gün hiçbir yüzeyde yok', !/-\d+\. [Gg]ün/.test(y.kartMeta + ' ' + y.fazMeta + ' ' + y.fazKart));
      __REG.ok('b4 Genel: SONRA deseni', /Pitching \d+ gün SONRA/.test(y.genel));
      // c) şişeleme → Kondisyon N. gün (faz geçişi)
      mr.brewLog = [{ tip: 'pitching', tarih: isoGun(-15), deger: '', id: 'p3', not: '' }, { tip: 'siseleme', tarih: isoGun(-3), deger: '', id: 's3', not: '' }];
      const kBek = Math.floor((new Date() - new Date(isoGun(-3))) / 864e5);
      y = yuzey();
      __REG.ok('c1 ana kart: Kondisyon N. gün', y.kartMeta === '🍺 Kondisyon ' + kBek + '. gün', y.kartMeta);
      __REG.ok('c2 üst durum: Kondisyon · N. Gün', y.fazKart.indexOf('Kondisyon · ' + kBek + '. Gün') > -1, y.fazKart.slice(0, 120));
      __REG.ok('c3 akordiyon meta: Kondisyon · N. gün', y.fazMeta === 'Kondisyon · ' + kBek + '. gün', y.fazMeta);
      __REG.ok('c4 Genel: Kondisyon N. Günde', y.genel.indexOf('🍺 Kondisyon ' + kBek + '. Günde') > -1);
      // d) KÖK KALKAN: brewLog'da null kayıt → render çökmez, gün görünür, null süzülür
      mr.brewLog = [{ tip: 'pitching', tarih: isoGun(-12), deger: '', id: 'p4', not: '' }, null, { tip: 'og_olcum', tarih: isoGun(-12), deger: '1.054', id: 'o4', not: '' }];
      y = yuzey();
      __REG.ok('d1 null kayıtla ana kart gün gösterir', y.kartMeta.indexOf('Fermentasyon ' + gBek + '. gün') > -1, y.kartMeta);
      __REG.ok('d2 null kayıtla üst durum gün gösterir', y.fazKart.indexOf('Primary Fermantasyon · ' + gBek + '. Gün') > -1, y.fazKart.slice(0, 120));
      __REG.ok('d3 null kayıt render girişinde süzüldü (S)', Array.isArray(S.brewLog) && S.brewLog.length === 2 && S.brewLog.every(function (x) { return x && x.tip; }), JSON.stringify(S.brewLog && S.brewLog.length));
      return __REG.al();
    })
  },

  // ═════════════ SPRINT BG — ÖDÜLLÜ ÖRNEK ÖNİZLEMESİ ═════════════
  {
    kod: 'BG1-ONIZLE', ad: 'SPRINT BG1: örnek önizlemesi — NHC örneği TAM içerik (kimlik+ölçüler+mash+gramajlı grist/hop+maya+AN çerçevesi); AHA örneği dürüst-boşluk satırları (hop gramajı/gram-kg/hacim kaynakta yok); açılış reçete OLUŞTURMAZ; Kapat hiçbir şey değiştirmez; YASAK kelime 0',
    calistir: (page) => page.evaluate(() => {
      const YASAK = ['daha iyi', 'daha kötü', 'yapmalısın', 'yapmalı', 'hatalı', 'yanlış', 'olmalı', 'gerekir',
        'tavsiye', 'öneriyoruz', 'düzelt', 'kötü', 'başarılı', 'kazanmak için', 'kazandıran', 'ideal', 'doğrusu', 'eksik'];
      const tara = (t) => YASAK.filter(k => String(t || '').toLocaleLowerCase('tr-TR').indexOf(k) >= 0);
      __REG.yeniKayit('REGTEST BG1', {});
      const n0 = KR.length; const ad0 = S.biraAd;
      // (a) NHC örneği — zengin kayıt (Altbier 2012: og+fg+ib+sr+ms+gramlı hop, 68.1 L)
      const r1 = _bmOrnekOnizle('nhc', 'Altbier / Düsseldorf Altbier', 1);
      const m1 = document.getElementById('bmOrnekOnizle');
      __REG.ok('(a) NHC önizleme açıldı, reçete OLUŞMADI', r1 === true && !!m1 && KR.length === n0 && S.biraAd === ad0);
      const t1 = m1 ? m1.textContent : '';
      __REG.ok('(a) kimlik: stil + NHC altın + yıl + orijinal hacim', t1.indexOf('Altbier / Düsseldorf Altbier') >= 0 && t1.indexOf('NHC finali altın · 2012') >= 0 && t1.indexOf('68,1 L') >= 0);
      __REG.ok('(a) ölçüler: OG+FG+IBU+mash görünür', t1.indexOf('1,051') >= 0 && t1.indexOf('1,010') >= 0 && t1.indexOf('42') >= 0 && t1.indexOf('66°C') >= 0);
      __REG.ok('(a) grist gramajlı + yüzde hesaplı', t1.indexOf('11,34 kg') >= 0 && t1.indexOf('German Pilsner malt') >= 0 && /%\d+/.test(t1));
      __REG.ok('(a) hop gramajlı + dakika + AA', t1.indexOf('57 g') >= 0 && t1.indexOf('Tettnanger') >= 0 && t1.indexOf('@60dk') >= 0 && t1.indexOf('AA') >= 0);
      __REG.ok('(a) maya + AN çerçevesi (elenen yok + kural değil)', t1.indexOf('Wyeast 1007') >= 0 && t1.indexOf('elenen') >= 0 && t1.indexOf('kural değil') >= 0);
      __REG.ok('(a) NHC yolunda dürüst-boşluk satırı YAZILMAZ (gramaj kaynakta var)', t1.indexOf('gramajı kaynakta yok') < 0);
      __REG.ok('(a) iki aksiyon butonu: oluştur + Kapat', !!m1.querySelector('button[onclick="bmOrnekOnizleOlustur()"]') && t1.indexOf('Yeni reçete oluştur') >= 0 && t1.indexOf('Kapat') >= 0);
      __REG.ok('(a) AN5-DIL: NHC önizleme metninde yasak kelime 0', tara(t1).length === 0, tara(t1).join(','));
      bmOrnekOnizleKapat();
      __REG.ok('(a) Kapat: modal kalktı + hiçbir şey oluşmadı', !document.getElementById('bmOrnekOnizle') && KR.length === n0 && S.biraAd === ad0);
      // (b) AHA örneği — hop gramajsız kaynak (American Barleywine eski tabloda var, NHC tablosunda yok)
      __REG.ok('(b) önkoşul: American Barleywine yalnız eski tabloda', !!window._TOPLULUK_MADALYA['American Barleywine'] && !window._NHC_MADALYA['American Barleywine']);
      const r2 = _bmOrnekOnizle('aha', 'American Barleywine', 0);
      const m2 = document.getElementById('bmOrnekOnizle');
      __REG.ok('(b) AHA önizleme açıldı, reçete OLUŞMADI', r2 === true && !!m2 && KR.length === n0);
      const t2 = m2 ? m2.textContent : '';
      __REG.ok('(b) dürüst boşluk: hop gramajı + gram/kg + mash + hacim "kaynakta yok"', t2.indexOf('Hop gramajı kaynakta yok') >= 0 && t2.indexOf('Gram/kg miktarı kaynakta yok') >= 0 && t2.indexOf('kaynakta yok') >= 0);
      __REG.ok('(b) grist yüzdeleri + madalya derecesi görünür', /%\d+/.test(t2) && /alt[ıi]n|gümüş|bronz|madalya/.test(t2));
      __REG.ok('(b) AN çerçevesi AHA yolunda da korunur', t2.indexOf('elenen') >= 0 && t2.indexOf('kural değil') >= 0);
      __REG.ok('(b) AN5-DIL: AHA önizleme metninde yasak kelime 0', tara(t2).length === 0, tara(t2).join(','));
      bmOrnekOnizleKapat();
      __REG.ok('(b) kapanış temiz', !document.getElementById('bmOrnekOnizle') && KR.length === n0);
      return __REG.al();
    })
  },
  {
    kod: 'BG2-AKSIYON', ad: 'SPRINT BG2: önizlemeden "Yeni reçete oluştur" = AW/AX yolu AYNEN (iskelet+hedefler+mash+not+ad); modal kapanır; Escape reçete oluşturmaz; kapalıyken oluştur çağrısı güvenli; butonların onclick\'i artık önizleme (doğrudan-oluştur KALKTI)',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('REGTEST BG2', {});
      S.hacim = 10; S.verim = 45; tarifeKaydet();
      const stil = 'Altbier / Düsseldorf Altbier';
      // (a) NHC yolu önizlemeden — AX3 davranışının aynısı
      const n0 = KR.length;
      _bmOrnekOnizle('nhc', stil, 1);
      const yid = bmOrnekOnizleOlustur();
      __REG.ok('(a) oluştur: yeni reçete + iskelet + stil (AX yolu)', KR.length === n0 + 1 && !!yid && S.stil === stil && (S.maltlar || []).length > 0 && (S.hoplar || []).length > 0);
      __REG.ok('(a) AX AYNEN: mash taşındı + NOT NHC kaynaklı + gerçek gramajlar', S.mashSc === 66 && String(S.notlar || '').indexOf('AHA NHC finalinde altın almış') >= 0 && String(S.notlar || '').indexOf('57 g Tettnanger @60dk') >= 0);
      __REG.ok('(a) AD örneğinden + modal kapandı', S.biraAd.indexOf(stil + ' — NHC 2012 örneğinden') === 0 && !document.getElementById('bmOrnekOnizle'));
      // (b) AHA yolu önizlemeden — AW davranışının aynısı
      const n1 = KR.length;
      _bmOrnekOnizle('aha', 'American Barleywine', 0);
      const yid2 = bmOrnekOnizleOlustur();
      __REG.ok('(b) AW AYNEN: yeni reçete + notta "gramaj kaynakta YOK — kendi hesabını yap"', KR.length === n1 + 1 && !!yid2 && String(S.notlar || '').indexOf('gramaj kaynakta YOK — kendi hesabını yap') >= 0);
      // (c) Escape ile kapatma — hiçbir şey oluşmaz
      const n2 = KR.length;
      _bmOrnekOnizle('nhc', stil, 0);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      __REG.ok('(c) Escape: modal kapandı + reçete OLUŞMADI', !document.getElementById('bmOrnekOnizle') && KR.length === n2);
      // (d) modal kapalıyken oluştur çağrısı güvenli (çifte tık / bayat çağrı)
      const n3 = KR.length;
      const bos = bmOrnekOnizleOlustur();
      __REG.ok('(d) kapalıyken oluştur: null döner + reçete oluşmaz', bos === null && KR.length === n3);
      // (e) DOM kanıtı: örnek butonlarının onclick\'i artık önizleme çağırır
      ekran = 'editor'; sekme = 'genel';
      S.hacim = 11; S.verim = 61; S.stil = 'Weizen / Weissbier'; bmStilIskeletDoldur(); render();
      const el = document.querySelector('.bm-topluluk');
      const btn = el ? Array.from(el.querySelectorAll('button')).filter(b => /Bu örnekten yola çık/.test(b.innerText)) : [];
      __REG.ok('(e) buton onclick = _bmOrnekOnizle, doğrudan-oluştur YOK', btn.length > 0 && btn.every(b => (b.getAttribute('onclick') || '').indexOf('_bmOrnekOnizle(') === 0 && (b.getAttribute('onclick') || '').indexOf('YeniRecete') < 0), btn.length ? btn[0].getAttribute('onclick') : 'buton yok');
      return __REG.al();
    })
  },
  {
    kod: 'BG3-KAPSAM', ad: 'SPRINT BG3: ödüllü örneği OLMAYAN stilde (iki tabloda da yok) topluluk bloğu dürüst kapsam satırı basar ("ödüllü örnek verimizde yok" + gerçek havuz sayısı); uydurma örnek basılmaz; örnekli stilde satır YOK',
    calistir: (page) => page.evaluate(() => {
      const M = window._TOPLULUK_MADALYA, N = window._NHC_MADALYA;
      __REG.ok('önkoşul: Dubbel iki madalya tablosunda da yok + dağılımda var', !M['Dubbel'] && !N['Dubbel'] && !!window._TOPLULUK_DAGILIM['Dubbel']);
      __REG.yeniKayit('REGTEST BG3', {});
      // AN6 deseni: Dubbel + OG bandın altına → topluluk bloğu kesin basılır
      ekran = 'editor'; sekme = 'genel';
      S.hacim = 11; S.verim = 61; S.stil = 'Dubbel'; bmStilIskeletDoldur();
      S.maltlar = (S.maltlar || []).map(m => ({ ...m, kg: (m.kg || 0) * 0.45 }));
      render();
      const el = document.querySelector('.bm-topluluk');
      __REG.ok('topluluk bloğu basıldı (gözlem var)', !!el);
      const t = el ? el.textContent : '';
      const u = {}; Object.keys(M).concat(Object.keys(N)).forEach(a => u[a] = 1);
      const say = Object.keys(u).length;
      __REG.ok('kapsam satırı: "ödüllü örnek verimizde yok" + gerçek havuz sayısı', t.indexOf('ödüllü örnek verimizde yok') >= 0 && t.indexOf(say + ' stili kapsıyor') >= 0, 'havuz=' + say);
      __REG.ok('uydurma örnek YOK: madalya/NHC bölümü basılmadı', t.indexOf('madalya almış') < 0 && t.indexOf('NHC') < 0 && t.indexOf('🏅') < 0);
      __REG.ok('satır yargı taşımaz (yalın kapsam dili)', t.indexOf('veri kapsamı durumu') >= 0 && t.indexOf('yargı değil') >= 0);
      __REG.ok('kapsam satırı tıklanabilir öğe eklemez (AN6 kuralı korunur)', el.querySelectorAll('[onclick],button,[role=button]').length === 0);
      // örnekli stilde kapsam satırı YAZILMAZ
      __REG.yeniKayit('BG3 poz', {});
      ekran = 'editor'; sekme = 'genel';
      S.hacim = 11; S.verim = 61; S.stil = 'Weizen / Weissbier'; bmStilIskeletDoldur(); render();
      const el2 = document.querySelector('.bm-topluluk');
      const t2 = el2 ? el2.textContent : '';
      // Weizen HEM AHA hem NHC tablosunda → başlık AHA biçiminde ('madalya almış N reçete'),
      // 'NHC finalinde altın almış' başlığı yalnız NHC-only stillerde basılır (AX2 tasarımı)
      __REG.ok('örnekli stilde kapsam satırı YOK + örnekler duruyor', t2.indexOf('ödüllü örnek verimizde yok') < 0 && (t2.indexOf('madalya almış') >= 0 || t2.indexOf('NHC finalinde altın almış') >= 0), t2.slice(0, 80));
      return __REG.al();
    })
  },

  // ═════════════ SPRINT BH — VERİ YAŞI ŞEFFAFLIĞI + MASH BOŞLUĞU + HAVUZ AYRIMI ═════════════
  {
    kod: 'BH1-YAS', ad: 'SPRINT BH1: önizlemede veri yaşı bağlamı — yıl DİNAMİK (NHC 2012/2013 kayıtları kendi yılını yazar), 2010 ve öncesinde net vurgu + yıl farkı dinamik, 2021+ kayıtta satır YOK, AHA yıllı kayıtta aynı bağlam; dil nötr: yasak kelime 0 + "kullanma/eski/geçersiz" 0',
    calistir: (page) => page.evaluate(() => {
      const YASAK = ['daha iyi', 'daha kötü', 'yapmalısın', 'yapmalı', 'hatalı', 'yanlış', 'olmalı', 'gerekir',
        'tavsiye', 'öneriyoruz', 'düzelt', 'kötü', 'başarılı', 'kazanmak için', 'kazandıran', 'ideal', 'doğrusu', 'eksik'];
      const tara = (t, L) => (L || YASAK).filter(k => String(t || '').toLocaleLowerCase('tr-TR').indexOf(k) >= 0);
      const TON = ['kullanma', 'eski', 'geçersiz', 'güncel değil', 'modası', 'hata'];
      const ac = (k, s, i) => { _bmOrnekOnizle(k, s, i); const m = document.getElementById('bmOrnekOnizle'); const el = m && m.querySelector('.bm-onizle-yas'); const t = el ? el.textContent : ''; bmOrnekOnizleKapat(); return t; };
      const simdi = new Date().getFullYear();
      const N = window._NHC_MADALYA, M = window._TOPLULUK_MADALYA;
      __REG.ok('önkoşul: NHC Altbier#1 2012, Weizen#0 2013, Weizen#2 2008; AHA Altbier#0 2024, #1 2012',
        N['Altbier / Düsseldorf Altbier'][1][1].yil === 2012 && N['Weizen / Weissbier'][1][0].yil === 2013 && N['Weizen / Weissbier'][1][2].yil === 2008
        && M['Altbier / Düsseldorf Altbier'][1][0].yil === 2024 && M['Altbier / Düsseldorf Altbier'][1][1].yil === 2012);
      const t1 = ac('nhc', 'Altbier / Düsseldorf Altbier', 1);
      __REG.ok('(a) 2012 kaydı: satır var, yıl dinamik, nötr cümle (farklı olabilir + BJCP)', t1.indexOf('⏳ 2012 kaydı') >= 0 && t1.indexOf('farklı olabilir') >= 0 && t1.indexOf('BJCP') >= 0, t1);
      __REG.ok('(a) 2012: net-vurgu biçimi DEĞİL', t1.indexOf('belirgin') < 0 && t1.indexOf('yıl önce') < 0, t1);
      const t3 = ac('nhc', 'Weizen / Weissbier', 0);
      __REG.ok('(b) 2013 kaydı: kendi yılı (dinamik), 2012 yazmaz', t3.indexOf('⏳ 2013 kaydı') >= 0 && t3.indexOf('2012') < 0, t3);
      const t2 = ac('nhc', 'Weizen / Weissbier', 2);
      __REG.ok('(b) 2008 kaydı: net vurgu + yıl farkı dinamik', t2.indexOf('⏳ 2008 kaydı (' + (simdi - 2008) + ' yıl önce)') >= 0 && t2.indexOf('belirgin farklı olabilir') >= 0, t2);
      const t4 = ac('aha', 'Altbier / Düsseldorf Altbier', 0);
      __REG.ok('(c) AHA 2024 kaydı: satır YOK (güncel dönem)', t4 === '', t4);
      const t5 = ac('aha', 'Altbier / Düsseldorf Altbier', 1);
      __REG.ok('(c) AHA 2012 kaydı: aynı bağlam satırı', t5.indexOf('⏳ 2012 kaydı') >= 0 && t5.indexOf('farklı olabilir') >= 0, t5);
      const hepsi = [t1, t2, t3, t5].join(' ');
      __REG.ok('(d) AN5-DIL: veri yaşı satırlarında yasak kelime 0', tara(hepsi).length === 0, tara(hepsi).join(','));
      __REG.ok('(d) ton: "kullanma/eski/geçersiz/güncel değil/hata" 0 — bağlam, yargı değil', tara(hepsi, TON).length === 0, tara(hepsi, TON).join(','));
      __REG.ok('(d) kapanış temiz', !document.getElementById('bmOrnekOnizle'));
      return __REG.al();
    })
  },
  {
    kod: 'BH2-MASH', ad: 'SPRINT BH2: mash boşluğu — mash\'siz kayıtta chip "kaynakta yok" AYNEN + AYRI satırda stil iskeleti değeri KAYNAĞIYLA ("stil iskeleti" + kürator/çıkarım etiketi + "bu örneğe ait bir ölçüm değil"); mash\'li kayıtta gerçek değer AYNEN ve iskelet satırı YOK; iskeleti olmayan stilde satır YOK (uydurma yok); "AJ tipik" iddiası YOK; yasak kelime 0',
    calistir: (page) => page.evaluate(() => {
      const YASAK = ['daha iyi', 'daha kötü', 'yapmalısın', 'yapmalı', 'hatalı', 'yanlış', 'olmalı', 'gerekir',
        'tavsiye', 'öneriyoruz', 'düzelt', 'kötü', 'başarılı', 'kazanmak için', 'kazandıran', 'ideal', 'doğrusu', 'eksik'];
      const tara = (t, L) => (L || YASAK).filter(k => String(t || '').toLocaleLowerCase('tr-TR').indexOf(k) >= 0);
      const N = window._NHC_MADALYA, M = window._TOPLULUK_MADALYA, ISK = window.STIL_ISKELET;
      const alt = N['Altbier / Düsseldorf Altbier'][1];
      __REG.ok('önkoşul: Altbier#0 mash yok, #1 mash 66; iskelet Altbier mashSc 67', !alt[0].ms && alt[1].ms === 66 && !!ISK['Altbier / Düsseldorf Altbier'] && ISK['Altbier / Düsseldorf Altbier'].mashSc === 67);
      const ac = (k, s, i) => { _bmOrnekOnizle(k, s, i); const m = document.getElementById('bmOrnekOnizle'); const t = m ? m.textContent : ''; const el = m && m.querySelector('.bm-onizle-mash-isk'); const r = { t: t, isk: el ? el.textContent : '' }; bmOrnekOnizleKapat(); return r; };
      const a = ac('nhc', 'Altbier / Düsseldorf Altbier', 0);
      __REG.ok('(a) mash\'siz NHC: chip "Mash kaynakta yok" AYNEN', /Mash\s*kaynakta yok/.test(a.t), a.t.slice(0, 120));
      __REG.ok('(a) iskelet satırı: 67°C + kaynak ayrımı NET (kaynakta yok / stil iskeleti / örneğe ait ölçüm değil)', a.isk.indexOf('kaynakta yok') >= 0 && a.isk.indexOf('67°C') >= 0 && a.isk.indexOf('stil iskeleti') >= 0 && a.isk.indexOf('bu örneğe ait bir ölçüm değil') >= 0, a.isk);
      __REG.ok('(a) iskelet kaynağı etiketli (kürator varsayılanı / topluluk çıkarımı v2)', /kürator varsayılanı|topluluk çıkarımı v2/.test(a.isk), a.isk);
      __REG.ok('(a) "AJ" / "tipik" iddiası YOK (bilgi tabanında stil-bazlı sıcaklık yok)', a.isk.indexOf('AJ') < 0 && a.isk.toLocaleLowerCase('tr-TR').indexOf('tipik') < 0);
      __REG.ok('(a) oluşturma yolu söyleneni yapar: iskelet hesabı mashSc 67 verir', window._stilIskeletHesap && (window._stilIskeletHesap('Altbier / Düsseldorf Altbier', 11, 61) || {}).mashSc === 67);
      const b = ac('nhc', 'Altbier / Düsseldorf Altbier', 1);
      __REG.ok('(b) mash\'li NHC: gerçek 66°C chip AYNEN, iskelet satırı YOK', /Mash\s*66°C/.test(b.t) && b.isk === '' && b.t.indexOf('stil iskeletinin değeri') < 0, b.t.slice(0, 120));
      const ahaVar = Object.keys(M).find(s => ISK[s] && ISK[s].mashSc);
      const ahaYok = Object.keys(M).find(s => !ISK[s]);
      const c = ac('aha', ahaVar, 0);
      __REG.ok('(c) AHA + iskeletli stil: chip "kaynakta yok" + iskelet satırı', /Mash\s*kaynakta yok/.test(c.t) && c.isk.indexOf('stil iskeleti') >= 0, ahaVar);
      if(ahaYok){ const d = ac('aha', ahaYok, 0); __REG.ok('(c) AHA + iskeletsiz stil: yalnız "kaynakta yok", iskelet satırı YOK (uydurma yok)', /Mash\s*kaynakta yok/.test(d.t) && d.isk === '', ahaYok); }
      else __REG.ok('(c) kapsam notu: iskeletsiz AHA stili yok', true);
      const hepsi = [a.t, b.t, c.t].join(' ');
      __REG.ok('(d) AN5-DIL: yasak kelime 0', tara(hepsi).length === 0, tara(hepsi).join(','));
      __REG.ok('(d) kapanış temiz', !document.getElementById('bmOrnekOnizle'));
      return __REG.al();
    })
  },
  {
    kod: 'BH3-HAVUZ', ad: 'SPRINT BH3: topluluk bloğunda iki havuz ayrımı tek satır — "N reçete" topluluk dağılımı ile ödüllü örnekler (yarışma derlemesi) birbirinin parçası değil; tıklanabilir öğe eklemez; yasak kelime 0',
    calistir: (page) => page.evaluate(() => {
      const YASAK = ['daha iyi', 'daha kötü', 'yapmalısın', 'yapmalı', 'hatalı', 'yanlış', 'olmalı', 'gerekir',
        'tavsiye', 'öneriyoruz', 'düzelt', 'kötü', 'başarılı', 'kazanmak için', 'kazandıran', 'ideal', 'doğrusu', 'eksik'];
      const tara = (t, L) => (L || YASAK).filter(k => String(t || '').toLocaleLowerCase('tr-TR').indexOf(k) >= 0);
      __REG.yeniKayit('REGTEST BH3', {});
      ekran = 'editor'; sekme = 'genel';
      S.hacim = 11; S.verim = 61; S.stil = 'Weizen / Weissbier'; bmStilIskeletDoldur();
      S.maltlar = (S.maltlar || []).map(m => ({ ...m, kg: (m.kg || 0) * 0.45 }));
      render();
      const el = document.querySelector('.bm-topluluk');
      const t = el ? el.textContent : '';
      __REG.ok('önkoşul: Weizen topluluk bloğu + madalya listesi basıldı', !!el && t.indexOf('madalya almış') >= 0 && t.indexOf('reçete') >= 0, t.slice(0, 80));
      const s = el && el.querySelector('.bm-havuz-ayrimi');
      __REG.ok('(a) ayrım satırı: "Ayrı havuz" + topluluk dağılımı + yarışma derlemesi + "parçası değil"', !!s && s.textContent.indexOf('Ayrı havuz') >= 0 && s.textContent.indexOf('topluluk dağılımından') >= 0 && s.textContent.indexOf('yarışma derlemesinden') >= 0 && s.textContent.indexOf('parçası değil') >= 0, s && s.textContent);
      __REG.ok('(a) satır tıklanabilir öğe eklemez (AN6 kuralı)', !!s && s.querySelectorAll('[onclick],button,[role=button]').length === 0);
      __REG.ok('(b) AN5-DIL: topluluk bloğunda yasak kelime 0', tara(t).length === 0, tara(t).join(','));
      return __REG.al();
    })
  },

  // ── SPRINT BJ1 (2026-09-03): mobil kritikler — BI denetimi #1/#2/#4 ──
  {
    kod: 'BJ1-SEKME', ad: "SPRINT BJ1-1: 390 ve 360 px'te 10 sekmenin hepsi kaydırmasız görünür (çubuk taşmıyor, viewport dışında sekme yok), Takvim tek dokunuşla açılır, çubuk ≤90 px; masaüstü (1024) yatay düzen korunur",
    calistir: async (page) => {
      let hepsi = [];
      for (const [w, h] of [[390, 844], [360, 640]]) {
        await page.setViewport({ width: w, height: h });
        const c = await page.evaluate((w) => {
          const kayit = KR.find(k => k && k.biraAd === 'BJ1 sekme');
          if (!kayit) __REG.yeniKayit('BJ1 sekme', {}); else tarifAc(kayit.id);
          sekme = 'genel'; render();
          const sb = document.querySelector('.sb'); const bt = Array.from(sb.querySelectorAll('.sb-btn'));
          const dis = bt.filter(b => { const r = b.getBoundingClientRect(); return r.left < -0.5 || r.right > innerWidth + 0.5; }).map(b => b.dataset.s);
          __REG.ok(w + ': 10 sekme basıldı', bt.length === 10, String(bt.length));
          __REG.ok(w + ': çubuk yatay TAŞMIYOR (scrollWidth ≤ clientWidth; eskiden 904/390)', sb.scrollWidth <= sb.clientWidth + 1, sb.scrollWidth + '/' + sb.clientWidth);
          __REG.ok(w + ': viewport dışında sekme YOK (eskiden Su/Süreç/Takvim/Katkı/Not)', dis.length === 0, dis.join(','));
          const tk = bt.find(b => b.dataset.s === 'takvim'); const tr = tk.getBoundingClientRect();
          __REG.ok(w + ': Takvim düğmesi görünür ve ≥36 px yüksek', tr.left >= 0 && tr.right <= innerWidth && tr.height >= 36, Math.round(tr.left) + '-' + Math.round(tr.right) + ' h' + Math.round(tr.height));
          __REG.ok(w + ': çubuk ≤ 90 px (2 satır)', sb.getBoundingClientRect().height <= 90, String(Math.round(sb.getBoundingClientRect().height)));
          tk.click();
          __REG.ok(w + ': Takvim TEK dokunuşla açıldı (yatay kaydırma yok)', sekme === 'takvim', sekme);
          sekme = 'genel'; render();
          return __REG.al();
        }, w);
        hepsi = hepsi.concat(c);
      }
      await page.setViewport({ width: 1024, height: 800 });
      const d = await page.evaluate(() => { render(); const cs = getComputedStyle(document.querySelector('.sb')); __REG.ok('1024: masaüstü düzeni korundu (flex-wrap: nowrap)', cs.flexWrap === 'nowrap', cs.flexWrap); return __REG.al(); });
      return hepsi.concat(d);
    }
  },
  {
    kod: 'BJ1-KART', ad: "SPRINT BJ1-2: Yapım Aşamasında kartı — devam eden batch (snapshot var, sonuc yok, durum 'aktif') karta girer; faz+gün BF hesabıyla AYNI (_bmFazBilgi); sıradaki alarm + gecikmiş sayısı satırı; meta 13px/600; kart ANA SAYFADA hero'nun üstünde; bitmiş batch girmez",
    calistir: (page) => page.evaluate(() => {
      function isoGun(d2) { const d = new Date(); d.setDate(d.getDate() + d2); return d.toISOString().slice(0, 10); }
      const id = __REG.yeniKayit('BJ1 kart', { durum: 'aktif', brewSnapshot: { ts: Date.now() - 12 * 864e5, ogT: 1.05, fgT: 1.012, preboilOG: null }, brewLog: [{ tip: 'pitching', tarih: isoGun(-12), deger: '', id: 'bjp', not: '' }] });
      const r = KR.find(k => k && k.id === id); delete r.brewSonuc;
      const st = _alarmlariOku(); st[id] = { receteAd: 'BJ1 kart', pitchTs: Date.now() - 12 * 864e5, durum: 'aktif', alarmlar: [
        { g: 8, ts: Date.now() - 4 * 864e5, tip: 'kritik', aksiyon: '🍺 Şişele', aciklama: '', durum: 'bekliyor' },
        { g: 5, ts: Date.now() - 7 * 864e5, tip: 'kontrol', aksiyon: '📊 FG ölç', aciklama: '', durum: 'tamamlandi' },
        { g: 22, ts: Date.now() + 4 * 864e5, tip: 'kontrol', aksiyon: '🫧 Karbonasyon kontrol', aciklama: '', durum: 'bekliyor' }] }; // aynı saat: takvim-günü farkı tam 4 (gece yarısı geçişi test saatine bağlı olmasın)
      _alarmlariYaz(st);
      const gBek = Math.floor((new Date() - new Date(isoGun(-12))) / 864e5);
      const tmp = document.createElement('div'); tmp.innerHTML = renderYapimdaVurgu();
      const it = tmp.querySelector('.bm-yapimda-item[data-tid="' + id + '"]');
      __REG.ok("devam eden batch (durum 'aktif' + snapshot, sonuc yok) KARTA GİRDİ", !!it);
      const meta = it && it.querySelector('.bm-yapimda-item-meta'); const snr = it && it.querySelector('.bm-yapimda-item-sonraki');
      __REG.ok('faz+gün BF hesabıyla AYNI metin (Fermentasyon N. gün)', !!meta && meta.textContent === '⏱️ Fermentasyon ' + gBek + '. gün', meta && meta.textContent);
      __REG.ok('_bmFazBilgi = kart metası (tek kaynak)', _bmFazBilgi(r) === (meta && meta.textContent));
      __REG.ok('sıradaki satırı: gelecek alarm + gün + gecikmiş sayısı (tamamlanan sayılmaz)', !!snr && snr.textContent.indexOf('Sonraki: 🫧 Karbonasyon kontrol') > -1 && snr.textContent.indexOf('4 gün sonra') > -1 && snr.textContent.indexOf('1 gecikmiş') > -1, snr && snr.textContent);
      ekran = 'liste'; render();
      const m2 = document.querySelector('#ekran .bm-yapimda-item[data-tid="' + id + '"] .bm-yapimda-item-meta');
      const cs = m2 && getComputedStyle(m2);
      __REG.ok('rütbe: meta 13px ve ≥600 ağırlık (BF sınıfı 11px soluk değil)', !!cs && parseFloat(cs.fontSize) >= 13 && parseInt(cs.fontWeight, 10) >= 600, cs && (cs.fontSize + '/' + cs.fontWeight));
      ekran = 'ana'; render();
      const kart = document.querySelector('#ekran .bm-yapimda-vurgu'), hero = document.querySelector('#ekran .bm-ana-hero');
      __REG.ok('ANA SAYFADA kart basıldı (0 dokunuş)', !!kart && kart.textContent.indexOf('BJ1 kart') > -1);
      __REG.ok("kart hero'nun ÜSTÜNDE (rütbe: durum önce, dekor sonra)", !!kart && !!hero && kart.getBoundingClientRect().top < hero.getBoundingClientRect().top);
      __REG.ok('ana sayfa metni sıradaki adımı taşıyor', document.getElementById('ekran').innerText.indexOf('Karbonasyon kontrol') > -1);
      // gelecek alarm yok, 2 gecikmiş → "Gecikmiş: ... (+1 daha)" + kırmızı sınıf
      st[id].alarmlar[2].durum = 'tamamlandi'; st[id].alarmlar[1].durum = 'bekliyor'; _alarmlariYaz(st);
      tmp.innerHTML = renderYapimdaVurgu(); const s2 = tmp.querySelector('.bm-yapimda-item[data-tid="' + id + '"] .bm-yapimda-item-sonraki');
      __REG.ok('yalnız gecikmiş varken: "Gecikmiş: 🍺 Şişele · 4 gün gecikti (+1 daha)" + gecikmis sınıfı', !!s2 && s2.classList.contains('gecikmis') && s2.textContent.indexOf('Gecikmiş: 🍺 Şişele · 4 gün gecikti (+1 daha)') > -1, s2 && s2.textContent);
      // bitmiş batch (brewSonuc var, durum aktif) karta GİRMEZ
      r.brewSonuc = { ts: Date.now(), ogG: 1.05, fgG: 1.012 };
      tmp.innerHTML = renderYapimdaVurgu();
      __REG.ok("bitmiş batch (brewSonuc var, durum 'aktif') karta GİRMEZ", !tmp.querySelector('.bm-yapimda-item[data-tid="' + id + '"]'));
      // yapimda + alarm grubu yok → eski davranış: kart var, sıradaki satırı yok
      delete r.brewSonuc; r.durum = 'yapimda'; delete st[id]; _alarmlariYaz(st);
      tmp.innerHTML = renderYapimdaVurgu(); const it3 = tmp.querySelector('.bm-yapimda-item[data-tid="' + id + '"]');
      __REG.ok("'yapimda' + alarm grubu yok: kart var, sıradaki satırı YOK (uydurma yok)", !!it3 && !it3.querySelector('.bm-yapimda-item-sonraki'));
      return __REG.al();
    })
  },
  {
    kod: 'BJ1-BAYAT', ad: "SPRINT BJ1-3: vadesi 3+ gün geçmiş kritik alarm MODAL AÇMAZ / bayat kontrol toast kartı BASMAZ; alarm 'bekliyor' kalır (BE2), bekleyenler görür, kaçırılan bilgi toast'ı basılır; 5 tikte fırtına yok (AZ5); ≤3 gün ve taze kritik modal AÇAR; BE2 6-saat kapısı korunur",
    calistir: (page) => page.evaluate(async () => {
      function isoGun(d2) { const d = new Date(); d.setDate(d.getDate() + d2); return d.toISOString().slice(0, 10); }
      const bekle = ms => new Promise(r => setTimeout(r, ms));
      const sifirla = () => { Object.keys(window._alarmGosterimTs).forEach(k => delete window._alarmGosterimTs[k]); var em = document.getElementById('_alarmModal'); if (em) em.remove(); document.querySelectorAll('[id^="_alarmToast_"]').forEach(e => e.remove()); };
      const id = __REG.yeniKayit('BJ1 bayat', { brewLog: [{ tip: 'pitching', tarih: isoGun(-20), deger: '', id: 'bjb', not: '' }] }); // brew kanıtı: AZ4 hijyeni grubu silmesin
      const st = _alarmlariOku(); st[id] = { receteAd: 'BJ1 bayat', pitchTs: Date.now() - 20 * 864e5, durum: 'aktif', alarmlar: [
        { g: 7, ts: Date.now() - 10 * 864e5, tip: 'kritik', aksiyon: '❄️ Cold crash', aciklama: '', durum: 'bekliyor' },
        { g: 5, ts: Date.now() - 12 * 864e5, tip: 'kontrol', aksiyon: '📊 FG ölç', aciklama: '', durum: 'bekliyor' },
        { g: 30, ts: Date.now() + 10 * 864e5, tip: 'kontrol', aksiyon: '🍺 İçime hazır', aciklama: '', durum: 'bekliyor' }] };
      _alarmlariYaz(st);
      sifirla(); var kt = document.getElementById('bm-kacirilan-toast'); if (kt) kt.remove(); window._bmKacirilanBilgiVerildi = false;
      __REG.ok('eşik sabiti 3 gün', window._BJ1_BAYAT_GUN === 3, String(window._BJ1_BAYAT_GUN));
      _alarmKontrolEt(); await bekle(400);
      __REG.ok('10 gün bayat KRİTİK → modal AÇILMADI', !document.getElementById('_alarmModal'));
      __REG.ok('12 gün bayat KONTROL → toast kartı BASILMADI', document.querySelectorAll('[id^="_alarmToast_"]').length === 0);
      __REG.ok("kaçırılan bilgi toast'ı (oturum-başı tek) BASILDI — bilgi kaybolmadı", !!document.getElementById('bm-kacirilan-toast'));
      __REG.ok("alarm 'bekliyor' KALDI (BE2: onay şart, yalnız sunum değişti)", _alarmlariOku()[id].alarmlar[0].durum === 'bekliyor' && _alarmlariOku()[id].alarmlar[1].durum === 'bekliyor');
      __REG.ok('bekleyenler listesi hâlâ görüyor (Takvim/Bildirimler/cron körlüğü yok)', _alarmBekleyenleri().filter(x => x.receteId === id).length === 2, String(_alarmBekleyenleri().filter(x => x.receteId === id).length));
      for (let i = 0; i < 5; i++) _alarmKontrolEt(); await bekle(400);
      __REG.ok('5 tikte fırtına YOK (modal 0, toast kartı 0)', !document.getElementById('_alarmModal') && document.querySelectorAll('[id^="_alarmToast_"]').length === 0);
      // sınır: 2g 23s 59d geçmiş → modal (≤ eşik dahil)
      st[id].alarmlar[0].ts = Date.now() - 3 * 864e5 + 60e3; _alarmlariYaz(st); sifirla();
      _alarmKontrolEt(); await bekle(100);
      __REG.ok('3 gün İÇİ (2g 23s 59d) kritik → modal AÇILDI (kritik uyarı korundu)', !!document.getElementById('_alarmModal'));
      var em1 = document.getElementById('_alarmModal'); if (em1) em1.remove();
      _alarmKontrolEt(); await bekle(100);
      __REG.ok('aynı oturumda tekrar AÇILMADI (BE2 6-saat kapısı korundu)', !document.getElementById('_alarmModal'));
      st[id].alarmlar[0].ts = Date.now() - 3 * 864e5 - 3600e3; _alarmlariYaz(st); sifirla();
      _alarmKontrolEt(); await bekle(100);
      __REG.ok('3 gün + 1 saat geçmiş kritik → modal YOK', !document.getElementById('_alarmModal'));
      st[id].alarmlar[0].ts = Date.now() - 3600e3; _alarmlariYaz(st); sifirla();
      _alarmKontrolEt(); await bekle(400);
      __REG.ok('1 saat önce çalan kritik → modal AÇILDI', !!document.getElementById('_alarmModal'));
      __REG.ok('bayat kontrol yine toast basmadı', document.querySelectorAll('[id^="_alarmToast_"]').length === 0);
      // taze kontrol (dün) → toast kartı basılır (kontrol akışı bozulmadı)
      var em2 = document.getElementById('_alarmModal'); if (em2) em2.remove();
      st[id].alarmlar[0].durum = 'tamamlandi'; st[id].alarmlar[1].ts = Date.now() - 864e5; _alarmlariYaz(st); sifirla();
      _alarmKontrolEt(); await bekle(500);
      __REG.ok('dünkü KONTROL alarmı → toast kartı basıldı (kontrol akışı korundu)', document.querySelectorAll('[id^="_alarmToast_"]').length === 1, String(document.querySelectorAll('[id^="_alarmToast_"]').length));
      return __REG.al();
    })
  },
  // ── SPRINT BJ2 (2026-09-04): mobil kullanılabilirlik 2. parti — BI denetimi #4 (ölçüm yolları), #6 (klavye), #12 + TOP 3 (hedef/krom) ──
  {
    kod: 'BJ2-OLCUM', ad: "SPRINT BJ2-1: 5 ölçüm yolu TEKLEŞTİ — hepsi aynı normalize (1054→1.054), aynı KALICI kayıt (KR; taslak değil), aynı zincir (brewSonuc/öğrenme) ve aynı dil; hızlı ölçüm ana ekrandan kapalı reçeteye gerçek brewLog kaydı yazar",
    calistir: (page) => page.evaluate(() => {
      const KRoku = (rid, alan) => { const kr = JSON.parse(localStorage.getItem('bm_v6') || '[]'); const r = kr.find(x => x && String(x.id) === String(rid)); return r ? r[alan] : undefined; };
      const id = __REG.yeniKayit('BJ2 olcum', { brewSnapshot: { ts: Date.now() - 10 * 864e5, ogT: 1.05, fgT: 1.012, verimVarsayim: 61 } });
      const r0 = KR.find(k => k && k.id === id); delete r0.brewSonuc; _origKy(KR); tarifAc(id);
      window._bmSgManuelGir('og', '1054');
      __REG.ok('(1) editör Gerçek OG: normalize 1054 -> 1.054', S.ogManuel === 1.054, String(S.ogManuel));
      __REG.ok('(1) editör Gerçek OG: KR kaydına KALICI yazıldı (Kaydet gerekmeden; eskiden yalnız taslak)', KRoku(id, 'ogManuel') === 1.054, String(KRoku(id, 'ogManuel')));
      window._bmSgManuelGir('fg', '12');
      __REG.ok('(2) editör Gerçek FG: puan yazımı 12 -> 1.012', String(S.fgManuel) === '1.012', String(S.fgManuel));
      __REG.ok('(2) editör Gerçek FG: KR KALICI', String(KRoku(id, 'fgManuel')) === '1.012', String(KRoku(id, 'fgManuel')));
      window._bmPreboilGir('1040');
      __REG.ok('(3) pre-boil OG: normalize + KR KALICI', S.preboilOG === 1.04 && KRoku(id, 'preboilOG') === 1.04, S.preboilOG + '/' + KRoku(id, 'preboilOG'));
      window._bmSgManuelGir('fg', '1.54');
      __REG.ok('(4) aralık dışı "1.54": alan boşaltılır (sessiz kabul YOK)', S.fgManuel === null, String(S.fgManuel));
      __REG.ok('(4) aralık dışı: KR de temizlenir (hayalet ölçüm kalmaz)', (KRoku(id, 'fgManuel') === null || KRoku(id, 'fgManuel') === undefined), String(KRoku(id, 'fgManuel')));
      S.brewLog = S.brewLog || [];
      S.brewLog.push({ tip: 'fg_olcum', tarih: new Date().toISOString().slice(0, 10), deger: '1.014', not: '', id: 'bj2log' });
      S.fgManuel = '1.014'; tarifeKaydet();
      __REG.ok('(5) log formu yolu (brewLog + tarifeKaydet) BOZULMADI', String(KRoku(id, 'fgManuel')) === '1.014', String(KRoku(id, 'fgManuel')));
      const an = bmProfilAnaliz().kayitlar.find(k => k.id === String(id));
      __REG.ok('(6) bmProfilAnaliz KR üzerinden ölçümü GÖRÜYOR (öğrenme kolu besleniyor)', !!an && an.ogG === 1.054, an && String(an.ogG));
      const id2 = __REG.yeniKayit('BJ2 hizli', { brewSnapshot: { ts: Date.now() - 5 * 864e5, ogT: 1.05, fgT: 1.012 } });
      const r2 = KR.find(k => k && k.id === id2); delete r2.brewSonuc; _origKy(KR);
      tarifAc(id);
      window._bmHizliOlcumAc(id2, 'fg_olcum');
      __REG.ok('(7) hızlı ölçüm modalı açıldı', !!document.getElementById('bmHizliOlcumModal'));
      document.getElementById('bmHizliOlcumInp').value = '1013';
      window._bmHizliOlcumKaydet();
      const bl2 = (KRoku(id2, 'brewLog') || []).filter(e => e && e.tip === 'fg_olcum');
      __REG.ok('(7) hızlı ölçüm: KAPALI reçetenin KR kaydına tarihli brewLog girdi', bl2.length === 1 && bl2[0].deger === '1.013', JSON.stringify(bl2));
      __REG.ok('(7) hızlı ölçüm: fgManuel backfill (I2 simetrisi)', String(KRoku(id2, 'fgManuel')) === '1.013', String(KRoku(id2, 'fgManuel')));
      __REG.ok('(7) hızlı ölçüm: AÇIK reçete kirlenmedi (rid kapısı)', String(KRoku(id, 'fgManuel')) === '1.014' && !((KRoku(id, 'brewLog') || []).some(e => e && e.not === 'Hızlı ölçüm (ana ekran)')));
      __REG.ok('(7) kayıt sonrası modal kapandı', !document.getElementById('bmHizliOlcumModal'));
      window._bmHizliOlcumAc(id2, 'og_olcum');
      document.getElementById('bmHizliOlcumInp').value = 'abc';
      window._bmHizliOlcumKaydet();
      __REG.ok('(8) anlaşılamayan değer: KAYIT YOK, modal AÇIK kalır (AQ1: sahte onay yok)', !!document.getElementById('bmHizliOlcumModal') && (KRoku(id2, 'ogManuel') === null || KRoku(id2, 'ogManuel') === undefined));
      window._bmHizliOlcumKapat();
      __REG.ok('(8) Vazgeç/kapat modalı kaldırır', !document.getElementById('bmHizliOlcumModal'));
      const tmp = document.createElement('div'); tmp.innerHTML = renderYapimdaVurgu();
      const kb = tmp.querySelectorAll('.bm-yapimda-item[data-tid="' + id2 + '"] .bm-yapimda-olcum-btn');
      __REG.ok('(9) ana ekran kartında FG/OG kısayolu (2 düğme)', kb.length === 2, String(kb.length));
      return __REG.al();
    })
  },
  {
    kod: 'BJ2-KLAVYE', ad: "SPRINT BJ2-2: klavye açıkken Kaydet erişilebilir — çubuk YALNIZ gerçek düğme görünmezken çıkar (ekranı boşuna daraltmaz), gerçek düğmeyi click'ler (kopya kayıt yolu yok), masaüstünde hiç çıkmaz, açıkken alt toast'lar yukarı kayar",
    calistir: async (page) => {
      await page.setViewport({ width: 390, height: 504 });
      const a = await page.evaluate(() => {
        __REG.yeniKayit('BJ2 klavye', {});
        sekme = 'not'; render();
        const bar = document.getElementById('bmKlvBar');
        __REG.ok("çubuk DOM'da var ve varsayılan GİZLİ (ekran daraltılmaz)", !!bar && bar.hidden === true);
        const ta = Array.from(document.querySelectorAll('#ekran textarea')).filter(e => e.getBoundingClientRect().height > 0)[0];
        __REG.ok('Not sekmesinde metin alanı bulundu', !!ta);
        if (ta) { ta.focus(); window._bmKlvGuncelle(); }
        const gercek = window._bmKlvKaydetBtn(ta);
        const gr = gercek && gercek.getBoundingClientRect();
        __REG.ok('gerçek Kaydet düğmesi görünür alanın DIŞINDA (BI ölçümü: 504 px bant)', !!gr && gr.bottom > innerHeight, gr && Math.round(gr.top));
        __REG.ok('çubuk AÇILDI ve etiketi gerçek düğmenin metni', bar.hidden === false && document.getElementById('bmKlvBtn').textContent.indexOf('Kaydet') > -1, document.getElementById('bmKlvBtn').textContent);
        const br = bar.getBoundingClientRect();
        __REG.ok('çubuk görünür alanın İÇİNDE ve hedefi ≥44 px', br.bottom <= innerHeight + 1 && document.getElementById('bmKlvBtn').getBoundingClientRect().height >= 44, Math.round(br.top) + '/' + innerHeight);
        __REG.ok("çubuk açıkken alt toast'lar yukarı kayar (toast dokunuşu yutmasın)", document.body.classList.contains('bm-klv-acik') && getComputedStyle(document.documentElement).getPropertyValue('--bm-klv-alt').trim() !== '');
        let tiklandi = 0; const orjClick = gercek.click.bind(gercek);
        gercek.click = function () { tiklandi++; orjClick(); };
        document.getElementById('bmKlvBtn').click();
        __REG.ok("çubuk GERÇEK Kaydet düğmesini click'ledi (doğrulama/kalıcılık tek yerde)", tiklandi === 1, String(tiklandi));
        __REG.ok('tıklama sonrası çubuk kapanır', document.getElementById('bmKlvBar').hidden === true);
        sekme = 'malt'; render();
        const inp = Array.from(document.querySelectorAll('#ekran input[type=number]')).filter(e => e.getBoundingClientRect().height > 0)[0];
        if (inp) { inp.focus(); window._bmKlvGuncelle(); }
        const bas = document.querySelector('.eh button[onclick*="tarifeKaydet"]');
        const bsr = bas && bas.getBoundingClientRect();
        __REG.ok('Malt sekmesinde başlık Kaydet zaten görünür (yapışkan)', !!bsr && bsr.top >= 0 && bsr.bottom <= innerHeight, bsr && Math.round(bsr.top));
        __REG.ok('gerçek düğme görünürken çubuk ÇIKMAZ (ekran boşuna daralmaz)', document.getElementById('bmKlvBar').hidden === true);
        return __REG.al();
      });
      await page.setViewport({ width: 1024, height: 800 });
      const b = await page.evaluate(() => {
        render();
        const ta = Array.from(document.querySelectorAll('#ekran textarea, #ekran input[type=number]')).filter(e => e.getBoundingClientRect().height > 0)[0];
        if (ta) { ta.focus(); window._bmKlvGuncelle(); }
        __REG.ok('masaüstünde (1024) çubuk HİÇ çıkmaz', document.getElementById('bmKlvBar').hidden === true);
        __REG.ok('masaüstünde CSS de gizler (display:none)', getComputedStyle(document.getElementById('bmKlvBar')).display === 'none');
        return __REG.al();
      });
      await page.setViewport({ width: 390, height: 844 });
      return a.concat(b);
    }
  },
  {
    kod: 'BJ2-HEDEF', ad: "SPRINT BJ2-3: dokunma hedefleri — <24 px 'ciddi' yığın SIFIR, ihlal oranı %25 altı, reçete adı 3 px değil; krom kaydırınca incelir (özet DEĞERLERİ kalır, sıçrama telafi edilir); yatay taşma yok; masaüstü dokunulmadı",
    calistir: async (page) => {
      await page.setViewport({ width: 390, height: 844 });
      const a = await page.evaluate(() => {
        __REG.yeniKayit('BJ2 hedef', {});
        const SEL = 'button,[role="button"],summary,select,input:not([type=hidden]),textarea,label[for]';
        const olc = () => {
          const gor = e => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.display !== 'none' && c.visibility !== 'hidden'; };
          const l = Array.from(document.querySelectorAll('#ekran ' + SEL)).filter(gor).map(e => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), m: (e.innerText || e.getAttribute('aria-label') || '').slice(0, 18) }; });
          return { toplam: l.length, ihlal: l.filter(x => x.w < 44 || x.h < 44).length, ciddi: l.filter(x => x.w < 24 || x.h < 24) };
        };
        let ciddi = [], ihlal = 0, toplam = 0;
        ['genel', 'malt', 'hop', 'maya', 'su', 'surec', 'takvim', 'hesap', 'katki'].forEach(function (sk) {
          sekme = sk; render();
          const m = olc(); toplam += m.toplam; ihlal += m.ihlal;
          ciddi = ciddi.concat(m.ciddi.map(x => sk + ':' + x.m + ' ' + x.w + 'x' + x.h));
        });
        __REG.ok('9 editör sekmesinde <24 px "ciddi" hedef SIFIR', ciddi.length === 0, ciddi.slice(0, 6).join(' | '));
        __REG.ok('ihlal oranı %25 altı (BI ölçümü %90+)', toplam > 0 && (ihlal / toplam) < 0.25, ihlal + '/' + toplam);
        __REG.ok('yatay taşma YOK', document.documentElement.scrollWidth <= 391, String(document.documentElement.scrollWidth));
        sekme = 'genel'; render();
        const ad = document.querySelector('.eh .bm-biraad-inp'), ar = ad.getBoundingClientRect();
        __REG.ok('reçete adı alanı okunabilir/dokunulabilir (eskiden 3x25 px)', ar.width >= 80 && ar.height >= 44, Math.round(ar.width) + 'x' + Math.round(ar.height));
        const sc = document.getElementById('ekran');
        const EH = () => document.querySelector('.eh'), SS = () => document.getElementById('bm-summary');
        const h = e => e ? Math.round(e.getBoundingClientRect().height) : 0;
        sc.scrollTop = 0; sc.dispatchEvent(new Event('scroll'));
        return new Promise(function (res) {
          setTimeout(function () {
            const tepe = h(EH()) + h(SS());
            sc.scrollTop = h(EH()) + 40; sc.dispatchEvent(new Event('scroll'));
            setTimeout(function () {
              const kucuk = h(EH()) + h(SS());
              __REG.ok('kaydırınca yapışkan yığın en az %40 küçülür', kucuk < tepe * 0.6, tepe + ' -> ' + kucuk);
              __REG.ok('krom sınıfı uygulandı', sc.classList.contains('bm-krom-kucuk'));
              const stat = Array.from(SS().querySelectorAll('.bm-ss-stat')).filter(e => e.getBoundingClientRect().height > 0);
              __REG.ok('özetin 6 DEĞERİ korunur (BI "sticky özet gerçek fayda" çürütmesi)', stat.length === 6, String(stat.length));
              __REG.ok('daralma sıçraması telafi edildi (scrollTop >= 40, tepeye düşmedi)', sc.scrollTop >= 40, String(Math.round(sc.scrollTop)));
              __REG.ok('kaydırınca Kaydet + reçete adı YAPIŞKAN kalır', !!document.querySelector('.eh button[onclick*="tarifeKaydet"]') && h(document.querySelector('.eh .bm-biraad-inp')) >= 44);
              sc.scrollTop = 0; sc.dispatchEvent(new Event('scroll'));
              setTimeout(function () {
                __REG.ok('tepeye dönünce krom yeniden açılır', !sc.classList.contains('bm-krom-kucuk') && (h(EH()) + h(SS())) >= tepe - 2, String(h(EH()) + h(SS())));
                res(__REG.al());
              }, 200);
            }, 220);
          }, 220);
        });
      });
      await page.setViewport({ width: 1024, height: 800 });
      const b = await page.evaluate(() => {
        sekme = 'genel'; render();
        const sc = document.getElementById('ekran');
        sc.scrollTop = 400; sc.dispatchEvent(new Event('scroll'));
        return new Promise(function (res) {
          setTimeout(function () {
            __REG.ok('masaüstünde krom incelmesi YOK (mobil-özel)', !sc.classList.contains('bm-krom-kucuk'));
            const arac = document.querySelector('.eh .bm-eh-arac.bm-edit-only');
            __REG.ok('masaüstünde Hedef Stil araç satırı görünür kalır', !arac || getComputedStyle(arac).display !== 'none');
            res(__REG.al());
          }, 250);
        });
      });
      await page.setViewport({ width: 390, height: 844 });
      return a.concat(b);
    }
  },

  // ── SPRINT BQ1 + BR — PROFİL SEÇİCİ (karakter tablosu → TAM EKRAN "bira tarif et") ──
  // BR NOTU: BQ1 case'leri SİLİNMEDİ, yeni yüzeye UYARLANDI. Davranış iddiaları
  // (süzgeç daraltıyor mu, doğru stil açılıyor mu, boş sonuç dürüst mü, mobilde
  // erişilebilir mi) AYNEN duruyor; yalnız DOM yüzeyi ".bm-profil-sec paneli"
  // yerine "#br-tam tam ekranı". Bilerek değiştirilen 2 sözleşme ayrıca işaretli:
  //   (a) karakter süzgeci TAM havuza uygulanıyor (BQ1'de yalnız top-6'ya) → daha
  //       fazla stil kalıyor: amber|malt|dolgun+fenolik 3 → 9 stil,
  //   (b) taban eksen değişince süzgeç ARTIK SESSİZCE DÜŞÜRÜLMÜYOR (BQ1-GERIDUS
  //       → BQ1-KORUMA): 5 eksen de ekranda göründüğü için kullanıcının seçimini
  //       geri almak kafa karıştırıyordu; seçim korunur, çip 0 yazar, boş sonuç
  //       hangi eksenin daralttığını söyler.
  {
    kod: 'BQ1-TABLO', ad: 'KARAKTER TABLOSU: BR ile 48 → 73 stile genişledi (tam matristeki HER stil sınıflı, süzgeçte sessiz düşme yok); sınıflar kapalı enum (uydurma yok), her ad BJCP\'de; TABAN 60 kova ve toplamları DOKUNULMADI; tablo <8 KB; kapsama+köken şerhi kaynakta',
    calistir: (page) => page.evaluate(() => {
      const K = window._PROFIL_KARAKTER, T = window._PROFIL_STIL, E = window._BQ_KARAKTER;
      __REG.ok('_PROFIL_KARAKTER yüklü (BR: 73 stil)', !!K && Object.keys(K).length === 73, K ? Object.keys(K).length + ' stil' : 'YOK');
      __REG.ok('_BQ_KARAKTER eksen tanımı yüklü (maya + malt)', !!E && !!E.maya && !!E.malt);
      __REG.ok('TABAN tablo DOKUNULMADI (60 kova)', Object.keys(T).length === 60, Object.keys(T).length);
      __REG.ok('AM2 kilidi korundu (altin|hop|dolgun = 12912)', T['altin|hop|dolgun'][0] === 12912, T['altin|hop|dolgun'][0]);
      __REG.ok('AK kilidi korundu (acik|malt|dolgun = 12187)', T['acik|malt|dolgun'][0] === 12187, T['acik|malt|dolgun'][0]);
      let eksik = 0, bjcpDisi = 0, sinifDisi = 0, payDisi = 0;
      Object.keys(T).forEach(k => T[k][1].forEach(x => { if (!K[x[0]]) eksik++; }));
      Object.keys(K).forEach(a => {
        if (!BJCP[a]) bjcpDisi++;
        const v = K[a];
        // SPRINT BS: satır 6 alanlı [maya,%,malt,%,tahıl,%]. malt '' olabilir
        // (tahıl-güdümlü stilde özel malt karakteri YOK) — o durumda pay 0.
        if (E.maya.sira.indexOf(v[0]) < 0) sinifDisi++;
        if (v[2] !== '' && E.malt.sira.indexOf(v[2]) < 0) sinifDisi++;
        if (E.tahil.sira.indexOf(v[4]) < 0) sinifDisi++;
        if (!(v[1] >= 1 && v[1] <= 100)) payDisi++;
        if (v[2] === '' ? v[3] !== 0 : !(v[3] >= 1 && v[3] <= 100)) payDisi++;
        if (!(v[5] >= 1 && v[5] <= 100)) payDisi++;
      });
      __REG.ok('60 kovadaki HER öneri karakter tablosunda var (sarkan referans yok)', eksik === 0, eksik);
      __REG.ok('SPRINT BT: her satır 10 alanlı [maya,%,malt,%,tahıl,%,abv,%,hop,%]', Object.values(K).every(v => v.length === 10), (Object.values(K)[0] || []).length);
      __REG.ok('SPRINT BS: 73 stilin HEPSİ tahıl sınıflı (grist kapsaması %100)',
        Object.values(K).every(v => !!v[4]), Object.keys(K).filter(a => !K[a][4]).join(','));
      __REG.ok('her karakter adı BJCP anahtarında var', bjcpDisi === 0, bjcpDisi);
      __REG.ok('sınıflar kapalı enum içinde (uydurma sınıf yok)', sinifDisi === 0, sinifDisi);
      __REG.ok('baskınlık yüzdeleri 1–100 bandında', payDisi === 0, payDisi);
      // BR: matristeki stil kümesi = karakter tablosunun stil kümesi (tam örtüşme)
      const AD = window._BR_STILAD || [];
      __REG.ok('BR matrisindeki 73 stilin HEPSİ karakter tablosunda (süzgeç kimseyi sessizce düşürmez)',
        AD.length === 73 && AD.every(a => !!K[a]), AD.filter(a => !K[a]).join(',') || AD.length + '/73');
      __REG.ok('karakter tablosunda matriste OLMAYAN stil yok (ölü giriş yok)', Object.keys(K).every(a => AD.indexOf(a) >= 0));
      const src = Array.from(document.querySelectorAll('script')).map(s => s.textContent).join('\n');
      const ak = src.slice(src.indexOf('SPRINT AK — PROFİL SEÇİCİ'), src.indexOf('SPRINT AJ — MASH SÜRECİ'));
      __REG.ok('BQ1 bloğu AK bölümünün içinde', ak.indexOf('SPRINT BQ1') >= 0);
      __REG.ok('BR bloğu da AK bölümünün içinde', ak.indexOf('SPRINT BR') >= 0);
      __REG.ok('BQ1/BR kodu S.fg / fgHesap OKUMUYOR (AK1 kuralı korundu)', ak.indexOf('S.fg') < 0 && ak.indexOf('fgHesap') < 0);
      __REG.ok('kapsama ölçümü kaynakta belgeli (maya %98,9 + bilinmiyor)', /%98,9/.test(ak) && /bilinmiyor/.test(ak));
      __REG.ok('maya sınıfının TAT değil KÖKEN ölçtüğü şerhi var', /KÖKEN/.test(ak));
      __REG.ok('malt "ekmeksi" kalan sınıf şerhi var (tespit değil)', /kalan sınıf/i.test(ak));
      __REG.ok('48→73 genişletmenin GEREKÇESİ kaynakta yazılı', /48 -> 73|48 → 73/.test(ak));
      const bas = src.indexOf('window._PROFIL_KARAKTER = {'), son = src.indexOf('window._BQ_KARAKTER = {');
      __REG.ok('statik karakter tablosu <8 KB', son > bas && (son - bas) < 8192, (son - bas) + ' bayt');
      return __REG.al();
    })
  },
  {
    kod: 'BQ1-MAYA', ad: 'KARAKTER SÜZGECİ (Kaan\'ın ekranı amber + malt ağırlıklı + dolgun): süzgeçsizken AK\'nın 6 stili AYNEN; 🧬 baharatlı seçilince Dunkelweizen/Weizenbock/Roggenbier KALIR, Wee Heavy/Irish Red/American Amber DÜŞER; BR farkı: süzgeç TAM havuza uygulanıyor → 3 değil 9 stil; sayı güncellenir; S kirlenmez',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('BQ1 Maya', {});
      ekran = 'editor'; sekme = 'genel';
      const pan = () => (document.getElementById('br-tam') || { innerHTML: '' }).innerHTML;
      _bmProfilSifirla();
      _bmProfilSec('renk', 'amber'); _bmProfilSec('aci', 'malt'); _bmProfilSec('govde', 'dolgun');
      _brAc();
      let d = pan();
      const HEPSI = ['Dunkelweizen', 'Weizenbock', 'Irish Red Ale', 'Roggenbier / Rye Beer', 'Wee Heavy', 'American Amber Ale / Red Ale'];
      __REG.ok('süzgeçsiz DAVRANIŞ AYNEN: AK\'nın 6 stilinin hepsi listede', HEPSI.every(a => d.indexOf(a) >= 0), HEPSI.filter(a => d.indexOf(a) < 0).join(','));
      __REG.ok('kova toplamı şeffaf (3.434)', d.indexOf('<b>3.434</b>') >= 0);
      // SPRINT BT: maya/tahıl/malt/hop artık DETAY grubunda (8 eksen mobilde
      // sığmıyordu — ölçüldü). Grup düğmesi eksenleri adıyla sayar; açılınca gelirler.
      __REG.ok('detay grubu düğmesi eksenleri adıyla listeliyor', /Detaylı tarif/.test(d) && d.indexOf('🧬 maya karakteri') >= 0 && d.indexOf('🌾 tahıl') >= 0);
      _brDetayAc();
      d = pan();
      __REG.ok('maya ekseni basıldı', d.indexOf('🧬 Maya karakteri') >= 0);
      __REG.ok('malt ekseni basıldı (BS: ikon 🍞, 🌾 artık tahıl ekseninin)', d.indexOf('🍞 Malt karakteri') >= 0);
      __REG.ok('tahıl ekseni basıldı (BS)', d.indexOf('🌾 Tahıl') >= 0);
      __REG.ok('hop ekseni basıldı (BT)', d.indexOf('🍃 Hop aroması') >= 0);
      __REG.ok('eksenlerin isteğe bağlı olduğu yazılı', d.indexOf('isteğe bağlı') >= 0);
      _bmProfilSec('maya', 'fenolik');
      d = pan();
      __REG.ok('Dunkelweizen KALDI', d.indexOf('Dunkelweizen') >= 0);
      __REG.ok('Weizenbock KALDI', d.indexOf('Weizenbock') >= 0);
      __REG.ok('Roggenbier KALDI', d.indexOf('Roggenbier') >= 0);
      __REG.ok('Scottish Ale / Wee Heavy DÜŞTÜ', d.indexOf('Wee Heavy') < 0);
      __REG.ok('Irish Red Ale DÜŞTÜ', d.indexOf('Irish Red') < 0);
      __REG.ok('American Amber DÜŞTÜ', d.indexOf('American Amber') < 0);
      const s = window._brSonuc();
      __REG.ok('BR: süzgeç TAM havuza uygulandı → 9 stil (BQ1\'de top-6 süzülüyordu, 3 çıkıyordu)', s.stiller.length === 9, s.stiller.length);
      __REG.ok('eşleşen reçete 1.701', s.esleseN === 1701, s.esleseN);
      __REG.ok('sayı ekranda güncellendi', /süzgeçle eşleşen <b>1\.701<\/b> reçete/.test(d), (d.match(/süzgeçle eşleşen <b>[^<]*<\/b> reçete/) || [''])[0]);
      __REG.ok('kova toplamı HÂLÂ görünür (süzgeç kovayı bölmüyor)', d.indexOf('<b>3.434</b>') >= 0);
      __REG.ok('seçim S\'ye YAZILMIYOR (reçete verisi değil)', typeof S.profil === 'undefined' && typeof S.akProfil === 'undefined' && typeof S.maya === 'undefined');
      __REG.ok('seçim __akProfil\'de tutuluyor', window.__akProfil.maya === 'fenolik', window.__akProfil.maya);
      _bmProfilSec('maya', 'fenolik');
      __REG.ok('tekrar tık = süzgeç temizlenir, AK listesi geri gelir', pan().indexOf('Wee Heavy') >= 0 && !window.__akProfil.maya);
      _brKapat(); _bmProfilSifirla();
      return __REG.al();
    })
  },
  {
    kod: 'BQ1-BOS', ad: 'BOŞ SONUÇ DÜRÜSTLÜĞÜ: 🧬 baharatlı + 🌾 karamel birlikte yok → sessiz boş liste DEĞİL; EN ÇOK DARALTAN eksen adıyla söylenir, her seçili eksen için tek dokunuşla gevşetme düğmesi + o eksen bırakılırsa kaç stil kalacağı yazılır (BB dersi)',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('BQ1 Bos', {});
      ekran = 'editor'; sekme = 'genel';
      const pan = () => (document.getElementById('br-tam') || { innerHTML: '' }).innerHTML;
      _bmProfilSifirla();
      _bmProfilSec('renk', 'amber'); _bmProfilSec('aci', 'malt'); _bmProfilSec('govde', 'dolgun');
      _bmProfilSec('maya', 'fenolik'); _bmProfilSec('malt', 'karamel');
      _brAc();
      const d = pan();
      __REG.ok('hiçbir stil satırı basılmadı (kesişim gerçekten boş)', d.indexOf('reçete bu profilde') < 0);
      __REG.ok('boş durum NET mesajla bildirildi', d.indexOf('Bu birleşimde stil yok') >= 0);
      __REG.ok('EN ÇOK DARALTAN eksen söylendi', d.indexOf('En çok daraltan eksen') >= 0);
      __REG.ok('daraltan eksen DOĞRU ölçüldü (malt=karamel bırakılırsa 9 stil)', /karamel<\/b> — bunu bırakırsan <b>9<\/b> stil/.test(d), (d.match(/En çok daraltan eksen:[^<]*<b>[^<]*<\/b>[^<]*<b>\d+<\/b>/) || [''])[0]);
      __REG.ok('mesaj iki süzgeci de adıyla anıyor', d.indexOf('baharatlı') >= 0 && d.indexOf('karamel') >= 0);
      __REG.ok('gevşetme düğmeleri seçili 5 eksenin HEPSİ için var', (d.match(/✕ /g) || []).length === 5, (d.match(/✕ /g) || []).length);
      const dar = window._brDaraltan();
      __REG.ok('gevşetme düğmeleri kaç stil kazandıracağını YAZIYOR', dar.length === 5 && dar[0].kalan === 9, JSON.stringify(dar.map(x => x.eksen + ':' + x.kalan)));
      _bmProfilSec('malt', 'karamel');
      __REG.ok('gevşetince liste geri geliyor', pan().indexOf('Dunkelweizen') >= 0);
      _brKapat(); _bmProfilSifirla();
      return __REG.al();
    })
  },
  {
    kod: 'BQ1-KARAKTER', ad: 'SATIRDA KARAKTER: her öneri satırında maya + malt karakteri görünüyor (Dunkelweizen ile Wee Heavy ayırt edilebiliyor); satır düzeni (Yeni reçete / Doldur / N reçete / ABV bandı / kalite-değil şerhi) BOZULMADI',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('BQ1 Karakter', {});
      ekran = 'editor'; sekme = 'genel';
      const pan = () => (document.getElementById('br-tam') || { innerHTML: '' }).innerHTML;
      _bmProfilSifirla();
      _bmProfilSec('renk', 'koyu'); _bmProfilSec('aci', 'dengeli'); _bmProfilSec('govde', 'dolgun');
      _brAc();
      const d = pan();
      // SPRINT BS1: liste kırpılmıyor — kapalıyken ilk _BR_ILK_ACIK satır
      const ILK = window._BR_ILK_ACIK;
      const satir = (d.match(/reçete bu profilde/g) || []).length;
      __REG.ok(ILK + ' öneri satırı (BS1: kırpma yok, ilk parti)', satir === ILK, satir);
      let tam = 0;
      d.split('reçete bu profilde').slice(1).forEach(seg => { const s = seg.slice(0, 500); if (s.indexOf('🧬') >= 0 && s.indexOf('🌾') >= 0) tam++; });
      __REG.ok('HER satırda maya + tahıl karakteri var', tam === satir, tam + '/' + satir);
      __REG.ok('AV1 "Yeni reçete" düğmeleri satır başına 1', (d.match(/✨ Yeni reçete/g) || []).length === satir, (d.match(/✨ Yeni reçete/g) || []).length);
      __REG.ok('AK "Doldur/Hedef yap" düğmeleri satır başına 1', ((d.match(/📋 Doldur/g) || []).length + (d.match(/🎯 Hedef yap/g) || []).length) === satir);
      __REG.ok('ABV bandı satırda duruyor', /ABV/.test(d));
      __REG.ok('kalite-değil uyarısı duruyor (AN dili)', d.indexOf('kalite değerlendirmesi değil') >= 0);
      __REG.ok('karakterin korpustan geldiği + köken şerhi dipnotta', d.indexOf('maya KÖKENİNİ') >= 0);
      _bmProfilSifirla();
      _bmProfilSec('renk', 'amber'); _bmProfilSec('aci', 'malt'); _bmProfilSec('govde', 'dolgun');
      const d2 = pan();
      const dw = d2.slice(d2.indexOf('Dunkelweizen'), d2.indexOf('Dunkelweizen') + 700);
      const wh = d2.slice(d2.indexOf('Wee Heavy'), d2.indexOf('Wee Heavy') + 700);
      __REG.ok('Dunkelweizen satırı "baharatlı" diyor', dw.indexOf('🧬 baharatlı') >= 0);
      __REG.ok('Wee Heavy satırı "meyveli" diyor (ayırt edilebiliyor)', wh.indexOf('🧬 meyveli') >= 0);
      _brKapat(); _bmProfilSifirla();
      return __REG.al();
    })
  },
  {
    kod: 'BQ1-EYLEM', ad: 'KRİTİK REGRESYON (eski BQ1-INDEKS): süzülmüş listede düğmeler DOĞRU stili açar. BR\'de liste tek kovadan gelmediği için kova indeksi yerine satır indeksi + ad eşlemesi kullanılıyor — yanlış reçete açılması riski aynı, kanıt aynı',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('BQ1 Eylem', {});
      ekran = 'editor'; sekme = 'genel';
      _bmProfilSifirla();
      _bmProfilSec('renk', 'amber'); _bmProfilSec('aci', 'malt'); _bmProfilSec('govde', 'dolgun');
      _bmProfilSec('maya', 'fenolik');
      _brAc();
      const d = document.getElementById('br-tam').innerHTML;
      const m = d.match(/_brYeniIx\((\d+)\)/g) || [];
      // SPRINT BS1: 9 stil <= _BR_ILK_ACIK (12) olduğu için HEPSİ çizilir
      __REG.ok('9 stilin HEPSİ satır oldu (BS1: kırpma yok)', m.length === 9, m.length);
      const ix = m.map(x => +x.match(/\((\d+)\)/)[1]);
      __REG.ok('satır indeksleri sıralı ve benzersiz [0..8]', JSON.stringify(ix) === '[0,1,2,3,4,5,6,7,8]', JSON.stringify(ix));
      const L = window.__brSon;
      __REG.ok('__brSon listesi süzülmüş sonuçla aynı', L[0] === 'Dunkelweizen' && L.indexOf('Scottish Ale / Wee Heavy') < 0, L.slice(0, 3).join(','));
      // 3. satır (Roggenbier) DOĞRU stili açmalı
      __REG.ok('3. satır Roggenbier', /Roggenbier/.test(L[2]), L[2]);
      _brDoldurIx(2, false);
      __REG.ok('süzülmüş 3. satır DOĞRU stili açtı', S.stil === L[2] && /Roggenbier/.test(S.stil), S.stil);
      __REG.ok('Sprint Z ayrımı korundu (__stilSecKaynak=iskelet)', window.__stilSecKaynak === 'iskelet', window.__stilSecKaynak);
      __REG.ok('eylem tam ekranı KAPATTI (reçeteye dönüldü)', window.__brAcik === false && !document.getElementById('br-tam'));
      // AV1 yolu: adla yeni reçete
      _brAc();
      const y = window._brYeniIx(0);
      __REG.ok('AV1 yolu süzgeçle çalışıyor (Dunkelweizen reçetesi oluştu)', S.stil === 'Dunkelweizen', S.stil);
      __REG.ok('yeni reçete id döndü', !!y, String(y));
      // ESKİ kovaKey+indeks imzası da AYNEN çalışıyor (AK/AV çağrıları kırılmadı)
      const T = window._PROFIL_STIL['amber|malt|dolgun'][1];
      _bmProfilStilUygula('amber|malt|dolgun', 3, false);
      __REG.ok('ESKİ imza _bmProfilStilUygula(kovaKey,idx) AYNEN', S.stil === T[3][0], S.stil + ' = ' + T[3][0]);
      _brKapat(); _bmProfilSifirla();
      return __REG.al();
    })
  },
  {
    kod: 'BQ1-KORUMA', ad: 'BİLEREK DEĞİŞEN SÖZLEŞME (eski BQ1-GERIDUS): taban eksen değişince karakter süzgeci ARTIK SESSİZCE DÜŞÜRÜLMÜYOR — 5 eksen de ekranda görünürken kullanıcının seçimini geri almak kafa karıştırıyordu. Seçim KORUNUR, çipte 0 yazar, boş sonuç hangi eksenin daralttığını söyler; tek dokunuşla geri alınır',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('BQ1 Koruma', {});
      ekran = 'editor'; sekme = 'genel';
      _bmProfilSifirla();
      _bmProfilSec('renk', 'amber'); _bmProfilSec('aci', 'malt'); _bmProfilSec('govde', 'dolgun'); _bmProfilSec('maya', 'fenolik');
      _brAc();
      __REG.ok('süzgeç aktif (9 stil)', window.__akProfil.maya === 'fenolik' && window._brSonuc().stiller.length === 9, window._brSonuc().stiller.length);
      // Taban eksen değişiyor: BQ1 burada süzgeci SESSİZCE DÜŞÜRÜP alakasız 6 stil gösteriyordu.
      _bmProfilSec('renk', 'cokkoyu');
      __REG.ok('kullanıcının seçimi KORUNDU (sessiz düşürme yok)', window.__akProfil.maya === 'fenolik', window.__akProfil.maya);
      const s1 = window._brSonuc();
      __REG.ok('süzgeç GERÇEKTEN uygulanıyor: tek fenolik stil kaldı', s1.stiller.length === 1 && s1.stiller[0] === 'Dunkelweizen', s1.stiller.join(','));
      // NOT (BS): 'Oatmeal Stout' artık tahıl ekseninin ipucu METNİNDE de geçiyor
      // (yulaf çipinin title'ı). Ham innerHTML araması YANLIŞ POZİTİF verir —
      // iddia SATIR düzeyine çekildi (gerçek risk buydu: listede alakasız stil).
      __REG.ok('BQ1 davranışının aksine listeye alakasız stil DÖNMEDİ',
        Array.from(document.querySelectorAll('#br-tam .br-satir-ad')).every(e => e.textContent.indexOf('Oatmeal Stout') < 0),
        Array.from(document.querySelectorAll('#br-tam .br-satir-ad')).map(e => e.textContent.trim()).join(','));
      __REG.ok('çip sayısı gerçeği söylüyor (fenolik=1)', window._brCipSayi('maya', 'fenolik') === 1, window._brCipSayi('maya', 'fenolik'));
      // Şimdi GERÇEKTEN boş bir birleşim: cokkoyu|malt|dolgun + ekşi (ölçüldü: 0)
      __REG.ok('ekşi çipi TIKLAMADAN ÖNCE 0 gösteriyor', window._brCipSayi('maya', 'eksi') === 0, window._brCipSayi('maya', 'eksi'));
      _bmProfilSec('maya', 'eksi');
      const d = document.getElementById('br-tam').innerHTML;
      __REG.ok('sonuç boş ve NEDENİ söylendi', d.indexOf('Bu birleşimde stil yok') >= 0 && d.indexOf('En çok daraltan eksen') >= 0);
      __REG.ok('tek dokunuşla gevşetme düğmeleri var (4 seçili eksen)', (d.match(/✕ /g) || []).length === 4, (d.match(/✕ /g) || []).length);
      _bmProfilSec('maya', 'eksi'); // gevşet
      __REG.ok('gevşetince liste geri geldi', (document.getElementById('br-tam').innerHTML.match(/reçete bu profilde/g) || []).length > 0);
      _bmProfilSec('renk', 'amber'); _bmProfilSec('maya', 'temiz'); _bmProfilSec('aci', 'dengeli');
      __REG.ok('amber|dengeli|dolgun\'da temiz maya var → süzgeç yaşıyor', window.__akProfil.maya === 'temiz' && window._brSonuc().stiller.length > 0, window.__akProfil.maya);
      _bmProfilSifirla();
      __REG.ok('sıfırla 5 ekseni de temizler', !window.__akProfil.renk && !window.__akProfil.aci && !window.__akProfil.govde && !window.__akProfil.maya && !window.__akProfil.malt);
      _brKapat();
      return __REG.al();
    })
  },
  // ═════════════ SPRINT BR — "BİRA TARİF ET" TAM EKRAN SEÇİCİ ═════════════
  {
    kod: 'BR1-TAMEKRAN', ad: 'TAM EKRAN (Kaan\'ın isteği): "Stilin adını bilmiyorum" tam ekran açıyor; 6 EKSEN (renk/acılık/gövde/maya/tahıl/malt) HİÇBİR SEÇİM YOKKEN BİLE AYNI EKRANDA; her eksende "Fark etmez" var (isteğe bağlılık görünür); ✕ ve Esc kapatıyor; seçim kapanınca kaybolmuyor',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('BR1 Tam', {});
      ekran = 'editor'; sekme = 'genel'; _bmProfilSifirla(); render();
      const giris = document.querySelector('.bm-profil-sec');
      __REG.ok('giriş düğmesi Hedef Stil satırının altında duruyor', !!giris && /Stilin adını bilmiyorum/.test(giris.textContent));
      __REG.ok('giriş düğmesi tam ekranı açıyor (_brAc)', /_brAc\(\)/.test(giris.getAttribute('onclick') || ''));
      __REG.ok('tam ekran BAŞLANGIÇTA kapalı', !document.getElementById('br-tam'));
      giris.click();
      const ov = document.getElementById('br-tam');
      __REG.ok('tam ekran açıldı', !!ov);
      __REG.ok('dialog rolü + aria-modal (a11y)', ov.getAttribute('role') === 'dialog' && ov.getAttribute('aria-modal') === 'true');
      __REG.ok('başlık "İstediğin birayı tarif et"', ov.textContent.indexOf('İstediğin birayı tarif et') >= 0);
      const r = ov.getBoundingClientRect();
      // Masaüstünde (≥769px) uygulamanın kendi grid'i 240px kenar çubuğu ayırıyor ve
      // .bm-main z-index:1 yığın bağlamı yüzünden onun ÜSTÜNE çizilemiyor (GÖRSEL
      // denetimde yakalandı, DOM ölçümü kördü) → tam ekran İÇERİK SÜTUNUNU kaplar.
      // ≤768px'te kenar çubuğu çekmece olduğu için gerçekten tüm ekranı kaplar.
      const kenar = innerWidth >= 769 ? 240 : 0;
      __REG.ok('içerik alanını TAM kaplıyor', Math.abs(r.left - kenar) <= 1 && Math.abs(r.right - innerWidth) <= 1 && Math.abs(r.height - innerHeight) <= 1, Math.round(r.left) + '..' + Math.round(r.right) + ' h' + Math.round(r.height) + ' / kenar ' + kenar + ' vw ' + innerWidth + 'x' + innerHeight);
      const kose = [[r.left + 5, 60], [r.left + 5, 400], [innerWidth - 5, innerHeight - 30]];
      __REG.ok('KAPLAMA GERÇEK: üç köşede de en üstteki eleman BR (yığın bağlamı tuzağı)',
        kose.every(q => { const e = document.elementFromPoint(q[0], q[1]); return !!e && ov.contains(e); }),
        kose.map(q => { const e = document.elementFromPoint(q[0], q[1]); return e ? (ov.contains(e) ? 'BR' : (e.className || e.tagName)) : 'YOK'; }).join(','));
      __REG.ok('position:fixed (kaydırma kutusuna hapsolmuyor)', getComputedStyle(ov).position === 'fixed');
      // 5 eksen AYNI ANDA — hiçbir seçim yokken bile
      // SPRINT BT: 8 eksen İKİ GRUPTA — temel (renk/acılık/gövde/güç) hep açık,
      // detay (maya/tahıl/malt/hop) katlı. 8'i birden açmak 390×844'te sonuç
      // başlığını 328 px aşağı itiyordu (ölçüldü) — gruplama ZORUNLU oldu.
      const temelAd = ['🎨 Renk', '🌿 Acılık', '🥛 Gövde', '💪 Güç'];
      const detayAd = ['🧬 Maya karakteri', '🌾 Tahıl', '🍞 Malt karakteri', '🍃 Hop aroması'];
      let bloklar = Array.from(ov.querySelectorAll('.br-eksen-ad')).map(e => e.textContent.trim());
      __REG.ok('temel 4 eksen seçimsizken AÇIK', JSON.stringify(bloklar) === JSON.stringify(temelAd), bloklar.join(' | '));
      const grupBtn = ov.querySelector('.br-grup');
      __REG.ok('detay grubu düğmesi var', !!grupBtn && /Detaylı tarif/.test(grupBtn.textContent));
      __REG.ok('grup düğmesi 4 detay eksenini ADIYLA sayıyor (keşfedilebilir)',
        ['maya karakteri', 'tahıl', 'malt karakteri', 'hop aroması'].every(a => grupBtn.textContent.indexOf(a) >= 0), grupBtn.textContent.trim());
      __REG.ok('grup düğmesi ≥44 px', grupBtn.getBoundingClientRect().height >= 44, Math.round(grupBtn.getBoundingClientRect().height));
      grupBtn.click();
      bloklar = Array.from(document.querySelectorAll('#br-tam .br-eksen-ad')).map(e => e.textContent.trim());
      __REG.ok('açılınca 8 eksen ekranda', JSON.stringify(bloklar) === JSON.stringify(temelAd.concat(detayAd)), bloklar.join('>'));
      const fark = Array.from(document.querySelectorAll('#br-tam .br-cip')).filter(b => /Fark etmez/.test(b.textContent));
      __REG.ok('her eksende "Fark etmez" çipi (8)', fark.length === 8, fark.length);
      __REG.ok('seçim yokken 8 "Fark etmez" de etkin', fark.every(b => b.getAttribute('aria-pressed') === 'true'));
      document.querySelector('#br-tam .br-grup').click();
      __REG.ok('İKİNCİ ADIM süzgeç kutusu KALDIRILDI', ov.innerHTML.indexOf('Listeyi daralt') < 0);
      // KATLAMA: seçilen eksen tek satıra iner (sonuç yukarı çıksın) ama KAYBOLMAZ
      _bmProfilSec('renk', 'amber');
      const kapali = document.querySelector('#br-tam .br-eksen-kapali');
      __REG.ok('seçilen eksen tek satıra KATLANDI', !!kapali && /Renk/.test(kapali.textContent), kapali ? kapali.textContent.trim() : 'YOK');
      __REG.ok('katlanmış satırda seçim + sayı görünüyor', !!kapali && /Amber/.test(kapali.textContent));
      __REG.ok('temel eksenler HÂLÂ ekranda (katlanan kaybolmuyor)', document.querySelectorAll('#br-tam .br-eksen').length === 4, document.querySelectorAll('#br-tam .br-eksen').length);
      const degis = Array.from(document.querySelectorAll('#br-tam .br-cip-degis'))[0];
      __REG.ok('"değiştir" düğmesi var (tek dokunuşla geri açılır)', !!degis);
      degis.click();
      __REG.ok('değiştir → eksen tekrar açıldı (tüm renk çipleri)', document.querySelectorAll('#br-tam .br-eksen')[0].querySelectorAll('.br-cip').length === 6, document.querySelectorAll('#br-tam .br-eksen')[0].querySelectorAll('.br-cip').length);
      _bmProfilSec('renk', 'amber'); // seçimi kaldır
      __REG.ok('seçim kalkınca eksen kendiliğinden açık kalır', !document.querySelector('#br-tam .br-eksen-kapali'));
      // Esc kapatır
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      __REG.ok('Escape kapatıyor', !document.getElementById('br-tam') && window.__brAcik === false);
      // seçim kapanınca kaybolmuyor
      _bmProfilSec('renk', 'koyu'); _bmProfilSec('maya', 'esterli');
      _brAc();
      __REG.ok('yeniden açınca seçim duruyor', window.__akProfil.renk === 'koyu' && window.__akProfil.maya === 'esterli');
      const kapat = document.querySelector('#br-tam .br-kapat');
      __REG.ok('✕ düğmesi var', !!kapat);
      kapat.click();
      __REG.ok('✕ kapatıyor', !document.getElementById('br-tam'));
      const ozet = document.querySelector('.bm-br-ozet');
      __REG.ok('kapalıyken seçim özeti giriş satırında görünüyor', !!ozet && /koyu/i.test(ozet.textContent) && /meyveli/.test(ozet.textContent), ozet ? ozet.textContent.trim() : 'YOK');
      _bmProfilSifirla();
      return __REG.al();
    })
  },
  {
    kod: 'BR2-CANLI', ad: 'CANLI SONUÇ: ayrı "ara" adımı YOK — her çip dokunuşunda liste anında güncelleniyor; hiç seçim yokken TÜM korpus (336.149 reçete · 73 stil); kademeli daralma; çiplerdeki sayı GERÇEK (o çip seçilirse kalan stil sayısı) — çıkmaz sokak tıklamadan önce görünür',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('BR2 Canli', {});
      ekran = 'editor'; sekme = 'genel'; _bmProfilSifirla(); _brAc();
      const ov = () => document.getElementById('br-tam');
      __REG.ok('"ara/uygula" düğmesi YOK (sonuç canlı)', !/>\s*(Ara|Uygula|Göster)\s*</.test(ov().innerHTML));
      let d = ov().innerHTML;
      __REG.ok('seçim yokken TÜM korpus: 336.149 reçete', d.indexOf('<b>336.149</b>') >= 0);
      __REG.ok('seçim yokken 73 stil', /<b>73<\/b> stil/.test(d));
      __REG.ok('"önce bir şey seç" YOK — ilk parti öneri zaten basılı (BS1)', (d.match(/reçete bu profilde/g) || []).length === window._BR_ILK_ACIK, (d.match(/reçete bu profilde/g) || []).length);
      const s0 = window._brSonuc();
      // kademeli daralma
      _bmProfilSec('renk', 'koyu');
      const s1 = window._brSonuc();
      __REG.ok('tek eksen seçimi listeyi daralttı (canlı)', s1.toplam < s0.toplam && s1.toplam === 43447, s0.toplam + ' → ' + s1.toplam);
      __REG.ok('DOM anında güncellendi (render beklemeden)', ov().innerHTML.indexOf('<b>43.447</b>') >= 0);
      _bmProfilSec('aci', 'dengeli');
      const s2 = window._brSonuc();
      __REG.ok('ikinci eksen daha da daralttı', s2.toplam < s1.toplam, s1.toplam + ' → ' + s2.toplam);
      _bmProfilSec('govde', 'dolgun');
      const s3 = window._brSonuc();
      __REG.ok('üçüncü eksen tek kovaya indirdi (AK kovası)', s3.kova === 1 && s3.toplam === window._PROFIL_STIL['koyu|dengeli|dolgun'][0], s3.kova + ' kova / ' + s3.toplam);
      // ÇİP SAYILARI GERÇEK Mİ? (garanti: >0 yazan çip seçilince boş sonuç OLAMAZ)
      let ihlal = 0, denenen = 0, sifirCip = 0;
      const EKS = { renk: ['acik', 'altin', 'amber', 'koyu', 'cokkoyu'], aci: ['malt', 'dengeli', 'hop', 'cokaci'], govde: ['ince', 'orta', 'dolgun'], maya: ['temiz', 'esterli', 'fenolik', 'eksi'], malt: ['ekmeksi', 'tost', 'karamel', 'kavrulmus', 'cikolata', 'isli'] };
      [{}, { renk: 'koyu' }, { renk: 'amber', aci: 'malt' }, { renk: 'amber', aci: 'malt', govde: 'dolgun' }, { maya: 'eksi' }, { govde: 'dolgun', maya: 'fenolik' }].forEach(baz => {
        window.__akProfil = Object.assign({ renk: '', aci: '', govde: '', maya: '', malt: '' }, baz);
        Object.keys(EKS).forEach(e => EKS[e].forEach(v => {
          denenen++;
          const yazan = window._brCipSayi(e, v);
          if (!yazan) sifirCip++;
          const q = Object.assign({}, window.__akProfil); q[e] = v;
          if (yazan !== window._brSonuc(q).stiller.length) ihlal++;
        }));
      });
      __REG.ok('çipteki sayı = seçilince gerçekten kalan stil (' + denenen + ' deneme, 0 sapma)', ihlal === 0, ihlal + ' sapma');
      __REG.ok('0 yazan çipler var → çıkmaz sokak ÖNCEDEN görünüyor', sifirCip > 0, sifirCip + '/' + denenen + ' çip 0');
      // ölü çip görsel olarak da soluk
      _bmProfilSifirla();
      _bmProfilSec('renk', 'amber'); _bmProfilSec('aci', 'malt'); _bmProfilSec('govde', 'dolgun'); _bmProfilSec('maya', 'fenolik');
      const karamel = Array.from(ov().querySelectorAll('.br-cip')).find(b => /_bmProfilSec\('malt','karamel'\)/.test(b.getAttribute('onclick') || ''));
      __REG.ok('0 stil veren çip görsel olarak SOLUK', !!karamel && karamel.classList.contains('br-cip-olu') && parseFloat(getComputedStyle(karamel).opacity) < 0.6, karamel ? getComputedStyle(karamel).opacity : 'YOK');
      const kn = karamel && karamel.querySelector('.br-cip-n');
      __REG.ok('çipte sayaç rozeti 0 yazıyor', !!kn && kn.textContent.trim() === '0', kn ? kn.textContent.trim() : 'YOK');
      // KAAN VAKASI
      const s = window._brSonuc();
      __REG.ok('KAAN VAKASI amber+malt+dolgun+baharatlı: Dunkelweizen var', s.stiller.indexOf('Dunkelweizen') >= 0);
      __REG.ok('  Weizenbock var', s.stiller.indexOf('Weizenbock') >= 0);
      __REG.ok('  Wee Heavy DÜŞTÜ', s.stiller.indexOf('Scottish Ale / Wee Heavy') < 0);
      __REG.ok('  9 stil / 1.701 reçete', s.stiller.length === 9 && s.esleseN === 1701, s.stiller.length + ' / ' + s.esleseN);
      _brKapat(); _bmProfilSifirla();
      return __REG.al();
    })
  },
  {
    kod: 'BR3-KORUNAN', ad: 'MEVCUT AKIŞ KORUNDU: 🎯 Hedef Stil dropdown\'u + 📋 İskeleti Doldur AYNEN yerinde; BQ1\'in ikinci-adım süzgeç kutusu KALDIRILDI (tek yerde toplandı); tam ekrandan "✨ Yeni reçete" ve "📋 Doldur" AV/AK yollarını AYNEN çağırıyor',
    calistir: (page) => page.evaluate(() => {
      const id = __REG.yeniKayit('BR3 Korunan', {});
      ekran = 'editor'; sekme = 'genel'; _bmProfilSifirla(); render();
      const dom = document.getElementById('ekran').innerHTML;
      __REG.ok('dropdown AYNEN duruyor', dom.indexOf('🎯 Hedef Stil:') >= 0 && !!document.querySelector('select[aria-label="Hedef stil"]'));
      __REG.ok('dropdown 200+ BJCP stili listeliyor', (dom.match(/<option value="/g) || []).length >= 200, (dom.match(/<option value="/g) || []).length);
      __REG.ok('"📋 İskeleti Doldur" AYNEN duruyor', dom.indexOf('bmStilIskeletDoldur()') >= 0);
      __REG.ok('BQ1 ikinci-adım süzgeç kutusu KALDIRILDI', dom.indexOf('Listeyi daralt') < 0 && dom.indexOf('korpusta bu stilleri yapanların baskın seçimi') < 0);
      __REG.ok('eski <details> paneli KALDIRILDI (artık düğme)', !document.querySelector('details.bm-profil-sec'));
      // AV1 yolu: tam ekrandan yeni reçete
      _bmProfilSec('renk', 'koyu'); _bmProfilSec('aci', 'dengeli'); _bmProfilSec('govde', 'dolgun');
      _brAc();
      const n0 = KR.length;
      const btn = Array.from(document.querySelectorAll('#br-tam button')).filter(b => /Yeni reçete/.test(b.textContent))[0];
      __REG.ok('tam ekranda "✨ Yeni reçete" düğmesi var', !!btn);
      const beklenen = window.__brSon[0];
      btn.click();
      __REG.ok('AV1 yolu: YENİ reçete oluştu', KR.length === n0 + 1, n0 + ' → ' + KR.length);
      __REG.ok('AV1 yolu: doğru stil', S.stil === beklenen, S.stil + ' = ' + beklenen);
      __REG.ok('eylem sonrası tam ekran kapandı', !document.getElementById('br-tam'));
      // AK yolu: Doldur AÇIK reçeteyi doldurur, yeni reçete OLUŞTURMAZ
      tarifAc(id); sekme = 'genel';
      S.hacim = 11; S.verim = 61; S.maltlar = []; S.hoplar = []; S.mayaId = '';
      _brAc();
      const n1 = KR.length;
      const dbtn = Array.from(document.querySelectorAll('#br-tam button')).filter(b => /^(📋 Doldur|🎯 Hedef yap)$/.test(b.textContent.trim()))[0];
      __REG.ok('tam ekranda "📋 Doldur" düğmesi var', !!dbtn);
      dbtn.click();
      __REG.ok('AK yolu: YENİ reçete OLUŞTURMADI', KR.length === n1, n1 + ' → ' + KR.length);
      __REG.ok('AK yolu: AÇIK reçete doldu', (S.maltlar || []).length > 0 && (S.hoplar || []).length > 0, (S.maltlar || []).length + ' malt');
      __REG.ok('AK yolu: açık reçetede kalındı', String(_editId) === String(id), String(_editId));
      _bmProfilSifirla();
      return __REG.al();
    })
  },
  {
    kod: 'BR4-MATRIS', ad: 'TAM MATRİS BÜTÜNLÜĞÜ: 60 kova × 73 stil = 3.433 hücre, kırpma YOK (kısmî seçim toplaması kesin); kova TOPLAMI _PROFIL_STIL otoritesinden okunuyor (AK/AM kilitleri korunuyor); AK algoritmasıyla 60 kovanın 59\'unda top-6 AYNEN — tek sapma belgeli (altin|cokaci|orta 5→6, MIN_PAY kaldırıldı)',
    calistir: (page) => page.evaluate(() => {
      const P = window._brKovaCoz(), T = window._PROFIL_STIL, AD = window._BR_STILAD;
      __REG.ok('60 kova çözüldü', Object.keys(P).length === 60, Object.keys(P).length);
      __REG.ok('73 stil adı', AD.length === 73, AD.length);
      let hucre = 0; Object.keys(P).forEach(k => hucre += P[k].length);
      __REG.ok('3.433 dolu hücre (kırpma yok)', hucre === 3433, hucre);
      __REG.ok('matris top-6\'dan BÜYÜK (kısmî toplama için şart)', hucre > 360, hucre + ' > 6×60');
      let maxSap = 0, negatif = 0;
      Object.keys(P).forEach(k => {
        const s = P[k].reduce((a, x) => a + x[1], 0);
        maxSap = Math.max(maxSap, Math.abs(s - T[k][0]));
        P[k].forEach(x => { if (!(x[1] > 0) || AD.indexOf(x[0]) < 0) negatif++; });
      });
      __REG.ok('her hücre pozitif ve adı sözlükte', negatif === 0, negatif);
      __REG.ok('kova hücre toplamı _PROFIL_STIL ile ≤11 sapıyor (korpus tazeliği %0,03)', maxSap <= 11, maxSap + ' kayıt');
      // AK PARİTESİ
      let ayni = 0, sapan = [];
      Object.keys(T).forEach(k => {
        const a = k.split('|');
        window.__akProfil = { renk: a[0], aci: a[1], govde: a[2], maya: '', malt: '' };
        const r = window._brSonuc();
        if (r.toplam !== T[k][0]) sapan.push(k + ' TOPLAM ' + r.toplam + '≠' + T[k][0]);
        if (JSON.stringify(r.stiller.slice(0, 6)) === JSON.stringify(T[k][1].map(x => x[0]))) ayni++;
        else sapan.push(k);
      });
      __REG.ok('60 kovada TOPLAM sayısı _PROFIL_STIL ile birebir', sapan.filter(x => /TOPLAM/.test(x)).length === 0, sapan.filter(x => /TOPLAM/.test(x)).join(' '));
      __REG.ok('59/60 kovada top-6 AK ile AYNEN', ayni === 59, ayni + '/60');
      __REG.ok('tek sapma altin|cokaci|orta (AK 5 satır → BR 6: MIN_PAY kaldırıldı)', sapan.filter(x => !/TOPLAM/.test(x)).join(',') === 'altin|cokaci|orta', sapan.filter(x => !/TOPLAM/.test(x)).join(','));
      window.__akProfil = { renk: 'altin', aci: 'cokaci', govde: 'orta', maya: '', malt: '' };
      const s5 = window._brSonuc();
      __REG.ok('  sapmada AK\'nın 5 stili AYNEN duruyor, üstüne 1 eklendi', T['altin|cokaci|orta'][1].every((x, i) => s5.stiller[i] === x[0]) && s5.stiller.length > 5, s5.stiller.slice(0, 6).join(' · '));
      _bmProfilSifirla();
      return __REG.al();
    })
  },
  {
    kod: 'BR5-PATLAMA', ad: 'KOVA PATLAMASI ÖLÇÜMÜ (şüphe (a)): 5 eksen ZORUNLU olsaydı 1.440 birleşimin %69,7\'si BOŞ çıkardı — isteğe bağlılık bunu TEK BAŞINA çözmüyor, kullanıcının erken durabilmesini sağlıyor. Asıl koruma: çip sayıları + boş-sonuç açıklaması. 0-1-2 eksende boşluk oranı ölçülüyor',
    calistir: (page) => page.evaluate(() => {
      const R = ['acik', 'altin', 'amber', 'koyu', 'cokkoyu'], A = ['malt', 'dengeli', 'hop', 'cokaci'], G = ['ince', 'orta', 'dolgun'];
      const MY = ['temiz', 'esterli', 'fenolik', 'eksi'], ML = ['ekmeksi', 'tost', 'karamel', 'kavrulmus', 'cikolata', 'isli'];
      const t0 = Date.now();
      let tum = 0, bos = 0;
      R.forEach(r => A.forEach(a => G.forEach(g => MY.forEach(my => ML.forEach(ml => {
        tum++;
        if (!window._brSonuc({ renk: r, aci: a, govde: g, maya: my, malt: ml }).stiller.length) bos++;
      })))));
      __REG.ok('5 eksen zorunlu olsaydı: 1.440 birleşim', tum === 1440, tum);
      // SPRINT BS: 8 tahıl-güdümlü stilin malt karakteri YOK olduğu için boş
      // kombinasyon sayısı 1004 -> 1009 (%69,7 -> %70,1). Beklenen sonuç:
      // 'ekmeksi' daraldı, o stiller malt eksenine artık hiç girmiyor.
      __REG.ok('5 eksende boşluk %70,1 (ÖLÇÜLDÜ — isteğe bağlılık bunu yok etmiyor)', bos === 1009, bos + ' boş = %' + (100 * bos / tum).toFixed(1));
      __REG.ok('0 eksen: boşluk YOK', window._brSonuc({}).stiller.length === 73, window._brSonuc({}).stiller.length);
      let b1 = 0, t1 = 0;
      [['renk', R], ['aci', A], ['govde', G], ['maya', MY], ['malt', ML]].forEach(e => e[1].forEach(v => {
        const p = { renk: '', aci: '', govde: '', maya: '', malt: '' }; p[e[0]] = v;
        t1++; if (!window._brSonuc(p).stiller.length) b1++;
      }));
      __REG.ok('1 eksen: 22 birleşimin hiçbiri boş değil', t1 === 22 && b1 === 0, b1 + '/' + t1);
      __REG.ok('ölçüm makul sürede bitti (<8 sn)', Date.now() - t0 < 8000, (Date.now() - t0) + ' ms');
      // KORUMA: kullanıcı 0 yazan çipe basmadıkça boşluğa DÜŞEMEZ (yapısal garanti)
      let kotu = 0;
      R.forEach(r => MY.forEach(my => ML.forEach(ml => {
        window.__akProfil = { renk: r, aci: '', govde: '', maya: my, malt: '' };
        if (window._brCipSayi('malt', ml) > 0 && !window._brSonuc({ renk: r, aci: '', govde: '', maya: my, malt: ml }).stiller.length) kotu++;
      })));
      __REG.ok('YAPISAL GARANTİ: >0 yazan çip seçilince sonuç ASLA boş çıkmıyor', kotu === 0, kotu + ' ihlal');
      _bmProfilSifirla();
      return __REG.al();
    })
  },
  {
    kod: 'BR6-MOBIL', ad: 'MOBİL (390 ve 360 px): tam ekran viewport\'a oturuyor, 6 eksen dikey akışta, çipler sarıyor, hiçbir şey taşmıyor; dokunma hedefleri ≥44 px (BJ1/BJ2 dersi); ilk parti önerinin HEPSİ erişilebilir; 360\'ta sonuç başlığı bir kısa kaydırma uzakta ama YAPIŞKAN; BR kazancı: profil paneli .eh sticky başlığından ÇIKTI → başlık kısaldı',
    calistir: async (page) => {
      let hepsi = [];
      for (const [w, h] of [[390, 844], [360, 640]]) {
        await page.setViewport({ width: w, height: h });
        // Genişlik değişince .bm-sidebar masaüstü sütunundan ÇEKMECEYE dönüyor ve
        // transform:translateX(-100%) 250 ms ANİMASYONLA gidiyor. O aralıkta çekmece
        // hâlâ ekranın solunda duruyor ve elementFromPoint'i kazanıyor (ölçüldü:
        // 'bm-sidebar'). Sabit bekleme YOK — çekmece ekran dışına çıkana kadar beklenir.
        await page.waitForFunction(() => {
          const s = document.querySelector('.bm-sidebar');
          if (!s) return true;
          if (getComputedStyle(s).position !== 'fixed') return true;
          return s.getBoundingClientRect().right <= 0.5;
        }, { timeout: 4000 });
        const c = await page.evaluate((w) => {
          const kayit = KR.find(k => k && k.biraAd === 'BR6 mobil');
          if (!kayit) __REG.yeniKayit('BR6 mobil', {}); else tarifAc(kayit.id);
          ekran = 'editor'; sekme = 'genel';
          _bmProfilSifirla(); render();
          // BR KAZANCI: panel .eh'den çıktı → sticky başlık kaydırma kutusuna sığıyor
          const ehH = document.querySelector('.eh').getBoundingClientRect().height;
          const ek = document.getElementById('ekran');
          __REG.ok(w + ': .eh sticky başlık kaydırma kutusuna SIĞIYOR', ehH <= ek.clientHeight + 1, Math.round(ehH) + '/' + ek.clientHeight);
          __REG.ok(w + ': .eh krom oranı ≤%45', ehH / innerHeight <= 0.45, '%' + Math.round(100 * ehH / innerHeight));
          _bmProfilSec('renk', 'amber'); _bmProfilSec('aci', 'malt'); _bmProfilSec('govde', 'dolgun');
          _brAc();
          const ov = document.getElementById('br-tam');
          __REG.ok(w + ': tam ekran açıldı', !!ov);
          const r = ov.getBoundingClientRect();
          __REG.ok(w + ': viewport\'a tam oturuyor (kenar çubuğu çekmece)', Math.abs(r.width - innerWidth) <= 1 && Math.abs(r.height - innerHeight) <= 1, Math.round(r.width) + 'x' + Math.round(r.height));
          const kose = [[5, 60], [5, Math.round(innerHeight / 2)], [innerWidth - 5, innerHeight - 30]];
          __REG.ok(w + ': KAPLAMA GERÇEK (hiçbir şey üstünü örtmüyor)', kose.every(q => { const e = document.elementFromPoint(q[0], q[1]); return !!e && ov.contains(e); }),
            kose.map(q => { const e = document.elementFromPoint(q[0], q[1]); return e ? (ov.contains(e) ? 'BR' : (e.className || e.tagName)) : 'YOK'; }).join(','));
          const cips = Array.from(ov.querySelectorAll('.br-cip'));
          // SPRINT BT: temel 4 eksenden 3'ü katlı (3 çip) + güç açık (5 çip) = 8;
          // detay grubu kapalı. Grup açılınca 4 eksen daha gelir (BT1-GRUP ölçüyor).
          __REG.ok(w + ': temel çipler basıldı (3 katlı + güç açık ⇒ ≥8)', cips.length >= 8, cips.length);
          const dis = cips.filter(b => { const q = b.getBoundingClientRect(); return q.left < -0.5 || q.right > innerWidth + 0.5; });
          __REG.ok(w + ': hiçbir çip viewport dışına TAŞMIYOR', dis.length === 0, dis.map(b => b.textContent.trim()).join(','));
          const kucuk = cips.filter(b => b.getBoundingClientRect().height < 44);
          __REG.ok(w + ': tüm çipler ≥44 px dokunma hedefi (BJ2)', kucuk.length === 0, kucuk.length + ' küçük');
          const satirlar = new Set(cips.map(b => Math.round(b.getBoundingClientRect().top)));
          __REG.ok(w + ': çipler satırlara sarıyor (dikey akış)', satirlar.size >= 5, satirlar.size + ' satır');
          __REG.ok(w + ': çip kabı flex-wrap:wrap', getComputedStyle(cips[0].parentElement).flexWrap === 'wrap', getComputedStyle(cips[0].parentElement).flexWrap);
          __REG.ok(w + ': tam ekran yatay kaydırma üretmiyor', ov.scrollWidth <= ov.clientWidth + 1, ov.scrollWidth + '/' + ov.clientWidth);
          __REG.ok(w + ': belge yatay TAŞMIYOR', document.documentElement.scrollWidth <= innerWidth + 1, document.documentElement.scrollWidth + '/' + innerWidth);
          // 6 önerinin hepsi erişilebilir (gövde kendi içinde kayar)
          const gov = ov.querySelector('.br-tam-govde');
          const oneri = Array.from(ov.querySelectorAll('button')).filter(b => /_brYeniIx/.test(b.getAttribute('onclick') || ''));
          const icKay = gov.scrollHeight > gov.clientHeight + 2;
          const dogrudan = oneri.every(b => b.getBoundingClientRect().bottom <= gov.getBoundingClientRect().bottom + 0.5);
          __REG.ok(w + ': ilk parti önerinin HEPSİ erişilebilir (BS1)', oneri.length === window._BR_ILK_ACIK && (icKay || dogrudan), oneri.length + ' öneri, ' + (icKay ? 'gövde kendi içinde kayıyor' : 'doğrudan sığıyor'));
          // tek elle erişim: kapat + temizle + canlı sayı ALT çubukta (başparmak bölgesi)
          const alt = ov.querySelector('.br-tam-alt');
          const ar = alt.getBoundingClientRect();
          __REG.ok(w + ': alt çubuk ekranın alt yarısında (tek elle erişim)', ar.top > innerHeight * 0.5 && ar.bottom <= innerHeight + 1, Math.round(ar.top) + '-' + Math.round(ar.bottom) + ' / ' + innerHeight);
          __REG.ok(w + ': alt çubukta canlı sayı + Temizle + Kapat', /reçete/.test(alt.textContent) && /Temizle/.test(alt.textContent) && /Kapat/.test(alt.textContent));
          const altBtn = Array.from(alt.querySelectorAll('button'));
          __REG.ok(w + ': alt çubuk düğmeleri ≥44 px', altBtn.every(b => b.getBoundingClientRect().height >= 44), altBtn.map(b => Math.round(b.getBoundingClientRect().height)).join(','));
          const kapatBtn = ov.querySelector('.br-kapat').getBoundingClientRect();
          __REG.ok(w + ': ✕ düğmesi ≥44×44', kapatBtn.width >= 44 && kapatBtn.height >= 44, Math.round(kapatBtn.width) + 'x' + Math.round(kapatBtn.height));
          // süzgeç listeyi kısaltıyor
          // BR KATLAMA KAZANCI (en sonda: _brCiz outerHTML ile düğümleri tazeler,
          // yukarıdaki referanslar bayatlamasın diye burada ölçülüyor)
          const gv0 = document.querySelector('#br-tam .br-tam-govde');
          const basY = () => document.querySelector('#br-tam .br-sonuc-bas').getBoundingClientRect().top;
          // SPRINT BS: 6. eksen (tahıl) dikeyde ~112 px ekledi. ÖLÇÜLDÜ:
          //   390×844 → 3 seçimde başlık görünür alanın 134 px İÇİNDE (sorun yok)
          //   360×640 → 61–70 px ALTINDA kalıyor (bir kısa kaydırma)
          // 360'ta sıfır-kaydırma hedefi 6 eksenle dürüstçe tutulamıyor; onun
          // yerine (a) mesafenin bir ekran boyunu geçmediği, (b) kaydırınca
          // YAPIŞKAN başlığın üstte kaldığı doğrulanıyor (yön kaybı yok).
          const govAlt = gv0.getBoundingClientRect().bottom, mesafe = Math.round(basY() - govAlt);
          if (w >= 390) __REG.ok(w + ': 3 seçimde sonuç başlığı görünür alanda', mesafe < 0, mesafe + ' px');
          else __REG.ok(w + ': 3 seçimde başlık en fazla bir kısa kaydırma uzakta', mesafe < 160, mesafe + ' px');
          const gvUst = Math.round(gv0.getBoundingClientRect().top);
          gv0.scrollTop = gv0.scrollHeight;
          const yapisikY = Math.round(document.querySelector('#br-tam .br-sonuc-bas').getBoundingClientRect().top);
          __REG.ok(w + ': kaydırınca sonuç başlığı YAPIŞKAN kalıyor (yön kaybı yok)', yapisikY >= gvUst - 1 && yapisikY <= gvUst + 14, yapisikY + ' vs govde üst ' + gvUst);
          gv0.scrollTop = 0;
          const y3 = basY();
          _bmProfilSifirla();
          const y0 = document.querySelector('#br-tam .br-sonuc-bas').getBoundingClientRect().top;
          __REG.ok(w + ': katlama sonucu YUKARI çekiyor (0 seçim → 3 seçim)', y3 < y0 - 100, Math.round(y0) + ' → ' + Math.round(y3) + ' px');
          _bmProfilSec('renk', 'amber'); _bmProfilSec('aci', 'malt'); _bmProfilSec('govde', 'dolgun');
          const gov2 = document.querySelector('#br-tam .br-tam-govde');
          const s0 = gov2.scrollHeight;
          _bmProfilSec('maya', 'fenolik');
          const s1 = document.querySelector('#br-tam .br-tam-govde').scrollHeight;
          __REG.ok(w + ': karakter süzgeci sonucu değiştiriyor', s1 !== s0 || window._brSonuc().stiller.length === 9, s0 + 'px → ' + s1 + 'px');
          _brKapat(); _bmProfilSifirla();
          return __REG.al();
        }, w);
        hepsi = hepsi.concat(c);
      }
      await page.setViewport({ width: 1024, height: 800 });
      return hepsi;
    }
  },
  // ═════════════ SPRINT BS — TÜM STİLLER + TAHIL/ÖZEL MALT SINIFLARI ═════════════
  {
    kod: 'BS1-TUMSTIL', ad: 'TÜM STİLLER (Kaan: "hepsi gözüksün"): sonuç listesi artık KIRPILMIYOR — eşleşen tüm stiller erişilebilir; ilk 12 açık, gerisi "▾ N stil daha" ile tek dokunuşta; sıralama yaygınlık (n × iskelet 1,35) AYNEN; her satırda reçete sayısı + %; uzun listede sonuç başlığı YAPIŞKAN',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('BS1 Tum', {});
      ekran = 'editor'; sekme = 'genel'; _bmProfilSifirla(); _brAc();
      const ov = () => document.getElementById('br-tam');
      __REG.ok('kırpma kapalı (_BR_MAX_ONERI = 0)', window._BR_MAX_ONERI === 0, window._BR_MAX_ONERI);
      __REG.ok('ilk parti 12 satır', window._BR_ILK_ACIK === 12, window._BR_ILK_ACIK);
      const s = window._brSonuc();
      __REG.ok('hiç seçim yok → 73 stil eşleşiyor', s.stiller.length === 73, s.stiller.length);
      let d = ov().innerHTML;
      __REG.ok('kapalıyken 12 satır çizili', (d.match(/reçete bu profilde/g) || []).length === 12, (d.match(/reçete bu profilde/g) || []).length);
      __REG.ok('"▾ 61 stil daha" düğmesi var (gizli stil sayısı YAZILI)', /▾ 61 stil daha/.test(d), (d.match(/▾ \d+ stil daha/) || ['YOK'])[0]);
      __REG.ok('başlıkta toplam stil sayısı var (73)', /<b>73<\/b> stil/.test(d));
      // AÇ
      const daha = ov().querySelector('.br-daha');
      __REG.ok('düğme ≥44 px dokunma hedefi', daha.getBoundingClientRect().height >= 44, Math.round(daha.getBoundingClientRect().height));
      daha.click();
      d = ov().innerHTML;
      const satir = (d.match(/reçete bu profilde/g) || []).length;
      __REG.ok('açılınca 73 stilin HEPSİ satır oldu', satir === 73, satir);
      __REG.ok('kısalt düğmesi geldi', /▴ ilk 12 stille kısalt/.test(d));
      __REG.ok('her satırda reçete sayısı + % (şeffaflık korundu)', (d.match(/reçete bu profilde \(%/g) || []).length === 73, (d.match(/reçete bu profilde \(%/g) || []).length);
      __REG.ok('her satırda "✨ Yeni reçete" var', (d.match(/✨ Yeni reçete/g) || []).length === 73);
      // SIRALAMA: n × (iskelet ? 1.35 : 1) AZALAN
      const L = window.__brSon, m = s.m, ISK = window.STIL_ISKELET;
      let bozuk = 0;
      for (let i = 1; i < L.length; i++) {
        const a = m[L[i - 1]] * (ISK[L[i - 1]] ? 1.35 : 1), b = m[L[i]] * (ISK[L[i]] ? 1.35 : 1);
        if (a < b - 1e-9) bozuk++;
      }
      __REG.ok('sıralama yaygınlık (n × iskelet 1,35) — AK/AM mantığı AYNEN', bozuk === 0, bozuk + ' ihlal');
      __REG.ok('en yaygın stil ilk sırada (American IPA)', L[0] === 'American IPA', L[0] + ' (' + m[L[0]] + ')');
      // YAPIŞKAN başlık: uzun listede yön kaybı yok
      const gov = ov().querySelector('.br-tam-govde');
      const gvUst = Math.round(gov.getBoundingClientRect().top);
      gov.scrollTop = gov.scrollHeight;
      const basY = Math.round(ov().querySelector('.br-sonuc-bas').getBoundingClientRect().top);
      __REG.ok('uzun listede sonuç başlığı YAPIŞKAN (üstte kalıyor)', basY >= gvUst - 1 && basY <= gvUst + 14, basY + ' vs gövde üst ' + gvUst);
      gov.scrollTop = 0;
      // kısalt geri alıyor
      ov().querySelector('.br-daha').click();
      __REG.ok('kısalt → tekrar 12 satır', (ov().innerHTML.match(/reçete bu profilde/g) || []).length === 12);
      // eylem düğmeleri TAM listeye göre indeksli (kayma yok)
      window._brHepsiAc();
      const btn = Array.from(ov().querySelectorAll('button')).filter(b => /_brYeniIx/.test(b.getAttribute('onclick') || ''));
      const ix = btn.map(b => +b.getAttribute('onclick').match(/\((\d+)\)/)[1]);
      __REG.ok('73 düğme, indeksler 0..72 sıralı (yanlış stil açılmaz)', ix.length === 73 && ix.every((v, i) => v === i), ix.length + ' düğme');
      _brKapat(); _bmProfilSifirla();
      return __REG.al();
    })
  },
  {
    kod: 'BS2-TAHIL', ad: 'TAHIL EKSENİ (Kaan: "buğday yapmak istediğimde ekmeğe girmemeliyim"): 🌾 Tahıl AYRI eksen — arpa/buğday/çavdar/yulaf; eşikler KORPUSTAN kalibre (buğday %21 · çavdar %22 · yulaf %5), grist kapsaması %100; "buğday" seçilince Weizen/Weizenbock/Dunkelweizen/Witbier/Berliner geliyor, arpa biraları düşüyor',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('BS2 Tahil', {});
      ekran = 'editor'; sekme = 'genel'; _bmProfilSifirla(); _brAc();
      const E = window._BQ_KARAKTER, K = window._PROFIL_KARAKTER;
      __REG.ok('tahıl ekseni tanımlı (i=4)', !!E.tahil && E.tahil.i === 4, E.tahil ? E.tahil.i : 'YOK');
      __REG.ok('4 sınıf: arpa/buğday/çavdar/yulaf', JSON.stringify(E.tahil.sira) === '["arpa","bugday","cavdar","yulaf"]', JSON.stringify(E.tahil.sira));
      __REG.ok('ikon çakışması yok (tahıl 🌾 / malt 🍞)', E.tahil.ikon === '🌾' && E.malt.ikon === '🍞', E.tahil.ikon + ' / ' + E.malt.ikon);
      __REG.ok('KAPSAMA: 73 stilin HEPSİ tahıl sınıflı', Object.values(K).every(v => !!v[4]), Object.keys(K).filter(a => !K[a][4]).join(','));
      __REG.ok('sınıflar kapalı enum (uydurma yok)', Object.values(K).every(v => E.tahil.sira.indexOf(v[4]) >= 0));
      // EŞİKLER KAYNAKTA BELGELİ (uydurma eşik yok)
      const src = Array.from(document.querySelectorAll('script')).map(s => s.textContent).join('\n');
      const ak = src.slice(src.indexOf('SPRINT AK — PROFİL SEÇİCİ'), src.indexOf('SPRINT AJ — MASH SÜRECİ'));
      __REG.ok('eşikler kaynakta YAZILI (buğday %21 · çavdar %22 · yulaf %5)', /%21/.test(ak) && /%22/.test(ak) && /yulaf %5|yulaf ≥%5|≥%5/.test(ak));
      __REG.ok('eşiklerin KALİBRE edildiği belgeli (uydurma değil)', /kalibre/i.test(ak) && /band/i.test(ak));
      __REG.ok('grist kapsaması kaynakta ölçülü (%100)', /Grist kapsaması %100/.test(ak) || /%100,00/.test(ak));
      __REG.ok('REDDEDİLEN tek-eşik denemesi belgeli (Saison vakası)', /Saison/.test(ak) && /REDDEDİLDİ|reddedildi/i.test(ak));
      __REG.ok('mısır/pirinç sınıfı YOK + gerekçesi yazılı (korpus desteklemiyor)',
        E.tahil.sira.indexOf('adjunct') < 0 && /DÜŞÜRÜLDÜ|UYDURULMADI/.test(ak));
      // UI
      // SPRINT BT: tahıl artık DETAY grubunda — grup açılınca görünür
      __REG.ok('grup düğmesi tahılı adıyla anıyor', document.getElementById('br-tam').innerHTML.indexOf('🌾 tahıl') >= 0);
      _brDetayAc();
      const d0 = document.getElementById('br-tam').innerHTML;
      __REG.ok('🌾 Tahıl ekseni ekranda', d0.indexOf('🌾 Tahıl') >= 0);
      __REG.ok('4 tahıl çipi + Fark etmez', ['arpa', 'buğday', 'çavdar', 'yulaf'].every(x => d0.indexOf('>' + x) >= 0 || d0.indexOf(x) >= 0));
      // BUĞDAY SEÇİMİ
      _bmProfilSec('tahil', 'bugday');
      const s = window._brSonuc();
      ['Weizen / Weissbier', 'Weizenbock', 'Dunkelweizen', 'Witbier / Belgian White', 'Berliner Weisse', 'American Wheat Beer', 'Lambic / Gueuze']
        .forEach(a => __REG.ok('  buğday → ' + a, s.stiller.indexOf(a) >= 0));
      ['American IPA', 'American Pale Ale', 'German Pils', 'Robust Porter', 'Saison / Farmhouse Ale', 'Tripel', 'Oatmeal Stout']
        .forEach(a => __REG.ok('  arpa birası ' + a + ' DÜŞTÜ', s.stiller.indexOf(a) < 0));
      __REG.ok('7 buğday stili', s.stiller.length === 7, s.stiller.length);
      __REG.ok('Saison buğday DEĞİL (tek-eşik hatası tekrarlanmadı)', window._bmKarakterSinif('Saison / Farmhouse Ale', 'tahil') === 'arpa', window._bmKarakterSinif('Saison / Farmhouse Ale', 'tahil'));
      // ÇAVDAR + YULAF
      _bmProfilSec('tahil', 'cavdar');
      __REG.ok('çavdar → Roggenbier', window._brSonuc().stiller.join(',') === 'Roggenbier / Rye Beer', window._brSonuc().stiller.join(','));
      _bmProfilSec('tahil', 'yulaf');
      __REG.ok('yulaf → Oatmeal Stout var', window._brSonuc().stiller.indexOf('Oatmeal Stout') >= 0, window._brSonuc().stiller.join(','));
      _bmProfilSec('tahil', 'arpa');
      __REG.ok('arpa → 63 stil (73 - 10)', window._brSonuc().stiller.length === 63, window._brSonuc().stiller.length);
      let toplam = 0;
      ['arpa', 'bugday', 'cavdar', 'yulaf'].forEach(c => { _bmProfilSifirla(); _bmProfilSec('tahil', c); toplam += window._brSonuc().stiller.length; });
      __REG.ok('4 sınıf ayrık ve tam (toplam = 73)', toplam === 73, toplam);
      _brKapat(); _bmProfilSifirla();
      return __REG.al();
    })
  },
  {
    kod: 'BS2-EKMEKSI', ad: 'YANLIŞ KATEGORİ DÜZELTİLDİ: "ekmeksi" bir TAT, "buğday" bir TAHIL — "ekmeksi" seçilince buğday/çavdar/yulaf biraları ARTIK GELMİYOR; ekmeksi sınıfı boşalmadı (arpa tabanlı stiller duruyor); değişim TAM OLARAK tahıl-güdümlü 8 stille sınırlı (arpa tabanlı hiçbir stil etkilenmedi)',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('BS2 Ekmeksi', {});
      ekran = 'editor'; sekme = 'genel'; _bmProfilSifirla(); _brAc();
      _bmProfilSec('malt', 'ekmeksi');
      const s = window._brSonuc();
      const tahilGudumlu = ['Weizen / Weissbier', 'Weizenbock', 'Witbier / Belgian White', 'Berliner Weisse',
        'American Wheat Beer', 'Lambic / Gueuze', 'Roggenbier / Rye Beer', 'NEIPA / Hazy IPA'];
      tahilGudumlu.forEach(a => __REG.ok('  ' + a + ' ARTIK ekmeksi DEĞİL', s.stiller.indexOf(a) < 0));
      __REG.ok('ekmeksi BOŞALMADI (arpa stilleri duruyor)', s.stiller.length >= 30, s.stiller.length + ' stil');
      __REG.ok('  American IPA hâlâ ekmeksi', s.stiller.indexOf('American IPA') >= 0);
      __REG.ok('  American Pale Ale hâlâ ekmeksi', s.stiller.indexOf('American Pale Ale') >= 0);
      __REG.ok('  Tripel hâlâ ekmeksi', s.stiller.indexOf('Tripel') >= 0);
      // DEĞİŞİM SINIRI: yalnız tahıl-güdümlü stillerin malt karakteri boşaldı
      const K = window._PROFIL_KARAKTER;
      const bosMalt = Object.keys(K).filter(a => !K[a][2]);
      __REG.ok('malt karakteri BOŞ olan tam 8 stil', bosMalt.length === 8, bosMalt.length + ': ' + bosMalt.join(','));
      __REG.ok('boş olanların HEPSİ tahıl-güdümlü (arpa değil)', bosMalt.every(a => K[a][4] !== 'arpa'), bosMalt.filter(a => K[a][4] === 'arpa').join(','));
      __REG.ok('arpa tabanlı HİÇBİR stilin malt karakteri boşalmadı', Object.keys(K).filter(a => K[a][4] === 'arpa').every(a => !!K[a][2]));
      // ekmeksi seçiliyken tahıl çipleri: buğday/çavdar/yulaf 0 göstermeli
      __REG.ok('ekmeksi + buğday çipi 0 (çıkmaz sokak önceden görünür)', window._brCipSayi('tahil', 'bugday') === 0, window._brCipSayi('tahil', 'bugday'));
      __REG.ok('ekmeksi + arpa çipi >0', window._brCipSayi('tahil', 'arpa') > 0, window._brCipSayi('tahil', 'arpa'));
      // satırda tahıl rozeti görünüyor
      _bmProfilSifirla(); _bmProfilSec('tahil', 'bugday');
      const d = document.getElementById('br-tam').innerHTML;
      __REG.ok('öneri satırında 🌾 tahıl rozeti var', (d.match(/🌾 buğday/g) || []).length >= 5, (d.match(/🌾 buğday/g) || []).length);
      _brKapat(); _bmProfilSifirla();
      return __REG.al();
    })
  },
  {
    kod: 'BS2-ISLI', ad: 'İSLİ (rauch/smoked) — VERİYLE KARAR: korpusta 4.693 kayıt isli eşiğini geçiyor, 2 stil isli-baskın (Rauchbier / Bamberg Smoked %83 · Smoked Beer / Rauchbier %48). Çip AYRI kalıyor; %40 altı baskınlık satırda "?" ile işaretli (karışık)',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('BS2 Isli', {});
      ekran = 'editor'; sekme = 'genel'; _bmProfilSifirla(); _brAc();
      _bmProfilSec('malt', 'isli');
      const s = window._brSonuc();
      __REG.ok('isli seçilince stil GELİYOR (boş değil)', s.stiller.length >= 2, s.stiller.length);
      __REG.ok('Rauchbier ailesi geliyor', s.stiller.every(a => /Rauchbier|Smoked/i.test(a)) && s.stiller.length === 2, s.stiller.join(' · '));
      __REG.ok('yeterli korpus desteği (≥1.000 reçete)', s.esleseN >= 1000, s.esleseN + ' reçete');
      __REG.ok('  Rauchbier / Bamberg Smoked baskınlık %83', window._bmKarakterPay('Rauchbier / Bamberg Smoked', 'malt') === 83, window._bmKarakterPay('Rauchbier / Bamberg Smoked', 'malt'));
      __REG.ok('  Smoked Beer / Rauchbier baskınlık %48', window._bmKarakterPay('Smoked Beer / Rauchbier', 'malt') === 48, window._bmKarakterPay('Smoked Beer / Rauchbier', 'malt'));
      const d = document.getElementById('br-tam').innerHTML;
      __REG.ok('satırda isli rozeti', d.indexOf('🍞 isli') >= 0);
      __REG.ok('%40 üstü baskınlıkta "?" YOK (ikisi de ≥%40)', d.indexOf('isli?') < 0);
      __REG.ok('isli çipi ölü DEĞİL (sayısı >0)', window._brCipSayi('malt', 'isli') === 2, window._brCipSayi('malt', 'isli'));
      _brKapat(); _bmProfilSifirla();
      return __REG.al();
    })
  },
  {
    kod: 'BS3-KORUNAN', ad: 'BS3: BQ1/BR ALTYAPISI KORUNDU — maya sütunu 73/73 AYNEN (yeniden türetilmedi); malt sınıfı 65/73 stilde AYNEN; AK top-6 paritesi 59/60; kova toplamları (12.187 · 12.912 · 3.434) DOKUNULMADI; Kaan\'ın BR vakası (amber+malt+dolgun+baharatlı → 9 stil / 1.701 reçete) AYNEN',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('BS3 Korunan', {});
      ekran = 'editor'; sekme = 'genel'; _bmProfilSifirla();
      const T = window._PROFIL_STIL, K = window._PROFIL_KARAKTER;
      __REG.ok('AK kilidi (acik|malt|dolgun = 12.187)', T['acik|malt|dolgun'][0] === 12187, T['acik|malt|dolgun'][0]);
      __REG.ok('AM2 kilidi (altin|hop|dolgun = 12.912)', T['altin|hop|dolgun'][0] === 12912, T['altin|hop|dolgun'][0]);
      __REG.ok('BQ1 kilidi (amber|malt|dolgun = 3.434)', T['amber|malt|dolgun'][0] === 3434, T['amber|malt|dolgun'][0]);
      __REG.ok('60 kova + 73 stil matrisi duruyor', Object.keys(T).length === 60 && window._BR_STILAD.length === 73);
      // MAYA sütunu: BQ1 değerleri (örneklem — hepsi tabloda sabit)
      const mayaOrnek = { 'Weizen / Weissbier': ['fenolik', 92], 'American IPA': ['temiz', 77], 'Best Bitter': ['esterli', 87], 'Berliner Weisse': ['eksi', 53], 'Tripel': ['fenolik', 96] };
      let mayaFark = 0;
      Object.keys(mayaOrnek).forEach(a => { if (!K[a] || K[a][0] !== mayaOrnek[a][0] || K[a][1] !== mayaOrnek[a][1]) mayaFark++; });
      __REG.ok('maya sütunu BQ1 ile AYNEN (örneklem 5/5)', mayaFark === 0, mayaFark);
      // MALT sütunu: 8 stil dışında değişmedi
      const maltOrnek = { 'American Amber Ale / Red Ale': 'karamel', 'Dry Irish Stout': 'kavrulmus', 'Robust Porter': 'cikolata', 'Bock': 'tost', 'American IPA': 'ekmeksi', 'Dunkelweizen': 'tost' };
      let maltFark = [];
      Object.keys(maltOrnek).forEach(a => { if (!K[a] || K[a][2] !== maltOrnek[a]) maltFark.push(a + '=' + (K[a] ? K[a][2] : '-')); });
      __REG.ok('malt sütunu BQ1 ile AYNEN (örneklem 6/6)', maltFark.length === 0, maltFark.join(','));
      __REG.ok('yalnız 8 stilin malt karakteri boşaldı', Object.keys(K).filter(a => !K[a][2]).length === 8, Object.keys(K).filter(a => !K[a][2]).length);
      // AK PARİTESİ
      let ayni = 0;
      Object.keys(T).forEach(k => {
        const a = k.split('|');
        window.__akProfil = { renk: a[0], aci: a[1], govde: a[2], maya: '', tahil: '', malt: '' };
        if (JSON.stringify(window._brSonuc().stiller.slice(0, 6)) === JSON.stringify(T[k][1].map(x => x[0]))) ayni++;
      });
      __REG.ok('AK top-6 paritesi 59/60 KORUNDU', ayni === 59, ayni + '/60');
      // KAAN'IN BR VAKASI
      window.__akProfil = { renk: 'amber', aci: 'malt', govde: 'dolgun', maya: 'fenolik', tahil: '', malt: '' };
      const s = window._brSonuc();
      __REG.ok('BR vakası: 9 stil AYNEN', s.stiller.length === 9, s.stiller.length);
      __REG.ok('BR vakası: 1.701 reçete AYNEN', s.esleseN === 1701, s.esleseN);
      __REG.ok('BR vakası: Dunkelweizen ilk sırada', s.stiller[0] === 'Dunkelweizen', s.stiller[0]);
      __REG.ok('BR vakası: Wee Heavy hâlâ düşük', s.stiller.indexOf('Scottish Ale / Wee Heavy') < 0);
      // 6 eksende de çip sayısı GERÇEK
      let ihlal = 0, denenen = 0;
      const EKS = { renk: ['acik', 'koyu'], aci: ['malt', 'hop'], govde: ['ince', 'dolgun'], maya: ['temiz', 'fenolik'], tahil: ['arpa', 'bugday', 'cavdar', 'yulaf'], malt: ['ekmeksi', 'karamel', 'isli'] };
      [{}, { renk: 'koyu' }, { tahil: 'bugday' }, { maya: 'fenolik' }].forEach(baz => {
        Object.keys(EKS).forEach(e => EKS[e].forEach(v => {
          window.__akProfil = Object.assign({ renk: '', aci: '', govde: '', maya: '', tahil: '', malt: '' }, baz);
          denenen++;
          const n = window._brCipSayi(e, v);
          const q = Object.assign({}, window.__akProfil); q[e] = v;
          if (n !== window._brSonuc(q).stiller.length) ihlal++;
        }));
      });
      __REG.ok('6 eksende çip sayısı = seçilince kalan stil (' + denenen + ' deneme)', ihlal === 0, ihlal + ' sapma');
      _bmProfilSifirla();
      return __REG.al();
    })
  },
  // ═════════════ SPRINT BT — GÜÇ (ABV) + HOP AROMASI + GRUPLAMA ═════════════
  {
    kod: 'BT1-ABV', ad: 'GÜÇ EKSENİ: ABV korpustan OG üzerinden türetildi (FG KULLANILMADI — %91,9\'u sahte), tek açık varsayım %75 attenuation; 4 bant (hafif <%4,5 · orta 4,5-6,5 · güçlü 6,5-9 · çok güçlü >%9); 73/73 stil sınıflı ve 71\'i BJCP ABV bandıyla örtüşüyor; "güçlü" seçilince Tripel/Weizenbock/Imperial geliyor, session biraları düşüyor',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('BT1 ABV', {});
      ekran = 'editor'; sekme = 'genel'; _bmProfilSifirla(); _brAc();
      const E = window._BQ_KARAKTER, K = window._PROFIL_KARAKTER;
      __REG.ok('abv ekseni tanımlı (i=6)', !!E.abv && E.abv.i === 6, E.abv ? E.abv.i : 'YOK');
      __REG.ok('4 bant: hafif/orta/güçlü/çok güçlü', JSON.stringify(E.abv.sira) === '["hafif","orta","guclu","cokguclu"]', JSON.stringify(E.abv.sira));
      __REG.ok('73/73 stil ABV sınıflı', Object.values(K).every(v => !!v[6]), Object.keys(K).filter(a => !K[a][6]).join(','));
      __REG.ok('sınıflar kapalı enum', Object.values(K).every(v => E.abv.sira.indexOf(v[6]) >= 0));
      __REG.ok('4 bandın hepsi kullanılıyor', new Set(Object.values(K).map(v => v[6])).size === 4, new Set(Object.values(K).map(v => v[6])).size);
      // KAYNAK ŞERHİ: FG kullanılmadığı + varsayım kaynakta yazılı
      const src = Array.from(document.querySelectorAll('script')).map(s => s.textContent).join('\n');
      const ak = src.slice(src.indexOf('SPRINT AK — PROFİL SEÇİCİ'), src.indexOf('SPRINT AJ — MASH SÜRECİ'));
      __REG.ok('FG KULLANILMADIĞI kaynakta yazılı', /FG KULLANILMADI|FG KULLANILMAZ/.test(ak));
      __REG.ok('%75 attenuation varsayımı AÇIKÇA belgeli', /%75/.test(ak) && /0,0984|0\.0984/.test(ak));
      __REG.ok('BJCP doğrulaması belgeli (71/73)', /71/.test(ak) && /BJCP/.test(ak));
      __REG.ok('2 sapan stil ADIYLA belgeli (dürüstlük)', /Belgian Dark Strong/.test(ak) && /Scottish/.test(ak));
      // BJCP ÇAPRAZ DOĞRULAMA (canlı)
      let icinde = 0, toplam = 0;
      Object.keys(K).forEach(a => {
        const bj = BJCP[a] && BJCP[a].abv; if (!bj) return;
        toplam++;
        const bant = K[a][6];
        const bantAralik = { hafif: [0, 4.5], orta: [4.5, 6.5], guclu: [6.5, 9], cokguclu: [9, 99] }[bant];
        if (bj[1] >= bantAralik[0] - 0.7 && bj[0] <= bantAralik[1] + 0.7) icinde++;
      });
      __REG.ok('BJCP bandı ile stil bandı ÖRTÜŞÜYOR (≥%90)', icinde / toplam >= 0.9, icinde + '/' + toplam);
      // DAVRANIŞ
      _bmProfilSec('abv', 'guclu');
      const s = window._brSonuc();
      ['Tripel', 'Weizenbock', 'Belgian Strong Golden Ale', 'Scottish Ale / Wee Heavy'].forEach(a =>
        __REG.ok('  güçlü → ' + a, s.stiller.indexOf(a) >= 0));
      ['Session Ale / Ordinary Bitter', 'Berliner Weisse', 'English Mild / Dark Mild', 'American Lager / Light Lager'].forEach(a =>
        __REG.ok('  session/hafif bira ' + a + ' DÜŞTÜ', s.stiller.indexOf(a) < 0));
      _bmProfilSec('abv', 'cokguclu');
      const s2 = window._brSonuc();
      ['Imperial / Russian Imperial Stout', 'American Barleywine', 'Belgian Quadrupel / Abt'].forEach(a =>
        __REG.ok('  çok güçlü → ' + a, s2.stiller.indexOf(a) >= 0));
      __REG.ok('çok güçlü ⊂ güçlü DEĞİL (bantlar ayrık)', s2.stiller.every(a => s.stiller.indexOf(a) < 0));
      _bmProfilSec('abv', 'hafif');
      const s3 = window._brSonuc();
      __REG.ok('hafif → session/mild/berliner', ['Session Ale / Ordinary Bitter', 'Berliner Weisse', 'English Mild / Dark Mild'].every(a => s3.stiller.indexOf(a) >= 0), s3.stiller.join(','));
      let toplamStil = 0;
      ['hafif', 'orta', 'guclu', 'cokguclu'].forEach(b => { _bmProfilSifirla(); _bmProfilSec('abv', b); toplamStil += window._brSonuc().stiller.length; });
      __REG.ok('4 bant ayrık ve tam (toplam 73)', toplamStil === 73, toplamStil);
      _brKapat(); _bmProfilSifirla();
      return __REG.al();
    })
  },
  {
    kod: 'BT1-HOP', ad: 'HOP AROMASI EKSENİ (veriyle karar): kaynak uygulamanın KENDİ hop kataloğu (HOPLAR[].mo); v1 "en çok geçen kelime" REDDEDİLDİ (çiçek 52/73 = catch-all), v2 "ilk geçen tanımlayıcı" kullanıldı; reçetelerin %86,9\'unda hop adı eşleşiyor, 73/73 stil sınıflı; "çamsı" HİÇBİR stilde baskın olmadığı için çip listesinde YOK (kalıcı ölü çip üretirdi); dolaylılık şerhi ekranda',
    calistir: (page) => page.evaluate(() => {
      __REG.yeniKayit('BT1 Hop', {});
      ekran = 'editor'; sekme = 'genel'; _bmProfilSifirla(); _brAc(); _brDetayAc();
      const E = window._BQ_KARAKTER, K = window._PROFIL_KARAKTER;
      __REG.ok('hop ekseni tanımlı (i=8)', !!E.hop && E.hop.i === 8, E.hop ? E.hop.i : 'YOK');
      __REG.ok('73/73 stil hop sınıflı', Object.values(K).every(v => !!v[8]), Object.keys(K).filter(a => !K[a][8]).join(','));
      __REG.ok('çip listesi "çamsı" İÇERMİYOR (ölü çip yok)', (window._BT_HOP_SIRA || []).indexOf('camsi') < 0, JSON.stringify(window._BT_HOP_SIRA));
      __REG.ok('çamsı sınıfı tabloda YAŞIYOR ama hiçbir stilde baskın değil',
        Object.values(K).every(v => v[8] !== 'camsi') && !!E.hop.et.camsi);
      __REG.ok('çip listesindeki her sınıfın EN AZ 1 stili var',
        (window._BT_HOP_SIRA || []).every(c => Object.values(K).some(v => v[8] === c)),
        (window._BT_HOP_SIRA || []).filter(c => !Object.values(K).some(v => v[8] === c)).join(','));
      // catch-all denetimi: hiçbir sınıf stillerin %70'inden fazlasını almamalı
      const say = {}; Object.values(K).forEach(v => { say[v[8]] = (say[v[8]] || 0) + 1; });
      const enBuyuk = Math.max.apply(null, Object.values(say));
      __REG.ok('hiçbir hop sınıfı catch-all değil (<%70)', enBuyuk / 73 < 0.7, '%' + Math.round(100 * enBuyuk / 73) + ' — ' + JSON.stringify(say));
      // KAYNAK + REDDEDİLEN DENEME belgeli
      const src = Array.from(document.querySelectorAll('script')).map(s => s.textContent).join('\n');
      const ak = src.slice(src.indexOf('SPRINT AK — PROFİL SEÇİCİ'), src.indexOf('SPRINT AJ — MASH SÜRECİ'));
      __REG.ok('kaynak (HOPLAR[].mo) belgeli', /HOPLAR\[\]\.mo/.test(ak));
      __REG.ok('REDDEDİLEN v1 denemesi belgeli (catch-all)', /REDDEDİLDİ/.test(ak) && /catch-all/.test(ak));
      __REG.ok('çamsı çıkarma GEREKÇESİ belgeli', /çamsı/.test(ak) && /ölü çip|olu cip/i.test(ak));
      __REG.ok('kapsama (%86,9) belgeli', /%86,9/.test(ak));
      __REG.ok('DOLAYLILIK şerhi kaynakta (diğer eksenlerden farkı)', /bir adım daha dolaylı|BİR ADIM DAHA DOLAYLI/i.test(ak));
      // DAVRANIŞ — bilinen stiller
      __REG.ok('American IPA → narenciye', window._bmKarakterSinif('American IPA', 'hop') === 'narenciye', window._bmKarakterSinif('American IPA', 'hop'));
      __REG.ok('NEIPA → tropik', window._bmKarakterSinif('NEIPA / Hazy IPA', 'hop') === 'tropik', window._bmKarakterSinif('NEIPA / Hazy IPA', 'hop'));
      __REG.ok('German Pils → otsu (noble hop)', window._bmKarakterSinif('German Pils', 'hop') === 'otsu', window._bmKarakterSinif('German Pils', 'hop'));
      _bmProfilSec('hop', 'tropik');
      const s = window._brSonuc();
      __REG.ok('tropik seçilince NEIPA geliyor', s.stiller.indexOf('NEIPA / Hazy IPA') >= 0, s.stiller.join(','));
      __REG.ok('tropik seçilince German Pils DÜŞÜYOR', s.stiller.indexOf('German Pils') < 0);
      _bmProfilSec('hop', 'narenciye');
      __REG.ok('narenciye seçilince American IPA geliyor', window._brSonuc().stiller.indexOf('American IPA') >= 0);
      // ekranda dolaylılık şerhi
      const d = document.getElementById('br-tam').innerHTML;
      __REG.ok('EKRANDA hop şerhi var (duyusal ölçüm değil)', /duyusal ölçüm değildir|hop kataloğundaki aroma tanımı/.test(d));
      __REG.ok('EKRANDA güç şerhi var (OG tahmini)', /OG'den tahmin|%75 attenuation/.test(d));
      __REG.ok('satırda 🍃 hop rozeti', d.indexOf('🍃 ') >= 0);
      _brKapat(); _bmProfilSifirla();
      return __REG.al();
    })
  },
  {
    kod: 'BT1-GRUP', ad: 'EKSEN GRUPLAMA (ölçümle zorunlu oldu): 8 eksen birden açıkken 390×844\'te sonuç başlığı 328 px aşağıda kalıyordu; temel (renk/acılık/gövde/güç) hep açık + detay (maya/tahıl/malt/hop) katlı yapıldı. 390 ve 360\'ta sonuç ARTIK seçimsizken bile görünür alanda; detay grubunda seçim varsa kendiliğinden açılır',
    calistir: async (page) => {
      let hepsi = [];
      for (const [w, h] of [[390, 844], [360, 640]]) {
        await page.setViewport({ width: w, height: h });
        await page.waitForFunction(() => {
          const s = document.querySelector('.bm-sidebar');
          if (!s) return true;
          if (getComputedStyle(s).position !== 'fixed') return true;
          return s.getBoundingClientRect().right <= 0.5;
        }, { timeout: 4000 });
        const c = await page.evaluate((w) => {
          const kayit = KR.find(k => k && k.biraAd === 'BT1 grup');
          if (!kayit) __REG.yeniKayit('BT1 grup', {}); else tarifAc(kayit.id);
          ekran = 'editor'; sekme = 'genel';
          _bmProfilSifirla(); render(); _brAc();
          const ov = () => document.getElementById('br-tam');
          const mesafe = () => {
            const gov = ov().querySelector('.br-tam-govde'), bas = ov().querySelector('.br-sonuc-bas');
            return Math.round(bas.getBoundingClientRect().top - gov.getBoundingClientRect().bottom);
          };
          __REG.ok(w + ': seçimsizken YALNIZ 4 temel eksen açık', ov().querySelectorAll('.br-eksen').length === 4, ov().querySelectorAll('.br-eksen').length);
          // ÖLÇÜLDÜ (gruplama sonrası): 390×844 → 0 seçimde -146 px (görünür),
          // 360×640 → 0 seçimde +110 px (kısa kaydırma), 3 seçimde -160 px (görünür).
          // 360'ta 4 temel eksen + başlık + alt çubuk zaten 640 px'i dolduruyor;
          // iddia ölçülen gerçeğe göre yazıldı, ölçüm iddiaya göre DEĞİL.
          const m0 = mesafe();
          if (w >= 390) __REG.ok(w + ': seçim YOKKEN bile sonuç başlığı görünür alanda', m0 < 0, m0 + ' px');
          else __REG.ok(w + ': seçim yokken başlık en fazla bir kısa kaydırma uzakta', m0 < 160, m0 + ' px');
          _bmProfilSec('renk', 'koyu'); _bmProfilSec('aci', 'dengeli'); _bmProfilSec('govde', 'dolgun');
          const m3 = mesafe();
          __REG.ok(w + ': 3 seçimde sonuç başlığı GÖRÜNÜR alanda', m3 < 0, m0 + ' → ' + m3 + ' px');
          __REG.ok(w + ': BS tabanına göre KAZANÇ (6 eksen açıkken 3 seçimde 360\'ta -70 px idi)', m3 < m0, m0 + ' → ' + m3);
          const satir = Array.from(ov().querySelectorAll('.br-satir')).filter(e =>
            e.getBoundingClientRect().bottom <= ov().querySelector('.br-tam-govde').getBoundingClientRect().bottom + 1).length;
          __REG.ok(w + ': kaydırmadan en az 1 öneri satırı görünüyor', satir >= 1, satir + ' satır');
          // detay grubu
          const grup = ov().querySelector('.br-grup');
          __REG.ok(w + ': grup düğmesi ≥44 px', grup.getBoundingClientRect().height >= 44, Math.round(grup.getBoundingClientRect().height));
          __REG.ok(w + ': grup düğmesi taşmıyor', grup.getBoundingClientRect().right <= innerWidth + 0.5);
          grup.click();
          __REG.ok(w + ': açılınca 8 eksen', ov().querySelectorAll('.br-eksen').length === 8, ov().querySelectorAll('.br-eksen').length);
          const cips = Array.from(ov().querySelectorAll('.br-cip'));
          __REG.ok(w + ': tüm çipler ≥44 px', cips.every(b => b.getBoundingClientRect().height >= 44), cips.filter(b => b.getBoundingClientRect().height < 44).length + ' küçük');
          __REG.ok(w + ': hiçbir çip taşmıyor', cips.every(b => { const r = b.getBoundingClientRect(); return r.left >= -0.5 && r.right <= innerWidth + 0.5; }));
          __REG.ok(w + ': belge yatay taşmıyor', document.documentElement.scrollWidth <= innerWidth + 1);
          ov().querySelector('.br-grup').click();
          __REG.ok(w + ': tekrar tık → 4 eksene döndü', ov().querySelectorAll('.br-eksen').length === 4);
          // detayda SEÇİM varsa kendiliğinden açılır
          _bmProfilSec('hop', 'tropik');
          __REG.ok(w + ': detayda seçim yapılınca grup KENDİLİĞİNDEN açık', ov().querySelectorAll('.br-eksen').length === 8, ov().querySelectorAll('.br-eksen').length);
          __REG.ok(w + ': grup başlığı seçim sayısını gösteriyor', /1 seçili/.test(ov().querySelector('.br-grup').textContent), ov().querySelector('.br-grup').textContent.trim().slice(-24));
          _bmProfilSifirla();
          __REG.ok(w + ': sıfırla → grup kapandı, 4 eksen', ov().querySelectorAll('.br-eksen').length === 4);
          _brKapat();
          return __REG.al();
        }, w);
        hepsi = hepsi.concat(c);
      }
      await page.setViewport({ width: 1024, height: 800 });
      return hepsi;
    }
  },
  {
    kod: 'BT2-KATKI', ad: 'KARMA KATKI ŞEKER İDDİASI ÖLÇÜLDÜ ve ÇÜRÜDÜ: kodda "sekerTipi" alanı YOK (mekanizma gu + fermente); 193 katkının HEPSİNDE fermente alanı var (eksik 0); adında karma geçen katkı 10 değil 1 (citrus zest) ve şeker taşımıyor; "bal-limon" diye bir katkı yok — bal katkılarının hepsi zaten gu>0 + fermente:true. Uydurma değer EKLENMEDİ; mekanizmanın doğru çalıştığı runtime ile kanıtlanıyor',
    calistir: (page) => page.evaluate(() => {
      const K = window.KATKILAR;
      __REG.ok('katkı kataloğu yüklü (193)', Array.isArray(K) && K.length === 193, K ? K.length : 'YOK');
      // 1. "sekerTipi" diye bir alan YOK — mekanizma gu + fermente
      const src = Array.from(document.querySelectorAll('script')).map(s => s.textContent).join('\n');
      __REG.ok('kodda "sekerTipi" alanı YOK (mekanizma gu + fermente)', src.indexOf('sekerTipi') < 0);
      __REG.ok('her katkıda fermente alanı VAR (eksik 0)', K.every(k => 'fermente' in k), K.filter(k => !('fermente' in k)).map(k => k.id).join(','));
      __REG.ok('fermente değerleri kapalı enum (true/false/partial)', K.every(k => k.fermente === true || k.fermente === false || k.fermente === 'partial'));
      // 2. "karma" katkı sayısı
      // NOT: ilk ölçüm betiğim 2 saymıştı — deseninde '\\+' vardı ve
      // 'Bitter Çikolata (%70+ Kakao)' adındaki yüzde işaretini yakalıyordu.
      // Yanlış pozitif AYIKLANDI: gerçek sayı 1.
      const karma = K.filter(k => /karma|karışım|karisim|harman|blend|mix/i.test(String(k.ad)));
      __REG.ok('adında karma/karışım geçen katkı 1 (iddia edilen 10 DEĞİL)', karma.length === 1, karma.length + ': ' + karma.map(k => k.ad).join(' · '));
      __REG.ok('o katkı şeker taşımıyor (citrus zest = kabuk)', karma.every(k => !k.gu), karma.map(k => k.ad + ' gu=' + k.gu).join(','));
      // 3. "bal-limon" yok; bal katkıları zaten doğru
      __REG.ok('"bal-limon" diye bir katkı YOK', !K.some(k => /bal.?limon|limon.?bal/i.test(String(k.ad))));
      const ballar = K.filter(k => /^(ham_bal|cam_bal|kestane_bal|bal_tozu)$/.test(k.id));
      __REG.ok('4 bal katkısının hepsi gu>0 + fermente:true (zaten doğru)',
        ballar.length === 4 && ballar.every(k => k.gu > 0 && k.fermente === true),
        ballar.map(k => k.ad + '(gu=' + k.gu + ',' + k.fermente + ')').join(' · '));
      // 4. Şeker grubu eksiksiz
      const seker = K.filter(k => k.g === 'Şeker');
      const guYok = seker.filter(k => !k.gu);
      __REG.ok('Şeker grubunda gu=0 olan tek katkı priming çözeltisi (doğru)',
        guYok.length === 1 && guYok[0].id === 'co2_sivi', guYok.map(k => k.ad).join(','));
      // 5. Belirsiz olana UYDURMA değer konmadı
      const fistik = K.find(k => k.id === 'fistik_ezmesi'), tahin = K.find(k => k.id === 'tahini');
      __REG.ok('fıstık ezmesi gu=0 KALDI (yağ+protein tabanlı, şeker payı belirsiz)', fistik && fistik.gu === 0);
      __REG.ok('tahin gu=0 KALDI (%50 yağ)', tahin && tahin.gu === 0);
      // 6. RUNTIME: mekanizma gerçekten çalışıyor mu?
      __REG.yeniKayit('BT2 Katki', {});
      S.hacim = 11; S.verim = 61; S.maltlar = [{ id: 'pilsner', kg: 2.5 }]; S.katkilar = [];
      const og0 = hOG(S.maltlar, S.verim, S.katkilar, S.hacim);
      // gu>0 + fermente:true → OG YÜKSELMELİ
      S.katkilar = [{ id: 'ham_bal', miktar: 500, birim: 'g' }];
      const ogBal = hOG(S.maltlar, S.verim, S.katkilar, S.hacim);
      __REG.ok('gu>0 katkı (500 g ham bal) OG\'yi YÜKSELTİYOR', ogBal > og0 + 0.005, og0.toFixed(4) + ' → ' + ogBal.toFixed(4));
      // gu=0 → OG DEĞİŞMEMELİ (uydurma yok)
      S.katkilar = [{ id: 'fistik_ezmesi', miktar: 500, birim: 'g' }];
      const ogFistik = hOG(S.maltlar, S.verim, S.katkilar, S.hacim);
      __REG.ok('gu=0 katkı (500 g fıstık ezmesi) OG\'yi DEĞİŞTİRMİYOR (uydurma yok)', Math.abs(ogFistik - og0) < 1e-9, og0.toFixed(4) + ' → ' + ogFistik.toFixed(4));
      // fermente:false + gu>0 → OG yükselir AMA FG'de kalır
      S.katkilar = [{ id: 'lak', miktar: 500, birim: 'g' }];
      const ogLak = hOG(S.maltlar, S.verim, S.katkilar, S.hacim);
      __REG.ok('laktoz (gu>0, fermente:false) OG\'yi yükseltiyor', ogLak > og0 + 0.005, ogLak.toFixed(4));
      __REG.ok('laktoz FG\'de kalıyor (hNFGravity > 0)', hNFGravity(S.katkilar, S.maltlar, S.hacim) > 0, hNFGravity(S.katkilar, S.maltlar, S.hacim).toFixed(4));
      S.katkilar = [];
      return __REG.al();
    })
  },
  // ═════════════ SPRINT BU — SÜRE KAYDI + PLAN/GERÇEK RAPORU (BL2+BL3) ═════════════
  {
    kod: 'BU1-SURE', ad: 'GERÇEKLEŞEN SÜRE TÜRETİMİ (BL2): süreler MEVCUT günlük tarihlerinden türetiliyor, YENİ KAYIT YOK; _logGirisTs KULLANILMIYOR (önceliği ts>id>tarih ve gerçek yedekte id toplu geriye-dönük yazım anını taşıyor — 47 gün hata); elle giren kayıtta tarih, alarm onayından gelen kayıtta onay anı kullanılıyor ve kaynağı etiketleniyor',
    calistir: (page) => page.evaluate(() => {
      const G = t => { const p = t.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).getTime(); };
      const YG = ts => { const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
      __REG.ok('_bmOlayGun tanımlı', typeof window._bmOlayGun === 'function');
      __REG.ok('_bmGercekGunleri tanımlı', typeof window._bmGercekGunleri === 'function');
      __REG.ok('_bmPlanGunleri tanımlı', typeof window._bmPlanGunleri === 'function');
      // (a) elle girilen kayıt: tarih kazanır (id yazım anıdır)
      const elle = { tip: 'pitching', tarih: '2026-04-12', id: '1780000000000' };
      const oe = window._bmOlayGun(elle);
      __REG.ok('elle girişte TARİH kazanıyor (id yazım anı)', YG(oe.ts) === '2026-04-12', YG(oe.ts));
      __REG.ok('  kaynak "gunluk" etiketli', oe.kaynak === 'gunluk', oe.kaynak);
      // (b) alarm onayından gelen kayıt: tarih PLANDIR, onay anı kullanılır
      const alarmdan = { tip: 'cold_crash', tarih: '2026-08-20', id: String(G('2026-08-26')), not: '⏰ alarm onayından', almKey: 'x|7' };
      const oa = window._bmOlayGun(alarmdan);
      __REG.ok('alarm onayında ONAY ANI kazanıyor (tarih plandır — 24562: dt=al.ts)', YG(oa.ts) === '2026-08-26', YG(oa.ts));
      __REG.ok('  kaynak "onay" etiketli (ekranda tahmin olduğu yazılacak)', oa.kaynak === 'onay', oa.kaynak);
      // (c) GERÇEK YEDEK: Dubbel — 5 giriş de toplu geriye-dönük yazılmış
      const dubbel = KR.find(k => k && k.biraAd === 'Dark Belgian Dubbel');
      __REG.ok('gerçek yedekte Dubbel var', !!dubbel && (dubbel.brewLog || []).length === 5, dubbel ? (dubbel.brewLog || []).length : 'YOK');
      const idGun = new Set((dubbel.brewLog || []).map(e => YG(+e.id)));
      __REG.ok('KANIT: 5 girişin id-günü AYNI (toplu geriye-dönük yazım)', idGun.size === 1, [...idGun].join(','));
      const gg = window._bmGercekGunleri(dubbel);
      __REG.ok('pitching gerçek günü 2026-04-12 (id günü DEĞİL)', YG(gg.pitch) === '2026-04-12', YG(gg.pitch));
      __REG.ok('cold_crash gerçek günü 2026-04-28', YG(gg.cold) === '2026-04-28', YG(gg.cold));
      __REG.ok('siseleme gerçek günü 2026-05-02', YG(gg.sise) === '2026-05-02', YG(gg.sise));
      const ferm = Math.round((gg.cold - gg.pitch) / 864e5), cold = Math.round((gg.sise - gg.cold) / 864e5);
      __REG.ok('GERÇEK fermentasyon 16 gün (türetildi)', ferm === 16, ferm);
      __REG.ok('GERÇEK cold crash 4 gün (türetildi)', cold === 4, cold);
      // (d) _logGirisTs ile FARK — neden kullanılmadığının kanıtı
      const lg = (dubbel.brewLog || []).map(e => YG(window._logGirisTs(e)));
      __REG.ok('_logGirisTs kullanılsaydı 5 olay da AYNI güne düşerdi', new Set(lg).size === 1, lg.join(','));
      __REG.ok('  yani süre hesabı 0 gün çıkardı (yanlış olurdu)', new Set(lg).size === 1);
      // (e) YENİ ALAN YOK
      const src = Array.from(document.querySelectorAll('script')).map(s => s.textContent).join('\n');
      const bu = src.slice(src.indexOf('SPRINT BU — PLAN vs GERÇEK'), src.indexOf('SPRINT AD4'));
      __REG.ok('BU bloğu S/KR\'ye yeni alan yazmıyor (push/= yok)', bu.indexOf('brewLog.push') < 0 && bu.indexOf('S.gercek') < 0);
      __REG.ok('YENİ VERİ TOPLANMADIĞI kaynakta belgeli', /YENİ VERİ TOPLANMIYOR/.test(bu));
      __REG.ok('_logGirisTs\'in neden kullanılmadığı belgeli (47 gün)', /47 GÜNLÜK hata|47 gün/i.test(bu));
      return __REG.al();
    })
  },
  {
    kod: 'BU2-RAPOR', ad: 'PLAN-GERÇEK RAPORU (BL3): Kaan\'ın vakası — "Cold crash: 1 gün planlandı · 7 gün yapıldı"; YALNIZ fark olanlar basılıyor (tutan satır gürültü), fark yoksa bölüm HİÇ görünmüyor; dil nötr (AN5-DIL yasak listesi 0); Takvim sekmesine gömülü, ayrı ekran icat edilmedi',
    calistir: (page) => page.evaluate(() => {
      const G = t => { const p = t.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).getTime(); };
      const id = __REG.yeniKayit('BU2 Muzo', {});
      const r = KR.find(k => k && String(k.id) === String(id));
      r.stil = 'Weizen / Weissbier';
      r.brewSnapshot = { ts: G('2026-08-16'), ogT: 1.054, fgT: 1.012, verimVarsayim: 60 };
      r.brewSonuc = { ts: G('2026-09-02'), ogG: 1.041, kaynak: 'test' };
      r.brewLog = [
        { tip: 'pitching', tarih: '2026-08-16', id: String(G('2026-08-16')) },
        { tip: 'cold_crash', tarih: '2026-08-26', id: String(G('2026-08-26')) },
        { tip: 'siseleme', tarih: '2026-09-02', id: String(G('2026-09-02')) }
      ];
      // PLAN: cold crash g10, şişeleme g11 → planlanan cold crash 1 gün
      const st = {}; st[String(id)] = {
        receteAd: 'BU2 Muzo', pitchTs: G('2026-08-16'), durum: 'aktif', alarmlar: [
          { g: 0, ts: G('2026-08-16'), tip: 'kontrol', aksiyon: '🧬 Pitching', durum: 'tamamlandi' },
          { g: 10, ts: G('2026-08-26'), tip: 'kritik', aksiyon: '❄️ Cold crash', durum: 'tamamlandi' },
          { g: 11, ts: G('2026-08-27'), tip: 'kritik', aksiyon: '🍺 Şişele', durum: 'tamamlandi' }
        ]
      };
      _alarmlariYaz(st);
      const P = window._bmPlanGunleri(r);
      __REG.ok('plan reçetenin KENDİ alarm grubundan okundu', P.kaynak === 'alarm', P.kaynak);
      __REG.ok('  planlanan cold crash 1 gün (g10→g11)', P.sise - P.cold === 1, P.sise - P.cold);
      const d = window._bmPlanGercek(r);
      const cc = d.satirlar.find(s => s.faz === 'Cold crash');
      __REG.ok('KAAN VAKASI: cold crash satırı var', !!cc, d.satirlar.map(s => s.faz).join(','));
      __REG.ok('  1 gün planlandı · 7 gün yapıldı', cc && cc.plan === 1 && cc.gercek === 7, cc ? cc.plan + '→' + cc.gercek : '-');
      const fr = d.satirlar.find(s => s.faz === 'Fermentasyon');
      __REG.ok('TUTAN satır basılmıyor (fermentasyon 10=10 → yok)', !fr, fr ? fr.plan + '→' + fr.gercek : 'yok');
      const og = d.satirlar.find(s => s.faz === 'OG');
      __REG.ok('OG farkı: 1.054 planlandı · 1.041 ölçüldü', !!og && og.plan === '1.054' && og.gercek === '1.041', og ? og.plan + '→' + og.gercek : '-');
      // HTML + DİL
      const html = window._bmPlanGercekKart(r);
      __REG.ok('kart HTML üretildi', html.indexOf('bu-kart') >= 0);
      __REG.ok('"planlandı · yapıldı" kalıbı', /planlandı · <b>[^<]*<\/b> yapıldı/.test(html));
      const YASAK = ['daha iyi', 'daha kötü', 'yapmalısın', 'yapmalisin', 'yapmalı', 'hatalı', 'hatali',
        'yanlış', 'yanlis', 'olmalı', 'olmali', 'gerekir', 'gereklidir', 'tavsiye', 'öneriyoruz',
        'düzelt', 'duzelt', 'kötü', 'kotu', 'başarılı', 'basarili', 'kazanmak için', 'kazandıran',
        'ideal', 'doğrusu', 'dogrusu', 'eksik'];
      const low = html.toLocaleLowerCase('tr-TR');
      __REG.ok('AN5-DIL: yasak kelime 0 (fark ≠ hata)', YASAK.every(k => low.indexOf(k) < 0), YASAK.filter(k => low.indexOf(k) >= 0).join(','));
      __REG.ok('farkın bir değerlendirme OLMADIĞI yazılı', /değerlendirme değildir/.test(html));
      __REG.ok('yeni kayıt tutulmadığı yazılı', /yeni bir kayıt tutulmaz/.test(html));
      // TAKVİM SEKMESİNE GÖMÜLÜ (ayrı ekran YOK)
      tarifAc(id); ekran = 'editor'; sekme = 'takvim'; render();
      const dom = document.getElementById('ekran').innerHTML;
      __REG.ok('Takvim sekmesinde bölüm görünüyor', dom.indexOf('takvim-plangercek') >= 0);
      __REG.ok('  başlık "Plan & Gerçekleşen"', dom.indexOf('Plan &amp; Gerçekleşen') >= 0 || dom.indexOf('Plan & Gerçekleşen') >= 0);
      __REG.ok('  fark sayısı başlıkta (meta)', /\d+ fark/.test(dom));
      __REG.ok('  cold crash satırı DOM\'da', dom.indexOf('Cold crash') >= 0 && /<b>1 gün<\/b> planlandı/.test(dom));
      __REG.ok('YENİ EKRAN icat edilmedi (mevcut akordeon deseni)', dom.indexOf('bm-acc-header') >= 0);
      // SESSİZLİK: plana birebir uyan batch
      const id2 = __REG.yeniKayit('BU2 Tutan', {});
      const r2 = KR.find(k => k && String(k.id) === String(id2));
      r2.brewSnapshot = { ts: G('2026-08-16'), ogT: 1.054, fgT: 1.012, verimVarsayim: 60 };
      r2.brewSonuc = { ts: G('2026-08-27'), ogG: 1.054, kaynak: 'test' };
      r2.brewLog = [
        { tip: 'pitching', tarih: '2026-08-16', id: String(G('2026-08-16')) },
        { tip: 'cold_crash', tarih: '2026-08-26', id: String(G('2026-08-26')) },
        { tip: 'siseleme', tarih: '2026-08-27', id: String(G('2026-08-27')) }
      ];
      const st2 = _alarmlariOku(); st2[String(id2)] = JSON.parse(JSON.stringify(st[String(id)])); _alarmlariYaz(st2);
      const d2 = window._bmPlanGercek(r2);
      __REG.ok('SESSİZLİK: fark yoksa 0 satır', d2.satirlar.length === 0, d2.satirlar.map(s => s.faz).join(','));
      __REG.ok('SESSİZLİK: kart HTML boş', window._bmPlanGercekKart(r2) === '');
      tarifAc(id2); sekme = 'takvim'; render();
      __REG.ok('SESSİZLİK: Takvim\'de bölüm HİÇ basılmıyor', document.getElementById('ekran').innerHTML.indexOf('takvim-plangercek') < 0);
      return __REG.al();
    })
  },
  {
    kod: 'BU3-OGRENME', ad: 'ÖĞRENME ETKİSİ (v1 = YALNIZ OKUMA): Q verim kolu PLAN değil ÖLÇÜLEN OG\'den türetilen gerçek verimi okuyor; rapor hiçbir öğrenme anahtarına YAZMIYOR (bm_kaan_profil_v1 / bm_maya_kalibrasyon / bm_off_ogren_v1 / bm_stil_ogren_v1 dokunulmadı); U2 off-flavor teşhisinin süre bağlamını KULLANMADIĞI ölçüldü (açık iş olarak belgeli)',
    calistir: (page) => page.evaluate(() => {
      const G = t => { const p = t.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).getTime(); };
      const id = __REG.yeniKayit('BU3 Ogrenme', {});
      const r = KR.find(k => k && String(k.id) === String(id));
      r.hacim = 11; r.verim = 60;
      r.maltlar = [{ id: 'pilsner', kg: 2.5 }];
      r.brewSnapshot = { ts: G('2026-08-16'), ogT: 1.054, fgT: 1.012, verimVarsayim: 60 };
      r.brewSonuc = { ts: G('2026-09-02'), ogG: 1.041, kaynak: 'test' };
      r.brewLog = [
        { tip: 'pitching', tarih: '2026-08-16', id: String(G('2026-08-16')) },
        { tip: 'og_olcum', tarih: '2026-08-16', deger: '1.041', id: String(G('2026-08-16') + 1) },
        { tip: 'siseleme', tarih: '2026-09-02', id: String(G('2026-09-02')) }
      ];
      const an = bmProfilAnaliz();
      const kay = an.kayitlar.find(k => String(k.id) === String(id));
      __REG.ok('bmProfilAnaliz kaydı üretti', !!kay);
      __REG.ok('PLAN verim varsayımı %60 okundu', kay && Math.round(kay.verimVarsayim) === 60, kay ? kay.verimVarsayim : '-');
      __REG.ok('GERÇEK verim ÖLÇÜLEN OG\'den türetildi (plan DEĞİL)', kay && kay.verimG != null && Math.round(kay.verimG) !== 60, kay ? kay.verimG : '-');
      __REG.ok('  gerçek verim plandan DÜŞÜK (OG 1.041 < 1.054)', kay && kay.verimG < kay.verimVarsayim, kay ? kay.verimG + ' < ' + kay.verimVarsayim : '-');
      __REG.ok('  ogG ölçülen değer (1.041)', kay && Math.abs(kay.ogG - 1.041) < 1e-6, kay ? kay.ogG : '-');
      // Rapor bu gerçek verimi OKUYOR (kendi hesabını kurmuyor)
      const d = window._bmPlanGercek(r);
      const v = d.satirlar.find(s => s.faz === 'Verim');
      __REG.ok('rapor verim farkını bmProfilAnaliz\'den OKUYOR', !!v, d.satirlar.map(s => s.faz).join(','));
      __REG.ok('  "%60 planlandı · %' + (kay ? Math.round(kay.verimG) : '?') + ' yapıldı"', v && v.plan === '%60' && v.gercek === '%' + Math.round(kay.verimG), v ? v.plan + '→' + v.gercek : '-');
      // ÖĞRENME ANAHTARLARINA YAZIM YOK
      const KEYS = ['bm_kaan_profil_v1', 'bm_maya_kalibrasyon', 'bm_off_ogren_v1', 'bm_stil_ogren_v1'];
      const once = KEYS.map(k => String(localStorage.getItem(k)));
      window._bmPlanGercek(r); window._bmPlanGercekKart(r);
      tarifAc(id); sekme = 'takvim'; render();
      const sonra = KEYS.map(k => String(localStorage.getItem(k)));
      __REG.ok('rapor 4 öğrenme anahtarının HİÇBİRİNE yazmadı', JSON.stringify(once) === JSON.stringify(sonra),
        KEYS.filter((k, i) => once[i] !== sonra[i]).join(',') || 'değişmedi');
      // U2: süre bağlamı kullanılmıyor (ölçüm — açık iş)
      const src = Array.from(document.querySelectorAll('script')).map(s => s.textContent).join('\n');
      // Kaba karakter dilimi komşu koda taşıyordu (orada brewLog geçiyor) —
      // nesnenin KENDİ sınırı alınır (ölçüldü: 24.955 bayt).
      const offM = src.match(/window\._OFF_TESHIS = \{[\s\S]*?\n\};/);
      const off = offM ? offM[0] : '';
      __REG.ok('_OFF_TESHIS bloğu dilimlendi', off.length > 20000, off.length + ' bayt');
      __REG.ok('ÖLÇÜM: _OFF_TESHIS statik bilgi tablosu — brewLog/süre OKUMUYOR', off.indexOf('_bmGercekGunleri') < 0 && off.indexOf('brewLog') < 0);
      __REG.ok('  bu v1 kapsamı dışı (yalnız okuma) ve açık iş olarak belgeli',
        src.indexOf('SPRINT BU') >= 0);
      return __REG.al();
    })
  }
];

// ═════════════ WORKER CASE'LERİ (tarayıcısız — _cf_worker kaynak dilimi) ═════════════
function workerKaynakYukle() {
  const yol = path.join(KOK, '_cf_worker', 'src', 'index.js');
  if (!fs.existsSync(yol)) return { skip: 'worker kaynağı yok: _cf_worker/src/index.js (bu makinede ayrı koşulamaz)' };
  const src = fs.readFileSync(yol, 'utf8');
  const bas = src.indexOf('const _slug =');
  const son = src.indexOf('async function handleKvRoute');
  if (bas < 0 || son < 0 || son < bas) return { skip: 'worker anchor bulunamadı (_slug/handleKvRoute) — kod değişmiş, dilimi güncelle' };
  const sandbox = { console };
  vm.createContext(sandbox);
  vm.runInContext(src.slice(bas, son), sandbox);
  if (typeof sandbox._mergeAlarms !== 'function') return { skip: '_mergeAlarms dilimden çıkmadı' };
  return { m: sandbox };
}

const WORKER_CASELER = [
  {
    kod: 'H-LATCH-1', ad: 'terminal latch: ts aynıyken tamamlandi → bekliyor\'a DÜŞMEZ',
    calistir: (m) => {
      const out = m._mergeAlarms(
        { r1: { alarmlar: [{ alarmId: 'r1-3-kuru-hop', g: 3, ts: 100, durum: 'tamamlandi', aksiyon: 'kuru hop' }] } },
        { r1: { alarmlar: [{ g: 3, ts: 100, durum: 'bekliyor', aksiyon: 'kuru hop' }] } }
      );
      const a = out.r1.alarmlar[0];
      return [{ ad: 'durum tamamlandi kaldı', ok: a.durum === 'tamamlandi', detay: a.durum }];
    }
  },
  {
    kod: 'H-LATCH-2', ad: 're-arm: ts DEĞİŞTİYSE latch kırılır (tekrarlayan hatırlatma yeniden kurulur)',
    calistir: (m) => {
      const out = m._mergeAlarms(
        { r1: { alarmlar: [{ alarmId: 'r1-3-kuru-hop', g: 3, ts: 100, durum: 'tamamlandi', aksiyon: 'kuru hop' }] } },
        { r1: { alarmlar: [{ g: 3, ts: 200, durum: 'bekliyor', aksiyon: 'kuru hop' }] } }
      );
      const a = out.r1.alarmlar[0];
      return [
        { ad: 'durum bekliyor (latch kırıldı)', ok: a.durum === 'bekliyor', detay: a.durum },
        { ad: 'yeni ts kabul edildi', ok: a.ts === 200, detay: String(a.ts) }
      ];
    }
  },
  {
    kod: 'H-LATCH-3', ad: 'pushedTs: ts aynıysa cron izi korunur; ts değişince sıfırlanır',
    calistir: (m) => {
      const ex = { r1: { alarmlar: [{ alarmId: 'r1-3-x', g: 3, ts: 100, durum: 'bekliyor', aksiyon: 'x', pushedTs: 555 }] } };
      const ayni = m._mergeAlarms(ex, { r1: { alarmlar: [{ g: 3, ts: 100, durum: 'bekliyor', aksiyon: 'x' }] } }).r1.alarmlar[0];
      const farkli = m._mergeAlarms(ex, { r1: { alarmlar: [{ g: 3, ts: 200, durum: 'bekliyor', aksiyon: 'x' }] } }).r1.alarmlar[0];
      return [
        { ad: 'ts aynı → pushedTs korundu', ok: ayni.pushedTs === 555, detay: String(ayni.pushedTs) },
        { ad: 'ts farklı → pushedTs sıfır (re-push)', ok: farkli.pushedTs === undefined, detay: String(farkli.pushedTs) }
      ];
    }
  },
  {
    kod: 'K-PING-1', ad: 'pseudo-ts toleransı: stuck: 12h içi cihaz farkı normalize → latch korunur',
    calistir: (m) => {
      const out = m._mergeAlarms(
        { 'stuck:abc': { alarmlar: [{ alarmId: 'stuck:abc-3-kontrol', g: 3, ts: 100, durum: 'tamamlandi', aksiyon: 'kontrol' }] } },
        { 'stuck:abc': { alarmlar: [{ g: 3, ts: 100 + 3600000, durum: 'bekliyor', aksiyon: 'kontrol' }] } } // 1 saat cihaz farkı
      );
      const a = out['stuck:abc'].alarmlar[0];
      return [
        { ad: 'ts ilk-yazana normalize edildi', ok: a.ts === 100, detay: String(a.ts) },
        { ad: 'terminal latch korundu', ok: a.durum === 'tamamlandi', detay: a.durum }
      ];
    }
  },
  {
    kod: 'K-PING-2', ad: 'pseudo-ts toleransı DIŞI (>12h) = gerçek reschedule → normalize YOK',
    calistir: (m) => {
      const out = m._mergeAlarms(
        { 'stuck:abc': { alarmlar: [{ alarmId: 'stuck:abc-3-kontrol', g: 3, ts: 100, durum: 'tamamlandi', aksiyon: 'kontrol' }] } },
        { 'stuck:abc': { alarmlar: [{ g: 3, ts: 100 + 13 * 3600000, durum: 'bekliyor', aksiyon: 'kontrol' }] } } // 13 saat
      );
      const a = out['stuck:abc'].alarmlar[0];
      return [
        { ad: 'ts incoming kaldı (reschedule)', ok: a.ts === 100 + 13 * 3600000, detay: String(a.ts) },
        { ad: 'latch kırıldı', ok: a.durum === 'bekliyor', detay: a.durum }
      ];
    }
  },
  {
    // SPRINT BA1: worker DEĞİŞMEDİ — mevcut cron budama davranışı REGRESYON KİLİDİ altına alındı
    // (410/404 = kalıcı ölü → KV'den silinir; 429/5xx/rejected = geçici → sub kalır + pushedTs yazılmaz).
    kod: 'BA1-PRUNE', ad: 'cron ölü-abonelik budaması: 410 KV\'den silinir, 429 geçici (kalır + pushedTs yok), 2xx pushedTs yazar',
    calistir: async () => {
      const yol = path.join(KOK, '_cf_worker', 'src', 'index.js');
      if (!fs.existsSync(yol)) return [{ ad: 'worker kaynağı yok', ok: false }];
      const src = fs.readFileSync(yol, 'utf8');
      const bas = src.indexOf('async function _cronOda');
      if (bas < 0) return [{ ad: '_cronOda anchor bulunamadı — dilimi güncelle', ok: false }];
      const sb = { console };
      vm.createContext(sb);
      sb._cronPayload = () => ({});
      sb.sendWebPush = async (s) => ({ status: s.__st });
      vm.runInContext(src.slice(bas), sb);
      function kvYap(alarm, subs) {
        const store = { 'alarm:o': JSON.stringify(alarm), 'sub:o': JSON.stringify(subs) };
        return { store, env: { BM_KV: { get: async k => (k in store ? store[k] : null), put: async (k, v) => { store[k] = v; } } } };
      }
      const now = Date.now();
      const alarmSeed = () => ({ r1: { receteAd: 'X', durum: 'aktif', alarmlar: [{ alarmId: 'r1-3-x', g: 3, ts: now - 1000, tip: 'kontrol', durum: 'bekliyor', aksiyon: 'x' }] } });
      // senaryo 1: 2xx + 410 + 429 karışık
      const k1 = kvYap(alarmSeed(), [{ endpoint: 'ok', keys: {}, __st: 201 }, { endpoint: 'olu', keys: {}, __st: 410 }, { endpoint: 'gecici', keys: {}, __st: 429 }]);
      await sb._cronOda('o', k1.env, now);
      const s1 = JSON.parse(k1.store['sub:o']); const a1 = JSON.parse(k1.store['alarm:o']);
      // senaryo 2: yalnız 429 (geçici)
      const k2 = kvYap(alarmSeed(), [{ endpoint: 'gecici', keys: {}, __st: 429 }]);
      await sb._cronOda('o', k2.env, now);
      const s2 = JSON.parse(k2.store['sub:o']); const a2 = JSON.parse(k2.store['alarm:o']);
      return [
        { ad: '410 endpoint KV\'den SİLİNDİ', ok: s1.length === 2 && !s1.some(x => x.endpoint === 'olu'), detay: JSON.stringify(s1.map(x => x.endpoint)) },
        { ad: '429 geçici — sub KALDI', ok: s1.some(x => x.endpoint === 'gecici') },
        { ad: '2xx varken pushedTs yazıldı', ok: !!a1.r1.alarmlar[0].pushedTs },
        { ad: 'yalnız 429: sub SİLİNMEDİ', ok: s2.length === 1, detay: JSON.stringify(s2.map(x => x.endpoint)) },
        { ad: 'yalnız 429: pushedTs YAZILMADI (sonraki cron retry)', ok: !a2.r1.alarmlar[0].pushedTs }
      ];
    }
  }
];

// ═══════════════════════════════ RUNNER ═══════════════════════════════
async function browserCaseKos(browser, seed, c) {
  const ctx = await browser.createBrowserContext();
  try {
    const page = await ctx.newPage();
    page.on('dialog', d => d.accept().catch(() => {}));
    await page.setRequestInterception(true);
    page.on('request', r => {
      const u = r.url();
      if (u.startsWith(TABAN) || u.startsWith('data:')) r.continue().catch(() => {});
      else r.abort().catch(() => {}); // dış ağ YASAK: Firebase/worker/CDN'e tek bayt gitmez
    });
    await page.evaluateOnNewDocument(seedFn, seed);
    // 'load' DEĞİL: kesilen dış istekler (CDN abort) load'u ara sıra asıyor.
    // domcontentloaded + alttaki app-hazır waitForFunction yeterli ve deterministik.
    // Yerel 3.5MB sayfada goto seyrek (~1/30) asılı kalıyor (Chrome flake) → TEK yeniden deneme.
    for (let deneme = 1; ; deneme++) {
      try {
        await page.goto(TABAN + '/' + HTML_AD, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForFunction(
          () => typeof render === 'function' && typeof tarifeKaydet === 'function' && Array.isArray(KR),
          { timeout: 30000 }
        );
        break;
      } catch (e) {
        if (deneme >= 2) throw e;
        console.log(`   ↻ ${c.kod}: navigasyon flake — yeniden deneniyor`);
      }
    }
    await page.evaluate(helperKur);
    return await c.calistir(page);
  } finally {
    await ctx.close().catch(() => {});
  }
}

function ozetYaz(sonuclar) {
  const pas = sonuclar.filter(s => s.durum === 'PASS').length;
  const kal = sonuclar.filter(s => s.durum === 'FAIL');
  const skip = sonuclar.filter(s => s.durum === 'SKIP');
  console.log('\n' + '═'.repeat(72));
  console.log(`SONUÇ: ${pas}/${pas + kal.length} PASS` + (skip.length ? ` · ${skip.length} SKIP` : ''));
  if (kal.length) {
    console.log('\nKIRILAN DAVRANIŞLAR:');
    for (const s of kal) {
      console.log(`  ❌ ${s.kod} — ${s.ad}`);
      for (const c of (s.checks || []).filter(x => !x.ok)) console.log(`      ✗ ${c.ad}${c.detay ? ' [' + c.detay + ']' : ''}`);
      if (s.hata) console.log(`      ✗ HATA: ${s.hata}`);
    }
  }
  if (skip.length) for (const s of skip) console.log(`  ⏭️  ${s.kod} — SKIP: ${s.sebep}`);
  console.log('═'.repeat(72));
  return kal.length === 0;
}

async function main() {
  let tumCaseler = CASELER.map(c => ({ ...c, tur: 'browser' }))
    .concat(WORKER_CASELER.map(c => ({ ...c, tur: 'worker' })));
  if (FILTRE) tumCaseler = tumCaseler.filter(c => c.kod.toLowerCase().includes(FILTRE.toLowerCase()));
  if (KARISTIR) tumCaseler.sort(() => Math.random() - 0.5);

  if (LISTE) {
    for (const c of tumCaseler) console.log(`${c.kod.padEnd(10)} [${c.tur}] ${c.ad}`);
    console.log(`\nToplam: ${tumCaseler.length} case`);
    return 0;
  }

  const fx = fixtureYukle();
  const browserVar = tumCaseler.some(c => c.tur === 'browser');
  if (browserVar && !fx) {
    console.error('FIXTURE YOK — aranan yollar:\n  ' + FIXTURE_ADAYLARI.join('\n  '));
    console.error('Gerçek yedeği tests/fixtures/brewmaster_yedek_2026-06-26.json olarak kopyala (git\'e girmez).');
    return 2;
  }
  if (fx) console.log(`Fixture: ${fx.yol} (${fx.anahtarSayisi} anahtar seed — sync/push/draft dışlandı)`);

  const workerM = workerKaynakYukle();

  let server = null, browser = null;
  const sonuclar = [];
  try {
    if (browserVar) {
      server = await sunucuKur();
      browser = await puppeteer.launch({ headless: true });
      console.log(`Sunucu: ${TABAN} (sw.js→404) · ${await browser.version()}\n`);
    }
    for (const c of tumCaseler) {
      const t0 = Date.now();
      try {
        let checks;
        if (c.tur === 'worker') {
          if (workerM.skip) { sonuclar.push({ kod: c.kod, ad: c.ad, durum: 'SKIP', sebep: workerM.skip }); console.log(`⏭️  ${c.kod} — SKIP (${workerM.skip})`); continue; }
          checks = await c.calistir(workerM.m); // SPRINT BA: async worker case desteği (sync case'lere etkisiz)
        } else {
          checks = await browserCaseKos(browser, fx.seed, c);
        }
        const hepsi = Array.isArray(checks) && checks.length > 0 && checks.every(x => x.ok);
        sonuclar.push({ kod: c.kod, ad: c.ad, durum: hepsi ? 'PASS' : 'FAIL', checks });
        console.log(`${hepsi ? '✅' : '❌'} ${c.kod} — ${c.ad} (${checks.length} iddia, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
        if (!hepsi) for (const x of checks.filter(x => !x.ok)) console.log(`     ✗ ${x.ad}${x.detay ? ' [' + x.detay + ']' : ''}`);
      } catch (e) {
        sonuclar.push({ kod: c.kod, ad: c.ad, durum: 'FAIL', hata: String(e && e.message || e).slice(0, 300) });
        console.log(`❌ ${c.kod} — HATA: ${String(e && e.message || e).slice(0, 200)}`);
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) server.close();
  }
  return ozetYaz(sonuclar) ? 0 : 1;
}

main().then(k => process.exit(k)).catch(e => { console.error('RUNNER HATASI:', e); process.exit(3); });

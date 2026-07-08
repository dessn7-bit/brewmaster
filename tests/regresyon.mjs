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
          checks = c.calistir(workerM.m);
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

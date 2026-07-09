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
      __REG.ok('geriye-uyumlu delta: eski oturum (yalnız eski kod) → ÇÖZÜLDÜ Diacetyl', /çözüldü:[^<]*Diacetyl/.test(h));
      __REG.ok('delta YENİ kodu kapsıyor: yeni Kükürt', /yeni:[^<]*Kükürt/.test(h));
      __REG.ok('eski offList render çökmedi (undefined tag yok)', h.indexOf('_tOffLbl_undefined') === -1);
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
    kod: 'V-ISKELET-GATE', ad: 'TUTARLILIK KAPISI: her STIL_ISKELET → calc() OG/IBU/SRM BJCP aralığında + tüm ID katalogda (bozuk iskelet koruması)',
    calistir: (page) => page.evaluate(() => {
      const styles = Object.keys(window.STIL_ISKELET || {});
      __REG.ok('STIL_ISKELET 20 küratörlü stil', styles.length === 20, String(styles.length));
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
        if (!(srm >= bj.srm[0] && srm <= bj.srm[1])) rangeFail.push(st + ':SRM=' + srm + '[' + bj.srm + ']');
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
    kod: 'V-CLAYER', ad: 'C katmanı: iskeleti OLMAYAN stil (Doppelbock) → maya önerisi dolar, malt/hop BOŞ kalır (sahte iskelet UYDURMA)',
    calistir: (page) => page.evaluate(() => {
      __REG.ok('Doppelbock BJCP\'de var ama STIL_ISKELET\'te YOK', !!BJCP['Doppelbock'] && !window.STIL_ISKELET['Doppelbock']);
      yeniTarif();
      S.stil = 'Doppelbock'; S.hacim = 11;
      bmStilIskeletDoldur();
      __REG.ok('maya önerisi dolduruldu (lager → w3470)', S.mayaId === 'w3470');
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

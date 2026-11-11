#!/usr/bin/env node
// SPRINT ND6 (3) — kararlar.json → uygulamaya gömülen MUADIL yaması (JS parçası, stdout).
//   node dis_kaynak/muadil_dogrulama_2026-11-11/yama_uret.mjs > parca.js
// Kural (gorevler/ND6.md madde 3): "karar" alanı geçerli (dogrulayici_karari DEĞİL).
//   ✅ doğru  → ✅ kalır + kaynak (url + alıntı)            kod 'o'
//   ⚠️ olmalı → ⚠️ + gerekçe + kaynak                      kod 'u'
//   ❌ yanlış → ❌ + gerekçe + kaynak                       kod 'x'
//   bulamadım → ⚠️ + eski metin + "(kaynak bulunamadı)"     kod 'b'
// Gerekçeden uygulamanın eski notunu anlatan cümleler (ekran metni değil, denetim notu) çıkarılır.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const D = path.dirname(fileURLToPath(import.meta.url));
const K = JSON.parse(fs.readFileSync(path.join(D, 'kararlar.json'), 'utf8'));
const KOD = { '✅ doğru': 'o', '⚠️ olmalı': 'u', '❌ yanlış': 'x', 'bulamadım': 'b' };
const temiz = g => String(g || '').split(/(?<=[.!?])\s+(?=[A-ZÇĞİÖŞÜ0-9'"“])/).filter(c => !/[Uu]ygulama(nın|daki| notu|nın kendi)|^Not: uygulama|^Uyarı: |talimat/.test(c)).join(' ').trim();
const out = {};
for (const k of K) {
  const kod = KOD[k.karar]; if (!kod) throw new Error('bilinmeyen karar: ' + k.karar);
  const ky = (k.kaynaklar || []).filter(x => x && x.url), k1 = ky[0] || null, k2 = ky.find(x => k1 && x.url !== k1.url) || null;
  const g = kod === 'o' || kod === 'b' ? '' : (temiz(k.gerekce) || String(k.gerekce || '').trim());
  let v = [kod, g, k1 ? [k1.url, k1.alinti || ''] : null, k2 ? [k2.url, k2.alinti || ''] : null];
  // karamela_arpa → c120: doğrulayıcı Hitit sayfasını bulamamıştı; Claude kararı ✅ (claude_notu). Kaynak listesi boş kaldığı için kaynak,
  // aynı sayfayı ve alıntıyı taşıyan crystal_dark → karamela_arpa kaydından alınır (hititmalt.com/karamela-arpa-malti1, «EBC 265-310»).
  if (kod === 'o' && !v[2]) { const HIT = 'hititmalt.com/karamela-arpa-malti1', es = K.find(z => (z.kaynaklar || []).some(x => x.url.indexOf(HIT) >= 0)), kx = es && es.kaynaklar.find(x => x.url.indexOf(HIT) >= 0); if (k.aranan_id === 'karamela_arpa' && k.yerine_id === 'c120' && kx) v[2] = [kx.url, kx.alinti]; else throw new Error('kaynaksız ✅: ' + k.aranan_id + '>' + k.yerine_id); }
  out[k.aranan_id + '>' + k.yerine_id] = v;
}
const say = {}; Object.values(out).forEach(v => { say[v[0]] = (say[v[0]] || 0) + 1; });
process.stderr.write('kayıt ' + Object.keys(out).length + ' · ' + JSON.stringify(say) + '\n');
process.stdout.write('const _ND6_MUADIL_KARAR = ' + JSON.stringify(out) + ';\n');

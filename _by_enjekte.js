// SPRINT BY — SW oto-güncelleme boşluğu: "bekleyen güncelleme" (BL mekanizmasına EK; yeniden yazım değil).
// BOŞLUK (yeniden üretildi, working/_by_sw_harness.mjs S3): yeni SW, kullanıcı editördeyken devralırsa BL kalkanı yenilemeyi
// erteleyip banner gösteriyordu. controllerchange BİR KEZ tetiklenir: banner kapatılır/gözden kaçarsa, sonraki resume'larda
// update() yeni bir şey bulmaz (yeni SW zaten aktif) → sayfa Android süreci yaşadıkça ESKİ HTML'de kalıyordu.
// ASSERT-ONCE; tek FAIL = yazım YOK.
'use strict';
const fs = require('fs');
const DOSYA = __dirname + '/Brewmaster_v2_79_10.html';
let html = fs.readFileSync(DOSYA, 'utf8');
const EOL = html.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
const L = (...s) => s.join(EOL);
const hata = [];
const say = (s, a) => s.split(a).length - 1;
function degis(ad, eski, yeni){ const n = say(html, eski); if (n !== 1) { hata.push(ad + ': çapa ' + n + ' kez'); return; } html = html.replace(eski, () => yeni); }
if (say(html, '_bekleyenGuncelleme') !== 0) hata.push('BY zaten uygulanmış');

degis('durum', "    var _reg = null, _sonKontrol = 0, _yenilendi = false;", L(
  "    var _reg = null, _sonKontrol = 0, _yenilendi = false;",
  "    // Sprint BY: yeni SW devraldı ama kalkan yüzünden yenilenemedi → sayfa ESKİ HTML'de. Güvenli ilk anda yenilenir.",
  "    var _bekleyenGuncelleme = false;"));

degis('bannerKapat', "      if (bk) bk.onclick = function(){ try{ d.remove(); }catch(_e){} };", L(
  "      if (bk) bk.onclick = function(){ try{ d.remove(); }catch(_e){} }; // BY: kapatmak güncellemeyi İPTAL ETMEZ — bekleyen kalır, sonraki dönüşte yeniden sorulur"));

degis('devralindiBanner', L(
  "        console.log('[BM SW] yeni surum hazir ama acik is/kalkan var — banner gosteriliyor');",
  "        _bannerGoster();"), L(
  "        console.log('[BM SW] yeni surum hazir ama acik is/kalkan var — banner gosteriliyor (bekleyen)');",
  "        _bekleyenGuncelleme = true;",
  "        _bannerGoster();"));

degis('bekleyenDene', "    navigator.serviceWorker.addEventListener('controllerchange', _devralindi);", L(
  "    navigator.serviceWorker.addEventListener('controllerchange', _devralindi);",
  "",
  "    // Sprint BY: BEKLEYEN güncellemeyi güvenli ilk anda uygula. Kalkanlar AYNEN (_guvenliMi + _stormOk): brewday/timer,",
  "    // açık dialog, odaklı giriş, açık editör → yenileme YOK. bannerTekrar: yalnız kullanıcı uygulamaya DÖNDÜĞÜNDE",
  "    // (resume/focus) banner yeniden gösterilir; periyodik kontrol banner'la rahatsız etmez.",
  "    function _bekleyeniDene(bannerTekrar){",
  "      if (!_bekleyenGuncelleme || _yenilendi) return;",
  "      if (_guvenliMi() && _stormOk()) {",
  "        _yenilendi = true; _stormIsaretle();",
  "        console.log('[BM SW] bekleyen surum — guvenli an, otomatik yenileniyor');",
  "        location.reload();",
  "      } else if (bannerTekrar) {",
  "        _bannerGoster();",
  "      }",
  "    }",
  "    setInterval(function(){ if (document.visibilityState === 'visible') _bekleyeniDene(false); }, 20000);"));

degis('resume', L(
  "    document.addEventListener('visibilitychange', function(){",
  "      if (document.visibilityState === 'visible') _kontrolEt();",
  "    });",
  "    window.addEventListener('focus', _kontrolEt);",
  "    window.addEventListener('pageshow', _kontrolEt);   // bfcache'ten geri donus"), L(
  "    document.addEventListener('visibilitychange', function(){",
  "      if (document.visibilityState === 'visible') { _kontrolEt(); _bekleyeniDene(true); }",
  "    });",
  "    window.addEventListener('focus', function(){ _kontrolEt(); _bekleyeniDene(true); });",
  "    window.addEventListener('pageshow', function(){ _kontrolEt(); _bekleyeniDene(true); });   // bfcache'ten geri donus",
  "    window._bmSwBekleyen = function(){ return _bekleyenGuncelleme; }; // tanı/test"));

if (hata.length) { console.error('[BY ENJEKTE ABORT] dosya YAZILMADI:\n  ' + hata.join('\n  ')); process.exit(1); }
fs.writeFileSync(DOSYA, html);
console.log('[BY ENJEKTE] tamam');

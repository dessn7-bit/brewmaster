# Brewmaster Regresyon Paketi (Sprint P)

**Amaç:** F→O sprint'lerinde düzeltilen kritik davranışların, her yeni sprint sonrasında
tek komutla yeniden doğrulanması. Bu paket **her köprü sprintinin kapanış kapısıdır**:
yeni özellik eskiyi kırdıysa burada kırmızı görünür.

## Koşum

```
node tests/regresyon.mjs               # tüm paket (baseline hep yeşil olmalı)
node tests/regresyon.mjs --case=F1     # kod filtreli (substring: F1 → F1a+F1b)
node tests/regresyon.mjs --liste       # case listesi (koşmadan)
node tests/regresyon.mjs --karistir    # rastgele sıra (izolasyon kanıtı)
npm test                               # aynı şey (package.json scripts.test)
```

Çıkış kodu: hepsi PASS → `0`; herhangi bir FAIL → `1` (gate olarak zincirlenebilir).
Süre: ~15-20 sn (19 case).

## Case envanteri (19)

| Kod | Sprint | Davranış |
|---|---|---|
| F1a | F | brewSonuc varlığı = tamamlanma kanıtı → aynı gün yeniden-demleme açılır; ölçümler sıfırlanır (görev-I1c dahil) |
| F1b | F | brewSonuc yoksa devam eden batch'in snapshot'ı üzerine YAZILMAZ |
| F2 | F | klon geçmişi sıfırlar (brewLog/snapshot/sonuc/ölçüm/tadım); planBrewHatirlatmalar bilinçli korunur |
| G1 | G | KR-otoriter commit: bayat S Kaydet'i donmuş alanları düşüremez + G3 S-geri-ayna |
| G2 | G | M8 graft K1 (çıplak kazanana üçlü aşı) + K2 pozitif/negatif (zombi engeli) |
| I1 | I | batch-pencere: `_batchSinir` sınırı + eski batch ölçümleri analize sızmaz |
| I2 | I | tek SG aralığı [0.990, 1.200] sınır dahil (`_sgNum`), 0.998 diastaticus regresyonu |
| SNAP | 362 | snapshot ogT/fgT = SAF tahmin (ogHesap/fgHesap); manuel override sızmaz (kod-I3) |
| M1 | M | stuck-ferment grubu brewday_end ile ÖLMEZ; şişeleme ile ölür |
| M2 | M | preboilOG aktif batch'te anında donar; batch bitince eski snapshot kilitli |
| M3 | M | bm_alarm_sentkeys_v1 import'ta taşınmaz + yereldeki temizlenir |
| N1 | N | `_draftKrAyniMi`: guncelleme-only=AYNI, duzeltmeTs/içerik=FARKLI |
| N2 | N | ghost-draft entegrasyon: sync damgası draft yazdırmaz, gerçek fark yazdırır |
| O1 | O | bm-hata-boot ilk script, boot temiz, uncaught hata ring buffer'a düşer, temizle çalışır |
| Q-ESIK | Q | n<2: kalibrasyon köprüsü kapalı, sıfır yeni UI, varsayılan %61 |
| Q-W25 | Q | n=2: w=0.25, kalibre=61·(1-w)+ort·w, gösterge görünür, onay-chip otomatik yazmaz |
| Q-CLAMP | Q | n=5: w=1.0 clamp, kalibre = gerçek ortalama |
| Q-BANT | Q | akıl bandı: |ort−61|>15 puan veya |fgSapma|>0.010 → uygulanmaz, uyarı gösterilir |
| Q-SEFFAF | Q | köprü aktifken motor ogHesap/sticky özet değişmez (override değil) |
| R-DH | R | dry hop ekle/çıkar onayı → dry_hop log+iz; faz göstergesi son-giriş not-bazlı (açık/kapalı) |
| R-CC-KATKI | R | cold crash/katkı/meşe onayı → doğru tip+iz; pasif "devam" logsuz; kapalı-reçete ky yolu |
| R-SISELE | R | şişele onayı litre'li ve boş — iki durumda da siseleme log + brewSonuc + profil 'tamam' (Q beslemesi) |
| R-PITCH | R | pitching onayı (confirm) → log + snapshot + durum=yapimda |
| R-OLCUM | R | FG/gravity onayı → otomatik log YOK; kısayol toast → takvim + fg_olcum formu |
| R-SUREC | R | sanitize/karbonasyon/içime-hazır/pasif/pseudo → log YOK, çökme yok |
| R-IDEM | R | çift onay + snooze re-arm (ts değişti) → almKey ile TEK log |
| H-LATCH-1..3 | H | worker `_mergeAlarms`: terminal latch (ts-eşit), re-arm (ts-fark), pushedTs koruma |
| K-PING-1..2 | K | worker pseudo-ts toleransı: 12h içi normalize (latch korunur) / dışı reschedule |

## Mimari ve garantiler

- **Gerçek dosya** test edilir (`Brewmaster_v2_79_10.html`) — kopya/test-HTML yok.
- **İzolasyon:** her case yeni tarayıcı context'i + temiz fixture seed'i alır; `--karistir`
  ile sıra bağımsızlığı kanıtlanabilir.
- **Güvenlik:** `bm_sync_v1`/`bm_push_sub` seed'lenmez ve 127.0.0.1 dışına TÜM ağ istekleri
  kesilir → test mutasyonları asla Firebase/worker'a ulaşamaz.
- **SW test dışı:** sunucu `sw.js`'e 404 döner (cache determinizmi; SW davranışı bu paketin
  kapsamında değil).
- **Worker case'leri tarayıcısız:** `_cf_worker/src/index.js` kaynağından `_slug…_mergeAlarms`
  dilimi node `vm`'de koşulur. Dosya yoksa veya anchor değiştiyse case'ler SKIP olur
  (FAIL değil) ve sebep yazılır.
- Navigasyonda tek yeniden-deneme vardır (yerel büyük sayfada seyrek Chrome flake'i);
  davranış iddiaları hiçbir zaman yeniden denenmez.

## Fixture politikası

- Dosya: `tests/fixtures/brewmaster_yedek_2026-06-26.json` — Kaan'ın **gerçek** uygulama
  yedeği. **Git'e girmez** (.gitignore: `tests/fixtures/`): kişisel veri + sync anahtarı içerir.
- Yoksa: gerçek bir yedeği (Ayarlar ▸ Veri ▸ Yedek dışa aktar) bu ada kopyala, veya
  `BM_FIXTURE=<yol>` ortam değişkeni ver. OneDrive Masaüstü'ndeki orijinal de fallback'tir.
- Seed'de şu anahtarlar bilinçli dışlanır: `bm_sync_v1`, `bm_sync_ts_v1`, `bm_push_sub`
  (bulut/cihaz kimliği), `bm_draft_v1` (boot determinizmi), `bm_alarm_sentkeys_v1`,
  `bm_hata_log_v1` (temiz başlangıç).

## Yeni sprint sonrası case ekleme kalıbı

1. Sprint'in düzelttiği davranışın **tersini** düşün: hangi çağrı hangi gözlemlenebilir
   sonucu vermeli? (fonksiyon + girdi + beklenen çıktı)
2. `CASELER` dizisine ekle:
   ```js
   { kod: 'X1', ad: 'kısa davranış cümlesi',
     calistir: (page) => page.evaluate(() => {
       const id = __REG.yeniKayit('REGTEST X1', { /* KR kaydına graft edilecek alanlar */ });
       // ... tetikle ...
       __REG.ok('iddia adı', koşul, 'teşhis detayı');
       return __REG.al();
     }) }
   ```
   - `__REG.yeniKayit(ad, ekstra)`: app akışıyla reçete kurar (yeniTarif→tarifeKaydet),
     ekstra alanları KR kaydına yazar, `tarifAc` ile editörde açar (S senkron döner).
   - `S`/`KR`/`_editId` sayfa içinde çıplak isimle erişilir (global lexical). `window.S`
     KULLANMA — `tarifAc` sonrası bayat kalır.
   - Dialog'lar (confirm/alert) runner'da otomatik kabul edilir.
   - Worker davranışı için `WORKER_CASELER`'e ekle (`m._mergeAlarms(...)` saf çağrı).
3. Tüm paketi koş: yeni case dahil **hepsi yeşil** olmadan sprint kapanmaz.
4. Beklenti değişikliği (davranış bilinçli değiştiyse) commit mesajında gerekçelendirilir.

## Kapsam boşlukları (bilinçli — ŞÜPHE listesi)

- **Cihaz/push gerektirenler:** gerçek push bildirimi, Notification izni, PWA install,
  SW cache güncelleme akışı (KURAL 12.x) — bu pakette yok, canlı cihaz testi ister.
- **Worker'ın KV/R2 tarafı:** `_mergeAlarms` birim düzeyde test edilir; gerçek KV
  round-trip (kv-peek/kv-push uçları, X-BM-Auth) ayrı koşulur (`wrangler dev` + curl).
- **Firebase sync E2E:** graft birim düzeyde (G2); gerçek iki-cihaz LWW senaryosu değil.
- **UI/görsel regresyon:** renk motoru, token/kontrast, ekran düzeni — kapsam dışı.
- **Brewday tam UI akışı:** brewdayBaslat/brewdayTamamla DOM+timer ağırlıklı; davranış
  çekirdeği (snapshot/sonuc/stuck) fonksiyon düzeyinde kapsanıyor.

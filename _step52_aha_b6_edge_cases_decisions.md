# Adım 52 B-6 — Edge Case Kararları (Kaan A onayı)

**Tarih:** 2026-04-28
**Karar:** A — Code önerisi onaylandı
**Sonuç:** 4 KABUL, 13 REJECT

---

## KABUL (4 reçete — V16 dataset'e dahil)

| # | Reçete | AHA Style | V15 Slug | Sebep |
|---:|---|---|---|---|
| 4 | Rose's Russian Imperial Stout | Stout | stout | FG=1.047 yüksek ama RIS gerçekçi (RIS yüksek FG mümkün) |
| 5 | Bellanio Farms | UK/US Strong Ale | american_barleywine | ABV=15.09% Barleywine üst sınırı, gerçek extreme |
| 6 | The King of Eisbocks! | Eisbock | german_doppelbock | OG=1.174, FG=1.045, ABV=16% — Eisbock konsantrasyon gerçek |
| 17 | Dogfish Head 120 Minute IPA | IPA | american_india_pale_ale | OG=1.192, ABV=21% — dünyaca ünlü extreme IPA, gerçek |

## REJECT (13 reçete — DROP)

| # | Reçete | Sebep |
|---:|---|---|
| 1 | Maibock | V15 fingerprint duplicate |
| 2 | Orpheo Roja (Chimay Red) | OG/FG parse hatası |
| 3 | Sticke Alt | OG/FG parse hatası |
| 7 | Isaac's Standard Lager | FG=1.1 parse hatası |
| 8 | Drop Bear APA | OG=1.013 + ABV=5.5% mantıksız |
| 9 | POG IPA | FG=2.9 parse hatası |
| 10 | La Brea Brown | OG/FG parse hatası |
| 11 | R.K. Double IPA | FG=1.104 parse hatası |
| 12 | Anchor Old Foghorn | FG=1.1 parse hatası |
| 13 | Leicht | ABV=85% absurd parse hatası |
| 14 | Piwo Jopejskie | OG/FG mantıksız |
| 15 | (512) Pecan Porter | OG=16.5 parse hatası |
| 16 | A Kveiking We Will Go IPA | FG=2.6 parse hatası |

## Sebep özeti
- **11/13 reject = parse hatası** (AHA recipe page'inde "1.045" yerine "10.45" misparse, regex parse_gravity üst değer için zayıf)
- 1/13 = duplicate (V15'te zaten var)
- 1/13 = mantıksız OG-ABV ilişkisi

## Final accepted: **1136 / 1485** (1132 PASS+WARN+FAIL recover + 4 outlier kabul)

## Adım 56+ scope notu
Parser regex `parse_gravity` 1.5'tan büyük değerleri reddetmeli (gerçek OG max 1.150). 13 reçete drop yerine doğru fix mümkün ama scope dışı, V17+ retrain'de düzeltilebilir.

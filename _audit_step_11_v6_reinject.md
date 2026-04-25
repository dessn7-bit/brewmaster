# Adım 11 — V6 motor re-inject (Adım C-D-E)

## Komutlar

```
# Adım C — yeni script
Write _inject_v6_final_v2.js (yorum satırından başlayan adapter regex'leri)

# Adım D — temiz inject + parse-guard + smoke + LOO
cp BACKUP_PRE_V6_FINAL.html Brewmaster_v2_79_10.html
node _inject_v6_final_v2.js
node _parse_guard.js
node _smoke_test_v6.js
node _loo_test_v6.js

# Adım E — commit + push
git add Brewmaster_v2_79_10.html
git commit -m "V6 motor re-inject ..."
git push origin main
```

## Inject çıktısı

```
- V3 motor blok silindi (39843 byte)
- V4 motor blok silindi (62233 byte)
- V7 motor blok silindi (128775 byte)
- V3 adapter (yorum + var + try/catch) silindi (1037 byte)   ← v1'de 910 byte (yorum kalmıştı)
- V4 adapter (yorum + var + try/catch) silindi (1079 byte)   ← v1'de 1037 byte
- V7 adapter (yorum + var + try/catch) silindi (915 byte)
+ V6 adapter eklendi (anchor "// Manuel stil seçimi varsa override" üzerine, 4852 byte)
- __top3V5_engine → __top3V6_engine rename: V5-orphan 11 adet → V6 toplam 14 adet
+ V6 motor inline enjekte edildi (V5 sonrası, 1651309 byte)

HTML before: 3740509 chars
HTML after:  5162792 chars
```

## Parse-guard çıktısı

```
Script #1 OK (468.8KB) <script id="bm-engine-v2c"
Script #2 OK (989.0KB) <script id="bm-engine-v5"
Script #3 OK (1612.6KB) <script id="bm-engine-v6-final"
Script #4 OK (1454.9KB) <script   ← ana app bloğu (eskiden patlıyordu)

Total scripts: 4, Errors: 0
```

**Önceki v1 (commit 9c45d15) ile karşılaştırma:**
- v1: Script #4 PARSE ERROR "Missing catch or finally after try" (line 12358 yetim try)
- v2: Script #4 OK ✅

## Smoke test (5 reçete, leakage var)

```
1. Dark Belgian Dubbel v1 → belgian_dubbel %100 ✓
2. Hill Farmstead Anna → french_belgian_saison %100 ✓
3. Dogfish Head Punkin Ale → pumpkin_spice_beer %71 ✓
4. Left Hand Milk Stout → sweet_stout %100 ✓
5. Tröegs Hopback Amber → american_amber_red_ale %77 ✓

5/5 top-1 doğru
```

## LOO test (5 reçete, training set 1100 → 1099)

```
Top-1: 4/5
Top-3: 5/5

1. Dark Belgian Dubbel v1: belgian_dubbel ✓ (en yakın 5 komşu hepsi belgian_dubbel)
2. Hill Farmstead Anna: french_belgian_saison ✓
3. Dogfish Head Punkin Ale: american_amber_red_ale ❌ (beklenen pumpkin_spice_beer top-2 %27.2)
4. Left Hand Milk Stout: sweet_stout ✓
5. Tröegs Hopback Amber: american_amber_red_ale ✓
```

LOO sonuçları Adım 6.5 ile birebir aynı — V6 motorunun davranışı değişmedi, sadece HTML enjeksiyonu doğru yapıldı.

## Commit

```
ae79ca9 V6 motor re-inject (V3+V4 adapter tam silindi, try/catch sınırlarına saygılı)
1 file changed, 424 insertions(+), 12594 deletions(-)
```

NOT: `424 insertions / 12594 deletions` — rollback'taki V7'li HTML'den (büyük) V6 final HTML'e (V7 silinmiş) geçiş; net byte HTML 3.74MB → 5.16MB ama git satır diff açısından V7 motor bloğu (~128KB inline) silinmesi nedeniyle deletion fazla.

## Push

```
To https://github.com/dessn7-bit/brewmaster.git
   422e586..ae79ca9  main -> main
```

## Durum: ✅

## Tek satır yorum

V6 motor re-inject başarılı; v1'in V3 adapter `try {` yetim bırakma bug'ı düzeltildi (regex'ler yorum satırından başlıyor), parse-guard 4/4 script bloğu OK doğruladı, smoke 5/5 + LOO 4/5+5/5 önceki sonuçlarla aynı, commit ae79ca9 push edildi.

---

## Push gitti, Netlify auto-deploy başladı. Opus deploy state'ini kontrol edecek.

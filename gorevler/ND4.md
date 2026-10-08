SPRINT ND4 (b901b14 uzerine) — "Yapabilirsin" tanimini gercege oturt + sepet onerisi + iki supheli muadil

Bu dosyada 4 numarali madde var. Ise baslamadan 4'unu de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

DURUM (ND3 raporundan): ✅ hala 2/991. Uc yapisal neden: (a) kaynakli ✅ muadil stokta olsa bile ornek 🟡'de kaliyor; (b) AHA orneklerinde (485) hop gramaji kaynakta yok, "miktar bilinmiyor" ornegi kalici 🟡 yapiyor; (c) eslenemeyen ek kalemler (irish moss, maya besini gibi proses yardimcilari dahil) ✅'yi engelliyor. Ayrica tek-malzeme onerisinde her aday yalniz +1 ornek aciyor.

1. DURUM TANIMI (ND1 madde 4'u bu tanimla degistir)
- ✅ YAPABILIRSIN: tum malt/hop/maya ve lezzet katkisi kalemleri ya stokta ya da stokta ✅ muadili var (yalniz kaynakli ✅ esdegerler; ⚠️ asla). Ek isaretler satirda gorunur ve durumu dusurmez:
  - "🔁 muadille": en az bir kalem ✅ muadille karsilaniyor (onizlemede hangi kalem -> hangi muadil).
  - "≈ miktar dogrulanmadi": kaynakta miktari olmayan kalem stokta VAR ama yeterliligi bilinemiyor.
- 🟡 NEREDEYSE: 1-2 kalem stokta yok, VEYA miktari bilinen bir kalemde stok yetersiz ("az var").
- 🔴 EKSIK: 3+ kalem yok.
- ❔ eslenemeyen malt/hop/maya ya da lezzet katkisi (kahve, meyve, baharat, kakao vb.) ✅'yi ENGELLER (bugunku gibi).
- Proses yardimcilari yapilabilirligi ETKILEMEZ: irish moss / whirlfloc / berraklastiricilar, maya besini, su tuzlari ve asitler (gypsum, CaCl2, Epsom, laktik/fosforik asit), Campden/metabisulfit, jelatin, pirinc kavuzu. Onizlemede "proses yardimcisi — yapilabilirligi etkilemez" diye ayri satirda gosterilir (stokta olup olmadigi yine yazilir). Liste kod icinde tek yerde, testli; KATKILAR kategorisinden turetilebiliyorsa oradan.
- Siralama: ✅ (isaretsiz) > ✅ isaretli > 🟡 > 🔴. "✅ Yapabilirim" filtresi tum ✅'leri (isaretliler dahil) gosterir.
- Not: "Bu ornegin malzemeleriyle olustur" kurali DEGISMEZ (miktari bilinmeyen kalem varsa acilmaz). Muadille ✅ olan ornekte bu dugme kullanilirsa muadil kalem recetede muadiliyle yazilir ve notta "X yerine stoktaki Y (✅ muadil)" diye belirtilir.

2. SEPET ONERISI (ND3 kartini genislet)
- Mevcut tek-malzeme listesi kalir. Altina "Sepet" bolumu: acgozlu birikimli secim — 1. malzeme en cok ornegi ✅ yapan, 2. malzeme 1. alindiktan SONRA en cok ek ornegi ✅ yapan, ... en fazla 5 adim. Her adimda birikimli toplam ("Briess 2-Row -> +X · + Cascade -> toplam Y").
- Yeni tanimla (madde 1) hesaplanir. O anki filtre/gorunume uyar.
- Satira dokununca o malzemeyle malzeme aramasi acilir (ND1 davranisi).
- Salt hesap: stoga ya da alisveris listesine yazmaz.

3. IKI SUPHELI ✅ MUADIL (ND3 raporu)
- "Maris Otter -> Abbey Malt" ve "Roasted Barley -> Carafa Special III" ND3'un olcutuyle (uretici veri sayfasi: renk, ekstrakt, kullanim; kavrulmus arpa maltlanmamis, Carafa Special kabuksuz maltlanmis) denetlensin. Desteklenmiyorsa ⚠️'e indir, kaynakli gerekce raporda.

4. DOGRULAMA
- npm test yesil; ND1/ND2/ND3 case'leri yeni tanima gore BILINCLI guncellenir (zayiflatilmaz). Yeni case'ler: ✅ muadille (isaret var, durum ✅), ⚠️ muadil ✅ yapmaz, miktar-bilinmeyen-ama-stokta -> ✅ + ≈ isareti, miktar-bilinen-yetersiz -> 🟡 "az var", proses yardimcisi eslenmese de ✅'yi engellemez, lezzet katkisi eslenmezse engeller, sepet birikimli sayilari (sentetik stokla elle hesaplanan beklentiyle esit), iki muadil satirinin yeni durumu. En az 2 case kasitli bozmayla kirmizi.
- Canli stok (Firebase SALT OKUMA): ✅ (isaretsiz / 🔁 / ≈ ayri) / 🟡 / 🔴 once/sonra, ✅ ilk 15 (isaretleriyle), sepetin 5 adimi ve birikimli sayilar, Coffee Stout ornekleri.
- 390 ve 360 ekran goruntusu: isaretli bir ✅ ornegin onizlemesi + sepet.
- Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. ornek_veri.js degisirse CC5 builder yolu.

RAPOR: yeni dagilim, ✅ ilk 15, sepet, proses yardimcisi listesi, iki muadilin hukmu (kaynakli), SUPHE (zorunlu).

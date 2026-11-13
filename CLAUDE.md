# Brewmaster Proje Notları

## Proje
Brewmaster, Türkçe bir ev üretimi (homebrewing) web uygulaması. Tek dosya: Brewmaster_v2_79_10.html (5,27 MB = 5.270.050 bayt, 43.922 satır, LF — ölçüldü 2026-11-13, v131-545; regresyon paketi Puppeteer, tarayıcı vakaları git dışı kişisel yedek fixture ister). PWA/APK olarak deploy ediliyor.

## ÇOK ÖNEMLİ - Kullanıcı Kuralı
Kaan kod bilmiyor. Tüm kod okuma, yazma, düzenleme, deploy işlerini Claude yapar. Kaan'a asla "şunu kopyala/yapıştır" veya "şu satırı düzenle" denmez. Kaan sadece ne istediğini söyler (bug adı, özellik), gerisini Claude halleder.

## Workflow Kuralları
1. ASLA dosyayı tam `view` etme (token yakar, ~43.400 satır)
2. grep/findstr ile hedefli oku
3. str_replace ile düzenle
4. Değişiklikten sonra syntax kontrol yap (node -c gibi)
5. Tamamlandığında deploy et
6. Claude yerel git repo'su üzerinde çalışır, GitHub ile git pull/push senkron. Brewmaster'ın yedeği = GitHub.

## İletişim
- Dil: Türkçe
- Kaan'a "kralım" deme
- Direkt, dürüst, fikirli ol
- Bilimsel ol, tutarsız olma

## M Backlog
M1-M10 UX iyileştirmeleri var ama detayı şu an belirsiz, Kaan hatırladıkça eklenecek.

## Güncel durum (2026-10-29) — AYRINTI ve GEÇMİŞ: gorevler/SPRINT_GECMISI.md
Bu bölüm kısa tutulur (CLAUDE.md ≤ 150 bin karakter). Sprint bitince buraya 1–3 satır durum, ayrıntı SPRINT_GECMISI.md'nin sonuna eklenir.

**Donmuş imzalar (değişirse yeniden dondurma + raporda yeni imza):** AI4 denetleyicisi 2c9ebd9f-32461 · CEV araştırma denetleyicisi 92f59a3c-5776 · CEV doğrulayıcısı 6d7e6c6e-35582 (CEV7, 2026-10-28). Set imzaları: tests/cev_seti.json 7befe7db · tests/cev_seti_heldout.json f3853086 · G seti 4615b7b9/3414 · tuzak cb74f605/11217.

**Kalıcı kurallar (AI işleri):**
- Repo PUBLIC: kişisel veri / anahtar / yedek commit edilmez; anahtar taraması sk-ant-[A-Za-z0-9_-]{20,} = 0 (testlerdeki eski sahte anahtarlar hariç). API anahtarı uygulamadan çıkmaz. Gerçek API harcaması YALNIZ Kaan uygulamada düğmeye basınca.
- CC tests/cev_seti_heldout.json ve tests/fixtures/*TAM_heldout_iceriyor* dosyalarını AÇMAZ. Set metinleri / imzalar / puanlama metinleri değişmez; beklenen listelerine göre ayar yok; görev metinlerine set örneği girmez (E2); paket güç / kurum sayısı taşımaz (E1).
- Her gerçek koşunun gösterilen + katlı + düşen + doğrudan cevap maddelerinin TAMAMI Claude tarafından etiketlenir (kör alt-etiketçiler + Claude kararı); puanlama koşudan ÖNCE yazılır (cev_seti EK 2: katı = (b+c+sınırda)/N, %95 tek yönlü Clopper–Pearson üst ≤ %5 VE kapsama ≥ %80 → kapı).
- Her HTML değişikliğinde sw.js CACHE_VERSION +1; canlı md5 = yerel doğrulanır.
- Model: özet / araştırma / BUL varsayılanı Opus 5.5 (Kaan kararı 2026-10-14); abonelik / API kredisi biterse _BM_AI4_OZET_MODEL 'ucuz' (Haiku 5.5). Kredi dönemi 13.10–14.11.2026, tavan 200 $ (Kaan 2026-10-15); harcanan ≈ 145 $ (koşu #9 sonrası, Claude toplamı; kalan ≈ 55 $).
- Gerçek koşu sürerken CC'ye sprint verilmez (yayın sayfayı yenileyebilir; CEV2E kalkanı var ama tek soru çağrıları kapsam dışı).

**Kapanan / geçen kapılar:** M (mash) 7/411 üst %3,2 · G (geliştir) 7/393 üst %3,3 — iki özellikte "erken test" kalktı. Soru çözücü (DOG4B–H) turları kapandı (7 held-out, son tur sessiz yok sayma 0).

**CEV araştırma modu (aktif iş):** koşu #2 → #9 katı üst %23,7 → %9,4 → %4,7 → %6,05 → %6,03 → %5,64 → %4,44 → **%2,40**; kapsama 119 → 120 → 116 → 127 → 128 → 132 → 129 → **127** /166 (koşu #9'dan itibaren iki kör kapsama yargıcıyla). Koşu #8 (2026-10-29, CEV8 + CEV8B, SW v131-539, 22,90 $): katı 16/543 üst %4,44 (katlı hariç 12/394 üst %4,89) → KATI GEÇTİ; kapsama 129/166 %77,7 → KAPI GEÇEMEDİ. Kaçan 37 güçlü etkenin 12'si katlı bölümde (kapsama turunun 109 yeni maddesinden yalnız 27'si gösterilene girdi: yeni maddeler özetin ardına eklenip güç → kurum → özet sırasıyla diziliyor), 4'ü düşen, 17'si cevapta yok, 4'ü H14 (özet alınamadı: cevozet maxTokens 2000, büyük olasılıkla kesik çıktı). Ayrıntı gorevler/SPRINT_GECMISI.md 1j3v. → **CEV9** (gorevler/CEV9.md, 5 madde: kapsama turuna `oncelik` + sirala; özet maxTokens 4000 + kesilme kaydı + 1 yeniden deneme; niteleyici çevirisi / 'ya da' değer bölme; mekanik tat / jargon yanlış alarmı) YAPILDI → CEV9 (SW v131-540, 2026-11-07; npm test 6 dilim 91/91 ×6, CEV 50/50): kapsama turuna (c) `oncelik` + C.sirala güç → öncelik → kurum → özet sırası; cevozet 2000 → 4000 + kesilme kaydı (R.ozetHata) + 1 yeniden deneme (Opus 12 000: taban 8000 olduğundan görevdeki 6000 yeniden deneme olmazdı — SAPMA, gerekçeli); kural (17) çeviri; '-e varan' üst sınır; 'ya da' değer bölme; mekanik tat / jargon ölçümü daraltıldı. Üç imza AYNI; koşu #8 ana kesiti CEV9 kapalı 22/22 birebir, açık yalnız C17#3 atfı değişti (byo yalnız 2–5 parçasına); tat 2 → 0, jargon 0 → 0; mock 55 d30af8de; soru başı tahmin 0,5547 → 0,5598 $ (VARSAYIM). CLAUDE NOTLARI: H14 kesilme nedeni ASKIDA (Opus tabanı 8000; "cevozet 2000 kesti" hipotezi geçersiz) · kural (17)(b) örneği çıkarıldı (held-out konusuna değiyordu) · C.TAT_OLCUM uygunluk yargılarını saymaya devam ediyor (Claude kararı, temkinli ölçüm). Ayrıntı gorevler/SPRINT_GECMISI.md 1j3w. CLAUDE CEV9 DOĞRULAMASI (2026-11-07, ae1858c): canlı md5 0159c786… = yerel, SW v131-540, üç imza aynı, eklenen satırlarda anahtar 0; koşu #8 TAM kaydı (ana + held-out, 42 soru, kapsama yolu dahil) CEV9 kapalı 42/42 birebir, açık yalnız C17#3; öncelik simülasyonu 40 soruda güçlü hiç alta düşmedi; yeniden deneme mock + Opus 12 000; yeni görev metinleri ↔ set + koşu #8 alıntıları 6 sözcük ortak dizi 0. Küçük not: İngilizce '50 percent' % sayılmıyor (eski; yanlış atıf değil, atıf kaybı). → **KOŞU #9** (2026-11-08, kosuId 1794169976706, SW v131-540, Opus 5.5, 55 soru, 23,21 $; Claude etiketi 2026-11-09): katı 7/544 üst %2,40 (katlı hariç 5/400 üst %2,61; değer atfı hatası 0) → KATI GEÇTİ; kapsama 127/166 %76,5 (ana 81/102 %79,4, held-out 46/64 %71,9; mekanik 126) → KAPI GEÇEMEDİ. Yöntem eki: iki kör kapsama yargıcı (A 95, B 96 / 134, birbirine 133/134); Claude'un ilk el sayımı 136'ydı, 9 etkende yargıçlar haklı çıktı (yönsüz 'etkiler', genel ↔ özel, yalnız bağlam) → 127. Kaçan 39: katlı 11 (gösterilen 254'ün 231'i öncelik listesinden — sıralama değil SEÇİM sorunu), düşen 4, üstte yönsüz/kısmi 6, cevapta yok 18 (alıntıda anahtar geçen 10, geçmeyen 8). H14 tamam (özet hatası 0). Güç hatası 2/30 (C16#f0, H03#2); (vii) 6. Fixture tests/fixtures/cev_kosu9_2026-11-08_* (ayrıntı gorevler/SPRINT_GECMISI.md 1j3z2). KAAN KARARI (2026-11-09): CEV10 koşusu ve TAZE held-out 2 BİR SONRAKİ kredi döneminde; bu dönem FB1 (gorevler/FB1.md) → KUCUK1 (gorevler/KUCUK1.md: CEV ekran kilidi, hata sınıfı, çağrı başı stop_reason/kullanım kaydı, BJCP dosyaları + atıf) — CC'ye sırayla; Claude bu arada kaçan 39 etkenin ayrıntılı incelemesi + CEV10 tasarımı. Malzeme asistanı (AI4) doğrulama turu düğmesi hâlâ BEKLİYOR. **ND6** (gorevler/ND6.md, Claude 2026-11-11; Kaan: "hep eksik, muadiller doğru mu"): ana düğme "✨ Yeni reçete" stoğa bakmıyor (26 Haziran stoğuyla 239 iskeletin 9'u eksiksiz), stoğa bakan "📦 İskeleti stoğumla" gömülü (62 tam, 48 stilde çalışmıyor); örnek rozeti tavanı tüm katalog stokta olsa 171/988 (817 örnekte ❔); MUADIL 503 ✅'nin 10'u kaynaklı, kör doğrulama 107 kayıtta ✅ 32 · ⚠️ 59 · ❌ 10 · bulamadım 6 (dis_kaynak/muadil_dogrulama_2026-11-11/). **ND7** (gorevler/ND7.md, ND6'dan sonra; Kaan: '988'in hepsi yapılabilir olsun'): tanıma — bugün malt+hop+maya tam tanınan 200/988, Stoğumla oluştur 156; okuyucu + sınıf kuralı + kaynaklı katalog eklemeleri (KAT-C/KAT-D) + tanınamayan satır engel olmasın. Kaan (2026-11-11): 'hepsini tanıyıp ayrıca muadillerle eşleştirmeli' → ND7 hedefi tanınmayan satır 0 (ürün ya da SINIF kalemi + her yazım için eşleme tablosu); **ND8** (gorevler/ND8.md): her katalog kaleminin kaynaklı muadil yolu ya da gerekçeli 'muadili yok'. ND6 YAPILDI (6d4b831, SW v131-541; CLAUDE DOĞRULADI 2026-11-11: canlı md5 24aa847b… = yerel, üç imza aynı, bayraklar açık; bayrak kapalı = eski birebir; açık: MUADIL ✅ 41/41 kaynaklı, 107/107 karar uygulandı, iskelet-stok plan 239/239, tam 74, örnek ✅1/🟡261/🔴694/❔32; sızıntı 0). Claude kararları: AI geri oynatmaları (AI2-TUZAK, AI4-ONKONTROL, AI5B-YON, DOG4-K4) bayrak kapalı donmuş kalır; **AI4 doğrulama turu bu hâliyle KOŞULAMAZ** (tuzak seti C grubunun beklentisi eski ✅ satırlarından; ND8 sonrası tuzak seti v5 + yeni imza, Claude yazar) · iskelet_veri.js ND7'de yeniden üretilir · (=KOD) köprüsü ⚠️ satıcı beyanı → **ND6B** (gorevler/ND6B.md). ND6B YAPILDI (8453ed9 + 824c9b5, SW v131-543; CLAUDE DOĞRULADI 2026-11-11: canlı md5 80358d6f… = yerel, üç imza aynı, bayrak kapalı = v540 birebir; açık: örnek 0/246/713/❔29, iskelet rozeti 🟨66 · 🟡az 23 · 🟡alınacak 133 · 🔴17, (=KOD) köprüsü ✅ sayılan 0 / ⚠️ 56; 360 px liste satırı sığıyor ama üst araç çubuğu etiketleri kesik; v543 değişikliği 4 satır, 88 ilgili test yeterli). Claude kararları: arama satırları + süzgeç 2 'alınacak + az ≤ 2' + üst araç çubuğu → ND7 0b · katalog eklemeleri ND7'den ayrıldı → **ND7K** (gorevler/ND7K.md) · tests/fixtures'ta git'te izlenen held-out içerikli 16 dosya: held-out 1 zaten bağımsız değil, KALIR; held-out 2 ve sonrası TAM dosyaları public repoya EKLENMEZ. ND7 YAPILDI (4642980, SW v131-544; CLAUDE DOĞRULADI 2026-11-12: canlı md5 b6cc42fe… = yerel, nd7_tanima tanınmayan 0 · malzemeli 985/988 birebir; Claude tam regresyon son kodla 579/581 — BUL1-KURU beklenti veri kaynaklı, DOG4F-COZUM zaman aşımı: ND7 _bmKatCoz'u KÜRESEL sarıyor, soru çözücü %14 yavaşladı (819 → 935 sn, uzun sınırla sonuç aynı), AI kalem bulucunun davranış değişimi ölçülmedi; kör eşleme denetimi 104: A33 · B20 · C8 · D0 · E10 · F2 · G18 · H3 · I6 · J3 · belirsiz 1 → okuyucu-marka 10/10 'aynı ürün değil'; 3 gerçek hop satırı 'artık'ta kayboluyor; Dingemans renk birimi şüphesi) → **ND7B** (gorevler/ND7B.md: fark işareti, kaybolan satırlar, maya karışımı, renk hataları, OG hesaplanamayan, ND7 katmanı yalnız örnek yollarında + AI yolları eski çözücü). ND7B YAPILDI (1102a0e, SW v131-545; CLAUDE DOĞRULADI 2026-11-13: canlı md5 2069e4c9… = yerel, üç imza aynı, A1 kalem bulucusu v543 ↔ ND7B fark 0 (Claude kendi koştu, 123 istem / 293 çağrı), örnek 🟡225 · 🔴744 · ❔19, stil rozeti 🟨68 · 🟡128 · az 26 · 🔴17, diff'te anahtar / Firebase / httpbin 0, fixture'a özgü ad 0; CC tam regresyon son kodla 605/605, DOG4F v543 ile eşit). ND7K ÖN ADIMLARI (Claude kararları Ö1–Ö9: çok üreticili kayıt istisnası, sözlük alias farkı, Great Western ayrı ürünler, 'fresh grated', Dingemans Cara 8/45 çift kayıt doğrulaması, AI4 ödüllü örnek listesi eski tanımayla, BUL1-KURU-ND7 kabul, ikinci maya maya2Id'ye, iskelet farklı eşlemeyi ürün seçmez) gorevler/ND7K.md başında. KAAN KARARI (2026-11-11 13:18): FB1 sonraya alındı → sıra ND6 → ND6B → ND7 → ND7B → ND7K → ND8 → KUCUK1 → FB1 (Kaan istediği an öne alınır; risk: eşitleme verisi kimliksiz okunabilir durumda kalıyor, yazma denenmedi). → **ND6 YAPILDI** (CC, 2026-11-11, SW v131-541; npm test 6 dilim 554/554, üç imza AYNI, mock 55 + d30af8de aynı): bayraklar BM_ND6 {ana, isk, muadil, maya, es, dil} (kapalıyken birebir eski); stil satırı ana düğme "📦 Stoğumla kur" + iskelet-stok rozeti (fixture stokla 239 stil: ✅ 3 · 🟨 83 · 🟡 129 · 🔴 24; plan 191 → 239, null 48 → 0, tam 62 → 74); MUADIL ✅ 503 → 41 (hepsi kaynak alanlı; yama çalışma anında, MUADIL_ESKI duruyor; 387 kayıt "(kaynak bekliyor)"); örnek rozeti ✅ 13 → 1 · 🔴 513 → 694 · ❔ ayrı durum 32; maya "A ya da B" VEYA (maya ❔ 414 → 374). CLAUDE KARARI BEKLEYENLER: (1) yeni tabloyla AI2-TUZAK kontrol 12/12 → 4/12, AI4-ONKONTROL, AI5B-YON, DOG4-K4 sonucu değişiyor (pakette bayraklar kapalı koşuyorlar; ND6_AI_YENI=1 ile görülür) · (2) iskelet_veri.js yeniden üretilmedi — yeni tabloyla 33 stilin mayası değişir / boşalır · (3) maya "(=KOD)" suş köprüsü tablo dışı, hâlâ ✅ · (4) BB Pamona adı / atenüasyonu değişmedi (ad stil motoruna giriyor) · (5) 360 px'te ilk satır kaydırmasız sığmıyor (390 geçiyor). Ayrıntı gorevler/SPRINT_GECMISI.md 1j3z8. → **ND6B YAPILDI** (CC, 2026-11-11, SW v131-542 → 543 (doğrulayıcı sonrası düzeltme); 570 test PASS, üç imza AYNI): maya "(=KOD)" köprüsü artık ⚠️ satıcı beyanı (stokta sayılmaz; plan bildirimi de etkilenir); rozet ✅ / 🟨 yalnız miktar yetiyorsa, yoksa "🟡 n kalem az"; alınacak yalnız reçeteye giren satırlar; ≤ 430 px sıkışık satır (360'ta ilk satır görünür; görüntüler C:\Users\Kaan\bm_yedek\nd6b_ekran\); 14 eski case'in bayraklar açık sürümü (<kod>-ND6) + ND6B-KOD / ND6B-ROZET. Fixture stokla stil rozeti ✅ 0 · 🟨 66 · 🟡 az 23 · 🟡 133 · 🔴 17; örnek ✅ 0. AÇIK: stil ARAMA sonuç satırları ND6 (1) dışında kaldı (düğme / süzgeç eski) — Claude kararı. Ayrıntı 1j3z10. → **ND7 YAPILDI** (CC, 2026-11-11, SW v131-544; 581 case, son koşu etkilenen 196/196, üç imza AYNI): `BM_ND7 {okuyucu, sinif, maya, tablo}` (kapalıyken tanıma birebir eski); 988 örnekte tanınmayan satır 2038 → 0 (ürün ya da SINIF kalemi ya da katalog_bekliyor), tam tanınan örnek 210 → 988, "Stoğumla oluştur" 170 → 985; gömülü eşleme tablosu 1389 yazım (`_nd7_build.js`, elle kararlar tests/nd7_elle.json); kataloğa ürün EKLENMEDİ → tests/nd7k_aday.json 580 ürün / 1131 satır (ND7K bununla başlar); iskelet_veri.js yeniden üretildi (deaf106959; maya 13 stilde değişti, 12 stilde doldu, boşalan 0); 0b arama satırları + süzgeç 2 + 360 px etiketleri. Fixture stokla örnek rozeti ✅ 0 · 🟡 227 · 🔴 740 · ❔ 21. Bağımsız doğrulayıcı dört tur baktı; ilk üç turda 20 düzeltme yaptırdı (parantezli marka, sınıf üyelikleri, tür addan, renk eşitliği, isli malt, boş gerekçeler, niteleyicili / adlandırılmış maya, meyve sınıfı, kodsuz maya adları); üçüncü ve dördüncü turda yanlış ürüne bağlanmış satır bulmadı. CLAUDE KARARI BEKLEYENLER: ND7_ONCESI 15 case + ND6_ONCESI'ne eklenen 2 case · marka / köken ayıklayarak bağlama (130 satır) · tamamı özel kalem grist · ❔ kuralı okuması · iskelette eşit paylı maya sırası. YAPILMAYAN: kodsuz maya adlarının kalanı (47 yazım), kristal niteleyici renk aralığı, miktarsız satıra varsayım miktar. Ayrıntı 1j3z11. → **ND7B YAPILDI** (CC, 2026-11-13, SW v131-545; tam regresyon son kodla 605/605, üç imza AYNI): `BM_ND7B {kapsam, tablo, satir, renk, og, isk}` (kapalıyken tanıma v131-544 ile aynı; yeniden üretilen iskelet bayrakla geri alınmaz); (j) `_bmKatCoz` = ND7 öncesi çözücü (AI yolları), ND7 kimliği `_bmKatCozOrnek` — G + tuzak 123 istemde kalem bulucu v543 ile fark 0 (v544'te 35), DOG4F 434,6 / 425,6 ↔ 433,6 / 425,2 sn; fark işareti (marka / köken / renk / biçim: 232 satır, 178 örnek; birebir rozetinde 🟨); taşınan 3 satır; maya karışımı 40 örnek iki satır; OG kapısı 107 örnekte düğme kapalı (görünen 985 → 881); mayşe hopu not; iskelet eşit paylı maya kuralı (411c8c4944); katalog rengi üretici sayfasından yalnız dingemans_black 545 → 530. CLAUDE KARARI: BUL1-KURU 0(k) "aynı sayı" önermesi veriyle tutmadı · Caravienne = Dingemans Cara 50 MD (dingemans_cara20 DEĞİL; bağlanmadı) · cara45 / dingemans_cara8 üreticide bu adla yok · marka istisnası sıkı okundu · AI4 ödüllü örnek listesi malzeme araması üzerinden ND7 tanımasını kullanıyor · sözlük (alias) yolundan tanınan satırlar fark taşımıyor (doğrulayıcı bulgusu). Ayrıntı 1j3z13.

→ **ND7K YAPILDI** (CC, 2026-11-13, SW v131-546; main e4f8670, canlı md5 01d8bdbc… = git blob): 76 kaynaklı katalog kaydı (hop 30 · maya 27 · malt 19; her sayısal değer url + ≤ 15 sözcük alıntı, muadil / ✅ yok), 241 yazım / 529 satır yeni kayıtlara; `BM_ND7K {fark, tablo, ai, maya2, isk, katalog}` (kapalıyken tanıma v131-545 ile aynı); katalog bekleyen satır malt 374 → 323 · hop 390 → 108 · maya 260 → 97; Stoğumla oluştur 881 → 890 (tam 106 → 162); üç imza aynı; Ö6 AI4 kanıt paketi fark 0, A1 tek istemde değişti (T:B06 'Zerdova Gold'). Test beklentileri Claude kararları 1a–1e (DOG4D–H + BUL2C ND7K kapalı; yeni ND7K-AI-SORU, ND7K-ISK-CANLI); Claude bulut koşuları aa94cf2 603/613 (9 kırmızı yeni katalogdan) + 16e2940 değişen 11'de 9, kalan 2 test kurgusu düzeltildi (CC yerel 3/3). Sırada ND8. Ayrıntı gorevler/SPRINT_GECMISI.md 1j3z15.

**Açık / askıda:** VERI2 (158/988 ödüllü örnek BJCP bandı dışı — veriye dokunulmadı) · AI4D-zayıflık (anlam denetimi yok) · ML kusur 4 (süreç alanları; sızıntısız yeniden eğitim kararı Kaan'da) · tek pH bandı (Su sekmesi 5,4–5,6 ↔ asistan 5,2–5,6; karar Kaan'da) · katalog DME 310 ↔ Palmer 350 PKL · Firebase RTDB güvenliği · EVR1 deney defteri (ileride).

**Sıradakiler (CEV bitince):** (a) Strategy C gösterimi — seçenek 2 (ilk sıra "motorların ortak kararı", 2.–3. V12 yüzdesi) · (b) DERSLER sekmesi (Kaan istedi 2026-10-27: IBD / CIBD Master Brewer omurgası + ev ölçeği + duyusal, etkileşimli, her cümle kaynaklı, aktif öğrenme) · (c) telefon push yeniden abonelik + CEV koşusunda ekran uyanık tutma (wake lock) · (d) "Bu cihazda 400 'workspace' hatası" artık anahtar sorunu olarak sınıflanıyor (CEV5) — kontrol. · (e) DIŞ KAYNAK (Claude 2026-11-07, ayrıntı dis_kaynak/DEGERLENDIRME_2026-11-07.md): DIY Dog 415 reçete ALINDI (dis_kaynak/diydog/, ham + işaret; mash 414 / fermantasyon 403 / maya 414 dolu; maya 363/415 kataloğa eşleşir — adım 48'in 'maya boş' gerekçesi YANLIŞTI; stil adayı yalnız BrewDog metninden, 342 tek) → DD-1 etiketleme → örnek tablosu + ML (kusur 4 kararıyla). Çapraz kontrol işleri: KAT-A Catharina Sour FG 1.004–1.012 / SRM 2–6 (BJCP metni, Brewmaster yanlış) + Eclipse alfa 15,7–19,1 (BarthHaas, Brewmaster 15) · KAT-B 9 eksik BJCP 2021 stili (1A, 2C, 12A, 14B, 15C, 23E ayrı, X1–X3) · KAT-C 34 yaygın eksik hop (HopDatabase 220 kayıt, üretici linkinden doğrulanarak; HopDatabase'de Nectaron hatası görüldü) · KAT-D 10 White Labs + DIY Dog'daki eksik suşlar · KAT-E off-flavor'da olmayan 5 aile (otoliz, izovalerik, sabunumsu, tahıl/kabuk, bitkisel). brewers-almanack içeriği kaynaksız → yalnız kontrol listesi. Rustybeer: formüller aynı (kalori yok). KABUL (ek, 19:30): Claude Code Remote Control (Max'te var; CC'de /remote-control → Kaan uzaktan prompt verebilir, DEVIR sorunu çözülür) · healthchecks.io → (c) push cron izleme · LLM Panel (başka şirket modeli) yalnız TAZE held-out 2 onay koşusunda tek seferlik etiket denetimi (≈ 3–6 $ VARSAYIM, anahtar ve harcama kararı Kaan'da). REDDEDİLEN: Scrapling ('28 maya' bir uzlaştırma işi, tarama gerekmez; bot aşma) · Ollama · Firebase MCP · Cloudflare MCP (push işinde yeniden bakılır). · (f) DIŞ ARAÇ TARAMASI (Claude 2026-11-07, 8 alan, dis_kaynak/arastirma_2026-11-07/RAPOR_dis_arac_taramasi.md, 15 öncelik): **1 Firebase RTDB kimliksiz OKUNUYOR** (Claude 2 salt-okuma isteği → 200; yazma denenmedi; eşitleme auth göndermiyor; adres + oda adı sw.js yorumunda, git geçmişinde → kural sertleştirme + anonim auth ya da yeni gizli yol + Emulator testi) — koşu #9 sonrası İLK iş · 2 CEV wake lock görünürlükte geri alınmıyor (≈38505; Brew Day'de var) · 3 her çağrıda stop_reason/usage kaydı + hataSinifla sırası ('workspace … usage limits' harcama limiti 'anahtar' diye görünüyor → açık iş (d) buna bağlı olabilir; her 404 'model') · 4 held-out koruma (.claude/settings.json deny + PreToolUse hook; held-out 2 ilk günden private repoda; uygulamanın izin listesinde GitHub alanı yok, web'den sızmaz) · 5 anahtar hijyeni (Brewmaster'a ayrı workspace + harcama limiti + süre) · 6 BJCP 2021 PDF + ham metin public repoda ve Pages'te, uygulamada izin/telif satırı yok (BJCP SSS 19.10.2025 yasaklıyor) · 7 GitHub Actions'ta 6 dilim regresyon (public repo ücretsiz 4 CPU/16 GB; önce sentetik fixture) · 8 hook'lar · 9 pushsubscriptionchange + uzlaştırma · 10 Worker /hata ucu + dosyaya yedek · 11 katalog turu (Türk hop alfaları 'spec tahmini', TARBES kaynaksız; İstanbul suyu profili) · 12 hesap iyileştirmeleri (yüksek OG ABV, mIBU, kalori) · 13 Dersler iskeleti (CIBD/Cicerone başlıkları + ts-fsrs MIT) · 14 CEV'de web_fetch + yerel alıntı eşleştirme (DENE; kapsama kapısı kalırsa ilk aday; citations ile structured outputs aynı istekte çalışmıyor) · 15 Worker /ingest + RAPT Pill (59 €; Türkiye'ye gönderim bulamadım). KAT-E koşu/onay sonrası (set konularına değiyor).

## CEVAP İLKESİ (Kaan kararı 2026-10-22 — TÜM asistanlar için kalıcı)
"Her soruya bu şekilde cevap vermeli": (1) 'Anladığım' satırı, (2) doğrudan cevap, (3) etkenler GÜÇLÜDEN ZAYIFA, her biri kanıt gücüyle — 'güçlü' = ≥2 bağımsız kaynak (üretici teknik belgesi / ders kitabı / hakemli / kontrollü deney), tek deney tek başına YETMEZ, çelişen kaynak açıkça söylenir ve öneri yapılmaz, (4) 'Senin reçetende' satırı, (5) kaynak listesi + teknik ayrıntı KATLI. Sade Türkçe, jargon yok (Kaan: 'burası çok karışık, ne dediğini anlamadım'). Kolay soru 'tek deney' ya da 'bulamadım' ile geçiştirilmez — önce araştırılır (Kaan: 'bu kuantum sorusu değil, kolay bir soru, cevaplanmalı'). Sprint: AI5D (AI5 kartı, muz örneği) → CEV1 (gorevler/CEV1.md: üç asistan, araştırma modu, cev_seti ≥30 soru).

## Önemli Tanımlar
- Kaan: Bankacı, ev üreticisi (homebrewer), betta breeder, yazar
- Bulldog Brewer, 10-12L batch boyutu
- Favori: Weizen/Weizenbock, Belçika Dubbel tarzları
- Ayrıca Domestic Betta Ansiklopedisi (8 cilt, ~930 sayfa, tamam) var — başka bir proje

## Stil Skorlama Motoru — İlerleme Notu (2026-04-23)
Faz 2a tamamlandı. styleMatchScore motoru JSON'da çalışıyor. Top-1 %70-80, Top-3 %89. Bilinen sorunlar: Session IPA↔APA, Blanche↔Sour↔Gose karışıklığı, Specialty agresif, aile içi (Vienna↔Czech Amber, Belgian Strong Golden↔Tripel) çakışmalar.

**Faz 2b tamamlandı (2026-04-23):** Aile içi tie-break motoru + specialty cap eklendi. 202 stil 33 aileye etiketlendi (`STYLE_FAMILIES.json`). Tie-break izole: aileler arası sıra korunur, sadece aile içi pozisyon değişir. Sonuç: **39/55 top-1 (%71), 49/55 top-3 (%89)**. +3 düzelme (best_bitter, wee_heavy, czech_permium), regresyon yok.

**Faz 2c tamamlandı (2026-04-23):** HTML'e V2c motor UI kutusu enjekte edildi (sarı beta kutu, top-3 öneri). %100 preset test oldu. Kaan gerçek Brewmaster'da test etti (Hoppy Wheat doğru yakaladı).

**Faz 2d — Ground Truth benchmark (2026-04-23):** Kaan'ın tautoloji uyarısı üzerine gerçek reçete havuzu kuruldu:
- **199 gerçek reçete** toplandı (Brulosophy + BYO clones + AHA NHC + Milk The Funk)
- Kaynaklar: Brulosophy (~40), BYO Magazine (~150), Brewery clones (Westmalle, Chimay, Orval, Duvel, Guinness, Sierra Nevada, Bell's, Stone, Firestone, Founders, Boulevard, New Belgium, Dogfish Head, Allagash, Hoegaarden, Ayinger, Schneider, Paulaner, Weihenstephaner, Lagunitas, Ommegang, AleSmith, vs.)
- Motor patch round'ları: %25 → %49 → %33 (veri büyüdükçe stabilize)
- **Son benchmark: 66/199 top-1 (%33), 94/199 top-3 (%47)**
- 55-test: 42/56 (stable), Preset: 15/15 (no regression)
- Dosyalar: `_gt_recipes_raw.js`, `_gt_convert.js`, `_confusion_analysis.js`, `_patch_gt2-6.js`

**Tespit:** Kural-tabanlı motor ~%33-39 tavanına yaklaşıyor. Rule-based rafineleme diminishing returns.

**A (Motor Rewrite) Denendi (2026-04-23):**
- Specificity-weighted scoring (dar safe zone = yüksek bonus) → regresyon (%33→%29). Revert.
- Magnet counter-exclusion (American Brown vb. British yeast exclude) → regresyon (%33→%31). Revert.
- **Sonuç:** Kural-tabanlı motor fundamental olarak rule-limitli. Marker vs scalar dengesizliği rule-based ile çözülemiyor. Gerçek çözüm ML veya hibrit ML+rule.

**✅ Faz 3 Feedback Loop — STİL KOLU BAĞLANDI (Sprint Z, 2026-07-30, commit 656b9a4, SW v131-388).**
Tarihçe: eski kayıt "TAMAM / veri birikiyor" diyordu (YANLIŞ, 2026-07-16'da düzeltildi); dış-kıyas denetimi (2026-07-15) kolu kopuk ölçtü (`bm_v2c_feedback` 0 geçiş, `stilSec` yalnız `S.stil` yazıyordu). Sprint Z v1 onarımı:
- **`bm_stil_ogren_v1`** (yeni user-authored key, cap 500): kayıt anında (`tarifeKaydet`) "motor ne dedi + Kaan ne seçti" sessizce dondurulur — rid-dedup son-yazan, DERIVED profile yazmaz.
- **4 kapı** (gürültü/zehirlenme): stil dolu + slug-seviye tahmin (`slugBranchHit`) + reçete tam (`_receteEksikler`) + tazelik İÇERİK-bazlı (malt-imza+maya+OG ±0.003). "İskeleti Doldur" = NİYET, sinyal yazılmaz.
- `uyumSira` AD-düzeyi (1=onay, 2-3=sıra yanlış, null) + `kapsamda` ayrımı (BJCP 239 > V12 91 slug) + kaynak bayrağı (stilSec/dropdown/null).
- Ayarlar ▸ Bildirim & Tanı: "🎯 Stil motoru isabet" satırı — motorun İLK gerçek-kullanım benchmark'ı.
- v1 SALT kayıt+ölçüm; öneri beslemesi **Z2** (n≥2 + soft recall, W2 dengi) açık iş.

Öğrenen sistemin 4 kolu da artık **canlı**: `bm_kaan_profil_v1` (verim/FG, Sprint Q) · `bm_maya_kalibrasyon` (maya attenuation) · `bm_off_ogren_v1` (off-flavor, Sprint W1) · `bm_stil_ogren_v1` (stil, Sprint Z).

**ML Pipeline tamam (2026-04-24): 1016 reçete + V5 Multi-Ensemble motor production'da.**
- LOOCV top-3 %76.6, top-5 %80.3 (rule başlangıcına göre +30 puan top-3)
- 4 motor paralel HTML'de: V2 (flat) / V3 (hiyerarşik) / V4 (ensemble) / **V5 (KNN+RF Multi)** ← ana
- V5 = 1016 KNN örneği + 50 RF ağacı (depth 15, rf=10), α=0.4 KNN + 0.6 RF + 0.0 rule
- Sıradaki kazanım: slug alias normalize (gueuze↔lambic, koelsch↔kolsch, hefeweizen↔weissbier)

**STİL SAYISI — tek "203" yok, 4 ayrı otorite var (ölçüldü 2026-07-15/16):**
| Kaynak | Sayı | Rol |
|---|---|---|
| `BJCP` (HTML içi, dropdown + bant kontrolü) | **240** (AI1: +Saison table/super · AI2: −Table Saison; önceki 239) | **OTORİTE** — kullanıcının gördüğü, hedef stil seçimi + uygunluk göstergesi |
| `STYLE_DEFINITIONS.json` (repo) | 202 | V2c motorunun kaynağı; motor HTML'den kaldırıldı (Sprint Y), dosya repoda yaşıyor |
| V12 ML motoru | 91 slug | Otomatik stil tahmini (top-3 öneri) |
| `STIL_ISKELET` | 63 (20 küratör + 43 korpus çıkarımı) | Elle iskelet — ISK1'den beri YEDEK; tek kaynak `_bmIskeletAl` (türetilmiş `iskelet_veri.js` > elle > zayıf > ödünç) |
| `SUBSTYLE_VARIANTS.json` | 58 | Alt-stil; **UI'da ölü** — `matchSubstyles` hiç çağrılmıyordu |
Eski "203 stil" ifadesi hiçbir kaynağa uymuyordu, kaldırıldı. Bir sayı yazarken hangi otoriteden bahsedildiği belirtilmeli.

**Temel dosyalar** (C:\Users\Kaan\brewmaster\):
- `STYLE_DEFINITIONS.json` — 202 stil, BA 2026 + BJCP 2021 hibrit, thresholds zone mantığıyla
- `SUBSTYLE_VARIANTS.json` — 58 alt-stil (Pastry Stout, Kveik NEIPA, Piña Colada Gose vs.)
- `STYLE_FAMILIES.json` — 33 aile + discriminator konfigi (Faz 2b)
- `style_engine.js` — Ana motor (findBestMatches, styleMatchScore, matchSubstyles)
- `FAZ2a_SONUC.md` — Detaylı sonuç raporu + yarın yapılacaklar listesi
- `_ml_dataset.json` — 1016 reçete × 61 feature (1.79 MB)
- `_ground_truth_v2_batch[1-8].json` — toplam 860 ek reçete (v1 199 + v2 batch 60+150+150+150+150+150+50)
- `_build_inline_v5.js`, `_inject_v5.js`, `_browser_sim_v5.js` — V5 pipeline

---

## UZUN VADELİ VİZYON — Kişiselleştirme ve Öğrenme

**Hedef:** Brewmaster'ı kural tabanlı bir hesap makinesinden, kullanıcı deneyimi ile öğrenen kişiselleştirilmiş bir sisteme dönüştürmek.

**Neden:** BeerSmith/Brewfather bu seviyede kişiselleştirme yapmıyor — Brewmaster'ın gerçek differentiate noktası bu olacak.

### Kapsam (her hesap/öneri için geri besleme)
- **Stil tayini** → kullanıcı manuel seçimi kaydedilir, benzer profillere önerilir
- **OG/FG tahmini** → kullanıcının gerçek hidrometre ölçümleri kaydedilir, attenuation profili kişiselleşir
- **SRM tahmini** → kullanıcının görsel/fotoğraf geri bildirimi
- **IBU algısı** → kullanıcı tat geri bildirimi (çok acı / normal / düşük)
- **Verim tahmini** → kullanıcının her batch'inde kendi sistem verimi öğrenilir (Kaan_verim ortalaması)
- **Maya attenuation** → Kaan'ın her mayayla gerçek aldığı attenuation öğrenilir

### Yaklaşım — Seviyeler
- **Seviye 1 (basit):** Manuel override + log + sonraki önerilerde kullan
- **Seviye 2 (orta):** Kullanıcı bazlı kalibrasyon dosyası (`kaan_profil.json`) — sistem verim offset, renk offset, FG offset
- **Seviye 3 (gerçek ML):** İlerisi — yeterli veri birikince

### Faz haritası
- **Faz 3:** Manuel stil seçimi + temel feedback log (Seviye 1)
- **Faz 4:** FG / SRM / verim feedback'leri
- **Faz 5:** Kişisel kalibrasyon profili (Seviye 2)
- **Faz 6:** ML (uzak gelecek, veri biriktikten sonra)

Bu vizyon arka planda, her yeni özellik tasarımında "bu ileride nasıl kişiselleşir?" sorusu akılda tutulacak.

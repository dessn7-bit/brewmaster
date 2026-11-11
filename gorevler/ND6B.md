SPRINT ND6B — ND6 takip: canlı ayarın testleri + küçük düzeltmeler (gerçek API çağrısı YOK)

Claude, 2026-11-11. ND6 raporu (6d4b831, SW v131-541) Claude tarafından doğrulandı. Kararlar ve doğrulama sonuçları gorevler/SPRINT_GECMISI.md 1j3z9'da.
Bu sprint ND7'den ÖNCE verilir. Dosyada 6 madde var (0–5). İşe başlamadan 6'sını da okuduğunu raporun ilk satırında teyit et. Ayrıca modelini yaz.
EFOR: medium.

KURALLAR
- ND6'nın KURALLAR bölümü aynen geçerli:
  - heldout açılmaz;
  - üç imza AYNI (2c9ebd9f-32461 · 92f59a3c-5776 · 6d7e6c6e-35582);
  - gerçek API yok, Firebase yok;
  - fixture içeriği hiçbir yere yazılmaz;
  - Kaan'dan iş istenmez.
- Yeni davranış BM_ND6 bayraklarının içinde kalır. Bayrak kapalıyken davranış BİREBİR eski.

0. CLAUDE KARARLARI (uygula, tartışma yok)
- (a) AI geri oynatmaları: AI2-TUZAK, AI4-ONKONTROL, AI5B-YON ve DOG4-K4, ND6_ONCESI listesinde bayraklar KAPALI koşmaya devam eder.
  - Gerekçe: bunlar o günün tablosuyla kaydedilmiş AI koşularının dondurulmuş geri oynatmaları.
  - Tuzak seti C grubunun "kaynak" alanı eski ✅ satırının kendisi; set donmuş, değiştirilmez.
  - Liste yorumuna bu kararı ve tarihi yaz.
- (b) iskelet_veri.js bu sprintte YENİDEN ÜRETİLMEZ. ND7'de, maya okuyucusu geldikten sonra üretilecek.
- (c) Maya "(=KOD)" suş köprüsü artık ✅ değil, ⚠️ "satıcı beyanı":
  - Kapsam: stok adındaki "(=BE-256)" gibi işaretler ve katalogdaki "(=KOD)" adları.
  - Not metni "✅ eşdeğer" yazmaz. Örnek metin: "⚠️ satıcı beyanı: X ile aynı (doğrulanmadı)".
  - Aday sırasında ⚠️ kayıtların en üstünde kalır.
  - Stok kontrolünde (stokYetersizMaya, örnek rozeti, iskelet rozeti) bu köprü kalem "aynen" ya da ✅ sayılmaz, ⚠️ muadil sayılır.
  - Etkisini ölç: kaç örnek ve kaç iskelet rozeti değişti. Önce/sonra tablosu ver.

1. ROZET VE SÜZGEÇ DÜZELTMELERİ (BM_ND6.ana içinde)
- "✅ Stoğunla eksiksiz" ve "🟨 Muadille eksiksiz" rozetleri yalnız miktar yetiyorsa verilir.
  - Miktarı yetmeyen kalem varsa rozet "🟡 n kalem az" olur.
  - Süzgeç 1, "az var" olan stili geçirmez.
- "n kalem alınacak" sayısı yalnız reçeteye giren satırları sayar.
  - Miktarsız katkı reçeteye girmiyorsa sayılmaz; notta ayrı satırda kalır.
- Bayrak korumasız kalan satırları bayrağın içine al. Doğrulayıcının bulduğu örnekler: boş maya ataması, yeni durum anahtarı.
- Rozet ile kurulan reçete 239 stilin tamamında birebir uyuşmalı. Test et.

2. 360 PX
- 360 px genişlikte ilk sonuç satırı kaydırmadan tam görünsün.
  - Rozet, örnek satırı ve iki düğme tek satırda kalmayabilir; düğmeleri küçült ya da satırı sıkıştır.
  - Yazı boyutu 14 px'in altına inmez.
- Tam ekran görüntüleri: 360, 390 ve 412 px. Repoya KOYMA; C:\Users\Kaan\bm_yedek\nd6b_ekran\ altına kaydet, raporda dosya adlarını yaz (Claude oradan bakar).

3. CANLI AYARIN TESTLERİ
- ND6_ONCESI listesindeki "veri" ve "ekran" türündeki 14 case şunlar:
  - ND2-ALIAS, ND3-MUADIL, UYG2-MAYA, KAT1-SEPET, AI1-HUKUM, CEV2-MAYA, ISK1-HASH
  - AL5-AK-ENTEGRASYON, AV4-DOLDUR-REGRESYON, BQ1-KARAKTER, BR3-KORUNAN, BS1-TUMSTIL, BT1-GRUP, ND1-FILTRE
- Bunların her biri için bayraklar AÇIK koşan bir YENİ case yaz. Ad: <eski kod>-ND6.
  - Eski case dokunulmadan, bayraklar kapalı koşmaya devam eder.
- Yeni case'in beklentisi ND6 kuralının sonucudur. Her case'in başında tek satır yorum: "eski beklenti → yeni beklenti, çünkü <ND6 kuralı>".
  - Örnek: ND3-MUADIL-ND6. Kaynaksız ✅ artık ⚠️ "(kaynak bekliyor)", stokta aynen sayılmaz, ⚠️ aday olarak görünür.
- ISK1-HASH-ND6, iskelet_veri.js'in DEĞİŞMEDİĞİNİ (hash aynı) sınar. Yeniden üretim ND7'de.
- Bu bir "beklentiyi geçirmek için ayar" değildir: Claude bu yeni beklentileri onayladı. Kural: beklenti, ND6 kuralından türetilir; ölçülen değerden türetilmez. Kuraldan türetilemeyen bir beklenti varsa yazma, raporda listele.

4. ÖLÇÜM
- tests/nd6_olcum.mjs'i bu sprintin sonunda yeniden koş.
- ND6 sonrası (v131-541) ile ND6B sonrası değerleri yan yana ver.

5. TEST + KAYIT
- npm test 6 dilim (--parca); yeni case'ler dahil.
- CEV mock 55, üç imza AYNI, kural yolu d30af8de.
- Commit + push, sw.js CACHE_VERSION +1, canlı md5 = yerel, eklenen satırlarda anahtar taraması 0, fixture içeriği diff'te 0.
- BAĞIMSIZ DOĞRULAMA (Kaan kuralı, ZORUNLU): rapordan önce işi GÖRMEMİŞ bir doğrulayıcı alt ajan kendi başına bakar. Bulgular raporda ayrı bölüm.
  - Diff ve üç imza.
  - 14 yeni case'in her birinde beklentinin ND6 kuralından türediği. Tek tek "kural → beklenti" satırı yazar.
  - Bayrak kapalı = eski: nd6_olcum kapalı çıktısı v131-540 ile aynı.
  - 360 px ekran görüntüsü.
  - (=KOD) köprüsünün hiçbir yerde ✅ sayılmadığı. Grep + çalışma anı.
  - Sızıntı grep'i.
- CLAUDE.md'ye 1–2 satır; ayrıntı gorevler/SPRINT_GECMISI.md sonuna.

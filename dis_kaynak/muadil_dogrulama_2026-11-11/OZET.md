# MUADIL ✅ doğrulaması — 2026-11-11 (Claude)

## Kapsam
- MUADIL tablosunda fark alanı "✅" ile başlayan 503 kayıt var. Bunların yalnız 10'unda kaynak alanı var.
- 107 kayıt kör doğrulayıcılarla denetlendi:
  - 83 seçilmiş kayıt. Seçim ölçütü kişisel veri taşıdığı için yazılmadı.
  - 24 rastgele kayıt (seed 20261111; 8 malt, 8 hop, 8 maya).
- Yöntem:
  - 5 kör alt ajan çalıştı. Hiçbiri uygulamanın notunu kanıt saymadı.
  - Kaynaklar üretici, yetiştirici ya da tüccar sayfaları, teknik belgeler ve hakemli çalışmalar.
  - Ölçüt TALIMAT.md'de. Puanlama koşudan ÖNCE yazıldı.
  - Alıntılar en çok 15 sözcük. Alt ajanlar bunların sayfada birebir geçtiğini denetledi.

## Sonuç

| Karar | Sayı |
|---|---|
| ✅ doğru | 32 |
| ⚠️ olmalı | 59 |
| ❌ yanlış | 10 |
| bulamadım | 6 |

### Alt kümelere göre
- Seçilmiş 83 kayıt: ✅ 24 · ⚠️ 46 · ❌ 8 · bulamadım 5
  - malt 30: ✅ 9 · ⚠️ 16 · ❌ 5
  - hop 32: ✅ 15 · ⚠️ 14 · ❌ 2 · bulamadım 1
  - maya 21: ✅ 0 · ⚠️ 16 · ❌ 1 · bulamadım 4
- Rastgele 24 kayıt: ✅ 8 · ⚠️ 13 · ❌ 2 · bulamadım 1

### Claude kararları
Yedi kayıtta son karar doğrulayıcınınkinden farklı. Her birinin gerekçesi `claude_notu` alanında.
- 5 kayıt sınıf kuralı yüzünden ❌ almıştı; Claude bunları ⚠️ yaptı:
  - üç kayıt: Pale Ale → Vienna;
  - iki kayıt: kavrulmuş → kabuksuz kavrulmuş.
- 2 kayıt "bulamadım" almıştı:
  - Doğrulayıcı Hitit sayfasını bulamamıştı. Sayfayı başka bir doğrulayıcı buldu, Claude da açıp kontrol etti.
  - Bu iki kayıttan biri ⚠️, öbürü ✅ oldu.

## Bulunan veri hataları
Ayrıntı kararlar.json'ın gerekçe alanlarında.
- CaraHell'in rengi "EBC ~5-8" diye yazılmış. Weyermann 20–30 EBC diyor.
- Carapils'in rengi "EBC 5-9" diye yazılmış. Weyermann 2,5–6,5 EBC diyor.
- Uygulama CaraMunich II ile Hitit Koyu Kristal için "benzer aralık" diyor. Gerçek değerler 110–130 EBC ve 60–80 EBC.
- Torrified Wheat için "enzim gerektirmez" yazılmış. Briess maltla birlikte mayşelenmesini söylüyor.
- Fawcett Dark Crystal II'nin değerleri yanlış. Üretici ASBC 110–130 °L veriyor.
- MJ M36 ve BB İngiliz No04 kayıtlarının notları yer değiştirmiş.
- Kazbek → Saaz kaydında gramaj notu ters yönde. Saaz'ın alfası daha düşük, yani daha fazla konmalı.
- BB Pamona "elma/şarap mayası" diye tanımlanmış. Satıcı sayfası onu hibrit IPA ale mayası diye anlatıyor (LalBrew Pomona tanımıyla aynı).
- "Mittelfrueh Clone (TR)" adlı bir Türk çeşidi için kaynak bulunamadı.

## Okunamayan kaynaklar
- Bazı sayfalar bot koruması ya da zaman aşımı yüzünden açılmadı: Braumarkt, YCH'nin bazı sayfaları, Charles Faram, imperialyeast.com, whitelabs.com WLP001 sayfası.
- Bu durumlarda başka kaynak kullanıldı ya da karar "bulamadım" kaldı.

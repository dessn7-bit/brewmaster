# CEV10 — TASLAK (Claude, 2026-11-09; CC'ye VERİLMEDİ — bir sonraki kredi döneminde, Kaan kararıyla)

Bu taslak koşu #9'un kaçan güçlü etken incelemesine dayanır. E2 gereği set sorusu, set alıntısı ya da set örneği içermez; ayrıntı yalnız Claude'un TAM fixture'larında.

## Koşu #9 kaçak incelemesi (39 güçlü etken)
Yöntem: her kaçan etken için web alıntılarını iki kör ajan sınıfladı.
- **açık:** etkeni kendi başına söyleyen alıntı var.
- **kısmi:** etken kesik, öznesiz, yönsüz ya da dar bağlamda geçiyor.
- **yok:** etken alıntılarda hiç geçmiyor.

| Kaybın yeri | Sayı | Alıntıda açık | Kısmi | Yok |
|---|---|---|---|---|
| Katlı bölümde (ilk 6'ya girmedi) | 11 | 9 | 2 | 0 |
| Doğrulamada düştü | 4 | 2 | 2 | 0 |
| Üst kısımda var ama yönsüz / eksik | 6 | 4 | 2 | 0 |
| Cevapta hiç yok | 18 | 4 | 9 | 5 |
| **Toplam** | **39** | **19** | **15** | **5** |

Bu tablodan beş sonuç çıkıyor:
1. **Seçim sorunu, 9 etken.** Alıntı açık ama etken katlıda kaldı. İlk 6'nın bir kısmını aynı işlem adımının varyantları dolduruyor; örneğin aynı adımın süresi, şiddeti ve iki ayrı soğutma maddesi. Öncelik listesi uygulanıyor (gösterilen 254 maddenin 231'i listeden), ama "farklı etken" yargısı dar kalıyor.
2. **Özetleme sorunu, 8 etken.** Alıntı açık ama madde hiç yazılmamış (4) ya da yönü düşürülerek yazılmış (4). Yönü düşürme şöyle olur: alıntı "daha az sağlıklı maya → daha çok X" derken madde "etkileyen etkenler arasında" der.
3. **Başlık kalıbı yüzünden düşen madde, en az 1.** İstenmeyen bir nedenin başlığı "… eklenince" kalıbıyla kurulmuş. Kontaminasyon için kullanıldığında bu, "biracı ekliyor" diye okunuyor ve doğrulayıcı maddeyi yön hatasıyla düşürmüş.
4. **Kesik alıntı, 15 etken.** Etken ancak kesik ya da öznesiz alıntıda geçiyor. Bu yüzden ya madde yazılamadı ya da doğrulayıcı düşürdü. Alıntıların %46,7'si "…" ile bitiyor.
5. **Arama sorunu, 5 etken.** Etken hiçbir alıntıda yok. Bunlar teşhis ve belirti soruları ile özel koşul soruları.

## Önerilen maddeler (öncelik sırasıyla)
1. **Kesik alıntı tamamlama.** Bayrak `C.CEV10.tamamla`.
   - Kesik alıntıların sayfası, ucuz modelde `web_fetch` aracıyla çekilir.
   - Tam cümle YEREL olarak eşleştirilir: kesik alıntının "…" öncesi kısmı tam cümlenin içinde BİREBİR geçmeli. Geçmezse tamamlama atılır, alıntı kesik kalır.
   - Doğrulayıcı istemi DEĞİŞMEZ (imza aynı); yalnız alıntı daha uzun gelir.
   - Kayıt: tamamlanan / atılan sayısı, maliyet.
   - Maliyet tahmini soru başı 0,01–0,05 $ (VARSAYIM, 2× kuralıyla ≤ 0,10 $). Gerçek değer Anthropic `web_fetch` belgesinden yeniden okunacak.
   - Etkilenen etken: 15 kısmi + doğrulamada düşen kısmiler.
2. **Üst kısım çeşitliliği.**
   - `ayni_etken` tanımı genişler: aynı İŞLEM ADIMI (kaynatma, soğutma, aktarma, saklama …) içindeki varyantlar tek gruptur.
   - Öncelik listesi bir gruptan en çok bir numara alır (bugünkü kural, daha geniş grupla).
   - Ek deterministik kural: ilk 6'da aynı değişken kökünden ikinci madde varsa ve kökü farklı bir aday kalmışsa, ikinci madde katlıya iner.
   - Etkilenen etken: 9 seçim kaybı.
3. **Yön koruma kuralı** (özet, kapsama ve onarım görevleri; örneksiz).
   - Alıntı bir yön söylüyorsa (artınca / azalınca / daha çok / daha az) madde o yönü taşır.
   - "Etkileyen etkenler arasında" gibi yönsüz anlatım yalnız alıntı da yönsüzse kullanılır.
   - Kapsama turu (a): açık yönlü alıntısı olan ve listede olmayan etken için yeni madde yazmak zorunlu; sınır `KAPSAMA_MAX`.
   - Etkilenen etken: 8 özetleme kaybı.
4. **İstenmeyen neden başlığı.**
   - `yon` alanına yeni değer `varlik` ("X varsa / X olursa") eklenir. Kontaminasyon, oksidasyon ve kalıntı gibi biracının eklemediği nedenler için kullanılır; "eklenince" kalıbı kullanılmaz.
   - Başlık üretimi deterministik.
   - Etkilenen etken: başlık kaynaklı yön düşüşleri.
5. **Teşhis sorularında arama.** Sorgu üretimi teşhis / belirti sorusunda bir sorguyu "belirtiler, işaretler" yönüne ayırır.
   - Küçük ve düşük öncelikli; 5 arama kaybı için.

## Kaan'a sorulacak (koşudan ÖNCE)
- **Üst kısım 6 → 8 madde mi?**
  - Koşu #9'da katlıdaki 11 etken üstte olsaydı kapsama 138/166 (%83,1) olurdu.
  - Bedeli: cevap uzar, sade okuma zorlaşır.
  - Madde 2 tek başına bu kaybın bir kısmını kapatabilir.
- **Kesik alıntı tamamlama için ek maliyet kabul mü?** Koşu başı VARSAYIM +0,5–3 $.

## Kapı ve onay
- Puanlama AYNI: EK 2. Kapsama yöntemi koşu #9'daki gibidir: mekanik + iki kör yargıç + Claude.
- Kapı geçerse TAZE held-out 2 onay koşusu yapılır.
  - Soruları, beklenenleri ve imzaları Claude yazar.
  - **İlk günden private repoda tutulur.** Held-out 2 soruları, beklenenleri ve etiket notları CC'nin okuduğu hiçbir dosyaya (CLAUDE.md, gorevler/*.md, SPRINT_GECMISI.md) yazılmaz; yalnız sayılar yazılır.
  - Held-out 1'in ayrıntıları geçmişte bu dosyalara yazıldı. Held-out 1 artık bağımsız sayılmamasının bir nedeni de bu.

SPRINT AI6 (BUL1 tur 3 sonrasi) — aylik API kredisiyle model karsilastirmasi (Haiku / Sonnet / Opus) + kosu #3 zayiflik duzeltmeleri + Ayarlar'da model secimi

Bu dosyada 8 numarali madde var. Ise baslamadan 8'ini de okudugunu raporun ilk satirinda teyit et.
EFOR: high
MODEL: Model-bagimsiz. Modelini ilk satirda belirt.

NEDEN (2026-10-13): Kaan'in Konsol'unda Max 20x aylik API kredisi gorundu: 200 $ promosyon kredisi, verilis 13.10.2026, son kullanma 14.11.2026. Resmi dokuman (platform.claude.com/docs/en/about-claude/api-credits-for-subscribers, Claude tarafindan okundu 2026-10-13): kapsam "Claude API / Managed Agents / Agent SDK / Playground"; Claude Code DEGIL; "Included credits are spent first, then any credits you've purchased"; harcanmayan kredi donem sonunda yanar; kredi harcamasi kurulusun aylik harcama tavanina sayilir. Uygulamanin AI cagrilari Claude API oldugu icin once bu krediden duser. KAAN KARARI: "o zaman Opus kullanabiliriz". CLAUDE.md 1k (Opus secenegi) bununla acilir; ama varsayilan model OLCUMLE secilir, varsayimla degil.

1. KOSU #3 ZAYIFLIK DUZELTMELERI (CLAUDE.md AI4D-zayiflik 1-5; para yok)
- (1) Kirpilmis liste: paketteki "ilk 5 stil" / benzeri kirpilmis listeler acikca "liste kirpildi, digerleri dahil degil; bu stilin sayisi: n" bicimine. Sorulan stilin kendi sayisi listede yoksa ayrica yazilir.
- (2) Yon belirsizligi: hes:hukum ve degisiklik satirlari "CIKAR: X 130 g" / "EKLE: Y 50 g" / "DEGISTIR: X -> Y" bicimine.
- (3) Muadil sonucu: paket "muadil karsiligi YOK — hesap ozellik benzerligiyle" gibi tek anlamli etiket tasir; ozet semasinda muadil derecesi enum alani, serbest metin degil.
- (4) Birlesen ornekler: her odullu ornek ayri ID ile; ozet talimatina "farkli ornek ID'lerini tek ornek gibi anlatma".
- (5) coffee <-> Kahve Cekirdegi ve benzeri TR/EN eslesmeleri stile-ozgu kanit eslemesine; eksik esleme listesini korpus + katalogdan otomatik cikar, raporla.
- (6) Anlam denetimi bu sprintte YOK; acik is olarak kalir. Madde 5'teki karsilastirma bunun boyutunu her model icin olcer.
- Denetleyici degisirse yeniden dondur (yeni imza + commit). Mutasyon seti + kosu #3 dogrulama seti (tests/) yeni denetleyiciyle yesil olmali; kosu #3'un gercek cumlelerinde yeni denetleyicinin karari eskisiyle karsilastirilir (yanlis alarm / kacan).

2. MODEL SECIMI (Ayarlar ▸ AI ozellikleri)
- Ozet modeli secimi: Haiku 5.5 / Sonnet 5.5 / Opus 5.5. Fiyatlar MODEL tablosunda platform.claude.com pricing sayfasindan (okuma tarihiyle): Opus 5.5 $4/$20, Sonnet 5.5 $2/$10, Haiku 5.5 $0,10/$0,50 (CLAUDE.md 1k, okundu 2026-10-09) — yeniden kontrol et. Her secenekte soru basi tahmini maliyet (web'li / web'siz) yazar.
- Models API ile claude-opus-5-5'in hesapta oldugunu ve json_schema + web_search destegini dogrula (mevcut "Denetle" deseni). Desteklemiyorsa secenek gizli + nedeni.
- Varsayilan madde 5'in sonucuna kadar Haiku kalir.

3. BUTCE
- Tuzak/BUL kosucu tavanlari: yeni "kredi donemi" tavani 30 $ (Kaan "Opus kullanabiliriz" onayi; aylik kredi 200 $). Eski 12 $ tavani ve gecmis harcamalar (8,18 $ + BUL) raporda kalir, sayac sifirlanmaz.
- Kartta not: "Claude Max aylik API kredisi once harcanir; kredi bitince satin alinan bakiye". Uygulama Konsol bakiyesini okuyamaz — bunu yazar, tahmin yapmaz.

4. TUZAK SETI
- Set v3 aynen (A, B, C, E, T; 70 istem). Yeni istem EKLEME (karsilastirilabilirlik). Kosu #3'teki 6 yanlis cumlenin istemleri (A03a, T08b, A09a, A09b, A06a, T03a) zaten sette; duzeltmenin etkisi buradan olculur.

5. KARSILASTIRMA KOSUSU (Kaan'in dugmesi; tek dugme, sirayla)
- On kontrol (AI4 deseni) + tum set 1 tur, uc model sirayla: Haiku 5.5, Sonnet 5.5, Opus 5.5. Ayni denetleyici imzasi, ayni set, ayni tohum. Tahmini maliyet raporda (2x payla); tavan 30 $.
- Her model icin AYRI metrik: yalakalik, kontrol, tat hukmu, uydurma (a)/(b)/(c) — (c) gosterilen cumlelerin TAMAMI kanitli elle etiketlenir (AI4B EK kurali; ornekleme yok, dogrulanamayan dogru sayilmaz). Ayrica cevap basina "en az bir yanlis gosterilen cumle" orani ve gercek soru basi maliyet.
- Kosu #3 (Haiku, duzeltme oncesi) ile bu kosunun Haiku sonucu yan yana: duzeltmenin etkisi.
- Arsiv/yarim korumalari aynen; her model ayri arsiv kaydi.

6. KARAR (onceden kayitli)
- Esikleri gecmeyen model varsayilan olamaz.
- Gecenler arasinda: tablo (model · (b+c)/N · cevap basi yanlis orani · %95 ust sinirlar · soru basi maliyet) Kaan'a sunulur; varsayilani KAAN secer. CC oneri yazabilir ama karar vermez. Fark guven araliklari icinde ortusuyorsa bunu acikca soyle.
- Secilen model kartta seritte yazar ("erken test — model X, kosu #N").

7. GUVENLIK
- Anahtar uygulamadan cikmaz; sonuc kopyasinda sk-ant- yok; working/ ve repo anahtar taramasi 0. Kisisel veri repoya yazilmaz.

8. DOGRULAMA + AKIS
- npm test yesil + yeni case'ler: (1)-(5) duzeltmelerinin her biri, model secimi + fiyat tablosu, 30 $ tavan, uc modelli kosu plani, model basina ayri metrik/arsiv, varsayilanin olcumden once degismemesi. En az 2 case kasitli bozmayla kirmizi.
- Canli curl, SW bump, APP_VERSION 'v2.79.10' SABIT, worker'a dokunma. Her asamada TAM yedek.
- AKIS: madde 1-4 + canli -> Kaan'a tek cumle: "Konsol'da aylik harcama tavaninin en az 30 $ oldugunu kontrol et, sonra Ayarlar ▸ AI ozellikleri ▸ Tuzak testini calistir'a bas; bitince Sonucu kopyala ile buraya yapistir." Yapistirma gelince elle etiketle, tabloyu kur, Kaan'a karari sor.

RAPOR: duzeltmeler (once/sonra paket ornegi), denetleyici imzasi, model/fiyat dogrulamasi, karsilastirma tablosu, kosu #3 ile fark, gercek maliyet, SUPHE (zorunlu).

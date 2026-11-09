# FB1 — Firebase eşitleme veritabanını kilitle (gerçek AI koşusu YOK)

Claude, 2026-11-09. Kaynak: dis_kaynak/arastirma_2026-11-07/RAPOR_dis_arac_taramasi.md, öncelik 1.

## Durum (Claude ölçtü, 2026-11-07)
- Eşitleme isteklerinde kimlik yok:
  - `syncUrl()` ≈ satır 39477 yolu kuruyor: `<url>/brewmaster_<oda>.json`.
  - `syncGonder`, `syncAl` ve `_aktar` düğümü (≈ 38914) `auth=` göndermiyor.
  - Gövdede KR (reçeteler), STOK, silme izleri, ts ve cihaz var. API anahtarı YOK.
- Gerçek veritabanı adresi ve oda adı public repoda:
  - `sw.js` ≈ satır 364'te, "Adim 132-fix-1" yorumunda. Commit b56fdab, 2026-05-19'dan beri.
  - HTML ≈ 39481'deki yorum örnek olarak oda adını içeriyor.
- Kimliksiz shallow GET denendi: kök 200, oda yolu 200. Yani okuma herkese açık. Yazma DENENMEDİ.
- Kurallar konsolda duruyor; repoda kural dosyası yok.
- Worker push akışı `oda` + `odaToken` (X-BM-Token, KV `sub:<oda>` / `alarm:<oda>`) kullanıyor:
  - Firebase'e dokunmuyor.
  - `odaToken` 16 rastgele bayt (32 hex); Ayarlar'da "Üret" ile oluşuyor, cihazlara elle kopyalanıyor (≈ 39836).
- Odada 3 cihaz var (sw.js yorumu, "3 cihaz").

## Hedef
Veri yalnız gizli yolu bilen cihazlardan okunup yazılabilsin.
- Kök listelenemesin.
- Eski yol (`brewmaster_<oda>`) kimseye açık kalmasın.
- Push / alarm akışı (Worker, `oda`, `odaToken`, KV anahtarları) HİÇ değişmesin.

## Kurallar
- git pull ile başla.
- `tests/cev_seti_heldout.json` ve `tests/fixtures/*TAM_heldout_iceriyor*` AÇILMAZ.
- AI4, araştırma denetleyicisi ve doğrulayıcı blokları DOKUNULMAZ. Üç imza AYNI kalmalı:
  - 2c9ebd9f-32461
  - 92f59a3c-5776
  - 6d7e6c6e-35582
- Gerçek Anthropic API çağrısı YOK.
- Gizli kalacaklar: veritabanı adresi, oda adı, `odaToken` ve yeni gizli yol değeri.
  - Commit'e, rapora, konsol çıktısına, ekran görüntüsüne GİRMEZ.
  - Raporda `<ADRES>` / `<ODA>` / `<GİZLİ>` yaz.
- Kaan kod bilmiyor. Ondan bir şey kopyalamasını, yapıştırmasını ya da düzenlemesini İSTEME.
  - Tek istisna Firebase CLI'nin Google giriş onayı (madde 4): tarayıcıda hesabını seçip "İzin ver"e basması.

## Maddeler

**1. Yedek (önce).**
Değişiklikten ÖNCE mevcut veritabanının tamamını, eski yol dahil, kimliksiz GET ile indir.
- Hedef: `C:\Users\Kaan\bm_yedek\firebase_yedek_<tarih>.json` (repo DIŞI).
- Boyutu ve kök anahtar sayısını raporla, içeriği raporlama.

**2. Yeni yol — uygulama tarafı (bayrak `BM_FB1`; kapalıyken davranış BİREBİR eski).**
- Gizli bileşen `odaToken`'dan TÜRETİLİR:
  - SHA-256('bm-fb1:' + odaToken) çıktısının ilk 32 hex'i.
  - Hesap bir kez, `syncKaydetVeBaslat` ve açılışta yapılır. `syncCfg.fbYol` olarak saklanır.
  - Neden türetiliyor: Firebase URL'si tanı ekranında ya da hata kaydında görünse bile Worker token'ı açığa çıkmasın.
- Yol: `<url>/brewmaster_<oda>_<fbYol>.json`; `_aktar` düğümü de aynı kökten türer.
- `odaToken` yoksa:
  - Buluta YAZMA, OKUMA da.
  - Sade Türkçe uyarı: "Eşitleme için önce Oda token üret ya da diğer cihazdan kopyala".
- Tanı ekranı (`_syncTaniHTML`, ≈ 39775) ve her hata ya da log kaydı yolu MASKELİ gösterir: `brewmaster_<oda>_••••<son 4>`.
- İlk açılışta göç (bir kez):
  - Yeni yol boşsa, yerel veriyi mevcut birleştirme mantığıyla gönder (`syncGonder`). Eski yoldan OKUMA YAPMA, çünkü kurallardan sonra eski yol kapanacak; yerel veri esas.
  - Cihazlar arası birleştirme mevcut ts / silme izi mantığıyla aynen.
- `sw.js` ≈ 364 yorumundaki gerçek adresi `https://<proje>-default-rtdb.firebaseio.com` biçiminde örnekle değiştir.
- HTML ≈ 39481 yorumundaki oda adını `<oda>` yap.
- Git geçmişi temizlenmez; kurallar bunu etkisiz kılar.

**3. Kurallar dosyası (repoda, gizli değer içermez).**
`database.rules.json`:
- Kök `.read` / `.write` false.
- Kök altında `$k` için `.read` / `.write` yalnız `$k.matches(/^brewmaster_[a-z0-9-]+_[0-9a-f]{32}(_aktar)?$/)` iken.
- Regex sözdizimini Firebase'in kendi belgesinden doğrula; Claude'un örneği yanlış olabilir.
- `firebase.json` yalnız database rules'u gösterir.
- `.firebaserc` COMMIT EDİLMEZ (proje kimliği = adres). `.gitignore`'a ekle. Proje kimliği komut satırında `--project`.
- Kalan risk (raporda yaz): yolu bilmeyen biri yine de rastgele 32 hex'li YENİ düğüm yazabilir (depolama spam'i). Kaan'ın verisi buna açık değil.

**4. Sıra (önemli).**
1. Madde 1–3'ü yap. Commit + push, sw.js CACHE_VERSION +1, canlı md5 = yerel.
2. Kaan'a TEK cümle: "Üç cihazında da uygulamayı bir kez aç ve Ayarlar ▸ Eşitleme'de 'bağlı' yazdığını gör".
   - Cihaz başına yeni yola ilk gönderim sayısını tanıdan oku. Üçü yeni yolda görünmeden kurala geçme.
   - Görünmeyen cihaz varsa rapora yaz ve DUR.
3. `npx firebase-tools@latest login`. Kaan tarayıcıda Google hesabını seçip izin verir; bunu ona önceden tek cümleyle söyle.
4. `firebase deploy --only database --project <proje>`.
5. Doğrulama (kimliksiz, salt durum kodu):
   - kök shallow GET → 401 / Permission denied;
   - eski yol GET → 401;
   - yeni yol GET → 200;
   - kısa rastgele bir yola PUT → 401 (yazılmadığını GET ile de gör).
6. Eski yolu ve eski `_aktar`'ı CLI ile sil (`firebase database:remove`).
   - Önce madde 1 yedeğinin boyutu > 0 olduğunu kontrol et.
   - Silmeden önce Kaan'dan tek cümle onay al.

**5. Test.**
Sentetik test; Puppeteer, mevcut `--parca` düzeni:
- bayrak kapalıyken yol eski;
- açıkken yol türetilmiş, `odaToken` yokken istek atılmıyor;
- tanı ekranında maske;
- `_aktar` aynı kökten.

Ayrıca:
- npm test 6 dilim, CEV mock 55, üç imza AYNI;
- yeni ve değişen satırlarda anahtar taraması 0;
- değişen dosyalarda adres / oda / token / fbYol değeri 0 (grep).

**6. Bağımsız doğrulama (Kaan kuralı, ZORUNLU).**
Rapordan önce işi GÖRMEMİŞ bir doğrulayıcı alt ajan çalıştır. Alt ajan kendi başına bakar:
- diff;
- canlı md5;
- madde 4.5'in dört durum kodu;
- sızıntı grep'i;
- üç imza.

Raporda alt ajanın bulguları ayrı bölüm olur. Uyuşmazlık varsa önce çöz.

**7. Kayıt.**
- CLAUDE.md "Açık / askıda" satırında "Firebase RTDB güvenliği" → "FB1 YAPILDI (tarih, SW sürümü)".
- Ayrıntı `gorevler/SPRINT_GECMISI.md` sonuna.

## Sonra
Claude kontrolü:
- kimliksiz dört istek;
- canlı md5;
- diff'te sızıntı yok.

Sonra sıradaki iş: CEV koşu #9 sonucuna göre (held-out 2 hazırlığı ya da CEV10).

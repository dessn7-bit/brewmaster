# KUCUK1 — ekran kilidi, hata sınıfı, çağrı kaydı, BJCP dosyaları (gerçek koşu YOK)

Claude, 2026-11-09. Kaan kararı (2026-11-09): CEV10 ve held-out 2 bir sonraki kredi döneminde. Bu dönem API harcaması gerektirmeyen düzeltmeler yapılacak.
Kaynak: dis_kaynak/arastirma_2026-11-07/RAPOR_dis_arac_taramasi.md, öncelik 2, 3 ve 6. FB1 raporu doğrulandıktan SONRA verilir.

## Kurallar
- git pull ile başla.
- `tests/cev_seti_heldout.json` ve `tests/fixtures/*TAM_heldout_iceriyor*` AÇILMAZ.
- AI4, araştırma denetleyicisi ve doğrulayıcı blokları DOKUNULMAZ. Üç imza AYNI kalmalı:
  - 2c9ebd9f-32461
  - 92f59a3c-5776
  - 6d7e6c6e-35582
- Kural yolu parmak izi d30af8de, mock 55 tam tur AYNI kalmalı. Set metinleri, imzalar ve puanlama değişmez.
- Gerçek Anthropic API çağrısı YOK.
- Kaan'dan kopyala, yapıştır ya da düzenleme İSTENMEZ.
- Her madde kendi bayrağıyla gelir; bayrak kapalıyken davranış BİREBİR eski. Madde 4 bunun dışında, çünkü dosya işi.

## Maddeler

**1. CEV koşusunda ekran kilidini geri al (`BM_KUCUK1.kilit`).**
Durum (Claude ölçtü):
- CEV toplu koşusu `navigator.wakeLock.request('screen')` çağrısını yalnız başlangıçta bir kez yapıyor (koşu başlatıcısında `kilit = k`).
- Sayfa gizlenince tarayıcı kilidi bırakıyor ve geri alınmıyor.
- Brew Day'de `visibilitychange` ile yeniden alma var (`_brewdayWakeLockAc`). Aynı desen kullanılacak.

Yapılacaklar:
- Koşu sürerken (`T3.calisiyor`) sayfa yeniden görünür olduğunda ve kilit yoksa ya da bırakılmışsa (`kilit.released`) kilidi yeniden al.
- Koşu bitince, durunca ya da hata verince kilidi bırak ve dinleyiciyi kaldır.
- Mock koşuda kilit istenmez (bugünkü gibi).
- Ekranda tek satır: "Ekran açık tutuluyor" / "Ekran kilidi alınamadı — telefonun ekran zaman aşımını uzat".

**2. API hata sınıflandırması (`hataSinifla`, `BM_KUCUK1.hata`).**
Durum:
- 400 + /workspace/ testi kredi testinden ÖNCE çalışıyor. Bu yüzden harcama limiti mesajı ("workspace … usage limits") "anahtar çalışma alanına bağlı değil" diye gösteriliyor.
- Her 404 "model bulunamadı" sayılıyor.

Yapılacaklar:
- Anthropic'in güncel hata sayfasından (docs.claude.com / platform.claude.com "Errors") workspace geçen 400 / 404 mesajlarının BİREBİR metnini oku. Raporda sayfa adresi + alıntı olsun; Claude'un notları kanıt sayılmaz.
- Sınıflar:
  - (a) harcama / kullanım limiti → 'hesap', workspace testinden ÖNCE;
  - (b) "not scoped to a workspace" → 'calisma_alani';
  - (c) `anthropic-workspace-id` başlık hatası → 'istek' (uygulama tarafı);
  - (d) 404'te mesaj modeli anıyorsa 'model', workspace'i anıyorsa 'calisma_alani', değilse 'istek'.
- Mesajlar sade Türkçe.
- Sentetik test: her mesaj biçimi + eski davranış (bayrak kapalı).

**3. Her AI çağrısında stop_reason ve kullanım kaydı (`BM_KUCUK1.kayit`).**
Durum:
- CEV `harca` kaydı (R.cagri) şunları tutuyor: tur, sınıf, ok, usd, model, hata, kesildi.
- `stop_reason` yalnız max_tokens / pause_turn / refusal bayrağı olarak geçiyor.
- Token sayıları yalnız koşu toplamında var.

Yapılacaklar:
- BM_AI yanıt sonucuna `stopReason` (ham değer) ve `kullanim` ekle: input, output, cache_creation, cache_read, web_search_requests. Kaynak `json.usage`.
- R.cagri satırına ve AI4 / soru çözücü çağrı kayıtlarına aynı iki alanı yaz.
- Ekranda değişiklik yok. Koşu dosyasında (bitti.json) görünür.
- Maliyet hesabı DEĞİŞMEZ. Mock 55 tam turda maliyet toplamı aynı olmalı.

**4. BJCP 2021 dosyaları public repodan çıksın + atıf satırı.**
Durum:
- `BJCP_2021_Guidelines.pdf` ve `BJCP_2021_raw.txt` git'te ve GitHub Pages'te açık.
- BJCP SSS (19.10.2025) kılavuzun başka sitede yayımlanmasını yasaklıyor. Uygulamalarda kullanım için izin + telif satırı + bjcp.org bağlantısı istiyor.
- Bu iki dosya yalnız yerel derleme betiklerinde (`_bul_build_etiket.js`, `_bul_build_ticari.js`, `_extract_bjcp.js`) okunuyor. Uygulama çalışırken okumuyor; Claude grep'le baktı, sen de doğrula.

Yapılacaklar:
- İki dosyayı `git rm --cached` ile çıkar. Kaan'ın bilgisayarında KALSINLAR. `.gitignore`'a ekle.
- `BJCP_2021_styles.json` dosyasının içeriğine bak:
  - kılavuz metni (açıklama paragrafları) taşıyorsa aynı işlem;
  - yalnız sayısal stil parametreleri / ad / numara taşıyorsa kalır.
  - Kararını raporla.
- Derleme betikleri yerel dosyayla çalışmaya devam etmeli. Bir kez çalıştırıp çıktının AYNI olduğunu doğrula (`etiket` / `ticari` veri md5 aynı).
- Uygulamada BJCP verisinin göründüğü yere (stil seçimi / uygunluk bölümü ya da Ayarlar ▸ Hakkında) tek satır:
  - "Stil verileri: BJCP 2021 Style Guidelines — Copyright 2021, Beer Judge Certification Program, Inc. — bjcp.org"
  - bjcp.org bağlantılı olsun.
  - "used with the permission" ifadesi YAZILMAZ; izin başvurusu Kaan kararı, Claude taslağı ayrıca yazacak.
- Push'tan sonra Pages adresinde iki dosyanın 404 döndüğünü doğrula (durum kodu yeterli).
- Git geçmişi temizlenmez; raporda not düş.

**5. Test + kayıt.**
- Sentetik:
  - madde 1: gizle → göster → kilit yeniden istenir; bitince bırakılır; bayrak kapalı → eski;
  - madde 2: her sınıf;
  - madde 3: kayıt alanları var, maliyet aynı.
- npm test 6 dilim (`--parca`), CEV mock 55, üç imza AYNI, kural yolu d30af8de.
- Commit + push, sw.js CACHE_VERSION +1, canlı md5 = yerel, eklenen satırlarda anahtar taraması 0.
- **Bağımsız doğrulama (Kaan kuralı, ZORUNLU):** rapordan önce işi GÖRMEMİŞ bir doğrulayıcı alt ajan çalıştır. Alt ajan kendi başına bakar:
  - diff;
  - üç imza;
  - mock maliyet toplamı;
  - Pages 404;
  - sızıntı grep'i.

  Raporda bulgular ayrı bölüm olur.
- CLAUDE.md'de ilgili satırlar güncellenir:
  - "Sıradakiler (f)" 2, 3 ve 6. maddeler;
  - "Sıradakiler (d)".

  Ayrıntı `gorevler/SPRINT_GECMISI.md` sonuna.

## Sonra
1. Claude kontrolü: canlı md5, imzalar, mock, Pages 404, hata sınıfı sentetik.
2. Sıradaki (Kaan'a sorulur): GitHub Actions regresyon (öncelik 7) ya da push yeniden abonelik (öncelik 9).

Claude kararı (2026-11-13, ND7K): editör ve arama (_bmKatEsles ve type-ahead) noktalamayı yok saysın; 'mt hood' → Mt. Hood (Mount Hood). BV2 / BV3 'bilinen eksik' satırı bu düzeltmeyle 0'a inmeli.

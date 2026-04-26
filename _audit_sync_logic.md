# SYNC LOGIC DIAGNOSIS

**Tarih:** 2026-04-26
**Hedef dosya:** `Brewmaster_v2_79_10.html`
**Sync sub-system konumu:** satır 17309-17605 (config sabitleri, helpers, syncGonder/syncAl, syncBaslat/Dinle, UI panel, init).

---

## Mimari özet (sorulara geçmeden önce)

- **Backend:** Firebase Realtime Database, REST endpoint. Veri yolu: `<url>/brewmaster_<oda>.json` (kanıt: `function syncUrl()` satır 17334-17338).
- **İletim:** PUT (`syncGonder`, satır 17344) / GET (`syncAl`, satır 17396).
- **Polling:** 5 saniye (`setInterval(syncAl, 5000)` — satır 17481).
- **Single shared room model:** Firebase'de cihaz başına ayrı node yok. Tüm cihazlar AYNI `<url>/brewmaster_<oda>.json` path'ine yazıp okur.
- **Payload schema** (satır 17358-17363):
  ```js
  { KR: [...], STOK: [...], ts: Date.now(), cihaz: syncCfg.cihaz||"A" }
  ```

---

## Q1: İlk yükleme davranışı

**Cevap: KOŞULLU + TEHLİKELİ (manual-only başlangıç → ardından upload-first race)**

### Adım adım (yeni cihaz, boş localStorage, Firebase'de veri var):

1. **Sayfa açılışı:** `syncBaslat()` satır **17602** (init noktası).
2. `syncBaslat` (17500-17510) → `syncYukle()` ile localStorage `bm_sync_v1` okur. Boş localStorage → `syncCfg = null` → durum 'kapali' → **return**.
3. Sonuç: Hiçbir sync olmaz. Firebase'e değmiyor. **Manual-only**.
4. Kullanıcı ☁️ butonuna basar → `syncPanelAc()` (17512) → URL + oda + cihaz girer → "✓ Kaydet & Bağlan" → `syncKaydetVeBaslat()` (17556).

5. **`syncKaydetVeBaslat` içinde KRİTİK SIRA (satır 17560-17566):**
   ```js
   syncCfg = {url, oda, cihaz};
   syncKaydet(syncCfg);
   document.querySelector('[onclick="this.remove()"]')?.remove();
   syncBaslat();                      // → syncDinle() → setTimeout(syncAl, 1500)
   setTimeout(syncGonder, 500);       // ← UPLOAD önce planlandı
   ```
   - `syncBaslat` içinden `syncDinle` (17470) çağrılır → `setTimeout(syncAl, 1500)` (PULL @ 1500ms) + `setInterval(syncAl, 5000)` (polling).
   - Hemen ardından `setTimeout(syncGonder, 500)` (PUSH @ 500ms).

6. **Sıralama:** PUSH 500ms'de tetiklenir, PULL 1500ms'de. **Upload önce çalışır.**

7. `syncGonder` (17344) ŞARTSIZ PUT yapar:
   ```js
   const data = { KR: JSON.parse(JSON.stringify(KR)), STOK: ..., ts: Date.now(), cihaz: ... };
   await fetch(url, { method:'PUT', body: JSON.stringify(data) });
   ```
   Yeni cihazda `KR` = `yl()` → boş localStorage → `[]` (veya sadece auto-load Dubbel reçetesi, satır 17605'te eklenir).
   
   **Firebase üzerine `KR=[]` (veya `[Dubbel]`) yazılır. 7 reçete + STOK SİLİNİR.**

8. 1000ms sonra `syncAl` çalışır → Firebase'den GET → gelen veri = az önce push'ladığımız boş data. `data.ts === syncSonGuncelle` (syncGonder'ın `_syncTsKaydet(data.ts)` ile sakladığı timestamp, satır 17369) → `if(!(data.ts > syncSonGuncelle)) return;` (satır 17404) → erken return → **lokal değişmez (ama hasar zaten Firebase'de oldu).**

### Risk değerlendirmesi:
**EVET — yeni cihaz açıp manual config girdikten 500ms sonra Firebase'in tüm verisi tehlikede.** İçerideki "EZME REDDEDILDI" defansı (`syncAl` satır 17430-17434) sadece PULL yönünde çalışır; PUSH yönünde böyle bir kontrol yok (`syncGonder`'da Firebase'i öncesinde kontrol etme adımı bulunmuyor).

---

## Q2: Conflict resolution

**Yöntem: HİBRİT — pull yönünde merge-by-ID + LWW timestamp gate; push yönünde unconditional overwrite.**

### Pull yönü (`syncAl` satır 17396-17468):
1. **Timestamp gate (satır 17404):** `if(!(data.ts > syncSonGuncelle)) return;` — Firebase'in ts'i yereldekinden büyük değilse hiçbir şey yapma.
2. **Merge by ID (satır 17421-17430):**
   ```js
   const gelenIds = new Set(gelenKR.map(k=>k.id).filter(Boolean));
   const yerelEklenecek = yerelKR.filter(k => k.id && !gelenIds.has(k.id));
   if(yerelEklenecek.length > 0) yeniKR = gelenKR.concat(yerelEklenecek);
   ```
   Yerelde olup Firebase'de olmayan ID'ler **korunur** (silinmez, eklenir).
3. **Firebase boş + yerel dolu defensi (satır 17431-17434):**
   ```js
   } else if(gelenKR.length === 0 && yerelKR.length > 0){
     console.warn('syncAl: Firebase BOŞ, yerel dolu — EZME REDDEDILDI');
     setTimeout(syncGonder, 200);
     return;
   }
   ```
   Firebase boş + yerel dolu → yereli silmek yerine yereli Firebase'e push eder.
4. STOK için aynı merge mantığı (satır 17440-17455). ID yoksa `ad+birim` fallback key.

### Push yönü (`syncGonder` satır 17344-17383):
- **Hiçbir kontrol yok.** Yereldeki `KR` ve `STOK` aynen `Date.now()` ts'i ile PUT edilir.
- Firebase'de var olan veriyle merge YOK, conflict check YOK, "yerel daha az kayıt içeriyor mu?" check YOK.
- Multi-device kullanımda son `syncGonder` çağıran cihaz Firebase'i tek başına belirler. Diğer cihazlar 5sn içinde bunu görüp pull yönünde merge yapar (kendi yerel-özel ID'lerini koruyabilir).

### Net sonuç:
- **Silme:** İki cihazdan biri reçete silerse → silen cihaz syncGonder ile Firebase'i ezer (silinmiş hâliyle) → diğer cihaz pull yapar, ID ortak değilse local-only olarak korur, ortak ID ise silmez ama gelmez. Yarı tutarsız.
- **Ekleme:** İki cihaz farklı reçeteler eklerse → her ikisi push'lar, son push Firebase'i sıfırlar, ama diğer cihaz pull merge ile kendi local-only kayıtlarını eklediği için kaybolmaz.
- **Edit:** Aynı reçeteyi iki cihaz farklı düzenlerse → son push kazanır. Diğer cihazın değişikliği gelir + bir sonraki polling'de Firebase'den gelen sürümle ezilir (timestamp gate açık olduğu için). **Last-Write-Wins on edits.**

---

## Q3: Tetikleyiciler

| Tetikleyici | Tip | Satır | Detay |
|-------------|-----|------:|-------|
| Sayfa açılışı | initial | **17602** | `syncBaslat();` (top-level, IIFE değil) |
| `syncDinle` ilk kontrol | initial-pull | **17478** | `setTimeout(syncAl, 1500)` (Dubbel auto-load + render sonrası) |
| Polling | interval | **17481** | `setInterval(()=>{ syncAl(); }, 5000)` |
| Reçete kaydı (`ky` wrap) | on-save | **17580** | `window.ky = function(a){ const _r=_origKy(a); _syncGonderDebounced(); return _r; };` |
| Stok kaydı (`stokKaydet` wrap) | on-save | **17582** | `window.stokKaydet = function(a){ _origStokKaydet(a); _syncGonderDebounced(); };` |
| Manuel "Kaydet & Bağlan" | manual | **17566** | `setTimeout(syncGonder, 500)` (config sonrası ilk PUSH) |
| Online event | online-recover | **17594-17598** | `addEventListener('online', ...)` → `setTimeout(syncAl, 500); setTimeout(syncGonder, 1200)` |
| Offline event | UI-only | **17591-17593** | `addEventListener('offline', ...)` → sadece durum gösterir, sync etkilemez |

**Debounce:** `_syncGonderDebounced` (satır 17388-17394) — 300ms clearTimeout collapse. Ardışık kayıtlar tek bir push'a indirgenir.

---

## Q4: URL ve cihaz adı

### URL nereye saklanıyor:
- **localStorage anahtarı:** `bm_sync_v1` (`SYNC_SK = "bm_sync_v1"` satır 17309).
- **Format (satır 17324):** `{ url, oda, cihaz }` JSON objesi.
- **Yazılma noktası:** `syncKaydet(cfg)` satır 17329 — `localStorage.setItem(SYNC_SK, JSON.stringify(cfg))`.
- **Okunma noktası:** `syncYukle()` satır 17322 — JSON.parse + tip guard (`p.url && p.oda` zorunlu).

### Cihaz adı nasıl belirleniyor:
- **Kullanıcı manuel girer.** `syncPanelAc()` (17512-17554) içinde `<input id="syncCihazInp" placeholder="Telefon veya Tablet">` (satır 17532-17534).
- **Default fallback:** `'A'` (satır 17559: `cihaz = (...).trim() || 'A'`).
- **Kısıt:** Sanitize yok cihaz adı için (oda kodu sanitize ediliyor: `replace(/[^a-z0-9\-]/gi,'').toLowerCase()` satır 17558, ama cihaz değil).
- **Kullanım:** Sadece payload'a `cihaz: syncCfg.cihaz` olarak konur (satır 17362). Aktif filtre amacı **YOK** — eski cihaz-bazlı filtre (`data.cihaz !== syncCfg.cihaz`) v2.78.91 Q1 düzeltmesinde kaldırılmış (satır 17398-17402'deki yorumda kanıt).

### Node adı kaynağı:
- **Formül (satır 17338):** `'/brewmaster_' + syncCfg.oda + '.json'`.
- **Yani:** Cihaz adından bağımsız. Sadece **oda kodu** (kullanıcının girdiği) Firebase node'unu belirler.
- **Multi-device share:** İki cihaz aynı URL + aynı oda girerse aynı node'a yazıp okur. Cihaz adı sadece "kim push'ladı" debug bilgisi.
- **Örnek:** Kaan'ın `oda: kaanbira` → `<url>/brewmaster_kaanbira.json`. `oda: kabir` → `<url>/brewmaster_kabir.json`. Bunlar tamamen ayrı node'lar.

---

## Q5: İlk URL girişinden sonra Firebase'i pull eden bir kod yolu var mı?

**Cevap: VAR ama YETERSİZ — push'tan sonra çalışıyor (race kaybediyor).**

`syncKaydetVeBaslat()` satır 17556-17567:
```js
function syncKaydetVeBaslat(){
  const url = (document.getElementById('syncUrlInp')?.value||'').trim();
  const oda = (document.getElementById('syncOdaInp')?.value||'').trim().replace(/[^a-z0-9\-]/gi,'').toLowerCase();
  const cihaz = (document.getElementById('syncCihazInp')?.value||'').trim() || 'A';
  if(!url||!oda){ alert('URL ve Oda Kodu zorunlu!'); return; }
  syncCfg = {url, oda, cihaz};
  syncKaydet(syncCfg);
  document.querySelector('[onclick="this.remove()"]')?.remove();
  syncBaslat();                  // ← satır 17564: syncDinle → setTimeout(syncAl, 1500)
  setTimeout(syncGonder, 500);   // ← satır 17566: 500ms sonra PUSH
}
```

PULL planlandı (`syncBaslat → syncDinle → setTimeout(syncAl, 1500)`) AMA PUSH 500ms önce çalışıyor ve Firebase'i ezdiği için, 1000ms sonra çalışan PULL artık eski Firebase verisini değil, yeni cihazın az önce push'ladığı boş veriyi alıyor.

**Tek savunma çizgisi:** `syncAl` içindeki "Firebase BOŞ, yerel dolu" kontrolü (satır 17431-17434) — ama bu, yeni cihazda yerel de boş (veya sadece auto-load Dubbel) olduğu için tetiklenmez.

---

## Q6: localStorage senkron öncesi yedek/kontrol var mı?

**Cevap: YOK — sadece pull yönünde defansif kontroller var; push tamamen kalkansız.**

### Mevcut savunmalar (sadece pull):
1. **Timestamp gate** (satır 17404): yereldeki `ts`'i yenmeyen Firebase verisi atlanır.
2. **EZME REDDEDILDI** (satır 17431-17434): Firebase boş + yerel dolu → push'a yönlendirilir, yerel ezilmez.
3. **Merge by ID** (satır 17421-17430): yerel-özel ID'ler concat edilir, silinmez.
4. **Tip guards:** `Array.isArray(data.KR)` check (17403), `_migrateAllRecipes` ve `_migrateLegacyKatkiIds` legacy katki id normalize (17415-17416).

### Yokluklar (push tarafında):
- Backup snapshot YOK (push öncesi yereli IndexedDB'ye yedeklemiyor — `_writeBoth` zaten her ky() çağrısında IDB'ye yazıyor ama push işleminden bağımsız).
- "Üzerine yaz?" diyalogu YOK — sessiz PUT.
- Firebase pre-check YOK — `syncGonder` GET sonra PUT yapmıyor; doğrudan PUT.
- "Yerelin reçete sayısı Firebase'den çok az; tehlikeli" warning YOK.
- Conflict editor YOK.

### Yan-bonus IDB defansı:
- `_kurtarmaKontrol` (satır 4309-4350): localStorage boş ama IndexedDB dolu ise IDB'den restore. **Sadece kendi cihazının önceki seans verisini kurtarır, başka cihazın Firebase verisini değil.**

---

## Sonuç — Yeni cihaz kurulum güvenliği

### Telefon/tablet PWA silinip yeniden kurulduğunda Firebase'deki 7 reçete + STOK güvende mi?

**Hayır, güvende değil.** Yeniden kurulum sonrası senaryo:

1. PWA temiz açılır → localStorage boş, IndexedDB temiz (silindi).
2. `let KR = yl();` → `[]`.
3. Dubbel auto-load (satır 17605) çalışır → `KR.unshift(dubbel)` → `KR.length = 1`.
4. Kullanıcı ☁️ butonuna basıp Firebase config girer.
5. `syncKaydetVeBaslat()` çalışır:
   - **t = +500ms:** `syncGonder` PUT → Firebase'e `{KR:[Dubbel], STOK:[], ts:Now}` yazılır → **6 reçete kaybolur** (Firebase'de 7 vardı, şimdi 1).
   - t = +1500ms: `syncAl` GET → Firebase'den gelen veri = az önce push'ladığımız → `data.ts === syncSonGuncelle` → return → kayıp kalır.
6. Diğer cihazlar polling sırasında bu boşaltılmış Firebase'i çekip yereli merge eder. Yerelleri 6 reçete daha içeriyorsa local-only diye korur — **bu durumda diğer cihaz sayesinde geri gelir**. Ama tüm cihazlar yenilenmişse veri tamamen kaybolur.

### Hangi sırayla kurulum yapılırsa data kaybı sıfır olur?

**Güvenli kurulum protokolü (kod değişikliği YOK, kullanıcı disiplini ile):**

1. **Yeni cihaza geçmeden ÖNCE Firebase verisini dışarıda yedekle.** Tarayıcıda `<url>/brewmaster_<oda>.json` URL'ini aç, JSON'u kopyala, dosyaya kaydet (Drive'a/Notes'a). Bu yedek protokolün koltuk değneği.

2. Yeni cihaza PWA'yı kur. AÇMA. Ya da açtıysan ☁️ butonuna basma.

3. Eski (sağlıklı) bir cihazın açık olduğunu doğrula. Bu cihaz şu an Firebase'in kanonik kaynağı.

4. Yeni cihazda ☁️ aç → URL + oda + cihaz adı gir → "✓ Kaydet & Bağlan" bas.

5. **t=+500ms ANINDA tehlike anı.** Bu noktada yeni cihazın localStorage'ı (sadece Dubbel) Firebase'e PUT edilir → Firebase'in 7 reçetesi gider. **Kaçınılmaz** — kod değişikliği olmadan bu race önlenemiyor.

6. Hemen sonra (t=+1500ms) yeni cihaz Firebase'den pull eder ama Firebase artık boş → veri kaybı kalıcı olur YENİ cihazda.

7. **Eski cihazda 5sn içinde polling tetiklenir** → Firebase'i (sadece Dubbel) çeker. Eski cihazda yerel KR.length = 7 + Dubbel = 8. `gelenIds = {Dubbel}`, `yerelEklenecek = 7 (eski)`. Merge ile `yeniKR = [Dubbel] + 7 eski = 8 reçete`. Eski cihaz sağ kalır.

8. **Eski cihaz syncGonder'ı tetikle:** Eski cihazda herhangi bir reçeteye dokun (örn. notu güncelle, tekrar kaydet) → `_syncGonderDebounced` → 300ms sonra `syncGonder` → Firebase'e `KR = 8 reçete` push → Firebase düzeldi.

9. Yeni cihaz 5sn içinde polling → Firebase'i pull → 8 reçete merge → yeni cihaz da düzeldi.

**Kısaca: yeni cihaz config'i, tek bir sağlıklı eski cihaz açıkken yapılırsa, 5-10 saniyelik geçici Firebase ezilmesi sonrası data otomatik geri gelir. Eğer hiçbir eski cihaz aktif değilse veri kalıcı kaybolur — yedek dışarıda olmazsa kurtarılamaz.**

### Riskli durumlar
- Tek cihaz kullanıcı + cihaz arızası/PWA cache temizlendi senaryosu: Firebase'in tek kanonik kopya olması bekleniyor ama yeni cihaz config'i Firebase'i siliyor.
- "Önce Firebase'i pull et, sonra push" mantığını ekleyen bir patch (örn. `syncKaydetVeBaslat` içinde `await syncAl(); ...; setTimeout(syncGonder, 500)`) bu race'i kapatır. **Bu rapor scope dışı** — sadece teşhis. Kod değişikliği gerekirse ayrı adımda.

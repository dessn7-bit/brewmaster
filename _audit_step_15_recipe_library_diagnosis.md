# Adım 15 — Recipe Library Diagnosis

**Tarih:** 2026-04-26
**Hedef dosya:** `Brewmaster_v2_79_10.html`
**Amaç:** Reçete kütüphanesinin nerede saklandığını, şemasını ve ground truth alanını tespit etmek. Adım B (3 motor benchmark harness) için ön koşul. Bu adımda kod değişikliği YOK — sadece teşhis.

---

## 1. localStorage Anahtarları (kanıtlı tablo)

### 1a. `setItem` çağrıları

| Satır | Anahtar / Değişken | Raw kod |
|------:|--------------------|---------|
| 473   | `'bm_v2c_feedback'` | `localStorage.setItem('bm_v2c_feedback', JSON.stringify(log));` |
| 474   | `'bm_v2c_seed_2026_04_25'` | `localStorage.setItem('bm_v2c_seed_2026_04_25', '1');` |
| 484   | `'bm_v2c_feedback'` | `localStorage.setItem('bm_v2c_feedback', JSON.stringify(log));` |
| 3481  | `key` (generic — `_writeBoth(key,str)`) | `try{localStorage.setItem(key,str);okLS=true;}catch(e){throw e;}` |
| 3493  | `key` (generic — IDB restore) | `try{localStorage.setItem(key,idbVal);}catch(e){}` |
| 3525  | `SK_DRAFT` (=`'bm_draft_v1'`) | `localStorage.setItem(SK_DRAFT,JSON.stringify({s:S,editId:_editId,ts:Date.now()}));` |
| 3661  | `SK_STOK_HIST` (=`'bm_stok_history_v1'`) | `function stokHistKaydet(h){try{localStorage.setItem(SK_STOK_HIST,JSON.stringify(h));}catch{}}` |
| 3677  | `SK_KATKI_FAV` (=`'bm_katki_fav_v1'`) | `function katkiFavKaydet(a){try{localStorage.setItem(SK_KATKI_FAV,JSON.stringify(a));}catch{}}` |
| 3680  | `SK_KATKI_SON` (=`'bm_katki_son_v1'`) | `localStorage.setItem(SK_KATKI_SON,JSON.stringify(s));` |
| 4261  | `'_bm_test'` (probe) | `localStorage.setItem('_bm_test','1');` |
| 4318  | `SK` (=`'bm_v6'`) — IDB restore yolu | `try { localStorage.setItem(SK, val); } catch(e){}` |
| 4337  | `SK_STOK` (=`'bm_stok_v1'`) — IDB restore yolu | `try { localStorage.setItem(SK_STOK, val); } catch(e){}` |
| 4611  | `'acc_'+uid` (akordeon UI state) | `'localStorage.setItem(\\''+key+'\\',o?\\'1\\':\\'0\\');})(this)" '+` |
| 15905 | `_ALARM_SAAT_SK` (=`'bm_alarm_saati_v1'`) | `try { localStorage.setItem(_ALARM_SAAT_SK, saat); return true; } catch(e) { return false; }` |
| 15913 | `_ALARM_SK` (=`'bm_alarms_v1'`) | `try { localStorage.setItem(_ALARM_SK, JSON.stringify(obj||{})); return true; } catch(e) { return false; }` |
| 17319 | `SYNC_TS_SK` (=`'bm_sync_ts_v1'`) | `try{ localStorage.setItem(SYNC_TS_SK, String(ts)); }catch(e){}` |
| 17330 | `SYNC_SK` (=`'bm_sync_v1'`) | `try{ localStorage.setItem(SYNC_SK, JSON.stringify(cfg)); }` |
| 17643 | `'bm_v6'` (Dubbel seed yazımı) | `localStorage.setItem('bm_v6', JSON.stringify(stored));` |

### 1b. `getItem` çağrıları (sadece ayrı anahtarlar)

| Satır | Anahtar | Bağlam |
|------:|---------|--------|
| 454, 455, 481, 501, 517, 13858 | `'bm_v2c_feedback'` | V2c feedback log okuma |
| 3488 | `key` (generic) | `_readWithRestore` |
| 3529 | `SK_DRAFT` | `loadDraft()` |
| 3643 | `SK_STOK` | `stokYukle()` |
| 3660 | `SK_STOK_HIST` | `stokHistYukle()` |
| 3676 | `SK_KATKI_FAV` | `katkiFavYukle()` |
| 3679 | `SK_KATKI_SON` | `katkiSonYukle()` |
| 4235 | `SK` (=`'bm_v6'`) | **`function yl()`** — reçete kütüphanesi yükleyici |
| 4606 | `'acc_'+uid` | UI akordeon state |
| 15900 | `_ALARM_SAAT_SK` | `alarmSaatOku()` |
| 15909 | `_ALARM_SK` | `alarmOku()` |
| 16084, 16207, 17612, 17677, 17739, 17760 | `'bm_v6'` | KR_list / tanı paneli / sync export — hep aynı reçete listesi |
| 17315 | `SYNC_TS_SK` | sync timestamp okuma |
| 17325 | `SYNC_SK` | sync config |
| 17678, 17740, 17761 | `'bm_stok_v1'` | tanı paneli / sync |
| 17680, 17742, 17762 | `'bm_draft_v1'` | tanı paneli / sync |
| 17679, 17743, 17763 | `'bm_sync_v1'` | tanı paneli / sync |
| 17688, 17741, 17744, 17764 | `'bm_sync_ts_v1'` | tanı paneli / sync |

### 1c. `removeItem` ve `localStorage[…]`

- `removeItem`: 3522, 3528, 4262, 4294, 17573 (sırasıyla DRAFT clear ×3, `_bm_test` probe, SYNC_SK).
- `localStorage[...]`: **eşleşme yok** (bracket erişimi kullanılmıyor).

### 1d. SK sabit tanımları (kanıt)

| Satır | Sabit | Değer |
|------:|-------|-------|
| 3413 | `SK` | `"bm_v6"` |
| 3414 | `SK_STOK` | `"bm_stok_v1"` |
| 3415 | `SK_DRAFT` | `"bm_draft_v1"` |
| 3659 | `SK_STOK_HIST` | `"bm_stok_history_v1"` |
| 3674 | `SK_KATKI_FAV` | `"bm_katki_fav_v1"` |
| 3675 | `SK_KATKI_SON` | `"bm_katki_son_v1"` |
| 15866 | `_ALARM_SK` | `'bm_alarms_v1'` |
| 15867 | `_ALARM_SAAT_SK` | `'bm_alarm_saati_v1'` |
| 17309 | `SYNC_SK` | `"bm_sync_v1"` |
| 17310 | `SYNC_TS_SK` | `"bm_sync_ts_v1"` |

---

## 2. Reçete Kütüphanesi Anahtarı

**Kanıt zinciri:**

- **Sabit:** Satır 3413 — `const SK="bm_v6";`
- **Yükleyici:** Satır 4233-4243 — `function yl(){ ... raw=localStorage.getItem(SK); ... return Array.isArray(parsed)?parsed:[]; }`. Sonuç **dizi** (Array), parse hatası → `[]`. Şema: `KR = Array<recipe>`.
- **Init:** Satır 4277 — `let KR=yl();` (uygulamanın global reçete state'i).
- **Yazıcı:** Satır 4244-4256 — `function ky(a){ ... _writeBoth(SK,_str); ... }` (localStorage + IndexedDB ikili yedek).
- **Reçete-spesifik kaydetme handler:** Satır 4563-4591 — `function tarifeKaydet()`. Burada `KR[_mevcutIdx]=t` veya `KR.unshift(t)` yapılıp `_origKy(KR)` (=`ky` orijinal) çağrılıyor (satır 4581).
- **Editöre yükleme:** Satır 4592 — `function tarifAc(id){const t=KR.find(k=>k&&k.id===id);... S={...BOS,...d}; ... render();}`.
- **Silme:** Satır 4593-4602 — `function tarifSil(id){ KR=KR.filter(k=>k.id!==id); ky(KR); ... }`.
- **UI listeleme:** Satır 8289 — `filtreliKR.length===0` (reçete defteri liste ekranı KR üzerinden çalışıyor).
- **Sync wrapper:** Satır 17579-17580 — `const _origKy = ky; window.ky = function(a){ const _r=_origKy(a); _syncGonderDebounced(); return _r; };` (Firebase sync `ky`'yi wrap ediyor; `_origKy` orijinal sync-tetiklemeyen çağrı).

**Sonuç (KESİN):** Reçete kütüphanesi anahtarı **`bm_v6`**. Tek anahtar, tek liste, dizi formatı.

Yan kanıtlar — `bm_v2c_feedback` (V2c stil override loglarını tutuyor — başka), `bm_draft_v1` (editör taslağı, tek obje — başka), `bm_stok_v1` (envanter — başka), `bm_sync_v1`/`bm_sync_ts_v1` (Firebase sync metadata — başka).

---

## 3. Kayıt Şeması

### 3a. `tarifeKaydet()` build noktası (kanıt)

Satır 4571-4578:
```js
const _tarihStr=(()=>{const d=new Date();return d.getDate()+'.'+(d.getMonth()+1)+'.'+d.getFullYear();})();
const _idStr=_editId||Date.now().toString();
const _mevcutIdx=_editId?KR.findIndex(k=>k.id===_editId):-1;
const _eskiTarih=_mevcutIdx>=0?KR[_mevcutIdx].tarih:_tarihStr;
const t={id:_idStr, tarih:_eskiTarih,
  ...JSON.parse(JSON.stringify(S)),
  ozet:{og:og.toFixed(3),fg:fg.toFixed(3),abv:abv.toFixed(2),ibu:ibu.toFixed(0),srm:srm.toFixed(0)}};
if(_mevcutIdx>=0){KR[_mevcutIdx]=t;}else{KR.unshift(t);}
```

**Yapı:** `t = { id, tarih, ...S (deep clone), ozet }`. Yani **kaydedilen reçete = S objesinin tamamı + 3 ek alan (id, tarih, ozet)**. S'in tüm alanları otomatik kayıt olur (yeni alan eklemek için ek kod gerekmez).

### 3b. `S` şeması — `BOS` template (satır 3369)

```js
const BOS={
  biraAd:"", stil:"", verim:61, hacim:11,
  mashSc:67, mashDk:60, kaynatmaSure:60, mashAdimlar:[],
  maltlar:[], hoplar:[], mayaId:"", maya2Id:"", mayaYasAy:null,
  fgManuel:null, ogManuel:null, preboilOG:null,
  durum:"aktif", klasor:"", brewLog:[],
  primVol:2.4, primTemp:18, _primVolAuto:true, primYontem:"Dekstroz",
  notlar:"",
  suMineralleri:[], suKaynak:"distile", suHedef:"",
  katkilar:[], tadim:null
};
```

### 3c. Kategorize liste (her alan + kaynak satır)

#### Tanım
| Alan | Kaynak | Açıklama |
|------|--------|----------|
| `id` | tarifeKaydet 4572 | `_editId \|\| Date.now().toString()` — yeni kayıtta epoch ms string |
| `tarih` | tarifeKaydet 4571,4574 | `"D.M.YYYY"` Türkçe formatı (zero-pad YOK, `getMonth()+1`) |
| `biraAd` | BOS 3369 | Reçete adı (kullanıcı girer) |
| `klasor` | BOS 3369 | Klasör/folder etiketi (örn. "Yarışma") |
| `durum` | BOS 3369 | `"aktif"` \| `"yapimda"` \| `"arsiv"` |
| `notlar` | BOS 3369 | Serbest metin notlar |
| `_ver` | sadece seed reçete (Dubbel, satır 17638) | Şema versiyonu — **sadece programatik seed'lerde**, kullanıcı kayıtlarında YOK |

#### Sayısal hedefler / parametreler
| Alan | Kaynak | Açıklama |
|------|--------|----------|
| `verim` | BOS 3369 | Brewhouse efficiency %, default 61 |
| `hacim` | BOS 3369 | Batch hacmi L, default 11 |
| `mashSc` | BOS 3369 | Mash sıcaklığı °C, default 67 |
| `mashDk` | BOS 3369 | Mash süresi dk, default 60 |
| `kaynatmaSure` | BOS 3369 | Boil dk, default 60 |
| `mashAdimlar[]` | BOS 3369 | Çok-adımlı mash profili (boş = tek adım) |
| `mayaYasAy` | BOS 3369 | Mayanın yaşı (ay) |
| `fgManuel` | BOS 3369 | Manuel ölçülmüş FG (override) |
| `ogManuel` | BOS 3369 | Manuel OG override |
| `preboilOG` | BOS 3369 | Pre-boil OG ölçümü |
| `primVol` | BOS 3369 | Priming hedef CO₂ vol, default 2.4 |
| `primTemp` | BOS 3369 | Priming/serving temp °C, default 18 |
| `_primVolAuto` | BOS 3369 | Priming volume otomatik mi flag |
| `primYontem` | BOS 3369 | "Dekstroz", "Sukroz" vs. |
| `ozet` | tarifeKaydet 4577 | Computed snapshot: `{og,fg,abv,ibu,srm}` (string olarak `.toFixed`) |

#### Bileşenler
| Alan | Kaynak | Şema |
|------|--------|------|
| `maltlar[]` | BOS 3369 | `{id, kg, marka?}` (örn. `{id:"pale_ale", kg:2.0}`) — ek alan: marka opsiyonel; `yM` template satır 3410 |
| `hoplar[]` | BOS 3369 | `{id, g, dk, tur, cAA, dryDays?, form?}` — `yH` template satır 3410: `{id:"citra",g:15,dk:60,tur:"boil",cAA:null,dryDays:5,form:"pellet"}` |
| `mayaId` | BOS 3369 | Maya ID (string, MAYALAR listesinden) |
| `maya2Id` | BOS 3369 | İkincil maya (co-pitch / sequential) |
| `katkilar[]` | BOS 3369 | `{id, miktar, birim, ad, zaman}` (Dubbel örn: `{"id":"kakao","miktar":30,"birim":"g","ad":"Kakao Nibları","zaman":"Fermentasyon sonunda (soğuk)"}`) |
| `suMineralleri[]` | BOS 3369 | `{id, miktar}` (örn `{"id":"cacl2","miktar":5.0}`); `yMin` template satır 3411 |
| `suKaynak` | BOS 3369 | Su kaynağı ID, default `"distile"` |
| `suHedef` | BOS 3369 | Hedef su profili ID |

#### Diğer
| Alan | Kaynak |
|------|--------|
| `brewLog[]` | BOS 3369 — Üretim sürecindeki olay/log girdileri |
| `tadim` | BOS 3369 — Tadım notları (yapı tek başına `null`, doluyken obje) |

### 3d. Stil Etiketleri (KRİTİK — Adım B için)

#### (a) Manuel "gerçek stil" alanı: **`S.stil`** — VAR

**Kanıt:**
- BOS template (satır 3369): `stil:""` — varsayılan boş.
- UI dropdown (satır 15010-15014):
  ```js
  <span style="font-size:10px...">🎯 Hedef Stil:</span>
  <select onchange="S.stil=this.value;render()" ...>
    <option value=""${!S.stil?" selected":""}>── Otomatik (bileşenlerden) ──</option>
    ${typeof BJCP!=='undefined'?Object.keys(BJCP).sort().map(sn=>`<option value="${sn}"${S.stil===sn?" selected":""}>${sn}</option>`).join(""):""}
  </select>
  ```
  Editör başlığında "🎯 Hedef Stil" etiketi altında bir `<select>` var. Seçenekler `BJCP` objesinin **anahtarları** (BJCP stil ADLARI — örn. "American IPA", "Munich Helles" gibi okunabilir formda; slug değil).
- Override satır (satır 13418-13420): `if(S.stil && BJCP[S.stil]){ stil_tah=S.stil; }` — manuel seçim varsa motor tahminini geçersiz kılıyor.
- Style chip seçim (satır 17266): `window.stilSec=function(el){const s=el.getAttribute('data-stil');if-)(!s)return;S.stil=(S.stil===s)?'':s;render();};` (ek bir chip-tabanlı seçim yolu daha var).

**Önemli not:** `S.stil` boş string `""` ise kullanıcı manuel seçim yapmamış demek (UI etiketi: "Otomatik (bileşenlerden)"). Bu, Adım B benchmark'ında **eleme kriteri** — sadece `S.stil` dolu olan reçeteler ground truth sağlar.

**Format:** İnsan-okunabilir BJCP adı (örn. `"American IPA"`, `"Munich Helles"`, `"Dubbel"`), V5/V6 motorların kullandığı slug (örn. `"american_ipa"`) DEĞİL. Adım B harness'ta isim ↔ slug normalize gerekir.

#### (b) Motor çıktısı kaydediliyor mu: **`S.stilTah`** — EVET (ama versiyon etiketi YOK)

**Kanıt:**
- Set noktası 1 (manuel override sonrası, satır 13422-13423):
  ```js
  // Global state'e yaz — diğer sekmelerin (Su, Maya vb.) erişebilmesi için
  S.stilTah=stil_tah;
  ```
- Set noktası 2 (BJCP fallback motor, satır 9716): `if(_enIyi.stil && _enIyi.uyum>=3) S.stilTah=_enIyi.stil;`
- Çoklu okuma noktaları (8667, 8957, 9175, 9363, 9399, 9510, 9625, 9799, 10741, 14803, 14878 vs.): `S.stilTah || S.stil || S.biraAd` zinciri — fallback etiketi olarak.

**ŞEMADA YOK:** `BOS` template'de `stilTah` alanı **yok** (BOS satır 3369'da geçmiyor) — yani sadece `calc()` çalıştığında runtime olarak set ediliyor. Reçete editör ekranı render olduğunda `calc()` her seferinde çalıştığı için `S.stilTah` doluyor ve `tarifeKaydet()` deep-clone yaparken bu değer de kayda gidiyor (alan otomatik korunur).

**Engine versiyonu kaydedilmiyor.** `S.stilTah` ne V2c, V5 veya V6 etiketi taşıyor. Sadece tek bir string. UI default V6 motorunu çalıştırsa da, bazı kod yollarında (satır 9670-9716) ayrı bir lokal "BJCP scoring" çıktısı `S.stilTah`'a yazılıyor — bu nedenle saved `stilTah` değerinin hangi motordan çıktığı belirsiz.

**Adım B için sonuç:** `S.stilTah` ground truth değil — kendi kendini doğrulayan tautolojik bir alan (motor çıktısını motor benchmark'ında kullanmak yanlış olur). **Tek geçerli ground truth: `S.stil` (kullanıcının dropdown'dan manuel seçtiği BJCP adı).**

---

## 4. Konsol Komutları (Kaan için)

Aşağıdaki 3 komutu DevTools console'a yapıştır. Reçeteler `localStorage["bm_v6"]` altında JSON dizisi olarak duruyor; reçete adı `name` değil **`biraAd`**.

```js
// (a) Reçete sayısı
JSON.parse(localStorage.getItem("bm_v6") || "[]").length
```

```js
// (b) İlk reçetenin tüm alanları (LIFO — en son kayıt başta, çünkü unshift kullanılıyor)
JSON.stringify(JSON.parse(localStorage.getItem("bm_v6"))[0], null, 2)
```

```js
// (c) Dark Belgian Dubbel dump'ı (recipe name "biraAd" alanında)
JSON.stringify(
  JSON.parse(localStorage.getItem("bm_v6"))
    .find(r => r.biraAd && r.biraAd.toLowerCase().includes("dubbel")),
  null, 2
)
```

**Bonus — `S.stil` doluluğunu ölç (Adım B için kritik):**

```js
// Kaç reçetede manuel stil seçimi var? (S.stil dolu = ground truth mevcut)
(()=>{const a=JSON.parse(localStorage.getItem("bm_v6")||"[]");
 return {toplam:a.length, stilDolu:a.filter(r=>r.stil&&r.stil.trim()).length,
         stilBosVeyaOto:a.filter(r=>!r.stil||!r.stil.trim()).length};})()
```

---

## 5. ID / Sıralama / Limit Stratejisi

### 5a. ID üretimi
**Satır 4572:** `const _idStr = _editId || Date.now().toString();`

- Yeni reçete: epoch ms string (örn. `"1714123456789"`).
- Düzenleme: mevcut `_editId` korunur (üzerine yazma).
- Seed reçeteler (programatik, sadece Dubbel): sabit literal string (`"dubbel_2024"`, satır 17608) — Date.now değil.
- UUID/random YOK.

### 5b. Sıralama
**Satır 4578:** `if(_mevcutIdx>=0){KR[_mevcutIdx]=t;}else{KR.unshift(t);}`

- Yeni kayıt → `unshift` (dizi başına ekleniyor → en yeni başta, **LIFO**).
- Düzenleme → bulunduğu index'te in-place replace (sıra değişmez).
- Seed (Dubbel, satır 17642 ve 17648) → `unshift` (en başa).
- Sıralama bayrağı YOK; render tarafında `filtreliKR` kullanılıyor (satır 8289), sıralama görsel filtre tarafından üstlenilebilir ama saklamada sıra = ekleme sırası (yeni → eski).

### 5c. Üst limit / silme mantığı
- **Üst limit YOK.** `KR.length` kontrolü (4312, 17429, 17430, 17706, 17744) sadece var/yok ve sync için; `slice`/`MAX_REC`/`maxRecipes`/`recipeLimit` eşleşmesi sıfır.
- Quota fallback: `ky()` satır 4252 — `QuotaExceededError` yakalanırsa kullanıcıya "⚠️ Depolama dolu! Eski reçeteleri sil." flash mesajı gösterilir, otomatik trim yapılmaz.
- Silme: yalnızca kullanıcı tetikli (`tarifSil(id)`, satır 4593), `KR.filter(k=>k.id!==id)` + `ky(KR)` + alarm temizleme.

### 5d. Adım B harness için ipuçları
1. **İterasyon:** `KR.forEach((r, idx)=>...)` veya `for (const r of KR)` — düz dizi.
2. **ID benzersizliği:** Date.now() çakışması teorik olarak mümkün ama pratikte güvenli (kullanıcı manuel kayıt arası ms farkı olur).
3. **Ground truth filtresi:** `KR.filter(r => r.stil && r.stil.trim() && BJCP[r.stil])` — sadece BJCP-bilinir manuel etiketli reçeteler.
4. **Slug ↔ ad eşlemesi gerekiyor:** `S.stil` = BJCP adı (örn. "Dubbel"). V5/V6 motorları slug üretir (örn. `"belgian_dubbel"` ya da `"dubbel"`). Adım B'de normalize katmanı şart.
5. **`S.stilTah`'ı ground truth olarak KULLANMA** — motor çıktısı, tautoloji oluşturur.

---

## 6. Özet — Adım B'ye Devir Notu

| Soru | Cevap |
|------|-------|
| Reçete kütüphanesi anahtarı | `bm_v6` (`SK`, satır 3413) |
| Yapı | `Array<recipeObject>`, LIFO (yeni başta) |
| Recipe adı alanı | `biraAd` (NOT `name`) |
| ID stratejisi | `Date.now().toString()` (yeni) veya korunmuş `_editId` |
| Manuel ground truth alanı | **`S.stil`** — BJCP adı (örn. "Dubbel"). Boş "" = "Otomatik" |
| Motor çıktı alanı | `S.stilTah` — versiyon etiketi yok, tautolojik (benchmark için kullanma) |
| Üst limit | yok |
| Yedekleme | localStorage + IndexedDB (`_writeBoth` satır 3479) |
| Sync | Firebase (`ky` wrap'lı, satır 17579-17580) |
| Adım B'de gereken normalize | BJCP adı ↔ slug eşleme tablosu |

**Açık riskler / belirsizlikler:**
- `S.stilTah`'ın hangi motor sürümünden geldiği reçete bazında bilinmiyor → benchmark'ta yalnızca canlı motorları çalıştırıp karşılaştır.
- Kullanıcının `S.stil`'i seçmiş ama yanlış seçmiş olma ihtimali var (gürültü). Adım B raporunda outlier işaretleme önerilir.
- Reçete eski (ör. v2c döneminden kalma) ise `S.stil` o zaman da "" olabilir → benchmark havuzu küçülebilir. (b) komutu çıktısı bu konuda netlik verecek.

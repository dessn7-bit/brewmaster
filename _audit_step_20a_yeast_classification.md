# AUDIT STEP 20A — YEAST CLASSIFICATION

**Tarih:** 2026-04-26
**Hedef:** V6 builder Faz 1 fix öncesi sınıflama (yeast_belgian / yeast_abbey ayrımı).
**Kaynak:** `Brewmaster_v2_79_10.html` MAYALAR sabiti, satır **1480-1621** (`const MAYALAR=[`).

**Veri kanıtı:** Bu sınıflama, MAYALAR tablosundan `tip:"belcika"` filtresi (21 maya), `tip:"saison"` filtresi (10 maya), `tip:"wit"` filtresi (1 maya) ile elde edildi. Her satırın raw kaynak satır numarası tabloda.

---

## MAYALAR tablosu — Belçika ailesi mayaları

### Tip: `belcika` (21 adet)

| Satır | id | ad | tip | e (açıklama) | Trappist mı? | Grup |
|------:|---|---|---|---|---|---|
| 1483 | `s33` | Fermentis S-33 | belcika | Hafif Belçika ester/fenolik | hayır | **B** |
| 1504 | `t58` | Fermentis T-58 | belcika | Baharat / fenolik | hayır | **B** |
| 1505 | `wy3522` | WY3522 Belgian Ardennes | belcika | Spicy-meyve | hayır (Belgian Pale Ale klasiği) | **B** |
| 1506 | `wy3787` | WY3787 Trappist High Grav | belcika | Kompleks-meyve | **EVET** (Westmalle soyu) | **A** |
| 1515 | `be256` | Fermentis BE-256 (Abbey/Tripel) | belcika | Meyve-baharat | **EVET** (ad'da "Abbey/Tripel") | **A** |
| 1520 | `bb_belc` | BiraBurada Maya Belçika Tipi (=BE-256) | belcika | Meyve-baharat | **EVET** (ad'da "(=BE-256)" — BE-256 eşleniği) | **A** |
| 1521 | `bb_tripel` | BiraBurada Tripel Maya (=BE-256) | belcika | Meyve / yüksek alkol toleransı | **EVET** (ad'da "Tripel") | **A** |
| 1522 | `bb_belc_neipa33` | BB Maya Belçika-NEIPA No33 | belcika | Belçika ester + NEIPA tropikal. Hazy IPA Belçika versiyonu | hayır (NEIPA hibrit) | **B** |
| 1532 | `bb_belc2` | BB Belçika No2 | belcika | Kompleks Belçika. Meyve-spicy-fenolik | belirsiz (jenerik) | **BELİRSİZ** (default → B) |
| 1533 | `bb_belc3` | BB Belçika No3 | belcika | Güçlü Belçika. Yüksek alkol toleranslı | belirsiz (Tripel/BSDA olabilir ama açık marker yok) | **BELİRSİZ** (default → B) |
| 1534 | `bb_abbaye` | BB Abbaye (Manastır Birası) | belcika | Manastır stili. Kompleks meyve-baharat | **EVET** (ad'da "Abbaye / Manastır") | **A** |
| 1553 | `la_abbaye` | Lallemand Abbaye | belcika | Belçika manastır tarzı | **EVET** (ad'da "Abbaye") | **A** |
| 1565 | `mj_m31` | MJ M31 Belgian Tripel | belcika | Belçika Tripel. Yüksek alkol | **EVET** (ad'da "Tripel") | **A** |
| 1567 | `mj_m41` | MJ M41 Belgian Ale | belcika | Belçika ale. Meyve-baharat-fenolik | hayır (jenerik) | **B** |
| 1570 | `mj_m47` | MJ M47 Belgian Abbey | belcika | Belçika manastır. Dubbel/Tripel | **EVET** (ad'da "Abbey") | **A** |
| 1583 | `wlp500` | WLP500 Trappist Ale | belcika | Chimay soy. Trappist karakter | **EVET** (ad'da "Trappist") | **A** |
| 1584 | `wlp550` | WLP550 Belgian Ale | belcika | Achouffe benzeri. Yüksek attenüasyon | hayır (Achouffe non-Trappist) | **B** |
| 1586 | `wlp570` | WLP570 Belgian Golden | belcika | Duvel soy. Belgian Golden Strong Ale | hayır (Duvel non-Trappist) | **B** |
| 1611 | `imp_b45` | Imperial B45 Gnome | belcika | Belgian Ale genel amaçlı | hayır (jenerik) | **B** |
| 1612 | `imp_b63` | Imperial B63 Monastic | belcika | Trappist Belgian. Westmalle benzeri | **EVET** (ad'da "Monastic" + Trappist) | **A** |
| 1618 | `wy1388` | WY1388 Belgian Strong Ale | belcika | Duvel soyu. Belgian Golden Strong Ale | hayır (Duvel non-Trappist) | **B** |

**Toplam:** Grup A: **10**, Grup B: **9**, BELİRSİZ: **2**.

### Tip: `saison` (10 adet) — bağlamsal not

Mevcut V6 builder satır 13369 zaten `f.yeast_saison = (mt==='saison') ? 1 : 0;` ile bunları işaretliyor. Saison mayaları **yeast_abbey=0 olmalı** (zaten 0, builder mt!=='belcika' kontrolü yapıyor). 

**Ama bir not:** Dataset'te `yeast_belgian=1` etiketli 56 reçeteden **14'ü `french_belgian_saison`** (Adım 18 raporundan). Yani dataset, saison reçetelerini bazen `yeast_belgian=1` olarak da işaretliyor. UI builder bunu yapmıyor (mt='saison' → yeast_belgian=0). Bu **ayrı bir mismatch** ama bu fazın scope'u dışında — Faz 2'de değerlendirilmeli.

Saison mayaları (id'ler, sınıf-dışı bilgi):
| Satır | id | ad |
|------:|---|---|
| 1507 | wy3711 | WY3711 French Saison |
| 1508 | wy3724 | WY3724 Belgian Saison |
| 1516 | be134 | Fermentis BE-134 (Saison) |
| 1549 | la_belle | Lallemand Belle Saison |
| 1554 | la_farmhouse | Lallemand Farmhouse |
| 1564 | mj_m29 | MJ M29 French Saison |
| 1585 | wlp565 | WLP565 Belgian Saison I |
| 1587 | wlp585 | WLP585 Belgian Saison III |
| 1588 | wlp670 | WLP670 Farmhouse Ale |
| 1602 | oyl500 | Omega OYL-500 Saisonstein |

### Tip: `wit` (1 adet)

| Satır | id | ad |
|------:|---|---|
| 1497 | wy3944 | WY3944 Belgian Wit |

`yeast_witbier` ayrı feature olarak ele alınıyor (builder satır 13399: `f.yeast_witbier = (mt==='wit') ? 1 : 0;`). Faz 1 scope dışı.

---

## Önerilen heuristic

**Hibrit yaklaşım — substring + ID whitelist (safety net):**

10 Grup A maya'nın tamamını yakalamak için, ad string'inde substring + bir küçük ID whitelist şart:

    function _isAbbeyYeast(mid, mad) {
      if (!mid && !mad) return false;
      const txt = ((mid||'') + ' ' + (mad||'')).toLowerCase();
      // Substring patterns (9 maya yakalar ad'dan)
      const abbeyRx = /abbaye|abbey|tripel|trappist|monastic|monastery|westmalle|chimay|rochefort|westvleteren|achel|engelszell|la[_\s-]?trappe/;
      if (abbeyRx.test(txt)) return true;
      // ID whitelist — substring'le yakalanamayan edge case
      const abbeyIds = ['bb_belc'];  // BiraBurada BE-256 eşleniği, ad jenerik
      if (abbeyIds.indexOf(mid) >= 0) return true;
      return false;
    }

    // V6 builder'da:
    f.yeast_abbey   = _isAbbeyYeast(mid, mAd) ? 1 : 0;
    f.yeast_belgian = (mt === 'belcika' && !f.yeast_abbey) ? 1 : 0;

**Mantık:**
- `yeast_abbey` öncelikle hesaplanır (substring + whitelist).
- `yeast_belgian` sadece "belcika tipindeyse VE abbey değilse" 1 olur (mutual exclusion garantili — dataset davranışı).
- `mAd` (maya ad'ı) builder'a verilmesi gerekiyor — V2c builder şu an sadece `mayaId` ve `_mayaTip` veriyor, `mayaAd` da iletilmeli (`MAYALAR.find(y=>y.id===S.mayaId).ad`).

### Substring pattern doğrulama (10 Grup A maya):

| id | ad'da match | abbeyRx hit? |
|---|---|---|
| wy3787 | "Trappist High Grav" | ✅ trappist |
| be256 | "Abbey/Tripel" | ✅ abbey + tripel |
| bb_belc | (BE-256 eşleniği, jenerik ad) | ❌ → whitelist |
| bb_tripel | "Tripel Maya" | ✅ tripel |
| bb_abbaye | "Abbaye" | ✅ abbaye |
| la_abbaye | "Abbaye" | ✅ abbaye |
| mj_m31 | "Belgian Tripel" | ✅ tripel |
| mj_m47 | "Belgian Abbey" | ✅ abbey |
| wlp500 | "Trappist Ale" | ✅ trappist |
| imp_b63 | "Monastic" | ✅ monastic |

10/10 cover (9 substring + 1 whitelist). Yanlış pozitif riski:
- Saison mayalarında "Trappist/Abbey/Tripel" sözcüğü YOK (10 saison ad'ı kontrol edildi — temiz).
- Wit mayasında YOK (wy3944).
- Diğer ale/lager mayalarında YOK (genel kontrol).

### Alternatif (atılan): Sadece ID whitelist
Kapsamlı liste:
    ['wy3787','be256','bb_belc','bb_tripel','bb_abbaye','la_abbaye','mj_m31','mj_m47','wlp500','imp_b63']

**Tradeoff:** Whitelist daha güvenli (yanlış pozitif sıfır) ama gelecek mayalar için bakım gerektirir. Substring patterns esnek ama ad'da Trappist sözcüğü olmayan abbey-style mayalar (örn. yeni bir BiraBurada/Imperial/MJ ürünü) gözden kaçabilir. **Hibrit (önerilen) ikisinin arasını dengeler.**

---

## Belirsiz mayalar — Kaan'a soru

**`bb_belc2` (BB Belçika No2)** — açıklama "Kompleks Belçika. Meyve-spicy-fenolik". Atu [78,84]. Generic Belgian, açık Trappist veya Saison işareti yok.

- **Soru 1:** Bu maya'yı pratikte hangi stiller için kullandın? Dubbel/Tripel/BSDA için mi (→ Grup A), yoksa Belgian Pale Ale / Strong Golden gibi non-Trappist için mi (→ Grup B)?
- Default: Grup B (BiraBurada'nın "No2/No3" jenerik etiketi Trappist marker içermiyor).

**`bb_belc3` (BB Belçika No3)** — açıklama "Güçlü Belçika. Yüksek alkol toleranslı". Atu [78,84].

- **Soru 2:** Yüksek alkol toleransı Tripel/BSDA/Quad için cazip kılar — ama Belgian Strong Golden Ale (Duvel) için de uygundur. Hangi taraftaysa onu seç.
- Default: Grup B (alkol toleransı tek başına Trappist marker değil).

**Onay senaryoları:**
- Eğer Kaan "ikisi de Grup A" derse → fix'te bu iki id whitelist'e eklenir, toplam 12 abbey ID.
- Eğer "ikisi de Grup B" derse → mevcut taslak değişmez.
- Eğer "bb_belc3 → A, bb_belc2 → B" derse → tek id eklenir.

---

## Kütüphanedeki kullanım

**Mevcut 7 reçetenin maya bilgileri:** Erişilemez — KR (`bm_v6` localStorage) Kaan'ın tarayıcısında. Yalnız HTML satır 17609'daki seed reçete (Dark Belgian Dubbel) repo'da.

| Reçete | mayaId | maya2Id | Kaynak | Önerilen grup |
|---|---|---|---|---|
| Dark Belgian Dubbel (seed, satır 17609) | `bb_abbaye` | `""` | HTML inline | **A** (yeast_abbey=1) |
| Reçete #2-7 | (bilinmiyor) | (bilinmiyor) | localStorage | (bilinmiyor) |

**Kaan'a istek:** Adım 19 baseline harness çalıştırılınca `localStorage._bm_baseline_step_19_v6_result` JSON'unda her reçetenin `mayaId` ve `maya2Id`'si var. JSON'u paylaşırsan, her reçeteyi yukarıdaki tablodan eşleyip Faz 1 fix'in beklenen etkisini önceden görebiliriz (örn. "bu reçete bb_abbaye kullanıyor → fix sonrası yeast_belgian 1→0, yeast_abbey 1 sabit"). Şart değil — fix sonrası baseline tekrar koşturup farkı görmek de yeterli.

---

## Sonuç

Heuristic taslağı, 10/10 bilinen Trappist/Abbey mayasını (substring 9 + whitelist 1) doğru sınıflandırıyor. 9 non-Trappist Belgian mayası dokunulmadan B grubunda kalıyor. 2 belirsiz mayanın akıbeti Kaan'ın onayına bağlı.

**Faz 1 fix scope (B aşamasında uygulanacak — bu adımda DEĞİL):**
- HTML satır 13365 sonrası: `mAd` (maya ad'ı) builder'a iletilecek.
- HTML satır 13368: `f.yeast_belgian = ...` → `_isAbbeyYeast`'e bağımlı koşul.
- HTML satır 13398: `f.yeast_abbey = ...` → `_isAbbeyYeast` direkt çağrı.
- `_isAbbeyYeast` helper IIFE içine veya hemen üstüne tanımlanacak.

**Beklenen etki (sadece bu fix, diğer bug'lar duruyor):**
- Trappist mayalı reçeteler (örn. seed Dubbel `bb_abbaye`): yeast_belgian 1→0, yeast_abbey 1 sabit. Dataset Dubbel cluster'ına bir binary boyut yaklaşır. Tek başına Dubbel'i doğru tahmin garantisi YOK (Adım 18'deki diğer bug'lar — pct_base 67 birim, mash_type_step, vs. — hâlâ aktif).
- Non-Trappist Belçika mayalı reçeteler (örn. WLP570 Duvel): yeast_belgian 1 sabit, yeast_abbey 1→0. Belgian Strong Golden Ale veya Saison cluster'ına yaklaşır.

**B aşaması için:** Kaan onaylayınca (1) belirsiz mayalar netleşince, (2) `mAd` ileti yolu kararlaştırılınca, str_replace ile fix uygulanır.

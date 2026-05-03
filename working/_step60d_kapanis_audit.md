# Kapanis Audit — 2026-05-03/04 Session

**Tarih:** 2026-05-04 00:30 (gece kesisimi, oturum baslangici 03 May)
**Hedef:** Yarinki yeni terminal acilisi icin son 24 saatlik is ozeti.
**Branch:** main (origin/main ile senkron, ahead 0 behind 0).

---

## 1. Commit Gecmisi (Bugun 10 commit)

| # | hash | mesaj | etki |
|---|---|---|---|
| 1 | `6a8e1d7` | Adim 18d-pre Sprint A: K1 yeast_saison pattern ekle | Parser BE-134/256, M29, Lalbrew Farmhouse |
| 2 | `b11115e` | Adim 18d-pre Sprint B: V19 mapping V6 ile hizalama (16->14 cluster) | _v19_train.py SLUG_TO_CLUSTER |
| 3 | `d1e5986` | Adim 18d-pre Sprint A+B+C V28d production deploy | V28d (efa0115a), 4201 K3 reslug, V19 V6 retrain |
| 4 | `dd4a7c9` | KURAL Code v2: V28c+V28d baseline + V28d production deploy | rules_code.md baseline kayitlar |
| 5 | `fc36a8d` | URL duzeltme: V28d icerigi Brewmaster_v2_79_10.html'e tasindi | URL strateji rollback isim degisikligi |
| 6 | `7531727` | Adim 18d kayit: K3 default fallback duzeltmesi eklendi | _to_do_step18d.json kapsam genisletme |
| 7 | `385227e` | Adim 18c-1c-5f V6 reference V28d retrain + deploy | V6 V21->V28d, cv_top1 0.6027 |
| 8 | `c452cf0` | Adim 18c-1c-5f displayTR fix | _v6_v28d_meta.json + script kalici fix |
| 9 | `0c3a704` | Adim 18d-pre P2: SOUR/LAGER/WHEAT pattern guncelleme | Parser 8 pattern paket |
| 10 | `a056556` | Adim 18d-pre P2 V28e production deploy | V28e (475746f7), 8351 flag 0->1, V19 V6 retrain |

---

## 2. Dataset Zinciri sha256 Dogrulama

| Dataset | sha256 | Boyut (byte) | Recete | Durum |
|---|---|---:|---:|---|
| V27 | `8c2d132d1913a57203040a98c9ef1ceebc2e18ce771b0f233718e1215c12442d` | 1329002475 | 376845 | intact |
| V28a | `5dfcc4ccecac8bb3d250f5a4f552b39a2d0fd475a582fb98993507f1824cf301` | 1329002349 | 376845 | working tree, commit edilmedi |
| V28b | `8359f033338e9aeb399850b72e202f9e70577a1639a87f81d3dde75bf820ae8a` | 1329004710 | 376845 | intact |
| V28c | `2659bbbea28834182a6930d95eff25c1c252264f94ce8254c4f680ef67fb30b4` | 1329004625 | 376845 | working tree, commit edilmedi |
| V28d | `efa0115a91fc3b571e529c58f3e5c48c325ab3647ef7a881da7cb637710c199f` | 1329192656 | 376845 | intact |
| V28e | `475746f7d01db80b202c08328adafcc12b44eb1e4282f2add1382d756fd7eb17` | 1329192654 | 376845 | intact, **production** |

KURAL Code v2 baseline kayitlari ile esit. Drift yok. Hicbir dataset yanlislikla degistirilmedi.

V28a/V28c gitignore (working/ dizini) kapsami disinda commit edilmedi, ancak local dosya korundu — gerekirse rollback icin.

---

## 3. Production Deploy Durumu — `Brewmaster_v2_79_10.html` aktif

**11/11 URL 200 OK** (canli test sonucu):

V28e production (8 URL):
- `Brewmaster_v2_79_10.html` 200
- `_v19_v28e_model_14cat.json` 200
- `_v19_v28e_label_encoder_14cat.json` 200
- `_v19_v28e_model_slug.json` 200 (50.11 MB, GitHub LFS oneri uyarisi mevcut)
- `_v19_v28e_label_encoder_slug.json` 200
- `_v6_v28e_reference.json` 200
- `_v6_v28e_meta.json` 200 — `displayTR` field mevcut (curl ile dogrulandi)
- `_v6_v28e_scaler.json` 200

V28d rollback (3 URL):
- `_v19_v28d_model_14cat.json` 200
- `_v6_v28d_reference.json` 200
- `_v6_v28d_meta.json` 200

HTML satir 474-477 V19 fetch, satir 882-884 V6 fetch — hepsi V28e isimleriyle senkron.

V28d artifact'lar root'ta (`_v19_v28d_*.json` + `_v6_v28d_*.json`) rollback hazir.

---

## 4. KURAL Code v2 Butunluk

**Dosya:** `working/_rules_code.md`, **505 satir**.

Bugun eklenen kurallar (commit log baslik kontrolu ile dogrulandi):
- KURAL 1.4 (recete vs flag terminoloji) — commit `fc307c9`
- KURAL 4.4 (oneri etiketi yasagi) — commit `fc307c9`
- KURAL 4.5 (KARAR yasagi kapsam ayrimi) — commit `ff82ca6`
- KURAL 11.1 (cross-dataset lookup disiplini) — commit `015a2ee`
- KURAL 12.1 ekrana yazma protokol + revize — commit `61eb574`, `0330576`
- Anomali esik kalibrasyon notu (V28b) — commit `968d044`
- Cluster transition siniflandirma + V28b kalibrasyon — commit `920f2f3`

Baseline kayitlari (bolum "Dataset Baseline Kayitlari"):
- V27 / V28a sha256 — commit `b613e19`
- V28b — commit `c610e16`
- V28c / V28d / V28d production deploy — commit `dd4a7c9`
- V19 SLUG_TO_CLUSTER V6 hizalama (Sprint B) — commit `dd4a7c9`
- V6 V28d retrain baseline — commit `385227e`
- V6 displayTR script kalici fix — commit `c452cf0`
- V28e baseline + V19/V6 retrain metric — commit `a056556`

Versiyon notlari:
- v1 (ilk), v2 (hipotez iptal), v2.1 (V28a baseline), v2.2 (V6 V28d retrain), v2.3 (displayTR fix), **v2.4 (V28e P2 deploy, son)**.

Adim 18d kayit guncellemesi (`_to_do_step18d.json`): K3 default fallback maddesi eklendi — commit `7531727`.

Tum kurallar commit edildi, push edildi. KURAL Code v2 dosyada eksik madde yok.

---

## 5. Acik to_do Dosyalari

| Dosya | Boyut | Son guncelleme | Durum |
|---|---:|---|---|
| `_to_do_step18c1c5e.json` | 4282 B | 03 May 14:43 | Acik — 12 numara Wyeast audit |
| `_to_do_step18c1c5f.json` | 1400 B | 03 May 16:41 | **TAMAMLANDI** — V6 V21->V28d (commit `385227e`), V28e (commit `a056556`). Dosya icerigi guncel degil ama is bitti |
| `_to_do_step18c1c5g.json` | 836 B | 03 May 18:06 | Acik — V2c yeast entegrasyon |
| `_to_do_step18c1c5h.json` | 970 B | 03 May 18:06 | Acik — multi-strain audit |
| `_to_do_step18c1c7.json` | 2891 B | 03 May 14:44 | Acik — Cellador pattern erteleme |
| `_to_do_step18d.json` | 898 B | 03 May 21:52 | Acik — toplu reslug + K3 default + sour/lager/wheat reslug aday (Adim 18d) |

Adim 18c-1c-5f teknik olarak bitti, dosya update edilmedi (kosul gerek degil — KURAL Code v2 baseline'de dolayli kayit var).

---

## 6. Potansiyel Sorun Kontrolu

**Working tree:**
- 6 modified dosya: `_faz5_enhanced_evaluation_results.json`, `_ml_dataset_v13_pre_retrain.json`, `_v19_metrics.json`, `_v6_baseline_results.json` — eski uncommit degisiklikler, bugunun isi degil
- 2 silinmis dosya: `_step60c_embed_v6_c2.py`, `_step60c_extract_test.py` — onceki sprint kalintisi
- 100+ untracked dosya: BACKUP HTML, eski sprint script'leri, scrape kalintilari — `.gitignore` ile temizlik gerekebilir ileride

**Origin/main:**
- ahead 0, behind 0 — push tamamen senkron.

**GitHub LFS uyarisi:**
- `_v19_v28e_model_slug.json` 50.11 MB > 50 MB onerilen sinir. Push basarili, ileride GitHub Pages kotasi sorun olabilir (5 GB free tier — su an guvenli).

**Kritik dosya silinmesi yok:**
- V27/V28b/V28d/V28e datasetleri yerinde
- V19 V28d/V28e + V6 V21/V28d/V28e artifact'lari root'ta
- Brewmaster_v2_79_10.html aktif

**Yarin baslangic engelleyici durum:** Yok. Production canli, rollback hazir, dataset zinciri intact.

---

## 7. Yarin Icin Hazirlik (sirasiz bilgi)

**Kalan acik kapsamlar:**
- **B**: V6 reference Wheat %60 teshisi (kullanici bugun Weizen UI testi sirasinda V6 Wheat %61 + Specialty %39 raporladi). Analiz `working/_step60d_weizen_helles_analiz.json` mevcut — V19 V28e sentetik test sample %98 hefeweizen tahmin etti, V6 K=5 sentetik test 3/5 wheat + 2/5 sour. Kullanici UI'daki gercek input ile sentetik input arasi sapma kaynagi belirsiz.
- **A**: Turk maya/malt/hop/katki marka pattern eksiklik (Bulldog Brewer, Turkce isim varyantlari, ev uretici lokal markalar)
- **Cluster**: bock, lager_dark, pilsner — Sprint E tarama yapilmasi (sour/lager/wheat orneginde oldugu gibi)

**Adim 18d kapsami (acik):**
- 9097 reslug aday (Adim 18c-1c-5)
- 237 multi-strain FP V28b C3
- 486 K4 reslug aday (Sprint D iptal)
- 1522 K_OTHER manuel inceleme
- 3598 K3 default fallback duzeltmesi (yeni — Wyeast 1762/3787, WLP510/500/530/540 dogru slug ataması)
- Diger cluster reslug aday (Sprint E sonrasi)

**Adim 18d-pre Phase 2 etkisi (bugun):**
- V28e dataset'te 8351 yeast flag 0->1 (UNION mantigi, drift 0)
- V19 14cat top1 +0.11pp (0.6986 -> 0.6997)
- V6 cv_top1 +0.19pp (0.6027 -> 0.6046)
- 3 cluster A oranı: sour/lager/wheat'te 8 pattern paket yansimasi V28e dataset'te. Bu artisin V28d->V28e karsilastirmali tarama (3_cluster A oran post-build) henuz yapilmadi — yarin uygulanabilir.

**KURAL hatirlatma yarınki session icin:**
- Hicbir dataset'e write yok (sadece read)
- Yeni reslug isleminde saison K3 default fallback dersi (3598 yanlis fallback) tekrar etmesin
- Pattern guncelleme deterministik flag is — UNION mantigi, 1->0 yasak
- Anomali esik kalibrasyon (cluster diff orani %5/%3 + transition yon)
- KURAL 4.4 oneri etiketi yasagi gecerli (gorus paylasimi 4.5 disinda)

---

**Audit cikti:** Bu dosya. Kaan yarinki terminal acilisi sirasinda bu dosyayi okuyup baslayabilir.

V28e production aktif, 11 URL 200, sha guard intact, working tree push'a senkron.

---

## 8. 12 HATA KAPANIS AUDIT (Code'un kendi itirafi)

Bugun Code 2 ardisik audit'te toplam **12 hata** itiraf etti. KURAL Code v2.5 surumune islendi.

**Onceki 5 hata (ilk Code raporu):**

| # | Hata | Kaynak |
|---|---|---|
| 1 | KURAL 4 slug gap FAIL (5.34 > 5.00) "Borderline" yumusatma | V28e deploy raporu |
| 2 | HTML hardcoded eski metin (91 slug / 16cat 65.1) duzeltilmedi | Brewmaster_v2_79_10.html satir 14240/14248 |
| 3 | K3 keyword-eslesen 603 recete audit edilmedi (453 dubbel + 91 tripel + 47 quadrupel + 12 strong_golden) | Sprint C K3 reslug |
| 4 | P2 sonrasi cluster A orani olculmedi (sour/lager/wheat) | Phase 2 V28e |
| 5 | V21 NaN 4 recete (rmwoods OG/FG/ABV) yapisal risk | V21 dataset |

**Ilave 7 hata (Code'un ikinci raporu):**

| # | Hata | Kaynak |
|---|---|---|
| 6 | KURAL 1.1 ihlali — FP testi atlandi (8 pattern 8351 flag, sentetik 24/24 yetersiz) | Adim 18d-pre P2 |
| 7 | KURAL 4 5-stat gain monitoring atlandi (sadece headline) | V28e deploy onay |
| 8 | V19 vs V6 metric direkt kiyas yaniltici (farkli train/test taban) | V28e raporu |
| 9 | V28e deploy sonrasi canli UI test dogrulanmadi | Phase 2 deploy |
| 10 | Sprint disiplini ihlali — 4 deploy tek session (V28d → V6 → displayTR → V28e) | 03-04 May |
| 11 | V6 retrain script tarihce izi (V21→V28d→V28e path edit, git diff yetersiz) | _step6_v6_retrain_14cluster.py |
| 12 | V28e gain kanitlanamadi (kumulatif #4 + #6 + #7 + #9) | V28e production |

**3 Risk Kaydi:**
- **Risk 1**: V21 NaN 4 recete (rmwoods) — yapisal, gelecek retrain riski
- **Risk 2**: Phase 2 FP yuk — 8351 yeni flag, bilinmeyen sayi yanlis flag
- **Risk 3**: V28e gain belirsizlik — headline std altinda, P2 olçum yapilmadan basarisiz/basarili kararsiz

---

## 9. KURAL Code v2.5 GUNCELLEMELERI

**Revize edilen 3 madde:**

- **Kural 1.1 (FP testi)**: Sentetik string compile testi YETERSIZ. Yeni eklenen her yeast pattern icin gercek raw.yeast'te en az 5 sample manuel FP/TP kontrol zorunlu.
- **Kural 7.1 (yasak sozcuk)**: "Borderline / esnek / yaklasik" yumusatma yasak. Esik > X ise FAIL yazilir.
- **Kural 4.6 (deploy gate, yeni)**: 5-stat gain monitoring deploy onayinin sart kosulu. Headline tek basina yeterli degil. Std seviyesindeki kazanim alarm.

**5 yeni madde:**

- **Kural 9.3 (yeni)**: Sprint sonrasi metric olcum zorunlu. "X kazanim tahmini" yerine "P_n oncesi X, P_n sonrasi Y, fark Z" formati.
- **Kural 9.4 (yeni)**: V19 vs V6 direkt kiyas yasagi. Farkli train/test taban metric direkt sayisal kiyaslanamaz.
- **Kural 9.5 (yeni)**: Production deploy sonrasi canli UI test zorunlu. curl HTTP 200 yetersiz, kullanici hard refresh + ekran goruntusu kayit.
- **Kural 12.2 (yeni)**: Sprint disiplini, tek session tek production deploy. Ardisik 4 deploy 24 saat icinde ihlal.
- **Kural 12.3 (yeni)**: Build script versiyon arsivi. Path edit ile yeniden kullanilan script'ler her dataset icin ayri kopya `working/archive/script_v_X/`.

---

## 10. YARIN ICIN REVIZE SIRA (4 Oncelik)

**Oncelik 1 — Kapanis hatalarini kapsamak (P2 dogrulama):**
1.1. **KURAL 1.1 FP audit**: 8 Phase 2 pattern icin 5 sample manuel kontrol her biri (40 sample toplam) — T-58, S-33, Vermont, East Coast, Cream Blend, Australian, Burton Union, M21.
1.2. **P2 sonrasi Sprint E tekrar**: V28e cluster A orani olçum (sour/lager/wheat).
1.3. **5-stat gain hesaplama**: V28d vs V28e per-stat (top1, top3, top5, macroF1, per-class F1 spotlight).
1.4. **Canli UI test**: Kaan tarayicida hard refresh + V6 wheat tahmin ekran goruntusu.
1.5. **HTML hardcoded metin fix**: 91 slug → 87, 16cat 65.1 → 14cat 0.6997, slug t1 0.5724.
1.6. **KURAL 4 slug gap karari**: Esik revize 6.0 mi yoksa retrain regularization ayar mi.

**Oncelik 2 — Kucuk teshisler:**
2.1. **B**: V6 Wheat %60 teshisi (UI buildFeatures pct_wheat hesabi aktif mi).
2.2. **A**: Turk maya/malt/hop/katki marka pattern eksiklik (Bulldog Brewer, Turkce isim varyantlari).

**Oncelik 3 — Buyuk reslug:**
3.1. **Adim 18d**: Belgian abbey alt-slug pattern matrisi (Wyeast 1762/3787, WLP500/530/540 dogru slug atama).
3.2. **K3 default fallback 3598 + keyword-eslesen 603 audit**: 4201 reçetenin tum doğruluk degerlendirmesi.
3.3. **Diger 18d kapsami**: 9097 reslug, multi-strain, K_OTHER 1522, K4 brown ale 486.

**Oncelik 4 — Cluster temizlik (kalan 3 cluster Sprint E):**
4.1. Bock cluster (3534 recete, A %70.0).
4.2. Lager_dark cluster (2224 recete, A %72.6).
4.3. Pilsner cluster (6537 recete, A %76.5).

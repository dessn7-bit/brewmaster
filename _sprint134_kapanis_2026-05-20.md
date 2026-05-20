# Sprint 134 Kapanış Raporu — 2026-05-20

## Özet

Sprint 134 (Editör vintage migration + UX polish) **21 sub-sprint** ile tamamlandı.
SW cache: **v131-37 → v131-58** (21 sürüm). HTML: **+1368 satır / -425 satır** (sw.js dahil).

**Production**: GitHub Pages canlı (commit `4203781` + `134-K`).
**Snapshot**: `Brewmaster_v2_79_10.SNAPSHOT.E.sprint134-final.html` (2,975,047 bayt, byte-identical production).

## Sprint 134 Commit Zinciri

| Sub-sprint | Commit | SW | Açıklama |
|---|---|---|---|
| 134-Q | `40e189a` | v131-38 | Toplu mekanik hex swap + HTML title fix |
| 134-A | `5f74498` | v131-39 | Hesap tab 5 akordiyon (`hesap-bath/export/priming/...`) |
| 134-B | `ded68eb` | v131-40 | Su tab 5 akordiyon |
| 134-C | `1c427b5` | v131-41 | Süreç tab 5 akordiyon |
| 134-D | `c6c413b` | v131-42 | Katki tab 4 akordiyon |
| 134-E | `4884f23` | v131-43 | Not tab 3 akordiyon |
| 134-F | `32d5d42` | v131-44 | Sync modal layout polish |
| 134-G | `bd537be` | v131-45 | `bm-toast` vintage + 7 alert dönüşüm |
| 134-H | `bb28457` | v131-46 | Form input `:focus` + checkbox/radio vintage |
| 134-bl-1 | `e29bbe0` | v131-47 | Malt/Hop inline muadil chip (`.bm-muadil-inline-chip`) |
| 134-bl-2 | `c1a29f6` | v131-48 | `--bakir` / `--vintage` CSS variable konsolidasyon |
| 134-bl-3 | `3239a1f` | v131-49 | Mobile long timeline horizontal scroll |
| 134-bl-4 | `81c18ca` | v131-50 | `hop_azalt` advanced action (miktar+isim parse) |
| 134-bl-6 | `56a0255` | v131-51 | Chip stok auto-decrement (`bmStokDusurTek`) |
| 134-bl-7 | `b17c450` | v131-52 | Chip miktar artır duplicate önle |
| 134-bl-8 | `67e0d7d` | v131-54 | Action chip disabled state (`bmDoctorChipDisable`) |
| 134-GERI | `eb6e059` | v131-53 | Editör breadcrumb → tek `← Geri` tuşu |
| 134-TEMA | `e3e1631` | v131-55 | Editör Düzenle/Görüntüle toggle vintage düzeltme |
| 134-AYAR | `86c7c48` | v131-56 | Stok 3 ana sekme `[Stok|Ayarlar|Bildirimler]` |
| 134-S | `4203781` | v131-57 | Loading skeleton + Error state + `bm-disabled` |
| 134-K | (bu) | v131-58 | Sprint 134 kapanış + Snapshot E |

> Not: 134-bl-5 atlandı (bl-7 zaten duplicate önlemi içeriyordu).

## Önemli Keşifler ve Kararlar

### Mimari kararlar

- **134-bl-2 CSS variable konsolidasyonu**: `--bakir #8B5A2B` (rgb(139,90,43) literal) konuruldu — `var(--bakir)` recursion riski nedeniyle, `--vintage #B8763F` (rgb(184,118,63)) **yeni** brand primary olarak eklendi. Mevcut `--bakir` semantic'i (RTL referans, kahve gradient'lerinde, label colors) override edilmedi.
- **134-bl-3 Gantt timeline**: Multi-row wrap reddedildi (semantic Gantt = tek-row), horizontal scroll uygulandı (`overflow-x: auto`).
- **134-TEMA Düzenle/Görüntüle toggle**: CSS 132-I'den beri vintage hex (`#B8763F`), **mor hiç olmamış**. Kaan'ın "mor" algısı pasif buton koyu kahve banner üzerinde `transparent + color:var(--bakir)` ile görünmezleşmesinden (aktif amber lozenge yalnız kalıyordu, algısal yanılgı). Fix: pasif buton cream rgba text + subtle dark overlay.
- **134-bl-8 disable semantic**: `malt_azalt` action sadece setSekme + highlight (`S.maltlar` mutate **etmez**) → disable YAPILMAZ. `hop_azalt` gerçek gram azaltıyorsa (`S.hoplar` mutate) → disable YAPILIR. KRİTİK kural: "S.hoplar/S.maltlar değişti mi → disable; değişmedi → bırak".
- **134-AYAR scope kararı**: rStok'a mimari değişiklik DEĞİL → wrapper dispatch (2 erken-return + bar prepend), mevcut `stokEkranTab` (Liste/Hareketler) iç sistemi DOKUNULMAZ kaldı.
- **134-S motor predict path**: V12/F1/Strategy C `predictRawWith` 22ms cold-start — skeleton görünmeyecek kadar hızlı, SKIP. Asıl yavaş nokta Firebase sync (network bound). Motor predict catch'lere DOKUNULMADI (Kaan teyit), sadece Firebase `syncGonder`/`syncAl` catch'lere 30sn cooldown'lu `_syncErrorToast`.

### Süreç dersleri

- **PowerShell `-NoNewline` CRLF riski** (134-E kazası): Out-File/Set-Content default UTF-16 + CRLF normalization HTML dosyaya zarar verdi, `git checkout` ile restore. Sonraki edit'lerde `Edit` tool tercih edildi.
- **Wrangler 4.x `--remote` flag** (memory KURAL): R2 upload default `--local` emulator! Production için zorunlu (sprint 134'te direkt ilgili değil ama deploy disiplinine referans).

## Kapsam

**Editör akordiyon sistemi tamamlandı** — Genel (132-D) + Hesap (134-A) + Su (134-B) + Süreç (134-C) + Katki (134-D) + Not (134-E) = **6 tab × ~25 akordiyon**.

**Takvim** (132-F alarm sistemi) intact ve 134-AYAR Bildirim sekmesinde `_alarmlariOku()` ile entegre edildi.

**Reçete Doktoru chip aksiyon zinciri** tamamlandı: bl-1 (muadil) + bl-4 (hop_azalt detail) + bl-6 (stok decrement) + bl-7 (duplicate önle) + bl-8 (disabled state).

## Korunan Invariantlar

- **Motor zinciri**: B1_v8 (ONNX cluster) + V12c_v5 (V19 XGBoost slug+cluster) + V20 (α=0.30 XGBoost) + F1 (V19+V20 blend) + Strategy C (hierarchical V_cluster) — DOKUNULMADI.
- **S.brewLog**: 11 log tip + auto side-effects (FG_olcum → S.fg, sicaklik → S.fermSicaklik, vs.) intact.
- **Hesap motoru**: IBU (Tinseth/Rager), SRM (Morey), OG/FG recalc, attenuation drift — dokunulmadı.
- **DATA hex'leri**: `srmR` (renk hesabı), kategori palet, hop origin renkleri, kondisyon faz `#8B3A8B` — DATA semantic, dokunulmadı.
- **Firebase sync**: 132-fix-1 URL strip + 132-fix-2 cihaz filter MERGE mantığı — dokunulmadı, 134-S sadece catch'lere toast ekledi.
- **132-I mode toggle** (Düzenle/Görüntüle): body[data-mode] + `.bm-edit-only` 9 nokta + `.bm-edit-only-acc` 3 nokta + `bm_recete_mode` LS — dokunulmadı.

## Final Sanity (Snapshot E)

- Snapshot E byte-identical production HTML ✓
- Kritik UI class'lar present: `bm-stok-anatabs`, `bm-toast`, `bm-skeleton`, `bm-disabled`, `bm-mode-toggle`, `bm-doctor-cozum-chip`, `bm-muadil-inline-chip`, `bm-acc`, `bm-hop-highlight` ✓
- Kritik helper fn'ler present: `bmStokDusurTek`, `bmDoctorChipDisable`, `_syncErrorToast`, `rStokAyarlar`, `rStokBildirim` ✓
- Accordion ID konvansiyonu: `hesap-bath`, `hesap-export`, `hesap-priming`, `recete-profili`, `stil-tahmin`, `maya-sec`, `malt-ekle`, `hop-ekle`, `fermentasyon` (dash-separated, kebab-case) ✓
- Editör breadcrumb (`bm-breadcrumb`) **kaldırıldı** (134-GERI), header listede `bm-header-breadcrumb` (recete sayım) intact ✓

## Kapatılan Backlog

Sprint 132/133'ten taşınan **7 madde** sprint 134 bl-1...bl-8 zincirinde kapandı (bl-5 atlandı; bl-7 zaten duplicate önle kapsadı):

| Madde | Kapama commit |
|---|---|
| Malt/Hop muadil inline chip | bl-1 (`e29bbe0`) |
| CSS variable konsolidasyon (–bakir literal) | bl-2 (`c1a29f6`) |
| Mobile Gantt horizontal scroll | bl-3 (`3239a1f`) |
| hop_azalt advanced parse | bl-4 (`81c18ca`) |
| Chip stok auto-decrement | bl-6 (`56a0255`) |
| Chip miktar artır duplicate önle | bl-7 (`b17c450`) |
| Action chip disabled state | bl-8 (`67e0d7d`) |

## Sıradaki Backlog (Sprint 135+)

- **Firebase DB security rules** (A1.b UID whitelist hardening): ~2.5h, Kaan API key + Console user gerekli
- **Netlify eski site silme**: Adım 124 sonrası, GitHub Pages canlı (memory `reference_production_hosting.md` ile uyumlu)
- **HTML title/manifest tutarsızlık**: varsa kontrol edilmeli (134-Q'da title fix vardı, manifest gözden kaçtı mı?)

## Drive Push Talimatı

CLAUDE.md kuralı: parent `18sZbIP7ELOzkEQ-GQoXiHTAWFIEgTkR-`.

- **Küçük dosyalar (MCP)**: `sw.js` (~16KB) + bu rapor (`_sprint134_kapanis_2026-05-20.md`, ~10KB) → Kaan'ın MCP setup'ı varsa script push edebilir, ben Drive MCP'sine erişimim yok.
- **Büyük dosyalar (Kaan manuel)**:
  - `Brewmaster_v2_79_10.html` (~2.97MB)
  - `Brewmaster_v2_79_10.SNAPSHOT.E.sprint134-final.html` (~2.97MB)
  
  Pattern: aynı isim, duplicate oluşsun (Drive modifiedTime desc ile en güncel okur). Snapshot E ayrı dosya (versiyon arşivi).

## Özet Tablo

| Metrik | Değer |
|---|---|
| Sub-sprint sayısı | 21 (134-Q, A-H, bl-1/2/3/4/6/7/8, GERI, TEMA, AYAR, S, K) |
| SW cache aralığı | v131-37 → v131-58 (21 sürüm) |
| Toplam değişim | +1368 / -425 satır (HTML + sw.js) |
| Snapshot dosyası | `Brewmaster_v2_79_10.SNAPSHOT.E.sprint134-final.html` (2.97 MB) |
| Kapsam | Editör 6 tab × 25 akordiyon + Reçete Doktoru chip zinciri + Stok ekran sekme + UI primitive'leri |
| Motor zinciri | DOKUNULMADI (B1_v8 + V12c_v5 + V20 + F1 + Strategy C intact) |
| Kapatılan backlog | 7 madde (132/133 → 134-bl-*) |
| Production durumu | GitHub Pages canlı (`4203781` + 134-K commit) |

# Adım 13a — Debug log geçici push

## Komutlar

```
git add Brewmaster_v2_79_10.html
git commit -m "DEBUG (geçici): V6 adapter feature çıktısı console.log — Adım 13 sonrası revert edilecek"
git push origin main
```

## Eklenen kod

`Brewmaster_v2_79_10.html` line 13391-13393 (V6 adapter, `classifyMulti` çağrısının hemen öncesinde):

```js
// DEBUG (geçici, Adım 0): adapter'ın V6'ya gönderdiği features objesi
console.log('%c[BM V6 ADAPTER DEBUG] features:', 'background:#FF9800;color:#000;padding:2px 6px;font-weight:bold', __v6Features);
console.log('[BM V6 ADAPTER DEBUG] __recipeV2:', __recipeV2);
```

## Commit

```
0f5361e DEBUG (geçici): V6 adapter feature çıktısı console.log — Adım 13 sonrası revert edilecek
1 file changed, 3 insertions(+)
```

## Push

```
To https://github.com/dessn7-bit/brewmaster.git
   91a9f22..0f5361e  main -> main
```

## Netlify deploy

Push tetiklendi, auto-deploy başladı. ~1-2 dk içinde canlıda olur.

## Kaan'ın yapacağı

1. **Hard refresh** (Ctrl+F5 / Cmd+Shift+R) — browser cache'i atla
2. **Muzo reçetesini aç**
3. **F12 → Console**
4. Turuncu arka planlı `[BM V6 ADAPTER DEBUG] features:` log'unu gör (object'i expand et)
5. Object'in **ekran görüntüsü** Opus'a gönder (özellikle: og, fg, abv, ibu, srm, yeast_*, pct_*, mash_temp_c, fermentation_temp_c, water_*, lagering_days, dry_hop_days, yeast_attenuation, boil_time_min değerleri kritik)

## Geri alma planı (Adım 13 sonrası)

`Brewmaster_v2_79_10.html` line 13391-13393'teki 3 satır debug kod adapter düzeltme commit'inde silinecek. Debug log production'da kalmayacak.

## Durum: ✅

## Tek satır yorum

Debug log ekleyip commit 0f5361e push edildi (3 satır, parse-guard temizdi); Netlify deploy ~1-2 dk, Kaan hard refresh + Muzo + F12 console ekran görüntüsü gönderecek; Adım 13 commit'inde debug temizlenecek.

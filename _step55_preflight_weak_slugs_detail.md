# Adım 55 Pre-flight B — V18.1 ≤250 Reçeteli Slug Detay

**Tarih:** 2026-04-29  
**Slug count:** 16 (≤250 reçete, %V18 ≤0.083)

Bu slug'lar zayıf-orta sınırda — train edilebilir ama küçük örneklem (top-1 metric istatistiksel gürültü).

---

## Detay tablosu (16 satır)

### belgian_quadrupel (n=15)

- **Cluster:** belgian
- **Reçete sayısı:** V18 = 15, V17 = 15 (+0 fark)
- **Source baskınlık:** rmwoods 0 (0%) / non-rm 15 (100%)
- **Holdout (test n=3):** top-1 = 0.0%, top-3 = 33.3%
- **Yanlış predict edildiği top 3 slug:** stout (1), belgian_blonde_ale (1), belgian_strong_dark_ale (1)
- **BJCP plausibility (5 sample):** 80% range içinde
- **Need to strengthen ≥500:** +485 reçete daha lazım

### american_barleywine (n=16)

- **Cluster:** barleywine
- **Reçete sayısı:** V18 = 16, V17 = 16 (+0 fark)
- **Source baskınlık:** rmwoods 0 (0%) / non-rm 16 (100%)
- **Holdout (test n=3):** top-1 = 33.3%, top-3 = 66.7%
- **Yanlış predict edildiği top 3 slug:** british_barley_wine_ale (1), american_india_pale_ale (1)
- **BJCP plausibility (5 sample):** 100% range içinde
- **Need to strengthen ≥500:** +484 reçete daha lazım

### sweet_stout_or_cream_stout (n=19)

- **Cluster:** stout
- **Reçete sayısı:** V18 = 19, V17 = 19 (+0 fark)
- **Source baskınlık:** rmwoods 0 (0%) / non-rm 19 (100%)
- **Holdout (test n=4):** top-1 = 50.0%, top-3 = 100.0%
- **Yanlış predict edildiği top 3 slug:** sweet_stout (1), stout (1)
- **Need to strengthen ≥500:** +481 reçete daha lazım

### cream_ale (n=62)

- **Cluster:** cream
- **Reçete sayısı:** V18 = 62, V17 = 62 (+0 fark)
- **Source baskınlık:** rmwoods 0 (0%) / non-rm 62 (100%)
- **Holdout (test n=12):** top-1 = 41.7%, top-3 = 58.3%
- **Yanlış predict edildiği top 3 slug:** american_pale_ale (2), pre_prohibition_lager (2), american_strong_pale_ale (1)
- **Need to strengthen ≥500:** +438 reçete daha lazım

### dunkles_bock (n=69)

- **Cluster:** bock
- **Reçete sayısı:** V18 = 69, V17 = 69 (+0 fark)
- **Source baskınlık:** rmwoods 29 (42%) / non-rm 40 (58%)
- **Holdout (test n=14):** top-1 = 21.4%, top-3 = 64.3%
- **Yanlış predict edildiği top 3 slug:** german_bock (4), baltic_porter (2), german_doppelbock (2)
- **Need to strengthen ≥500:** +431 reçete daha lazım

### brett_beer (n=76)

- **Cluster:** sour
- **Reçete sayısı:** V18 = 76, V17 = 76 (+0 fark)
- **Source baskınlık:** rmwoods 48 (63%) / non-rm 28 (37%)
- **Holdout (test n=15):** top-1 = 6.7%, top-3 = 26.7%
- **Yanlış predict edildiği top 3 slug:** french_belgian_saison (5), mixed_fermentation_sour_beer (3), american_pale_ale (2)
- **BJCP plausibility (5 sample):** 100% range içinde
- **Need to strengthen ≥500:** +424 reçete daha lazım

### german_oktoberfest_festbier (n=80)

- **Cluster:** lager
- **Reçete sayısı:** V18 = 80, V17 = 80 (+0 fark)
- **Source baskınlık:** rmwoods 38 (48%) / non-rm 42 (52%)
- **Holdout (test n=16):** top-1 = 0.0%, top-3 = 25.0%
- **Yanlış predict edildiği top 3 slug:** german_maerzen (6), munich_helles (3), german_koelsch (2)
- **Need to strengthen ≥500:** +420 reçete daha lazım

### kellerbier (n=89)

- **Cluster:** lager
- **Reçete sayısı:** V18 = 89, V17 = 89 (+0 fark)
- **Source baskınlık:** rmwoods 28 (31%) / non-rm 61 (69%)
- **Holdout (test n=18):** top-1 = 5.6%, top-3 = 16.7%
- **Yanlış predict edildiği top 3 slug:** german_maerzen (4), german_pilsener (3), dortmunder_european_export (2)
- **Need to strengthen ≥500:** +411 reçete daha lazım

### gose (n=102)

- **Cluster:** sour
- **Reçete sayısı:** V18 = 102, V17 = 0 (YENİ)
- **Source baskınlık:** rmwoods 97 (95%) / non-rm 5 (5%)
- **Holdout (test n=20):** top-1 = 40.0%, top-3 = 45.0%
- **Yanlış predict edildiği top 3 slug:** south_german_hefeweizen (3), berliner_weisse (3), specialty_beer (2)
- **BJCP plausibility (5 sample):** 100% range içinde
- **Need to strengthen ≥500:** +398 reçete daha lazım

### english_pale_ale (n=102)

- **Cluster:** pale_ale
- **Reçete sayısı:** V18 = 102, V17 = 102 (+0 fark)
- **Source baskınlık:** rmwoods 36 (35%) / non-rm 66 (65%)
- **Holdout (test n=20):** top-1 = 10.0%, top-3 = 20.0%
- **Yanlış predict edildiği top 3 slug:** american_pale_ale (5), extra_special_bitter (3), special_bitter_or_best_bitter (3)
- **Need to strengthen ≥500:** +398 reçete daha lazım

### juicy_or_hazy_india_pale_ale (n=132)

- **Cluster:** ipa
- **Reçete sayısı:** V18 = 132, V17 = 132 (+0 fark)
- **Source baskınlık:** rmwoods 53 (40%) / non-rm 79 (60%)
- **Holdout (test n=26):** top-1 = 23.1%, top-3 = 46.2%
- **Yanlış predict edildiği top 3 slug:** american_india_pale_ale (14), american_pale_ale (5), german_koelsch (1)
- **Need to strengthen ≥500:** +368 reçete daha lazım

### belgian_ipa (n=146)

- **Cluster:** belgian
- **Reçete sayısı:** V18 = 146, V17 = 0 (YENİ)
- **Source baskınlık:** rmwoods 141 (97%) / non-rm 5 (3%)
- **Holdout (test n=29):** top-1 = 3.4%, top-3 = 17.2%
- **Yanlış predict edildiği top 3 slug:** american_india_pale_ale (13), double_ipa (6), belgian_blonde_ale (2)
- **BJCP plausibility (5 sample):** 100% range içinde
- **Need to strengthen ≥500:** +354 reçete daha lazım

### rye_ipa (n=200)

- **Cluster:** ipa
- **Reçete sayısı:** V18 = 200, V17 = 0 (YENİ)
- **Source baskınlık:** rmwoods 197 (98%) / non-rm 3 (2%)
- **Holdout (test n=40):** top-1 = 5.0%, top-3 = 37.5%
- **Yanlış predict edildiği top 3 slug:** american_india_pale_ale (27), double_ipa (6), american_pale_ale (2)
- **BJCP plausibility (5 sample):** 60% range içinde
- **Need to strengthen ≥500:** +300 reçete daha lazım

### golden_or_blonde_ale (n=200)

- **Cluster:** cream
- **Reçete sayısı:** V18 = 200, V17 = 200 (+0 fark)
- **Source baskınlık:** rmwoods 185 (92%) / non-rm 15 (8%)
- **Holdout (test n=40):** top-1 = 5.0%, top-3 = 15.0%
- **Yanlış predict edildiği top 3 slug:** american_pale_ale (12), blonde_ale (11), special_bitter_or_best_bitter (3)
- **Need to strengthen ≥500:** +300 reçete daha lazım

### white_ipa (n=203)

- **Cluster:** ipa
- **Reçete sayısı:** V18 = 203, V17 = 0 (YENİ)
- **Source baskınlık:** rmwoods 201 (99%) / non-rm 2 (1%)
- **Holdout (test n=41):** top-1 = 14.6%, top-3 = 29.3%
- **Yanlış predict edildiği top 3 slug:** american_india_pale_ale (26), american_pale_ale (4), double_ipa (2)
- **BJCP plausibility (5 sample):** 100% range içinde
- **Need to strengthen ≥500:** +297 reçete daha lazım

### mixed_fermentation_sour_beer (n=213)

- **Cluster:** sour
- **Reçete sayısı:** V18 = 213, V17 = 213 (+0 fark)
- **Source baskınlık:** rmwoods 152 (71%) / non-rm 61 (29%)
- **Holdout (test n=43):** top-1 = 27.9%, top-3 = 34.9%
- **Yanlış predict edildiği top 3 slug:** french_belgian_saison (7), specialty_beer (6), american_wheat_ale (4)
- **BJCP plausibility (5 sample):** 100% range içinde
- **Need to strengthen ≥500:** +287 reçete daha lazım

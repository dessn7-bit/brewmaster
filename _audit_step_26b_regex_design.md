# AUDIT STEP 26B — REGEX RECOMPUTE TASARIMI

**Tarih:** 2026-04-26
**Hedef:** V7 dataset için mutually exclusive pct_* regex'leri. Mevcut V6 regex'lerinin pale_ale → pct_pilsner + pct_base double-counting bug'ını çöz.

---

## Kök neden

V2c builder satır 13277 + 13291:

    pilsnerPct: _pctOf(/pilsner|pils|...|pale_ale|.../i),
    baseMaltPct: _pctOf(/pilsner|pils|pale|...|munich|vienna|.../i),

`_pctOf` her bir malt için regex.test çalıştırıp eşleşirse kg ekliyor. **`pale_ale` malt id'si HEM `/pilsner|...|pale_ale/i` HEM `/pilsner|...|pale|.../i` regex'ine uyuyor**. Sonuç: pale_ale her iki feature'a da gidiyor → sum>100.

Aynı şekilde `munich` HEM `pct_munich` HEM `pct_base` (`pilsner|...|munich`)'e düşüyor.

`wheat` malt çift sayım: `pct_wheat` + `pct_oats` (regex `/wheat|...|oat/`) + `pct_base` (`...|wheat`).

## Mutually exclusive tasarım — yöntem değişikliği

**Mevcut yaklaşım:** Her feature için ayrı regex, her malt'a tüm regex'ler test edilir → çakışma garanti.

**Yeni yaklaşım:** Tek bir `classifyMalt(id)` fonksiyonu, her malt'ı **EN FAZLA BİR** kategoriye atar. Öncelik sırası: en spesifik → en genel.

### Sınıflandırıcı pseudo-kod

    function classifyMalt(id) {
      const lid = String(id||'').toLowerCase();
      // En spesifik önce
      if (/^(c\d+|cara|caram|crystal|kristal)/.test(lid)) return 'crystal';
      if (/(carafa|chocolate|choc|cikolata|dehusked)/.test(lid)) return 'choc';
      if (/(roast|black|patent|debittered|roasted_barley|kavrulmus|siyah)/.test(lid)) return 'roast';
      if (/(rauch|smoke|smoked|isli|cherrywood|beechwood)/.test(lid)) return 'smoked';
      if (/(rye|cavdar|roggen)/.test(lid)) return 'rye';
      if (/^(oat|yulaf|flaked_oat)/.test(lid)) return 'oats';
      if (/(wheat|weizen|bugday|weizenmalt|torrified_wheat)/.test(lid)) return 'wheat';
      if (/^(corn|misir|mais|flaked_corn|maize)/.test(lid)) return 'corn';
      if (/^(rice|pirinc)/.test(lid)) return 'rice';
      if (/(sugar|seker|candi|candy|nobet|demerara|turbinado|molasses|honey|maple|invert)/.test(lid)) return 'sugar';
      if (/(aromatic|melanoid|special_b)/.test(lid)) return 'aromatic_abbey';
      if (/(abbey)/.test(lid)) return 'aromatic_abbey';
      if (/^(munich|muenchner|munchner)/.test(lid)) return 'munich';
      if (/^(vienna|viyana)/.test(lid)) return 'vienna';
      if (/^(6.row|sixrow|six.row|6_row)/.test(lid)) return 'sixrow';
      // PALE - kendi grubu (pilsner DEĞİL, base DEĞİL)
      if (/^(pale_ale|pale_malt|maris|maris_otter|golden_promise|halcyon|optic|tipple|chevalier|2.row|two.row)/.test(lid)) return 'pale_ale';
      // PILSNER - sadece pilsner ve eşitleri (pale değil)
      if (/^(pilsner|pils|bohemian|bohem|chateau_pils|extra_pale_pilsner|bel_pils|best_heidel|viking_pils|bohemian_pilsner)/.test(lid)) return 'pilsner';
      // Diğer base
      return 'other';
    }

### Yeni feature seti

V6'daki 16 pct feature → V7'de **18 pct feature** (pct_pale_ale + pct_other yeni):

| V7 Feature | Sınıflandırıcı çıktısı | Eski V6 karşılığı |
|---|---|---|
| pct_pilsner | 'pilsner' | pct_pilsner (kısmi — pale_ale çıkarıldı) |
| **pct_pale_ale** (YENİ) | 'pale_ale' | pct_base'in büyük kısmı |
| pct_munich | 'munich' | pct_munich (pct_base'den çıkarıldı) |
| pct_vienna | 'vienna' | pct_vienna |
| pct_wheat | 'wheat' | pct_wheat (oats çıkarıldı) |
| pct_oats | 'oats' | pct_oats |
| pct_rye | 'rye' | pct_rye |
| pct_crystal | 'crystal' | pct_crystal |
| pct_choc | 'choc' | pct_choc |
| pct_roast | 'roast' | pct_roast |
| pct_smoked | 'smoked' | pct_smoked |
| pct_corn | 'corn' | pct_corn |
| pct_rice | 'rice' | pct_rice |
| pct_sugar | 'sugar' | pct_sugar (honey/maple eklendi) |
| pct_aromatic_abbey | 'aromatic_abbey' | pct_aromatic_abbey |
| pct_sixrow | 'sixrow' | pct_sixrow |
| **pct_other** (YENİ) | 'other' | (kategorize edilemeyen, %0 hedef) |
| **total_base** (DERIVED) | sum(pilsner + pale_ale + munich + vienna + wheat) | (V6 total_dark gibi) |

### Eski → yeni mapping (motorlar uyumsuzluğu)

V7 dataset oluşturulunca:
- pct_pilsner artık SADECE Pilsner-bazlı malt (Belgian Trappist için doğru)
- pct_pale_ale ayrı (American/English için)
- pct_base feature'ı YOK (V6 builder'da hardcoded total_base hesaplanır)
- Sum-of-pcts hedef ~100 (mutually exclusive garanti)

**V6 motoru bu yeni feature setiyle çalıştırılamaz** — model 79 feature'a göre eğitilmiş. V7 motoru sıfırdan yeni feature setiyle eğitilecek.

### Doğrulama testi (taslak — recompute imkanı varsa koşturulacak)

Pre-recompute (mevcut V6 dataset):
- Sum<95: 27 (%2.5)
- Sum 95-105: 573 (%52.1)
- Sum>105: 500 (%45.5)

Post-recompute (V7 hedef):
- Sum<95: ~5% (kategorize edilemeyen "other" maltlar)
- Sum 95-105: ~85% (mutually exclusive garanti)
- Sum>105: ~10% (round-off + nadir overlap)

### Edge case'ler

- `caraamber` → 'crystal' (cara önde, doğru)
- `chateau_munich` → 'munich' (^munich check'inden geçmez ama farklı pre-process gerek). **Çözüm:** prefix match yerine substring + öncelik sırası. Ek geliştirme.
- `melanoidin` → 'aromatic_abbey' (özel kategori) — Kaan'ın muhtemelen Belçika abbey için kullanmak istediği malt sınıfı.
- `2.row` veya `two.row` → 'pale_ale' (Amerikan 2-row malt = pale ale)
- Türkçe id'ler (`bugday`, `cavdar`, `yulaf`, `misir`, `pirinc`, `seker`) tüm kategorilerde mevcut.

### Risk değerlendirmesi

- **Re-train zorunluluğu:** V7 yeni feature seti → V6 motoru artık eski dataset üstüne kurulu, V7 dataset farklı. V7 motoru sıfırdan eğitilmeli.
- **Production etkisi:** V6 motor production'da kalmaya devam eder. V7 hazır olunca canary deployment ile değiştirme.
- **Recompute engeli:** Mevcut V6 dataset kayıtlarda raw malt listesi tutmuyor (sadece computed features). Yeniden hesaplama için kaynak reçeteler (BYO/Brulosophy/brewery clones) tekrar toplanmalı. **Bu Adım 26C'nin en büyük blokeri.**

### Implementation hint (V7 için)

V2c builder'da `__recipeV2.percents` objesi yerine:

    percents: (function(){
      const buckets = {pilsner:0, pale_ale:0, munich:0, vienna:0, wheat:0, oats:0, rye:0,
                      crystal:0, choc:0, roast:0, smoked:0, corn:0, rice:0, sugar:0,
                      aromatic_abbey:0, sixrow:0, other:0};
      const top = _toplamMaltKg || 1;
      (S.maltlar||[]).forEach(m=>{
        if(!m||!m.id) return;
        const cat = _classifyMalt(m.id);
        buckets[cat] += (m.kg||0);
      });
      // Convert to pct
      const pct = {};
      Object.keys(buckets).forEach(k=>{ pct['pct_'+k] = buckets[k]/top*100; });
      pct.total_base = pct.pct_pilsner + pct.pct_pale_ale + pct.pct_munich + pct.pct_vienna + pct.pct_wheat;
      return pct;
    })(),

V7 motoru bu temiz feature setiyle eğitilir → KNN distance ölçeği daha tutarlı, sum>150 patolojisi yok.

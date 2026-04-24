// Ground truth benchmark feedback patch round 1
// Motor'a gerçek reçete verisinden öğrenilenler
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'STYLE_DEFINITIONS.json');
const defs = JSON.parse(fs.readFileSync(file, 'utf8'));

let changes = [];

// ─── P1: Yeast marginal bonus düşür (sadece LAGER stilleri — ale'yi marginal kabul ediyorlar) ───
// Lager style'larda ale yeast marginal +15 çok yüksek. Onları 5'e düşür.
// Ale styles kendi cross-yeast'lerini koru.
const LAGER_CATEGORIES_TO_TIGHTEN = ['lager','stout_porter','strong_ale']; // baltic_porter lager cat
Object.entries(defs).forEach(([slug, def]) => {
  const y = def.thresholds?.yeast;
  if (!y || !y.marginal) return;
  // Sadece lager ailesi
  const isLager = LAGER_CATEGORIES_TO_TIGHTEN.includes(def.category) && slug.includes('lager') ||
                  slug === 'baltic_porter' || slug.includes('baltic') || slug.includes('pilsen') ||
                  slug.includes('helles') || slug.includes('bock') || slug.includes('dunkel');
  if (isLager && y.marginal.scoreBonus > 5) {
    y.marginal.scoreBonus = 3;
    changes.push(slug + ': lager yeast.marginal → 3');
  }
});

// P2 atlandı — çok agresifti, legit matches'ı kırıyordu.

// ─── P3: American Brown SRM sıkılaştır ─────────────────────────
// Stout reçeteleri (SRM 30+) American Brown olarak sınıflanıyor
{
  const t = defs.american_brown_ale?.thresholds;
  if (t && t.srm) {
    t.srm.safe = {min:18, max:30, scoreBonus:15};
    t.srm.marginal = {min:14, max:35, scoreBonus:5};
    t.srm.exclusion2 = {min:40, hardZero:true, reason:'American Brown: SRM çok koyu (Stout territory)'};
    changes.push('american_brown_ale: SRM tightened (safe 18-30)');
  }
}
{
  const t = defs.english_brown_ale?.thresholds;
  if (t && t.srm) {
    t.srm.exclusion2 = {min:40, hardZero:true, reason:'English Brown: SRM çok koyu'};
    changes.push('english_brown_ale: SRM exclusion2 added');
  }
}

// ─── P4: Imperial Red Ale'da malt bonusları %0'da fire etmesin ──
// phantom bonus fix motor seviyesinde yapıldı ama definition-level ayrıca
// malt.munichPct.safe = {max:XX} gibi tanımlı — min eklemek de iyi ek güvence
[
  'imperial_red_ale','double_hoppy_red_ale','american_strong_pale_ale',
  'american_amber_red_ale','american_pale_ale',
].forEach(slug => {
  const m = defs[slug]?.thresholds?.malt;
  if (!m) return;
  Object.entries(m).forEach(([k, rule]) => {
    if (rule.safe && rule.safe.min == null) {
      // min yoksa 1 ekle (pct > 0 gerekli)
      rule.safe.min = 1;
      changes.push(slug + ': malt.'+k+'.safe.min → 1');
    }
  });
});

// ─── P5: Baltic Porter ale yeast exclusion (strict lager) ──────
{
  const y = defs.baltic_porter?.thresholds?.yeast;
  if (y) {
    // Ale, wheat, vs. hepsi exclusion (sadece lager). Önceden marginal idi.
    y.marginal = undefined;
    y.exclusion.types = ['ale','wheat','wit','belcika','saison','kveik','sour'];
    changes.push('baltic_porter: ale yeast → strict exclusion');
  }
}

fs.writeFileSync(file, JSON.stringify(defs, null, 2));
console.log('\n✓ ' + changes.length + ' değişiklik uygulandı.');
console.log('STYLE_DEFINITIONS.json boyutu:', (fs.statSync(file).size/1024).toFixed(1), 'KB');

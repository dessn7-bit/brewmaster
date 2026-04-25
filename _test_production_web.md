# V6.2 PRODUCTION WEB TEST

## Test Case: Dark Belgian Dubbel
**URL**: magical-sopapillas-bef055.netlify.app

### Recipe Input:
- **OG**: 1.062
- **FG**: 1.012  
- **ABV**: 6.62%
- **IBU**: 16
- **SRM**: 38
- **Maya**: BB Abbaye (Belgian)
- **Malt**: 
  - Pilsner: 70%
  - Munich: 15% 
  - Crystal 60: 10%
  - Chocolate: 5%
- **Hop**: EKG

### Expected Result:
- ✅ **belgian_dubbel in top-3** (was missing completely in V5)
- ✅ **Rule system active** (wRule: 0.1, rule_contrib > 0)
- ❌ **belgian_witbier excluded** (SRM 38 vs witbier range 2-4)

### Testing Steps:
1. Deploy to Netlify with rule system enabled (w_rule: 0.1)
2. Open web interface
3. Enter recipe specifications
4. Check browser console for V6.2 motor output
5. Verify rule_contrib > 0 in console meta
6. Check if belgian_dubbel appears in top-3
7. Verify witbier is excluded or heavily penalized

### Critical Fix Applied:
**File**: Brewmaster_v2_79_10.html:13778
**Change**: `w_rule: 0.0` → `w_rule: 0.1`
**Impact**: Enables cross-field constraint checking (SRM boundaries, yeast exclusions)

### Next Steps:
- If rule system works in web but fails in programmatic test → programmatic test environment issue
- If rule system still inactive in web → deeper rule implementation bug
- If belgian_dubbel still missing → may need stronger rule weight or different approach
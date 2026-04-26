// Track B: TMF Phase 2 — fetch + regex parse remaining ~226 posts
// Etik: 2 sec delay between fetches, single sequential
const fs = require('fs');
const https = require('https');
const http = require('http');

// All 226+ URLs from the index page (extracted from WebFetch response in Adım 32)
const TMF_URLS = [
  // American IPA
  ['american_bitter','http://www.themadfermentationist.com/2011/01/second-runnings-american-bitter-recipe.html','american_india_pale_ale'],
  ['citra_papaya_pale','http://www.themadfermentationist.com/2010/05/citra-papaya-pale-ale-recipe.html','pale_ale'],
  ['double_hop_bomb','https://www.themadfermentationist.com/2010/02/big-ipa-recipe-1-lb-of-hops.html','double_ipa'],
  ['fresh_hop_pale','http://www.themadfermentationist.com/2010/09/wet-hopped-pale-ale-recipe.html','pale_ale'],
  ['galaxy_dipa','http://www.themadfermentationist.com/2011/09/galaxy-hopped-double-ipa.html','double_ipa'],
  ['galaxy_rakau_dipa','http://www.themadfermentationist.com/2012/11/southern-hemisphere-hopped-double-ipa.html','double_ipa'],
  ['grapefruit_pale','http://www.themadfermentationist.com/2013/06/grapefruit-american-pale-ale-recipe.html','pale_ale'],
  ['homegrown_apa','http://themadfermentationist.com/2007/12/home-grown-pale-ale-recipe-and-first_21.html','pale_ale'],
  ['nelson_jr_micro','http://www.themadfermentationist.com/2011/08/micro-ipa-with-nelson-sauvin.html','session_india_pale_ale'],
  ['nc_ipa','http://www.themadfermentationist.com/2013/10/north-carolina-malt-and-hop-ipa.html','american_india_pale_ale'],
  ['pliny_younger_v1','http://themadfermentationist.com/2007/03/pliny-younger-clone-tasting-and-recipe.html','double_ipa'],
  ['real_ipa','http://www.themadfermentationist.com/2014/10/american-ipa-recipe-tips-and-tasting.html','american_india_pale_ale'],
  ['rings_of_light','https://www.themadfermentationist.com/2018/10/rings-of-light-hazy-pale-ale.html','juicy_or_hazy_india_pale_ale'],
  ['session_vienna_ipa','http://www.themadfermentationist.com/2012/01/vienna-malt-session-ipa-recipe.html','session_india_pale_ale'],
  ['hoppy_unbirthday','http://www.themadfermentationist.com/2012/07/standard-american-pale-ale-recipe-yeah.html','pale_ale'],
  ['west_coast_ipa','http://www.themadfermentationist.com/2012/12/west-coast-ipa-recipe-hop-oil-analysis.html','west_coast_india_pale_ale'],
  // NEIPA
  ['cheater_hops_v1','https://www.themadfermentationist.com/2017/09/citra-galaxy-neipa-bioconversion.html','juicy_or_hazy_india_pale_ale'],
  ['cheater_hops','https://www.themadfermentationist.com/2018/02/sapwood-cellars-cheater-hops-ne-dipa.html','juicy_or_hazy_double_india_pale_ale'],
  ['conan_ipa','http://www.themadfermentationist.com/2013/11/conan-ipa-and-yeast.html','american_india_pale_ale'],
  ['denali_haze','https://www.themadfermentationist.com/2018/04/denali-hazy-daze-neipa.html','juicy_or_hazy_india_pale_ale'],
  ['good_chit','https://www.themadfermentationist.com/2017/11/new-england-pale-ale-brewing-video.html','juicy_or_hazy_india_pale_ale'],
  ['ne_australian_ipa','http://www.themadfermentationist.com/2017/04/australian-neipa-spunding-and-dry-yeast.html','juicy_or_hazy_india_pale_ale'],
  ['neipa_lupulin','http://www.themadfermentationist.com/2017/07/cryo-lupulin-neipa-citra-mosaic.html','juicy_or_hazy_india_pale_ale'],
  ['ruby_red_neipa','http://www.themadfermentationist.com/2017/07/ruby-red-grapefruit-neipa.html','juicy_or_hazy_india_pale_ale'],
  ['sapwood_session','https://www.themadfermentationist.com/2018/01/american-oat-ale-brew-day-dry-hop.html','session_india_pale_ale'],
  ['session_session_ipa','http://www.themadfermentationist.com/2017/06/23-abv-session-neipa.html','session_india_pale_ale'],
  ['simcoe_sons','http://www.themadfermentationist.com/2013/11/focus-on-brewing-ph-american-pale-ale.html','pale_ale'],
  ['soft_juicy_ipa','http://www.themadfermentationist.com/2015/06/hop-juice-north-east-ipa-recipe.html','juicy_or_hazy_india_pale_ale'],
  ['softer_juicier_apa','http://www.themadfermentationist.com/2015/10/softer-juicier-and-uglier-apa.html','juicy_or_hazy_india_pale_ale'],
  // Other IPAs
  ['blazing_world_1','http://www.themadfermentationist.com/2012/03/india-amber-ale-recipe.html','imperial_red_ale'],
  ['blazing_world_2','http://www.themadfermentationist.com/2012/06/dank-amber-ipa-rebrew.html','imperial_red_ale'],
  ['blazing_world_3','http://www.themadfermentationist.com/2013/01/dank-amber-ipa-3-san-diego-water.html','imperial_red_ale'],
  ['india_brown_ale','http://themadfermentationist.com/2009/03/hoppy-brown-ale-india-brown-ale.html','american_amber_red_ale'],
  ['india_red_ale','http://www.themadfermentationist.com/2011/04/india-red-ale-recipe.html','imperial_red_ale'],
  ['red_rye_ipa_1','http://www.themadfermentationist.com/2012/08/india-red-rye-ale-recipe.html','rye_ipa'],
  // Other Hoppy / Roasty
  ['fortunate_islands_1','http://www.themadfermentationist.com/2012/05/hoppy-american-wheat-beer-recipe.html','american_wheat_ale'],
  ['fortunate_islands_2','http://www.themadfermentationist.com/2012/07/citrusy-hopped-american-wheat-rebrew.html','american_wheat_ale'],
  ['hoppy_american_tripel','http://themadfermentationist.com/2008/03/hoppy-american-tripel.html','belgian_tripel'],
  ['alderwood_smoked_porter','http://themadfermentationist.com/2008/09/alderwood-smoked-imperial-porter.html','smoke_porter'],
  ['bean_nut_milk_stout','http://www.themadfermentationist.com/2014/12/coconut-vanilla-milk-stout-recipe.html','sweet_stout'],
  ['black_house_1','http://www.themadfermentationist.com/2012/04/adding-oats-to-boil-coffee-stout.html','coffee_beer'],
  ['black_house_2','http://www.themadfermentationist.com/2012/06/toasted-oat-coffee-stout.html','coffee_beer'],
  ['black_house_3','http://www.themadfermentationist.com/2013/01/oatmeal-cofee-stout-3-bigger-and-bolder.html','coffee_beer'],
  ['breakfast_stout_riff','http://themadfermentationist.com/2009/11/breakfast-stout-riff.html','american_imperial_stout'],
  ['chocolate_pumpkin_porter','http://themadfermentationist.com/2008/11/chocolate-pumpkin-porter.html','pumpkin_spice_beer'],
  ['chocolate_butternut_porter','http://www.themadfermentationist.com/2015/09/chocolate-butternut-squash-porter-recipe.html','pumpkin_squash_beer'],
  ['kate_great','http://www.themadfermentationist.com/2011/04/portsmouth-kate-great-clone-recipe.html','american_imperial_stout'],
  ['meadowfoam_honey_stout','http://www.themadfermentationist.com/2015/03/meadowfoam-honey-oatmeal-stout.html','oatmeal_stout'],
  ['rumble_imperial','http://www.themadfermentationist.com/2012/10/rumble-barrel-cinnamonvanilla-imperial.html','american_imperial_stout'],
  ['simcoe_stout','http://www.themadfermentationist.com/2014/12/coconut-vanilla-milk-stout-recipe.html','american_imperial_stout'],
  ['whisky_barrel_rye_stout','http://www.themadfermentationist.com/2012/11/malt-whisky-barrel-rye-stout-recipe.html','american_imperial_stout'],
  // American Other
  ['adambier','http://themadfermentationist.com/2009/05/adambier-hotd-adam-clone.html','specialty_historical'],
  ['big_brew_barleywine','http://themadfermentationist.com/2008/05/group-leftovers-barleywine.html','american_barleywine'],
  ['dave_clone','http://themadfermentationist.com/2009/06/eisadam-hotd-dave-clone.html','eisbock'],
  ['golden_american_wheat','http://www.themadfermentationist.com/2011/07/golden-american-wheat-recipe.html','american_wheat_ale'],
  ['liquor_spiked_barleywine','http://themadfermentationist.com/2008/07/liquor-spiked-barleywine.html','american_barleywine'],
  ['local_peach_wheat','http://www.themadfermentationist.com/2011/09/homebrewing-with-local-ingredients.html','fruit_wheat_beer'],
  ['maple_bourbon_adam','http://www.themadfermentationist.com/2015/03/matt-and-maple-bourbon-adam.html','specialty_historical'],
  // Belgian Sour
  ['acorn_oud_bruin','https://www.themadfermentationist.com/2018/12/fermented-acorn-sour-brown.html','oud_bruin'],
  ['dcambic','http://www.themadfermentationist.com/2011/05/american-lambic-spontaneous.html','belgian_lambic'],
  ['cherry_wine','https://www.themadfermentationist.com/2017/12/cherry-wine-flanders-red-recipe.html','flanders_red_ale'],
  ['flanders_pale','http://themadfermentationist.com/2007/08/funky-pale-ale-recipe.html','american_wild_ale'],
  ['flanders_red_again','http://themadfermentationist.com/2008/05/with-re-release-of-wyeasts-roeselare.html','flanders_red_ale'],
  ['funky_dark_saison_1','http://themadfermentationist.com/2008/10/dark-orange-rosemary-saison.html','specialty_saison'],
  ['funky_dark_saison_2','http://themadfermentationist.com/2009/11/funky-dark-saison-with-black-cardamom.html','specialty_saison'],
  ['funky_dark_saison_3','http://www.themadfermentationist.com/2010/12/fig-honey-anise-dark-sasion.html','specialty_saison'],
  ['funky_dark_saison_4','http://www.themadfermentationist.com/2012/01/american-farmhouse-currant-dark-saison.html','specialty_saison'],
  ['honey_bunches_saison','http://www.themadfermentationist.com/2017/05/honey-oat-tart-saison.html','specialty_saison'],
  ['lambic_first','http://themadfermentationist.com/2008/05/lambic-that-real-king-of-funk.html','belgian_lambic'],
  ['lambic_mrk2','http://themadfermentationist.com/2008/09/brewing-lambic-20.html','belgian_lambic'],
  ['lambic_3','http://themadfermentationist.com/2009/08/lambic-3-turbid-mash.html','belgian_lambic'],
  ['lambic_7','http://www.themadfermentationist.com/2015/11/extract-lambic-recipe.html','belgian_lambic'],
  ['mckenzies_irma','http://www.themadfermentationist.com/2011/01/brewing-saison-at-mckenzies.html','french_belgian_saison'],
  ['oerbier_inspired','http://www.themadfermentationist.com/2013/12/oerbier-reserva-inspired-dark-sour-beer.html','flanders_red_ale'],
  ['rodentons','http://themadfermentationist.com/2007/04/with-re-release-of-wyeasts-roeselare.html','flanders_red_ale'],
  ['tart_saison','http://www.themadfermentationist.com/2016/10/fresh-vs-frozen-mango-tart-saison.html','specialty_saison'],
  ['wine_yeast_flemish','http://www.themadfermentationist.com/2011/07/red-wine-yeast-flemish-ale.html','flanders_red_ale'],
  // Belgian Funky
  ['beets_drie','http://www.themadfermentationist.com/2017/04/beet-and-brett-saison.html','specialty_saison'],
  ['brett_blend_rye_saison','http://www.themadfermentationist.com/2011/03/rye-saison-with-brett.html','specialty_saison'],
  ['brett_session_belgian_pale','http://www.themadfermentationist.com/2010/06/session-brett-belgian-pale.html','belgian_session_ale'],
  ['juniper_saison','https://www.themadfermentationist.com/2018/01/fresh-juniper-saison-with-el-dorado.html','specialty_saison'],
  ['petite_funky_saison','http://www.themadfermentationist.com/2010/11/funky-low-gravity-saison-recipe.html','specialty_saison'],
  ['saison_lightning','http://www.themadfermentationist.com/2017/08/azacca-brett-saison-keg-transfers.html','specialty_saison'],
  ['saphir_saison','http://www.themadfermentationist.com/2016/01/saphir-hopped-pilsner-and-saison.html','specialty_saison'],
  // Belgian Clean
  ['american_malt_dubbel','http://www.themadfermentationist.com/2011/10/plum-sour-dubbel-recipe.html','belgian_dubbel'],
  ['audreys_amber','http://www.themadfermentationist.com/2010/06/audreys-amber-strong-belgian-ale.html','belgian_strong_dark_ale'],
  ['easter_pomegranate_quad','http://www.themadfermentationist.com/2012/03/easter-spiced-pomegranate-quadruppel.html','belgian_quadrupel'],
  ['hoppy_french_saison','http://themadfermentationist.com/2009/11/hoppy-french-saison.html','french_belgian_saison'],
  ['lazy_monks_single','http://themadfermentationist.com/2009/10/extract-belgian-single.html','belgian_session_ale'],
  ['lemon_pepper_single','http://themadfermentationist.com/2009/06/lemon-pepper-single.html','belgian_session_ale'],
  ['lomaland_1','http://www.themadfermentationist.com/2012/08/spelt-it-right-saison-recipe.html','french_belgian_saison'],
  ['pannepot_clone','http://themadfermentationist.com/2010/01/pannepot-clone-cuvee-tomme-again.html','belgian_strong_dark_ale'],
  ['pom_dom','https://www.themadfermentationist.com/2018/04/belgian-dubbel-pomegranate-recipe.html','belgian_dubbel'],
  ['rumble_barrel_quad','http://www.themadfermentationist.com/2012/09/rumble-barrel-belgian-strong-dark-recipe.html','belgian_quadrupel'],
  ['summer_brussels','http://www.themadfermentationist.com/2011/07/belgian-single-recipe-with-brett.html','belgian_session_ale'],
  ['two_way_wit','http://www.themadfermentationist.com/2013/03/hibiscusgalaxy-wit-recipe.html','belgian_witbier'],
  // British Isles
  ['big_brown_barrel','https://www.themadfermentationist.com/2017/08/liquor-barrel-and-wood-aged-brown-ale.html','brown_ale'],
  ['courage_ris_v1','http://themadfermentationist.com/2007/11/courage-russian-imperial-stout.html','american_imperial_stout'],
  ['courage_ris_v2','http://www.themadfermentationist.com/2016/05/courage-russian-imperial-stout-second.html','american_imperial_stout'],
  ['dchb_english_barleywine','http://www.themadfermentationist.com/2011/05/english-barleywine-recipe-dchb.html','british_barley_wine_ale'],
  ['early_grey_mild','http://www.themadfermentationist.com/2014/06/earl-grey-mild-ale-recipe-and-tasting.html','mild'],
  ['foreign_export_stout','http://themadfermentationist.com/2008/12/foreign-export-stout-recipe.html','export_stout'],
  ['funky_old_ale','http://www.themadfermentationist.com/2007/08/funky-old-ale-1st-tasting.html','old_ale'],
  ['golding_medal_bitter','http://www.themadfermentationist.com/2010/03/golding-hopped-english-bitter-recipe.html','special_bitter_or_best_bitter'],
  ['guinness_draught_1883','http://www.themadfermentationist.com/2017/06/guinness-draught-1883-edition.html','irish_dry_stout'],
  ['guinness_extra_1883','http://www.themadfermentationist.com/2017/06/19th-century-guinness-extra-stout.html','irish_dry_stout'],
  ['landlord_clone','http://www.themadfermentationist.com/2010/02/timothy-taylor-landlord-clone-recipe.html','special_bitter_or_best_bitter'],
  ['london_porter_1800','http://themadfermentationist.com/2007/03/historical-brewing-event.html','specialty_historical'],
  ['oatmeal_brown_porter','http://www.themadfermentationist.com/2012/02/english-oatmeal-porter-recipe-big-and.html','brown_porter'],
  ['old_brown_sock','http://themadfermentationist.com/2010/02/first-batch-of-homebrew.html','english_brown_ale'],
  ['styrian_bitter','http://www.themadfermentationist.com/2011/05/styrian-golding-special-bitter-recipe.html','special_bitter_or_best_bitter'],
  // German Lager
  ['american_pils','http://www.themadfermentationist.com/2014/04/american-ingredient-pilsner-recipe.html','german_pilsener'],
  ['cherry_doppelbock','http://themadfermentationist.com/2009/08/cherry-doppelbock.html','german_doppelbock'],
  ['festbier','http://www.themadfermentationist.com/2017/01/lodo-festbier-split-batch-experiment.html','festbier'],
  ['hell_helles','http://themadfermentationist.com/2009/02/munich-helles-recipe-and-tasting.html','munich_helles'],
  ['saphir_pilsner','http://www.themadfermentationist.com/2016/01/saphir-hopped-pilsner-and-saison.html','german_pilsener'],
  ['wheat_triplebock','http://themadfermentationist.com/2009/05/wheat-triplebock_17.html','weizenbock'],
  // German Wheat
  ['by_book_hefe','http://www.themadfermentationist.com/2010/07/all-grain-decocted-hefeweizen-recipe.html','south_german_hefeweizen'],
  ['extract_hefe','http://themadfermentationist.com/2009/09/extract-hefeweizen-recipe.html','south_german_hefeweizen'],
  ['no_boil_berliner_1','http://themadfermentationist.com/2008/02/berliner-weiss.html','berliner_weisse'],
  ['no_boil_berliner_2','http://themadfermentationist.com/2009/07/cabernet-berliner-weiss.html','berliner_weisse'],
  ['no_boil_berliner_3','http://www.themadfermentationist.com/2010/05/double-berliner-weisse-brew.html','berliner_weisse'],
  ['no_boil_berliner_4','http://www.themadfermentationist.com/2012/06/100-lactobacillus-berliner-weisse.html','berliner_weisse'],
  ['no_boil_berliner_5','http://www.themadfermentationist.com/2014/09/lemon-berliner-weisse-recipe.html','berliner_weisse'],
  ['no_boil_berliner_6','http://www.themadfermentationist.com/2016/08/rhubarb-berliner-weisse-again.html','berliner_weisse'],
  ['session_weizen','http://themadfermentationist.com/2008/11/traditional-hefeweizen.html','south_german_hefeweizen'],
  ['weizenbock','http://themadfermentationist.com/2009/10/weizenbock-recipe.html','weizenbock'],
  // German Other
  ['fall_kolsch','http://www.themadfermentationist.com/2010/09/fall-kolsch-recipe.html','german_koelsch'],
  ['german_bitter','http://www.themadfermentationist.com/2010/02/german-bitter-hoppy-kolsch.html','german_koelsch'],
  ['double_secret_probation','http://themadfermentationist.com/2009/07/smoked-doppelsticke-true-adambier.html','specialty_historical'],
  ['golden_gose','http://www.themadfermentationist.com/2017/02/gose-neipa-principles-for-coriander.html','gose'],
  ['smoked_roggenbier','http://www.themadfermentationist.com/2011/11/cherry-wood-smoked-roggenbier-recipe.html','german_rye_ale'],
  ['leipzig_gose','http://www.themadfermentationist.com/2010/10/sour-leipziger-gose-recipe.html','gose'],
  // Group Barrels / 100% Brett / Sour
  ['beatification_001','http://themadfermentationist.com/2009/09/barrel-aged-single-beatification-clone.html','american_wild_ale'],
  ['bourbon_barrel_oud_bruin','http://www.themadfermentationist.com/2011/01/sour-brown-barrel-day-3.html','oud_bruin'],
  ['bourbon_barrel_wee_heavy','http://themadfermentationist.com/2009/02/bourbon-barrel-wee-heavy.html','scotch_ale_or_wee_heavy'],
  ['bourbon_brett_barley_wine','http://www.themadfermentationist.com/2012/03/bourbon-brett-oatmeal-barley-wine.html','american_barleywine'],
  ['sour_bourbon_porter','http://www.themadfermentationist.com/2010/03/sour-bourbon-barrel-porter.html','american_wild_ale'],
  ['wine_barrel_flanders','http://themadfermentationist.com/2008/10/plan-wine-barrel-flanders-red.html','flanders_red_ale'],
  ['brett_pale_ale','http://themadfermentationist.com/2007/07/brett-pale-ale.html','brett_beer'],
  ['acid_malt_saison','http://www.themadfermentationist.com/2012/01/souring-beer-with-acid-malt-ithaca.html','specialty_saison'],
  ['apple_brandy_solera','http://www.themadfermentationist.com/2011/02/strong-golden-apple-brandy-solera.html','american_wild_ale'],
  ['blackberry_sour_stout','http://www.themadfermentationist.com/2014/11/extract-sour-stout-on-blackberries-and.html','american_fruited_sour_ale'],
  ['buckwheat_sour_amber','http://www.themadfermentationist.com/2011/05/buckwheat-sour-amber-ale-recipe.html','american_wild_ale'],
  ['perpetuum_sour','http://www.themadfermentationist.com/2010/03/sour-solera-beer-barrel.html','american_wild_ale'],
  ['sour_squash','http://themadfermentationist.com/2009/03/sour-butternut-squash-ale.html','american_fruited_sour_ale'],
  ['sour_old_ale','http://www.themadfermentationist.com/2010/07/sour-old-ale-quick-oud-bruin.html','oud_bruin'],
  // Funky
  ['alsatian_saison','http://www.themadfermentationist.com/2015/04/alsatian-saison-recipe.html','french_belgian_saison'],
  ['big_funky','http://themadfermentationist.com/2008/04/big-funky-beers.html','american_wild_ale'],
  ['de_dom_quick_sour','http://www.themadfermentationist.com/2016/09/wyeast-de-bom-quick_sour.html','american_fruited_sour_ale'],
  ['loral_funky_saison','http://www.themadfermentationist.com/2016/12/loral-hopped-funky-saison.html','specialty_saison'],
  ['merican_saison','http://www.themadfermentationist.com/2014/07/saison-merican-hoppy-funk.html','specialty_saison'],
  ['nz_saison','http://www.themadfermentationist.com/2014/08/new-zealand-saison-and-glycosides.html','specialty_saison'],
  // Clean Dark
  ['90_shilling_stout','http://www.themadfermentationist.com/2011/02/90-shilling-scottish-stout-recipe.html','irish_dry_stout'],
  ['czechtic_porter','http://www.themadfermentationist.com/2016/02/czech-baltic-porter.html','baltic_porter'],
  ['muscovado_tropical_stout','https://www.themadfermentationist.com/2017/08/tropical-stout-with-muscavado.html','tropical_stout'],
  ['munich_porter','http://www.themadfermentationist.com/2010/04/munich-porter.html','porter'],
  ['scandinavian_imperial_porter','http://themadfermentationist.com/2007/10/scandinavian-imperial-porter.html','baltic_porter'],
  ['smoked_rye_baltic','http://www.themadfermentationist.com/2010/10/smoked-rye-baltic-porter-recipe.html','baltic_porter'],
  ['tmave_pivo','http://www.themadfermentationist.com/2015/12/tmave-pivo-czech-dark-lager.html','dark_lager'],
  // Clean Hoppy / Other
  ['aromatic_cream_ale','http://www.themadfermentationist.com/2012/11/aromatic-cream-ale-recipe.html','cream_ale'],
  ['banana_islands','http://www.themadfermentationist.com/2016/08/indian-pale-hefeweizen-recipe.html','american_wheat_ale'],
  ['hopped_up_hefe','http://www.themadfermentationist.com/2010/07/hoppy-german-american-wheat-recipe.html','american_wheat_ale'],
  ['biere_de_garde','http://www.themadfermentationist.com/2010/09/biere-de-garde-all-grain-recipe.html','french_biere_de_garde'],
  ['bohemian_lager','http://www.themadfermentationist.com/2011/06/triple-decocted-czech-pilsner-recipe.html','pale_lager'],
  ['blonde_coffee','http://www.themadfermentationist.com/2014/08/blonde-ale-on-coffee-beans-recipe.html','coffee_beer'],
  ['french_blonde','http://www.themadfermentationist.com/2015/09/french-blonde-ale-recipe-and-tasting.html','blonde_ale'],
  ['summer_kveik','http://www.themadfermentationist.com/2017/03/hothead-juniper-and-right-proper.html','specialty_saison']
];

console.log('Total TMF URLs to fetch:', TMF_URLS.length);

function fetchHTML(url){
  return new Promise(r=>{
    const proto = url.startsWith('https') ? https : http;
    const req = proto.get(url, {timeout:15000, headers:{
      'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Brewmaster-Audit/1.0',
      'Accept':'text/html,*/*'
    }}, (res)=>{
      // Handle redirect
      if(res.statusCode>=300 && res.statusCode<400 && res.headers.location){
        return r({redirect:res.headers.location, status:res.statusCode});
      }
      let chunks=[];
      res.on('data',c=>chunks.push(c));
      res.on('end',()=>r({status:res.statusCode, body:Buffer.concat(chunks).toString('utf8')}));
    });
    req.on('error',e=>r({error:e.message}));
    req.on('timeout',function(){this.destroy();r({error:'timeout'});});
  });
}

async function fetchWithRedirect(url, depth){
  if(depth>3) return {error:'too_many_redirects'};
  const r = await fetchHTML(url);
  if(r.redirect) return fetchWithRedirect(r.redirect, depth+1);
  return r;
}

// TMF blog HTML parser — Blogger-style with recipe in post body
function parseRecipe(html, urlInfo){
  const result = {
    source: 'tmf',
    url: urlInfo.url,
    name: urlInfo.id,
    bjcp_slug: urlInfo.slug,
    style_name_tmf: '',
    og: null, fg: null, abv: null, ibu: null, srm: null,
    batch_size_gal: null, boil_time_min: null,
    fermentables: [], hops: [], yeast: null,
    parse_quality: 'pending'
  };

  // Title
  const titleM = html.match(/<title>([^<]+)<\/title>/);
  if(titleM) result.name = titleM[1].replace(/^\s*The Mad Fermentationist[:\s-]*/,'').replace(/\s*[\|\-]\s*The Mad Fermentationist.*$/,'').trim();

  // Extract post body
  const bodyM = html.match(/<div class=['"]post-body[^>]*['"][^>]*>([\s\S]*?)<\/div>\s*<div class=['"]post-footer/i)
              || html.match(/<div class=['"]post-body[^>]*['"][^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
  let body = bodyM ? bodyM[1] : html;

  // Strip HTML tags but keep newlines
  let text = body.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|tr|div|h\d)>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
  text = text.replace(/[ \t]+/g, ' ').replace(/\n+/g, '\n');

  // Scalar metrics
  const ogM = text.match(/\bOG[:\s]*([\d.]+)/i); if(ogM) result.og = parseFloat(ogM[1]);
  const fgM = text.match(/\bFG[:\s]*([\d.]+)/i); if(fgM) result.fg = parseFloat(fgM[1]);
  const abvM = text.match(/\bABV[:\s]*([\d.]+)\s*%?/i); if(abvM) result.abv = parseFloat(abvM[1]);
  const ibuM = text.match(/\bIBU[s:\s]*([\d.]+)/i); if(ibuM) result.ibu = parseFloat(ibuM[1]);
  const srmM = text.match(/\bSRM[:\s]*([\d.]+)/i); if(srmM) result.srm = parseFloat(srmM[1]);
  const batchM = text.match(/Batch\s*Size[:\s]*([\d.]+)\s*(gal|L)/i); if(batchM) result.batch_size_gal = parseFloat(batchM[1]);

  // Fermentables — pattern "X.XX lb [name]" or "X.XX lbs [name]"
  // Captures name until a parenthesis, %, or newline
  const fermPattern = /(\d+(?:\.\d+)?)\s*(lb|lbs|kg|oz|g)s?\.?\s+([A-Z][A-Za-z0-9 ',&®/-]{2,50})(?:\s*\(([\d.]+)%?\))?/g;
  let m;
  const seenFerm = new Set();
  while((m = fermPattern.exec(text)) !== null && result.fermentables.length < 15){
    const name = m[3].trim();
    const lower = name.toLowerCase();
    // Skip hop-specific patterns (Cascade, Citra, etc — common hops)
    if(/cascade|citra|simcoe|amarillo|columbus|chinook|centennial|warrior|magnum|saaz|hallertau|tettnang|nelson|mosaic|galaxy|sorachi/i.test(name)) continue;
    // Skip if we've seen
    const key = lower.substring(0,30);
    if(seenFerm.has(key)) continue;
    seenFerm.add(key);
    // Looks like a malt?
    if(/malt|grain|wheat|oat|rye|barley|pilsner|munich|vienna|crystal|caramel|cara|chocolate|carafa|smoked|honey|sugar|extract|adjunct|melanoidin|aromatic|abbey|special|amber|biscuit|brown|black|roast/i.test(name)){
      result.fermentables.push({
        name: name,
        amount: parseFloat(m[1]),
        unit: m[2].toLowerCase(),
        percent: m[4] ? parseFloat(m[4]) : null
      });
    }
  }

  // Hops — pattern "X.XX oz [name]"
  const hopPattern = /(\d+(?:\.\d+)?)\s*(oz|g)\s+([A-Z][A-Za-z0-9 '®/-]{2,30})(?:\s*\([\d.]+\s*%[^)]*\))?(?:\s*@\s*(\d+)\s*min)?/g;
  let h;
  while((h = hopPattern.exec(text)) !== null && result.hops.length < 12){
    const name = h[3].trim();
    if(/cascade|citra|simcoe|amarillo|columbus|chinook|centennial|warrior|magnum|saaz|hallertau|tettnang|nelson|mosaic|galaxy|sorachi|fuggle|goldings|bram|ekg|northern brewer|williamette|kohatu|riwaka|motueka|sabro|el dorado/i.test(name)) {
      result.hops.push({
        name: name,
        amount: parseFloat(h[1]),
        unit: h[2].toLowerCase(),
        time_min: h[4] ? parseInt(h[4]) : null
      });
    }
  }

  // Yeast
  const yeastM = text.match(/\bYeast[:\s]*([A-Z][^\n]{5,80})/i)
              || text.match(/(WLP\d{3,4}|Wyeast\s*\d{4}|WY\s*\d{4}|S-\d{2}|US-\d{2}|BE-\d+|WB-\d+|T-\d+|F-\d+|K-\d+)[^\n]*?(?=\n)/);
  if(yeastM) result.yeast = (yeastM[1] || yeastM[0]).trim().substring(0, 100);

  // Quality assessment
  const hasFerm = result.fermentables.length >= 1;
  const hasHops = result.hops.length >= 1;
  const hasMetric = result.og != null || result.ibu != null;
  result.parse_quality = (hasFerm && hasHops && hasMetric) ? 'good'
                        : (hasFerm || hasHops) ? 'partial'
                        : 'weak';
  return result;
}

async function main(){
  const results = [];
  const errors = [];
  console.log('Starting TMF Phase 2 fetch — '+TMF_URLS.length+' URLs, 2sec delay between fetches...');
  console.log('');
  for(let i=0; i<TMF_URLS.length; i++){
    const [id, url, slug] = TMF_URLS[i];
    process.stderr.write('['+(i+1)+'/'+TMF_URLS.length+'] '+id+' ... ');
    try {
      const r = await fetchWithRedirect(url, 0);
      if(r.error){ errors.push({id, url, slug, error:r.error}); process.stderr.write('FETCH_ERR '+r.error+'\n'); }
      else if(r.status !== 200){ errors.push({id, url, slug, error:'HTTP'+r.status}); process.stderr.write('HTTP'+r.status+'\n'); }
      else {
        const parsed = parseRecipe(r.body, {id, url, slug});
        results.push(parsed);
        process.stderr.write(parsed.parse_quality+' (f='+parsed.fermentables.length+' h='+parsed.hops.length+' og='+(parsed.og||'-')+')\n');
      }
    } catch(e){ errors.push({id, url, slug, error:e.message}); process.stderr.write('PARSE_ERR '+e.message+'\n'); }
    await new Promise(r=>setTimeout(r, 2000));
  }

  // Quality stats
  const good = results.filter(r=>r.parse_quality==='good').length;
  const partial = results.filter(r=>r.parse_quality==='partial').length;
  const weak = results.filter(r=>r.parse_quality==='weak').length;
  console.log('\n=== TMF Phase 2 RESULTS ===');
  console.log('Total fetched:', results.length, '/', TMF_URLS.length);
  console.log('Errors:', errors.length);
  console.log('Quality: good='+good+' (good='+(good/results.length*100).toFixed(0)+'%), partial='+partial+', weak='+weak);

  // Merge with existing 5 from Phase 1
  const phase1 = JSON.parse(fs.readFileSync('_v7_recipes_tmf.json', 'utf8'));
  const merged = {
    _meta: {
      generated: new Date().toISOString(),
      source: 'The Mad Fermentationist',
      author: 'Mike Tonsmeire',
      total_urls_attempted: TMF_URLS.length + 5,
      successful_fetch: results.length + phase1.records.length,
      errors_count: errors.length,
      quality: {good_phase2: good, partial_phase2: partial, weak_phase2: weak},
      phase: 'phase 1 (5) + phase 2 ('+TMF_URLS.length+' attempted)'
    },
    records: phase1.records.concat(results),
    errors: errors
  };
  fs.writeFileSync('_v7_recipes_tmf.json', JSON.stringify(merged, null, 2));
  console.log('Wrote _v7_recipes_tmf.json ('+merged.records.length+' records)');
}

main().catch(e=>{console.error('FATAL', e); process.exit(1);});

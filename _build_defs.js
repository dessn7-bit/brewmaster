const fs = require('fs');
const meta = require('./_style_meta.js');

const hybrid = JSON.parse(fs.readFileSync('./HYBRID_styles.json','utf8'));
const bmSigs = JSON.parse(fs.readFileSync('./BM_signatures.json','utf8'));

// ═══ BREWMASTER -> HYBRID/BA NAME MAPPING ═══
// Left = Brewmaster signature name. Right = canonical hybrid name.
// If a BM name isn't here, we try fuzzy normalize match.
const BM_TO_CANON = {
  // Weizen/Wheat family
  'Weizen / Weissbier':                 'South German-Style Hefeweizen',
  'Hefeweizen':                          'South German-Style Hefeweizen',
  'Kristallweizen':                      'South German-Style Kristal Weizen',
  'Leichtes Weizen':                     'German-Style Leichtes Weizen',
  'Dunkelweizen':                        'South German-Style Dunkel Weizen',
  'Weizenbock':                          'South German-Style Weizenbock',
  'Helles Weizenbock / Weizenbock Hell': 'South German-Style Weizenbock',
  'Dunkles Weizenbock':                  'South German-Style Weizenbock',
  'Hoppy Hefeweizen':                    'South German-Style Hefeweizen',
  'American Hefeweizen':                 'American-Style Wheat Beer',
  'American Wheat Beer':                 'American-Style Wheat Beer',
  'American Wheat IPA / Hoppy Wheat':    'American-Style Wheat Beer',
  'Dampfbier':                           'Dampfbier',
  'Roggenbier / Rye Beer':               'Historical Beer: Roggenbier',
  'Grodziskie / Grätzer':                'Grodziskie',
  'Wheatwine':                           'American-Style Wheat Wine Ale',
  'Spiced Wheat Beer':                   'Fruit Wheat Beer',
  'Herb Wheat Beer':                     'Fruit Wheat Beer',
  'Australian Wheat Beer':               'American-Style Wheat Beer',
  // Witbier
  'Witbier / Belgian White':             'Belgian-Style Witbier',
  'Belgian Witbier':                     'Belgian-Style Witbier',
  'Spiced Witbier':                      'Belgian-Style Witbier',
  // Belgian
  'Dubbel':                              'Belgian-Style Dubbel',
  'Tripel':                              'Belgian-Style Tripel',
  'Belgian Quadrupel / Abt':             'Belgian-Style Quadrupel',
  'Belgian Pale Ale':                    'Belgian-Style Speciale Belge',
  'Modern Belgian Pale Ale':             'Belgian-Style Speciale Belge',
  'Belgian Blonde Ale':                  'Belgian-Style Blonde Ale',
  'Belgian Strong Golden Ale':           'Belgian-Style Strong Blonde Ale',
  'Belgian Dark Strong Ale':             'Belgian-Style Strong Dark Ale',
  'Belgian Strong Ale':                  'Belgian-Style Strong Dark Ale',
  'Belgian Amber Ale':                   'Belgian-Style Speciale Belge',
  'Trappist Single / Abbey Ale':         'Belgian-Style Table Beer',
  'Table Beer / Bière de Table':         'Belgian-Style Table Beer',
  'Barrel-Aged Belgian Quad':            'Belgian-Style Quadrupel',
  'Belgian Specialty Ale':               'Other Belgian-Style Ale',
  'Belgian IPA':                         'Specialty IPA: Belgian IPA',
  // Saison
  'Saison / Farmhouse Ale':              'Classic French & Belgian-Style Saison',
  'Dry-Hopped Saison':                   'Specialty Saison',
  'Hoppy Saison':                        'Specialty Saison',
  'Saison d\'Hiver':                     'Specialty Saison',
  'Tropical Saison':                     'Specialty Saison',
  'Elderflower Saison':                  'Specialty Saison',
  'Lavender Saison':                     'Specialty Saison',
  'Provision Ale':                       'Specialty Saison',
  'Table Saison':                        'Belgian-Style Table Beer',
  'Grisette':                            'Belgian-Style Session Ale',
  'Bière de Garde':                      'French-Style Bière de Garde',
  // Kveik / Farmhouse
  'Norwegian Farmhouse / Kveik':         'Finnish-Style Sahti',
  'Kveik NEIPA':                         'Juicy or Hazy India Pale Ale',
  'Sahti / Nordic Farmhouse':            'Finnish-Style Sahti',
  // Sour / Lambic
  'Berliner Weisse':                     'Berliner-Style Weisse',
  'Gose':                                'Contemporary-Style Gose',
  'Leipzig Gose':                        'Leipzig-Style Gose',
  'Contemporary Gose':                   'Contemporary-Style Gose',
  'Gose de Fruit':                       'Contemporary-Style Gose',
  'Mexican Candy Gose':                  'Contemporary-Style Gose',
  'Piña Colada Gose':                    'Contemporary-Style Gose',
  'Cucumber Gose':                       'Contemporary-Style Gose',
  'Flanders Red Ale':                    'Belgian-Style Flanders Oud Bruin or Oud Red Ale',
  'Oud Bruin':                           'Belgian-Style Flanders Oud Bruin or Oud Red Ale',
  'Lambic / Gueuze':                     'Belgian-Style Lambic',
  'Kriek / Fruit Lambic':                'Belgian-Style Fruit Lambic',
  'Framboise / Fruit Lambic':            'Belgian-Style Fruit Lambic',
  'American Wild Ale':                   'Wild Beer',
  'Brett Beer / Farmhouse Brett':        'Brett Beer',
  'Sour Ale / Kettle Sour':              'American-Style Sour Ale',
  'Sour IPA':                            'American-Style Sour Ale',
  'Sour Red Ale':                        'Belgian-Style Flanders Oud Bruin or Oud Red Ale',
  'Fruited Sour / Dark Fruit Sour':      'American-Style Fruited Sour Ale',
  'Fruited Sour / Gose':                 'Contemporary-Style Gose',
  'Blanche Sour / Sour Witbier':         'American-Style Sour Ale',
  'Mixed Berry Sour':                    'American-Style Fruited Sour Ale',
  'Mixed Fermentation Sour':             'Mixed-Culture Brett Beer',
  'Smoothie Sour':                       'American-Style Fruited Sour Ale',
  'Pastry Sour':                         'American-Style Fruited Sour Ale',
  'Catharina Sour':                      'X4. Catharina Sour',
  'Session Sour':                        'American-Style Sour Ale',
  'Lichtenhainer':                       'Historical Beer: Lichtenhainer',
  // Lager
  'German Pils':                         'German-Style Pilsener',
  'Czech Premium Pale Lager':            'Czech-Style Pale Lager',
  'Czech Pale Lager':                    'Czech-Style Pale Lager',
  'Czech Amber Lager':                   'Czech-Style Amber Lager',
  'Czech Dark Lager':                    'Czech-Style Dark Lager',
  'Helles / Münchner Hell':              'Munich-Style Helles',
  'Helles Naturtrüb':                    'Munich-Style Helles',
  'Festbier / Wiesn':                    'German-Style Oktoberfest/Festbier',
  'Munich Märzen / Oktoberfest':         'German-Style Maerzen',
  'Munich Dunkel':                       'Munich-Style Dunkel',
  'Schwarzbier':                         'German-Style Schwarzbier',
  'Kellerbier / Zwickelbier':            'Kellerbier or Zwickelbier',
  'Zoigl Beer':                          'Kellerbier or Zwickelbier',
  'Dortmunder Export':                   'Dortmunder/European-Style Export',
  'German Helles Exportbier':            'Dortmunder/European-Style Export',
  'Bock':                                'Traditional German-Style Bock',
  'Maibock / Helles Bock':               'German-Style Heller Bock/Maibock',
  'Doppelbock':                          'German-Style Doppelbock',
  'Eisbock':                             'German-Style Eisbock',
  'Vienna Lager':                        'Vienna-Style Lager',
  'California Common / Steam Beer':      'California Common Beer',
  'Kentucky Common':                     'Kentucky Common Beer',
  'Rauchbier / Bamberg Smoked':          'Bamberg-Style Maerzen Rauchbier',
  'Smoked Beer / Rauchbier':             'Bamberg-Style Maerzen Rauchbier',
  'Smoked Porter':                       'Smoke Porter',
  'Dark American Lager':                 'American-Style Dark Lager',
  'American Lager / Light Lager':        'American-Style Light Lager',
  'American Pilsner':                    'American-Style Pilsener',
  'International Pale Lager':            'International Light Lager',
  'International Amber Lager':           'International-Style Pilsener',
  'Mexican Lager':                       'Mexican-Style Pale Lager',
  'Pre-Prohibition Lager':               'Historical Beer: Pre-Prohibition Lager',
  'Pre-Prohibition Porter':              'Historical Beer: Pre-Prohibition Porter',
  'Italian Pilsner':                     'Italian-Style Pilsener',
  'Craft Pilsner':                       'Italian-Style Pilsener',
  'New Zealand Pilsner':                 'X5. New Zealand Pilsner',
  'Dampfbier':                           'Dampfbier',
  'Baltic Porter':                       'Baltic-Style Porter',
  'Hazy Lager':                          'American-Style India Pale Lager',
  'Honey Lager':                         'Specialty Honey Beer',
  'Oat Cream Lager':                     'American-Style Lager',
  'Ranch Water Lager':                   'American-Style Light Lager',
  'Light Craft Lager':                   'American-Style Light Lager',
  'Nordic Pale Ale':                     'American-Style Pale Ale',
  // Kölsch / Altbier / Hybrid
  'Kölsch':                              'German-Style Koelsch',
  'Altbier / Düsseldorf Altbier':        'German-Style Altbier',
  'Cream Ale':                           'American-Style Cream Ale',
  'Blonde Ale / Cream Ale':              'Golden or Blonde Ale',
  'American Blonde Ale':                 'Golden or Blonde Ale',
  'Australian Sparkling Ale':            'Classic Australian-Style Pale Ale',
  // British / American / Irish Ale
  'Best Bitter':                         'Special Bitter or Best Bitter',
  'Session Ale / Ordinary Bitter':       'Ordinary Bitter',
  'English Bitter / ESB':                'Extra Special Bitter',
  'Strong Bitter / ESB':                 'Extra Special Bitter',
  'Hazy Bitter':                         'Juicy or Hazy Pale Ale',
  'Juicy Bitter':                        'Juicy or Hazy Pale Ale',
  'English Brown Ale':                   'English-Style Brown Ale',
  'London Brown Ale':                    'Historical Beer: London Brown Ale',
  'English Mild / Dark Mild':            'English-Style Dark Mild Ale',
  'Session Stout / Dark Mild':           'English-Style Dark Mild Ale',
  'Scottish Ale / 60 Shilling':          'Scottish-Style Light Ale',
  'Scottish Ale / 80 Shilling':          'Scottish-Style Heavy Ale',
  'Scottish Ale / Wee Heavy':            'Scotch Ale or Wee Heavy',
  'Irish Red Ale':                       'Irish-Style Red Ale',
  'Winter Warmer / Old Ale':             'Old Ale',
  'Spiced Beer / Winter Warmer':         'Old Ale',
  'Steinbier / Caramel Ale':             'Historical Beer: Kellerbier',
  'British Strong Ale':                  'Strong Ale',
  'American Amber Ale / Red Ale':        'American-Style Amber/Red Ale',
  'American Brown Ale':                  'American-Style Brown Ale',
  'American Pale Ale':                   'American-Style Pale Ale',
  'Hazy Pale Ale':                       'Juicy or Hazy Pale Ale',
  'New England Pale Ale':                'Juicy or Hazy Pale Ale',
  'American Strong Ale':                 'American-Style Strong Pale Ale',
  'American Barleywine':                 'American-Style Barley Wine Ale',
  'Barleywine':                          'American-Style Barley Wine Ale',
  'English Barleywine':                  'British-Style Barley Wine Ale',
  'Rye Wine':                            'American-Style Wheat Wine Ale',
  // IPA
  'American IPA':                        'American-Style India Pale Ale',
  'West Coast IPA':                      'West Coast-Style India Pale Ale',
  'NEIPA / Hazy IPA':                    'Juicy or Hazy India Pale Ale',
  'Dark NEIPA':                          'Juicy or Hazy India Pale Ale',
  'Hazy Imperial IPA':                   'Juicy or Hazy Imperial or Double India Pale Ale',
  'Hazy Red IPA':                        'Specialty IPA: Red IPA',
  'Imperial IPA / DIPA':                 'American-Style Imperial or Double India Pale Ale',
  'Triple IPA':                          'American-Style Imperial or Double India Pale Ale',
  'Session IPA':                         'Session India Pale Ale',
  'Black IPA / Cascadian Dark Ale':      'American-Style Black Ale',
  'Brown IPA':                           'Specialty IPA: Brown IPA',
  'Rye IPA':                             'Specialty IPA: Rye IPA',
  'White IPA':                           'Specialty IPA: White IPA',
  'Brut IPA':                            'Specialty IPA: Brut IPA',
  'English IPA':                         'British-Style India Pale Ale',
  'American Amber IPA / Red IPA':        'Specialty IPA: Red IPA',
  'Cold IPA':                            'American-Style India Pale Lager',
  'Lager IPA':                           'American-Style India Pale Lager',
  'Farmhouse IPA':                       'Specialty Saison',
  'Thiolized IPA / Biotech IPA':         'Experimental India Pale Ale',
  'Cryo Hop IPA':                        'American-Style India Pale Ale',
  'Hop Bursted IPA':                     'American-Style India Pale Ale',
  'Fresh Hop IPA':                       'Fresh Hop Beer',
  'Oat Cream IPA':                       'Juicy or Hazy India Pale Ale',
  'Yuzu IPA / Japanese Hop Beer':        'Experimental India Pale Ale',
  'Milkshake IPA':                       'Juicy or Hazy India Pale Ale',
  // Stout/Porter
  'Dry Irish Stout':                     'Classic Irish-Style Dry Stout',
  'American Stout':                      'American-Style Stout',
  'Foreign Extra Stout':                 'Export-Style Stout',
  'Oatmeal Stout':                       'Oatmeal Stout',
  'Milk Stout / Sweet Stout':            'Sweet Stout or Cream Stout',
  'Double Milk Stout':                   'Sweet Stout or Cream Stout',
  'Imperial Milk Stout':                 'American-Style Imperial Stout',
  'Imperial / Russian Imperial Stout':   'British-Style Imperial Stout',
  'Tropical Stout':                      'Export-Style Stout',
  'Coffee Stout':                        'Coffee Beer',
  'Chocolate Stout':                     'Chocolate or Cocoa Beer',
  'Coconut Stout':                       'Specialty Beer',
  'Pastry Stout':                        'Dessert Stout or Pastry Beer',
  'Smoothie Stout':                      'Dessert Stout or Pastry Beer',
  'Pumpkin Stout':                       'Pumpkin Spice Beer',
  'Maple Bourbon Stout':                 'Bourbon Barrel Aged Stout',
  'Bourbon Barrel Aged Stout':           'Bourbon Barrel Aged Stout',
  'Birthday Cake Stout':                 'Dessert Stout or Pastry Beer',
  'S\'mores Stout':                      'Dessert Stout or Pastry Beer',
  'Peanut Butter Stout':                 'Dessert Stout or Pastry Beer',
  'Golden Stout':                        'Specialty Beer',
  'London Porter':                       'Brown Porter',
  'Robust Porter':                       'Robust Porter',
  'American Porter':                     'Robust Porter',
  'Hoppy Porter':                        'Robust Porter',
  'Stout / Porter':                      'American-Style Stout',
  // Specialty
  'Honey Ale / Braggot':                 'Specialty Honey Beer',
  'Honey Beer':                          'Specialty Honey Beer',
  'Agave Beer':                          'Specialty Beer',
  'Tepache Beer':                        'Specialty Beer',
  'Grape Ale / Wine Beer':               'X3. Italian Grape Ale',
  'Hemp Beer / CBD Beer':                'Specialty Beer',
  'Matcha / Green Tea Beer':             'Specialty Beer',
  'Rose / Floral Beer':                  'Specialty Beer',
  'Botanical Ale':                       'Specialty Beer',
  'Gruit Ale':                           'Historical Beer',
  'Kvass':                               'Kvass',
  'Chili Beer':                          'Chili Pepper Beer',
  'Fruit Beer':                          'American-Style Fruit Beer',
  'Christmas / Holiday Beer':            'Specialty Beer',
  'Herb & Spice Beer':                   'Herb and Spice Beer',
  'Wood-Aged Beer / Barrel Aged':        'Wood- and Barrel-Aged Beer',
  'Alternative Grain Beer':              'Experimental Beer',
  'Non-Alcoholic Beer':                  'Non-Alcohol Malt Beverage',
};

// ═══ DISPLAY TR — Türkçe kısa ad ═══
// For common styles use Brewmaster's existing short name; else strip "-Style" / country prefix
const DISPLAY_TR = {
  'South German-Style Hefeweizen':                     'Hefeweizen',
  'South German-Style Kristal Weizen':                 'Kristal Weizen',
  'German-Style Leichtes Weizen':                      'Leichtes Weizen',
  'South German-Style Bernsteinfarbenes Weizen':       'Bernsteinfarbenes Weizen (Amber Weizen)',
  'South German-Style Dunkel Weizen':                  'Dunkelweizen',
  'South German-Style Weizenbock':                     'Weizenbock',
  'Belgian-Style Witbier':                             'Witbier',
  'Belgian-Style Dubbel':                              'Dubbel',
  'Belgian-Style Tripel':                              'Tripel',
  'Belgian-Style Quadrupel':                           'Quadrupel',
  'Belgian-Style Blonde Ale':                          'Belçika Blonde',
  'Belgian-Style Strong Blonde Ale':                   'Belçika Strong Golden',
  'Belgian-Style Strong Dark Ale':                     'Belçika Dark Strong',
  'Belgian-Style Speciale Belge':                      'Belçika Pale Ale',
  'Belgian-Style Table Beer':                          'Belçika Table Beer',
  'Belgian-Style Session Ale':                         'Belçika Session Ale',
  'Belgian-Style Flanders Oud Bruin or Oud Red Ale':   'Flanders Oud Bruin / Oud Red',
  'Belgian-Style Lambic':                              'Lambic',
  'Traditional Belgian-Style Gueuze':                  'Gueuze',
  'Belgian-Style Fruit Lambic':                        'Fruit Lambic',
  'Belgian-Style Fruit Beer':                          'Belçika Fruit Beer',
  'Other Belgian-Style Ale':                           'Belçika Specialty Ale',
  'Classic French & Belgian-Style Saison':             'Saison',
  'Specialty Saison':                                  'Specialty Saison',
  'French-Style Bière de Garde':                       'Bière de Garde',
  'Berliner-Style Weisse':                             'Berliner Weisse',
  'Leipzig-Style Gose':                                'Leipzig Gose',
  'Contemporary-Style Gose':                           'Contemporary Gose',
  'German-Style Pilsener':                             'Alman Pils',
  'German-Style Koelsch':                              'Kölsch',
  'German-Style Altbier':                              'Altbier',
  'Munich-Style Helles':                               'Helles',
  'Munich-Style Dunkel':                               'Munich Dunkel',
  'German-Style Schwarzbier':                          'Schwarzbier',
  'Dortmunder/European-Style Export':                  'Dortmunder Export',
  'German-Style Maerzen':                              'Märzen',
  'German-Style Oktoberfest/Festbier':                 'Oktoberfest/Festbier',
  'German-Style Heller Bock/Maibock':                  'Maibock',
  'Traditional German-Style Bock':                     'Bock',
  'German-Style Doppelbock':                           'Doppelbock',
  'German-Style Eisbock':                              'Eisbock',
  'Franconian-Style Rotbier':                          'Franconian Rotbier',
  'Bamberg-Style Weiss Rauchbier':                     'Bamberg Weizen Rauchbier',
  'Bamberg-Style Helles Rauchbier':                    'Bamberg Helles Rauchbier',
  'Bamberg-Style Maerzen Rauchbier':                   'Bamberg Rauchbier',
  'Bamberg-Style Bock Rauchbier':                      'Bamberg Bock Rauchbier',
  'Vienna-Style Lager':                                'Vienna Lager',
  'Czech-Style Pale Lager':                            'Çek Pale Lager',
  'Czech-Style Amber Lager':                           'Çek Amber Lager',
  'Czech-Style Dark Lager':                            'Çek Dark Lager',
  'Czech Premium Pale Lager':                          'Çek Premium Pils',
  'Italian-Style Pilsener':                            'İtalyan Pils',
  'German-Style Leichtbier':                           'Leichtbier',
  'Kellerbier or Zwickelbier':                         'Kellerbier',
  'Baltic-Style Porter':                               'Baltic Porter',
  'California Common Beer':                            'California Common',
  'Kentucky Common Beer':                              'Kentucky Common',
  'American-Style Lager':                              'American Lager',
  'American-Style Light Lager':                        'American Light Lager',
  'American-Style Pilsener':                           'American Pils',
  'American-Style India Pale Lager':                   'India Pale Lager',
  'American-Style Malt Liquor':                        'Malt Liquor',
  'American-Style Amber Lager':                        'American Amber Lager',
  'American-Style Maerzen/Oktoberfest':                'American Märzen',
  'American-Style Dark Lager':                         'American Dark Lager',
  'Mexican-Style Light Lager':                         'Mexican Light Lager',
  'Mexican-Style Pale Lager':                          'Mexican Lager',
  'Mexican-Style Amber Lager':                         'Mexican Amber',
  'Mexican-Style Dark Lager':                          'Mexican Dark',
  'International Light Lager':                         'International Light Lager',
  'International-Style Pilsener':                      'International Pils',
  'Rice Lager':                                        'Rice Lager',
  'Contemporary American-Style Lager':                 'Modern American Lager',
  'Contemporary American-Style Light Lager':           'Modern American Light Lager',
  'Contemporary American-Style Pilsener':              'Modern American Pils',
  'Contemporary-Style Gose':                           'Modern Gose',
  'Contemporary Belgian-Style Spontaneous Fermented Ale': 'Modern Belçika Spontan',
  // Ale
  'Ordinary Bitter':                                   'Ordinary Bitter',
  'Special Bitter or Best Bitter':                     'Best Bitter',
  'Extra Special Bitter':                              'ESB',
  'Scottish-Style Light Ale':                          'Scottish Light (60/-)',
  'Scottish-Style Heavy Ale':                          'Scottish Heavy (70/-)',
  'Scottish-Style Export Ale':                         'Scottish Export (80/-)',
  'Scotch Ale or Wee Heavy':                           'Wee Heavy',
  'English-Style Summer Ale':                          'English Summer Ale',
  'Classic English-Style Pale Ale':                    'English Pale Ale',
  'British-Style India Pale Ale':                      'İngiliz IPA',
  'British-Style Barley Wine Ale':                     'İngiliz Barleywine',
  'British-Style Imperial Stout':                      'İngiliz Imperial Stout',
  'Strong Ale':                                        'Strong Ale',
  'Old Ale':                                           'Old Ale',
  'English-Style Pale Mild Ale':                       'Pale Mild',
  'English-Style Dark Mild Ale':                       'Dark Mild',
  'English-Style Brown Ale':                           'İngiliz Brown Ale',
  'Brown Porter':                                      'Brown Porter',
  'Robust Porter':                                     'Robust Porter',
  'Smoke Porter':                                      'Smoke Porter',
  'Sweet Stout or Cream Stout':                        'Sweet/Milk Stout',
  'Oatmeal Stout':                                     'Oatmeal Stout',
  'Classic Irish-Style Dry Stout':                     'Irish Dry Stout',
  'Export-Style Stout':                                'Foreign Extra Stout',
  'Irish-Style Red Ale':                               'Irish Red',
  'Golden or Blonde Ale':                              'Blonde/Golden Ale',
  'Session India Pale Ale':                            'Session IPA',
  'American-Style Amber/Red Ale':                      'American Amber/Red',
  'American-Style Pale Ale':                           'American Pale Ale (APA)',
  'Juicy or Hazy Pale Ale':                            'Hazy Pale Ale',
  'American-Style Strong Pale Ale':                    'American Strong Pale',
  'Juicy or Hazy Strong Pale Ale':                     'Hazy Strong Pale',
  'American-Style India Pale Ale':                     'American IPA',
  'West Coast-Style India Pale Ale':                   'West Coast IPA',
  'Juicy or Hazy India Pale Ale':                      'NEIPA / Hazy IPA',
  'American-Belgo-Style Ale':                          'American-Belgo Ale',
  'American-Style Brown Ale':                          'American Brown',
  'American-Style Black Ale':                          'Black IPA',
  'American-Style Stout':                              'American Stout',
  'American-Style Imperial Porter':                    'American Imperial Porter',
  'American-Style Imperial Stout':                     'American Imperial Stout',
  'Double Hoppy Red Ale':                              'Double Hoppy Red',
  'Imperial Red Ale':                                  'Imperial Red',
  'American-Style Imperial or Double India Pale Ale':  'Imperial/Double IPA',
  'Juicy or Hazy Imperial or Double India Pale Ale':   'Hazy Imperial IPA',
  'American-Style Barley Wine Ale':                    'American Barleywine',
  'American-Style Wheat Wine Ale':                     'Wheatwine',
  'American-Style Sour Ale':                           'American Sour',
  'American-Style Fruited Sour Ale':                   'Fruited Sour',
  'American-Style Wheat Beer':                         'American Wheat',
  'American-Style Cream Ale':                          'Cream Ale',
  // Specialty IPAs (BJCP-only)
  'Specialty IPA: Belgian IPA':                        'Belgian IPA',
  'Specialty IPA: Black IPA':                          'Black IPA (BJCP)',
  'Specialty IPA: Brown IPA':                          'Brown IPA',
  'Specialty IPA: Red IPA':                            'Red IPA',
  'Specialty IPA: Rye IPA':                            'Rye IPA',
  'Specialty IPA: White IPA':                          'White IPA',
  'Specialty IPA: Brut IPA':                           'Brut IPA',
  // Historical (BJCP)
  'Historical Beer: Kellerbier':                       'Historical Kellerbier',
  'Historical Beer: Kentucky Common':                  'Historical Kentucky Common',
  'Historical Beer: Lichtenhainer':                    'Lichtenhainer',
  'Historical Beer: London Brown Ale':                 'Historical London Brown',
  'Historical Beer: Piwo Grodziskie':                  'Grodziskie',
  'Historical Beer: Pre-Prohibition Lager':            'Pre-Prohibition Lager',
  'Historical Beer: Pre-Prohibition Porter':           'Pre-Prohibition Porter',
  'Historical Beer: Roggenbier':                       'Roggenbier',
  'Historical Beer: Sahti':                            'Sahti',
  'Historical Beer':                                   'Historical Beer',
  'Adambier':                                          'Adambier',
  'Grodziskie':                                        'Grodziskie',
  'Dutch-Style Kuit, Kuyt or Koyt':                    'Dutch Kuit',
  'Breslau-Style Schoeps':                             'Breslau Schoeps',
  'Finnish-Style Sahti':                               'Sahti',
  'Swedish-Style Gotlandsdricke':                      'Gotlandsdricke',
  'International-Style Pale Ale':                      'International Pale',
  'Classic Australian-Style Pale Ale':                 'Classic Australian Pale',
  'Australian-Style Pale Ale':                         'Australian Pale',
  'New Zealand-Style Pale Ale':                        'NZ Pale Ale',
  'New Zealand-Style India Pale Ale':                  'NZ IPA',
  // Specialty/Catchall
  'Session Beer':                                      'Session Beer',
  'Kellerbier or Zwickelbier':                         'Kellerbier / Zwickelbier',
  'Kvass':                                             'Kvass',
  'Brett Beer':                                        'Brett Beer',
  'Mixed-Culture Brett Beer':                          'Mixed Culture Brett',
  'Wild Beer':                                         'Wild Ale',
  'Wood- and Barrel-Aged Beer':                        'Wood/Barrel Aged',
  'Wood- and Barrel-Aged Sour Beer':                   'Wood/Barrel Aged Sour',
  'Bourbon Barrel Aged Stout':                         'Bourbon Barrel Stout',
  'Fresh Hop Beer':                                    'Fresh Hop Beer',
  'Rye Beer':                                          'Rye Beer',
  'Chocolate or Cocoa Beer':                           'Chocolate Beer',
  'Coffee Beer':                                       'Coffee Beer',
  'Dessert Stout or Pastry Beer':                      'Pastry Stout',
  'Chili Pepper Beer':                                 'Chili Beer',
  'Herb and Spice Beer':                               'Herb/Spice Beer',
  'Field Beer':                                        'Field Beer',
  'Pumpkin Spice Beer':                                'Pumpkin Spice',
  'Pumpkin/Squash Beer':                               'Pumpkin/Squash',
  'Specialty Beer':                                    'Specialty Beer',
  'Specialty Honey Beer':                              'Honey Beer',
  'American-Style Fruit Beer':                         'American Fruit Beer',
  'Fruit Wheat Beer':                                  'Fruit Wheat',
  'Ginjo Beer or Sake-Yeast Beer':                     'Ginjo Beer',
  'Experimental Beer':                                 'Experimental',
  'Experimental India Pale Ale':                       'Experimental IPA',
  'Aged Beer':                                         'Aged Beer',
  'Wild Beer':                                         'Wild Ale',
  'Smoke Beer':                                        'Smoke Beer',
  'Other Strong Ale or Lager':                         'Other Strong Ale/Lager',
  'Gluten-Free Beer':                                  'Glutensiz',
  'Non-Alcohol Malt Beverage':                         'Alkolsüz Bira',
  // BJCP locals
  'X1. Dorada Pampeana':                               'Dorada Pampeana',
  'X2. IPA Argenta':                                   'IPA Argenta',
  'X3. Italian Grape Ale':                             'Italian Grape Ale',
  'X4. Catharina Sour':                                'Catharina Sour',
  'X5. New Zealand Pilsner':                           'NZ Pilsner',
  // Modern others
  'Dampfbier':                                         'Dampfbier',
  'Weizen':                                            'Weizen (Bavarian)',
  'German-Style Rye Ale':                              'German Rye Ale',
};

// ═══ STOUT/PORTER SRM defaults (BA'da eksik) ═══
const SRM_DEFAULTS = {
  'Classic Irish-Style Dry Stout':        [25, 40],
  'Sweet Stout or Cream Stout':           [30, 40],
  'Oatmeal Stout':                        [22, 40],
  'Export-Style Stout':                   [25, 40],
  'American-Style Stout':                 [22, 40],
  'American-Style Imperial Porter':       [25, 40],
  'American-Style Imperial Stout':        [30, 40],
  'American-Style Wheat Wine Ale':        [5, 14],
  'American-Style Black Ale':             [25, 40],
  'Robust Porter':                        [22, 35],
  'Smoke Porter':                         [18, 35],
  'Baltic-Style Porter':                  [17, 30],
  'American-Style Sour Ale':              [3, 8],
  'American-Style Fruited Sour Ale':      [3, 18],
  'Belgian-Style Session Ale':            [3, 18],
  'Belgian-Style Fruit Lambic':           [3, 15],
  'American-Belgo-Style Ale':             [3, 30],
  'Smoke Porter':                         [18, 35],
  'Session Beer':                         [2, 40],
  'Kellerbier or Zwickelbier':            [3, 25],
  'Brett Beer':                           [3, 20],
  'Mixed-Culture Brett Beer':             [3, 30],
  'Wild Beer':                            [3, 30],
  'Smoke Beer':                           [3, 40],
  'Historical Beer':                      [3, 40],
  'Specialty Beer':                       [2, 40],
};

// ═══ OG/ABV/IBU defaults for specialty (widest plausible) ═══
const SPECIALTY_VITALS_DEFAULTS = {
  og: [1.030, 1.100],
  fg: [1.005, 1.025],
  ibu: [0, 80],
  abv: [3.0, 12.0],
};

// ═══ SLUG oluştur ═══
function makeSlug(name) {
  return name.toLowerCase()
    .replace(/[ıİ]/g, 'i').replace(/[öÖ]/g, 'o').replace(/[üÜ]/g, 'u')
    .replace(/[şŞ]/g, 's').replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g')
    .replace(/-style\b/g, '')
    .replace(/\bclassic\b|\btraditional\b|\bcontemporary\b/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/__+/g, '_');
}

// ═══ BUILD ═══
const BM_names = Object.keys(bmSigs);
const bmToCanon = new Map(Object.entries(BM_TO_CANON));

// Also build reverse — canonical -> bm names (for signature merging)
const canonToBm = new Map();
for (const [bm, canon] of bmToCanon) {
  if (!canonToBm.has(canon)) canonToBm.set(canon, []);
  canonToBm.get(canon).push(bm);
}
// Plus any BM name that equals a hybrid name directly
const hybridNames = new Set(hybrid.map(h => h.name));
for (const bmName of BM_names) {
  if (hybridNames.has(bmName) && !bmToCanon.has(bmName)) {
    canonToBm.set(bmName, [bmName]);
  }
}

function mergeSignatures(canonName) {
  const bmList = canonToBm.get(canonName) || [];
  if (bmList.length === 0) return null;
  // Take the first BM signature that exists. If more than one, keep first.
  for (const bmName of bmList) {
    if (bmSigs[bmName]) return { ...bmSigs[bmName], __source: bmName };
  }
  return null;
}

const defs = {};
for (const h of hybrid) {
  const name = h.name;
  const slug = makeSlug(name);
  if (!slug) continue;
  if (defs[slug]) {
    // duplicate slug — disambiguate
    let i = 2;
    while (defs[slug + '_' + i]) i++;
    defs[slug + '_' + i] = null;
  }
  const cat = meta.inferCategory(name);
  const yeast = meta.yeastFamilyFor(name);
  const weights = meta.weightsFor(name);
  const hardZero = meta.hardZeroFor(name);
  const sig = mergeSignatures(name);
  const aliases = [];
  // BJCP name alias
  if (h.bjcpName && h.bjcpName !== name) aliases.push(h.bjcpName);
  // BM signature names that map to this canonical
  for (const bmName of (canonToBm.get(name) || [])) {
    if (bmName !== name && !aliases.includes(bmName)) aliases.push(bmName);
  }

  // SRM/OG/... defaults
  let og = h.og, fg = h.fg, ibu = h.ibu, srm = h.srm, abv = h.abv;
  if (!srm && SRM_DEFAULTS[name]) srm = SRM_DEFAULTS[name];
  if (cat === 'specialty' && (!og || !ibu || !abv)) {
    og  = og  || SPECIALTY_VITALS_DEFAULTS.og;
    fg  = fg  || SPECIALTY_VITALS_DEFAULTS.fg;
    ibu = ibu || SPECIALTY_VITALS_DEFAULTS.ibu;
    abv = abv || SPECIALTY_VITALS_DEFAULTS.abv;
    srm = srm || SRM_DEFAULTS[name] || [2, 40];
  }

  defs[slug] = {
    slug,
    name,
    displayTR: DISPLAY_TR[name] || name.replace(/-Style /g, ' ').replace(/\s+/g, ' ').replace(/ Beer$/, '').trim(),
    bjcpCode: h.bjcpCode || null,
    bjcpName: h.bjcpName || null,
    category: cat,
    sources: h.sources || [],
    aliases,
    og, fg, ibu, srm, abv,
    yeast,
    weights,
    hardZero,
    signature: sig,
  };
}

// Write output
fs.writeFileSync('./STYLE_DEFINITIONS.json', JSON.stringify(defs, null, 2), 'utf8');

const defsArr = Object.values(defs).filter(Boolean);
console.log('Total style definitions:', defsArr.length);
console.log('Categories:');
const catCounts = {};
for (const d of defsArr) catCounts[d.category] = (catCounts[d.category]||0) + 1;
for (const [c,n] of Object.entries(catCounts).sort((a,b)=>b[1]-a[1])) console.log(' ', c, n);

console.log('\nSignature coverage:', defsArr.filter(d=>d.signature).length, '/', defsArr.length);
console.log('HardZero rules set:', defsArr.filter(d=>d.hardZero.length>0).length, '/', defsArr.length);
console.log('BJCP coded:', defsArr.filter(d=>d.bjcpCode).length, '/', defsArr.length);

// Example output — Kaan focus styles
console.log('\n=== ÖRNEKLER ===');
['south_german_hefeweizen','south_german_weizenbock','belgian_dubbel','belgian_tripel','belgian_witbier','american_india_pale_ale','juicy_or_hazy_india_pale_ale','classic_irish_dry_stout'].forEach(s => {
  const d = defs[s];
  if (!d) { console.log('(not found:', s, ')'); return; }
  console.log('\n---', d.slug, '|', d.displayTR, '---');
  console.log('  name:       ', d.name);
  console.log('  bjcp:       ', d.bjcpCode, d.bjcpName);
  console.log('  category:   ', d.category);
  console.log('  og/fg:      ', d.og, '/', d.fg);
  console.log('  ibu/srm/abv:', d.ibu, '/', d.srm, '/', d.abv);
  console.log('  yeast:      ', d.yeast);
  console.log('  weights:    ', d.weights);
  console.log('  hardZero:   ', d.hardZero.length, 'kural');
  d.hardZero.forEach(r => console.log('      -', r.reason));
  console.log('  signature:  ', d.signature ? Object.keys(d.signature).filter(k=>k!=='__source').join(', ') : '(yok)');
  console.log('  aliases:    ', d.aliases.join(', ') || '(yok)');
});

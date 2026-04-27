// Collect Brulosophy recipe URLs from multiple sources
const fs = require('fs');

const allUrls = new Set();

// Method A: from _brulo_recipes_listing.html
{
  const html = fs.readFileSync('./_brulo_recipes_listing.html', 'utf8');
  const re = /href="(https:\/\/brulosophy\.com\/recipes\/[a-z0-9-]+\/?)"/g;
  let m;
  while ((m = re.exec(html))) allUrls.add(m[1]);
}

// Method B: post-sitemap.xml has /YYYY/MM/DD/slug/ posts
const sm1 = fs.readFileSync('./_brulo_post_sm.xml', 'utf8');
const sm2 = fs.existsSync('./_brulo_post_sm2.xml') ? fs.readFileSync('./_brulo_post_sm2.xml','utf8') : '';
const allXml = (sm1 + sm2).replace(/[\r\n]/g, ' ');
const reAll = /<loc>(https:\/\/brulosophy\.com\/[^<]+)<\/loc>/g;
const blogUrls = [];
let m;
while ((m = reAll.exec(allXml))) blogUrls.push(m[1]);
console.log('All blog URLs from sitemaps:', blogUrls.length);

// Identify recipe URLs in blog posts: titles often have "exBEERiment" or "Recipe", but the cleanest signal is /YYYY/MM/DD/ pattern
const dateUrls = blogUrls.filter(u => /\/[0-9]{4}\/[0-9]{2}\/[0-9]{2}\//.test(u));
console.log('Date-based blog post URLs:', dateUrls.length);

// Direct /recipes/ URLs
const recipeUrls = blogUrls.filter(u => /\/recipes\//.test(u));
console.log('Direct /recipes/ URLs in sitemap:', recipeUrls.length);
recipeUrls.slice(0, 5).forEach(u => console.log('  ' + u));

console.log('\nFrom listing page (Method A): ' + allUrls.size);
console.log('Listing slugs:', [...allUrls].map(u=>u.split('/').filter(Boolean).pop()).join(', '));

// Combined unique
for (const u of recipeUrls) allUrls.add(u.endsWith('/') ? u : u + '/');
console.log('\nUnique total:', allUrls.size);

fs.writeFileSync('_brulo_all_recipe_urls.json', JSON.stringify([...allUrls].sort(), null, 2));
fs.writeFileSync('_brulo_all_blog_urls.json', JSON.stringify(blogUrls, null, 2));
console.log('Saved _brulo_all_recipe_urls.json + _brulo_all_blog_urls.json');

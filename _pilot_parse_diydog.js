const fs=require('fs');
const https=require('https');
const urls=JSON.parse(fs.readFileSync('/tmp/_diydog_urls.json','utf8'));

function fetchText(url){
  return new Promise(r=>{
    https.get(url,{timeout:15000,headers:{'User-Agent':'brewmaster-audit'}},(res)=>{
      let c=[]; res.on('data',x=>c.push(x));
      res.on('end',()=>r({status:res.statusCode,body:Buffer.concat(c).toString('utf8')}));
    }).on('error',e=>r({error:e.message})).on('timeout',function(){this.destroy();r({error:'timeout'});});
  });
}

function tagText(s, t){
  const re = new RegExp('<'+t+'>([\\s\\S]*?)<\\/'+t+'>', 'i');
  const m = s.match(re);
  return m ? m[1].trim() : null;
}
function tagAll(s, t){
  const re = new RegExp('<'+t+'>([\\s\\S]*?)<\\/'+t+'>', 'gi');
  const r=[]; let m;
  while((m=re.exec(s))!==null) r.push(m[1]);
  return r;
}
function num(v){ if(v==null) return null; const n=parseFloat(v); return isNaN(n)?null:n; }

function parseBeerXML(xml){
  const recipes = tagAll(xml, 'RECIPE');
  return recipes.map(r=>{
    const styleBlock = tagText(r,'STYLE')||'';
    const ferms = tagAll(r,'FERMENTABLE').map(f=>({
      name: tagText(f,'NAME'), amount_kg: num(tagText(f,'AMOUNT')),
      type: tagText(f,'TYPE'), color: num(tagText(f,'COLOR')), yield_pct: num(tagText(f,'YIELD'))
    }));
    const hops = tagAll(r,'HOP').map(h=>({
      name: tagText(h,'NAME'), amount_kg: num(tagText(h,'AMOUNT')),
      alpha: num(tagText(h,'ALPHA')), use: tagText(h,'USE'), time: num(tagText(h,'TIME'))
    }));
    const yeasts = tagAll(r,'YEAST').map(y=>({name: tagText(y,'NAME'), type: tagText(y,'TYPE'), form: tagText(y,'FORM')}));
    return {
      name: tagText(r,'NAME'),
      type: tagText(r,'TYPE'),
      batch_size_l: num(tagText(r,'BATCH_SIZE')),
      boil_time: num(tagText(r,'BOIL_TIME')),
      efficiency: num(tagText(r,'EFFICIENCY')),
      og: num(tagText(r,'OG')),
      fg: num(tagText(r,'FG')),
      ibu: num(tagText(r,'IBU')),
      color_srm: num(tagText(r,'EST_COLOR')||tagText(r,'COLOR')),
      style_name: tagText(styleBlock,'NAME'),
      style_category: tagText(styleBlock,'CATEGORY'),
      fermentables: ferms, hops, yeasts
    };
  });
}

(async()=>{
  const sampleIdx = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 50, 100, 200, 320];
  const parsed=[];
  for(const i of sampleIdx){
    if(!urls[i]) continue;
    const u=urls[i];
    process.stderr.write('['+i+'] '+u.name+' ... ');
    const r=await fetchText(u.url);
    if(r.error || r.status!==200){ process.stderr.write('FAIL '+(r.error||r.status)+'\n'); continue; }
    try {
      const recs = parseBeerXML(r.body);
      recs.forEach(rec=>{ parsed.push(Object.assign({source_file: u.name}, rec)); });
      process.stderr.write('OK ('+recs.length+' rec, '+(recs[0]?recs[0].fermentables.length:0)+' ferm, '+(recs[0]?recs[0].hops.length:0)+' hops)\n');
    } catch(e){ process.stderr.write('PARSE_ERR '+e.message+'\n'); }
    await new Promise(r=>setTimeout(r,300));
  }
  fs.writeFileSync('_pilot_github_beerxml_sample.json', JSON.stringify(parsed, null, 2));
  console.log('\nWrote _pilot_github_beerxml_sample.json');
  console.log('Total parsed recipes:', parsed.length);
  console.log('with name:', parsed.filter(r=>r.name).length);
  console.log('with style:', parsed.filter(r=>r.style_name).length);
  console.log('with og:', parsed.filter(r=>r.og).length);
  console.log('with fermentables>=1:', parsed.filter(r=>r.fermentables.length>=1).length);
  console.log('with hops>=1:', parsed.filter(r=>r.hops.length>=1).length);
  console.log('with yeasts>=1:', parsed.filter(r=>r.yeasts.length>=1).length);
  if(parsed.length){
    console.log('\nFirst sample:');
    const r=parsed[0];
    console.log(' '+r.name+' style="'+r.style_name+'" OG='+r.og+' IBU='+r.ibu);
    console.log(' Fermentables:'); r.fermentables.forEach(f=>console.log('   '+f.amount_kg+'kg '+f.name));
    console.log(' Hops:'); r.hops.slice(0,3).forEach(h=>console.log('   '+h.amount_kg+'kg '+h.name+' @'+h.time+'min'));
  }
})();

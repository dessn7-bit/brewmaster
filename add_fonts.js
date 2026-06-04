// 180 yeni karakter fontunu offline (fonts/ + @font-face) ekler.
// Kaan'in talimatindaki iskelet — son bozulmus mesajlar kapanis (for/try/catch
// + HTML enjeksiyon + sw.js update + cache bump + rapor) ile tamamlandi.
const fs=require('fs');
const HTML='Brewmaster_v2_79_10.html';
const SW='sw.js';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const FONTS=["Anton","Archivo Black","Bebas Neue","League Gothic","Fjalla One","Teko","Staatliches","Alfa Slab One","Bevan","Ultra","Bowlby One SC","Forum","Trocchi","Cinzel Decorative","Rozha One","Bodoni Moda","Yeseva One","Paytone One","Luckiest Guy","Bungee","Kaushan Script","Pacifico","Caveat","Dancing Script","Sacramento","Great Vibes","Lobster","Courgette","Yellowtail","Barlow Condensed","Saira Condensed","Big Shoulders Display","Pathway Gothic One","Khand","Russo One","Audiowide","Sigmar One","Monoton","Black Ops One","Racing Sans One","Rajdhani","Saira","Oxanium","Michroma","Chakra Petch","Megrim","Marcellus SC","Cormorant SC","Old Standard TT","Bree Serif","Sorts Mill Goudy","Eczar","Bellefair","Yrsa","Bentham","Gilda Display","Inknut Antiqua","Amita","Pinyon Script","Allura","Alex Brush","Marck Script","Bad Script","Patrick Hand","Indie Flower","Shadows Into Light","Architects Daughter","Kalam","Amatic SC","Damion","Grand Hotel","Pattaya","Berkshire Swash","Parisienne","Sriracha","Bungee Shade","Fascinate","Sancreek","Modak","Shrikhand","Pirata One","Grenze Gotisch","MedievalSharp","New Rocker","Rowdies","Press Start 2P","Righteous","Zeyada","Bangers","Special Elite","Gabarito","Rammetto One","Eater","Playball","Gloria Hallelujah","Poiret One","Merienda","Dela Gothic One","Italianno","Goldman","Caveat Brush","Pangolin","Unica One","Allison","Calistoga","Ms Madi","Limelight","La Belle Aurore","Covered By Your Grace","Charm","Just Another Hand","Lemonada","MuseoModerno","Potta One","Pixelify Sans","Coda","Aboreto","Barriecito","Grandstander","Balsamiq Sans","Yatra One","Tilt Warp","Bellota Text","Red Rose","Corben","Jersey 25","DynaPuff","Tektur","Shadows Into Light Two","Nova Square","Vina Sans","Honk","Big Shoulders","Funnel Display","Protest Revolution","Baloo Da 2","Norican","Ephesis","Oooh Baby","Kablammo","Fuzzy Bubbles","Quintessential","Agbalumo","Chonburi","Style Script","Playpen Sans","Arizonia","Mansalva","Metamorphous","Petit Formal Script","Amarante","Waiting for the Sunrise","Annie Use Your Telescope","Faster One","Baloo Thambi 2","Over the Rainbow","Qwitcher Grypen","Sedgwick Ave Display","Flow Circular","Tilt Neon","Rubik Glitch","Coiny","Love Ya Like A Sister","Fondamento","Ribeye","Turret Road","Croissant One","Yesteryear","Vujahday Script","Birthstone","Hurricane","Viaoda Libre","Eagle Lake","Corinthia","Whisper","Meddon","Licorice","WindSong","Meow Script","Kavivanar"];

const SERIFS_ADD=["Bevan","Ultra","Trocchi","Rozha One","Bodoni Moda","Marcellus SC","Cormorant SC","Old Standard TT","Bree Serif","Sorts Mill Goudy","Eczar","Bellefair","Yrsa","Bentham","Gilda Display","Inknut Antiqua"];

const slug=s=>s.replace(/[^A-Za-z0-9]/g,'');

let html=fs.readFileSync(HTML,'utf8');
if(html.includes('id="bm-extra-fonts"')){console.error('ZATEN EKLENMIS - durduruldu');process.exit(1);}

if(!fs.existsSync('fonts')) fs.mkdirSync('fonts');

(async()=>{
  const ffLines=[], swLines=[], fail=[];
  let okCount=0;

  for(const fam of FONTS){
    try{
      const url='https://fonts.googleapis.com/css2?family='+encodeURIComponent(fam)+'&display=swap';
      const css=await (await fetch(url,{headers:{'User-Agent':UA}})).text();
      const blocks=css.split(/(?=@font-face)/);
      let got=0;
      for(const b of blocks){
        const u=b.match(/url\((https:\/\/[^)]+\.woff2)\)/);
        const ur=b.match(/unicode-range:\s*([^;]+);/);
        const fw=b.match(/font-weight:\s*([^;]+);/);
        const fs2=b.match(/font-style:\s*([^;]+);/);
        if(!u||!ur) continue;
        let sub=null;
        if(ur[1].includes('U+0100')) sub='latin-ext';
        if(ur[1].includes('U+0000-00FF')) sub='latin';
        if(!sub) continue;
        const buf=Buffer.from(await (await fetch(u[1],{headers:{'User-Agent':UA}})).arrayBuffer());
        const fname='fonts/'+slug(fam)+'-'+sub+'.woff2';
        fs.writeFileSync(fname,buf);
        ffLines.push("@font-face{font-family:'"+fam+"';font-style:"+(fs2?fs2[1].trim():'normal')+";font-weight:"+(fw?fw[1].trim():'400')+";font-display:swap;src:url('"+fname+"') format('woff2');unicode-range:"+ur[1].trim()+"}");
        swLines.push("  './"+fname+"',");
        got++;
      }
      if(got>0){ okCount++; process.stdout.write('.'); }
      else { fail.push(fam); process.stdout.write('X'); }
    }catch(e){
      fail.push(fam+' :: '+e.message);
      process.stdout.write('E');
    }
  }
  process.stdout.write('\n');

  console.log('\n=== INDIRME OZET ===');
  console.log('OK : '+okCount+' / '+FONTS.length);
  console.log('FAIL: '+fail.length);
  if(fail.length){
    console.log('--- failed:');
    fail.forEach(f=>console.log('  '+f));
  }
  if(okCount===0){ console.error('Hicbir font alinmadi - cikis'); process.exit(2); }

  // === HTML enjeksiyon ===
  // 1) <style id="bm-extra-fonts">...</style> bloku: </head> oncesi
  const styleBlock = '<style id="bm-extra-fonts">'+ffLines.join('')+'</style>';
  if(!html.includes('</head>')){ console.error('</head> bulunamadi'); process.exit(3); }
  html = html.replace('</head>', styleBlock+'</head>');

  // 2) BM_TIPO_FONTS dizisini genislet: "Baloo 2"]; -> "Baloo 2",<yeni>];
  const fontsTail = '"Baloo 2"];';
  if(!html.includes(fontsTail)){ console.error('BM_TIPO_FONTS sonu ("Baloo 2"];) bulunamadi'); process.exit(4); }
  const fontsAdd = FONTS.filter(f=>!fail.some(x=>x===f||x.startsWith(f+' :: '))).map(f=>'"'+f+'"').join(',');
  html = html.replace(fontsTail, '"Baloo 2",'+fontsAdd+'];');

  // 3) SERIFS objesini genislet: "Alegreya":1}; -> "Alegreya":1,<yeni:1>};
  const serifsTail = '"Alegreya":1};';
  if(!html.includes(serifsTail)){ console.error('SERIFS sonu ("Alegreya":1};) bulunamadi'); process.exit(5); }
  const serifsAdd = SERIFS_ADD.filter(f=>!fail.some(x=>x===f||x.startsWith(f+' :: '))).map(f=>'"'+f+'":1').join(',');
  if(serifsAdd) html = html.replace(serifsTail, '"Alegreya":1,'+serifsAdd+'};');

  fs.writeFileSync(HTML, html);
  console.log('HTML guncellendi: style#bm-extra-fonts ('+ffLines.length+' @font-face) + BM_TIPO_FONTS+'+okCount+' + SERIFS+'+SERIFS_ADD.length);

  // === sw.js: CRITICAL_LOCAL'a satirlar + CACHE_VERSION bump ===
  let sw=fs.readFileSync(SW,'utf8');
  // CRLF/LF agnostik: Baloo2-latin.woff2 satirindan sonraki ']' kapatma
  const swTailRe=/(\.\/fonts\/Baloo2-latin\.woff2',)(\r?\n)(\];)/;
  const swMatch=sw.match(swTailRe);
  if(!swMatch){ console.error('sw.js CRITICAL_LOCAL sonu bulunamadi'); process.exit(6); }
  const nl=swMatch[2]; // belge satir sonu (CRLF veya LF)
  sw = sw.replace(swTailRe, swMatch[1]+nl+swLines.join(nl)+nl+swMatch[3]);

  const verRe=/const CACHE_VERSION = 'bm-cache-v131-(\d+)';/;
  const vm=sw.match(verRe);
  if(!vm){ console.error('CACHE_VERSION bulunamadi'); process.exit(7); }
  const newVer='bm-cache-v131-'+(parseInt(vm[1],10)+1);
  sw = sw.replace(verRe, "const CACHE_VERSION = '"+newVer+"';");

  fs.writeFileSync(SW, sw);
  console.log('sw.js guncellendi: +'+swLines.length+' precache satir, CACHE_VERSION = '+newVer);
  console.log('=== TAMAM ===');
})().catch(e=>{ console.error('FATAL:',e); process.exit(99); });

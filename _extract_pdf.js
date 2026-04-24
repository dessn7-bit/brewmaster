const fs = require('fs');
const { PDFParse } = require('pdf-parse');
(async () => {
  const data = fs.readFileSync('C:\\Users\\Kaan\\brewmaster\\BA_2026_Guidelines.pdf');
  const parser = new PDFParse({ data });
  const result = await parser.getText();
  fs.writeFileSync('C:\\Users\\Kaan\\brewmaster\\BA_2026_raw.txt', result.text, 'utf8');
  console.log('Pages:', result.total);
  console.log('Text length:', result.text.length);
  await parser.destroy();
})().catch(e => { console.error('ERR:', e); process.exit(1); });

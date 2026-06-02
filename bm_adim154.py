#!/usr/bin/env python3
# Brewmaster Adim 154 - Hop muadil denetimi + yapisal duzeltme (base64 payload)
import re,glob,os,json,base64,gzip
B64="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"
P=json.loads(gzip.decompress(base64.b64decode(B64)).decode('utf-8'))
NEWH=P['NEWH']; NEWI=P['NEWI']; C=P['C']
cands=glob.glob('**/Brewmaster_v2_79_10.html',recursive=True) or glob.glob('**/Brewmaster*.html',recursive=True)
assert cands,"Brewmaster HTML bulunamadi"
HTML=cands[0]; print("HTML:",HTML)
s=open(HTML,encoding='utf-8').read()
def cnt(p): return len(re.findall(p,s))
hb=cnt(r'\{id:"[a-z0-9_]+",ad:"[^"]+",aa:')
assert hb==79, "GUVENLIK: HOPLAR %d, beklenen 79 - baseline farkli, DURUYORUM"%hb
assert cnt(r'\{id:"centus",ad:')==1 and cnt(r'\{id:"denali",ad:"[^"]*",aa:')==1 and cnt(r'\{id:"sultana",ad:')==1, "centus/denali/sultana HOPLAR eksik"
print("Baseline OK: HOPLAR 79")
s,n=re.subn(r'\n\s*\{id:"centus",ad:"[^"]*",aa:[^}]*\},?','',s); assert n==1,"centus HOPLAR=%d"%n
s,n=re.subn(r'\n\s*\{id:"denali",ad:"[^"]*",aa:[^}]*\},?','',s); assert n==1,"denali HOPLAR=%d"%n
s,n=re.subn(r'\{id:"sultana",ad:"[^"]*",aa:[^}]*\}',lambda m:NEWH,s,count=1); assert n==1,"sultana HOPLAR=%d"%n
ha=cnt(r'\{id:"[a-z0-9_]+",ad:"[^"]+",aa:'); assert ha==77,"HOPLAR sonra=%d"%ha
print("HOPLAR 79 -> 77 OK")
s,n=re.subn(r'\n\s*"centus":"(?:[^"\\]|\\.)*",?','',s); assert n==1,"centus info=%d"%n
s,n=re.subn(r'\n\s*"denali":"(?:[^"\\]|\\.)*",?','',s); assert n==1,"denali info=%d"%n
s,n=re.subn(r'"sultana":"(?:[^"\\]|\\.)*"',lambda m:NEWI,s,count=1); assert n==1,"sultana info=%d"%n
print("info-dict OK")
s,n=re.subn(r'(_neipaHops=\[[^\]]*?)"denali"([^\]]*\])',lambda m:m.group(1)+'"sultana"'+m.group(2),s,count=1); assert n==1,"_neipaHops=%d"%n
print("_neipaHops OK")
hm=re.search(r'const HOPLAR\s*=\s*\[(.*?)\];',s,re.S).group(1)
AD=dict(re.findall(r'\{id:"([a-z0-9_]+)",ad:"([^"]+)"',hm))
def find_block(t,k):
    a=t.find('"%s":['%k)
    if a<0: return None
    i=t.index('[',a); d=0; j=i
    while j<len(t):
        if t[j]=='[': d+=1
        elif t[j]==']':
            d-=1
            if d==0: return (a,j+1)
        j+=1
    return None
def build(k,subs):
    parts=['{id:"%s",ad:"%s",fark:"%s",detay:"%s"}'%(sid,AD[sid],fark,detay) for sid,fark,detay in subs]
    return '"%s":[%s]'%(k,','.join(parts))
allsub={x[0] for v in C.values() for x in v}
assert not [x for x in allsub if x not in AD], "kirik sub-id"
assert not [k for k in C if k not in AD], "kirik key-hop"
repl=0
for k,subs in C.items():
    blk=find_block(s,k); assert blk,"MUADIL blok yok: %s"%k
    s=s[:blk[0]]+build(k,subs)+s[blk[1]:]; repl+=1
assert repl==28,"degisen key-hop=%d"%repl
for k in ["centus","denali"]:
    blk=find_block(s,k); assert blk,"sil blok yok: %s"%k
    e=blk[1]; m=re.match(r'\s*,',s[e:])
    if m: e+=m.end()
    s=s[:blk[0]]+s[e:]
assert cnt(r'"denali":\[')==0 and cnt(r'"centus":\[')==0,"denali/centus key kaldi"
print("MUADIL: 28 duzeltildi, centus/denali key silindi")
open(HTML,'w',encoding='utf-8').write(s)
print("HTML yazildi")
sw=glob.glob(os.path.join(os.path.dirname(HTML) or '.','sw.js')) or glob.glob('**/sw.js',recursive=True)
assert sw,"sw.js bulunamadi"
sp=sw[0]; sc=open(sp,encoding='utf-8').read()
sc2,bn=re.subn(r'131-195','131-196',sc); assert bn>=1,"cache bump bulunamadi (131-195 yok)"
open(sp,'w',encoding='utf-8').write(sc2)
print("sw.js cache 131-195 -> 131-196 (%d): %s"%(bn,sp))
print("=== ADIM 154 BUILD TAMAM ===")

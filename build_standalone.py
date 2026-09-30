from pathlib import Path
import base64,re
p=Path(__file__).resolve().parent;html=(p/'index.html').read_text()
for css in ('app.css','interface.css'):
 tag=f'<link href="./css/{css}" rel="stylesheet"/>'
 assert html.count(tag)==1,css
 content=(p/'css'/css).read_text()
 html=html.replace(tag,'<style>\n'+content.replace('</style','<\\/style')+'\n</style>')
for js in ('boot.js','xlsx-native.js','app.js','enhancements.js','pwa.js'):
 tag=f'<script defer="True" src="./js/{js}"></script>' if js!='boot.js' else '<script src="./js/boot.js"></script>'
 assert html.count(tag)==1,js
 if js=='pwa.js':html=html.replace(tag,'<!-- PWA is applicable only to the HTTPS web edition -->')
 else:
  src=(p/'js'/js).read_text(); assert '</script' not in src.lower(),js
  html=html.replace(tag,'<script>\n'+src+'\n</script>')
tag='<script defer="True" src="./data/database.js"></script>'
assert html.count(tag)==1
js=(p/'data/database.js').read_text();assert '</script' not in js.lower()
html=html.replace(tag,'<script>\n'+js+'\n</script>')
for src,typ in [('assets/logos/humana-saude.png','image/png'),('assets/logos/bb-saude-seguros.png','image/png'),('icons/icon-192.png','image/png'),('favicon.ico','image/x-icon')]:
 html=html.replace('./'+src,'data:'+typ+';base64,'+base64.b64encode((p/src).read_bytes()).decode())
html=re.sub(r'<link href="\./manifest\.webmanifest" rel="manifest"\s*/>', '', html)
assert './js/' not in html and './css/' not in html and './data/' not in html
out=p/'Central_Comercial_Humana_BB_OFFLINE_NEXT_RELEASE.html';out.write_text(html)
print('STANDALONE_BYTES',out.stat().st_size,'URL_RESIDUAL',len(re.findall('src="\\./',html)))

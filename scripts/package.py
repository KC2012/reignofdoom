"""Package built browser game and complete source. No extra Python packages."""
from pathlib import Path
import zipfile, hashlib
root=Path(__file__).resolve().parent.parent
out=root/'downloads';out.mkdir(exist_ok=True)
if not (root/'dist/index.html').is_file():raise SystemExit('Run npm run build first.')
name='reign-of-doom-alpha3'
readme="""REIGN OF DOOM / ALPHA 3 — CHAOS EDITION

Run: node scripts/serve.mjs
Open the local address printed by the server. Node 24 recommended.
No npm install or network access is required to play the built game after loading.
Do not open index.html by double-clicking; serve it over HTTP.
For iPad on the same Wi-Fi, set HOST=0.0.0.0 before starting the server.
Use the tablet address printed in the terminal.
Two players starts immediately. Drag pieces; pull the ballista ring.

Safari/iPad hardware compatibility has not been verified in this environment.
See the complete package report for the tested configurations and limitations.
"""
with zipfile.ZipFile(out/f'{name}-browser.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted((root/'dist').rglob('*')):
  if p.is_file():z.write(p,f'{name}/'+str(p.relative_to(root)))
 z.write(root/'scripts/serve.mjs',f'{name}/scripts/serve.mjs')
 z.writestr(f'{name}/README.txt',readme)
with zipfile.ZipFile(out/f'{name}-complete.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(root.rglob('*')):
  rel=p.relative_to(root)
  if any(x in rel.parts for x in ['.git','node_modules','test-results','downloads','__pycache__']):continue
  if p.is_file():z.write(p,f'{name}-complete/'+str(rel))
 z.write(root/'downloads/reign-of-doom-alpha22-browser.zip',f'{name}-complete/preserved/reign-of-doom-alpha22-browser.zip')
for suffix in ['browser','complete']:
 p=out/f'{name}-{suffix}.zip';(out/(p.name+'.sha256')).write_text(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n');print(p.name,p.stat().st_size,'bytes')

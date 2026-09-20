import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'dist');
if(path.dirname(out)!==root || path.basename(out)!=='dist')throw Error('Invalid build output path');
await fs.rm(out,{recursive:true,force:true});
await fs.mkdir(out,{recursive:true});
// Explicit publish allowlist: server source, tests, docs and credentials never enter dist.
for(const file of ['index.html','privacy.html','terms.html','favicon.png','_redirects','VERSION.txt']) await fs.copyFile(path.join(root,file),path.join(out,file));
for(const directory of ['css','js','images','.well-known']) await fs.cp(path.join(root,directory),path.join(out,directory),{recursive:true});
console.log('Static production site built in dist; functions are bundled separately by Netlify.');

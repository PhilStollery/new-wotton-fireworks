import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'dist');
if(path.dirname(out)!==root || path.basename(out)!=='dist')throw Error('Invalid build output path');
await fs.rm(out,{recursive:true,force:true});
await fs.mkdir(out,{recursive:true});
// Explicit publish allowlist: server source, tests, docs and credentials never enter dist.
// Default to the post-event page. The sales switch is retained for controlled
// previews only until event content and Tito configuration are updated.
const siteMode=process.env.FIREWORKS_SITE_MODE||'thank-you';
if(!['sales','thank-you'].includes(siteMode))throw Error('Invalid FIREWORKS_SITE_MODE');
await fs.copyFile(path.join(root,siteMode==='thank-you'?'post-event.html':'index.html'),path.join(out,'index.html'));
for(const file of ['privacy.html','terms.html','favicon.png','_redirects','VERSION.txt']) await fs.copyFile(path.join(root,file),path.join(out,file));
for(const directory of ['css','js','images','.well-known']) await fs.cp(path.join(root,directory),path.join(out,directory),{recursive:true});
console.log(`Static ${siteMode} site built in dist; functions are bundled separately by Netlify.`);

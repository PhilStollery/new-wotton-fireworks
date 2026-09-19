import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(import.meta.dirname,'..');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);
for(const file of walk(path.join(root,'js')))new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
const sources=['index.html','privacy.html','terms.html',...walk(path.join(root,'css')).map(p=>path.relative(root,p)),...walk(path.join(root,'js')).map(p=>path.relative(root,p))];
const missing=[];
for(const file of sources){
 const text=fs.readFileSync(path.join(root,file),'utf8');
 for(const match of text.matchAll(/(?:images|css|js)\/[A-Za-z0-9_./-]+\.(?:png|jpg|css|js)/g))if(!fs.existsSync(path.join(root,match[0])))missing.push(`${file}: ${match[0]}`);
}
if(missing.length)throw Error(missing.join('\n'));
console.log('Browser JavaScript syntax and referenced local assets passed.');

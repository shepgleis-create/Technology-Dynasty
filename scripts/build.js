const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const assets=[...new Set([...html.matchAll(/(?:src|href)="\/([^"?#]+)(?:\?[^"#]*)?"/g)].map(m=>m[1]))];
for(const asset of assets)if(!fs.existsSync(path.join(root,asset)))throw new Error('Missing asset: '+asset);
for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.js')))new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);if(ids.length!==new Set(ids).size)throw new Error('Duplicate DOM IDs');
for(const view of ['home','engine','vehicle','library','research','market','companies','budget','finance'])if(!ids.includes('view-'+view))throw new Error('Missing workspace: '+view);
if(/mobileMoreBtn|id="moreModal"/.test(html))throw new Error('More navigation returned');
fs.mkdirSync(out,{recursive:true});
for(const f of fs.readdirSync(root)){if(/\.(html|js|css|svg|webmanifest)$/.test(f))fs.copyFileSync(path.join(root,f),path.join(out,f));}
fs.cpSync(path.join(root,'assets'),path.join(out,'assets'),{recursive:true});
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');for(const match of sw.matchAll(/^\s*"\/([^"?]*)"/gm)){if(!fs.existsSync(path.join(out,match[1]||'index.html')))throw new Error('Service worker asset missing: '+match[1]);}
console.log('Production build passed: '+assets.length+' entry assets, all JavaScript parsed, nine workspaces, offline shell verified.');

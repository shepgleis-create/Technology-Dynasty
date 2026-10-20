const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('technology identity and non-destructive root navigation',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/<title>Technology Dynasty<\/title>/);
 for(const view of ['home','research','engine','vehicle','library','market','budget','companies','finance'])assert.match(html,new RegExp('id="view-'+view+'"'));
 assert.match(html,/technology-industry\.js/);
 assert.match(html,/technology-theme\.js/);
 assert.doesNotMatch(html,/mobileMoreBtn|id="moreModal"/);
});
test('technology manifest and service worker references resolve',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
 assert.equal(manifest.name,'Technology Dynasty');
 assert.equal(manifest.orientation,'any');
 const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
 const entries=[...sw.matchAll(/^\s*"\/([^"?]*)"/gm)].map(m=>m[1]);
 for(const p of entries)if(p)assert.ok(fs.existsSync(path.join(root,p)),'missing offline shell asset: '+p);
});
test('technology profile pack contains real historical start dates',()=>{
 const vm=require('node:vm');const ctx={window:{MD_DATA:{MANUFACTURERS:[{id:'a'},{id:'b'},{id:'c'}],HQS:[]}}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'technology-industry.js'),'utf8'),ctx);
 assert.equal(ctx.window.MD_DATA.MANUFACTURERS[0].name,'IBM');
 assert.equal(ctx.window.MD_DATA.MANUFACTURERS[1].founded,1939);
 assert.ok(ctx.window.TD_INDUSTRY.companyProfiles.length>=60);
});

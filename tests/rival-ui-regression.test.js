const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.join(__dirname,"..");
const game=fs.readFileSync(path.join(root,"game.js"),"utf8");
const css=fs.readFileSync(path.join(root,"style.css"),"utf8");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");

test("rival dossier exposes acquisition actions without scrolling to the bottom",()=>{
  assert.match(game,/id='subQuickBtn'/);
  assert.match(game,/id='mergeQuickBtn'/);
  assert.match(game,/id='stakeQuickBtn'/);
  assert.match(game,/subQuickBtn.*openDeal\(m\.id,"subsidiary"\)/s);
});

test("rival dossier always has explicit close paths",()=>{
  assert.match(html,/id="closeRivalDetail"[\s\S]*<em>CLOSE<\/em>/);
  assert.match(game,/rivalDetailModal"\)\?\.addEventListener\("click",e=>\{if\(e\.target===e\.currentTarget\)closeRivalDetail\(\);\}\)/);
  assert.match(game,/e\.key==="Escape"&&rivalDetailOpen/);
});

test("mobile game scrolling stays contained and modal close restores list position",()=>{
  assert.doesNotMatch(css,/overscroll-behavior-y:auto!important/);
  assert.match(css,/body\.modal-open \.game-main\{overflow:hidden!important;touch-action:none!important\}/);
  assert.match(game,/modalGameScrollY=main\?\.scrollTop\|\|0/);
  assert.match(game,/main\.scrollTop=modalGameScrollY/);
});

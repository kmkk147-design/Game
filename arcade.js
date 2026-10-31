(() => {
'use strict';
const $=id=>document.getElementById(id);
const $all=sel=>Array.from(document.querySelectorAll(sel));
const scenes={trace:$('tracingScreen'),mole:$('moleScreen'),fire:$('fireScreen')};
let current='trace';
const labels={trace:['선 따라 <em>쓱쓱!</em> 🎨','10초 동안 한 번에 선을 따라 그려요. 손을 떼면 채점!'],mole:['두더지 <em>팡팡!</em> 🐹','30초 안에 뿅망치로 두더지를 많이 잡아요!'],fire:['출동! <em>꼬마 소방관</em> 🚒','60초 동안 불난 창문을 눌러요. 3초를 넘기면 집이 타요!']};
let sound=null;
function beep(freq=500,ms=90,type='sine',volume=.07){
 if($('soundBtn').textContent.includes('꺼짐'))return;
 try{sound??=new (window.AudioContext||window.webkitAudioContext)();if(sound.state==='suspended')sound.resume().catch(()=>{});
 const t=sound.currentTime,osc=sound.createOscillator(),gain=sound.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,t);gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(volume,t+.01);gain.gain.exponentialRampToValueAtTime(.0001,t+ms/1000);osc.connect(gain);gain.connect(sound.destination);osc.start(t);osc.stop(t+ms/1000+.02);
 }catch(_){/* no audio support is fine */}
}
function cheer(){[525,659,784,1047].forEach((n,i)=>setTimeout(()=>beep(n,150,'sine',.07),i*110));}
function setGame(id){
 if(id===current)return;
 if(current==='trace')window.GameTrace?.stop?.();
 else if(current==='mole')stopMole();
 else stopFire();
 current=id;
 Object.keys(scenes).forEach(key=>{scenes[key].hidden=key!==id;});
 $all('.game-tab').forEach(btn=>{const selected=btn.dataset.game===id;btn.classList.toggle('active',selected);btn.setAttribute('aria-selected',String(selected));btn.tabIndex=selected?0:-1;});
 $('heroTitle').innerHTML=labels[id][0];$('heroDesc').textContent=labels[id][1];
 if(id==='fire')renderRank();
}
$all('.game-tab').forEach(tab=>tab.addEventListener('click',()=>setGame(tab.dataset.game)));
$all('.game-tab').forEach((tab,index)=>tab.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const tabs=$all('.game-tab');const idx=(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;setGame(tabs[idx].dataset.game);tabs[idx].focus();}));

// Whack-a-mole: 30-second arcade game with illustrated moles and decoy cats.
// Tapping a mole gains points, while tapping a cat deducts 20 points.
// Cats stick out their tongues and tease before sliding back into the hole.
const mo={running:false,interval:null,timers:new Set(),active:-1,activeKind:null,activeUntil:0,nextAt:0,deadline:0,last:-1,score:0,hits:0,misses:0,catsHit:0,catsAvoided:0,catStreak:0,combo:0,best:0};
const holes=[];
const moleFaceMarkup=`<span class="critter critter-mole" aria-hidden="true">
  <i class="critter-body"></i><i class="critter-ear ear-l"></i><i class="critter-ear ear-r"></i>
  <i class="critter-head"></i><i class="critter-eye eye-l"></i><i class="critter-eye eye-r"></i>
  <i class="critter-muzzle"></i><i class="critter-nose"></i><i class="critter-paw paw-l"></i><i class="critter-paw paw-r"></i>
</span>`;
const catFaceMarkup=`<span class="critter critter-cat" aria-hidden="true">
  <i class="critter-body"></i><i class="critter-ear ear-l"></i><i class="critter-ear ear-r"></i>
  <i class="critter-head"></i><i class="cat-stripe stripe-l"></i><i class="cat-stripe stripe-r"></i>
  <i class="critter-eye eye-l"></i><i class="critter-eye eye-r"></i><i class="critter-muzzle"></i>
  <i class="critter-nose"></i><i class="cat-whisker whisker-l"></i><i class="cat-whisker whisker-r"></i>
  <i class="cat-tongue"></i><i class="critter-paw paw-l"></i><i class="critter-paw paw-r"></i>
</span>`;
for(let i=0;i<9;i++){
 const b=document.createElement('button');
 b.type='button';b.className='mole-hole';b.dataset.index=String(i);b.dataset.kind='mole';
 b.setAttribute('aria-label',(i+1)+'번 빈 구멍');
 const face=document.createElement('span');face.className='mole-face';
 face.innerHTML=moleFaceMarkup+catFaceMarkup;
 const star=document.createElement('span');star.className='mole-hit-star';star.textContent='✨🥰✨';
 b.append(face,star);b.addEventListener('click',e=>hitMole(i,e));
 holes.push(b);$('moleGrid').append(b);
}
function moTimer(fn,ms){const id=setTimeout(()=>{mo.timers.delete(id);fn();},ms);mo.timers.add(id);}
function clearMoleTimers(){
 if(mo.interval)clearInterval(mo.interval);mo.interval=null;
 for(const t of mo.timers)clearTimeout(t);mo.timers.clear();
}
function stopMole(){
 mo.running=false;clearMoleTimers();mo.active=-1;mo.activeKind=null;
 holes.forEach(h=>{h.classList.remove('up','whacked','teasing','sinking');h.setAttribute('aria-label',(Number(h.dataset.index)+1)+'번 빈 구멍');});
 $('moleHammer').classList.remove('swing');$('moleStart').disabled=false;
}
function moleValues(){
 $('moleScore').textContent=mo.score+'점';$('moleCombo').textContent=String(mo.combo);
}
function startMole(){
 stopMole();mo.running=true;mo.score=mo.hits=mo.misses=mo.catStreak=mo.catsHit=mo.catsAvoided=mo.combo=mo.best=0;
 mo.active=-1;mo.activeKind=null;mo.last=-1;
 mo.deadline=performance.now()+30000;mo.nextAt=performance.now()+350;
 $('moleTime').textContent='30초';$('moleTime').parentElement.classList.remove('urgent');moleValues();
 $('moleResult').hidden=true;$('moleStart').disabled=true;$('moleStart').textContent='🔨 두더지 잡는 중!';
 $('moleTip').textContent='두더지 +10~30점 · 고양이 −20점! 🐱';
 beep(530,90);mo.interval=setInterval(tickMole,65);tickMole();
}
function spawnMole(now){
 const candidates=holes.map((_,i)=>i).filter(i=>i!==mo.last);
 if(!candidates.length)return;
 const idx=candidates[Math.floor(Math.random()*candidates.length)];
 const isCat=mo.catStreak<2&&Math.random()<.30;
 mo.catStreak=isCat?mo.catStreak+1:0;
 mo.last=idx;mo.active=idx;mo.activeKind=isCat?'cat':'mole';
 mo.activeUntil=now+Math.max(850,1370-mo.hits*9);
 const hole=holes[idx];hole.dataset.kind=mo.activeKind;
 hole.classList.remove('whacked','teasing','sinking');
 hole.querySelector('.mole-hit-star').textContent=isCat?'😛 메롱!':'✨🥰✨';
 hole.classList.add('up');
 hole.setAttribute('aria-label',(idx+1)+'번 '+(isCat?'고양이! 때리지 마세요':'두더지! 눌러 잡으세요'));
 $('moleTip').textContent=isCat?'🐱 고양이는 건드리지 마세요!':'🐾 두더지예요! 뿅망치로 잡아요!';
}
function tickMole(){
 if(!mo.running)return;
 const now=performance.now(),left=Math.max(0,Math.ceil((mo.deadline-now)/1000));
 $('moleTime').textContent=left+'초';$('moleTime').parentElement.classList.toggle('urgent',left<=5);
 if(now>=mo.deadline){finishMole();return;}
 if(mo.active!==-1&&now>=mo.activeUntil){
  const idx=mo.active,kind=mo.activeKind;mo.active=-1;mo.activeKind=null;
  if(kind==='mole'){mo.misses++;mo.combo=0;moleValues();}
  else if(kind==='cat')mo.catsAvoided++;
  const hole=holes[idx];hole.classList.remove('up');hole.classList.add('sinking');
  hole.setAttribute('aria-label',(idx+1)+'번 빈 구멍');
  moTimer(()=>hole.classList.remove('sinking'),280);
  mo.nextAt=now+260;
 }
 if(mo.active===-1&&now>=mo.nextAt)spawnMole(now);
}
function swingHammer(evt){
 const arena=$('moleArena'),pos=arena.getBoundingClientRect(),h=$('moleHammer');
 const x=evt.clientX-pos.left,y=evt.clientY-pos.top;
 h.style.left=Math.max(0,Math.min(pos.width-65,x-38))+'px';
 h.style.top=Math.max(0,Math.min(pos.height-70,y-76))+'px';
 h.classList.remove('swing');void h.offsetWidth;h.classList.add('swing');
}
function popMole(i,text){
 const pop=$('molePop'),r=$('moleArena').getBoundingClientRect(),b=holes[i].getBoundingClientRect();
 pop.textContent=text;pop.style.left=(b.left-r.left+b.width*.08)+'px';pop.style.top=(b.top-r.top)+'px';
 pop.classList.remove('visible');void pop.offsetWidth;pop.classList.add('visible');
}
function hitMole(i,e){
 if(!mo.running||i!==mo.active)return;
 const now=performance.now();if(now>=mo.deadline){finishMole();return;}
 if(now>=mo.activeUntil){tickMole();return;}
 const kind=mo.activeKind;mo.active=-1;mo.activeKind=null;
 const hole=holes[i];hole.classList.remove('up');
 swingHammer(e);
 if(kind==='cat'){
  mo.catsHit++;mo.combo=0;mo.score=Math.max(0,mo.score-20);
  moleValues();hole.classList.add('teasing');
  hole.setAttribute('aria-label',(i+1)+'번 고양이가 메롱하며 놀려요');
  hole.querySelector('.mole-hit-star').textContent='😛 메롱!';
  popMole(i,'😜 메롱! −20점');
  $('moleTip').textContent='앗! 고양이는 때리면 안 돼요! −20점';
  beep(450,130,'sawtooth',.05);
  moTimer(()=>beep(285,160,'triangle',.05),140);
  moTimer(()=>{hole.classList.remove('teasing');hole.classList.add('sinking');},610);
  moTimer(()=>{hole.classList.remove('sinking');hole.setAttribute('aria-label',(i+1)+'번 빈 구멍');},930);
  mo.nextAt=now+850;
  return;
 }
 mo.hits++;mo.combo++;mo.best=Math.max(mo.best,mo.combo);
 const gain=10+Math.min(20,(mo.combo-1)*2);mo.score+=gain;moleValues();
 hole.classList.add('whacked');
 hole.setAttribute('aria-label',(i+1)+'번 두더지를 잡았어요');
 hole.querySelector('.mole-hit-star').textContent='✨🥰✨';
 popMole(i,'✨ +'+gain+'점 🥰');
 beep(380,95,'triangle',.095);moTimer(()=>beep(620,100,'sine',.065),70);
 mo.nextAt=now+380;
 moTimer(()=>{hole.classList.remove('whacked');hole.setAttribute('aria-label',(i+1)+'번 빈 구멍');},370);
}
function finishMole(){
 if(!mo.running)return;stopMole();$('moleTime').textContent='0초';$('moleTip').textContent='30초 도전 완료!';
 $('moleResult').hidden=false;
 $('moleResultEmoji').textContent=mo.hits>=16?'🏆':'🐾';
 $('moleResultTitle').textContent=mo.hits>=16?'두더지 달인!':'두더지 잡기 완료!';
 $('moleResultDetail').textContent=`${mo.hits}마리 잡았어요! 고양이 ${mo.catsHit}번 실수 · 최종 ${mo.score}점 · 최고 연속 ${mo.best}번 🎉`;
 $('moleStart').textContent='▶ 다시 시작';cheer();
}
$('moleStart').addEventListener('click',startMole);$('moleAgain').addEventListener('click',startMole);

// Fire station: 25 windows; each flame has its own EXACT 3-second deadline.
const TOTAL_WINDOWS=25,STORAGE='game-fire-rank-v1';
const fi={running:false,interval:null,deadline:0,spawnAt:0,flames:new Map(),burned:new Set(),score:0,hits:0,missed:0,streak:0,highest:0,saved:false,roundId:0,stage:1};
const windows=[];
for(let i=0;i<TOTAL_WINDOWS;i++){
 const btn=document.createElement('button');btn.type='button';btn.className='fire-window';btn.dataset.index=String(i);
 const fire=document.createElement('span');fire.className='flame-emoji';fire.textContent='🔥';
 const countdown=document.createElement('span');countdown.className='fire-count';countdown.textContent='3';btn.append(fire,countdown);
 btn.addEventListener('click',()=>putOutFire(i));windows.push(btn);$('fireWindows').append(btn);
}
function windowName(i){return (5-Math.floor(i/5))+'층 '+((i%5)+1)+'번 창문';}
function windowState(i){const b=windows[i];b.classList.toggle('burned',fi.burned.has(i));b.classList.toggle('burning',fi.flames.has(i));b.querySelector('.flame-emoji').textContent=fi.burned.has(i)?'💨':'🔥';b.setAttribute('aria-label',windowName(i)+(fi.flames.has(i)?' 불났어요! 빨리 끄기':fi.burned.has(i)?' 불에 탔어요':' 안전해요'));}
function fireValues(){ $('fireScore').textContent=fi.score.toLocaleString('ko-KR')+'점';$('fireHits').textContent=String(fi.hits);$('fireBurns').textContent=String(fi.burned.size); }
function stopFire(){fi.running=false;if(fi.interval)clearInterval(fi.interval);fi.interval=null;$('fireStart').disabled=false;}
function startFire(){
 stopFire();fi.roundId++;fi.score=fi.hits=fi.missed=fi.streak=fi.highest=0;fi.saved=false;fi.flames.clear();fi.burned.clear();fi.running=true;
 fi.deadline=performance.now()+60000;fi.spawnAt=performance.now()+650;fi.stage=1;updateFireDifficulty(fireDifficulty(0));
 windows.forEach((b,i)=>{b.classList.remove('splashed');windowState(i);});fireValues();
 $('fireTime').textContent='60초';$('fireTime').parentElement.classList.remove('urgent');
 $('fireResult').hidden=true;$('fireSave').disabled=false;$('fireSaveMsg').textContent='';
 $('fireStart').disabled=true;$('fireStart').textContent='🚒 소방 활동 중!';$('fireTip').textContent='🔥 3초 안에 불난 창문을 톡!';
 beep(450,130,'sawtooth',.06);fi.interval=setInterval(tickFire,70);tickFire();
}
function newFire(now){
 const candidates=windows.map((_,i)=>i).filter(i=>!fi.burned.has(i)&&!fi.flames.has(i));
 if(!candidates.length)return false;
 const i=candidates[Math.floor(Math.random()*candidates.length)];fi.flames.set(i,now+3000);windowState(i);beep(790,85,'square',.027);return true;
}
function burn(i){if(!fi.flames.has(i))return;fi.flames.delete(i);fi.burned.add(i);fi.streak=0;fi.missed++;windowState(i);fireValues();beep(145,175,'sawtooth',.065);}
// Each home has its own three-second fire deadline; difficulty increases in waves.
function fireDifficulty(elapsed){
 if(elapsed<12)return {level:1,max:1,burst:1,gap:1750,label:'🌱 1단계 · 한 집씩 차근차근'};
 if(elapsed<25)return {level:2,max:2,burst:2,gap:1500,label:'🔥 2단계 · 두 집에 불이 날 수 있어요'};
 if(elapsed<38)return {level:3,max:3,burst:2,gap:1250,label:'🔥🔥 3단계 · 동시에 세 집까지'};
 if(elapsed<50)return {level:4,max:4,burst:3,gap:1050,label:'🚨 4단계 · 네 집까지!'};
 return {level:5,max:5,burst:3,gap:850,label:'🚨🚨 5단계 · 다섯 집까지!'};
}
function updateFireDifficulty(d){
 const el=$('fireDifficulty');if(el){el.textContent=d.label;el.dataset.level=String(d.level);}
}
function tickFire(){
 if(!fi.running)return;
 const now=performance.now(),left=Math.max(0,Math.ceil((fi.deadline-now)/1000));
 $('fireTime').textContent=left+'초';$('fireTime').parentElement.classList.toggle('urgent',left<=10);
 if(now>=fi.deadline){finishFire();return;}
 for(const [i,endAt] of [...fi.flames]){
  if(now>=endAt)burn(i);
  else windows[i].querySelector('.fire-count').textContent=String(Math.max(1,Math.ceil((endAt-now)/1000)));
 }
 const elapsed=Math.max(0,(now-(fi.deadline-60000))/1000),difficulty=fireDifficulty(elapsed);
 if(difficulty.level!==fi.stage){fi.stage=difficulty.level;updateFireDifficulty(difficulty);fi.spawnAt=now;}
 if(now>=fi.spawnAt){
  // More than one apartment window can ignite in a single wave.
  const count=Math.min(difficulty.burst,difficulty.max-fi.flames.size);
  for(let i=0;i<count;i++){if(!newFire(now))break;}
  fi.spawnAt=now+difficulty.gap;
 }
 if(fi.burned.size===TOTAL_WINDOWS){finishFire(true);}
}
function putOutFire(i){
 if(!fi.running)return;const until=fi.flames.get(i),now=performance.now();
 if(!until)return;if(now>=until){burn(i);return;}
 fi.flames.delete(i);fi.hits++;fi.streak++;fi.highest=Math.max(fi.highest,fi.streak);
 fi.score+=100+Math.min(100,(fi.streak-1)*10);fireValues();windowState(i);
 const b=windows[i];b.classList.remove('splashed');void b.offsetWidth;b.classList.add('splashed');
 const splash=$('fireSplash'),r=$('fireScene').getBoundingClientRect(),p=b.getBoundingClientRect();splash.style.left=(p.left-r.left+p.width*.15)+'px';splash.style.top=(p.top-r.top-p.height*.2)+'px';splash.textContent='💦✨';splash.classList.remove('show');void splash.offsetWidth;splash.classList.add('show');
 beep(750,90,'sine',.085);setTimeout(()=>{if(fi.running)b.classList.remove('splashed')},320);
}
function finishFire(allBurned=false){
 if(!fi.running)return;
 stopFire();fi.flames.clear();windows.forEach((_,i)=>windowState(i));$('fireTime').textContent='0초';$('fireStart').textContent='▶ 다시 출동';
 $('fireTip').textContent='소방 임무가 끝났어요! 기록을 저장해 봐요';
 $('fireResult').hidden=false;
 const intact=TOTAL_WINDOWS-fi.burned.size;
 $('fireResultEmoji').textContent=intact===0?'🥺':intact>=22?'🏆':'🧑‍🚒';
 $('fireResultTitle').textContent=allBurned?'앗! 아파트에 불이 번졌어요!':intact>=22?'최고의 꼬마 소방관!':'출동 완료! 참 잘했어요!';
 $('fireResultDetail').textContent=`${fi.hits}번 불을 껐어요! ${intact}개 창문 구조 · ${fi.burned.size}개 창문 피해 · ${fi.score.toLocaleString('ko-KR')}점`;
 $('fireSave').disabled=false;fi.saved=false;cheer();
 $('fireResult').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function loadRank(){try{const data=JSON.parse(localStorage.getItem(STORAGE)||'[]');return Array.isArray(data)?data.filter(x=>x&&typeof x.score==='number'&&Number.isFinite(x.score)&&typeof x.name==='string').slice(0,100):[];}catch(_){return [];}}
function renderRank(highlight=''){
 const items=loadRank().sort((a,b)=>b.score-a.score||a.burned-b.burned||a.at-b.at).slice(0,20),ol=$('fireRankList');ol.replaceChildren();
 if(!items.length){const li=document.createElement('li');li.className='rank-empty';li.textContent='아직 기록이 없어요. 첫 번째 소방관이 되어 주세요!';ol.append(li);return;}
 for(let i=0;i<items.length;i++){
  const item=items[i],li=document.createElement('li');if(highlight&&item.id===highlight)li.style.background='#e9f8e6';
  const pos=document.createElement('span');pos.className='rank-pos';pos.textContent=['🥇','🥈','🥉'][i]||String(i+1);
  const name=document.createElement('span');name.textContent=item.name;const date=document.createElement('small');date.className='rank-date';date.textContent=`${new Date(item.at).toLocaleDateString('ko-KR')} · 불 끄기 ${item.hits}번 · 피해 ${item.burned}곳`;name.append(date);
  const score=document.createElement('span');score.className='rank-points';score.textContent=item.score.toLocaleString('ko-KR')+'점';li.append(pos,name,score);ol.append(li);
 }
}
function saveFire(){
 if(fi.running||$('fireResult').hidden||fi.saved)return;
 const name=$('firePlayer').value.trim().slice(0,12)||'용감한 소방관';
 const entry={id:String(Date.now())+'-'+String(Math.floor(Math.random()*1e8)),name,score:fi.score,hits:fi.hits,burned:fi.burned.size,at:Date.now()};
 try{
  const items=loadRank();items.push(entry);items.sort((a,b)=>b.score-a.score||a.burned-b.burned||a.at-b.at);
  const rank=items.findIndex(x=>x.id===entry.id)+1;
  localStorage.setItem(STORAGE,JSON.stringify(items.slice(0,100)));
  localStorage.setItem('game-fire-player',name);
  $('fireSaveMsg').textContent=`🎉 기록 저장 완료! 현재 이 기기 ${rank}등이에요!`;
  $('fireSave').disabled=true;fi.saved=true;renderRank(entry.id);
 }catch(_){ $('fireSaveMsg').textContent='⚠️ 브라우저 저장이 차단되어 있어요. 일반 모드에서 다시 시도해 주세요.';}
}
$('fireStart').addEventListener('click',startFire);
$('fireAgain').addEventListener('click',startFire);
$('fireSave').addEventListener('click',saveFire);
$('firePlayer').addEventListener('keydown',e=>{if(e.key==='Enter')saveFire();});
$('rankRefresh').addEventListener('click',()=>renderRank());
try{$('firePlayer').value=localStorage.getItem('game-fire-player')||'';}catch(_){}
renderRank();
// If a phone goes to sleep, use the monotonic deadline and process expiration on resume.
document.addEventListener('visibilitychange',()=>{if(document.hidden)return;if(mo.running)tickMole();if(fi.running)tickFire();});
window.addEventListener('pagehide',()=>{stopMole();stopFire();});
window.gameArcadeDebug={getState:()=>({current,mole:{...mo,timers:undefined},fire:{running:fi.running,score:fi.score,hits:fi.hits,burns:fi.burned.size,flames:fi.flames.size}})};
})();
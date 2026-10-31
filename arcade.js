(() => {
'use strict';
const $=id=>document.getElementById(id);
const $all=sel=>Array.from(document.querySelectorAll(sel));
const scenes={trace:$('tracingScreen'),mole:$('moleScreen'),fire:$('fireScreen'),soccer:$('soccerScreen'),garden:$('gardenScreen')};
let current='trace';
const labels={trace:['선 따라 <em>쓱쓱!</em> 🎨','10초 동안 한 번에 선을 따라 그려요. 손을 떼면 채점!'],mole:['두더지 <em>팡팡!</em> 🐹','30초 안에 뿅망치로 두더지를 많이 잡아요!'],fire:['출동! <em>꼬마 소방관</em> 🚒','불은 터치해 끄고, 구조할 땐 소방차를 누른 다음 사람 있는 창문을 터치해요!'],soccer:['승부차기 <em>슛!</em> ⚽','각 슈팅은 10초! 여섯 방향 중 골키퍼가 없는 곳을 선택해 5골에 도전해요!'],garden:['리안이·이준이의 <em>마법 정원!</em> 🌈','리안이가 꽃씨 색깔을 고르고 이준이가 물을 줘요. 꽃 6송이를 피우면 꽃왕관 선물!']};
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
 else if(current==='fire')stopFire();
 else if(current==='soccer')stopSoccer();
 else if(current==='garden')stopGarden();
 current=id;
 Object.keys(scenes).forEach(key=>{scenes[key].hidden=key!==id;});
 $all('.game-tab').forEach(btn=>{const selected=btn.dataset.game===id;btn.classList.toggle('active',selected);btn.setAttribute('aria-selected',String(selected));btn.tabIndex=selected?0:-1;});
 $('heroTitle').innerHTML=labels[id][0];$('heroDesc').textContent=labels[id][1];
 if(id==='fire')renderRank();
 if(id==='soccer')renderSoccerRank();
}
$all('.game-tab').forEach(tab=>tab.addEventListener('click',()=>setGame(tab.dataset.game)));
$all('.game-tab').forEach((tab,index)=>tab.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const tabs=$all('.game-tab');const idx=(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;setGame(tabs[idx].dataset.game);tabs[idx].focus();}));

// Whack-a-mole: 9 illustrated targets; simultaneous waves of 1, 2, then 3.
const mo={running:false,interval:null,timers:new Set(),active:new Map(),nextAt:0,deadline:0,lastWave:[],score:0,hits:0,misses:0,catsHit:0,catsAvoided:0,combo:0,best:0};
const holes=[];
function moleArt(id){
 return '<svg class="critter-svg critter-mole" viewBox="0 0 120 120" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'+
 '<defs><radialGradient id="mf'+id+'" cx="33%" cy="23%" r="90%"><stop stop-color="#ffe2b6"/><stop offset=".52" stop-color="#bb865d"/><stop offset="1" stop-color="#784a35"/></radialGradient>'+
 '<linearGradient id="mb'+id+'" x2=".7" y2="1"><stop stop-color="#c79a6c"/><stop offset="1" stop-color="#805139"/></linearGradient></defs>'+
 '<ellipse cx="60" cy="112" rx="40" ry="6" fill="#50392c" opacity=".12"/>'+
 '<path d="M22 118 Q18 77 57 74 Q104 70 101 118" fill="url(#mb'+id+')"/>'+
 '<circle cx="26" cy="38" r="15" fill="#9c664c" stroke="#81503b" stroke-width="2"/><circle cx="94" cy="38" r="15" fill="#9c664c" stroke="#81503b" stroke-width="2"/>'+
 '<circle cx="26" cy="38" r="9" fill="#efb7b1"/><circle cx="94" cy="38" r="9" fill="#efb7b1"/>'+
 '<ellipse cx="60" cy="59" rx="44" ry="45" fill="url(#mf'+id+')" stroke="#87563d" stroke-width="1.2"/>'+
 '<path d="M36 25 Q57 11 80 25" fill="none" stroke="#fff1d7" stroke-width="3" opacity=".45" stroke-linecap="round"/>'+
 '<ellipse cx="29" cy="75" rx="11" ry="8" fill="#f5a6a3" opacity=".75"/><ellipse cx="91" cy="75" rx="11" ry="8" fill="#f5a6a3" opacity=".75"/>'+
 '<ellipse cx="43" cy="56" rx="9.8" ry="12" fill="#342423"/><ellipse cx="77" cy="56" rx="9.8" ry="12" fill="#342423"/>'+
 '<ellipse cx="39.5" cy="52" rx="3.5" ry="4.6" fill="#fff"/><ellipse cx="73.5" cy="52" rx="3.5" ry="4.6" fill="#fff"/>'+
 '<circle cx="46" cy="61" r="1.6" fill="#fff" opacity=".85"/><circle cx="80" cy="61" r="1.6" fill="#fff" opacity=".85"/>'+
 '<ellipse cx="60" cy="80" rx="23" ry="18" fill="#f8e5ce"/><path d="M51 89 Q60 98 69 89" fill="none" stroke="#865446" stroke-width="2.6" stroke-linecap="round"/>'+
 '<path d="M54 94 L54 101 Q60 104 60 98 Q60 104 66 101 L66 94" fill="#fff" stroke="#e0c1ab" stroke-width=".9"/>'+
 '<path d="M50 76 Q60 67 70 76 Q60 86 50 76" fill="#ed9ca8" stroke="#bb6a78" stroke-width="1"/>'+
 '<ellipse cx="31" cy="106" rx="16" ry="11" transform="rotate(-20 31 106)" fill="#b98763"/><ellipse cx="89" cy="106" rx="16" ry="11" transform="rotate(20 89 106)" fill="#b98763"/>'+
 '<path d="M21 105 L26 110 M29 102 L34 109 M86 109 L91 102 M94 110 L99 105" stroke="#78503f" stroke-width="1.7" stroke-linecap="round"/>'+
 '<g class="mole-sparkle" fill="#fff"><path d="M12 18 L15 10 L18 18 L26 21 L18 24 L15 32 L12 24 L4 21Z"/><circle cx="103" cy="19" r="3"/></g>'+
 '</svg>';
}
function catArt(id){
 return '<svg class="critter-svg critter-cat" viewBox="0 0 120 120" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'+
 '<defs><radialGradient id="cf'+id+'" cx="33%" cy="21%" r="89%"><stop stop-color="#fff4cb"/><stop offset=".54" stop-color="#f3b578"/><stop offset="1" stop-color="#d7834c"/></radialGradient></defs>'+
 '<ellipse cx="60" cy="112" rx="40" ry="6" fill="#553729" opacity=".12"/>'+
 '<path d="M24 118 Q17 77 60 76 Q104 74 96 118" fill="#efa363"/>'+
 '<path d="M20 55 Q12 26 17 10 Q36 12 49 32 L70 32 Q86 9 104 10 Q111 31 100 55" fill="#e5a164" stroke="#c47b48" stroke-width="2.2"/>'+
 '<path d="M24 41 L24 20 Q40 24 43 42 M77 42 Q82 23 97 20 L97 41" fill="#f8bdc1"/>'+
 '<path d="M17 61 Q12 24 60 25 Q105 23 103 63 Q103 99 60 101 Q17 99 17 61Z" fill="url(#cf'+id+')" stroke="#cf8752" stroke-width="1.2"/>'+
 '<path d="M56 29 L53 43 M64 29 L67 43 M40 33 L45 44 M80 33 L75 44" stroke="#ca804c" stroke-width="4" stroke-linecap="round" opacity=".85"/>'+
 '<ellipse cx="27" cy="75" rx="11" ry="8" fill="#ffa6aa" opacity=".7"/><ellipse cx="93" cy="75" rx="11" ry="8" fill="#ffa6aa" opacity=".7"/>'+
 '<ellipse cx="42" cy="56" rx="10.8" ry="12.7" fill="#548372"/><ellipse cx="78" cy="56" rx="10.8" ry="12.7" fill="#548372"/>'+
 '<ellipse cx="42" cy="57" rx="4.9" ry="9.3" fill="#283931"/><ellipse cx="78" cy="57" rx="4.9" ry="9.3" fill="#283931"/>'+
 '<ellipse cx="39.5" cy="51" rx="4.6" ry="4.9" fill="#fff"/><ellipse cx="75.5" cy="51" rx="4.6" ry="4.9" fill="#fff"/>'+
 '<path d="M33 43 Q42 39 51 43 M69 43 Q78 39 87 43" fill="none" stroke="#96623c" stroke-width="2" stroke-linecap="round"/>'+
 '<path d="M60 83 C43 92 37 81 39 73 C44 64 52 68 60 72 C68 68 76 64 81 73 C83 81 77 92 60 83Z" fill="#fff4e8"/>'+
 '<path d="M55 72 Q60 68 65 72 L60 79 Z" fill="#ed869b"/><path d="M60 79 L60 84 M60 84 Q54 88 50 83 M60 84 Q66 88 70 83" fill="none" stroke="#96614b" stroke-width="2.2" stroke-linecap="round"/>'+
 '<path d="M38 77 L14 74 M40 82 L15 86 M82 77 L106 74 M80 82 L105 86" stroke="#a87557" stroke-width="1.9" stroke-linecap="round"/>'+
 '<ellipse cx="30" cy="106" rx="15" ry="11" transform="rotate(-19 30 106)" fill="#f1b77c"/><ellipse cx="90" cy="106" rx="15" ry="11" transform="rotate(19 90 106)" fill="#f1b77c"/>'+
 '<path d="M23 105 L29 111 M31 102 L36 109 M84 109 L89 102 M91 111 L97 105" stroke="#c58a57" stroke-width="1.6" stroke-linecap="round"/>'+
 '<path class="cat-tongue" d="M56 84 Q60 79 64 84 L66 96 Q60 106 54 96 Z" fill="#ec5c91" stroke="#db3977" stroke-width="1"/>'+
 '<g class="cat-sparkle" fill="#fff"><path d="M11 28 L14 18 L17 28 L27 31 L17 34 L14 44 L11 34 L1 31Z"/></g>'+
 '</svg>';
}
for(let i=0;i<9;i++){
 const b=document.createElement('button');b.type='button';b.className='mole-hole';
 b.dataset.index=String(i);b.dataset.kind='none';b.setAttribute('aria-label',(i+1)+'번 빈 구멍');
 const face=document.createElement('span');face.className='mole-face';face.innerHTML=moleArt(i)+catArt(i);
 const star=document.createElement('span');star.className='mole-hit-star';star.textContent='✨';
 b.append(face,star);b.addEventListener('click',e=>hitMole(i,e));holes.push(b);$('moleGrid').append(b);
}
function moTimer(fn,ms){const id=setTimeout(()=>{mo.timers.delete(id);fn();},ms);mo.timers.add(id);}
function clearMoleTimers(){if(mo.interval)clearInterval(mo.interval);mo.interval=null;for(const t of mo.timers)clearTimeout(t);mo.timers.clear();}
function resetHole(i){
 const h=holes[i];h.classList.remove('up','whacked','teasing','sinking');
 h.dataset.kind='none';h.setAttribute('aria-label',(i+1)+'번 빈 구멍');
}
function stopMole(){mo.running=false;clearMoleTimers();mo.active.clear();mo.lastWave=[];holes.forEach((_,i)=>resetHole(i));$('moleHammer').classList.remove('swing');$('moleStart').disabled=false;}
function moleValues(){$('moleScore').textContent=mo.score+'점';$('moleCombo').textContent=String(mo.combo);}
function waveSize(elapsed){if(elapsed<7)return 1;if(elapsed<17)return 2;return 3;}
function spawnWave(now){
 const elapsed=Math.max(0,(30000-(mo.deadline-now))/1000);
 const candidates=holes.map((_,i)=>i).filter(i=>!mo.active.has(i)&&!mo.lastWave.includes(i));
 const n=Math.min(waveSize(elapsed),candidates.length),chosen=[];
 for(let j=0;j<n;j++){
  const index=Math.floor(Math.random()*candidates.length),i=candidates.splice(index,1)[0];
  const p=elapsed<8?.22:elapsed<20?.32:.39;
  const kind=j===0&&n>1?'mole':Math.random()<p?'cat':'mole';
  const until=now+Math.max(1050,1600-elapsed*12);
  mo.active.set(i,{kind,until});chosen.push(i);
  const h=holes[i];h.dataset.kind=kind;h.classList.remove('whacked','teasing','sinking');
  h.querySelector('.mole-hit-star').textContent=kind==='cat'?'😝 메롱!':'✨💛✨';
  h.classList.add('up');h.setAttribute('aria-label',(i+1)+'번 '+(kind==='cat'?'고양이! 누르면 감점':'두더지! 눌러 잡기'));
 }
 mo.lastWave=chosen;
 $('moleTip').textContent=n>1?'⚡ '+n+'마리 동시 등장! 두더지만 톡톡!':'🐾 두더지를 잡고 고양이는 피하세요!';
}
function startMole(){
 stopMole();mo.running=true;mo.score=mo.hits=mo.misses=mo.catsHit=mo.catsAvoided=mo.combo=mo.best=0;
 mo.deadline=performance.now()+30000;mo.nextAt=performance.now()+320;
 $('moleTime').textContent='30초';$('moleTime').parentElement.classList.remove('urgent');moleValues();
 $('moleResult').hidden=true;$('moleStart').disabled=true;$('moleStart').textContent='🔨 두더지 잡는 중!';
 $('moleTip').textContent='두더지 +10~30점 · 고양이 −20점!';beep(530,90);
 mo.interval=setInterval(tickMole,65);tickMole();
}
function tickMole(){
 if(!mo.running)return;
 const now=performance.now(),left=Math.max(0,Math.ceil((mo.deadline-now)/1000));
 $('moleTime').textContent=left+'초';$('moleTime').parentElement.classList.toggle('urgent',left<=5);
 if(now>=mo.deadline){finishMole();return;}
 for(const [i,item] of [...mo.active.entries()]){
  if(now<item.until)continue;mo.active.delete(i);
  if(item.kind==='mole'){mo.misses++;mo.combo=0;moleValues();}else mo.catsAvoided++;
  const h=holes[i];h.classList.remove('up');h.classList.add('sinking');
  h.setAttribute('aria-label',(i+1)+'번 빈 구멍');
  moTimer(()=>h.classList.remove('sinking'),300);
 }
 if(!mo.active.size&&now>=mo.nextAt){spawnWave(now);mo.nextAt=now+440;}
}
function swingHammer(evt){
 const arena=$('moleArena'),pos=arena.getBoundingClientRect(),h=$('moleHammer');
 const x=evt.clientX-pos.left,y=evt.clientY-pos.top;
 h.style.left=Math.max(0,Math.min(pos.width-65,x-38))+'px';h.style.top=Math.max(0,Math.min(pos.height-70,y-76))+'px';
 h.classList.remove('swing');void h.offsetWidth;h.classList.add('swing');
}
function molePopup(i,message,bad){
 const pop=$('molePop'),r=$('moleArena').getBoundingClientRect(),b=holes[i].getBoundingClientRect();
 pop.textContent=message;pop.style.left=(b.left-r.left+b.width*.08)+'px';pop.style.top=(b.top-r.top)+'px';
 pop.classList.toggle('bad',bad);pop.classList.remove('visible');void pop.offsetWidth;pop.classList.add('visible');
}
function hitMole(i,evt){
 if(!mo.running)return;const item=mo.active.get(i),now=performance.now();
 if(!item)return;if(now>=mo.deadline){finishMole();return;}if(now>=item.until){tickMole();return;}
 mo.active.delete(i);const h=holes[i];h.classList.remove('up');swingHammer(evt);
 if(item.kind==='cat'){
  mo.catsHit++;mo.combo=0;mo.score=Math.max(0,mo.score-20);moleValues();
  h.classList.add('teasing');h.querySelector('.mole-hit-star').textContent='😜 메롱!';
  molePopup(i,'😜 메롱! −20점',true);
  $('moleTip').textContent='앗, 고양이는 피해야 해요! 😝';
  beep(445,110,'triangle',.06);moTimer(()=>beep(290,145,'sawtooth',.04),140);
  moTimer(()=>{h.classList.remove('teasing');h.classList.add('sinking');},600);
  moTimer(()=>{h.classList.remove('sinking');h.setAttribute('aria-label',(i+1)+'번 빈 구멍');},930);
 }else{
  mo.hits++;mo.combo++;mo.best=Math.max(mo.best,mo.combo);
  const gain=10+Math.min(20,(mo.combo-1)*2);mo.score+=gain;moleValues();
  h.classList.add('whacked');h.querySelector('.mole-hit-star').textContent='✨🥰✨';
  molePopup(i,'✨ +'+gain+'점',false);
  beep(380,95,'triangle',.095);moTimer(()=>beep(620,100,'sine',.065),70);
  moTimer(()=>h.classList.remove('whacked'),420);
 }
 if(!mo.active.size)mo.nextAt=Math.max(mo.nextAt,now+420);
}
function finishMole(){
 if(!mo.running)return;stopMole();$('moleTime').textContent='0초';$('moleTip').textContent='30초 도전 완료!';
 $('moleResult').hidden=false;$('moleResultEmoji').textContent=mo.hits>=16?'🏆':'🐹';
 $('moleResultTitle').textContent=mo.hits>=16?'두더지 달인!':'두더지 잡기 완료!';
 $('moleResultDetail').textContent=mo.hits+'마리 잡기 성공 · 고양이 '+mo.catsHit+'번 실수 · 최종 '+mo.score+'점 · 최고 연속 '+mo.best+'번 🎉';
 $('moleStart').textContent='▶ 다시 시작';cheer();
}
$('moleStart').addEventListener('click',startMole);$('moleAgain').addEventListener('click',startMole);

// Fire station: 25 windows; each flame has its own EXACT 3-second deadline.
const TOTAL_WINDOWS=25,STORAGE='game-fire-rank-v1';
const fi={running:false,interval:null,deadline:0,spawnAt:0,flames:new Map(),burned:new Set(),score:0,hits:0,missed:0,streak:0,highest:0,saved:false,roundId:0,stage:1,residents:new Map(),rescued:0,missedRescues:0,rescueAt:0,rescueMode:false,rescueBusy:false,rescueTimer:null};
const windows=[];
for(let i=0;i<TOTAL_WINDOWS;i++){
 const btn=document.createElement('button');btn.type='button';btn.className='fire-window';btn.dataset.index=String(i);
 const fire=document.createElement('span');fire.className='flame-emoji';fire.textContent='🔥';
 const countdown=document.createElement('span');countdown.className='fire-count';countdown.textContent='3';const resident=document.createElement('span');resident.className='resident-emoji';resident.textContent='🧒';btn.append(fire,countdown,resident);
 btn.addEventListener('click',()=>selectFireWindow(i));windows.push(btn);$('fireWindows').append(btn);
}
function windowName(i){return (5-Math.floor(i/5))+'층 '+((i%5)+1)+'번 창문';}
function windowState(i){const b=windows[i];b.classList.toggle('burned',fi.burned.has(i));b.classList.toggle('burning',fi.flames.has(i));b.classList.toggle('waiting',fi.residents.has(i));b.querySelector('.flame-emoji').textContent=fi.burned.has(i)?'💨':'🔥';b.setAttribute('aria-label',windowName(i)+(fi.flames.has(i)?' 불났어요! 빨리 끄기':fi.burned.has(i)?' 불에 탔어요':fi.residents.has(i)?' 구조를 기다리는 사람이 있어요':' 안전해요'));}
function fireValues(){ $('fireScore').textContent=fi.score.toLocaleString('ko-KR')+'점';$('fireHits').textContent=String(fi.hits);$('fireBurns').textContent=String(fi.burned.size);$('fireRescued').textContent=String(fi.rescued)+'명'; }
function updateTruck(){
 const b=$('fireTruck');b.classList.toggle('selected',fi.rescueMode);
 b.setAttribute('aria-pressed',String(fi.rescueMode));b.disabled=!fi.running||fi.rescueBusy;
 b.setAttribute('aria-label',fi.rescueMode?'사다리차 선택됨. 구조할 창문을 누르세요':'사다리차 선택하여 사람 구조하기');
}
function stopFire(){
 fi.running=false;if(fi.interval)clearInterval(fi.interval);fi.interval=null;
 if(fi.rescueTimer){clearTimeout(fi.rescueTimer);fi.rescueTimer=null;}
 fi.rescueMode=false;fi.rescueBusy=false;$('fireLadder').hidden=true;
 $('fireLadder').classList.remove('active');$('fireTruck').classList.remove('selected');
 updateTruck();$('fireStart').disabled=false;
}
function startFire(){
 stopFire();fi.roundId++;fi.score=fi.hits=fi.missed=fi.streak=fi.highest=0;fi.saved=false;fi.flames.clear();fi.burned.clear();fi.residents.clear();fi.running=true;
 fi.deadline=performance.now()+60000;fi.spawnAt=performance.now()+650;fi.rescueAt=performance.now()+3600;fi.stage=1;fi.residents.clear();fi.rescued=0;fi.missedRescues=0;fi.rescueMode=false;fi.rescueBusy=false;updateTruck();updateFireDifficulty(fireDifficulty(0));
 windows.forEach((b,i)=>{b.classList.remove('splashed');windowState(i);});fireValues();
 $('fireTime').textContent='60초';$('fireTime').parentElement.classList.remove('urgent');
 $('fireResult').hidden=true;$('fireSave').disabled=false;$('fireSaveMsg').textContent='';
 $('fireStart').disabled=true;$('fireStart').textContent='🚒 소방 활동 중!';$('fireTip').textContent='🔥 불은 바로 터치 · 🧒 사람은 🚒 소방차 → 창문!';
 beep(450,130,'sawtooth',.06);fi.interval=setInterval(tickFire,70);tickFire();
}
function newFire(now){
 const candidates=windows.map((_,i)=>i).filter(i=>!fi.burned.has(i)&&!fi.flames.has(i)&&!fi.residents.has(i));
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
 // Residents occasionally appear at safe windows; missed rescues lose the opportunity,
 // but never depict anyone being harmed.
 for(const [i,until] of [...fi.residents]){
  if(now>=until){fi.residents.delete(i);fi.missedRescues++;windowState(i);$('fireTip').textContent='🧒 다음 구조 요청이 오면 사다리차를 눌러요!';}
 }
 if(now>=fi.rescueAt&&fi.residents.size===0&&!fi.rescueBusy)spawnResident(now);
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
function spawnResident(now){
 const candidates=windows.map((_,i)=>i).filter(i=>!fi.burned.has(i)&&!fi.flames.has(i)&&!fi.residents.has(i));
 if(!candidates.length){fi.rescueAt=now+1700;return;}
 const i=candidates[Math.floor(Math.random()*candidates.length)];
 fi.residents.set(i,now+7700);windowState(i);
 fi.rescueAt=now+5900+Math.random()*2700;
 $('fireTip').textContent='🧒 도움 요청! 🚒 소방차를 누르고 사람이 있는 창문을 터치하세요!';
 beep(730,110,'triangle',.07);beep(960,140,'sine',.07);
}
function selectFireWindow(i){
 if(!fi.running)return;
 if(fi.residents.has(i)){
  if(fi.rescueMode&&!fi.rescueBusy){rescueResident(i);return;}
  $('fireTip').textContent='🧒 먼저 아래 🚒 소방차를 눌러 사다리차를 선택하세요!';
  $('fireTruck').classList.remove('nudge');void $('fireTruck').offsetWidth;$('fireTruck').classList.add('nudge');
  return;
 }
 if(fi.flames.has(i)){putOutFire(i);return;}
 if(fi.rescueMode)$('fireTip').textContent='🧒 사람이 있는 창문을 눌러 주세요!';
}
function chooseRescueTruck(){
 if(!fi.running||fi.rescueBusy)return;
 fi.rescueMode=!fi.rescueMode;updateTruck();
 $('fireTip').textContent=fi.rescueMode?'🚒 사다리차 준비! 🧒 사람이 있는 창문을 누르세요!':'💧 진화 모드! 불난 창문을 눌러요!';
 beep(fi.rescueMode?650:430,95,'sine',.07);
}
$('fireTruck').addEventListener('click',chooseRescueTruck);
function drawRescueLadder(i){
 const scene=$('fireScene').getBoundingClientRect();
 const truck=$('fireTruck').getBoundingClientRect(),target=windows[i].getBoundingClientRect();
 const sx=truck.left+truck.width*.55-scene.left,sy=truck.top+truck.height*.28-scene.top;
 const ex=target.left+target.width*.51-scene.left,ey=target.top+target.height*.5-scene.top;
 const length=Math.hypot(ex-sx,ey-sy),angle=Math.atan2(ey-sy,ex-sx)*180/Math.PI;
 const overlay=$('fireLadder');overlay.hidden=false;
 overlay.style.left=sx+'px';overlay.style.top=sy+'px';
 overlay.style.width=length+'px';overlay.style.setProperty('--ladder-angle',angle+'deg');
 overlay.classList.remove('active');void overlay.offsetWidth;overlay.classList.add('active');
}
function rescueResident(i){
 if(!fi.running||fi.rescueBusy||!fi.residents.has(i))return;
 fi.rescueBusy=true;fi.residents.delete(i);fi.rescued++;fi.score+=250;
 fi.rescueMode=false;updateTruck();fireValues();windowState(i);
 drawRescueLadder(i);
 $('fireTip').textContent='🚒 사다리 올라간다! 👨‍🚒 구조 성공 +250점! 🥳';
 const pop=$('fireRescuePop'),scene=$('fireScene').getBoundingClientRect(),target=windows[i].getBoundingClientRect();
 pop.style.left=(target.left-scene.left+target.width*.2)+'px';
 pop.style.top=(target.top-scene.top-25)+'px';
 pop.textContent='💛 구조 성공! +250점';pop.classList.remove('show');void pop.offsetWidth;pop.classList.add('show');
 beep(600,140,'sine',.08);beep(900,120,'sine',.08);
 const round=fi.roundId;
 fi.rescueTimer=setTimeout(()=>{
  if(fi.roundId!==round)return;
  $('fireLadder').hidden=true;$('fireLadder').classList.remove('active');
  fi.rescueBusy=false;fi.rescueTimer=null;updateTruck();
 },1550);
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
 stopFire();fi.flames.clear();fi.residents.clear();windows.forEach((_,i)=>windowState(i));$('fireTime').textContent='0초';$('fireStart').textContent='▶ 다시 출동';
 $('fireTip').textContent='소방 임무가 끝났어요! 기록을 저장해 봐요';
 $('fireResult').hidden=false;
 const intact=TOTAL_WINDOWS-fi.burned.size;
 $('fireResultEmoji').textContent=intact===0?'🥺':intact>=22?'🏆':'🧑‍🚒';
 $('fireResultTitle').textContent=allBurned?'앗! 아파트에 불이 번졌어요!':intact>=22?'최고의 꼬마 소방관!':'출동 완료! 참 잘했어요!';
 $('fireResultDetail').textContent=`${fi.hits}번 불을 껐어요! · 🧒 ${fi.rescued}명 구조 · ${intact}개 안전한 창문 · ${fi.burned.size}개 창문 피해 · ${fi.score.toLocaleString('ko-KR')}점`;
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
  const name=document.createElement('span');name.textContent=item.name;const date=document.createElement('small');date.className='rank-date';date.textContent=`${new Date(item.at).toLocaleDateString('ko-KR')} · 불 끄기 ${item.hits}번 · 구조 ${item.rescued||0}명 · 피해 ${item.burned}곳`;name.append(date);
  const score=document.createElement('span');score.className='rank-points';score.textContent=item.score.toLocaleString('ko-KR')+'점';li.append(pos,name,score);ol.append(li);
 }
}
function saveFire(){
 if(fi.running||$('fireResult').hidden||fi.saved)return;
 const name=$('firePlayer').value.trim().slice(0,12)||'용감한 소방관';
 const entry={id:String(Date.now())+'-'+String(Math.floor(Math.random()*1e8)),name,score:fi.score,hits:fi.hits,burned:fi.burned.size,rescued:fi.rescued,at:Date.now()};
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
// 5-shot soccer penalty shootout. Keeper destinations are precommitted
// for all five kicks *before* the player can choose; selection never affects RNG.
const SOCCER_STORE='game-soccer-rank-v1';
const soccerZones=Array.from(document.querySelectorAll('#soccerZones .soccer-zone'));
const so={phase:'idle',round:0,goals:0,plans:[],results:[],deadline:0,shotStart:0,spentMs:0,tick:null,timers:new Set(),epoch:0,saved:false};
function soTimer(fn,ms){
 const epoch=so.epoch;
 const t=setTimeout(()=>{so.timers.delete(t);if(epoch===so.epoch)fn();},ms);
 so.timers.add(t);return t;
}
function clearSoccerTimers(){
 if(so.tick!==null){clearInterval(so.tick);so.tick=null;}
 for(const id of so.timers)clearTimeout(id);so.timers.clear();
}
function setSoccerZoneButtons(enabled){
 for(const b of soccerZones)b.disabled=!enabled;
}
function resetSoccerVisuals(){
 const keeper=$('soccerKeeper'),ball=$('soccerBall');
 keeper.classList.remove('diving','saved');keeper.style.left='50%';keeper.style.top='67%';
 ball.classList.remove('kicked','scored','stopped');ball.style.removeProperty('--shot-x');ball.style.removeProperty('--shot-y');
 for(const b of soccerZones)b.classList.remove('chosen','blocked','scored');
 $('soccerCelebration').textContent='';$('soccerCelebration').classList.remove('visible','goal','save','late');
}
function updateSoccerValues(){
 $('soccerGoals').textContent=so.goals+' / 5';
 $('soccerRemaining').textContent=Math.max(0,5-so.round)+'개';
 const indicators=Array.from({length:5},(_,i)=>{
  const value=so.results[i];
  return '<span class="soccer-ball-mark '+(value?(value.goal?'goal':'miss'):'pending')+
   '" aria-label="'+(value?(value.goal?'성공':value.timeout?'시간 초과':'막힘'):'남은 슈팅')+'">'+
   (value?(value.goal?'⚽':'✖'):'⚽')+'</span>';
 });
 $('soccerProgress').innerHTML=indicators.join('');
}
function stopSoccer(){
 so.epoch++;clearSoccerTimers();so.phase='idle';
 setSoccerZoneButtons(false);resetSoccerVisuals();$('soccerStart').disabled=false;
}
function startSoccer(){
 stopSoccer();so.round=0;so.goals=0;so.spentMs=0;so.results=[];so.saved=false;
 // Precommit all 5 keeper zones before accepting the first click.
 so.plans=Array.from({length:5},()=>Math.floor(Math.random()*6));
 $('soccerResult').hidden=true;$('soccerSave').disabled=false;$('soccerSaveMsg').textContent='';
 $('soccerStart').disabled=true;$('soccerStart').textContent='⚽ 5번의 슈팅 진행 중';
 updateSoccerValues();prepareSoccerShot();
}
function prepareSoccerShot(){
 if(so.round>=5){finishSoccer();return;}
 resetSoccerVisuals();so.phase='aiming';
 so.shotStart=performance.now();so.deadline=so.shotStart+10000;
 $('soccerTime').textContent='10초';$('soccerTime').parentElement.classList.remove('urgent');
 $('soccerRemaining').textContent=(5-so.round)+'개';
 $('soccerInstruction').textContent='⚽ '+(so.round+1)+'번째 슈팅! 왼쪽·센터·오른쪽의 위/아래 중 골라 주세요!';
 setSoccerZoneButtons(true);beep(650,105,'sine',.05);
 clearInterval(so.tick);so.tick=setInterval(tickSoccer,65);
}
function tickSoccer(){
 if(so.phase!=='aiming')return;
 const now=performance.now(),left=Math.max(0,Math.ceil((so.deadline-now)/1000));
 $('soccerTime').textContent=left+'초';$('soccerTime').parentElement.classList.toggle('urgent',left<=3);
 if(now>=so.deadline)resolveSoccerShot(null,true);
}
function resolveSoccerShot(selected,timeout=false){
 if(so.phase!=='aiming')return false;
 const now=performance.now();
 if(!timeout&&now>=so.deadline){timeout=true;selected=null;}
 if(selected!==null&&(!Number.isInteger(selected)||selected<0||selected>=6))return false;
 so.phase='resolving';clearInterval(so.tick);so.tick=null;setSoccerZoneButtons(false);
 const blocked=so.plans[so.round]; // frozen before the round began
 const scored=!timeout&&selected!==blocked;
 so.spentMs+=timeout?10000:Math.min(10000,Math.max(0,now-so.shotStart));
 if(scored)so.goals++;
 so.results.push({goal:scored,timeout:!!timeout,shot:selected,keeper:blocked});
 const keeper=$('soccerKeeper'),keeperColumn=blocked%3,keeperRow=Math.floor(blocked/3);
 keeper.classList.add('diving');keeper.style.left=((keeperColumn+.5)/3*100)+'%';
 keeper.style.top=((keeperRow+.5)/2*100)+'%';
 if(!timeout){
  const zone=soccerZones[selected],scene=$('soccerArena').getBoundingClientRect(),
   ball=$('soccerBall').getBoundingClientRect(),target=zone.getBoundingClientRect();
  const x=(target.left+target.width/2)-(ball.left+ball.width/2);
  const y=(target.top+target.height/2)-(ball.top+ball.height/2);
  $('soccerBall').style.setProperty('--shot-x',x+'px');
  $('soccerBall').style.setProperty('--shot-y',y+'px');
  $('soccerBall').classList.remove('kicked');void $('soccerBall').offsetWidth;
  $('soccerBall').classList.add('kicked');
  zone.classList.add('chosen',scored?'scored':'blocked');
 }else $('soccerTime').textContent='0초';
 if(!scored&&!timeout)keeper.classList.add('saved');
 const c=$('soccerCelebration');
 c.className='soccer-celebration visible '+(scored?'goal':timeout?'late':'save');
 c.textContent=scored?'🎊 골~! 멋진 슛!':timeout?'⏰ 시간 초과! 한 번 놓쳤어요':'🧤 골키퍼가 막았어요!';
 $('soccerInstruction').textContent=timeout?'시간을 놓쳤어요. 다음 슈팅에 도전해요!':scored?'🥳 축하해요! 골 성공!':'아까워요! 다음엔 다른 방향을 노려 봐요!';
 if(scored){beep(660,125,'sine',.085);soTimer(()=>beep(990,150,'sine',.09),110);}
 else{beep(timeout?255:340,185,'triangle',.065);}
 so.round++;updateSoccerValues();
 soTimer(()=>{if(so.round>=5)finishSoccer();else prepareSoccerShot();},1150);
 return true;
}
function finishSoccer(){
 if(so.phase==='finished')return;
 clearSoccerTimers();so.phase='finished';setSoccerZoneButtons(false);
 $('soccerTime').textContent='0초';$('soccerRemaining').textContent='0개';
 $('soccerStart').textContent='▶ 새로운 승부차기';$('soccerStart').disabled=false;
 $('soccerResult').hidden=false;
 const goals=so.goals;
 $('soccerResultEmoji').textContent=goals===5?'🏆':goals>=3?'🥳':'⚽';
 $('soccerResultTitle').textContent=goals===5?'5골 모두 성공! 완벽해요!':goals>=3?'멋진 승부차기!':'5번의 슈팅 완료!';
 $('soccerResultDetail').textContent='총 5번 중 '+goals+'골 성공 · '+(5-goals)+'번 실패 · 평균 선택 시간 '+(so.spentMs/5000).toFixed(1)+'초';
 $('soccerSave').disabled=false;so.saved=false;$('soccerSaveMsg').textContent='';
 renderSoccerRank();$('soccerResult').scrollIntoView({behavior:'smooth',block:'nearest'});
 if(goals>=3)cheer();
}
function soccerRankData(){
 try{
  const data=JSON.parse(localStorage.getItem(SOCCER_STORE)||'[]');
  return Array.isArray(data)?data.filter(x=>x&&Number.isInteger(x.goals)&&x.goals>=0&&x.goals<=5&&
    Number.isFinite(x.timeMs)&&x.timeMs>=0&&typeof x.name==='string').slice(0,100):[];
 }catch(_){return [];}
}
function soccerRankSort(a,b){
 return b.goals-a.goals||a.timeMs-b.timeMs||a.at-b.at;
}
function renderSoccerRank(highlight=''){
 const list=$('soccerRankList');list.replaceChildren();
 const items=soccerRankData().sort(soccerRankSort).slice(0,20);
 if(!items.length){const li=document.createElement('li');li.className='rank-empty';
 li.textContent='아직 기록이 없어요. 첫 번째 득점왕에 도전하세요!';list.append(li);return;}
 items.forEach((entry,i)=>{
  const li=document.createElement('li');if(highlight&&entry.id===highlight)li.classList.add('soccer-rank-current');
  const pos=document.createElement('span');pos.className='rank-pos';pos.textContent=['🥇','🥈','🥉'][i]||String(i+1);
  const info=document.createElement('span');info.textContent=entry.name;
  const meta=document.createElement('small');meta.className='rank-date';
  meta.textContent=new Date(entry.at).toLocaleDateString('ko-KR')+' · 5번 중 '+entry.goals+'골 · 평균 '+(entry.timeMs/5000).toFixed(1)+'초';
  info.append(meta);
  const pts=document.createElement('span');pts.className='rank-points';pts.textContent=entry.goals+'골';
  li.append(pos,info,pts);list.append(li);
 });
}
function saveSoccerRank(){
 if(so.phase!=='finished'||so.saved)return;
 const name=$('soccerPlayer').value.trim().slice(0,12)||'멋진 축구선수';
 const entry={id:String(Date.now())+'-'+Math.floor(Math.random()*1e9),name,goals:so.goals,timeMs:so.spentMs,at:Date.now()};
 try{
  const data=soccerRankData();data.push(entry);data.sort(soccerRankSort);
  const pos=data.findIndex(x=>x.id===entry.id)+1;
  localStorage.setItem(SOCCER_STORE,JSON.stringify(data.slice(0,100)));
  localStorage.setItem('game-soccer-player',name);
  so.saved=true;$('soccerSave').disabled=true;
  $('soccerSaveMsg').textContent='🏆 기록 저장 완료! 이 기기 '+pos+'등이에요!';
  renderSoccerRank(entry.id);
 }catch(_){$('soccerSaveMsg').textContent='⚠️ 브라우저 저장이 차단됐어요. 일반 모드에서 다시 해 주세요.';}
}
soccerZones.forEach((zone,i)=>zone.addEventListener('click',()=>resolveSoccerShot(i)));
$('soccerStart').addEventListener('click',startSoccer);
$('soccerAgain').addEventListener('click',startSoccer);
$('soccerSave').addEventListener('click',saveSoccerRank);
$('soccerPlayer').addEventListener('keydown',e=>{if(e.key==='Enter')saveSoccerRank();});
$('soccerRankRefresh').addEventListener('click',()=>renderSoccerRank());
try{$('soccerPlayer').value=localStorage.getItem('game-soccer-player')||'';}catch(_){}
setSoccerZoneButtons(false);renderSoccerRank();

// Gentle, untimed co-operative game for a 4-year-old.
// Characters are original vector illustrations reflecting the children's visible
// hairstyles and clothing, NOT the user-provided personal photographs.
const GARDEN_STORE='game-garden-crowns-v1';
const gardenColors=[
 {id:'pink',name:'분홍색',petal:'#fb7eba',highlight:'#ffb5d7',flower:'🌸'},
 {id:'yellow',name:'노란색',petal:'#ffcc4b',highlight:'#fff4a2',flower:'🌼'},
 {id:'blue',name:'하늘색',petal:'#71c8f6',highlight:'#c4f0ff',flower:'🩵'},
 {id:'purple',name:'보라색',petal:'#bd94f7',highlight:'#e8d1ff',flower:'💜'}
];
const ga={phase:'idle',round:0,blooms:0,mistakes:0,queue:[],positions:[],selected:-1,epoch:0,timers:new Set(),completed:0};
const gardenChoices=Array.from(document.querySelectorAll('#gardenChoices .garden-choice'));
const gardenBeds=[];
function gardenGirlArt(){
 return '<svg class="garden-avatar-svg" viewBox="0 0 184 224" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
 '<defs><radialGradient id="g-rian-skin" cx="35%" cy="22%" r="80%"><stop stop-color="#ffe9cb"/><stop offset="1" stop-color="#edb195"/></radialGradient>'+
 '<linearGradient id="g-rian-hair" x2=".8" y2="1"><stop stop-color="#46404b"/><stop offset=".65" stop-color="#1f1d2e"/><stop offset="1" stop-color="#343047"/></linearGradient>'+
 '<linearGradient id="g-rian-dress" x2="1" y2="1"><stop stop-color="#fffaf0"/><stop offset="1" stop-color="#f1dbc2"/></linearGradient></defs>'+
 '<ellipse cx="93" cy="214" rx="62" ry="7" fill="#9d72b388"/>'+
 '<path d="M66 162 L59 208 L84 214 L95 180 L108 214 L132 208 L119 162Z" fill="#e5b5a1"/>'+
 '<path d="M60 202 Q74 198 83 205 L84 217 L55 217Z M108 205 Q121 197 132 202 L138 217 L106 217Z" fill="#fa7fa7" stroke="#c85b88" stroke-width="2"/>'+
 '<path d="M69 110 L49 168 L135 168 L116 110Z" fill="#bb91ef" stroke="#9563dc" stroke-width="3"/>'+
 '<path d="M55 110 Q92 98 128 110 L132 151 Q92 164 50 151Z" fill="url(#g-rian-dress)" stroke="#dfc8b0" stroke-width="2"/>'+
 '<path d="M64 115 L60 141 M120 115 L124 141" fill="none" stroke="#fff" stroke-width="4"/>'+
 '<path class="garden-arm-left" d="M54 116 Q27 137 24 112 L29 99 Q43 118 59 109" fill="#f0bea6" stroke="#c99885" stroke-width="2"/>'+
 '<path class="garden-arm-right" d="M126 116 Q152 133 157 102 L148 95 Q144 115 125 108" fill="#f0bea6" stroke="#c99885" stroke-width="2"/>'+
 '<path d="M92 23 Q38 11 34 82 L38 141 Q54 159 65 129 L121 128 Q136 151 149 136 L151 80 Q151 14 92 23Z" fill="url(#g-rian-hair)" stroke="#242334" stroke-width="2.5"/>'+
 '<ellipse cx="92" cy="78" rx="49" ry="55" fill="url(#g-rian-skin)" stroke="#d59d84" stroke-width="2"/>'+
 '<path d="M42 67 Q43 22 85 21 Q135 11 144 68 Q118 51 95 49 Q69 54 42 67Z" fill="url(#g-rian-hair)"/>'+
 '<path d="M43 55 Q58 64 69 56 Q79 65 91 55 Q103 64 116 53 Q129 63 141 53" fill="none" stroke="#1e1b2a" stroke-width="17" stroke-linecap="round"/>'+
 '<path d="M53 43 Q92 13 132 38" fill="none" stroke="#6e6172" stroke-width="3" opacity=".42" stroke-linecap="round"/>'+
 '<ellipse cx="59" cy="93" rx="9" ry="5.5" fill="#fba99e" opacity=".67"/><ellipse cx="125" cy="93" rx="9" ry="5.5" fill="#fba99e" opacity=".67"/>'+
 '<path d="M59 76 Q71 69 82 77 M101 77 Q112 69 124 76" fill="none" stroke="#3a3035" stroke-width="3.5" stroke-linecap="round"/>'+
 '<ellipse cx="71" cy="80" rx="5.2" ry="6.5" fill="#25232c"/><ellipse cx="112" cy="80" rx="5.2" ry="6.5" fill="#25232c"/>'+
 '<circle cx="69.4" cy="77.5" r="2.2" fill="#fff"/><circle cx="110.4" cy="77.5" r="2.2" fill="#fff"/>'+
 '<path d="M91 87 Q87 91 92 92" stroke="#d39082" stroke-width="1.6" fill="none"/>'+
 '<path d="M78 103 Q92 117 108 103 Q93 128 78 103" fill="#b85869" stroke="#9e455b" stroke-width="1.4"/>'+
 '<path d="M83 106 Q92 111 103 106" stroke="#fff" stroke-width="2.5" stroke-linecap="round" fill="none"/>'+
 '<path d="M51 36 Q43 32 41 44 L30 42 L40 51 L30 59 L47 56" fill="#f9c05e" stroke="#e9a53e" stroke-width="1"/>'+
 '</svg>';
}
function gardenBoyArt(){
 return '<svg class="garden-avatar-svg" viewBox="0 0 184 224" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
 '<defs><radialGradient id="g-ijun-skin" cx="37%" cy="25%" r="87%"><stop stop-color="#ffe8c9"/><stop offset="1" stop-color="#eeb69b"/></radialGradient>'+
 '<linearGradient id="g-ijun-shirt" x2="1" y2="1"><stop stop-color="#4479b8"/><stop offset="1" stop-color="#243d7c"/></linearGradient></defs>'+
 '<ellipse cx="91" cy="214" rx="62" ry="7" fill="#729fa18a"/>'+
 '<path d="M69 155 L65 205 L86 211 L92 179 L101 211 L126 205 L117 154" fill="#f1be9e"/>'+
 '<path d="M60 203 Q74 199 84 206 L85 217 L56 217Z M103 206 Q119 200 131 203 L134 217 L101 217Z" fill="#68b8e6" stroke="#318cae" stroke-width="2"/>'+
 '<path d="M59 147 L125 147 L128 183 Q100 192 55 183Z" fill="#263965"/>'+
 '<path d="M54 109 L129 109 L135 156 Q91 168 46 156Z" fill="url(#g-ijun-shirt)" stroke="#244874" stroke-width="2"/>'+
 '<path d="M58 123 L124 123" stroke="#79a1d4" stroke-width="3" opacity=".55"/>'+
 '<path class="garden-arm-left" d="M53 119 Q29 141 22 115 L30 102 Q39 123 59 111" fill="#efbf9d" stroke="#cb9984" stroke-width="2"/>'+
 '<path class="garden-arm-right" d="M129 119 Q156 134 159 108 L150 97 Q144 122 125 111" fill="#efbf9d" stroke="#cb9984" stroke-width="2"/>'+
 '<path d="M60 110 L68 145 Q92 153 117 144 L125 109" fill="#ef7083" stroke="#b85366" stroke-width="2.5"/>'+
 '<path d="M67 108 Q92 115 117 108" fill="none" stroke="#fff1db" stroke-width="4"/>'+
 '<path d="M69 124 L116 124 M70 133 L117 133" stroke="#fff5ea" stroke-width="3"/>'+
 '<ellipse cx="92" cy="70" rx="52" ry="55" fill="url(#g-ijun-skin)" stroke="#dda18a" stroke-width="2"/>'+
 '<path d="M42 59 Q36 27 60 19 Q72 7 83 13 Q113 5 132 22 Q156 34 143 61 Q129 51 118 36 Q89 40 65 32 Q56 54 42 59" fill="#35313c" stroke="#252533" stroke-width="1.8"/>'+
 '<path d="M64 23 Q82 13 98 22" stroke="#695d65" stroke-width="3" opacity=".5" fill="none"/>'+
 '<ellipse cx="57" cy="91" rx="10" ry="6.5" fill="#fca79c" opacity=".6"/><ellipse cx="126" cy="91" rx="10" ry="6.5" fill="#fca79c" opacity=".6"/>'+
 '<path d="M56 67 Q69 60 82 67 M101 67 Q116 60 128 68" stroke="#3f3130" stroke-width="3.5" stroke-linecap="round" fill="none"/>'+
 '<ellipse cx="70" cy="74" rx="6" ry="6.9" fill="#26232d"/><ellipse cx="114" cy="74" rx="6" ry="6.9" fill="#26232d"/>'+
 '<circle cx="68.6" cy="71.8" r="2.1" fill="#fff"/><circle cx="112.6" cy="71.8" r="2.1" fill="#fff"/>'+
 '<ellipse cx="91" cy="88" rx="3" ry="2" fill="#dd9f8b"/>'+
 '<path d="M79 101 Q92 115 106 101" fill="none" stroke="#a5655d" stroke-width="3" stroke-linecap="round"/>'+
 '</svg>';
}
const gaBeds=$('gardenBeds');
for(let i=0;i<6;i++){
 const b=document.createElement('button');b.type='button';b.className='garden-bed';b.dataset.bed=String(i);
 b.setAttribute('aria-label',(i+1)+'번 마법 꽃밭');
 b.innerHTML='<span class="garden-dirt" aria-hidden="true"></span><span class="garden-plant" aria-hidden="true"><span class="garden-stem"></span><span class="garden-leaves"></span><span class="garden-petals">'+Array.from({length:6},()=>'<i></i>').join('')+'<em></em></span></span><span class="garden-bed-stars" aria-hidden="true">✨💦✨</span>';
 b.addEventListener('click',()=>waterGarden(i));
 gaBeds.append(b);gardenBeds.push(b);
}
$('gardenRianArt').innerHTML=gardenGirlArt();$('gardenIjunArt').innerHTML=gardenBoyArt();
function readGardenCrowns(){
 try{const n=Number(localStorage.getItem(GARDEN_STORE)||0);return Number.isInteger(n)&&n>=0?Math.min(n,1000000):0;}catch(_){return 0;}
}
ga.completed=readGardenCrowns();$('gardenCollection').textContent=ga.completed+'개';
function gTimer(fn,ms){
 const version=ga.epoch;
 const t=setTimeout(()=>{ga.timers.delete(t);if(ga.epoch===version)fn();},ms);
 ga.timers.add(t);return t;
}
function stopGarden(){
 ga.epoch++;for(const t of ga.timers)clearTimeout(t);ga.timers.clear();ga.phase='idle';
 gardenChoices.forEach(b=>{b.disabled=true;b.classList.remove('chosen','try-again','hint');});
 gardenBeds.forEach(b=>b.disabled=true);
 $('gardenStart').disabled=false;
 $('gardenScene').classList.remove('finished');
 $('gardenRian').classList.remove('celebrate');$('gardenIjun').classList.remove('celebrate');
}
function shuffledGarden(list){const a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function startGarden(){
 stopGarden();ga.phase='choose';ga.round=0;ga.blooms=0;ga.mistakes=0;ga.selected=-1;
 ga.positions=shuffledGarden([0,1,2,3,4,5]);
 ga.queue=shuffledGarden(['pink','yellow','blue','purple',gardenColors[Math.floor(Math.random()*4)].id,gardenColors[Math.floor(Math.random()*4)].id]);
 $('gardenResult').hidden=true;$('gardenStart').disabled=true;$('gardenStart').textContent='🌱 꽃정원 가꾸는 중!';
 $('gardenCount').textContent='0 / 6';$('gardenCollection').textContent=ga.completed+'개';
 $('gardenMagic').textContent='';
 gardenBeds.forEach((bed,i)=>{
  bed.className='garden-bed';bed.disabled=true;bed.style.removeProperty('--flower-color');bed.style.removeProperty('--flower-light');
  bed.setAttribute('aria-label',(i+1)+'번 빈 마법 꽃밭');
 });
 nextGardenTurn();beep(560,130,'sine',.065);
}
function nextGardenTurn(){
 if(ga.round>=6){finishGarden();return;}
 ga.phase='choose';ga.selected=ga.positions[ga.round];const wanted=gardenColors.find(x=>x.id===ga.queue[ga.round]);
 $('gardenPrompt').textContent='🌸 리안이가 찾는 '+wanted.name+' 꽃씨를 골라 주세요! ('+(ga.round+1)+'/6)';
 $('gardenRianQuote').textContent=wanted.name+'을(를) 골라 줘!';$('gardenIjunQuote').textContent='물뿌리개 준비! 💦';
 gardenChoices.forEach(b=>{b.disabled=false;b.classList.remove('chosen','try-again','hint');});
 gardenBeds.forEach(b=>{b.disabled=true;b.classList.remove('waiting','sparkling');});
 $('gardenMagic').textContent='';
}
function pickGardenColor(id){
 if(ga.phase!=='choose')return;
 const wanted=ga.queue[ga.round],btn=gardenChoices.find(b=>b.dataset.color===id);
 if(!btn)return;
 if(id!==wanted){
  ga.mistakes++;btn.classList.remove('try-again');void btn.offsetWidth;btn.classList.add('try-again');
  $('gardenPrompt').textContent='💖 괜찮아! '+gardenColors.find(x=>x.id===wanted).name+'을(를) 다시 찾아볼까?';
  $('gardenRianQuote').textContent='다시 골라 보자! 🌸';beep(340,85,'sine',.025);
  if(ga.mistakes%2===0)gardenChoices.find(b=>b.dataset.color===wanted).classList.add('hint');
  return;
 }
 ga.phase='water';btn.classList.add('chosen');
 gardenChoices.forEach(b=>b.disabled=true);
 const bed=gardenBeds[ga.selected];bed.disabled=false;bed.classList.add('waiting');
 $('gardenPrompt').textContent='💦 정답! 이제 이준이 차례예요. 반짝이는 화분을 톡 눌러 물을 주세요!';
 $('gardenRianQuote').textContent='우와! 정답이야! ✨';
 $('gardenIjunQuote').textContent='내가 물 줄게! 💦';beep(690,115,'sine',.06);
}
function waterGarden(i){
 if(ga.phase!=='water'||i!==ga.selected)return;
 ga.phase='blooming';const color=gardenColors.find(x=>x.id===ga.queue[ga.round]);
 const bed=gardenBeds[i];bed.disabled=true;bed.classList.remove('waiting');
 bed.style.setProperty('--flower-color',color.petal);
 bed.style.setProperty('--flower-light',color.highlight);
 bed.classList.add('bloomed','sparkling');
 bed.setAttribute('aria-label',(i+1)+'번 '+color.name+' 꽃이 활짝 피었어요');
 $('gardenMagic').textContent='💦 ✨ '+color.flower+' ✨';$('gardenMagic').classList.remove('burst');
 void $('gardenMagic').offsetWidth;$('gardenMagic').classList.add('burst');
 $('gardenRian').classList.add('celebrate');$('gardenIjun').classList.add('celebrate');
 $('gardenRianQuote').textContent='꽃이 활짝 피었어! 🌸';
 $('gardenIjunQuote').textContent='물 주기 성공! 💦';
 ga.blooms++;ga.round++;$('gardenCount').textContent=ga.blooms+' / 6';
 $('gardenPrompt').textContent='✨ 짜잔! '+color.name+' 꽃이 피었어요! '+(ga.blooms===6?'무지개 정원 완성!':'다음 꽃도 가꿔 볼까요?');
 beep(740,130,'sine',.065);gTimer(()=>beep(980,130,'sine',.06),115);
 gTimer(()=>{
  $('gardenRian').classList.remove('celebrate');$('gardenIjun').classList.remove('celebrate');
  if(ga.round>=6)finishGarden();else nextGardenTurn();
 },900);
}
function finishGarden(){
 if(ga.phase==='finished')return;
 ga.phase='finished';ga.completed++;
 try{localStorage.setItem(GARDEN_STORE,String(ga.completed));}catch(_){}
 $('gardenCollection').textContent=ga.completed+'개';
 $('gardenScene').classList.add('finished');
 $('gardenRian').classList.add('celebrate');$('gardenIjun').classList.add('celebrate');
 $('gardenPrompt').textContent='🌈 김리안과 권이준의 마법 꽃정원 완성! 꽃왕관을 선물합니다! 👑';
 $('gardenResultDetail').textContent='꽃 6송이 모두 성공! 👑 '+ga.completed+'번째 꽃왕관을 받았어요! 둘이 힘을 합쳐서 정말 멋져요!';
 $('gardenResult').hidden=false;$('gardenStart').disabled=false;
 $('gardenStart').textContent='▶ 새로운 꽃정원';
 $('gardenMagic').textContent='🌈👑💝';$('gardenMagic').classList.add('burst');
 gardenChoices.forEach(b=>b.disabled=true);gardenBeds.forEach(b=>b.disabled=true);
 cheer();
}
gardenChoices.forEach(btn=>btn.addEventListener('click',()=>pickGardenColor(btn.dataset.color)));
$('gardenStart').addEventListener('click',startGarden);
$('gardenAgain').addEventListener('click',startGarden);

// If a phone goes to sleep, use the monotonic deadline and process expiration on resume.
document.addEventListener('visibilitychange',()=>{if(document.hidden)return;if(mo.running)tickMole();if(fi.running)tickFire();if(so.phase==='aiming')tickSoccer();});
window.addEventListener('pagehide',()=>{stopMole();stopFire();stopSoccer();stopGarden();});
window.gameArcadeDebug={getState:()=>({current,mole:{...mo,timers:undefined},fire:{running:fi.running,score:fi.score,hits:fi.hits,rescued:fi.rescued,residents:fi.residents.size,rescueMode:fi.rescueMode,burns:fi.burned.size,flames:fi.flames.size},soccer:{phase:so.phase,round:so.round,goals:so.goals,shots:so.results.map(x=>({...x})),spentMs:so.spentMs,saved:so.saved},garden:{phase:ga.phase,round:ga.round,blooms:ga.blooms,mistakes:ga.mistakes,completed:ga.completed,target:ga.queue[ga.round],selected:ga.selected}})};
})();
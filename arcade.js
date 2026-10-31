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
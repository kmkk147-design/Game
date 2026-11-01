(()=>{
'use strict';
const $=id=>document.getElementById(id),clamp=x=>Math.max(0,Math.min(100,x));
const PETS=[
{id:'chick',name:'삐약이',type:'병아리',tone:'#ffe277',shade:'#efb941',inner:'#fff0ad',style:'chick',food:'🌽'},
{id:'puppy',name:'몽실이',type:'강아지',tone:'#e9b58e',shade:'#b47858',inner:'#ffe3c4',style:'puppy',food:'🍗'},
{id:'kitten',name:'솜솜이',type:'아기 고양이',tone:'#f7d2d9',shade:'#dba6b5',inner:'#fff0ed',style:'kitten',food:'🐟'},
{id:'bunny',name:'토리',type:'토끼',tone:'#efe0fa',shade:'#c7a8e6',inner:'#fff1fb',style:'bunny',food:'🥕'},
{id:'fox',name:'보리',type:'아기 여우',tone:'#f7b074',shade:'#de7a50',inner:'#fff4e8',style:'fox',food:'🍎'},
{id:'panda',name:'푸푸',type:'판다',tone:'#fffdf6',shade:'#b7b9c9',inner:'#f5f5ff',style:'panda',food:'🎋'},
{id:'dino',name:'초코',type:'아기 공룡',tone:'#a8e1c3',shade:'#63bd9e',inner:'#e9ffde',style:'dino',food:'🍎'},
{id:'penguin',name:'팽팽이',type:'펭귄',tone:'#8ca4d0',shade:'#4c638f',inner:'#fffdf5',style:'penguin',food:'🐟'},
{id:'hamster',name:'콩이',type:'햄스터',tone:'#f2cf9a',shade:'#c69562',inner:'#ffebcc',style:'hamster',food:'🌰'},
{id:'unicorn',name:'별이',type:'유니콘',tone:'#e6cbfa',shade:'#b5a1e6',inner:'#ffedfc',style:'unicorn',food:'🍓'}
];
const STORE='game-pet-house-v1',SHOP=[{id:'bow',icon:'🎀',name:'러블리 리본',price:35},{id:'hat',icon:'🎩',name:'멋진 모자',price:55},{id:'crown',icon:'👑',name:'반짝 왕관',price:90}];
const now=()=>Date.now(),rand=(a,b)=>Math.round(a+Math.random()*(b-a));
let cache={pets:{},active:'chick'},id='chick',busy=false,actionTimer=null,poopTimer=null,roamTimer=null,miniTick=null,miniSpawn=null,mini={active:false,type:'fruit',score:0,deadline:0},audio=null,sound=true;
function getPet(){return cache.pets[id]}
function makePet(){return{food:78,happy:86,clean:90,energy:82,xp:0,level:1,coins:25,poops:0,feedCount:0,decor:null,owned:[],lastAt:now()}}
function save(){try{localStorage.setItem(STORE,JSON.stringify(cache))}catch(_){}}
function read(){
 try{const data=JSON.parse(localStorage.getItem(STORE)||'null');if(data&&typeof data==='object'&&data.pets&&typeof data.pets==='object'){
 cache={pets:data.pets,active:typeof data.active==='string'?data.active:'chick'};
 }}catch(_){}
 if(!PETS.some(p=>p.id===cache.active))cache.active='chick';
 id=cache.active;
 if(!cache.pets[id])cache.pets[id]=makePet();
}
function recover(p){
 if(!p||typeof p!=='object')return makePet();
 const defaults=makePet();
 for(const key of ['food','happy','clean','energy'])p[key]=clamp(Number.isFinite(p[key])?p[key]:defaults[key]);
 for(const key of ['xp','coins','poops','feedCount'])p[key]=Math.max(0,Math.floor(Number.isFinite(p[key])?p[key]:defaults[key]));
 p.level=Math.max(1,Math.min(99,Math.floor(Number.isFinite(p.level)?p.level:1)));
 p.poops=Math.min(3,p.poops);
 if(!Array.isArray(p.owned))p.owned=[];
 if(!Number.isFinite(p.lastAt))p.lastAt=now();
 const minutes=Math.min(480,Math.max(0,(now()-p.lastAt)/60000));
 if(minutes>=.1){
  p.food=clamp(p.food-minutes*.6);p.happy=clamp(p.happy-minutes*.23);
  p.clean=clamp(p.clean-minutes*.28);p.energy=clamp(p.energy-minutes*.2);
  p.poops=Math.min(3,p.poops+Math.floor(minutes/70));
 }
 p.lastAt=now();return p;
}
function note(message){$('petMessage').textContent=message;$('petThought').textContent=message.length>19?message.slice(0,19)+'…':message}
function playTone(freq=620,duration=.12){if(!sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});const t=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(freq*1.12,t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.065,t+.018);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+duration+.02)}catch(_){}}
function colorGrad(p,uid){return'<defs><radialGradient id="'+uid+'fur" cx=".3" cy=".15" r=".95"><stop stop-color="'+p.inner+'"/><stop offset=".52" stop-color="'+p.tone+'"/><stop offset="1" stop-color="'+p.shade+'"/></radialGradient><linearGradient id="'+uid+'shine" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>'}
function ears(p){const f='fill="url(#GRADfur)" stroke="'+p.shade+'" stroke-width="2.5"';
 switch(p.style){
 case'chick':return'<path d="M89 58 Q79 37 96 32 Q92 22 108 30 Q117 20 119 37" fill="'+p.tone+'" stroke="'+p.shade+'" stroke-width="3"/>';
 case'puppy':return'<path d="M64 77 Q26 45 23 109 Q27 139 61 119Z M146 77 Q182 43 185 111 Q177 142 150 117Z" fill="'+p.shade+'" stroke="#a77964" stroke-width="3"/>';
 case'kitten':return'<path d="M49 83 L45 26 Q46 17 55 23 L91 56 M121 56 L155 23 Q163 17 165 33 L160 87" '+f+'/><path d="M52 35 L62 75 L81 58Z M147 35 L134 75 L124 58Z" fill="#f2a5bb"/>';
 case'bunny':return'<ellipse cx="73" cy="34" rx="19" ry="53" fill="'+p.tone+'" stroke="'+p.shade+'" stroke-width="3" transform="rotate(-15 73 34)"/><ellipse cx="138" cy="34" rx="19" ry="53" fill="'+p.tone+'" stroke="'+p.shade+'" stroke-width="3" transform="rotate(15 138 34)"/><ellipse cx="73" cy="34" rx="9" ry="39" fill="#eeb5d5" transform="rotate(-15 73 34)"/><ellipse cx="138" cy="34" rx="9" ry="39" fill="#eeb5d5" transform="rotate(15 138 34)"/>';
 case'fox':return'<path d="M40 83 L31 16 L91 59 M120 60 L183 16 L170 87" '+f+'/><path d="M43 73 L42 37 L78 63Z M132 63 L171 37 L160 75Z" fill="#ffded3"/>';
 case'panda':return'<circle cx="58" cy="68" r="27" fill="#3a3b51"/><circle cx="153" cy="68" r="27" fill="#3a3b51"/>';
 case'dino':return'<path d="M40 91 L24 73 L37 58 L24 44 L54 45 L64 27 L87 46 L103 22 L116 45 L139 36 L147 63 L172 60 L166 95" fill="#63b9a0" stroke="#4d967e" stroke-width="3"/>';
 case'penguin':return'<ellipse cx="61" cy="69" rx="19" ry="25" fill="#5f769e"/><ellipse cx="150" cy="69" rx="19" ry="25" fill="#5f769e"/>';
 case'hamster':return'<circle cx="54" cy="66" r="26" '+f+'/><circle cx="158" cy="66" r="26" '+f+'/><circle cx="54" cy="66" r="16" fill="#eaa9a3"/><circle cx="158" cy="66" r="16" fill="#eaa9a3"/>';
 case'unicorn':return'<path d="M98 56 L108 5 L120 55Z" fill="#ffd478" stroke="#d19b51" stroke-width="3"/><path d="M58 73 L49 29 L83 56 M128 57 L163 30 L154 77" '+f+'/><path d="M57 45 L69 69 L78 57Z M147 46 L136 69 L128 57Z" fill="#f5a7ce"/><path d="M85 43 Q53 42 56 78 Q78 62 94 64 Q112 53 133 67" fill="#ffb2c6" stroke="#d89cce" stroke-width="2"/>';
 default:return'';
 }}
function faceExtras(p){
 switch(p.style){
 case'chick':return'<path d="M97 131 L113 131 L105 148Z" fill="#ff9a4d" stroke="#e58c48" stroke-width="2"/><path d="M98 135 L112 135" stroke="#ffdca3" stroke-width="2"/>';
 case'puppy':return'<ellipse cx="106" cy="144" rx="34" ry="23" fill="#fff0dc"/><ellipse cx="106" cy="134" rx="12" ry="8" fill="#594443"/><path d="M106 142 L106 152 M96 154 Q106 163 116 154" stroke="#825c58" stroke-width="3" fill="none" stroke-linecap="round"/>';
 case'kitten':return'<path d="M99 141 Q105 147 111 141 L105 138Z" fill="#d5809d"/><path d="M105 145 Q96 158 89 150 M105 145 Q113 158 121 150" fill="none" stroke="#85677b" stroke-width="2.3"/><path d="M73 139 L41 131 M74 146 L44 150 M135 139 L169 131 M135 146 L169 150" stroke="#aa8b9a" stroke-width="2"/>';
 case'bunny':return'<ellipse cx="105" cy="143" rx="9" ry="6" fill="#e9a3bf"/><path d="M105 147 Q96 160 88 152 M105 147 Q114 160 122 152" stroke="#8e6b85" stroke-width="2.4" fill="none"/>';
 case'fox':return'<path d="M57 141 Q104 186 154 141 L127 132 Q105 158 82 132Z" fill="#fff3e8"/><ellipse cx="105" cy="142" rx="10" ry="7" fill="#51424a"/><path d="M99 154 Q105 161 112 154" stroke="#80595b" stroke-width="2" fill="none"/>';
 case'panda':return'<ellipse cx="77" cy="114" rx="20" ry="25" fill="#373a4f" transform="rotate(-15 77 114)"/><ellipse cx="135" cy="114" rx="20" ry="25" fill="#373a4f" transform="rotate(15 135 114)"/><ellipse cx="105" cy="144" rx="13" ry="9" fill="#eee"/><ellipse cx="105" cy="141" rx="8" ry="6" fill="#464555"/>';
 case'dino':return'<ellipse cx="99" cy="143" rx="3" ry="4" fill="#73a58e"/><ellipse cx="115" cy="143" rx="3" ry="4" fill="#73a58e"/><path d="M91 153 Q105 164 122 152" stroke="#648e80" stroke-width="3" fill="none"/>';
 case'penguin':return'<path d="M58 90 Q68 67 105 94 Q139 67 152 90 L156 149 Q107 200 55 150Z" fill="#fffefa" opacity=".98"/><path d="M96 139 L116 139 L106 153Z" fill="#f9ac59"/>';
 case'hamster':return'<ellipse cx="70" cy="147" rx="26" ry="22" fill="#ffefda"/><ellipse cx="143" cy="147" rx="26" ry="22" fill="#ffefda"/><ellipse cx="106" cy="139" rx="8" ry="5" fill="#c78e8d"/>';
 case'unicorn':return'<ellipse cx="105" cy="141" rx="24" ry="19" fill="#fff7fd"/><ellipse cx="98" cy="138" rx="3" ry="3.4" fill="#cb9cb9"/><ellipse cx="115" cy="138" rx="3" ry="3.4" fill="#cb9cb9"/>';
 default:return'';
 }}
function petSvg(p,scope,adult=false){
 const uid='p'+scope+p.id,fur='url(#'+uid+'fur)',inner=p.inner;
 let extra=ears(p).replaceAll('GRAD',uid);
 const spots=p.style==='panda'?'<ellipse cx="79" cy="114" rx="25" ry="27" fill="#3d3e53"/><ellipse cx="132" cy="114" rx="25" ry="27" fill="#3d3e53"/>':'';
 const wings=p.style==='penguin'?'<ellipse cx="42" cy="166" rx="19" ry="40" transform="rotate(-26 42 166)" fill="#6379a6"/><ellipse cx="169" cy="166" rx="19" ry="40" transform="rotate(26 169 166)" fill="#6379a6"/>':
 '<ellipse cx="50" cy="172" rx="18" ry="33" transform="rotate(-27 50 172)" fill="'+p.shade+'" opacity=".88"/><ellipse cx="161" cy="172" rx="18" ry="33" transform="rotate(27 161 172)" fill="'+p.shade+'" opacity=".88"/>';
 const belly=p.style==='penguin'||p.style==='panda'?'#fffefa':p.inner;
 const face=p.style==='panda'?'#ffffff':'#303149';
 return '<svg viewBox="0 0 210 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+p.type+' 일러스트">'+colorGrad(p,uid)+
 '<ellipse cx="105" cy="234" rx="68" ry="10" fill="#7a676e" opacity=".17"/>'+
 '<path d="M74 193 Q63 223 82 231 Q98 237 102 218 M136 193 Q148 223 128 231 Q112 237 108 218" fill="'+p.shade+'" stroke="'+p.shade+'" stroke-width="4"/>'+
 '<ellipse cx="105" cy="178" rx="67" ry="64" fill="'+fur+'" stroke="'+p.shade+'" stroke-width="2.5"/>'+wings+
 '<ellipse cx="105" cy="185" rx="42" ry="46" fill="'+belly+'" opacity=".78"/>'+
 extra+
 '<ellipse cx="105" cy="116" rx="73" ry="75" fill="'+fur+'" stroke="'+p.shade+'" stroke-width="2.5"/>'+
 '<ellipse cx="76" cy="93" rx="34" ry="24" fill="#fff" opacity=".13" transform="rotate(-27 76 93)"/>'+spots+
 '<g class="eye-open"><ellipse cx="79" cy="114" rx="9" ry="13" fill="'+face+'"/><ellipse cx="132" cy="114" rx="9" ry="13" fill="'+face+'"/>'+
 '<ellipse cx="76.5" cy="109" rx="3.5" ry="4.5" fill="#fff"/><ellipse cx="129.5" cy="109" rx="3.5" ry="4.5" fill="#fff"/>'+
 '<ellipse cx="83" cy="119" rx="2" ry="2" fill="#fff" opacity=".6"/><ellipse cx="136" cy="119" rx="2" ry="2" fill="#fff" opacity=".6"/></g>'+
 '<g class="eye-close" fill="none" stroke="#665465" stroke-width="3.8" stroke-linecap="round"><path d="M67 113 Q79 122 91 113 M120 113 Q132 122 144 113"/></g>'+
 '<ellipse cx="61" cy="140" rx="15" ry="9" fill="#ee94a7" opacity=".58"/><ellipse cx="150" cy="140" rx="15" ry="9" fill="#ee94a7" opacity=".58"/>'+
 faceExtras(p)+
 (p.style==='chick'||p.style==='penguin'||p.style==='panda'||p.style==='unicorn'?'':'<path d="M98 155 Q105 162 113 154" fill="none" stroke="#91667c" stroke-width="2.5" stroke-linecap="round"/>')+
 '<g opacity=".75"><circle cx="55" cy="105" r="3" fill="#fff"/><circle cx="161" cy="98" r="3.5" fill="#fff"/></g>'+
 (adult?'<path d="M56 74 L62 59 L71 69 M145 71 L153 57 L158 76" fill="none" stroke="#fff" stroke-width="3" opacity=".6"/>':'')+'</svg>';
}
function gainXp(p,n){p.xp+=n;let levels=0;while(p.xp>=100&&p.level<99){p.xp-=100;p.level++;p.coins+=15;levels++;}if(levels){note('✨ '+PETS.find(x=>x.id===id).name+' 레벨 '+p.level+'! 성장했어요! 🏆');sparkles('✨',9);playTone(930)}}
function formatPercent(x){return Math.round(clamp(x))+'%'}
function render(){
 const p=getPet(),data=PETS.find(x=>x.id===id);
 $('petName').textContent=data.name;$('petStage').textContent=(p.level>=3?'GROWN-UP':'BABY')+' · LV. '+p.level;$('petLevel').textContent='LV.'+p.level;$('xpFill').style.width=p.xp+'%';$('xpText').textContent=p.xp+' / 100 XP';$('petCoins').textContent=p.coins.toLocaleString('ko-KR');
 for(const [key,field] of [['food','Food'],['happy','Happy'],['clean','Clean'],['energy','Energy']]){$('stat'+field).textContent=formatPercent(p[key]);$('bar'+field).style.width=clamp(p[key])+'%'}
 $('petPicker').querySelectorAll('.pick').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===id)));
 const actor=$('petCreature');actor.innerHTML=petSvg(data,'main',p.level>=3)+(p.decor?'<span class="accessory" style="position:absolute;z-index:3;top:0;left:50%;transform:translateX(-50%)">'+SHOP.find(x=>x.id===p.decor)?.icon+'</span>':'');
 actor.classList.toggle('adult',p.level>=3);
 $('petFoodVisual').textContent=data.food;renderPoops();renderShop();
}
function renderPicker(){
 const host=$('petPicker');host.replaceChildren();
 for(const p of PETS){
  const b=document.createElement('button');b.className='pick';b.type='button';b.dataset.id=p.id;b.setAttribute('aria-pressed',String(id===p.id));
  b.innerHTML='<div class="preview">'+petSvg(p,'picker')+'</div><strong>'+p.name+'</strong><small>'+p.type+'</small>';
  b.addEventListener('click',()=>selectPet(p.id));host.append(b);
 }
}
function selectPet(next){
 if(!PETS.some(p=>p.id===next)||mini.active)return;
 clearTimeout(actionTimer);clearTimeout(poopTimer);busy=false;id=next;cache.active=next;
 if(!cache.pets[id])cache.pets[id]=makePet();
 else cache.pets[id]=recover(cache.pets[id]);
 const c=$('petCreature');c.className='creature';c.style.left='50%';
 render();note('💖 '+PETS.find(p=>p.id===id).name+'와 함께 놀자!');save();
}
function renderPoops(){
 const host=$('petPoops');host.replaceChildren();
 for(let i=0;i<getPet().poops;i++){const b=document.createElement('button');b.className='poop';b.type='button';b.textContent='💩';b.style.left=(14+i*18)+'%';b.style.bottom=(14+i%2*10)+'px';b.setAttribute('aria-label','똥 치우기');b.addEventListener('click',()=>care('clean'));host.append(b)}
}
function renderShop(){
 const host=$('petShop');host.replaceChildren();const p=getPet();
 for(const item of SHOP){const own=p.owned.includes(item.id),worn=p.decor===item.id;
  const b=document.createElement('button');b.type='button';b.className='shop-item'+(own?' owned':'');
  b.innerHTML='<span>'+item.icon+'</span><strong>'+item.name+'</strong><small>'+(worn?'✅ 착용 중':own?'착용하기':'🪙 '+item.price)+'</small>';
  b.addEventListener('click',()=>buy(item.id));host.append(b);
 }
}
function buy(itemId){
 if(mini.active||busy)return;const item=SHOP.find(x=>x.id===itemId),p=getPet();if(!item)return;
 if(p.decor===itemId){p.decor=null;note('옷을 잠깐 벗었어요!');}
 else if(p.owned.includes(itemId)){p.decor=itemId;note('짜잔! '+item.name+'를 착용했어요! ✨');}
 else if(p.coins>=item.price){p.coins-=item.price;p.owned.push(itemId);p.decor=itemId;note('선물 성공! '+item.name+' 🎁');playTone(890);}
 else{note('🪙 코인이 모자라요! 미니게임으로 모아요.');return;}
 save();render();
}
function sparkles(emoji='💕',count=6){
 const host=$('petFx');for(let i=0;i<count;i++){const s=document.createElement('span');s.className='spark';s.textContent=emoji;s.style.left=rand(25,75)+'%';s.style.top=rand(40,76)+'%';s.style.animationDelay=rand(0,300)+'ms';host.append(s);setTimeout(()=>s.remove(),1700)}
}
function moveActor(x,state,duration=1300){
 const el=$('petCreature');el.classList.remove('walk','eat','bath','sleep','jump');el.classList.add('walk');el.style.left=x+'%';
 setTimeout(()=>{if(el.classList.contains('walk'))el.classList.remove('walk')},duration);
}
function finishAction(ms=1500){clearTimeout(actionTimer);actionTimer=setTimeout(()=>{busy=false;$('petCreature').classList.remove('walk','eat','bath','sleep','jump');$('petCreature').style.left='50%';render();save()},ms)}
function delayedPoop(petId){
 clearTimeout(poopTimer);poopTimer=setTimeout(()=>{const p=cache.pets[petId];if(!p)return;p.poops=Math.min(3,p.poops+1);p.clean=clamp(p.clean-6);save();if(id===petId){renderPoops();note('💩 앗! 청소해 주세요!')}},19000);
}
function care(action){
 if(mini.active||busy)return;const p=getPet(),el=$('petCreature'),owner=id;busy=true;
 if(action==='feed'){
  if(p.food>=98){note('배가 아주 든든해요! 조금 후에 먹어요 ♡');busy=false;return;}
  note('🍓 음식 냄새가 나요! 펫이 걸어가요.');$('petBowl').classList.add('shake');moveActor(73,'walk',650);
  actionTimer=setTimeout(()=>{if(id!==owner)return;el.classList.remove('walk');el.classList.add('eat');playTone(550);$('petBowl').classList.remove('shake');$('petFoodVisual').style.opacity='.18';
   p.food=clamp(p.food+23);p.happy=clamp(p.happy+6);p.energy=clamp(p.energy-2);p.feedCount++;gainXp(p,12);
   note('냠냠! 맛있게 먹었어요! 😋');sparkles('💖',5);save();finishAction(1450);delayedPoop(owner);setTimeout(()=>$('petFoodVisual').style.opacity='1',1450);
  },900);
 }else if(action==='clean'){
  const count=p.poops;p.poops=0;p.clean=clamp(p.clean+(count?27:8));gainXp(p,count?10:3);note(count?'✨ 똥을 모두 치웠어요! 깨끗!':'🧹 반짝반짝 청소했어요!');sparkles('✨',8);playTone(900);finishAction(900);
 }else if(action==='bath'){
  el.classList.add('bath');p.clean=clamp(p.clean+34);p.happy=clamp(p.happy+6);gainXp(p,13);note('🫧 보글보글~ 목욕했어요!');sparkles('🫧',9);playTone(730);finishAction(1950);
 }else if(action==='sleep'){
  if(p.energy>=97){note('아직 쌩쌩해요! 조금 더 놀아요.');busy=false;return;}
  el.classList.add('sleep');el.style.left='30%';p.energy=clamp(p.energy+32);p.happy=clamp(p.happy+3);gainXp(p,12);note('🌙 쿨쿨... 좋은 꿈 꾸는 중 Zzz');sparkles('💤',4);finishAction(2600);
 }else if(action==='pet'){
  p.happy=clamp(p.happy+14);gainXp(p,6);el.classList.add('jump');note('💗 쓰담쓰담! 너무 좋아요!');sparkles('💕',8);playTone(850);finishAction(820);
 }else if(action==='play'){
  if(p.energy<12){note('🥱 졸려요. 먼저 잠을 자게 해줘요!');busy=false;return;}
  p.happy=clamp(p.happy+20);p.energy=clamp(p.energy-8);p.food=clamp(p.food-3);gainXp(p,12);
  el.classList.add('jump');note('🧸 폴짝폴짝! 신나게 놀았어요!');sparkles('⭐',8);playTone(900);finishAction(1000);
 }else busy=false;
 renderMetersOnly();save();
}
function renderMetersOnly(){
 const p=getPet();
 for(const [key,field] of [['food','Food'],['happy','Happy'],['clean','Clean'],['energy','Energy']]){$('stat'+field).textContent=formatPercent(p[key]);$('bar'+field).style.width=clamp(p[key])+'%'}
 $('petCoins').textContent=p.coins;$('petLevel').textContent='LV.'+p.level;$('petStage').textContent=(p.level>=3?'GROWN-UP':'BABY')+' · LV. '+p.level;
 $('xpFill').style.width=p.xp+'%';$('xpText').textContent=p.xp+' / 100 XP';
}
function passiveNeeds(){
 if(mini.active||busy)return;const p=getPet();let m='오늘도 함께 놀자! ♡';
 if(p.poops>=1)m='💩 똥이 생겼어요! 청소해 줘요!';
 else if(p.food<30)m='🍓 배가 고파요! 밥 주세요!';
 else if(p.energy<25)m='🥱 피곤해요! 재워 주세요!';
 else if(p.clean<30)m='🫧 목욕하고 싶어요!';
 else if(p.happy<30)m='💗 같이 놀고 싶어요!';
 $('petThought').textContent=m;
}
function updateNeeds(){
 if(mini.active)return;
 const p=getPet(),t=now(),m=Math.max(0,Math.min(2,(t-p.lastAt)/60000));p.lastAt=t;
 if(m>0){p.food=clamp(p.food-m*.6);p.happy=clamp(p.happy-m*.23);p.clean=clamp(p.clean-m*.28);p.energy=clamp(p.energy-m*.2);renderMetersOnly();save()}
 passiveNeeds();
}
function roam(){
 if(mini.active||busy)return;const el=$('petCreature');if(el.classList.contains('sleep'))return;
 moveActor(rand(33,69),'walk',900);
 const later=rand(2,4);setTimeout(()=>{if(!busy&&!mini.active)el.style.left='50%'},later*1000);
}
function notifyParent(type){try{if(window.parent!==window)window.parent.postMessage({petHouse:type},location.origin)}catch(_){}}
function stopMini(showResult=true){
 if(!mini.active)return;mini.active=false;clearInterval(miniTick);clearInterval(miniSpawn);miniTick=null;miniSpawn=null;notifyParent('endMini');
 if(showResult){
  const p=getPet(),coins=Math.min(70,5+mini.score*3);p.coins+=coins;p.happy=clamp(p.happy+12);p.energy=clamp(p.energy-5);gainXp(p,Math.min(35,10+mini.score*2));save();
  $('miniResult').hidden=false;$('miniResultIcon').textContent=mini.score>=8?'🏆':'💖';$('miniResultTitle').textContent=mini.score>=8?'와! 대단해요!':'참 잘했어요!';
  $('miniResultBody').textContent='⭐ '+mini.score+'점 · 🪙 '+coins+'코인 획득! 내 펫과 함께 성장했어요!';
  playTone(960);renderMetersOnly();
 }else{$('petMinigame').hidden=true;$('miniResult').hidden=true;render();note('다음에 또 같이 놀자! ♡')}
}
function beginMini(type){
 if(mini.active||busy)return;const p=getPet();if(p.energy<10){note('💤 체력이 부족해요. 먼저 재워 주세요!');return;}
 mini={active:true,type,score:0,deadline:performance.now()+20000};
 $('petMinigame').hidden=false;$('miniResult').hidden=true;$('miniField').replaceChildren();$('miniScore').textContent='0';$('miniTime').textContent='20초';
 $('miniTitle').textContent=type==='fruit'?'🍓 과일 톡톡':'⭐ 별빛 잡기';$('miniPrompt').textContent=type==='fruit'?'🍓 떨어지는 과일을 톡톡!':'⭐ 반짝이는 별을 찾아 톡톡!';
 notifyParent('startMini');playTone(700);
 miniTick=setInterval(()=>{const left=Math.max(0,Math.ceil((mini.deadline-performance.now())/1000));$('miniTime').textContent=left+'초';if(left<=0)stopMini()},90);
 miniSpawn=setInterval(spawnMini,type==='fruit'?670:780);spawnMini();
}
function spawnMini(){
 if(!mini.active)return;const field=$('miniField'),type=mini.type,b=document.createElement('button');b.className='mini-thing';b.type='button';
 b.textContent=type==='fruit'?['🍎','🍓','🍇','🍊','🍌'][rand(0,4)]:['⭐','🌟','💫'][rand(0,2)];
 b.style.left=rand(3,83)+'%';
 const duration=type==='fruit'?rand(2500,3400):rand(1300,1900);
 b.style.setProperty('--fall',(duration/1000)+'s');
 if(type==='star'){b.classList.add('star-pop');b.style.top=rand(12,62)+'%';}
 let taken=false;
 b.addEventListener('click',e=>{e.preventDefault();if(!mini.active||taken)return;taken=true;mini.score+=type==='star'?2:1;$('miniScore').textContent=String(mini.score);const rect=b.getBoundingClientRect(),par=$('petMinigame').getBoundingClientRect();b.remove();
  const s=document.createElement('span');s.className='spark';s.textContent='✨';s.style.left=(rect.left-par.left)+'px';s.style.top=(rect.top-par.top)+'px';$('petMinigame').append(s);setTimeout(()=>s.remove(),1300);playTone(560+mini.score*19);
 });
 field.append(b);setTimeout(()=>b.remove(),duration+100);
}
$('petSound').addEventListener('click',()=>{sound=!sound;$('petSound').textContent=sound?'🔊':'🔇'});
document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>care(b.dataset.action)));
document.querySelectorAll('[data-game]').forEach(b=>b.addEventListener('click',()=>beginMini(b.dataset.game)));
$('petCreature').addEventListener('click',()=>care('pet'));
$('petCreature').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();care('pet')}});
$('miniStop').addEventListener('click',()=>stopMini(false));
$('miniAgain').addEventListener('click',()=>{const type=mini.type;$('petMinigame').hidden=true;beginMini(type)});
$('miniClose').addEventListener('click',()=>{$('petMinigame').hidden=true;$('miniResult').hidden=true;render();note('또 놀자! 코인이 쌓였어요 🪙')});
$('miniField').addEventListener('touchmove',e=>{if(mini.active&&e.cancelable)e.preventDefault()},{passive:false});
window.addEventListener('message',e=>{if(e.origin!==location.origin)return;if(e.data?.petHouse==='stop')stopMini(false)});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){getPet().lastAt=Math.min(getPet().lastAt,now());updateNeeds()}});
window.addEventListener('pagehide',save);
read();for(const p of Object.keys(cache.pets))cache.pets[p]=recover(cache.pets[p]);
renderPicker();render();note('💖 '+PETS.find(p=>p.id===id).name+'와 함께 놀자!');
setInterval(updateNeeds,12000);roamTimer=setInterval(roam,6500);
window.PetGameDebug={getState:()=>({id,pet:{...getPet(),owned:[...getPet().owned]},mini:{...mini},species:PETS.map(x=>x.id)}),feed:()=>care('feed'),care,select:selectPet,startMini:beginMini,stopMini};
save();
})();
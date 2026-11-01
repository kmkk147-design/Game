(()=>{
'use strict';
const $=id=>document.getElementById(id),clamp=x=>Math.max(0,Math.min(100,x));
const PETS=[
{id:'fox',name:'보리',type:'레서판다',tone:'#f7b074',shade:'#de7a50',inner:'#fff4e8',style:'redpanda',food:'🍎'},
{id:'chick',name:'삐약이',type:'병아리',tone:'#ffe277',shade:'#efb941',inner:'#fff0ad',style:'chick',food:'🌽'},
{id:'puppy',name:'몽실이',type:'강아지',tone:'#e9b58e',shade:'#b47858',inner:'#ffe3c4',style:'puppy',food:'🍗'},
{id:'kitten',name:'솜솜이',type:'아기 고양이',tone:'#f7d2d9',shade:'#dba6b5',inner:'#fff0ed',style:'kitten',food:'🐟'},
{id:'bunny',name:'토리',type:'토끼',tone:'#efe0fa',shade:'#c7a8e6',inner:'#fff1fb',style:'bunny',food:'🥕'},
{id:'panda',name:'푸푸',type:'판다',tone:'#fffdf6',shade:'#b7b9c9',inner:'#f5f5ff',style:'panda',food:'🎋'},
{id:'dino',name:'초코',type:'아기 공룡',tone:'#a8e1c3',shade:'#63bd9e',inner:'#e9ffde',style:'dino',food:'🍎'},
{id:'penguin',name:'팽팽이',type:'펭귄',tone:'#8ca4d0',shade:'#4c638f',inner:'#fffdf5',style:'penguin',food:'🐟'},
{id:'hamster',name:'콩이',type:'햄스터',tone:'#f2cf9a',shade:'#c69562',inner:'#ffebcc',style:'hamster',food:'🌰'},
{id:'unicorn',name:'별이',type:'유니콘',tone:'#e6cbfa',shade:'#b5a1e6',inner:'#ffedfc',style:'unicorn',food:'🍓'}
];
const STORE='game-pet-house-v1',SHOP=[{id:'bow',icon:'🎀',name:'러블리 리본',price:35},{id:'hat',icon:'🎩',name:'멋진 모자',price:55},{id:'crown',icon:'👑',name:'반짝 왕관',price:90},{id:'starlight',icon:'🌟',name:'반짝 별모자',price:45,levelRequired:3},{id:'daily-bow',icon:'🌈',name:'7일 출석 선물',price:0,special:true},{id:'cushion',icon:'🧸',name:'포근한 쿠션',price:30,room:true},{id:'lamp',icon:'🌟',name:'별빛 조명',price:45,room:true},{id:'sticker',icon:'🌈',name:'무지개 벽장식',price:40,room:true}];
const now=()=>Date.now(),rand=(a,b)=>Math.round(a+Math.random()*(b-a));
let cache={pets:{},active:'fox',walletCoins:25,roomOwned:[],roomDecor:null,attendance:null,request:null,requestLastRewardAt:0},id='fox',busy=false,activeRoom='living',storageAvailable=true,actionTimer=null,poopTimer=null,roamTimer=null,miniTick=null,miniSpawn=null,mini={active:false,type:'fruit',score:0,deadline:0},audio=null,sound=true;
function getPet(){return cache.pets[id]}
function makePet(){return{food:78,happy:86,clean:90,energy:82,xp:0,level:1,coins:0,poops:0,feedCount:0,decor:null,owned:[],lastAt:now()}}
function save(){
 const payload=JSON.stringify(cache);
 try{
  localStorage.setItem(STORE,payload);storageAvailable=true;
  try{localStorage.setItem(STORE+'-backup',payload)}catch(_){}
 }catch(_){storageAvailable=false}
 const indicator=$('petSaveState');
 if(indicator){indicator.textContent=storageAvailable?'✓ 코인·성장 자동 저장됨':'⚠️ 이 기기의 저장 공간을 사용할 수 없어요';indicator.classList.toggle('save-error',!storageAvailable)}
}
function read(){
 let data=null;
 try{data=JSON.parse(localStorage.getItem(STORE)||'null')}catch(_){}
 if(!data||typeof data!=='object'||!data.pets||typeof data.pets!=='object'){
  try{data=JSON.parse(localStorage.getItem(STORE+'-backup')||'null')}catch(_){}
 }
 if(data&&typeof data==='object'&&data.pets&&typeof data.pets==='object'){
  cache={...data,pets:data.pets,active:typeof data.active==='string'?data.active:'fox',walletCoins:data.walletCoins};
 }
 if(!PETS.some(p=>p.id===cache.active))cache.active='fox';
 // Previous versions stored a separate coin balance per character.
 // Migrate once to a shared wallet without discarding earned coins or gifts.
 if(!Number.isFinite(cache.walletCoins)){
  let oldBalance=0;
  for(const p of Object.values(cache.pets)){
   const value=Number(p?.coins);
   if(Number.isFinite(value)&&value>0)oldBalance+=Math.floor(value);
  }
  cache.walletCoins=Math.max(0,oldBalance);
 }
 cache.walletCoins=Math.min(999999999,Math.max(0,Math.floor(cache.walletCoins)));
 if(!Array.isArray(cache.roomOwned))cache.roomOwned=[];
 if(typeof cache.requestLastRewardAt!=='number')cache.requestLastRewardAt=0;
 if(cache.request&&(!PETS.some(p=>p.id===cache.request.petId)||!['feed','clean','bath','sleep','pet','play'].includes(cache.request.action)))cache.request=null;
 // Keep established players' selected pet; default the new design for untouched starters only.
 try{
  if(!localStorage.getItem('game-pet-3d-mascot-onboarded-v1')){
   const previous=cache.pets[cache.active];
   if(cache.active==='chick'&&(!previous||(previous.level===1&&(previous.feedCount||0)===0&&(previous.xp||0)===0)))cache.active='fox';
   localStorage.setItem('game-pet-3d-mascot-onboarded-v1','1');
  }
 }catch(_){}
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
const REQUESTS=[
 {action:'feed',icon:'🍓',text:'맛있는 간식이 먹고 싶어!',reward:9},
 {action:'clean',icon:'🚽',text:'화장실에 데려다줘!',reward:8},
 {action:'bath',icon:'🫧',text:'따뜻하게 목욕하고 싶어!',reward:10},
 {action:'sleep',icon:'🌙',text:'침실에서 낮잠 잘래!',reward:8},
 {action:'pet',icon:'💗',text:'쓰담쓰담 해주면 행복해!',reward:8},
 {action:'play',icon:'🧸',text:'나랑 신나게 놀아줘!',reward:10}
];
function seoulDate(){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const p=k=>parts.find(x=>x.type===k).value;
 return p('year')+'-'+p('month')+'-'+p('day');
}
function dayDifference(a,b){
 const parse=s=>Date.parse(s+'T00:00:00Z');
 return Number.isFinite(parse(a))&&Number.isFinite(parse(b))?Math.round((parse(b)-parse(a))/86400000):999;
}
function attendanceView(){
 const el=$('attendanceInfo'),btn=$('claimAttendance');if(!el||!btn)return;
 const rec=cache.attendance||{},today=seoulDate(),claimed=rec.date===today;
 const streak=Math.max(0,Math.min(7,Number(rec.streak)||0));
 const next=claimed?streak:dayDifference(rec.date||'',today)===1?Math.min(7,streak+1):1;
 const prize=[10,15,20,25,30,35,50][Math.max(0,next-1)];
 el.textContent=claimed?streak+'일 출석 완료 · 내일 또 만나요!':next+'일차 선물 🪙 '+prize+'코인'+(next===7?' + 🌈 특별 리본':'');
 btn.textContent=claimed?'받음 ✓':'선물 받기';btn.disabled=claimed;
}
function claimAttendance(){
 const today=seoulDate(),rec=cache.attendance||{};if(rec.date===today)return;
 const streak=dayDifference(rec.date||'',today)===1?Math.min(7,Math.max(0,rec.streak||0)+1):1;
 const prize=[10,15,20,25,30,35,50][streak-1];
 cache.attendance={date:today,streak};cache.walletCoins=Math.min(999999999,cache.walletCoins+prize);
 if(streak===7){const p=getPet();if(!p.owned.includes('daily-bow'))p.owned.push('daily-bow');}
 attendanceView();render();save();playTone(920);sparkles(streak===7?'🌈':'🪙',9);
 note('🎁 출석 '+streak+'일차! '+prize+'코인 획득'+(streak===7?' · 특별 리본 선물!':'')+' ♡');
}
function requestView(){
 const el=$('requestInfo'),btn=$('requestHelp');if(!el||!btn)return;
 const req=cache.request,remaining=Math.ceil((120000-(now()-cache.requestLastRewardAt))/1000);
 if(req){
  const friend=PETS.find(p=>p.id===req.petId),cfg=REQUESTS.find(r=>r.action===req.action);
  el.textContent=(friend?.name||'친구')+': '+cfg.icon+' '+cfg.text+' · 성공 +'+cfg.reward+'코인';
  btn.textContent=req.petId===id?'도와주기':'친구 선택';btn.disabled=false;
 }else if(remaining>0){
  el.textContent='새 부탁이 곧 도착해요 · 약 '+Math.ceil(remaining/60)+'분';
  btn.textContent='조금 뒤에';btn.disabled=true;
 }else{
  el.textContent='부탁을 들어주면 보너스 코인!';
  btn.textContent='들어보기';btn.disabled=false;
 }
}
function startRequest(force=false){
 if(cache.request){requestView();if(force&&cache.request.petId!==id)selectPet(cache.request.petId);else if(force){const cfg=REQUESTS.find(x=>x.action===cache.request.action);note('💌 '+cfg.text)}return;}
 if(now()-cache.requestLastRewardAt<120000){requestView();return;}
 const cfg=REQUESTS[rand(0,REQUESTS.length-1)];
 cache.request={petId:id,action:cfg.action,createdAt:now()};requestView();save();
 if(force)note('💌 '+PETS.find(x=>x.id===id).name+': '+cfg.text);
}
function completeRequest(action){
 const req=cache.request;if(!req||req.petId!==id||req.action!==action)return;
 const cfg=REQUESTS.find(r=>r.action===action);
 cache.request=null;cache.requestLastRewardAt=now();
 cache.walletCoins=Math.min(999999999,cache.walletCoins+cfg.reward);
 gainXp(getPet(),7);requestView();renderMetersOnly();save();
 sparkles('🪙',7);note('💌 부탁 성공! '+cfg.reward+'코인과 경험치를 받았어요!');
}
function renderRoomDecor(){const room=$('petRoom');if(room)room.dataset.decor=cache.roomDecor||'none';}
function showLevelUp(level){
 const room=$('petRoom');if(!room)return;
 const el=document.createElement('div');el.className='level-up-flash';el.textContent='✨ LEVEL '+level+'! +15🪙'+(level===3?' · 별모자 해금!':'');
 room.append(el);setTimeout(()=>el.remove(),2200);
}
function note(message){$('petMessage').textContent=message;$('petThought').textContent=message.length>19?message.slice(0,19)+'…':message}
function playTone(freq=620,duration=.12){if(!sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});const t=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(freq*1.12,t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.065,t+.018);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+duration+.02)}catch(_){}}
function colorGrad(p,uid){return'<defs><radialGradient id="'+uid+'fur" cx=".3" cy=".15" r=".95"><stop stop-color="'+p.inner+'"/><stop offset=".52" stop-color="'+p.tone+'"/><stop offset="1" stop-color="'+p.shade+'"/></radialGradient><linearGradient id="'+uid+'shine" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>'}

/* LIL' FRIENDS DELUXE: original vector characters drawn from individual shapes.
   Large emotive heads, tiny plush bodies, specular multi-layer eyes and six moods. */
function petMood(p){
 if(p.energy<24)return 'sleepy';
 if(p.food<25)return 'hungry';
 if(p.clean<24||p.poops>=3)return 'messy';
 if(p.happy<25)return 'sad';
 return 'normal';
}
const MOOD_LABELS={normal:'기분 좋아요 ♡',happy:'행복해요! ♥',excited:'신나요! ✨',eating:'냠냠 맛있어요',sleepy:'졸려요 Zzz',hungry:'배가 고파요 ㅠㅠ',sad:'같이 놀아줘요',messy:'씻고 싶어요!',bath:'반짝반짝 깨끗!',sleep:'꿈나라 여행 중'};
function petEars(p,fur){
 const sh=p.shade,inner=p.inner;
 switch(p.style){
 case 'chick':return '<path d="M93 44 Q76 22 93 17 Q105 13 111 29 Q120 12 135 22 Q146 32 123 48" fill="'+p.tone+'" stroke="'+sh+'" stroke-width="3" stroke-linejoin="round"/><path d="M104 31 Q111 18 122 28" stroke="#fff7bb" fill="none" stroke-width="5" stroke-linecap="round"/>';
 case 'puppy':return '<path d="M55 72 Q17 37 14 87 Q12 128 48 136 Q64 109 68 78Z M166 71 Q208 40 209 92 Q210 129 172 135 Q157 103 157 79Z" fill="'+sh+'" stroke="#92644e" stroke-width="3"/><path d="M31 73 Q25 95 38 109 M190 72 Q198 96 186 110" stroke="#ffe3c9" stroke-width="8" opacity=".8" fill="none" stroke-linecap="round"/>';
 case 'kitten':return '<path d="M45 80 L32 16 Q31 8 44 14 L96 49 M128 48 L177 14 Q191 9 188 25 L177 85" fill="'+p.tone+'" stroke="'+sh+'" stroke-width="4" stroke-linejoin="round"/><path d="M47 67 L43 32 L79 54Z M170 66 L178 32 L141 53Z" fill="#ef9bb6"/><path d="M48 58 L51 45 M172 57 L169 45" stroke="#ffeef6" stroke-width="3" fill="none"/>';
 case 'bunny':return '<path d="M66 82 Q33 14 58 2 Q87 -10 91 75Z M128 76 Q128 -7 157 2 Q184 20 150 87Z" fill="'+p.tone+'" stroke="'+sh+'" stroke-width="3.5"/><path d="M72 69 Q48 11 62 18 Q77 20 82 73Z M137 71 Q142 15 155 19 Q166 26 147 74Z" fill="#f5a9ce"/>';
 case 'fox':return '<path d="M39 86 L24 9 Q25 0 38 10 L90 56 M127 55 L181 9 Q194 0 195 13 L180 89" fill="'+p.tone+'" stroke="'+sh+'" stroke-width="3.5"/><path d="M43 68 L38 24 L77 56Z M177 68 L182 24 L143 56Z" fill="#ffe4c8"/>';
 case 'panda':return '<circle cx="49" cy="69" r="30" fill="#434052" stroke="#fff" stroke-width="3"/><circle cx="171" cy="69" r="30" fill="#434052" stroke="#fff" stroke-width="3"/><circle cx="43" cy="59" r="9" fill="#726e7e" opacity=".5"/>';
 case 'dino':return '<path d="M35 107 L16 81 L33 71 L18 53 L46 49 L51 25 L80 41 L96 13 L115 38 L138 25 L150 50 L179 45 L178 81" fill="#69c8a8" stroke="#4eae90" stroke-width="3.5" stroke-linejoin="round"/><path d="M29 74 L40 78 L43 58 M95 38 L99 26 L110 41" stroke="#c9ffb9" fill="none" stroke-width="4" stroke-linecap="round"/>';
 case 'penguin':return '<ellipse cx="52" cy="72" rx="22" ry="30" fill="#5a719d" transform="rotate(-24 52 72)"/><ellipse cx="168" cy="72" rx="22" ry="30" fill="#5a719d" transform="rotate(24 168 72)"/>';
 case 'hamster':return '<circle cx="51" cy="69" r="33" fill="'+p.tone+'" stroke="'+sh+'" stroke-width="3"/><circle cx="168" cy="69" r="33" fill="'+p.tone+'" stroke="'+sh+'" stroke-width="3"/><circle cx="51" cy="69" r="22" fill="#e79aa9"/><circle cx="168" cy="69" r="22" fill="#e79aa9"/>';
 case 'unicorn':return '<path d="M99 58 L108 2 Q110 -2 115 4 L126 55Z" fill="#ffe18a" stroke="#d99e59" stroke-width="3"/><path d="M103 29 L121 38 M106 18 L119 25" stroke="#fff6ca" stroke-width="3"/><path d="M47 77 L37 25 L91 54 M130 55 L182 25 L174 81" fill="'+p.tone+'" stroke="'+sh+'" stroke-width="3.5"/><path d="M49 67 L48 39 L79 55Z M171 67 L173 39 L141 55Z" fill="#f4a5ca"/><path d="M61 75 Q45 40 79 35 Q89 15 105 34 Q132 18 151 43 Q175 43 163 68 Q143 54 127 73 Q103 56 87 82Z" fill="#f2a7d3" stroke="#da8fb8" stroke-width="2.5"/><path d="M64 62 Q82 32 99 49 M112 45 Q133 35 146 55" stroke="#b6b8ee" fill="none" stroke-width="8" stroke-linecap="round"/>';
 default:return '';
 }}
function petTail(p){
 switch(p.style){
 case 'puppy':return '<path d="M150 179 Q199 131 202 164 Q204 187 182 187" fill="none" stroke="'+p.shade+'" stroke-width="18" stroke-linecap="round"/>';
 case 'kitten':return '<path d="M148 185 Q203 174 188 131" fill="none" stroke="'+p.tone+'" stroke-width="19" stroke-linecap="round"/><path d="M186 130 Q180 117 174 137" fill="none" stroke="'+p.shade+'" stroke-width="5"/>';
 case 'fox':return '<path d="M144 178 Q190 140 201 119 Q211 176 180 199 L158 208Z" fill="'+p.tone+'" stroke="'+p.shade+'" stroke-width="3"/><path d="M201 121 Q195 140 183 151 Q197 157 199 164 Q211 145 201 121" fill="#fff6ea"/>';
 case 'bunny':return '<circle cx="166" cy="201" r="19" fill="#fff8fb" stroke="'+p.shade+'" stroke-width="3"/>';
 case 'dino':return '<path d="M151 191 Q198 193 200 217 Q185 235 159 212Z" fill="'+p.tone+'" stroke="'+p.shade+'" stroke-width="3"/><path d="M188 207 L201 195 L202 219Z" fill="#4eb99a"/>';
 case 'unicorn':return '<path d="M159 188 Q194 168 182 197 Q207 211 182 229" stroke="#e2b3f5" stroke-width="20" stroke-linecap="round" fill="none"/><path d="M163 183 Q192 173 182 198" stroke="#96d9d6" stroke-width="7" fill="none"/>';
 case 'hamster':return '<path d="M152 191 Q180 205 162 220" stroke="'+p.shade+'" stroke-width="11" stroke-linecap="round" fill="none"/>';
 default:return '';
 }}
function petMarkings(p){
 switch(p.style){
 case 'puppy':return '<path d="M143 57 Q170 70 159 109 Q148 123 135 108 Q126 85 143 57Z" fill="'+p.shade+'" opacity=".42"/><path d="M55 91 Q64 77 78 76" stroke="#fff1df" fill="none" stroke-width="7" stroke-linecap="round"/>';
 case 'kitten':return '<path d="M105 38 L111 51 L117 38 M92 40 L95 47 M126 40 L123 47" stroke="#bf8198" fill="none" stroke-width="3.5" stroke-linecap="round"/>';
 case 'fox':return '<path d="M42 134 Q66 142 79 161 L111 149 L143 161 Q157 142 179 131 Q172 173 142 178 L79 178 Q49 167 42 134" fill="#fff3e5" opacity=".94"/>';
 case 'panda':return '<ellipse cx="77" cy="110" rx="25" ry="31" fill="#555365" transform="rotate(-18 77 110)"/><ellipse cx="144" cy="110" rx="25" ry="31" fill="#555365" transform="rotate(18 144 110)"/>';
 case 'dino':return '<circle cx="47" cy="141" r="8" fill="#78c8a8" opacity=".55"/><circle cx="165" cy="143" r="10" fill="#73c7a6" opacity=".5"/><circle cx="64" cy="164" r="6" fill="#64bca0" opacity=".5"/>';
 case 'penguin':return '<path d="M54 77 Q74 58 104 76 Q131 55 164 81 L172 149 Q160 179 111 189 Q57 178 46 145Z" fill="#fffbf2" stroke="#eae5df" stroke-width="2"/>';
 case 'hamster':return '<ellipse cx="65" cy="153" rx="30" ry="25" fill="#fff0d6"/><ellipse cx="156" cy="153" rx="30" ry="25" fill="#fff0d6"/><path d="M88 48 Q111 37 133 48" stroke="#fff0d3" fill="none" stroke-width="7" stroke-linecap="round"/>';
 case 'unicorn':return '<circle cx="53" cy="92" r="6" fill="#ffdeed"/><path d="M153 76 L156 86 L165 88 L156 91 L152 100 L148 90 L140 87 L150 84Z" fill="#fff2ad"/>';
 case 'chick':return '<path d="M93 43 Q106 35 121 43" stroke="#fff7b5" fill="none" stroke-width="8" stroke-linecap="round"/>';
 default:return '';
 }}
function petMouth(p,mood){
 const center=110;
 if(mood==='hungry'||mood==='sad'||mood==='messy')return '<path d="M98 159 Q110 147 122 159" fill="none" stroke="#845466" stroke-width="3.3" stroke-linecap="round"/>';
 if(mood==='sleepy'||mood==='sleep')return '<ellipse cx="110" cy="154" rx="6" ry="9" fill="#ae7286"/><ellipse cx="110" cy="151" rx="3.6" ry="3" fill="#edacb8"/>';
 if(mood==='eating')return '<ellipse cx="110" cy="154" rx="12" ry="9" fill="#794e61"/><path d="M102 155 Q110 164 117 155" fill="#f29aaa"/>';
 if(mood==='happy'||mood==='excited'||mood==='bath')return '<path d="M94 151 Q110 177 127 151 Q112 160 94 151" fill="#954f66"/><path d="M100 161 Q110 165 120 161" stroke="#ed90a1" stroke-width="4" fill="none" stroke-linecap="round"/>';
 if(p.style==='chick'||p.style==='penguin')return '<path d="M100 149 Q110 143 120 149 L110 163Z" fill="#f4a05a" stroke="#dc8d49" stroke-width="2"/><path d="M101 149 Q110 151 119 149" fill="none" stroke="#ffe1a3" stroke-width="2"/>';
 if(p.style==='puppy')return '<ellipse cx="110" cy="148" rx="10" ry="7" fill="#604757"/><path d="M110 154 Q103 161 98 154 M110 154 Q117 161 123 154" stroke="#85596a" fill="none" stroke-width="2.5" stroke-linecap="round"/>';
 if(p.style==='kitten'||p.style==='bunny'||p.style==='hamster')return '<path d="M104 148 Q110 153 116 148 L110 144Z" fill="#ce879d"/><path d="M110 152 Q102 161 96 155 M110 152 Q118 161 124 155" stroke="#855e71" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
 if(p.style==='panda'||p.style==='fox')return '<ellipse cx="110" cy="149" rx="10" ry="7" fill="#584b5a"/><path d="M100 160 Q110 168 122 159" fill="none" stroke="#846678" stroke-width="2.6" stroke-linecap="round"/>';
 return '<path d="M98 153 Q110 163 123 153" fill="none" stroke="#826473" stroke-width="3.3" stroke-linecap="round"/>';
}
function petEyes(p,mood,uid){
 const dark='#3d314e',white='#fff';
 if(['happy','excited','bath','eating'].includes(mood))return '<g class="eye-custom" fill="none" stroke="'+dark+'" stroke-width="5.5" stroke-linecap="round"><path d="M65 113 Q80 91 96 113 M125 113 Q140 91 156 113"/></g><g fill="#fff"><circle cx="61" cy="99" r="3"/><circle cx="161" cy="99" r="3"/></g>';
 if(mood==='sleepy'||mood==='sleep')return '<g class="eye-custom" fill="none" stroke="'+dark+'" stroke-width="5.5" stroke-linecap="round"><path d="M65 115 Q80 125 96 115 M125 115 Q140 125 156 115"/></g>';
 const watery=(mood==='hungry'||mood==='sad'),eyes='<g><ellipse cx="80" cy="114" rx="18" ry="24" fill="#fff9fb" opacity=".97"/><ellipse cx="140" cy="114" rx="18" ry="24" fill="#fff9fb" opacity=".97"/>'+
 '<ellipse cx="80" cy="'+(watery?119:114)+'" rx="14.1" ry="20.3" fill="url(#'+uid+'eye)"/><ellipse cx="140" cy="'+(watery?119:114)+'" rx="14.1" ry="20.3" fill="url(#'+uid+'eye)"/>'+
 '<ellipse cx="74" cy="105" rx="6.3" ry="8.1" fill="'+white+'"/><ellipse cx="134" cy="105" rx="6.3" ry="8.1" fill="'+white+'"/>'+
 '<circle cx="86" cy="123" r="4.2" fill="'+white+'" opacity=".9"/><circle cx="146" cy="123" r="4.2" fill="'+white+'" opacity=".9"/>'+
 '<circle cx="87" cy="105" r="2.3" fill="#d4c1ff" opacity=".8"/><circle cx="147" cy="105" r="2.3" fill="#d4c1ff" opacity=".8"/></g>';
 return '<g class="eye-open">'+eyes+'</g><g class="eye-close" fill="none" stroke="'+dark+'" stroke-width="4.8" stroke-linecap="round"><path d="M66 114 Q80 125 95 114 M125 114 Q140 125 155 114"/></g>'+
 (watery?'<path d="M64 88 L91 95 M128 95 L155 88" stroke="#916777" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M91 128 Q97 144 88 147" fill="#a8d7ff" opacity=".85"/><path d="M152 128 Q159 144 150 147" fill="#a8d7ff" opacity=".85"/>':'');
}
function petSvg(p,scope,adult=false,mood='normal'){
 if(p.style==='redpanda')return '<img class="pet-3d-img" src="/assets/pet-red-panda.avif?v=mascot1" alt="'+p.name+' · 고품질 레서판다 캐릭터" draggable="false" decoding="async">';
 const uid='plush-'+scope+'-'+p.id;
 const dark=['panda','penguin'].includes(p.style);
 const color=dark?'#f9f8f7':p.tone;
 const shade=p.shade,inner=p.inner;
 const eyesClosed=['sleep','sleepy'].includes(mood);
 const eyesHappy=['happy','excited','bath','eating'].includes(mood);
 const sad=['hungry','sad','messy'].includes(mood);
 const face=eyesClosed?'<g fill="none" stroke="#503a43" stroke-width="5.2" stroke-linecap="round"><path d="M57 119Q76 132 94 117 M126 117Q144 132 163 119"/></g>':eyesHappy?'<g fill="none" stroke="#503b48" stroke-width="5.3" stroke-linecap="round"><path d="M57 119Q76 92 94 118 M126 118Q145 92 163 119"/></g>':
 '<g class="eye-open"><ellipse cx="76" cy="116" rx="24" ry="29" fill="#fffefa"/><ellipse cx="144" cy="116" rx="24" ry="29" fill="#fffefa"/>'+
 '<ellipse cx="77" cy="'+(sad?121:116)+'" rx="20.5" ry="25.5" fill="url(#'+uid+'iris)"/><ellipse cx="143" cy="'+(sad?121:116)+'" rx="20.5" ry="25.5" fill="url(#'+uid+'iris)"/>'+
 '<ellipse cx="68" cy="105" rx="7.2" ry="9.1" fill="#fff"/><ellipse cx="136" cy="105" rx="7.2" ry="9.1" fill="#fff"/><circle cx="85" cy="127" r="4.5" fill="#fff"/><circle cx="151" cy="127" r="4.5" fill="#fff"/><circle cx="88" cy="101" r="2.3" fill="#fffbe8"/><circle cx="155" cy="101" r="2.3" fill="#fffbe8"/></g>'+
 '<g class="eye-close" fill="none" stroke="#503a43" stroke-width="5"><path d="M56 118Q76 130 96 118 M124 118Q144 130 164 118"/></g>';
 const mouth=eyesClosed?'<ellipse cx="110" cy="162" rx="6.5" ry="8" fill="#985b62"/>':sad?'<path d="M98 163Q110 151 122 163" fill="none" stroke="#9a6565" stroke-width="3.5" stroke-linecap="round"/>':(p.style==='chick'||p.style==='penguin')?
 '<path d="M99 155Q110 150 121 155L110 171Z" fill="url(#'+uid+'beak)"/><path d="M102 156Q110 159 118 156" fill="none" stroke="#ffe8a0" stroke-width="2"/>':
 '<ellipse cx="110" cy="158" rx="9" ry="6" fill="#714b45"/><path d="M101 166Q110 181 120 166" fill="#823d45"/><path d="M105 174Q110 170 116 174" fill="none" stroke="#fa8995" stroke-width="5" stroke-linecap="round"/>';
 const tail=petTail(p);
 const hood=(dark?'#9edcca':'#a2e8cc');
 return '<svg class="deluxe-pet-svg premium-pet-svg" viewBox="0 0 220 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+p.type+' '+MOOD_LABELS[mood]+'">'+
 '<defs>'+
 '<radialGradient id="'+uid+'fur" cx=".35" cy=".14" r=".91"><stop stop-color="'+inner+'"/><stop offset=".38" stop-color="'+color+'"/><stop offset=".78" stop-color="'+p.tone+'"/><stop offset="1" stop-color="'+shade+'"/></radialGradient>'+
 '<radialGradient id="'+uid+'iris" cx=".38" cy=".32" r=".83"><stop stop-color="#a97752"/><stop offset=".36" stop-color="#633e35"/><stop offset=".83" stop-color="#2c2236"/><stop offset="1" stop-color="#1d1829"/></radialGradient>'+
 '<radialGradient id="'+uid+'blush"><stop stop-color="#f28c9c" stop-opacity=".72"/><stop offset="1" stop-color="#f58ea5" stop-opacity="0"/></radialGradient>'+
 '<radialGradient id="'+uid+'hood" cx=".32" cy=".1" r=".99"><stop stop-color="#c4f9df"/><stop offset=".55" stop-color="'+hood+'"/><stop offset="1" stop-color="#62b59b"/></radialGradient>'+
 '<radialGradient id="'+uid+'bib" cx=".32" cy=".1" r="1"><stop stop-color="#ffe099"/><stop offset=".37" stop-color="#ffbc55"/><stop offset=".75" stop-color="#f79836"/><stop offset="1" stop-color="#c8772f"/></radialGradient>'+
 '<radialGradient id="'+uid+'muzzle" cx=".38" cy=".18" r=".86"><stop stop-color="#fffefa"/><stop offset=".7" stop-color="#fff1df"/><stop offset="1" stop-color="#e8cdb8"/></radialGradient>'+
 '<linearGradient id="'+uid+'beak" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#ffe69c"/><stop offset="1" stop-color="#f49b48"/></linearGradient>'+
 '<filter id="'+uid+'shadow" x="-25%" y="-25%" width="150%" height="160%"><feGaussianBlur stdDeviation="2.3"/></filter>'+
 '<filter id="'+uid+'furNoise" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".12" numOctaves="2" seed="8" result="noise"/><feColorMatrix in="noise" type="saturate" values="0" result="gray"/><feComponentTransfer in="gray"><feFuncA type="linear" slope=".08"/></feComponentTransfer></filter>'+
 '</defs>'+
 '<ellipse cx="110" cy="242" rx="53" ry="7.5" fill="#6d5a55" opacity=".14"/>'+tail+
 '<g><ellipse cx="80" cy="228" rx="22" ry="13" fill="'+shade+'" opacity=".92"/><ellipse cx="141" cy="228" rx="22" ry="13" fill="'+shade+'" opacity=".92"/>'+
 '<ellipse cx="110" cy="190" rx="54" ry="50" fill="url(#'+uid+'hood)"/><ellipse cx="110" cy="164" rx="45" ry="25" fill="#77c8a7"/>'+
 '<path d="M62 179Q36 167 37 197Q40 216 62 218Q76 212 77 201" fill="url(#'+uid+'hood)" stroke="#78bfa7" stroke-width="1.2"/>'+
 '<path d="M158 179Q184 167 183 197Q180 216 158 218Q144 212 143 201" fill="url(#'+uid+'hood)" stroke="#78bfa7" stroke-width="1.2"/>'+
 '<ellipse cx="52" cy="207" rx="13.6" ry="14.6" fill="'+shade+'"/><ellipse cx="168" cy="207" rx="13.6" ry="14.6" fill="'+shade+'"/>'+
 '<ellipse cx="52" cy="205" rx="6.5" ry="6" fill="#f7adab"/><ellipse cx="168" cy="205" rx="6.5" ry="6" fill="#f7adab"/>'+
 '<path d="M74 183L146 183L149 224Q110 241 71 224Z" fill="url(#'+uid+'bib)" stroke="#f0a34d" stroke-width="2"/>'+
 '<path d="M78 170L86 208 M142 170L134 208" stroke="#ffbd63" stroke-width="18" stroke-linecap="round"/>'+
 '<path d="M78 170L86 208 M142 170L134 208" stroke="#ffe09a" stroke-opacity=".38" stroke-width="4" stroke-linecap="round"/>'+
 '<circle cx="86" cy="201" r="8" fill="#ffe28e" stroke="#edaa41" stroke-width="2"/><circle cx="134" cy="201" r="8" fill="#ffe28e" stroke="#edaa41" stroke-width="2"/>'+
 '<path d="M110 201L116 213L130 215L120 225L123 238L110 231L97 238L100 225L90 215L104 213Z" fill="#ffe47d" stroke="#edb750" stroke-width="2" transform="translate(0 -5) scale(1 .94)"/>'+
 '</g>'+
 '<g filter="url(#'+uid+'shadow)" opacity=".32"><ellipse cx="110" cy="114" rx="87" ry="83" fill="'+shade+'"/></g>'+
 petEars(p,'url(#'+uid+'fur)')+
 '<ellipse cx="110" cy="112" rx="87" ry="83" fill="url(#'+uid+'fur)"/>'+
 '<ellipse cx="110" cy="112" rx="86" ry="82" fill="#fff" filter="url(#'+uid+'furNoise)" opacity=".8" pointer-events="none"/>'+
 '<path d="M42 92Q49 49 99 43" fill="none" stroke="#fff" stroke-opacity=".47" stroke-width="8" stroke-linecap="round"/>'+
 petMarkings(p)+
 '<ellipse cx="68" cy="146" rx="30" ry="21" fill="url(#'+uid+'blush)"/><ellipse cx="153" cy="146" rx="30" ry="21" fill="url(#'+uid+'blush)"/>'+
 '<ellipse cx="110" cy="151" rx="31" ry="22" fill="url(#'+uid+'muzzle)" opacity=".90"/>'+
 face+
 '<ellipse cx="56" cy="146" rx="5" ry="2.2" fill="#fff" opacity=".65"/><ellipse cx="166" cy="146" rx="5" ry="2.2" fill="#fff" opacity=".65"/>'+
 mouth+
 (p.style==='kitten'?'<path d="M68 155L46 149M68 162L48 166M152 155L174 149M152 162L172 166" fill="none" stroke="#ac8590" stroke-width="2.3" stroke-linecap="round"/>':'')+
 (adult?'<circle cx="185" cy="64" r="5" fill="#fff2b7"/><path d="M185 55V49M185 73V79M176 64H170M194 64H200" stroke="#ffe9a9" stroke-width="3" stroke-linecap="round"/>':'')+
 (mood==='bath'?'<circle cx="37" cy="84" r="8" stroke="#d8f5ff" stroke-width="2" fill="#fff" fill-opacity=".73"/><circle cx="186" cy="135" r="13" stroke="#d8f5ff" stroke-width="2" fill="#fff" fill-opacity=".65"/>':'')+
 '</svg>';
}
function gainXp(p,n){p.xp+=n;let levels=0;while(p.xp>=100&&p.level<99){p.xp-=100;p.level++;cache.walletCoins+=15;levels++;}if(levels){note('✨ '+PETS.find(x=>x.id===id).name+' 레벨 '+p.level+'! 성장했어요! 🏆');sparkles('✨',9);playTone(930);showLevelUp(p.level)}}
function formatPercent(x){return Math.round(clamp(x))+'%'}
function showPetMood(mood){
 const p=getPet(),data=PETS.find(x=>x.id===id),actor=$('petCreature');
 if(!p||!data||!actor)return;
 const next=mood||petMood(p),level=String(p.level),decor=p.decor||'';
 if(actor.dataset.mood!==next||actor.dataset.species!==id||actor.dataset.level!==level||actor.dataset.decor!==decor){
  actor.innerHTML=petSvg(data,'main',p.level>=3,next)+
   (p.decor?'<span class="accessory" style="position:absolute;z-index:8;top:0;left:50%;transform:translateX(-50%)">'+(SHOP.find(x=>x.id===p.decor)?.icon||'')+'</span>':'');
  actor.dataset.mood=next;actor.dataset.species=id;actor.dataset.level=level;actor.dataset.decor=decor;
 }
 const badge=$('petMoodBadge');
 if(badge){badge.textContent='✦ '+(MOOD_LABELS[next]||MOOD_LABELS.normal);badge.dataset.mood=next;}
}
function render(){
 const p=getPet(),data=PETS.find(x=>x.id===id);
 const roomTheme=['panda','penguin'].includes(id)?'blue':id==='dino'?'mint':['bunny','unicorn','kitten'].includes(id)?'lavender':'peach';
 $('petRoom').dataset.theme=roomTheme;
 $('petName').textContent=data.name;$('petStage').textContent=(p.level>=3?'GROWN-UP':'BABY')+' · LV. '+p.level;$('petLevel').textContent='LV.'+p.level;$('xpFill').style.width=p.xp+'%';$('xpText').textContent=p.xp+' / 100 XP';$('petCoins').textContent=cache.walletCoins.toLocaleString('ko-KR');
 for(const [key,field] of [['food','Food'],['happy','Happy'],['clean','Clean'],['energy','Energy']]){$('stat'+field).textContent=formatPercent(p[key]);$('bar'+field).style.width=clamp(p[key])+'%'}
 $('petPicker').querySelectorAll('.pick').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===id)));
 const actor=$('petCreature');showPetMood(petMood(p));
 actor.classList.toggle('adult',p.level>=3);
 $('petFoodVisual').textContent=data.food;renderPoops();renderShop();renderRoomDecor();attendanceView();requestView();
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
 const c=$('petCreature');c.className='creature';c.style.left='50%';switchRoom('living',{force:true,silent:true});
 render();note('💖 '+PETS.find(p=>p.id===id).name+'와 함께 놀자!');requestView();save();
}
function renderPoops(){
 const host=$('petPoops');host.replaceChildren();
 for(let i=0;i<getPet().poops;i++){const b=document.createElement('button');b.className='poop';b.type='button';b.textContent='💩';b.style.left=(14+i*18)+'%';b.style.bottom=(14+i%2*10)+'px';b.setAttribute('aria-label','똥 치우기');b.addEventListener('click',()=>care('clean'));host.append(b)}
}
function renderShop(){
 const host=$('petShop');host.replaceChildren();const p=getPet();let collected=0;
 for(const item of SHOP){
  const own=item.room?cache.roomOwned.includes(item.id):p.owned.includes(item.id);
  const selected=item.room?cache.roomDecor===item.id:p.decor===item.id;
  const locked=item.special&&!own||item.levelRequired&&p.level<item.levelRequired;
  if(own)collected++;
  const b=document.createElement('button');b.type='button';b.className='shop-item'+(own?' owned':'')+(locked?' locked':'');
  b.innerHTML='<span>'+item.icon+'</span><strong>'+item.name+'</strong><small>'+(selected?'✓ 사용 중':locked?(item.special?'🎁 7일 출석':'🔒 Lv.'+item.levelRequired):own?'꾸미기':'🪙 '+item.price)+'</small>';
  b.disabled=Boolean(locked);b.addEventListener('click',()=>buy(item.id));host.append(b);
 }
 const progress=$('collectionProgress');if(progress)progress.textContent='🎀 '+p.name+'의 수집 '+collected+' / '+SHOP.length+' · 원하는 아이템을 선택해요';
}
function buy(itemId){
 if(mini.active||busy)return;
 const item=SHOP.find(x=>x.id===itemId),p=getPet();if(!item)return;
 const owned=item.room?cache.roomOwned:p.owned;
 if(item.special&&!owned.includes(itemId))return;
 if(item.levelRequired&&p.level<item.levelRequired){note('🔒 레벨 '+item.levelRequired+'부터 살 수 있어요!');return;}
 if(item.room&&cache.roomDecor===itemId){cache.roomDecor=null;note('방 장식을 잠시 치웠어요');}
 else if(!item.room&&p.decor===itemId){p.decor=null;note('장식을 잠시 벗었어요');}
 else if(owned.includes(itemId)){if(item.room)cache.roomDecor=itemId;else p.decor=itemId;note('✨ '+item.name+'로 예쁘게 꾸몄어요!');}
 else if(cache.walletCoins>=item.price){cache.walletCoins-=item.price;owned.push(itemId);if(item.room)cache.roomDecor=itemId;else p.decor=itemId;note('🎁 '+item.name+' 선물을 받았어요!');playTone(890);}
 else{note('🪙 코인이 모자라요! 미니게임으로 모아요.');return;}
 save();render();
}
function sparkles(emoji='💕',count=6){
 const host=$('petFx');for(let i=0;i<count;i++){const s=document.createElement('span');s.className='spark';s.textContent=emoji;s.style.left=rand(25,75)+'%';s.style.top=rand(40,76)+'%';s.style.animationDelay=rand(0,300)+'ms';host.append(s);setTimeout(()=>s.remove(),1700)}
}
function switchRoom(place,{force=false,silent=false}={}){
 if(!['living','bedroom','bathroom'].includes(place))return;
 if(busy&&!force)return;
 activeRoom=place;
 const room=$('petRoom');room.dataset.place=place;
 room.classList.remove('bedtime','flushing');
 document.querySelectorAll('[data-go-room]').forEach(btn=>{
  const selected=btn.dataset.goRoom===place;
  btn.setAttribute('aria-pressed',String(selected));
 });
 const actor=$('petCreature');
 if(!busy&&actor){
  actor.classList.remove('walk','eat','bath','sleep','jump','toileting','lying','bathing');
  actor.style.left='50%';
 }
 if(!silent)note(place==='living'?'🏡 함께 놀자!':place==='bedroom'?'🛏️ 포근한 침실이에요!':'🚽 뽀득뽀득 화장실이에요!');
}
function moveActor(x,state,duration=1300){
 const el=$('petCreature');el.classList.remove('walk','eat','bath','sleep','jump','toileting','lying','bathing');el.classList.add('walk');el.style.left=x+'%';
 setTimeout(()=>{if(el.classList.contains('walk'))el.classList.remove('walk')},duration);
}
function finishAction(ms=1500){clearTimeout(actionTimer);actionTimer=setTimeout(()=>{busy=false;const el=$('petCreature');el.classList.remove('walk','eat','bath','sleep','jump','toileting','lying','bathing');el.style.left='50%';$('petRoom').classList.remove('bedtime','flushing');render();save()},ms)}
function floatFood(food){
 const room=$('petRoom'),v=document.createElement('span');v.className='food-float';v.textContent=food;
 room.append(v);setTimeout(()=>v.remove(),1450);
}
function delayedPoop(petId){
 clearTimeout(poopTimer);poopTimer=setTimeout(()=>{const p=cache.pets[petId];if(!p)return;p.poops=Math.min(3,p.poops+1);p.clean=clamp(p.clean-6);save();if(id===petId){renderPoops();note('💩 앗! 청소해 주세요!')}},19000);
}
function care(action){
 if(mini.active||busy)return;const p=getPet(),el=$('petCreature'),owner=id;busy=true;
 if(action==='feed'){
  if(p.food>=98){note('배가 아주 든든해요! 조금 후에 먹어요 ♡');busy=false;return;}
  switchRoom('living',{force:true,silent:true});note('🍓 맛있는 밥이에요! 친구가 밥그릇으로 걸어가요.');$('petBowl').classList.add('shake');moveActor(73,'walk',650);
  floatFood(PETS.find(x=>x.id===id).food);
  actionTimer=setTimeout(()=>{if(id!==owner)return;el.classList.remove('walk');showPetMood('eating');el.classList.add('eat');playTone(550);$('petBowl').classList.remove('shake');$('petFoodVisual').style.opacity='.18';
   p.food=clamp(p.food+23);p.happy=clamp(p.happy+6);p.energy=clamp(p.energy-2);p.feedCount++;gainXp(p,12);
   note('냠냠! 맛있게 먹었어요! 😋');sparkles('💖',5);completeRequest('feed');save();finishAction(1450);delayedPoop(owner);setTimeout(()=>$('petFoodVisual').style.opacity='1',1450);
  },900);
 }else if(action==='clean'){
  switchRoom('bathroom',{force:true,silent:true});
  note('🚽 화장실로 걸어가요. 변기에서 볼일을 봐요!');
  moveActor(76,'walk',850);
  actionTimer=setTimeout(()=>{
   if(id!==owner)return;
   el.classList.remove('walk');el.classList.add('toileting');
   const count=p.poops;
   p.poops=0;p.clean=clamp(p.clean+(count?27:12));gainXp(p,count?10:4);
   $('petRoom').classList.add('flushing');
   renderPoops();renderMetersOnly();
   note(count?'🚽 쉬~ 시원해요! 물도 내리고 깨끗하게!':'🚽 화장실 다녀왔어요. 손도 씻어요!');
   sparkles('🫧',7);completeRequest('clean');playTone(770);save();finishAction(1800);
  },1000);
 }else if(action==='bath'){
  switchRoom('bathroom',{force:true,silent:true});
  note('🛁 욕조에 들어가 목욕 준비!');
  moveActor(24,'walk',750);
  actionTimer=setTimeout(()=>{
   if(id!==owner)return;
   el.classList.remove('walk');el.classList.add('bathing');
   p.clean=clamp(p.clean+34);p.happy=clamp(p.happy+6);gainXp(p,13);
   note('🫧 보글보글! 거품 목욕으로 반짝반짝!');
   renderMetersOnly();sparkles('🫧',10);completeRequest('bath');playTone(730);save();finishAction(2400);
  },900);
 }else if(action==='sleep'){
  if(p.energy>=97){note('아직 쌩쌩해요! 조금 더 놀아요.');busy=false;return;}
  switchRoom('bedroom',{force:true,silent:true});
  note('🛏️ 침실로 걸어가서 이불을 덮어요!');
  moveActor(65,'walk',850);
  actionTimer=setTimeout(()=>{
   if(id!==owner)return;
   el.classList.remove('walk');showPetMood('sleep');
   el.classList.add('sleep','lying');el.style.left='65%';
   $('petRoom').classList.add('bedtime');
   p.energy=clamp(p.energy+32);p.happy=clamp(p.happy+3);gainXp(p,12);
   note('🌙 포근한 침대에서 쿨쿨... 좋은 꿈 꾸세요! Zzz');
   sparkles('💤',5);completeRequest('sleep');renderMetersOnly();playTone(490);save();finishAction(6500);
  },1100);
 }else if(action==='pet'){
  switchRoom('living',{force:true,silent:true});p.happy=clamp(p.happy+14);gainXp(p,6);showPetMood('happy');el.classList.add('jump');note('💗 쓰담쓰담! 너무 좋아요!');sparkles('💕',8);completeRequest('pet');playTone(850);finishAction(820);
 }else if(action==='play'){
  if(p.energy<12){note('🥱 졸려요. 먼저 잠을 자게 해줘요!');busy=false;return;}
  switchRoom('living',{force:true,silent:true});p.happy=clamp(p.happy+20);p.energy=clamp(p.energy-8);p.food=clamp(p.food-3);gainXp(p,12);
  showPetMood('excited');el.classList.add('jump');note('🧸 폴짝폴짝! 신나게 놀았어요!');sparkles('⭐',8);completeRequest('play');playTone(900);finishAction(1000);
 }else busy=false;
 renderMetersOnly();save();
}
function renderMetersOnly(){
 const p=getPet();
 for(const [key,field] of [['food','Food'],['happy','Happy'],['clean','Clean'],['energy','Energy']]){$('stat'+field).textContent=formatPercent(p[key]);$('bar'+field).style.width=clamp(p[key])+'%'}
 $('petCoins').textContent=cache.walletCoins.toLocaleString('ko-KR');$('petLevel').textContent='LV.'+p.level;$('petStage').textContent=(p.level>=3?'GROWN-UP':'BABY')+' · LV. '+p.level;
 $('xpFill').style.width=p.xp+'%';$('xpText').textContent=p.xp+' / 100 XP';
}
function passiveNeeds(){
 if(mini.active||busy)return;const p=getPet();let m=['오늘도 함께 놀자! ♡','오늘은 정말 신나는 날이야! ✨','우리 집이 참 포근해 ♡','같이 있으면 행복해! 💗'][rand(0,3)];
 if(p.poops>=1)m='💩 똥이 생겼어요! 청소해 줘요!';
 else if(p.food<30)m='🍓 배가 고파요! 밥 주세요!';
 else if(p.energy<25)m='🥱 피곤해요! 재워 주세요!';
 else if(p.clean<30)m='🫧 목욕하고 싶어요!';
 else if(p.happy<30)m='💗 같이 놀고 싶어요!';
 if(cache.request?.petId===id){const cfg=REQUESTS.find(x=>x.action===cache.request.action);if(cfg)m=cfg.icon+' '+cfg.text}
 $('petThought').textContent=m;showPetMood(petMood(p));
}
function updateNeeds(){
 if(mini.active)return;
 const p=getPet(),t=now(),m=Math.max(0,Math.min(2,(t-p.lastAt)/60000));p.lastAt=t;
 if(m>0){p.food=clamp(p.food-m*.6);p.happy=clamp(p.happy-m*.23);p.clean=clamp(p.clean-m*.28);p.energy=clamp(p.energy-m*.2);renderMetersOnly();save()}
 passiveNeeds();requestView();
}
function roam(){
 if(mini.active||busy||activeRoom!=='living')return;const el=$('petCreature');if(el.classList.contains('sleep'))return;
 moveActor(rand(33,69),'walk',900);
 const later=rand(2,4);setTimeout(()=>{if(!busy&&!mini.active)el.style.left='50%'},later*1000);
}
function notifyParent(type){try{if(window.parent!==window)window.parent.postMessage({petHouse:type},location.origin)}catch(_){}}
function stopMini(showResult=true){
 if(!mini.active)return;mini.active=false;clearInterval(miniTick);clearInterval(miniSpawn);miniTick=null;miniSpawn=null;notifyParent('endMini');
 if(showResult){
  const p=getPet(),coins=Math.min(70,5+mini.score*3);cache.walletCoins+=coins;p.happy=clamp(p.happy+12);p.energy=clamp(p.energy-5);gainXp(p,Math.min(35,10+mini.score*2));save();
  $('miniResult').hidden=false;$('miniResultIcon').textContent=mini.score>=8?'🏆':'💖';
  $('miniResultPet').innerHTML=petSvg(PETS.find(x=>x.id===id),'miniwinner',p.level>=3,'happy');
  $('miniResultTitle').textContent=mini.score>=8?'와! 우리 친구가 정말 신났어요!':'우리 친구랑 즐거웠어요!';
  $('miniResultBody').textContent=PETS.find(x=>x.id===id).name+'의 한마디: 같이 놀아서 너무 좋아! ♡  ⭐ '+mini.score+'점 · 🪙 '+coins+'코인 선물!';
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

function miniMascotSvg(type,variant){
 const palettes=[
  {body:'#ff8694',stroke:'#dd6075',leaf:'#8dca97'},
  {body:'#ffb76a',stroke:'#e78d4d',leaf:'#86c9a0'},
  {body:'#a99bdc',stroke:'#8678bf',leaf:'#88c99a'},
  {body:'#ffafc1',stroke:'#e885a1',leaf:'#8bcfad'}
 ];
 const c=palettes[variant%palettes.length],star=type==='star';
 const body=star?'<path d="M50 9 Q53 8 56 15 L65 34 L88 35 Q97 36 90 44 L73 60 L79 84 Q80 94 70 89 L50 77 L29 89 Q19 93 22 83 L27 60 L10 44 Q3 36 13 35 L35 34 L45 15 Q47 10 50 9Z" fill="#ffd978" stroke="#efa85e" stroke-width="3.4" stroke-linejoin="round"/>':
 variant%4===1?'<circle cx="50" cy="51" r="37" fill="'+c.body+'" stroke="'+c.stroke+'" stroke-width="3.5"/>':
 variant%4===2?'<path d="M50 21 Q75 16 83 42 Q93 68 70 86 Q50 92 31 85 Q9 71 16 44 Q22 22 50 21Z" fill="'+c.body+'" stroke="'+c.stroke+'" stroke-width="3.5"/>':
 '<path d="M50 23 Q70 12 80 35 Q96 52 76 80 Q60 94 50 86 Q40 93 25 80 Q7 53 20 35 Q30 15 50 23Z" fill="'+c.body+'" stroke="'+c.stroke+'" stroke-width="3.5"/>';
 const leaves=star?'':'<path d="M49 24 Q43 6 32 11 Q35 22 49 24 Q55 6 72 13 Q65 27 49 24" fill="'+c.leaf+'" stroke="#6bb184" stroke-width="2"/><path d="M49 23 Q53 16 55 7" stroke="#659b71" stroke-width="2.5" fill="none"/>';
 return '<svg viewBox="0 0 100 106" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+(star?'웃는 별':'웃는 과일')+'"><ellipse cx="50" cy="98" rx="29" ry="5" fill="#777" opacity=".14"/>'+body+leaves+
 '<path d="M26 40 Q33 28 43 28" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="5" stroke-linecap="round"/>'+
 '<ellipse cx="39" cy="52" rx="6.7" ry="8.6" fill="#43354b"/><ellipse cx="62" cy="52" rx="6.7" ry="8.6" fill="#43354b"/>'+
 '<ellipse cx="37" cy="49" rx="2.8" ry="3.5" fill="#fff"/><ellipse cx="60" cy="49" rx="2.8" ry="3.5" fill="#fff"/>'+
 '<ellipse cx="29" cy="64" rx="8" ry="4.7" fill="#f483a3" opacity=".7"/><ellipse cx="72" cy="64" rx="8" ry="4.7" fill="#f483a3" opacity=".7"/>'+
 '<path d="M44 65 Q50 74 57 65" fill="none" stroke="#894e70" stroke-width="3" stroke-linecap="round"/></svg>';
}
function spawnMini(){
 if(!mini.active)return;const field=$('miniField'),type=mini.type,b=document.createElement('button');b.className='mini-thing';b.type='button';
 b.innerHTML=miniMascotSvg(type,rand(0,3));b.setAttribute('aria-label',type==='fruit'?'귀여운 과일 잡기':'웃는 별 잡기');
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
document.querySelectorAll('[data-go-room]').forEach(b=>b.addEventListener('click',()=>switchRoom(b.dataset.goRoom)));

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
window.addEventListener('pageshow',()=>{if(!mini.active&&!busy){renderMetersOnly();save()}});
read();for(const p of Object.keys(cache.pets))cache.pets[p]=recover(cache.pets[p]);
renderPicker();render();switchRoom('living',{force:true,silent:true});note('💖 '+PETS.find(p=>p.id===id).name+'와 함께 놀자!');
setInterval(updateNeeds,12000);roamTimer=setInterval(roam,6500);
window.PetGameDebug={getState:()=>({id,room:activeRoom,walletCoins:cache.walletCoins,storageAvailable,pet:{...getPet(),owned:[...getPet().owned]},mini:{...mini},species:PETS.map(x=>x.id)}),feed:()=>care('feed'),care,select:selectPet,startMini:beginMini,stopMini};
save();
})();
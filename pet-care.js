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
 const uid='deluxe-'+scope+'-'+p.id,fur='url(#'+uid+'fur)',sh=p.shade;
 const dark=['panda','penguin'].includes(p.style);
 const bodyColor=dark?p.shade:p.tone;
 const arms=p.style==='penguin'?'<path d="M68 178 Q37 155 34 198 Q39 217 59 213 L82 197Z M151 177 Q181 155 187 198 Q183 216 161 211 L138 198Z" fill="#58739b" stroke="#3e5680" stroke-width="3"/>':
 '<ellipse cx="60" cy="193" rx="17" ry="29" fill="'+p.tone+'" stroke="'+sh+'" stroke-width="2.8" transform="rotate(-30 60 193)"/><ellipse cx="159" cy="193" rx="17" ry="29" fill="'+p.tone+'" stroke="'+sh+'" stroke-width="2.8" transform="rotate(30 159 193)"/>';
 return '<svg class="deluxe-pet-svg" viewBox="0 0 220 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+p.type+' '+MOOD_LABELS[mood]+'">'+
 '<defs><radialGradient id="'+uid+'fur" cx=".31" cy=".16" r=".93"><stop stop-color="'+p.inner+'"/><stop offset=".55" stop-color="'+p.tone+'"/><stop offset="1" stop-color="'+p.shade+'"/></radialGradient>'+
 '<linearGradient id="'+uid+'eye" x1=".1" y1=".05" x2=".9" y2="1"><stop stop-color="#695072"/><stop offset=".45" stop-color="#38314c"/><stop offset="1" stop-color="#211b3a"/></linearGradient>'+
 '<radialGradient id="'+uid+'blush"><stop stop-color="#f58fa8" stop-opacity=".69"/><stop offset="1" stop-color="#ffafc4" stop-opacity="0"/></radialGradient>'+
 '<linearGradient id="'+uid+'body" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+p.inner+'"/><stop offset="1" stop-color="'+p.tone+'"/></linearGradient></defs>'+
 '<ellipse cx="110" cy="242" rx="58" ry="9" fill="#75636f" opacity=".15"/>'+petTail(p)+
 '<ellipse cx="81" cy="226" rx="20" ry="12" fill="'+bodyColor+'" stroke="'+sh+'" stroke-width="2.5"/><ellipse cx="140" cy="226" rx="20" ry="12" fill="'+bodyColor+'" stroke="'+sh+'" stroke-width="2.5"/>'+
 '<ellipse cx="110" cy="185" rx="54" ry="51" fill="url(#'+uid+'body)" stroke="'+sh+'" stroke-width="3"/>'+
 '<ellipse cx="110" cy="189" rx="37" ry="35" fill="'+(dark?'#fffcf8':p.inner)+'" opacity=".85"/>'+arms+
 petEars(p,fur)+
 '<ellipse cx="110" cy="112" rx="85" ry="80" fill="'+fur+'" stroke="'+sh+'" stroke-width="3.5"/>'+
 '<path d="M53 76 Q76 48 103 47" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="6" stroke-linecap="round"/>'+
 petMarkings(p)+
 '<ellipse cx="57" cy="142" rx="25" ry="18" fill="url(#'+uid+'blush)"/><ellipse cx="163" cy="142" rx="25" ry="18" fill="url(#'+uid+'blush)"/>'+
 petEyes(p,mood,uid)+
 '<ellipse cx="51" cy="148" rx="5" ry="2" fill="#fff" opacity=".57"/><ellipse cx="169" cy="148" rx="5" ry="2" fill="#fff" opacity=".57"/>'+
 petMouth(p,mood)+
 (p.style==='kitten'?'<path d="M68 146 L43 137 M68 155 L44 160 M152 146 L178 137 M152 155 L177 160" stroke="#ac7d93" stroke-width="2.5" stroke-linecap="round" opacity=".82"/>':'')+
 (p.style==='unicorn'?'<path d="M48 107 L52 97 L58 106 L68 110 L58 115 L54 125 L50 115 L40 110Z" fill="#fff3b2" opacity=".95"/>':'')+
 (mood==='bath'?'<circle cx="29" cy="103" r="11" fill="#fff" fill-opacity=".7" stroke="#cce9ff"/><circle cx="190" cy="155" r="8" fill="#fff" fill-opacity=".75" stroke="#cce9ff"/>':'')+
 (adult?'<path d="M52 78 L59 67 L65 79 M152 74 L160 62 L164 77" stroke="#fff" stroke-width="3" fill="none" opacity=".62"/>':'')+'</svg>';
}
function gainXp(p,n){p.xp+=n;let levels=0;while(p.xp>=100&&p.level<99){p.xp-=100;p.level++;p.coins+=15;levels++;}if(levels){note('✨ '+PETS.find(x=>x.id===id).name+' 레벨 '+p.level+'! 성장했어요! 🏆');sparkles('✨',9);playTone(930)}}
function formatPercent(x){return Math.round(clamp(x))+'%'}
function render(){
 const p=getPet(),data=PETS.find(x=>x.id===id);
 const roomTheme=['panda','penguin'].includes(id)?'blue':id==='dino'?'mint':['bunny','unicorn','kitten'].includes(id)?'lavender':'peach';
 $('petRoom').dataset.theme=roomTheme;
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
  note('🍓 맛있는 밥이에요! 친구가 밥그릇으로 걸어가요.');$('petBowl').classList.add('shake');moveActor(73,'walk',650);
  floatFood(PETS.find(x=>x.id===id).food);
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
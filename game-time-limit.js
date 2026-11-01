(()=>{
'use strict';
// Applies to the WHOLE arcade, including every iframe game. Local browser protection, not server-side authentication.
const STORE='game-arcade-daily-play-v1',PIN='9854',DEFAULT_MIN=10,MINUTES=[5,10,15,20,30,45,60];
const $=id=>document.getElementById(id);
const day=()=>{
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const v=k=>parts.find(p=>p.type===k).value;
 return v('year')+'-'+v('month')+'-'+v('day');
};
const cleanLimit=v=>MINUTES.includes(Number(v))?Number(v):DEFAULT_MIN;
function fresh(){return{date:day(),limitMinutes:DEFAULT_MIN,usedMs:0,allowanceMs:DEFAULT_MIN*60000,updatedAt:Date.now()}}
function read(){
 let value=null;try{value=JSON.parse(localStorage.getItem(STORE)||'null')}catch(_){}
 if(!value||typeof value!=='object')value=fresh();
 const limitMinutes=cleanLimit(value.limitMinutes);
 if(value.date!==day())return{...fresh(),limitMinutes,allowanceMs:limitMinutes*60000};
 return{
  date:day(),limitMinutes,
  usedMs:Math.min(24*3600000,Math.max(0,Number(value.usedMs)||0)),
  allowanceMs:Math.min(24*3600000,Math.max(limitMinutes*60000,Number(value.allowanceMs)||0)),
  updatedAt:Number(value.updatedAt)||Date.now()
 };
}
let state=read(),locked=false,mode=null,last=performance.now(),lastPersist=0;
const format=ms=>{const total=Math.ceil(Math.max(0,ms)/1000);return String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0')};
function persist(){state.updatedAt=Date.now();try{localStorage.setItem(STORE,JSON.stringify(state));}catch(_){$('timeWarning').textContent='⚠️ 브라우저 저장이 차단되어 종료 후 기록이 남지 않을 수 있어요';}}
function advanceDay(){if(state.date===day())return;state={...fresh(),limitMinutes:state.limitMinutes,allowanceMs:state.limitMinutes*60000};persist();locked=false;mode=null;$('gameTimeGate').hidden=true;update();}
function remaining(){return Math.max(0,state.allowanceMs-state.usedMs)}
function update(){
 const left=remaining();
 $('timeRemaining').textContent=format(left);
 $('timeLimitDescription').textContent='하루 '+state.limitMinutes+'분 · 남은 시간 '+format(left);
 $('timeParentOpen').setAttribute('aria-label','보호자 플레이 시간 설정. 남은 시간 '+format(left));
}
function stopGames(){
 window.GamePlayLock?.unlock();
 const p=$('petHouseEmbed'),g=$('gardenMatchEmbed');
 for(const frame of [p,g]){try{frame?.contentWindow?.postMessage({petHouse:'stop'},location.origin)}catch(_){}}
}
function showGate(nextMode){
 mode=nextMode;
 const overlay=$('gameTimeGate');overlay.hidden=false;
 $('timeGateTitle').textContent=nextMode==='locked'?'오늘 게임 시간 끝! 🌙':'보호자 설정 🔒';
 $('timeGateDescription').textContent=nextMode==='locked'
  ?'약속한 '+state.limitMinutes+'분을 모두 사용했어요. 다음 날 자동으로 다시 플레이할 수 있어요.'
  :'하루 게임 이용 시간을 변경하려면 보호자 비밀번호를 입력하세요.';
 $('timeGateSubmit').textContent=nextMode==='locked'?'추가 '+state.limitMinutes+'분 허용':'설정 열기';
 $('timeGateDismiss').hidden=nextMode==='locked';
 $('timePin').value='';$('timeGateError').textContent='';
 $('timeSettings').hidden=true;$('timePinForm').hidden=false;
 $('timeLimitSelect').value=String(state.limitMinutes);
 if(nextMode==='locked')stopGames();
 requestAnimationFrame(()=>$('timePin').focus());
}
function lock(){
 if(locked)return;
 locked=true;showGate('locked');update();
}
function unlock(extra){
 if(extra){state.allowanceMs=Math.min(24*3600000,state.allowanceMs+state.limitMinutes*60000);persist()}
 locked=remaining()<=0;
 $('gameTimeGate').hidden=!locked;
 mode=locked?'locked':null;update();
 if(locked)showGate('locked');
}
function tick(){
 const current=performance.now(),elapsed=Math.max(0,current-last);last=current;
 advanceDay();
 if(!document.hidden&&!locked&&mode!=='settings'){
  // Cap large timer gaps caused by iOS suspension: background time does not consume a child's play allowance.
  state.usedMs=Math.min(state.allowanceMs,state.usedMs+Math.min(elapsed,1500));
  if(remaining()<=0){persist();lock();return;}
 }
 if(current-lastPersist>2500){lastPersist=current;persist()}
 update();
}
$('timeParentOpen').addEventListener('click',()=>showGate(locked?'locked':'settings'));
$('timeGateDismiss').addEventListener('click',()=>{
 if(locked)return;
 mode=null;$('gameTimeGate').hidden=true;$('timePin').value='';last=performance.now();
});
$('timePinForm').addEventListener('submit',e=>{
 e.preventDefault();
 const typed=$('timePin').value.trim();$('timePin').value='';
 if(typed!==PIN){$('timeGateError').textContent='비밀번호가 올바르지 않습니다.';return}
 $('timeGateError').textContent='';
 if(mode==='locked'){
  unlock(true);
  $('timeGateNotice').textContent='보호자가 '+state.limitMinutes+'분을 추가로 허용했어요.';
 }else{
  $('timePinForm').hidden=true;$('timeSettings').hidden=false;$('timeLimitSelect').focus();
 }
});
$('timeSettingsForm').addEventListener('submit',e=>{
 e.preventDefault();
 if(mode!=='settings'||$('timeSettings').hidden)return;
 const minutes=cleanLimit($('timeLimitSelect').value);
 state.limitMinutes=minutes;
 // Preserve already used minutes. Editing the limit must not erase elapsed play time.
 state.allowanceMs=minutes*60000;
 persist();mode=null;$('gameTimeGate').hidden=true;last=performance.now();
 if(remaining()<=0)lock();else update();
});
document.addEventListener('visibilitychange',()=>{last=performance.now();persist();advanceDay()});
window.addEventListener('pagehide',()=>{persist()});
window.addEventListener('storage',e=>{
 if(e.key!==STORE)return;
 const remote=read();if(remote.date===state.date){state.usedMs=Math.max(state.usedMs,remote.usedMs);state.allowanceMs=Math.max(state.allowanceMs,remote.allowanceMs);state.limitMinutes=remote.limitMinutes}
 else state=remote;
 if(remaining()<=0)lock();else if(locked)unlock(false);update();
});
advanceDay();update();
if(remaining()<=0)lock();
setInterval(tick,1000);
window.GameTimeDebug={getState:()=>({...state,locked,remainingMs:remaining()}),tick,resetDayForTest:()=>{state.date='2000-01-01';advanceDay()}};
})();
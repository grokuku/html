// Guarded bootstrap
try{loadSettings();}catch(e){console.warn('loadSettings',e);}
try{Audio.init();}catch(e){console.warn('Audio',e);}
try{Input.init();}catch(e){console.warn('Input',e);}
try{if(Game&&Game.settings&&Game.settings.sound!==undefined){Audio.enabled=!!Game.settings.sound;}}catch(e){}

// Touch controls
(function(){
  const pad=document.createElement('div');
  pad.id='touchpad';
  pad.style.cssText='position:fixed;bottom:10px;left:10px;right:10px;display:flex;justify-content:space-between;pointer-events:none;z-index:9999;';
  pad.innerHTML='<div style="display:flex;gap:8px;pointer-events:auto"><button id="tL">◀</button><button id="tU">▲</button><button id="tD">▼</button><button id="tR">▶</button></div><div style="pointer-events:auto"><button id="tB">Boost</button></div>';
  document.body.appendChild(pad);
  function set(k,v){Input.keys[k]=v;}
  document.getElementById('tU').ontouchstart=()=>set('ArrowUp',true); document.getElementById('tU').ontouchend=()=>set('ArrowUp',false);
  document.getElementById('tD').ontouchstart=()=>set('ArrowDown',true); document.getElementById('tD').ontouchend=()=>set('ArrowDown',false);
  document.getElementById('tL').ontouchstart=()=>set('ArrowLeft',true); document.getElementById('tL').ontouchend=()=>set('ArrowLeft',false);
  document.getElementById('tR').ontouchstart=()=>set('ArrowRight',true); document.getElementById('tR').ontouchend=()=>set('ArrowRight',false);
  document.getElementById('tB').ontouchstart=()=>set('Shift',true); document.getElementById('tB').ontouchend=()=>set('Shift',false);
})();

// Ensure UI panel bootstraps
try{if(window.UI&&UI.refresh)UI.refresh();}catch(e){}

function boot(){ try{ requestAnimationFrame(()=>{}); }catch(e){ console.warn(e);} }
boot();
console.log('Vroomiiies booted');
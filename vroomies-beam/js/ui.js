const UI={refresh(){this.renderMenu();}};
UI.renderMenu=function(){
  let panel=document.getElementById('ui-panel');
  if(!panel){panel=document.createElement('div');panel.id='ui-panel';panel.style.cssText='position:fixed;top:10px;left:10px;background:#fff8;padding:12px;border-radius:12px;font-family:sans-serif';document.body.appendChild(panel);}
  if(Game.state==='menu'){
    panel.innerHTML=`<h2>Vroomiiies</h2>
    Circuit: <select id="tr">${TRACKS.map((t,i)=>`<option value="${i}" ${i===Game.selectedTrack?'selected':''}>${t.name}</option>`).join('')}</select><br>
    Karts: <input type="number" id="kc" value="${Game.kartCount}" min="2" max="30"><br>
    Tours: <input type="number" id="lp" value="${Game.laps}" min="1" max="5"><br>
    Diff: <select id="df">${['Facile','Normal','Expert'].map(d=>`<option ${d===Game.difficulty?'selected':''}>${d}</option>`).join('')}</select><br>
    Perso: <input id="ch" value="${Game.char}"><br>
    <button id="play">Course libre</button>
    <button id="sound">Son: ${Game.settings.sound?'ON':'OFF'}</button>`;
    document.getElementById('tr').onchange=e=>{Game.selectedTrack=+e.target.value;};
    document.getElementById('kc').onchange=e=>{Game.kartCount=Math.max(2,Math.min(30,+e.target.value));};
    document.getElementById('lp').onchange=e=>{Game.laps=Math.max(1,Math.min(5,+e.target.value));};
    document.getElementById('df').onchange=e=>{Game.difficulty=e.target.value;};
    document.getElementById('ch').onchange=e=>{Game.char=e.target.value;};
    document.getElementById('play').onclick=()=>startRace({track:Game.selectedTrack,kartCount:Game.kartCount,laps:Game.laps,difficulty:Game.difficulty});
    document.getElementById('sound').onclick=()=>{Game.settings.sound=!Game.settings.sound;Audio.toggle();saveSettings();UI.refresh();};
  } else if(Game.state==='results' && race){
    const rows=race.results.map((k,i)=>`${i+1}. ${k.name||'Kart'} ${k.time.toFixed(1)}s`).join('<br>');
    panel.innerHTML=`<h2>Résultats</h2>${rows}<br><button id="back">Menu</button>`;
    document.getElementById('back').onclick=()=>{Game.state='menu';UI.refresh();};
  } else { panel.innerHTML=''; }
};

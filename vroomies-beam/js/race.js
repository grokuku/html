function startRace(opts={}){
  Audio.init();
  const ti = (opts.track!=null?opts.track:Game.selectedTrack);
  const tk=getTrack(ti);
  const kartCount=opts.kartCount||Game.kartCount;
  const laps=opts.laps||Game.laps;
  const diff=opts.difficulty||Game.difficulty;
  const karts=[];
  for(let i=0;i<kartCount;i++){
    const x=tk.pts[0][0]+(i%5)*18, y=tk.pts[0][1]+Math.floor(i/5)*18;
    karts.push(new Kart(x,y,SKINS[i%SKINS.length],i>0?true:false));
    karts[i].name=NAMES[i%NAMES.length];
  }
  // player kart index 0 uses selected char color
  karts[0].color='#ff5c8a'; karts[0].name=Game.char;
  race={track:tk,karts,time:0,laps,difficulty:diff,finished:false,results:[]};
  Game.race=race; Game.track=ti; Game.laps=laps; Game.difficulty=diff; setState('race');
}
function aiSpeed(diff){return diff==='Facile'?0.85:diff==='Expert'?1.15:1;}
function updateRace(dt){
  if(!race)return;
  if(Game.pause)return;
  race.time+=dt;
  const tr=race.track;
  const spd=aiSpeed(race.difficulty);
  for(const k of race.karts){
    let ctrl={up:false,down:false,left:false,right:false,boost:false};
    if(!k.isAI){
      ctrl.up=Input.keys['ArrowUp']||Input.keys['z']||Input.keys['w'];
      ctrl.down=Input.keys['ArrowDown']||Input.keys['s'];
      ctrl.left=Input.keys['ArrowLeft']||Input.keys['q']||Input.keys['a'];
      ctrl.right=Input.keys['ArrowRight']||Input.keys['d'];
      ctrl.boost=Input.keys['Shift'];
    } else {
      ctrl=AIDrive(k,tr,race.karts.indexOf(k));
      if(spd>1) ctrl.boost=true;
    }
    // scale AI acceleration via monkey: pass through physics; adjust max in Kart not easy, so tweak ctrl only
    k.update(dt,ctrl);
    const nx=tr.pts[(k.cp+1)%tr.pts.length];
    if(Math.hypot(k.x-nx[0],k.y-nx[1])<40){ k.cp=(k.cp+1)%tr.pts.length; if(k.cp===0){k.lap++; if(k.lap>=race.laps&&!k.finished){k.finished=true;k.time=race.time;race.results.push(k); Audio.sfx.finish();} } }
  }
  // condition fin: tout arrivé ou 120s
  const allFinished=race.karts.every(k=>k.finished);
  if(allFinished || race.time>120){
    if(!race.finished){race.finished=true; Game.state='results'; try{const best=Game.records[String(Game.track)]||1e9; if(race.time<best){Game.records[String(Game.track)]=race.time; localStorage.setItem('vroomiiies_records',JSON.stringify(Game.records));} }catch(e){}; if(window.UI&&UI.refresh)UI.refresh(); Audio.sfx.finish();}
  }
}

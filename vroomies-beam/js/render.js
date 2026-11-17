const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(Game.state==='menu'){drawMenu();return;}
  if(Game.state==='race'||Game.state==='results'){
    if(!race||!race.track){Game.state='menu';return;}
    const tr=race.track;
    // track bg
    ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle=tr.color; ctx.lineWidth=40; ctx.beginPath();
    ctx.moveTo(tr.pts[0][0],tr.pts[0][1]);
    for(let i=1;i<tr.pts.length;i++)ctx.lineTo(tr.pts[i][0],tr.pts[i][1]);
    ctx.closePath(); ctx.stroke();
    // karts
    for(const k of race.karts){
      ctx.save(); ctx.translate(k.x,k.y); ctx.rotate(k.a);
      ctx.fillStyle=k.color; ctx.beginPath(); ctx.arc(0,0,8,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#fff'; ctx.fillRect(6,-3,4,6);
      ctx.restore();
    }
    // HUD
    const p=race.karts[0];
    ctx.fillStyle='#333'; ctx.font='18px sans-serif';
    ctx.fillText(`Pos: ${race.karts.slice().sort((a,b)=>b.lap-a.lap||b.cp-a.cp).indexOf(p)+1}/${race.karts.length}`,20,30);
    ctx.fillText(`Tour: ${p.lap}/${race.laps}`,20,55);
    ctx.fillText(`Temps: ${race.time.toFixed(1)}s`,20,80);
    if(Game.pause){ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#fff';ctx.font='48px sans-serif';ctx.fillText('PAUSE',560,360);}
  }
  if(Game.state==='results'){
    ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#fff';ctx.font='32px sans-serif';ctx.fillText('Résultats',500,120);
    race.results.forEach((k,i)=>{ctx.fillText(`${i+1}. Kart ${i+1} ${k.time.toFixed(1)}s`,500,160+i*24);});
  }
}
function drawMenu(){
  ctx.fillStyle='#ffd6e7'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#ff5c8a'; ctx.font='64px sans-serif'; ctx.fillText('Vroomiiies',460,200);
  ctx.fillStyle='#333'; ctx.font='24px sans-serif'; ctx.fillText('Entrée = Course libre (30 karts)',430,320);
  ctx.fillText('Flèches = conduire, P = pause',430,360);
}
function resize(){const c=canvas; c.style.width='100vw'; c.style.height='100vh';} resize(); window.addEventListener('resize',resize);
let last=performance.now();
function loop(now){const dt=Math.min((now-last)/1000,.033);last=now;if(Game.state==='race'&&!Game.pause)updateRace(dt);draw();requestAnimationFrame(loop);}
requestAnimationFrame(loop);
function AIDrive(k,track,rank){
  const target=track.pts[(k.cp+1)%track.pts.length];
  const dx=target[0]-k.x,dy=target[1]-k.y;
  const desired=Math.atan2(dy,dx);
  let diff=desired-k.a; while(diff>Math.PI)diff-=2*Math.PI; while(diff<-Math.PI)diff+=2*Math.PI;
  const agg = Game.difficulty==='Expert'?0.25:Game.difficulty==='Facile'?0.02:0.10;
  const ctrl={up:true,down:false,left:diff<-0.05,right:diff>0.05,boost: rank> (track.pts.length/2) || Game.difficulty==='Expert'};
  // slight aggression steering
  if(Math.abs(diff)>0.6 && Game.difficulty!=='Expert') ctrl.up=false;
  if(Game.difficulty==='Facile' && Math.abs(diff)>0.3) ctrl.up=false;
  return ctrl;
}

function Kart(x,y,color,isAI){this.x=x;this.y=y;this.a=0;this.vx=0;this.vy=0;this.color=color;this.isAI=isAI;this.lap=0;this.cp=0;this.finished=false;this.time=0;}
Kart.prototype.update=function(dt,ctrl){
  if(this.finished)return;
  const acc=ctrl.up?0.6: (ctrl.down?-0.3:0);
  if(ctrl.left)this.a-=0.08*dt*60;
  if(ctrl.right)this.a+=0.08*dt*60;
  let speed=Math.hypot(this.vx,this.vy);
  const max=ctrl.boost?8:5;
  this.vx += Math.cos(this.a)*acc*dt*60; this.vy += Math.sin(this.a)*acc*dt*60;
  // friction
  this.vx*=0.98; this.vy*=0.98;
  const sp=Math.hypot(this.vx,this.vy);
  if(sp>max){this.vx=this.vx/sp*max;this.vy=this.vy/sp*max;}
  this.x+=this.vx*dt*60; this.y+=this.vy*dt*60;
};
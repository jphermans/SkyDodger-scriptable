// Sky Dodger — stable collisions + restored engine flame

// --- Best score via Keychain ---
const KEYCHAIN_KEY = "sky_best";

function loadBestScore() {
  if (!Keychain.contains(KEYCHAIN_KEY)) return 0;
  const val = Keychain.get(KEYCHAIN_KEY);
  const n = parseInt(val);
  return isNaN(n) ? 0 : n;
}

function saveBestScore(n) {
  Keychain.set(KEYCHAIN_KEY, String(n));
}

let bestFromFile = loadBestScore();

let w = new WebView();
await w.loadHTML(htmlCode(bestFromFile));
await w.present();

try {
  const bestAfter = await w.evaluateJavaScript("window.best || 0", true);
  if (bestAfter > bestFromFile) saveBestScore(bestAfter);
} catch(e) { console.log("Could not fetch best: " + e); }

function htmlCode(initialBest) {
return `<!doctype html>
<html>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>Sky Dodger</title>
<style>
body {margin:0;background:#000;font-family:-apple-system;}
canvas {display:block;width:100vw;height:100vh;touch-action:none;}
#menu {
  position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  flex-direction:column; background:rgba(0,0,20,.5);
  color:#0ff; font-size:28px; font-weight:700; text-shadow:0 0 8px #0ff;
}
#btn, #quit {
  margin-top:16px; padding:12px 28px; border-radius:12px; font-weight:700; cursor:pointer;
  box-shadow:0 0 12px #0ff;
}
#btn  { background:#0ff; color:#000; }
#quit { background:#f44; color:#fff; box-shadow:0 0 12px #f55; }
#credits {
  margin-top:30px; font-size:14px; color:#0ff;
  text-shadow:0 0 8px #0ff; opacity:0.8;
}
</style>
<body>
<canvas id="game"></canvas>
<div id="menu">
  <div>🚀 Sky Dodger</div>
  <div id="btn">Play</div>
  <div id="quit">Quit</div>
  <div id="credits">Created by JPHsystems © 2025</div>
</div>
<script>
const cvs=document.getElementById('game'),ctx=cvs.getContext('2d');
function resize(){cvs.width=window.screen.width;cvs.height=window.screen.height;}
resize();addEventListener('resize',resize);

const OFFSET_Y=80;
let state="menu",player,blocks=[],stars=[],score=0,lives=3,best=${initialBest},retries=0;
window.best=best;
let implosion=null;
let hitCooldown=false;

// --- stars ---
function makeStars(){
  stars=[];
  for(let i=0;i<100;i++){
    stars.push({x:Math.random()*cvs.width,y:Math.random()*cvs.height,r:Math.random()*1.8+0.3});
  }
}
makeStars();

// --- reset ---
function resetGame(){
  player={x:cvs.width/2,y:cvs.height*0.8,size:15};
  blocks=[];score=0;lives=3;retries=0;hitCooldown=false;
  state="play";
}

// --- loop ---
function loop(){
  requestAnimationFrame(loop);
  ctx.fillStyle="#000";ctx.fillRect(0,0,cvs.width,cvs.height);

  // stars
  ctx.fillStyle="white";
  for(let s of stars){
    ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();
    s.y+=0.3;if(s.y>cvs.height){s.y=0;s.x=Math.random()*cvs.width;}
  }

  // implosion effect
  if(implosion){
    implosion.radius+=8;implosion.opacity-=0.05;
    if(implosion.opacity>0){
      const g=ctx.createRadialGradient(implosion.x,implosion.y,0,implosion.x,implosion.y,implosion.radius);
      g.addColorStop(0,"rgba(255,100,0,"+implosion.opacity+")");
      g.addColorStop(0.5,"rgba(255,200,100,"+implosion.opacity/1.5+")");
      g.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=g;
      ctx.beginPath();ctx.arc(implosion.x,implosion.y,implosion.radius,0,Math.PI*2);ctx.fill();
    } else implosion=null;
  }

  if(state==="play"||state==="paused")drawShip();
  if(state==="play"){updateBlocks();score++;if(score>best){best=score;window.best=best;}drawHUD();}
  else if(state==="paused"){drawHUD();}
  else if(state==="gameover"){drawGameOver();}
}

// --- ship (with engine) ---
function drawShip(){
  ctx.save();ctx.translate(player.x,player.y);
  const color=hitCooldown?"#ff5050":"#0ff";
  const flameLen=player.size*1.2+Math.random()*player.size*0.8;

  // engine flame
  ctx.beginPath();
  ctx.moveTo(-player.size*0.4,player.size*0.8);
  ctx.lineTo(player.size*0.4,player.size*0.8);
  ctx.lineTo(0,player.size*0.8+flameLen);
  ctx.closePath();
  const flameGrad=ctx.createLinearGradient(0,player.size,0,player.size+flameLen);
  flameGrad.addColorStop(0,"yellow");
  flameGrad.addColorStop(1,"orange");
  ctx.fillStyle=flameGrad;
  ctx.shadowColor="orange";ctx.shadowBlur=10;
  ctx.fill();ctx.shadowBlur=0;

  // ship body
  ctx.beginPath();
  ctx.moveTo(0,-player.size);
  ctx.lineTo(player.size*0.6,player.size);
  ctx.lineTo(-player.size*0.6,player.size);
  ctx.closePath();
  ctx.fillStyle=color;
  ctx.shadowColor=color;ctx.shadowBlur=12;ctx.fill();ctx.shadowBlur=0;
  ctx.restore();
}

// --- rocks ---
function updateBlocks(){
  for(let b of blocks){
    b.y+=2+(score/1000);b.angle+=0.01;
    drawRock(b);
    if(!hitCooldown && collision(b)){hit();break;}
  }
  blocks=blocks.filter(b=>b.y<cvs.height);
  const chance=0.02+Math.min(score/50000,0.08);
  if(Math.random()<chance)blocks.push(makeRock(20+Math.random()*15));
}
function makeRock(s){
  const n=5+Math.floor(Math.random()*3),pts=[];
  for(let i=0;i<n;i++){
    const a=(i/n)*Math.PI*2,r=s*0.6+Math.random()*s*0.4;
    pts.push({x:Math.cos(a)*r,y:Math.sin(a)*r});
  }
  return{x:Math.random()*(cvs.width-s),y:-s,w:s,h:s,angle:Math.random()*Math.PI,points:pts};
}
function drawRock(b){
  ctx.save();ctx.translate(b.x+b.w/2,b.y+b.h/2);ctx.rotate(b.angle);
  ctx.fillStyle="#964B00";
  ctx.beginPath();ctx.moveTo(b.points[0].x,b.points[0].y);
  for(const p of b.points)ctx.lineTo(p.x,p.y);
  ctx.closePath();ctx.fill();ctx.restore();
}

// --- HUD ---
function drawHUD(){
  ctx.fillStyle="#0ff";ctx.font="18px -apple-system";
  ctx.textAlign="left";ctx.fillText("Score: "+score,10,20);
  ctx.textAlign="center";ctx.fillText("❤️".repeat(lives),cvs.width/2,20);
  ctx.textAlign="right";ctx.fillText("Best: "+best,cvs.width-10,20);
}
function drawGameOver(){
  ctx.fillStyle="red";ctx.font="36px -apple-system";ctx.textAlign="center";
  ctx.fillText("☠️ GAME OVER ☠️",cvs.width/2,cvs.height/2);
  ctx.fillStyle="#0ff";ctx.font="20px -apple-system";
  ctx.fillText("Score: "+score+" | Best: "+best,cvs.width/2,cvs.height/2+30);
  window.best=best;
}

// --- logic ---
function collision(b){
  const px=player.x,py=player.y,bx=b.x,by=b.y;
  const nx=Math.max(bx,Math.min(px,bx+b.w));
  const ny=Math.max(by,Math.min(py,b.y+b.h));
  const dx=px-nx,dy=py-ny;
  return dx*dx+dy*dy<(player.size*0.6)*(player.size*0.6);
}

function hit(){
  if(hitCooldown) return;
  hitCooldown=true;
  lives--;retries++;
  implosion={x:player.x,y:player.y,radius:10,opacity:1.0};
  state="paused";
  blocks=[]; // clear rocks after hit

  setTimeout(()=>{
    implosion=null;
    hitCooldown=false;
    if(lives<=0){gameOver();}
    else state="play";
  },1200);
}

function gameOver(){
  if(score>best){best=score;window.best=best;}
  state="gameover";
  setTimeout(()=>document.getElementById('menu').style.display='flex',1500);
}

// --- controls ---
cvs.addEventListener('pointermove',e=>{
  if(state==="play"){player.x=e.clientX;player.y=e.clientY-OFFSET_Y;}
});
cvs.addEventListener('touchmove',e=>{
  if(state==="play"){let t=e.touches[0];player.x=t.clientX;player.y=t.clientY-OFFSET_Y;}
  e.preventDefault();
},{passive:false});

// --- menu buttons ---
document.getElementById('btn').onclick=()=>{
  document.getElementById('menu').style.display='none';
  resetGame();
};
document.getElementById('quit').onclick=()=>{
  const bestNow=encodeURIComponent(window.best||0);
  window.location.href="scriptable:///run?scriptName=SkyDodger%20Closer&best="+bestNow;
};

// --- start ---
loop();
</script>
</body></html>`;}
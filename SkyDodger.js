// Sky Dodger — main game with omni-directional meteor, bright stars, credits, and quit button

const fm = FileManager.iCloud();
const BEST_PATH = fm.joinPath(fm.documentsDirectory(), "sky_best.txt");

let bestFromFile = 0;
if (fm.fileExists(BEST_PATH)) {
  try {
    fm.downloadFileFromiCloud(BEST_PATH);
    const v = parseInt(fm.readString(BEST_PATH));
    if (!isNaN(v) && v > 0) bestFromFile = v;
  } catch (e) { console.log("Read best failed: " + e); }
}

let w = new WebView();
await w.loadHTML(htmlCode(bestFromFile));
await w.present();

try {
  const bestAfter = await w.evaluateJavaScript("window.best || 0", true);
  if (bestAfter > bestFromFile) fm.writeString(BEST_PATH, String(bestAfter));
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

// --- stars ---
function makeStars(){
  stars=[];
  for(let i=0;i<100;i++){
    stars.push({
      x:Math.random()*cvs.width,
      y:Math.random()*cvs.height,
      r:Math.random()*1.8+0.3,
      blink:Math.random()*0.05+0.01
    });
  }
}
makeStars();

// --- meteor setup ---
let meteor=null,meteorTimer=0;
function spawnMeteor(){
  if(meteor) return;

  // Random starting side: 0=left,1=right,2=top,3=bottom
  const side = Math.floor(Math.random()*4);
  let x, y, vx, vy;

  const speed = 5 + Math.random()*5;

  if (side === 0) { // left
    x = -50; y = Math.random()*cvs.height;
    vx = speed; vy = (Math.random()-0.5)*speed;
  } else if (side === 1) { // right
    x = cvs.width+50; y = Math.random()*cvs.height;
    vx = -speed; vy = (Math.random()-0.5)*speed;
  } else if (side === 2) { // top
    x = Math.random()*cvs.width; y = -50;
    vx = (Math.random()-0.5)*speed; vy = speed;
  } else { // bottom
    x = Math.random()*cvs.width; y = cvs.height+50;
    vx = (Math.random()-0.5)*speed; vy = -speed;
  }

  meteor = { x, y, vx, vy, life:0, maxLife:150 };
}

// --- reset ---
function resetGame(){
  player={x:cvs.width/2,y:cvs.height*0.8,size:15};
  blocks=[];score=0;lives=3;retries=0;
  state="play";
}

// --- loop ---
function loop(){
  requestAnimationFrame(loop);
  ctx.fillStyle="#000";ctx.fillRect(0,0,cvs.width,cvs.height);

  // stars
  for(let s of stars){
    ctx.beginPath();
    const brightness = 0.8+Math.sin(Date.now()*s.blink)*0.2;
    ctx.fillStyle="rgba(255,255,255,"+brightness+")";
    ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
    ctx.fill();
    s.y+=0.3; if(s.y>cvs.height){s.y=0;s.x=Math.random()*cvs.width;}
  }

  // meteor update
  meteorTimer++;
  if(!meteor && meteorTimer>300+Math.random()*400) {
    meteorTimer=0;
    spawnMeteor();
  }
  if(meteor){
    ctx.save();
    const trailGrad=ctx.createLinearGradient(meteor.x,meteor.y,meteor.x-meteor.vx*6,meteor.y-meteor.vy*6);
    trailGrad.addColorStop(0,"rgba(255,255,255,0.9)");
    trailGrad.addColorStop(1,"rgba(255,180,50,0)");
    ctx.strokeStyle=trailGrad;
    ctx.lineWidth=3;
    ctx.beginPath();
    ctx.moveTo(meteor.x,meteor.y);
    ctx.lineTo(meteor.x-meteor.vx*6,meteor.y-meteor.vy*6);
    ctx.stroke();
    ctx.fillStyle="white";
    ctx.beginPath();ctx.arc(meteor.x,meteor.y,3,0,Math.PI*2);ctx.fill();
    ctx.restore();

    meteor.x+=meteor.vx;
    meteor.y+=meteor.vy;
    meteor.life++;

    if(meteor.x<-100||meteor.x>cvs.width+100||meteor.y<-100||meteor.y>cvs.height+100||meteor.life>meteor.maxLife){
      meteor=null;
    }
  }

  if(state==="play"){
    drawShip();updateBlocks();score++;
    if(score>best){best=score;window.best=best;}
    drawHUD();
  }else if(state==="paused"){drawHUD();drawRetry();}
  else if(state==="gameover"){drawGameOver();}
}

// --- ship ---
function drawShip(){
  ctx.save();ctx.translate(player.x,player.y);
  let f=player.size*1+Math.random()*player.size*0.5;
  ctx.beginPath();
  ctx.moveTo(-player.size*0.4,player.size*0.8);
  ctx.lineTo(player.size*0.4,player.size*0.8);
  ctx.lineTo(0,player.size*0.8+f);
  ctx.closePath();
  let g=ctx.createLinearGradient(0,player.size,0,player.size+f);
  g.addColorStop(0,"yellow");g.addColorStop(1,"orange");
  ctx.fillStyle=g;ctx.shadowColor="orange";ctx.shadowBlur=12;ctx.fill();ctx.shadowBlur=0;

  ctx.beginPath();
  ctx.moveTo(0,-player.size);
  ctx.lineTo(player.size*0.6,player.size);
  ctx.lineTo(-player.size*0.6,player.size);
  ctx.closePath();
  ctx.fillStyle="#0ff";ctx.shadowColor="#0ff";ctx.shadowBlur=12;ctx.fill();ctx.shadowBlur=0;
  ctx.restore();
}

// --- rocks ---
function updateBlocks(){
  for(let b of blocks){
    b.y+=2+(score/1000); b.angle+=0.01;
    drawRock(b);
    if(collision(b)){hit();return;}
  }
  blocks=blocks.filter(b=>b.y<cvs.height);
  const chance=0.02+Math.min(score/50000,0.08);
  if(Math.random()<chance) blocks.push(makeRock(20+Math.random()*15));
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
function drawRetry(){
  ctx.fillStyle="#0ff";ctx.font="22px -apple-system";ctx.textAlign="center";
  ctx.fillText("Retry: "+retries,cvs.width/2,cvs.height/2);
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
  const ny=Math.max(by,Math.min(py,by+b.h));
  const dx=px-nx,dy=py-ny;
  return dx*dx+dy*dy<(player.size*0.6)*(player.size*0.6);
}
function hit(){
  lives--;retries++;
  if(lives<=0){gameOver();return;}
  state="paused";blocks=[];
  setTimeout(()=>state="play",1000);
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
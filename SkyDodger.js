// Sky Dodger — main game script with Quit button support

const fm = FileManager.iCloud();
const BEST_PATH = fm.joinPath(fm.documentsDirectory(), "sky_best.txt");

// load saved best score
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

// Fallback: if user just closes normally, save best from game
try {
  const bestAfter = await w.evaluateJavaScript("window.best || 0", true);
  if (bestAfter > bestFromFile) {
    fm.writeString(BEST_PATH, String(bestAfter));
    console.log("Best saved: " + bestAfter);
  }
} catch(e) {
  console.log("Could not fetch best: " + e);
}

// -------- HTML CODE --------
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
    background:rgba(0,0,20,.7); color:#0ff; font-size:28px; font-weight:700; flex-direction:column;
    text-shadow:0 0 8px #0ff;
  }
  #btn, #quit {
    margin-top:16px; padding:12px 28px; border-radius:12px; font-weight:700; cursor:pointer;
    box-shadow:0 0 12px #0ff;
  }
  #btn { background:#0ff; color:#000; }
  #quit { background:#f44; color:#fff; box-shadow:0 0 12px #f55; }
</style>
<body>
<canvas id="game"></canvas>
<div id="menu">
  <div>🚀 Sky Dodger</div>
  <div id="btn">Play</div>
  <div id="quit">Quit</div>
</div>

<script>
const cvs=document.getElementById('game'),ctx=cvs.getContext('2d');
function resize(){cvs.width=window.screen.width;cvs.height=window.screen.height;}
resize();addEventListener('resize',resize);

const OFFSET_Y=80;
let state="menu",player,blocks=[],stars=[],score=0,lives=3,best=${initialBest},retries=0;
window.best=best;

// starfield
function makeStars(){stars=[];for(let i=0;i<60;i++)stars.push({x:Math.random()*cvs.width,y:Math.random()*cvs.height,r:Math.random()*1.5});}

// reset
function resetGame(){player={x:cvs.width/2,y:cvs.height*0.8,size:15};blocks=[];score=0;lives=3;retries=0;makeStars();state="play";}

// loop
function loop(){
  requestAnimationFrame(loop);
  ctx.fillStyle="#000";ctx.fillRect(0,0,cvs.width,cvs.height);

  ctx.fillStyle="#fff";
  for(let s of stars){ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();
    if(state==="play"){s.y+=0.5;if(s.y>cvs.height){s.y=0;s.x=Math.random()*cvs.width;}}}

  if(state==="play"){drawShip();updateBlocks();score++;
    if(score>best){best=score;window.best=best;}
    drawHUD();}
  if(state==="paused"){drawHUD();drawRetry();}
  if(state==="gameover"){drawGameOver();}
}

// ship
function drawShip(){ctx.save();ctx.translate(player.x,player.y);
  let f=player.size*1+Math.random()*player.size*0.5;
  ctx.beginPath();ctx.moveTo(-player.size*0.4,player.size*0.8);ctx.lineTo(player.size*0.4,player.size*0.8);ctx.lineTo(0,player.size*0.8+f);ctx.closePath();
  let g=ctx.createLinearGradient(0,player.size,0,player.size+f);g.addColorStop(0,"yellow");g.addColorStop(1,"orange");
  ctx.fillStyle=g;ctx.shadowColor="orange";ctx.shadowBlur=12;ctx.fill();ctx.shadowBlur=0;

  ctx.beginPath();ctx.moveTo(0,-player.size);ctx.lineTo(player.size*0.6,player.size);ctx.lineTo(-player.size*0.6,player.size);ctx.closePath();
  ctx.fillStyle="#0ff";ctx.shadowColor="#0ff";ctx.shadowBlur=12;ctx.fill();ctx.shadowBlur=0;ctx.restore();}

// rocks
function updateBlocks(){for(let b of blocks){b.y+=2+(score/1000);b.angle+=0.01;drawRock(b);if(collision(b)){hit();return;}}
  blocks=blocks.filter(b=>b.y<cvs.height);
  let chance=0.02+Math.min(score/50000,0.08);if(Math.random()<chance){blocks.push(makeRock(20+Math.random()*15));}}
function makeRock(s){let n=5+Math.floor(Math.random()*3),pts=[];for(let i=0;i<n;i++){let a=(i/n)*Math.PI*2,r=s*0.6+Math.random()*s*0.4;pts.push({x:Math.cos(a)*r,y:Math.sin(a)*r});}
  return{x:Math.random()*(cvs.width-s),y:-s,w:s,h:s,angle:Math.random()*Math.PI,points:pts};}
function drawRock(b){ctx.save();ctx.translate(b.x+b.w/2,b.y+b.h/2);ctx.rotate(b.angle);ctx.fillStyle="#964B00";ctx.beginPath();ctx.moveTo(b.points[0].x,b.points[0].y);for(let p of b.points)ctx.lineTo(p.x,p.y);ctx.closePath();ctx.fill();ctx.restore();}

// HUD
function drawHUD(){ctx.fillStyle="#0ff";ctx.font="18px -apple-system";
  ctx.textAlign="left";ctx.fillText("Score: "+score,10,20);
  ctx.textAlign="center";ctx.fillText("❤️".repeat(lives),cvs.width/2,20);
  ctx.textAlign="right";ctx.fillText("Best: "+best,cvs.width-10,20);}
function drawRetry(){ctx.fillStyle="#0ff";ctx.font="22px -apple-system";ctx.textAlign="center";ctx.fillText("Retry: "+retries,cvs.width/2,cvs.height/2);}
function drawGameOver(){ctx.fillStyle="red";ctx.font="36px -apple-system";ctx.textAlign="center";ctx.fillText("☠️ GAME OVER ☠️",cvs.width/2,cvs.height/2);ctx.fillStyle="#0ff";ctx.font="20px -apple-system";ctx.fillText("Score: "+score+" | Best: "+best,cvs.width/2,cvs.height/2+30);window.best=best;}

// collision
function collision(b){let px=player.x,py=player.y,bx=b.x,by=b.y;let nx=Math.max(bx,Math.min(px,bx+b.w)),ny=Math.max(by,Math.min(py,by+b.h));let dx=px-nx,dy=py-ny;return dx*dx+dy*dy<(player.size*0.6)*(player.size*0.6);}

// hit/game over
function hit(){lives--;retries++;if(lives<=0){gameOver();return;}state="paused";blocks=[];setTimeout(()=>{state="play";},1000);}
function gameOver(){if(score>best){best=score;window.best=best;}state="gameover";setTimeout(()=>{document.getElementById('menu').style.display='flex';},1500);}

// controls
cvs.addEventListener('pointermove',e=>{if(state==="play"){player.x=e.clientX;player.y=e.clientY-OFFSET_Y;}});
cvs.addEventListener('touchmove',e=>{if(state==="play"){let t=e.touches[0];player.x=t.clientX;player.y=t.clientY-OFFSET_Y;}e.preventDefault();},{passive:false});

// buttons
document.getElementById('btn').onclick=()=>{document.getElementById('menu').style.display='none';resetGame();};
document.getElementById('quit').onclick=()=> {
  const bestNow = encodeURIComponent(window.best || 0);
  // helper script must be named "SkyDodger Closer"
  window.location.href = "scriptable:///run?scriptName=SkyDodger%20Closer&best=" + bestNow;
};

// start loop
loop();
</script>
</body></html>`;}
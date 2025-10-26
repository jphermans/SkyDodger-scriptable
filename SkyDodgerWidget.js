// Widget for Sky Dodger — starry background + ship + best score (dynamic starfield)

// --- Best score via Keychain ---
const KEYCHAIN_KEY = "sky_best";

function loadBestScore() {
  if (!Keychain.contains(KEYCHAIN_KEY)) return 0;
  const val = Keychain.get(KEYCHAIN_KEY);
  const n = parseInt(val);
  return isNaN(n) ? 0 : n;
}

let best = loadBestScore();
let bestText = best > 0 ? "Best: " + best : "No score yet";

// --- draw dynamic starfield + ship ---
function drawStarry(width, height, stars = 80) {
  const ctx = new DrawContext();
  ctx.size = new Size(width, height);
  ctx.opaque = true;
  ctx.setFillColor(new Color("#000"));
  ctx.fillRect(new Rect(0, 0, width, height));

  // stars: random every refresh
  for (let i = 0; i < stars; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = Math.random() * 2 + 1;
    ctx.setFillColor(new Color("#fff", Math.random() * 0.8 + 0.2));
    ctx.fillEllipse(new Rect(x, y, r, r));
  }

  // spaceship (cyan body + orange flame)
  const shipX = width / 2;
  const shipY = height - 30;
  const s = 14;

  const body = new Path();
  body.move(new Point(shipX, shipY - s));
  body.addLine(new Point(shipX + s * 0.6, shipY + s));
  body.addLine(new Point(shipX - s * 0.6, shipY + s));
  body.closeSubpath();
  ctx.addPath(body);
  ctx.setFillColor(new Color("#0ff"));
  ctx.fillPath();

  const flame = new Path();
  flame.move(new Point(shipX - s * 0.4, shipY + s));
  flame.addLine(new Point(shipX + s * 0.4, shipY + s));
  flame.addLine(new Point(shipX, shipY + s + s * 0.8));
  flame.closeSubpath();
  ctx.addPath(flame);
  ctx.setFillColor(new Color("#ffa500"));
  ctx.fillPath();

  return ctx.getImage();
}

// pick sizes based on widget type
let W = 360, H = 360;
if (config.widgetFamily === "small") { W = 160; H = 160; }
if (config.widgetFamily === "medium") { W = 360; H = 170; }
if (config.widgetFamily === "large") { W = 360; H = 370; }

const bg = drawStarry(W, H, 80);

// --- build widget ---
let w = new ListWidget();
w.backgroundImage = bg;

let title = w.addText("🚀 Sky Dodger");
title.font = Font.boldSystemFont(14);
title.textColor = new Color("#0ff");
title.centerAlignText();

w.addSpacer(6);

let scoreTxt = w.addText(bestText);
scoreTxt.font = Font.systemFont(20);
scoreTxt.textColor = new Color("#0ff");
scoreTxt.centerAlignText();

// tap opens the game script
w.url = "scriptable:///run/SkyDodger";

// request faster refresh (about every minute)
w.refreshAfterDate = new Date(Date.now() + 60 * 1000);

Script.setWidget(w);
Script.complete();
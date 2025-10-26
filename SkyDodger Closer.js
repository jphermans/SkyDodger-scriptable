// SkyDodger Closer — saves ?best=… then closes Scriptable

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

const qp = args.queryParameters || {};
const incoming = parseInt(qp.best || "0");
let current = 0;

current = loadBestScore();

// If incoming is valid, take the max to keep "all-time best"
if (!isNaN(incoming)) {
  const toSave = Math.max(incoming, current);
  saveBestScore(toSave);
  console.log("Best saved:", toSave);
}

App.close();
// SkyDodger Closer — saves ?best=… then closes Scriptable

const fm = FileManager.iCloud();
const BEST_PATH = fm.joinPath(fm.documentsDirectory(), "sky_best.txt");

const qp = args.queryParameters || {};
const incoming = parseInt(qp.best || "0");
let current = 0;

if (fm.fileExists(BEST_PATH)) {
  fm.downloadFileFromiCloud(BEST_PATH);
  current = parseInt(fm.readString(BEST_PATH)) || 0;
}

// If incoming is valid, take the max to keep "all-time best"
if (!isNaN(incoming)) {
  const toSave = Math.max(incoming, current);
  fm.writeString(BEST_PATH, String(toSave));
  console.log("Best saved:", toSave);
}

App.close();
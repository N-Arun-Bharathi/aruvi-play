const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");

// Read current version and versionCode
const appJsonPath = path.join(rootDir, "apps/mobile/app.json");
const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
const versionName = appJson?.expo?.version || "1.0.0";
const versionCode = appJson?.expo?.android?.versionCode || 1;

const driveUrl = process.argv[2] || "https://drive.google.com/file/d/YOUR_FILE_ID/view?usp=sharing";
const releaseNotes = process.argv[3] || "• Performance improvements and bug fixes.\n• Audio playback optimizations.";

console.log("\n=======================================================");
console.log("  🚀 Aruvi Play - Release SQL for Supabase DB");
console.log("=======================================================\n");
console.log(`Version Name: ${versionName}`);
console.log(`Version Code: ${versionCode}`);
console.log(`APK / Drive:  ${driveUrl}\n`);
console.log("👉 Copy and run this in Supabase SQL Editor:\n");

const sql = `INSERT INTO public.app_versions (
  version_name,
  version_code,
  apk_url,
  release_notes,
  is_mandatory,
  released_at
) VALUES (
  '${versionName}',
  ${versionCode},
  '${driveUrl}',
  '${releaseNotes.replace(/'/g, "''")}',
  false,
  now()
) 
ON CONFLICT (version_code) DO UPDATE SET
  version_name = EXCLUDED.version_name,
  apk_url = EXCLUDED.apk_url,
  release_notes = EXCLUDED.release_notes,
  is_mandatory = EXCLUDED.is_mandatory,
  released_at = now();`;

console.log(sql);
console.log("\n=======================================================\n");

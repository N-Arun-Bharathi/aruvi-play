const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");

// Load .env variables if present
const envPath = path.join(rootDir, ".env");
if (fs.existsSync(envPath)) {
  const envLines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of envLines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...vals] = trimmed.split("=");
      const val = vals.join("=").trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key.trim()]) {
        process.env[key.trim()] = val;
      }
    }
  }
}

// 1. Read current version & versionCode from apps/mobile/app.json & package.json
const appJsonPath = path.join(rootDir, "apps/mobile/app.json");
const rootPkgPath = path.join(rootDir, "package.json");

let versionName = "1.0.0";
let versionCode = 1;

if (fs.existsSync(appJsonPath)) {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
  versionName = appJson?.expo?.version || versionName;
  versionCode = appJson?.expo?.android?.versionCode || versionCode;
} else if (fs.existsSync(rootPkgPath)) {
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf-8"));
  versionName = rootPkg.version || versionName;
}

// Permanent Google Drive link (Manage Versions)
const DEFAULT_DRIVE_URL = process.env.APP_UPDATE_URL || "https://drive.google.com/file/d/1B0x1MiD-RtjPaq6BpbMsHvQX_vOn4O6E/view?usp=sharing";
const DEFAULT_RELEASE_NOTES = "• Performance improvements and bug fixes.\n• Audio playback optimizations.";
const SECRET_KEY = process.env.EXPO_PUBLIC_SECRET_KEY || "Aruvi5868";

// Smart argument parsing
let driveUrl = DEFAULT_DRIVE_URL;
let releaseNotes = DEFAULT_RELEASE_NOTES;
let isMandatory = false;

const arg1 = process.argv[2];
const arg2 = process.argv[3];
const arg3 = process.argv[4];

if (arg1) {
  if (arg1.startsWith("http://") || arg1.startsWith("https://")) {
    driveUrl = arg1;
    if (arg2) releaseNotes = arg2;
    if (arg3 === "true" || arg3 === "1") isMandatory = true;
  } else {
    releaseNotes = arg1;
    if (arg2 === "true" || arg2 === "1") isMandatory = true;
  }
}

// 2. Format download link if it's a Google Drive link
function formatDownloadUrl(rawUrl) {
  if (!rawUrl) return "";
  const trimmed = rawUrl.trim();
  const driveFileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch && driveFileMatch[1]) {
    return `https://drive.usercontent.google.com/download?id=${driveFileMatch[1]}&export=download&confirm=t`;
  }
  const driveIdMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (trimmed.includes("drive.google.com") && driveIdMatch && driveIdMatch[1]) {
    return `https://drive.usercontent.google.com/download?id=${driveIdMatch[1]}&export=download&confirm=t`;
  }
  return trimmed;
}

const formattedUrl = formatDownloadUrl(driveUrl);

console.log("\n=======================================================");
console.log("  🚀 Aruvi Play - Automated Version Sync");
console.log("=======================================================\n");
console.log(`📦 Version Name: ${versionName}`);
console.log(`🔢 Version Code: ${versionCode}`);
console.log(`🔗 APK URL:      ${driveUrl}`);
if (formattedUrl !== driveUrl) {
  console.log(`⚡ Direct Link:  ${formattedUrl}`);
}
console.log(`📝 Release Notes:\n   ${releaseNotes.split("\n").join("\n   ")}`);
console.log(`⚠️  Mandatory:    ${isMandatory ? "YES" : "NO"}\n`);

// 3. Automated Supabase DB publish via secure RPC
async function syncToDatabase() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes("your-supabase-project")) {
    try {
      console.log("📡 Publishing version directly to Supabase DB via RPC...");
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/publish_app_version`, {
        method: "POST",
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_secret_key: SECRET_KEY,
          p_version_name: versionName,
          p_version_code: versionCode,
          p_apk_url: driveUrl,
          p_sha256: "",
          p_release_notes: releaseNotes,
          p_minimum_supported_version: 1,
          p_is_mandatory: isMandatory,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✨ [AUTO-SYNC SUCCESS] Published v${versionName} (code ${versionCode}) to Supabase live!`);
        console.log(`   Response:`, data);
        console.log("\n=======================================================\n");
        return true;
      } else {
        const errText = await response.text();
        console.warn(`⚠️ Direct DB sync returned status ${response.status}: ${errText}`);
      }
    } catch (err) {
      console.warn("⚠️ Direct DB sync error:", err.message || err);
    }
  }

  // Fallback SQL output only if API fails
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
  '${driveUrl.replace(/'/g, "''")}',
  '${releaseNotes.replace(/'/g, "''")}',
  ${isMandatory},
  now()
) 
ON CONFLICT (version_code) DO UPDATE SET
  version_name = EXCLUDED.version_name,
  apk_url = EXCLUDED.apk_url,
  release_notes = EXCLUDED.release_notes,
  is_mandatory = EXCLUDED.is_mandatory,
  released_at = now();`;

  console.log("-------------------------------------------------------");
  console.log("👉 Fallback SQL Command for Supabase SQL Editor:");
  console.log("-------------------------------------------------------\n");
  console.log(sql);
  console.log("\n=======================================================\n");
  return false;
}

syncToDatabase();

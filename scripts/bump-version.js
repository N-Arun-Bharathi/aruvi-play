const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const bumpType = process.argv[2] || "patch";

if (!["patch", "minor", "major"].includes(bumpType)) {
  console.error(`Invalid bump type: "${bumpType}". Must be "patch", "minor", or "major".`);
  process.exit(1);
}

// 1. Read current version from root package.json
const rootPkgPath = path.join(rootDir, "package.json");
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf-8"));
const currentVersion = rootPkg.version || "1.0.0";

// 2. Read current versionCode from apps/mobile/app.json
const appJsonPath = path.join(rootDir, "apps/mobile/app.json");
let appJson = {};
let currentVersionCode = 1;
if (fs.existsSync(appJsonPath)) {
  appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
  currentVersionCode = appJson?.expo?.android?.versionCode || 1;
}

// 3. Compute new semver version
const parts = currentVersion.split(".").map((n) => parseInt(n, 10) || 0);
while (parts.length < 3) parts.push(0);

let [major, minor, patch] = parts;
if (bumpType === "major") {
  major += 1;
  minor = 0;
  patch = 0;
} else if (bumpType === "minor") {
  minor += 1;
  patch = 0;
} else {
  patch += 1;
}

const newVersion = `${major}.${minor}.${patch}`;
const newVersionCode = currentVersionCode + 1;

console.log(`\n📦 Bumping version [${bumpType.toUpperCase()}]:`);
console.log(`   Version:     ${currentVersion} ➔ ${newVersion}`);
console.log(`   VersionCode: ${currentVersionCode} ➔ ${newVersionCode}\n`);

// Helper to safely update JSON files
function updateJsonFile(filePath, updater) {
  if (!fs.existsSync(filePath)) return;
  const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  updater(content);
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + "\n", "utf-8");
  console.log(` ✓ Updated ${path.relative(rootDir, filePath)}`);
}

// 4. Update root package.json
updateJsonFile(rootPkgPath, (pkg) => {
  pkg.version = newVersion;
});

// 5. Update apps/mobile/package.json
updateJsonFile(path.join(rootDir, "apps/mobile/package.json"), (pkg) => {
  pkg.version = newVersion;
});

// 6. Update apps/mobile/app.json
updateJsonFile(appJsonPath, (config) => {
  if (!config.expo) config.expo = {};
  config.expo.version = newVersion;
  if (!config.expo.android) config.expo.android = {};
  config.expo.android.versionCode = newVersionCode;
});

// 7. Update packages/utils/version.ts and packages/shared/src/utils/version.ts
const versionTsPath = path.join(rootDir, "packages/utils/version.ts");
const sharedVersionTsPath = path.join(rootDir, "packages/shared/src/utils/version.ts");
const versionTsContent = `export const APP_VERSION = "${newVersion}";\nexport const APP_VERSION_CODE = ${newVersionCode};\n`;
fs.writeFileSync(versionTsPath, versionTsContent, "utf-8");
console.log(` ✓ Updated ${path.relative(rootDir, versionTsPath)}`);
if (fs.existsSync(sharedVersionTsPath)) {
  fs.writeFileSync(sharedVersionTsPath, versionTsContent, "utf-8");
  console.log(` ✓ Updated ${path.relative(rootDir, sharedVersionTsPath)}`);
}

// 8. Update packages/utils/package.json
updateJsonFile(path.join(rootDir, "packages/utils/package.json"), (pkg) => {
  pkg.version = newVersion;
});


// 9. Update packages/shared/package.json
updateJsonFile(path.join(rootDir, "packages/shared/package.json"), (pkg) => {
  pkg.version = newVersion;
});

// 10. Update apps/web/package.json
updateJsonFile(path.join(rootDir, "apps/web/package.json"), (pkg) => {
  pkg.version = newVersion;
});

// 11. Update apps/mobile/android/app/build.gradle (if static versionCode/versionName exists)
const buildGradlePath = path.join(rootDir, "apps/mobile/android/app/build.gradle");
if (fs.existsSync(buildGradlePath)) {
  let gradleContent = fs.readFileSync(buildGradlePath, "utf-8");
  let modified = false;
  if (gradleContent.match(/versionCode\s+\d+/)) {
    gradleContent = gradleContent.replace(/versionCode\s+\d+/, `versionCode ${newVersionCode}`);
    modified = true;
  }
  if (gradleContent.match(/versionName\s+"[^"]+"/)) {
    gradleContent = gradleContent.replace(/versionName\s+"[^"]+"/, `versionName "${newVersion}"`);
    modified = true;
  }
  if (modified) {
    fs.writeFileSync(buildGradlePath, gradleContent, "utf-8");
  }
  console.log(` ✓ Updated ${path.relative(rootDir, buildGradlePath)}`);
}

// 12. Ensure .env files are in sync across apps
const rootEnv = path.join(rootDir, ".env");
if (fs.existsSync(rootEnv)) {
  const mobileEnv = path.join(rootDir, "apps/mobile/.env");
  const webEnv = path.join(rootDir, "apps/web/.env");
  fs.copyFileSync(rootEnv, mobileEnv);
  fs.copyFileSync(rootEnv, webEnv);
  console.log(" ✓ Synced .env to apps/mobile and apps/web");
}

// 13. Automatically trigger database synchronization
try {
  const { execSync } = require("child_process");
  execSync("node scripts/sync-version.js", { stdio: "inherit", cwd: rootDir });
} catch (e) {
  // Graceful fallback
}



const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const bumpType = (process.argv[2] || 'patch').toLowerCase();

if (!['patch', 'minor', 'major'].includes(bumpType)) {
  console.error('❌ Usage: node scripts/bump-version.js <patch|minor|major> [--push]');
  process.exit(1);
}

// 1. Read current version from root version.json
const rootVersionPath = path.join(rootDir, 'version.json');
let versionConfig = {};
try {
  versionConfig = JSON.parse(fs.readFileSync(rootVersionPath, 'utf8'));
} catch (e) {
  versionConfig = { version: '1.5.0', versionCode: 19 };
}

const currentVersion = versionConfig.version || '1.5.0';
const currentCode = Number(versionConfig.versionCode) || 19;

// Parse semver numbers
const parts = currentVersion.replace(/^v/i, '').split('.').map((p) => parseInt(p, 10) || 0);
while (parts.length < 3) parts.push(0);

let [major, minor, patch] = parts;

if (bumpType === 'major') {
  major += 1;
  minor = 0;
  patch = 0;
} else if (bumpType === 'minor') {
  minor += 1;
  patch = 0;
} else {
  // patch
  patch += 1;
}

const newVersion = `${major}.${minor}.${patch}`;
const newCode = currentCode + 1;

console.log(`\n🚀 Bumping Version (${bumpType.toUpperCase()}):`);
console.log(`   Version:     ${currentVersion} ➔ ${newVersion}`);
console.log(`   VersionCode: ${currentCode} ➔ ${newCode}\n`);

// 2. Update root version.json
versionConfig.version = newVersion;
versionConfig.versionCode = newCode;
fs.writeFileSync(rootVersionPath, JSON.stringify(versionConfig, null, 2) + '\n', 'utf8');
console.log(` ✅ Updated version.json`);

// 3. Update apps/mobile/version.json
const mobileVersionPath = path.join(rootDir, 'apps/mobile/version.json');
if (fs.existsSync(mobileVersionPath)) {
  try {
    const mobileV = JSON.parse(fs.readFileSync(mobileVersionPath, 'utf8'));
    mobileV.version = newVersion;
    mobileV.versionCode = newCode;
    fs.writeFileSync(mobileVersionPath, JSON.stringify(mobileV, null, 2) + '\n', 'utf8');
    console.log(` ✅ Updated apps/mobile/version.json`);
  } catch (e) {}
}

// 4. Update apps/mobile/app.json
const appJsonPath = path.join(rootDir, 'apps/mobile/app.json');
if (fs.existsSync(appJsonPath)) {
  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    if (appJson.expo) {
      appJson.expo.version = newVersion;
      if (appJson.expo.android) {
        appJson.expo.android.versionCode = newCode;
      }
    }
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
    console.log(` ✅ Updated apps/mobile/app.json`);
  } catch (e) {}
}

// 5. Update apps/mobile/android/app/build.gradle
const buildGradlePath = path.join(rootDir, 'apps/mobile/android/app/build.gradle');
if (fs.existsSync(buildGradlePath)) {
  try {
    let gradleContent = fs.readFileSync(buildGradlePath, 'utf8');
    gradleContent = gradleContent.replace(/versionCode\s+\d+/, `versionCode ${newCode}`);
    gradleContent = gradleContent.replace(/versionName\s+"[^"]+"/, `versionName "${newVersion}"`);
    fs.writeFileSync(buildGradlePath, gradleContent, 'utf8');
    console.log(` ✅ Updated apps/mobile/android/app/build.gradle`);
  } catch (e) {}
}

// 6. Update package.json files
const packageJsonPaths = [
  path.join(rootDir, 'package.json'),
  path.join(rootDir, 'apps/mobile/package.json'),
  path.join(rootDir, 'apps/web/package.json'),
  path.join(rootDir, 'packages/shared/package.json'),
];

for (const p of packageJsonPaths) {
  if (fs.existsSync(p)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
      pkg.version = newVersion;
      fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
      console.log(` ✅ Updated ${path.relative(rootDir, p)}`);
    } catch (e) {}
  }
}

// 7. Update Web SettingsView.tsx
const webSettingsPath = path.join(rootDir, 'apps/web/src/views/SettingsView.tsx');
if (fs.existsSync(webSettingsPath)) {
  try {
    let settingsContent = fs.readFileSync(webSettingsPath, 'utf8');
    settingsContent = settingsContent.replace(/Version:<\/strong>\s*[^<]+Web Edition/, `Version:</strong> ${newVersion} Web Edition`);
    fs.writeFileSync(webSettingsPath, settingsContent, 'utf8');
    console.log(` ✅ Updated apps/web/src/views/SettingsView.tsx`);
  } catch (e) {}
}

console.log(`\n✨ Successfully bumped to v${newVersion} (code ${newCode}) across all projects!\n`);

// Optional: Automatically push to Supabase if --push flag is passed
if (process.argv.includes('--push')) {
  console.log('📡 --push detected: Publishing new version to Supabase...');
  try {
    const { execSync } = require('child_process');
    execSync('node scripts/publish-version.js', { stdio: 'inherit' });
  } catch (err) {
    console.error('⚠️ Automatic publish failed:', err.message);
  }
}

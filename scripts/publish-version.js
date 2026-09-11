const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env if present
function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = match[2] || '';
        val = val.replace(/^['"]|['"]$/g, '').trim();
        env[match[1]] = val;
      }
    }
  }
  return { ...process.env, ...env };
}

const env = loadEnv();
const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.EXPO_PUBLIC_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
const SECRET_KEY = env.EXPO_PUBLIC_SECRET_KEY || 'Aruvi5868';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase URL or Anon/Service Key not found in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function publish() {
  const versionPath = path.join(rootDir, 'version.json');
  if (!fs.existsSync(versionPath)) {
    console.error('❌ version.json not found');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
  const versionName = config.version || '1.5.0';
  const versionCode = Number(config.versionCode) || 19;
  const apkUrl = config.apkUrl;
  const sha256 = config.sha256 || '';
  const releaseNotes = Array.isArray(config.releaseNotes)
    ? config.releaseNotes.join('\n')
    : String(config.releaseNotes || '');
  const isMandatory = Boolean(config.isMandatory);
  const minVersion = Number(config.minimumSupportedVersion || 1);

  console.log(`\n🚀 Publishing Version ${versionName} (code ${versionCode}) to Supabase...`);
  console.log(`   URL: ${SUPABASE_URL}`);
  console.log(`   APK: ${apkUrl}`);
  console.log(`   SHA: ${sha256}\n`);

  // 1. Try direct RPC publish_app_version
  try {
    const { data, error } = await supabase.rpc('publish_app_version', {
      p_secret_key: SECRET_KEY,
      p_version_name: versionName,
      p_version_code: versionCode,
      p_apk_url: apkUrl,
      p_sha256: sha256,
      p_release_notes: releaseNotes,
      p_minimum_supported_version: minVersion,
      p_is_mandatory: isMandatory,
    });

    if (!error) {
      console.log(`✨ Successfully published v${versionName} (code ${versionCode}) to Supabase Database via RPC!\n`);
      return;
    }
  } catch (_) {}

  // 2. Fallback: Direct table upsert (if service role key or write policy is active)
  try {
    const { data, error } = await supabase
      .from('app_versions')
      .upsert(
        {
          version_name: versionName,
          version_code: versionCode,
          apk_url: apkUrl,
          sha256: sha256,
          release_notes: releaseNotes,
          minimum_supported_version: minVersion,
          is_mandatory: isMandatory,
          released_at: new Date().toISOString(),
        },
        { onConflict: 'version_code' }
      )
      .select();

    if (error) {
      throw error;
    }

    console.log(`✨ Successfully published v${versionName} (code ${versionCode}) to Supabase Database via table upsert!\n`);
  } catch (err) {
    console.error(`❌ Failed to publish version to Supabase: ${err.message}`);
    console.log(`\n💡 Tip: Run the 'publish_app_version' function in Supabase SQL editor or add SUPABASE_SERVICE_ROLE_KEY to .env.\n`);
    process.exit(1);
  }
}

publish();

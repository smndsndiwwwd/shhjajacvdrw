import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const discordJsPath = path.join(__dirname, 'node_modules/discord.js');
const binaryPath = path.join(__dirname, 'node_modules/better-sqlite3/build/Release/better_sqlite3.node');

// Step 1: Ensure npm dependencies (discord.js, etc.) are installed
if (!fs.existsSync(discordJsPath)) {
  console.log('📦 Missing dependencies: Installing npm packages (npm install --ignore-scripts)...');
  try {
    execSync('npm install --ignore-scripts', { cwd: __dirname, stdio: 'inherit' });
    console.log('✅ Packages installed successfully!');
  } catch (err) {
    console.error('⚠️ npm install failed:', err.message);
  }
}

// Step 2: Ensure prebuilt Linux SQLite binary is installed
if (process.platform === 'linux' && !fs.existsSync(binaryPath)) {
  console.log('⚙️ Detecting Linux environment: Installing prebuilt Linux SQLite binary...');
  try {
    const url = 'https://github.com/WiseLibs/better-sqlite3/releases/download/v12.11.1/better-sqlite3-v12.11.1-node-v127-linux-x64.tar.gz';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const tempArchive = '/tmp/bs.tar.gz';
    fs.writeFileSync(tempArchive, buf);
    
    // Ensure destination directory exists
    const destDir = path.join(__dirname, 'node_modules/better-sqlite3');
    fs.mkdirSync(destDir, { recursive: true });
    
    execSync(`tar -xzf ${tempArchive} -C "${destDir}"`);
    try { fs.unlinkSync(tempArchive); } catch (e) {}
    console.log('✅ SQLite Linux binary installed successfully!');
  } catch (err) {
    console.error('⚠️ Auto-install failed:', err.message);
  }
}

// Now boot the bot
await import('./src/index.js');

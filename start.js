require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app, startServer, setBotInstance } = require('./server');
const { initBot } = require('./bot');

const PORT = process.env.PORT || 5000;
const BOT_TOKEN = process.env.BOT_TOKEN || '8803058122:AAE9EaxwJuPmtm9DL9QfosNdpqVzmXdpkbg';
const PRODUCTION_URL = 'https://astorrios.bymebank.xyz';

let tunnelProcess = null;
let botInstance = null;

async function updateTelegramMenuButton(url) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: 'Store',
          web_app: { url }
        }
      })
    });
    const data = await res.json();
    console.log(`[Telegram Menu Button] Updated to: ${url} ->`, data.ok ? '✓ OK' : data);
  } catch (err) {
    console.error('[Telegram Menu Button] Update error:', err.message);
  }
}

function startCloudflareNamedTunnel() {
  return new Promise((resolve) => {
    console.log(`[Tunnel] Launching Cloudflare Tunnel for ${PRODUCTION_URL}...`);
    const cloudflaredBin = fs.existsSync(path.join(__dirname, 'cloudflared.exe'))
      ? path.join(__dirname, 'cloudflared.exe')
      : 'cloudflared.exe';
    const configPath = path.join(__dirname, 'tunnel-config.yml');
    const args = ['tunnel', '--config', configPath, 'run', 'bymebank'];

    const proc = spawn(cloudflaredBin, args, { cwd: __dirname });
    tunnelProcess = proc;

    proc.on('error', (err) => {
      console.error('[Tunnel Error]:', err.message);
    });

    let resolved = false;

    proc.stderr.on('data', async (d) => {
      const msg = d.toString();
      if ((msg.includes('Registered tunnel connection') || msg.includes('Starting tunnel')) && !resolved) {
        resolved = true;
        console.log(`\n========================================================`);
        console.log(`🚀 [AstorrIOS Mini App] PRODUCTION DOMAIN ONLINE!`);
        console.log(`🔗 WebApp URL: ${PRODUCTION_URL}`);
        console.log(`========================================================\n`);

        setTimeout(async () => {
          await updateTelegramMenuButton(PRODUCTION_URL);
        }, 1200);

        resolve(PRODUCTION_URL);
      }
    });

    proc.on('close', (code) => {
      console.log(`[Tunnel] Exited with code ${code}. Reconnecting in 3s...`);
      setTimeout(() => startCloudflareNamedTunnel(), 3000);
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        updateTelegramMenuButton(PRODUCTION_URL);
        resolve(PRODUCTION_URL);
      }
    }, 6000);
  });
}

async function main() {
  console.log('⚡ Starting AstorrIOS VIP Store System...');

  // 1. Start Server on 0.0.0.0
  startServer();

  // Check if running in cloud (Render, Linux, Docker, or tunnel explicitly skipped)
  const isCloudOrLinux = process.env.RENDER === 'true' ||
    process.env.RENDER === true ||
    process.platform !== 'win32' ||
    process.env.SKIP_TUNNEL === 'true' ||
    !fs.existsSync(path.join(__dirname, 'cloudflared.exe'));

  let webAppUrl = process.env.WEBAPP_URL || process.env.RENDER_EXTERNAL_URL || PRODUCTION_URL;

  if (isCloudOrLinux) {
    console.log(`[Host] Running in Cloud/Render environment. Cloudflare Windows tunnel skipped.`);
    console.log(`[Host] Production WebApp URL: ${webAppUrl}`);
    await updateTelegramMenuButton(webAppUrl);
  } else {
    // 2. Launch Cloudflare Tunnel (Windows Local)
    webAppUrl = await startCloudflareNamedTunnel();
  }

  // 3. Start Telegram Bot
  const bot = initBot(webAppUrl);
  botInstance = bot;
  setBotInstance(bot);

  console.log(`\n✅ AstorrIOS System is fully ONLINE!`);
  console.log(`👉 Telegram Bot: @${process.env.BOT_USERNAME || 'AstorrIOS_bot'}`);
  console.log(`👉 Web Mini App URL: ${webAppUrl}\n`);
}

process.on('SIGINT', () => {
  if (tunnelProcess) tunnelProcess.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  if (tunnelProcess) tunnelProcess.kill();
  process.exit();
});

main().catch(err => {
  console.error('Fatal startup error:', err);
});

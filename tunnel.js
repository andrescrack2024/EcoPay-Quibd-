const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('[EcoPay Tunnel] Starting Cloudflare Quick Tunnel for EcoPay Quibdó (Port 3000)...');

const cf = spawn('npx', ['cloudflared', 'tunnel', '--url', 'http://127.0.0.1:3000'], {
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe']
});

let publicUrl = null;

cf.stderr.on('data', (data) => {
  const text = data.toString();
  const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
  if (match && !publicUrl) {
    publicUrl = match[0];
    const outMsg = `\n=======================================================\n` +
                   `🚀 ECOPAY QUIBDÓ ESTÁ EN LÍNEA PÚBLICAMENTE:\n` +
                   `🔗 ENLACE PÚBLICO: ${publicUrl}\n` +
                   `=======================================================\n`;
    console.log(outMsg);
    fs.writeFileSync(path.join(__dirname, 'public-url.txt'), publicUrl, 'utf8');
  }
});

cf.stdout.on('data', (data) => {
  const text = data.toString();
  if (text.includes('trycloudflare.com')) {
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match && !publicUrl) {
      publicUrl = match[0];
      fs.writeFileSync(path.join(__dirname, 'public-url.txt'), publicUrl, 'utf8');
      console.log(`\n🔗 ENLACE PÚBLICO: ${publicUrl}\n`);
    }
  }
});

cf.on('close', (code) => {
  console.log(`[EcoPay Tunnel] Cloudflared process exited with code ${code}`);
});

process.on('SIGINT', () => {
  cf.kill();
  process.exit();
});

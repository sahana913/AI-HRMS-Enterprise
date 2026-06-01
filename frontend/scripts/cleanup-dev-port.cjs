const { execSync } = require('node:child_process');

const port = process.env.VITE_PORT || '5173';

try {
  const output = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
  const rows = output.split(/\r?\n/).filter((line) => line.includes(`:${port}`) && line.includes('LISTENING'));
  const pids = new Set(
    rows
      .map((line) => line.trim().split(/\s+/).at(-1))
      .filter((pid) => pid && pid !== '0' && pid !== String(process.pid))
  );

  for (const pid of pids) {
    console.log(`Stopping existing Vite process on port ${port} (PID ${pid})`);
    execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
  }
} catch (error) {
  console.warn(`Port cleanup skipped: ${error.message}`);
}

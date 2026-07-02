import { execSync } from 'child_process';

const PORT = 5000;

try {
  let pid;
  if (process.platform === 'win32') {
    const output = execSync(`netstat -ano`).toString();
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes(`:${PORT}`) && line.toUpperCase().includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const lastPart = parts[parts.length - 1];
        if (lastPart && !isNaN(lastPart)) {
          pid = lastPart;
          break;
        }
      }
    }
  } else {
    pid = execSync(`lsof -t -i:${PORT}`).toString().trim();
  }

  if (pid && !isNaN(pid) && parseInt(pid) > 4) {
    console.log(`Port ${PORT} is in use by PID ${pid}. Terminating process...`);
    if (process.platform === 'win32') {
      execSync(`taskkill /F /PID ${pid}`);
    } else {
      execSync(`kill -9 ${pid}`);
    }
    console.log(`Port ${PORT} released successfully.`);
  }
} catch (err) {
  // Ignore errors
}

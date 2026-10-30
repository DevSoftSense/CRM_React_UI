/**
 * Custom browser launcher for React Dev Server to ensure Google Chrome opens on Windows
 */
const { exec } = require('child_process');
const fs = require('fs');

const url = process.argv[2] || 'http://localhost:3000';

const candidatePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe` : null
].filter(Boolean);

let chromePath = candidatePaths.find((p) => fs.existsSync(p));

if (chromePath) {
  exec(`start "" "${chromePath}" "${url}"`, (err) => {
    if (err) {
      console.error('Failed to launch Chrome with full path, attempting fallback...', err);
      exec(`start chrome "${url}"`);
    }
  });
} else {
  exec(`start chrome "${url}"`);
}


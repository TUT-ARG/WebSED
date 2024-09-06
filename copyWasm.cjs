const fs = require('fs');
const path = require('path');

const wasmDir = path.resolve(__dirname, 'node_modules/onnxruntime-web/dist');
const destDir = path.resolve(__dirname, 'public');

// Ensure the destination directory exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir);
}

// Copy each WASM file from the source directory to the destination directory
fs.readdir(wasmDir, (err, files) => {
  if (err) {
    console.error('Failed to read the WASM directory:', err);
    return;
  }
  files.forEach(file => {
    if (file.endsWith('.wasm')) {
      fs.copyFileSync(path.join(wasmDir, file), path.join(destDir, file));
      console.log(`Copied ${file} to public directory`);
    }
  });
});
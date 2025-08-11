const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { PYTHON_PATH } = require('../config');

exports.processNewPDF = (filePath, category) => {
  const absPath = path.resolve(filePath);
  const pythonProcess = spawn(PYTHON_PATH, ['auto_pipeline.py', absPath, category], {
    cwd: __dirname,
    shell: true,
  });

  pythonProcess.on('exit', (code) => {
    console.log(`auto_pipeline.py exited with code ${code}`);
  });
};
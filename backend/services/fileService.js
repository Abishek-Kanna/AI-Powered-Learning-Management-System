const path = require('path');
const { spawn } = require('child_process');
const { PYTHON_PATH } = require('../config');

exports.processNewPDF = (filePath, subject, materialId) => {
  const absPath = path.resolve(filePath);
  
  const scriptPath = path.resolve(__dirname, '../pages/auto_pipeline.py');
  
  const pythonProcess = spawn(PYTHON_PATH, [scriptPath, absPath, materialId], {
    cwd: path.dirname(scriptPath), // Sets the working directory to the script's location
    shell: true,
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Python STDOUT]: ${data.toString().trim()}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Python STDERR]: ${data.toString().trim()}`);
  });

  pythonProcess.on('exit', (code) => {
    console.log(`auto_pipeline.py exited with code ${code}`);
    // Future enhancement: Update material status to 'failed' in the DB if exit code is not 0.
  });
};
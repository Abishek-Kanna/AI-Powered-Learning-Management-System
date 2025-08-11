const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { PYTHON_PATH } = require('../config');

exports.generateQuiz = (pdfPath) => {
  return new Promise((resolve, reject) => {
    const pipeline = spawn(PYTHON_PATH, [path.join(__dirname, '../auto_pipeline.py'), pdfPath]);

    let pipelineOutput = '';
    let hasError = false;

    pipeline.stdout.on('data', (data) => {
      pipelineOutput += data.toString();
    });

    pipeline.stderr.on('data', (data) => {
      hasError = true;
      console.error(data.toString());
    });

    pipeline.on('close', (code) => {
      if (code === 0 && !hasError) {
        let pdfName = null;
        try {
          const lines = pipelineOutput.trim().split('\n');
          for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line) {
              const status = JSON.parse(line);
              if (status.pdf_name) {
                pdfName = status.pdf_name;
                break;
              }
            }
          }
        } catch (e) {}

        resolve({
          success: true,
          message: 'Quiz generated successfully',
          pdfName: pdfName || path.basename(pdfPath).replace('.pdf', ''),
          filePath: pdfPath
        });
      } else {
        reject(new Error('Failed to generate quiz'));
      }
    });

    pipeline.on('error', (err) => {
      reject(new Error('Failed to start quiz generation pipeline'));
    });
  });
};

exports.getQuiz = (category, pdfName) => {
  const safeName = pdfName.replace(/\s+/g, '_').replace(/,/g, '');
  let quizPath = path.join(__dirname, '../generated_quizzes', category, `${safeName}_llama_context_quiz.json`);
  
  if (!fs.existsSync(quizPath)) {
    const alternativeNames = [
      `${safeName}.json`,
      `${safeName}_quiz.json`,
      `${safeName}_llama_context_quiz.json`
    ];
    
    let foundPath = null;
    for (const altName of alternativeNames) {
      const altPath = path.join(__dirname, '../generated_quizzes', category, altName);
      if (fs.existsSync(altPath)) {
        foundPath = altPath;
        break;
      }
    }
    
    if (!foundPath) {
      const error = new Error('Quiz not found');
      error.status = 404;
      throw error;
    }
    quizPath = foundPath;
  }
  
  return JSON.parse(fs.readFileSync(quizPath, 'utf8'));
};

exports.getQuizList = (category) => {
  const categoryDir = path.join(__dirname, '../generated_quizzes', category);
  
  if (!fs.existsSync(categoryDir)) {
    return { quizzes: [] };
  }
  
  const allFiles = fs.readdirSync(categoryDir);
  const jsonFiles = allFiles
    .filter(file => file.toLowerCase().endsWith('.json'))
    .map(file => {
      const filePath = path.join(categoryDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file.replace('.json', '').replace(/_llama_context_quiz$/, ''),
        path: `${category}/${file}`,
        created: stats.mtime.toISOString(),
        size: stats.size
      };
    });
  
  return { quizzes: jsonFiles, category };
};
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { PYTHON_PATH } = require('../config');

exports.triggerTutor = (data) => {
  return new Promise((resolve, reject) => {
    try {
      const { pdfName } = data;
      
      if (!pdfName) {
        return reject(new Error('PDF name is required'));
      }

      const safeName = pdfName.replace(/\s+/g, '_').replace(/,/g, '');
      const tutorScriptPath = path.join(__dirname, '../ai_tutor.py');
      
      if (!fs.existsSync(tutorScriptPath)) {
        return reject(new Error('AI tutor script not found'));
      }
      
      const userAnswersDir = path.join(__dirname, '../user_answers');
      if (!fs.existsSync(userAnswersDir)) {
        return reject(new Error('User answers directory not found'));
      }

      // Find the most recent user answers file
      const files = fs.readdirSync(userAnswersDir)
        .filter(file => file.startsWith(safeName) && file.endsWith('_user_answers.json'));

      if (files.length === 0) {
        return reject(new Error('User answers not found'));
      }

      let latestFile = files[0];
      let latestMtime = fs.statSync(path.join(userAnswersDir, latestFile)).mtime;

      for (const file of files) {
        const filePath = path.join(userAnswersDir, file);
        const mtime = fs.statSync(filePath).mtime;
        if (mtime > latestMtime) {
          latestMtime = mtime;
          latestFile = file;
        }
      }

      const userAnswersPath = path.join(userAnswersDir, latestFile);
      
      // Find the quiz file
      const quizzesDir = path.join(__dirname, '../generated_quizzes');
      let quizPath = null;
      
      if (fs.existsSync(quizzesDir)) {
        const categories = fs.readdirSync(quizzesDir).filter(item => {
          const itemPath = path.join(quizzesDir, item);
          return fs.statSync(itemPath).isDirectory();
        });
        
        for (const category of categories) {
          const possiblePaths = [
            path.join(quizzesDir, category, `${safeName}_llama_context_quiz.json`),
            path.join(quizzesDir, category, `${safeName}.json`),
            path.join(quizzesDir, category, `${safeName}_quiz.json`)
          ];
          
          for (const possiblePath of possiblePaths) {
            if (fs.existsSync(possiblePath)) {
              quizPath = possiblePath;
              break;
            }
          }
          if (quizPath) break;
        }
      }

      if (!quizPath) {
        return reject(new Error('Quiz not found'));
      }

      // Run the AI tutor process
      const tutorProcess = spawn(PYTHON_PATH, ['ai_tutor.py', quizPath, userAnswersPath], {
        cwd: path.join(__dirname, '..'),
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdoutData = '';
      let stderrData = '';

      tutorProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      tutorProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      tutorProcess.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            message: 'AI tutor completed successfully',
            stdout: stdoutData
          });
        } else {
          reject({
            error: 'AI tutor failed',
            code: code,
            stdout: stdoutData,
            stderr: stderrData
          });
        }
      });

      tutorProcess.on('error', (err) => {
        reject({
          error: 'Failed to start AI tutor process',
          details: err.message
        });
      });

    } catch (error) {
      reject({
        error: 'Failed to trigger AI tutor',
        details: error.message
      });
    }
  });
};

exports.getTutorExplanations = (pdfName) => {
  try {
    const safeName = pdfName.replace(/\s+/g, '_').replace(/,/g, '');
    const tutorDir = path.join(__dirname, '../tutor_explanations');
    
    if (!fs.existsSync(tutorDir)) {
      const error = new Error('Tutor directory not found');
      error.status = 404;
      throw error;
    }
    
    const files = fs.readdirSync(tutorDir);
    const tutorFiles = files
      .filter(file => file.startsWith(safeName) && file.endsWith('_tutor_explanations.json'))
      .sort((a, b) => {
        const timestampA = parseInt(a.match(/_(\d+)_tutor_explanations\.json$/)?.[1] || '0');
        const timestampB = parseInt(b.match(/_(\d+)_tutor_explanations\.json$/)?.[1] || '0');
        return timestampB - timestampA;
      });
    
    if (tutorFiles.length === 0) {
      const error = new Error('Tutor explanations not found');
      error.status = 404;
      throw error;
    }
    
    const tutorOutputPath = path.join(tutorDir, tutorFiles[0]);
    if (!fs.existsSync(tutorOutputPath)) {
      const error = new Error('Tutor explanations file not found');
      error.status = 404;
      throw error;
    }
    
    const explanations = JSON.parse(fs.readFileSync(tutorOutputPath, 'utf8'));
    
    // Clean up markdown formatting
    const cleanedExplanations = explanations.map(explanation => ({
      ...explanation,
      explanation: explanation.explanation
        ? explanation.explanation
            .replace(/\*\*(.*?)\*\*/g, '$1')      // Remove bold
            .replace(/\*(.*?)\*/g, '$1')          // Remove italics
            .replace(/`(.*?)`/g, '$1')            // Remove inline code
            .replace(/#{1,6}\s/g, '')             // Remove headings
            .replace(/\[(.*?)\]\(.*?\)/g, '$1')   // Remove markdown links
            .trim()
        : explanation.explanation
    }));
    
    return cleanedExplanations;
    
  } catch (error) {
    if (error.status) {
      throw error;
    }
    const serverError = new Error('Failed to read tutor explanations');
    serverError.details = error.message;
    serverError.status = 500;
    throw serverError;
  }
};

// Helper function to clean up old tutor explanation files
exports.cleanupOldTutorFiles = (maxFilesPerPdf = 3) => {
  try {
    const tutorDir = path.join(__dirname, '../tutor_explanations');
    
    if (!fs.existsSync(tutorDir)) {
      return { cleaned: 0, total: 0 };
    }
    
    const files = fs.readdirSync(tutorDir);
    const fileGroups = {};
    
    // Group files by base name
    files.forEach(file => {
      if (file.endsWith('_tutor_explanations.json')) {
        const baseName = file.replace(/_\d+_tutor_explanations\.json$/, '');
        if (!fileGroups[baseName]) {
          fileGroups[baseName] = [];
        }
        fileGroups[baseName].push(file);
      }
    });
    
    let cleanedCount = 0;
    
    // Process each group
    Object.values(fileGroups).forEach(group => {
      if (group.length > maxFilesPerPdf) {
        // Sort by timestamp (newest first)
        group.sort((a, b) => {
          const timestampA = parseInt(a.match(/_(\d+)_tutor_explanations\.json$/)?.[1] || '0');
          const timestampB = parseInt(b.match(/_(\d+)_tutor_explanations\.json$/)?.[1] || '0');
          return timestampB - timestampA;
        });
        
        // Keep only the newest N files
        const filesToDelete = group.slice(maxFilesPerPdf);
        
        // Delete old files
        filesToDelete.forEach(file => {
          try {
            fs.unlinkSync(path.join(tutorDir, file));
            cleanedCount++;
          } catch (err) {
            console.error(`Failed to delete old tutor file: ${file}`, err);
          }
        });
      }
    });
    
    return {
      cleaned: cleanedCount,
      total: files.length,
      remaining: files.length - cleanedCount
    };
  } catch (error) {
    console.error('Failed to clean up old tutor files:', error);
    return { error: error.message };
  }
};
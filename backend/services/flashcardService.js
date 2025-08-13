const path = require('path');
const fs = require('fs');

/**
 * Gets a list of available flashcard sets for a category.
 */
exports.getFlashcardList = (category) => {
  // --- THIS PATH IS NOW CORRECTED ---
  // It now looks inside the 'pages' directory.
  const categoryDir = path.join(__dirname, '../pages/generated_flashcards', category);
  
  if (!fs.existsSync(categoryDir)) {
    return { flashcards: [] };
  }
  
  const allFiles = fs.readdirSync(categoryDir);
  const jsonFiles = allFiles
    .filter(file => file.toLowerCase().endsWith('.json'))
    .map(file => {
      const filePath = path.join(categoryDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file.replace('.json', '').replace(/_flashcards$/, '').replace(/_/g, ' '),
        filename: file,
        created: stats.mtime.toISOString(),
        size: stats.size
      };
    })
    .sort((a, b) => new Date(b.created) - new Date(a.created));
  
  return { flashcards: jsonFiles, category };
};

/**
 * Gets the content of a single flashcard file.
 */
exports.getFlashcards = (category, filename) => {
  // --- THIS PATH IS ALSO CORRECTED ---
  const filePath = path.join(__dirname, '../pages/generated_flashcards', category, filename);
  
  if (!fs.existsSync(filePath)) {
    const error = new Error('Flashcard file not found');
    error.status = 404;
    throw error;
  }
  
  const fileContent = fs.readFileSync(filePath, 'utf8');
  let flashcardData;
  
  try {
    flashcardData = JSON.parse(fileContent);
  } catch (parseError) {
    const error = new Error('Invalid JSON format in flashcard file');
    error.status = 500;
    throw error;
  }
  
  if (!Array.isArray(flashcardData)) {
    const error = new Error('Invalid flashcard format: data is not an array');
    error.status = 500;
    throw error;
  }
  
  return flashcardData.filter(card => card && typeof card === 'object' && card.question && card.answer);
};
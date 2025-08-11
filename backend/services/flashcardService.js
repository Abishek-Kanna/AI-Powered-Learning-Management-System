const path = require('path');
const fs = require('fs');

exports.getFlashcardList = (category) => {
  const categoryDir = path.join(__dirname, '../generated_flashcards', category);
  
  if (!fs.existsSync(categoryDir)) {
    return { flashcards: [] };
  }
  
  const allFiles = fs.readdirSync(categoryDir);
  const jsonFiles = allFiles.filter(file => file.toLowerCase().endsWith('.json'));
  const flashcardNames = jsonFiles.map(file => file.replace('.json', ''));
  
  return { flashcards: flashcardNames, category };
};

exports.getFlashcards = (category, flashcardName) => {
  const categoryDir = path.join(__dirname, '../generated_flashcards', category);
  
  if (!fs.existsSync(categoryDir)) {
    const error = new Error('Category directory not found');
    error.status = 404;
    throw error;
  }
  
  const possibleFilenames = [
    `${flashcardName}.json`,
    `${flashcardName}_flashcards.json`,
    `${flashcardName}_llama_context_flashcards.json`
  ];
  
  let foundFilePath = null;
  
  for (const filename of possibleFilenames) {
    const filePath = path.join(categoryDir, filename);
    if (fs.existsSync(filePath)) {
      foundFilePath = filePath;
      break;
    }
  }
  
  if (!foundFilePath) {
    const files = fs.readdirSync(categoryDir);
    const requestedNameLower = flashcardName.toLowerCase();
    
    for (const file of files) {
      if (file.toLowerCase().endsWith('.json')) {
        const fileNameWithoutExt = file.replace('.json', '').toLowerCase();
        if (fileNameWithoutExt === requestedNameLower || 
            fileNameWithoutExt.includes(requestedNameLower)) {
          foundFilePath = path.join(categoryDir, file);
          break;
        }
      }
    }
  }
  
  if (!foundFilePath) {
    const error = new Error('Flashcard file not found');
    error.status = 404;
    throw error;
  }
  
  const fileContent = fs.readFileSync(foundFilePath, 'utf8');
  let flashcardData;
  
  try {
    flashcardData = JSON.parse(fileContent);
  } catch (parseError) {
    const error = new Error('Invalid JSON format');
    error.status = 400;
    throw error;
  }
  
  if (!Array.isArray(flashcardData)) {
    const error = new Error('Invalid flashcard format');
    error.status = 400;
    throw error;
  }
  
  return flashcardData.filter(card => card && typeof card === 'object' && card.question && card.answer);
};
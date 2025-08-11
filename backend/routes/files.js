const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { memoryUpload } = require('../middlewares/uploadMiddleware');
const { processNewPDF } = require('../services/fileService');
const Material = require('../models/Material');
const { protect, teacherOnly } = require('../middlewares/authMiddleware');

router.use(protect, teacherOnly);

/**
 * @route   POST /api/files/upload
 * @desc    Handles PDF upload for the currently logged-in teacher.
 * @access  Private (Teachers only)
 */
router.post('/upload', memoryUpload.single('pdf'), async (req, res) => {
  try {
    const { subject } = req.body;
    const allowedSubjects = ['python', 'java', 'cpp', 'c', 'mixed'];

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }
    if (!subject || !allowedSubjects.includes(subject.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid subject specified.' });
    }

    const dir = path.join(__dirname, `../input_pdfs/${subject}`);
    fs.mkdirSync(dir, { recursive: true });

    const cleanName = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
    const finalPath = path.join(dir, cleanName);

    await fs.promises.writeFile(finalPath, req.file.buffer);

    const newMaterial = new Material({
      originalName: req.file.originalname,
      filename: cleanName,
      filePath: finalPath,
      subject: subject.toLowerCase(),
      status: 'processing',
      uploadedBy: req.user.id,
    });
    await newMaterial.save();
    
    processNewPDF(finalPath, subject, newMaterial._id);

    res.status(201).json({ 
      message: 'File uploaded successfully and is now being processed.',
      material: newMaterial,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'An internal server error occurred during file upload.' });
  }
});

/**
 * @route   GET /api/files/materials
 * @desc    Fetches all materials for the currently logged-in teacher.
 * @access  Private (Teachers only)
 */
router.get('/materials', async (req, res) => {
  try {
    const materials = await Material.find({ uploadedBy: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(materials);
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: 'An internal server error occurred while fetching materials.' });
  }
});

module.exports = router;
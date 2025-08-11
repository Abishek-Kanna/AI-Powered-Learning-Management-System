const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  originalName: {
    type: String,
    required: true,
    trim: true,
  },
  // The name of the file as saved on the server
  filename: {
    type: String,
    required: true,
    unique: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
    enum: ['python', 'java', 'cpp', 'c', 'mixed'],
  },
  // We'll use this to track the AI pipeline's progress
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing',
  },
  // Link to the teacher who uploaded it
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Material', materialSchema);
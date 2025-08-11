module.exports = {
  PYTHON_PATH: process.env.PYTHON_PATH || 'python3', // Default to 'python3' if not set
  UPLOAD_LIMIT: process.env.UPLOAD_LIMIT || '10mb',
  ALLOWED_SUBJECTS: ['python', 'java', 'cpp', 'c', 'mixed'],
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key'
};
const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { uploadLimiter } = require('../middlewares/rateLimiter');
const upload = require('../middlewares/upload');
const { uploadFile } = require('../controllers/mediaController');

router.post('/upload', protect, uploadLimiter, upload.single('file'), uploadFile);

module.exports = router;

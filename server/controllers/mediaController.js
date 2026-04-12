const { uploadToCloudinary } = require('../services/cloudinaryService');

// POST /api/media/upload
const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided.' });
    }

    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'whispr/media',
    });

    res.json({
      url: result.url,
      resourceType: result.resourceType,
      format: result.format,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadFile };

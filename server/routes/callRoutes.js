const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { getCallToken } = require('../controllers/callController');

// All call routes are protected
router.use(protect);

router.get('/token', getCallToken);

module.exports = router;

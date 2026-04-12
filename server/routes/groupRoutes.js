const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  createGroup,
  updateGroup,
  addMembers,
  removeMember,
  leaveGroup,
} = require('../controllers/groupController');

router.post('/', protect, createGroup);
router.put('/:id', protect, updateGroup);
router.post('/:id/members', protect, addMembers);
router.delete('/:id/members/:userId', protect, removeMember);
router.delete('/:id/leave', protect, leaveGroup);

module.exports = router;

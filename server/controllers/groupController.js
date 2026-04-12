const Group = require('../models/Group');
const Chat = require('../models/Chat');
const User = require('../models/User');

// POST /api/groups
const createGroup = async (req, res, next) => {
  try {
    const { name, members } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Group name is required.' });
    }
    if (!members || members.length < 1) {
      return res.status(400).json({ message: 'At least 1 member is required.' });
    }

    const allMembers = [...new Set([req.user._id.toString(), ...members])];

    const group = await Group.create({
      name,
      admin: req.user._id,
      members: allMembers,
    });

    const chat = await Chat.create({
      participants: allMembers,
      isGroup: true,
      groupId: group._id,
      lastMessage: {
        text: `${req.user.username} created group "${name}"`,
        senderId: req.user._id,
        timestamp: new Date(),
      },
    });

    const populated = await Chat.findById(chat._id)
      .populate('participants', 'username avatar isOnline lastSeen')
      .populate('groupId', 'name avatar admin members')
      .lean();

    res.status(201).json({ chat: populated, group });
  } catch (error) {
    next(error);
  }
};

// PUT /api/groups/:id
const updateGroup = async (req, res, next) => {
  try {
    const { name } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found.' });
    }
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only group admin can update.' });
    }

    if (name) group.name = name;
    await group.save();

    res.json({ group });
  } catch (error) {
    next(error);
  }
};

// POST /api/groups/:id/members
const addMembers = async (req, res, next) => {
  try {
    const { memberIds } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found.' });
    }
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only admin can add members.' });
    }

    const newMembers = memberIds.filter((id) => !group.members.includes(id));
    group.members.push(...newMembers);
    await group.save();

    // Also update the chat's participants
    await Chat.findOneAndUpdate(
      { groupId: group._id },
      { $addToSet: { participants: { $each: newMembers } } }
    );

    const updatedGroup = await Group.findById(group._id).populate('members', 'username avatar');
    res.json({ group: updatedGroup });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/groups/:id/members/:userId
const removeMember = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found.' });
    }
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only admin can remove members.' });
    }
    if (req.params.userId === group.admin.toString()) {
      return res.status(400).json({ message: 'Cannot remove admin.' });
    }

    group.members.pull(req.params.userId);
    await group.save();

    await Chat.findOneAndUpdate(
      { groupId: group._id },
      { $pull: { participants: req.params.userId } }
    );

    res.json({ message: 'Member removed.' });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/groups/:id/leave
const leaveGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found.' });
    }
    if (group.admin.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Admin cannot leave. Transfer ownership first.' });
    }

    group.members.pull(req.user._id);
    await group.save();

    await Chat.findOneAndUpdate(
      { groupId: group._id },
      { $pull: { participants: req.user._id } }
    );

    res.json({ message: 'Left group.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createGroup, updateGroup, addMembers, removeMember, leaveGroup };

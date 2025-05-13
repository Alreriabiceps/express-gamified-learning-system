const express = require('express');
const router = express.Router();
const matchQueue = require('../services/matchQueue');

// Add to queue
router.post('/queue', (req, res) => {
  const { studentId } = req.body;
  if (!studentId) return res.status(400).json({ error: 'studentId required' });
  const result = matchQueue.addToQueue(studentId);
  res.json(result);
});

// Remove from queue
router.post('/cancel', (req, res) => {
  const { studentId } = req.body;
  if (!studentId) return res.status(400).json({ error: 'studentId required' });
  matchQueue.removeFromQueue(studentId);
  res.json({ success: true });
});

// Get match status
router.get('/status', (req, res) => {
  const { studentId } = req.query;
  if (!studentId) return res.status(400).json({ error: 'studentId required' });
  const result = matchQueue.getMatchStatus(studentId);
  res.json(result);
});

// Accept match
router.post('/accept', (req, res) => {
  const { studentId, lobbyId, timeout } = req.body;
  if (!studentId || !lobbyId) return res.status(400).json({ error: 'studentId and lobbyId required' });
  if (timeout) {
    matchQueue.setBan(studentId);
    matchQueue.removeFromQueue(studentId);
    return res.json({ banned: true, ban: matchQueue.getBan(studentId) });
  }
  matchQueue.setAccept(lobbyId, studentId);
  const accepts = matchQueue.getAccept(lobbyId);
  // If both accepted, return ready
  if (Object.keys(accepts).length >= 2 && Object.values(accepts).every(Boolean)) {
    // Optionally: clear accept state here
    return res.json({ ready: true });
  }
  res.json({ accepted: true });
});

// Get ban status
router.get('/ban-status', (req, res) => {
  const { studentId } = req.query;
  if (!studentId) return res.status(400).json({ error: 'studentId required' });
  const ban = matchQueue.getBan(studentId);
  if (ban) return res.json({ banned: true, ban });
  res.json({ banned: false });
});

module.exports = router; 
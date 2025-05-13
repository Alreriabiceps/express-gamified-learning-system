// In-memory match queue for students
const queue = [];
const matches = {};
const lobbies = {};
let lobbyCounter = 1;
const bans = {}; // { studentId: { until: Date, strikes: number, lastStrike: Date } }
const accepts = {}; // { lobbyId: { [studentId]: true/false } }
const BAN_STEPS = [
  1 * 60,      // 1st Offense: 1 minute
  3 * 60,      // 2nd Offense: 3 minutes
  5 * 60,      // 3rd Offense: 5 minutes
  10 * 60,     // 4th Offense: 10 minutes
  30 * 60,     // 5th Offense: 30 minutes
  60 * 60,     // 6th Offense: 1 hour
  6 * 60 * 60, // 7th Offense: 6 hours
  24 * 60 * 60 // 8th Offense: 1 day
]; // seconds

function generateLobbyId() {
  return 'lobby_' + (lobbyCounter++);
}

function getBan(studentId) {
  studentId = String(studentId);
  const ban = bans[studentId];
  if (!ban) return null;
  const now = Date.now();
  if (ban.until > now) {
    return { until: ban.until, seconds: Math.ceil((ban.until - now) / 1000), strikes: ban.strikes };
  } else {
    delete bans[studentId];
    return null;
  }
}

function setBan(studentId) {
  studentId = String(studentId);
  const now = Date.now();
  let strikes = 0;
  if (bans[studentId]) {
    // Escalate if last strike was within 24h
    if (now - bans[studentId].lastStrike < 24 * 60 * 60 * 1000) {
      strikes = Math.min(bans[studentId].strikes + 1, BAN_STEPS.length - 1);
    }
  }
  const duration = BAN_STEPS[strikes] * 1000;
  bans[studentId] = {
    until: now + duration,
    strikes,
    lastStrike: now
  };
}

function clearBan(studentId) {
  studentId = String(studentId);
  delete bans[studentId];
}

function setAccept(lobbyId, studentId) {
  lobbyId = String(lobbyId);
  studentId = String(studentId);
  if (!accepts[lobbyId]) accepts[lobbyId] = {};
  accepts[lobbyId][studentId] = true;
}

function getAccept(lobbyId) {
  lobbyId = String(lobbyId);
  return accepts[lobbyId] || {};
}

function addToQueue(studentId) {
  studentId = String(studentId);
  if (getBan(studentId)) {
    return { matched: false, banned: true, ban: getBan(studentId) };
  }
  // If already matched, return match only if opponent is not self
  if (matches[studentId] && matches[studentId] !== studentId) {
    const opponent = matches[studentId];
    const lobbyId = lobbies[studentId] || lobbies[opponent];
    return { matched: true, opponent, lobbyId };
  }
  // If already in queue, do nothing
  if (queue.includes(studentId)) return { matched: false };
  // If someone else is waiting, match them
  if (queue.length > 0) {
    const opponentId = queue.shift();
    if (opponentId === studentId) {
      // Should never happen, but just in case
      return { matched: false };
    }
    matches[studentId] = opponentId;
    matches[opponentId] = studentId;
    const lobbyId = generateLobbyId();
    lobbies[studentId] = lobbyId;
    lobbies[opponentId] = lobbyId;
    return { matched: true, opponent: opponentId, lobbyId };
  }
  // Otherwise, add to queue
  queue.push(studentId);
  return { matched: false };
}

function removeFromQueue(studentId) {
  studentId = String(studentId);
  const idx = queue.indexOf(studentId);
  if (idx !== -1) queue.splice(idx, 1);
  delete matches[studentId];
  delete lobbies[studentId];
  // Remove from accepts
  Object.keys(accepts).forEach(lobbyId => {
    if (accepts[lobbyId][studentId]) delete accepts[lobbyId][studentId];
  });
}

function getMatchStatus(studentId) {
  studentId = String(studentId);
  if (getBan(studentId)) {
    return { matched: false, banned: true, ban: getBan(studentId) };
  }
  if (matches[studentId] && matches[studentId] !== studentId) {
    const opponent = matches[studentId];
    const lobbyId = lobbies[studentId] || lobbies[opponent];
    return { matched: true, opponent, lobbyId };
  }
  return { matched: false };
}

module.exports = {
  addToQueue,
  removeFromQueue,
  getMatchStatus,
  setBan,
  getBan,
  clearBan,
  setAccept,
  getAccept
}; 
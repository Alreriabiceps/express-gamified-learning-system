// In-memory match queue for students
const queue = [];
const matches = {};
const lobbies = {};
let lobbyCounter = 1;
const bans = {}; // { studentId: { until: Date, strikes: number, lastStrike: Date } }
const accepts = {}; // { lobbyId: { [studentId]: true/false } }
const BAN_STEPS = [
  1 * 60, // 1st Offense: 1 minute
  3 * 60, // 2nd Offense: 3 minutes
  5 * 60, // 3rd Offense: 5 minutes
  10 * 60, // 4th Offense: 10 minutes
  30 * 60, // 5th Offense: 30 minutes
  60 * 60, // 6th Offense: 1 hour
  6 * 60 * 60, // 7th Offense: 6 hours
  24 * 60 * 60, // 8th Offense: 1 day
]; // seconds

// Socket service reference (will be set by initializeSocket)
let socketService = null;

// Student model reference (will be set by initializeStudentModel)
let StudentModel = null;

function generateLobbyId() {
  return "lobby_" + lobbyCounter++;
}

function getBan(studentId) {
  studentId = String(studentId);
  const ban = bans[studentId];
  if (!ban) return null;
  const now = Date.now();
  if (ban.until > now) {
    return {
      until: ban.until,
      seconds: Math.ceil((ban.until - now) / 1000),
      strikes: ban.strikes,
    };
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
    lastStrike: now,
  };
}

function clearBan(studentId) {
  studentId = String(studentId);
  delete bans[studentId];
}

// Initialize socket service reference
function initializeSocket(socketServiceInstance) {
  socketService = socketServiceInstance;
}

// Initialize student model reference
function initializeStudentModel(studentModel) {
  StudentModel = studentModel;
}

// Get student full name by ID
async function getStudentName(studentId) {
  console.log("🔍 getStudentName called with studentId:", studentId);
  console.log("🔍 StudentModel exists:", !!StudentModel);

  if (!StudentModel) {
    console.warn("⚠️ Student model not initialized");
    return "Unknown Player";
  }

  try {
    console.log("🔍 Searching for student in database...");
    const student = await StudentModel.findById(studentId);
    console.log("🔍 Database result:", student ? "Found" : "Not found");

    if (student) {
      const fullName = `${student.firstName} ${student.lastName}`;
      console.log("🔍 Student full name:", fullName);
      return fullName;
    }
    console.log("🔍 Student not found, returning 'Unknown Player'");
    return "Unknown Player";
  } catch (error) {
    console.error("❌ Error fetching student name:", error);
    return "Unknown Player";
  }
}

// Emit match found event to both players
async function emitMatchFound(studentId1, studentId2, lobbyId) {
  console.log("🔍 emitMatchFound called with:", {
    studentId1,
    studentId2,
    lobbyId,
  });
  console.log("🔍 socketService exists:", !!socketService);

  if (socketService) {
    try {
      const io = socketService.getIo();
      console.log("🔍 io instance exists:", !!io);

      if (!io) {
        console.error("❌ io instance is null or undefined");
        return;
      }

      // Get both players' names
      const [player1Name, player2Name] = await Promise.all([
        getStudentName(studentId1),
        getStudentName(studentId2),
      ]);

      console.log("🔍 Player names:", { player1Name, player2Name });

      // Emit to first player
      io.to(studentId1).emit("match_found", {
        lobbyId,
        opponent: studentId2,
        opponentName: player2Name,
        matched: true,
      });

      // Emit to second player
      io.to(studentId2).emit("match_found", {
        lobbyId,
        opponent: studentId1,
        opponentName: player1Name,
        matched: true,
      });

      console.log(
        `📡 Emitted match_found events to ${player1Name} (${studentId1}) and ${player2Name} (${studentId2}) for lobby ${lobbyId}`
      );
    } catch (error) {
      console.error("❌ Error emitting match_found events:", error);
    }
  } else {
    console.warn(
      "⚠️ Socket service not initialized, cannot emit match_found events"
    );
  }
}

// Emit match ready event to both players (both accepted)
async function emitMatchReady(studentId1, studentId2, lobbyId) {
  console.log("🔍 emitMatchReady called with:", {
    studentId1,
    studentId2,
    lobbyId,
  });

  if (socketService) {
    try {
      const io = socketService.getIo();
      if (!io) {
        console.error("❌ io instance is null or undefined");
        return;
      }

      // Get both players' names
      const [player1Name, player2Name] = await Promise.all([
        getStudentName(studentId1),
        getStudentName(studentId2),
      ]);

      console.log("🔍 Player names for match_ready:", {
        player1Name,
        player2Name,
      });

      // Emit to first player
      io.to(studentId1).emit("match_ready", {
        lobbyId,
        opponent: studentId2,
        opponentName: player2Name,
        ready: true,
      });

      // Emit to second player
      io.to(studentId2).emit("match_ready", {
        lobbyId,
        opponent: studentId1,
        opponentName: player1Name,
        ready: true,
      });

      console.log(
        `📡 Emitted match_ready events to ${player1Name} (${studentId1}) and ${player2Name} (${studentId2}) for lobby ${lobbyId}`
      );
    } catch (error) {
      console.error("❌ Error emitting match_ready events:", error);
    }
  } else {
    console.warn(
      "⚠️ Socket service not initialized, cannot emit match_ready events"
    );
  }
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

async function addToQueue(studentId) {
  studentId = String(studentId);
  console.log(`🎯 addToQueue called for studentId: ${studentId}`);
  console.log(`📊 Current queue state:`, { queue, matches, lobbies });

  if (getBan(studentId)) {
    console.log(`❌ Student ${studentId} is banned`);
    return { matched: false, banned: true, ban: getBan(studentId) };
  }

  // Clear any existing matches when joining queue (fresh start)
  if (matches[studentId]) {
    console.log(`🧹 Clearing existing match for ${studentId}`);
    const oldOpponent = matches[studentId];
    delete matches[oldOpponent];
    delete lobbies[studentId];
    delete lobbies[oldOpponent];
  }

  // If already in queue, do nothing
  if (queue.includes(studentId)) {
    console.log(`⏳ Student ${studentId} already in queue`);
    return { matched: false };
  }

  // If someone else is waiting, match them
  if (queue.length > 0) {
    console.log(`🎮 Matching ${studentId} with waiting opponent`);
    const opponentId = queue.shift();
    if (opponentId === studentId) {
      // Should never happen, but just in case
      console.log(`⚠️ Opponent is self, adding to queue instead`);
      queue.push(studentId);
      return { matched: false };
    }
    matches[studentId] = opponentId;
    matches[opponentId] = studentId;
    const lobbyId = generateLobbyId();
    lobbies[studentId] = lobbyId;
    lobbies[opponentId] = lobbyId;
    console.log(
      `✅ Match created: ${studentId} with ${opponentId} in lobby ${lobbyId}`
    );

    // Get opponent's name
    const opponentName = await getStudentName(opponentId);
    console.log("🔍 Opponent name retrieved:", opponentName);

    // Emit match found event to both players
    await emitMatchFound(studentId, opponentId, lobbyId);

    const result = {
      matched: true,
      opponent: opponentId,
      opponentName,
      lobbyId,
    };
    console.log("🔍 Returning result:", result);
    return result;
  }

  // Otherwise, add to queue
  console.log(`⏳ Adding ${studentId} to queue (${queue.length + 1} waiting)`);
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
  Object.keys(accepts).forEach((lobbyId) => {
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
  getAccept,
  emitMatchReady,
  initializeSocket,
  initializeStudentModel,
};

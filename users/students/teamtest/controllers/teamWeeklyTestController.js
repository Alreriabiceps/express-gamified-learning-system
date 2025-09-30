const TeamWeeklyAttempt = require("../models/teamWeeklyAttemptModel");
const UserWeeklyAttempt = require("../models/userWeeklyAttemptModel");
const WeekSchedule = require("../../../admin/week/models/weekModel");
const Question = require("../../../admin/question/models/questionModels");
const socketService = require("../../../../services/socketService");

// Ensure all users in roster are eligible (no prior attempt this week)
async function ensureEligibility(weekId, rosterUserIds) {
  const existing = await UserWeeklyAttempt.find({
    weekId,
    userId: { $in: rosterUserIds },
  });
  if (existing.length > 0) {
    const blocked = existing.map((e) => e.userId.toString());
    const error = new Error("Some users already attempted this week");
    error.code = "INELIGIBLE";
    error.blocked = blocked;
    throw error;
  }
}

exports.startTeamTest = async (req, res) => {
  try {
    const { weekId, roster, partyId } = req.body;
    if (!weekId || !Array.isArray(roster) || roster.length < 2) {
      return res
        .status(400)
        .json({ message: "weekId and roster (>=2) required" });
    }
    const week = await WeekSchedule.findById(weekId).populate(
      "questionIds",
      "questionText choices correctAnswer bloomsLevel"
    );
    if (!week || !week.isActive) {
      return res.status(404).json({ message: "Active week not found" });
    }

    await ensureEligibility(weekId, roster);

    // Extra safety: also disallow if a TestResult already exists for any user in roster
    // so solo completions also lock team mode
    try {
      const TestResult = require("../../weeklytest/models/testResultModel");
      const hasSolo = await TestResult.find({
        weekScheduleId: weekId,
        studentId: { $in: roster },
      }).limit(1);
      if (hasSolo && hasSolo.length > 0) {
        const error = new Error(
          "Some users already completed this weekly test (solo)"
        );
        error.code = "INELIGIBLE";
        error.blocked = roster; // Frontend can filter with actual ids if needed
        throw error;
      }
    } catch (e) {
      if (e.code === "INELIGIBLE") throw e;
      // if query fails, continue with normal flow
    }

    const attempt = await TeamWeeklyAttempt.create({
      weekId,
      subjectId: week.subjectId,
      partyId: partyId || null,
      roster,
      currentIndex: 0,
      turnIndex: 0,
      status: "active",
      questions: week.questionIds.map((q) => ({
        questionId: q._id,
        selected: null,
        correctAnswer: q.correctAnswer,
        isCorrect: null,
      })),
    });

    // Pre-create attempt records with mode=party to lock eligibility
    await Promise.all(
      roster.map((uid) =>
        UserWeeklyAttempt.create({
          userId: uid,
          weekId,
          mode: "party",
          attemptId: attempt._id,
        })
      )
    );

    // Notify room subscribers and roster members to navigate
    try {
      const io = socketService.getIo();
      if (io) {
        io.to(`teamtest:${attempt._id}`).emit("teamtest:state", { attempt });
        attempt.roster.forEach((uid) => {
          try {
            io.to(uid.toString()).emit("teamtest:started", {
              attemptId: attempt._id,
            });
          } catch {}
        });
      }
    } catch {}
    res.status(201).json({ attemptId: attempt._id, attempt });
  } catch (err) {
    if (err.code === "INELIGIBLE") {
      return res
        .status(409)
        .json({ message: err.message, blocked: err.blocked });
    }
    console.error("startTeamTest error", err);
    res.status(500).json({ message: "Failed to start team test" });
  }
};

exports.getState = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const attempt = await TeamWeeklyAttempt.findById(attemptId)
      .populate("questions.questionId", "questionText choices bloomsLevel")
      .populate("roster", "firstName lastName studentId")
      .lean();
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    res.json({ attempt });
  } catch (err) {
    console.error("getState error", err);
    res.status(500).json({ message: "Failed to load attempt" });
  }
};

exports.answer = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { selected } = req.body;
    const attempt = await TeamWeeklyAttempt.findById(attemptId);
    if (!attempt || attempt.status !== "active") {
      return res.status(400).json({ message: "Attempt not active" });
    }
    const actorId = req.user?.id?.toString();
    const activeUserId = attempt.roster[attempt.turnIndex]?.toString();
    if (!actorId || actorId !== activeUserId) {
      return res.status(403).json({ message: "Not your turn" });
    }
    const q = attempt.questions[attempt.currentIndex];
    if (!q) return res.status(400).json({ message: "No current question" });
    q.selected = selected;
    q.isCorrect = selected === q.correctAnswer;
    // advance
    attempt.currentIndex += 1;
    attempt.turnIndex = (attempt.turnIndex + 1) % attempt.roster.length;
    // end if last
    if (attempt.currentIndex >= attempt.questions.length) {
      attempt.status = "ended";
      attempt.endedAt = new Date();
      const score = attempt.questions.reduce(
        (acc, item) => acc + (item.isCorrect ? 1 : 0),
        0
      );
      // award score to all and upsert solo lock mirror TestResult
      await UserWeeklyAttempt.updateMany(
        { attemptId: attempt._id },
        { $set: { score, completedAt: new Date() } }
      );
      try {
        const TestResult = require("../../weeklytest/models/testResultModel");
        const Leaderboard = require("../../leaderboard/models/leaderboardModel");
        const totalQuestions = attempt.questions.length;
        const calcPoints = (s) => {
          const pct = (s / Math.max(1, totalQuestions)) * 100;
          if (pct >= 90) return 30;
          if (pct >= 70) return 20;
          if (pct >= 50) return 10;
          return -10;
        };
        const newPoints = calcPoints(score);
        const updates = attempt.roster.map(async (uid) => {
          const existing = await TestResult.findOne({
            studentId: uid,
            weekScheduleId: attempt.weekId,
          });
          const prevPoints = existing?.pointsEarned || 0;
          const delta = existing ? newPoints - prevPoints : newPoints;
          if (existing) {
            existing.score = score;
            existing.totalQuestions = totalQuestions;
            existing.pointsEarned = newPoints;
            existing.completedAt = new Date();
            await existing.save();
          } else {
            await TestResult.create({
              studentId: uid,
              weekScheduleId: attempt.weekId,
              subjectId: attempt.subjectId,
              weekNumber: undefined,
              year: undefined,
              score,
              totalQuestions,
              answers: [],
              pointsEarned: newPoints,
              completedAt: new Date(),
            });
          }
          try {
            let lb = await Leaderboard.findOne({
              student: uid,
              subject: attempt.subjectId,
            });
            if (!lb) {
              lb = new Leaderboard({
                student: uid,
                subject: attempt.subjectId,
                totalPoints: delta,
                weeklyPoints: delta,
                monthlyPoints: delta,
              });
            } else if (delta !== 0) {
              lb.totalPoints += delta;
              lb.weeklyPoints += delta;
              lb.monthlyPoints += delta;
            }
            await lb.save();
          } catch (e) {
            console.warn("Leaderboard update (team) warning:", e?.message || e);
          }
        });
        await Promise.all(updates);

        // Recompute simple ranks for this subject
        try {
          const entries = await Leaderboard.find({
            subject: attempt.subjectId,
          }).sort({ totalPoints: -1 });
          for (let i = 0; i < entries.length; i++) {
            entries[i].rank = i + 1;
            await entries[i].save();
          }
        } catch (e) {
          console.warn("Rank recompute (team) warning:", e?.message || e);
        }
      } catch (e) {
        console.warn(
          "Mirror TestResult/Leaderboard upsert (team) warning:",
          e?.message || e
        );
      }
    }
    await attempt.save();
    try {
      const io = socketService.getIo();
      if (io)
        io.to(`teamtest:${attempt._id}`).emit("teamtest:state", { attempt });
    } catch {}
    res.json({ attempt });
  } catch (err) {
    console.error("answer error", err);
    res.status(500).json({ message: "Failed to submit answer" });
  }
};

exports.skip = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const attempt = await TeamWeeklyAttempt.findById(attemptId);
    if (!attempt || attempt.status !== "active") {
      return res.status(400).json({ message: "Attempt not active" });
    }
    // Only active player may skip
    const actorId = req.user?.id?.toString();
    const activeUserId = attempt.roster[attempt.turnIndex]?.toString();
    if (!actorId || actorId !== activeUserId) {
      return res.status(403).json({ message: "Not your turn" });
    }
    // advance without scoring
    attempt.currentIndex += 1;
    attempt.turnIndex = (attempt.turnIndex + 1) % attempt.roster.length;
    if (attempt.currentIndex >= attempt.questions.length) {
      attempt.status = "ended";
      attempt.endedAt = new Date();
      const score = attempt.questions.reduce(
        (acc, item) => acc + (item.isCorrect ? 1 : 0),
        0
      );
      await UserWeeklyAttempt.updateMany(
        { attemptId: attempt._id },
        { $set: { score, completedAt: new Date() } }
      );
    }
    await attempt.save();
    try {
      const io = socketService.getIo();
      if (io)
        io.to(`teamtest:${attempt._id}`).emit("teamtest:state", { attempt });
    } catch {}
    res.json({ attempt });
  } catch (err) {
    console.error("skip error", err);
    res.status(500).json({ message: "Failed to skip" });
  }
};

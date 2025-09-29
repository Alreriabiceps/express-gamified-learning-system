const Student = require("../../student/models/studentModels");
const Question = require("../../question/models/questionModels");
const Subject = require("../../subject/models/subjectModel");
const WeekSchedule = require("../../week/models/weekModel");
const TestResult = require("../../../students/weeklytest/models/testResultModel");
const PvPMatch = require("../../../students/pvp/models/pvpMatchModel");
const TeamWeeklyAttempt = require("../../../students/teamtest/models/teamWeeklyAttemptModel");
const UserWeeklyAttempt = require("../../../students/teamtest/models/userWeeklyAttemptModel");

// GET /api/admin/analytics?range=7|30|90|365
exports.getAnalytics = async (req, res) => {
  try {
    const rangeDays = Math.max(1, Math.min(365, Number(req.query.range) || 30));
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - rangeDays);

    const [
      totalStudents,
      activeStudents,
      totalQuestions,
      totalTests,
      recentRegistrations,
      resultsSince,
      allSubjects,
      allStudents,
      teamAttempts,
      userAttempts,
      recentPvPMatches,
    ] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ isActive: true }),
      Question.countDocuments(),
      TestResult.countDocuments(),
      Student.find({ createdAt: { $gte: sinceDate } })
        .select("createdAt")
        .lean(),
      TestResult.find({ createdAt: { $gte: sinceDate } })
        .select("score totalQuestions subjectId createdAt studentId answers")
        .lean(),
      Subject.find({}).select("subject").lean(),
      Student.find({})
        .select(
          "firstName lastName track section yearLevel createdAt lastLogin isActive totalPoints pvpStars"
        )
        .lean(),
      TeamWeeklyAttempt.find({ createdAt: { $gte: sinceDate } })
        .populate("roster", "firstName lastName")
        .lean(),
      UserWeeklyAttempt.find({ createdAt: { $gte: sinceDate } })
        .populate("userId", "firstName lastName")
        .lean(),
      PvPMatch.find({ createdAt: { $gte: sinceDate } })
        .populate("player1", "firstName lastName")
        .populate("player2", "firstName lastName")
        .lean(),
    ]);

    // Overview metrics
    const avgScore = resultsSince.length
      ? resultsSince.reduce(
          (sum, r) =>
            sum + (r.totalQuestions ? (r.score / r.totalQuestions) * 100 : 0),
          0
        ) / resultsSince.length
      : 0;

    // Completion rate approximation: tests in range vs total tests across same period baseline
    // Frontend expects percentage; we approximate to ratio of tests with score present.
    const completionRate = resultsSince.length ? 100 : 0;

    // Students: registration trend (daily counts)
    const registrationByDay = {};
    for (const s of recentRegistrations) {
      const key = new Date(s.createdAt).toISOString().split("T")[0];
      registrationByDay[key] = (registrationByDay[key] || 0) + 1;
    }
    const labelsDays = [];
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labelsDays.push(d.toISOString().split("T")[0]);
    }
    const registrationData = labelsDays.map((d) => registrationByDay[d] || 0);

    // Participants per day (distinct submitters per day)
    const participantsByDayMap = new Map();
    for (const r of resultsSince) {
      const day = new Date(r.createdAt).toISOString().split("T")[0];
      const sid = String(r.studentId);
      if (!participantsByDayMap.has(day))
        participantsByDayMap.set(day, new Set());
      participantsByDayMap.get(day).add(sid);
    }
    const participantsPerDayLabels = labelsDays.slice(-7);
    const participantsPerDayData = participantsPerDayLabels.map(
      (d) => participantsByDayMap.get(d)?.size || 0
    );

    // Questions: Bloom's distribution
    const bloomsLevels = [
      "Remembering",
      "Understanding",
      "Applying",
      "Analyzing",
      "Evaluating",
      "Creating",
    ];
    const bloomsCountsAgg = await Question.aggregate([
      { $group: { _id: "$bloomsLevel", count: { $sum: 1 } } },
    ]);
    const bloomsMap = Object.fromEntries(
      bloomsCountsAgg.map((b) => [b._id, b.count])
    );
    const bloomsData = bloomsLevels.map((level) => bloomsMap[level] || 0);

    // Accuracy by subject
    const subjectIdToName = new Map(
      allSubjects.map((s) => [String(s._id), s.subject])
    );
    const subjectScores = {};
    for (const r of resultsSince) {
      const sid = String(r.subjectId);
      if (!subjectScores[sid]) subjectScores[sid] = { sumPct: 0, n: 0 };
      const pct = r.totalQuestions ? (r.score / r.totalQuestions) * 100 : 0;
      subjectScores[sid].sumPct += pct;
      subjectScores[sid].n += 1;
    }
    const subjectsLabels = Object.keys(subjectScores).map(
      (id) => subjectIdToName.get(id) || "Unknown"
    );
    const subjectsData = Object.values(subjectScores).map((v) =>
      v.n ? v.sumPct / v.n : 0
    );

    // Tests: trends (group results by day)
    const byDay = {};
    for (const r of resultsSince) {
      const day = new Date(r.createdAt).toISOString().split("T")[0];
      if (!byDay[day]) byDay[day] = { n: 0, sumPct: 0 };
      const pct = r.totalQuestions ? (r.score / r.totalQuestions) * 100 : 0;
      byDay[day].n += 1;
      byDay[day].sumPct += pct;
    }
    const completionTrendData = labelsDays.map((d) => byDay[d]?.n || 0);
    const averageScoreTrendData = labelsDays.map((d) =>
      byDay[d]?.n ? byDay[d].sumPct / byDay[d].n : 0
    );

    // Students: performance by track will be computed after studentMeta is built

    // Participation metrics
    const now = new Date();
    const participantsIds = await TestResult.distinct("studentId", {
      createdAt: { $gte: sinceDate },
    });
    const participationRate = totalStudents
      ? Number(((participantsIds.length / totalStudents) * 100).toFixed(1))
      : 0;

    // Assigned vs completed (funnel)
    const assignedTests = await WeekSchedule.countDocuments({
      createdAt: { $gte: sinceDate },
    });
    const completedTests = resultsSince.length;

    // New vs Returning among active in range
    const activeIdsInRange = participantsIds.map(String);
    let newVsReturning = { new: 0, returning: 0 };
    if (activeIdsInRange.length) {
      const firstAgg = await TestResult.aggregate([
        { $match: { studentId: { $in: participantsIds } } },
        { $group: { _id: "$studentId", first: { $min: "$createdAt" } } },
      ]);
      let newCount = 0;
      for (const row of firstAgg) {
        if (row.first >= sinceDate) newCount += 1;
      }
      newVsReturning = {
        new: newCount,
        returning: activeIdsInRange.length - newCount,
      };
    }

    // Retention cohorts (simplified w1 and w4 based on registration)
    const newStudents = await Student.find({ createdAt: { $gte: sinceDate } })
      .select("_id createdAt")
      .lean();
    const cohortMap = new Map();
    for (const s of newStudents) {
      const d = new Date(s.createdAt);
      const year = d.getUTCFullYear();
      const firstJan = new Date(Date.UTC(year, 0, 1));
      const week = Math.ceil(
        ((d - firstJan) / 86400000 + firstJan.getUTCDay() + 1) / 7
      );
      const label = `${year}-W${String(week).padStart(2, "0")}`;
      if (!cohortMap.has(label)) cohortMap.set(label, []);
      cohortMap.get(label).push({ id: s._id, createdAt: d });
    }
    const retentionCutoff = new Date(sinceDate);
    retentionCutoff.setDate(retentionCutoff.getDate() + 28);
    const resultsForRetention = await TestResult.find({
      createdAt: { $gte: sinceDate, $lte: retentionCutoff },
    })
      .select("studentId createdAt")
      .lean();
    const byStudentResults = new Map();
    for (const r of resultsForRetention) {
      const sid = String(r.studentId);
      if (!byStudentResults.has(sid)) byStudentResults.set(sid, []);
      byStudentResults.get(sid).push(new Date(r.createdAt));
    }
    const retention = [];
    for (const [label, arr] of cohortMap) {
      let w1 = 0,
        w4 = 0;
      for (const s of arr) {
        const list = byStudentResults.get(String(s.id)) || [];
        const w1End = new Date(s.createdAt);
        w1End.setDate(w1End.getDate() - 1 + 7);
        const w4End = new Date(s.createdAt);
        w4End.setDate(w4End.getDate() - 1 + 28);
        if (list.some((dt) => dt >= s.createdAt && dt <= w1End)) w1 += 1;
        if (list.some((dt) => dt >= s.createdAt && dt <= w4End)) w4 += 1;
      }
      const size = arr.length || 1;
      retention.push({
        week: label,
        w1: Number(((w1 / size) * 100).toFixed(1)),
        w4: Number(((w4 / size) * 100).toFixed(1)),
      });
    }

    // Top improvers within range (first half vs second half)
    const midDate = new Date(sinceDate);
    midDate.setDate(midDate.getDate() + Math.floor(rangeDays / 2));
    const byStudentRange = new Map();
    for (const r of resultsSince) {
      const sid = String(r.studentId);
      if (!byStudentRange.has(sid))
        byStudentRange.set(sid, { first: [], second: [] });
      const pct = r.totalQuestions ? (r.score / r.totalQuestions) * 100 : 0;
      if (new Date(r.createdAt) < midDate)
        byStudentRange.get(sid).first.push(pct);
      else byStudentRange.get(sid).second.push(pct);
    }
    const improvers = [];
    for (const [sid, vals] of byStudentRange) {
      if (vals.first.length && vals.second.length) {
        const a = vals.first.reduce((s, v) => s + v, 0) / vals.first.length;
        const b = vals.second.reduce((s, v) => s + v, 0) / vals.second.length;
        improvers.push({ studentId: sid, delta: Number((b - a).toFixed(1)) });
      }
    }
    improvers.sort((x, y) => y.delta - x.delta);
    const topImprovers = improvers.slice(0, 5);

    // At-risk: no activity in last 14 days and avg in range < 60
    const last14 = new Date(now);
    last14.setDate(now.getDate() - 14);
    const hadInLast14 = new Set(
      await TestResult.distinct("studentId", { createdAt: { $gte: last14 } })
    );
    const avgByStudent = [];
    for (const [sid, vals] of byStudentRange) {
      const allVals = vals.first.concat(vals.second);
      if (!allVals.length) continue;
      const avg = allVals.reduce((s, v) => s + v, 0) / allVals.length;
      avgByStudent.push({ sid, avg });
    }
    const atRisk = avgByStudent
      .filter((r) => r.avg < 60 && !hadInLast14.has(r.sid))
      .slice(0, 10)
      .map((r) => ({ studentId: r.sid, avg: Number(r.avg.toFixed(1)) }));

    // Segments (yearLevel, track, section) over active students in range
    const activeStudentsDocs = await Student.find({
      _id: { $in: participantsIds },
    })
      .select("_id yearLevel track section firstName lastName")
      .lean();
    const studentMeta = new Map(
      activeStudentsDocs.map((s) => [String(s._id), s])
    );
    const segScore = (keyGetter) => {
      const map = new Map();
      for (const r of resultsSince) {
        const meta = studentMeta.get(String(r.studentId));
        if (!meta) continue;
        const key = keyGetter(meta);
        const pct = r.totalQuestions ? (r.score / r.totalQuestions) * 100 : 0;
        if (!map.has(key)) map.set(key, { sum: 0, n: 0 });
        const o = map.get(key);
        o.sum += pct;
        o.n += 1;
        map.set(key, o);
      }
      const labels = Array.from(map.keys());
      const data = labels.map((k) => {
        const v = map.get(k);
        return v.n ? Number((v.sum / v.n).toFixed(1)) : 0;
      });
      return { labels, data };
    };
    const byYearLevel = segScore((s) => s.yearLevel || "N/A");
    const byTrack = segScore((s) => s.track || "N/A");
    // Removed bySection per requirements

    // Compute performance by track using active students meta
    const trackPerfAgg = new Map([
      ["Academic Track", { sum: 0, n: 0 }],
      ["Technical-Professional Track", { sum: 0, n: 0 }],
    ]);
    for (const r of resultsSince) {
      const meta = studentMeta.get(String(r.studentId));
      if (!meta) continue;
      const t = meta.track;
      if (!trackPerfAgg.has(t)) continue;
      const pct = r.totalQuestions ? (r.score / r.totalQuestions) * 100 : 0;
      const o = trackPerfAgg.get(t);
      o.sum += pct;
      o.n += 1;
      trackPerfAgg.set(t, o);
    }
    const trackLabels = ["Academic Track", "Technical-Professional Track"];
    const trackData = trackLabels.map((t) => {
      const v = trackPerfAgg.get(t);
      return v && v.n ? Number((v.sum / v.n).toFixed(1)) : 0;
    });

    // Aggregate student performance and activity (top performers, most active)
    const studentAgg = await TestResult.aggregate([
      { $match: { createdAt: { $gte: sinceDate } } },
      {
        $project: {
          studentId: 1,
          pct: {
            $cond: [
              { $gt: ["$totalQuestions", 0] },
              { $multiply: [{ $divide: ["$score", "$totalQuestions"] }, 100] },
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: "$studentId",
          avg: { $avg: "$pct" },
          count: { $sum: 1 },
        },
      },
    ]);
    // Build maps for names for involved students
    const involvedIds = studentAgg.map((a) => a._id).filter(Boolean);
    const involvedDocs = await Student.find({ _id: { $in: involvedIds } })
      .select("firstName lastName track")
      .lean();
    const nameMap = new Map(
      involvedDocs.map((s) => [
        String(s._id),
        { name: `${s.firstName} ${s.lastName}`.trim(), track: s.track },
      ])
    );
    const sortedByAvg = [...studentAgg].sort(
      (a, b) => (b.avg || 0) - (a.avg || 0)
    );
    const sortedByCount = [...studentAgg].sort(
      (a, b) => (b.count || 0) - (a.count || 0)
    );
    const topPerformers = sortedByAvg.slice(0, 5).map((a) => ({
      id: String(a._id),
      name: nameMap.get(String(a._id))?.name || String(a._id),
      track: nameMap.get(String(a._id))?.track || "—",
      score: Number((a.avg || 0).toFixed(1)),
      tests: a.count || 0,
    }));
    const mostActive = sortedByCount.slice(0, 5).map((a) => ({
      id: String(a._id),
      name: nameMap.get(String(a._id))?.name || String(a._id),
      tests: a.count || 0,
      avgScore: Number((a.avg || 0).toFixed(1)),
    }));

    // Bloom accuracy via answers join
    const bloomsAccuracyAgg = await TestResult.aggregate([
      { $match: { createdAt: { $gte: sinceDate } } },
      { $unwind: "$answers" },
      {
        $lookup: {
          from: "questions",
          localField: "answers.questionId",
          foreignField: "_id",
          as: "q",
        },
      },
      { $unwind: "$q" },
      {
        $group: {
          _id: "$q.bloomsLevel",
          total: { $sum: 1 },
          correct: { $sum: { $cond: ["$answers.isCorrect", 1, 0] } },
        },
      },
    ]);
    const bloomsAccMap = new Map(
      bloomsAccuracyAgg.map((b) => [
        b._id,
        b.total ? Number(((b.correct / b.total) * 100).toFixed(1)) : 0,
      ])
    );
    const bloomsAccuracyData = bloomsLevels.map(
      (level) => bloomsAccMap.get(level) || 0
    );

    // Hardest questions
    const hardestAgg = await TestResult.aggregate([
      { $match: { createdAt: { $gte: sinceDate } } },
      { $unwind: "$answers" },
      {
        $group: {
          _id: "$answers.questionId",
          attempts: { $sum: 1 },
          correct: { $sum: { $cond: ["$answers.isCorrect", 1, 0] } },
        },
      },
      { $match: { attempts: { $gte: 5 } } },
      {
        $project: {
          attempts: 1,
          accuracy: {
            $cond: [
              { $eq: ["$attempts", 0] },
              0,
              { $multiply: [{ $divide: ["$correct", "$attempts"] }, 100] },
            ],
          },
        },
      },
      { $sort: { accuracy: 1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "questions",
          localField: "_id",
          foreignField: "_id",
          as: "q",
        },
      },
      { $unwind: "$q" },
      {
        $lookup: {
          from: "subjects",
          localField: "q.subject",
          foreignField: "_id",
          as: "s",
        },
      },
      { $unwind: { path: "$s", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          questionId: "$_id",
          attempts: 1,
          accuracy: { $round: ["$accuracy", 1] },
          questionText: "$q.questionText",
          subject: "$s.subject",
        },
      },
    ]);
    const hardestQuestions = hardestAgg.map((h) => ({
      questionId: String(h.questionId),
      question: h.questionText,
      accuracy: h.accuracy,
      attempts: h.attempts,
      subject: h.subject || "",
    }));

    // Most missed questions (lowest accuracy) – reuse hardestAgg shape but include more items
    const mostMissedAgg = await TestResult.aggregate([
      { $match: { createdAt: { $gte: sinceDate } } },
      { $unwind: "$answers" },
      {
        $group: {
          _id: "$answers.questionId",
          attempts: { $sum: 1 },
          correct: { $sum: { $cond: ["$answers.isCorrect", 1, 0] } },
        },
      },
      { $match: { attempts: { $gte: 5 } } },
      {
        $project: {
          attempts: 1,
          accuracy: {
            $cond: [
              { $eq: ["$attempts", 0] },
              0,
              { $multiply: [{ $divide: ["$correct", "$attempts"] }, 100] },
            ],
          },
        },
      },
      { $sort: { accuracy: 1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "questions",
          localField: "_id",
          foreignField: "_id",
          as: "q",
        },
      },
      { $unwind: "$q" },
      {
        $lookup: {
          from: "subjects",
          localField: "q.subject",
          foreignField: "_id",
          as: "s",
        },
      },
      { $unwind: { path: "$s", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          questionId: "$_id",
          attempts: 1,
          accuracy: { $round: ["$accuracy", 1] },
          questionText: "$q.questionText",
          subject: "$s.subject",
        },
      },
    ]);
    const mostMissedQuestions = mostMissedAgg.map((m) => ({
      question: m.questionText,
      subject: m.subject || "",
      accuracy: m.accuracy,
      attempts: m.attempts,
    }));

    // Top attempted questions
    const topAttemptedAgg = await TestResult.aggregate([
      { $match: { createdAt: { $gte: sinceDate } } },
      { $unwind: "$answers" },
      { $group: { _id: "$answers.questionId", attempts: { $sum: 1 } } },
      { $sort: { attempts: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "questions",
          localField: "_id",
          foreignField: "_id",
          as: "q",
        },
      },
      { $unwind: "$q" },
      { $project: { questionText: "$q.questionText", attempts: 1 } },
    ]);
    const topAttempted = {
      labels: topAttemptedAgg.map(
        (t) =>
          t.questionText?.slice(0, 32) +
          (t.questionText && t.questionText.length > 32 ? "…" : "")
      ),
      data: topAttemptedAgg.map((t) => t.attempts),
    };

    // Subject attempts and coverage
    const attemptsMap = new Map();
    const subjectStudentSet = new Map();
    for (const r of resultsSince) {
      const sid = String(r.subjectId);
      attemptsMap.set(sid, (attemptsMap.get(sid) || 0) + 1);
      if (!subjectStudentSet.has(sid)) subjectStudentSet.set(sid, new Set());
      subjectStudentSet.get(sid).add(String(r.studentId));
    }
    const subjLabels = [];
    const subjAttempts = [];
    const subjCoverage = [];
    for (const [sid, count] of attemptsMap) {
      const name = subjectIdToName.get(sid) || "Unknown";
      subjLabels.push(name);
      subjAttempts.push(count);
      const unique = subjectStudentSet.get(sid)?.size || 0;
      subjCoverage.push(
        totalStudents ? Number(((unique / totalStudents) * 100).toFixed(1)) : 0
      );
    }

    // Score histogram
    const bins = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const histCounts = new Array(bins.length - 1).fill(0);
    for (const r of resultsSince) {
      const pct = r.totalQuestions ? (r.score / r.totalQuestions) * 100 : 0;
      const idx = Math.min(Math.floor(pct / 10), 9);
      histCounts[idx] += 1;
    }

    // Activity heatmap (dow x hour)
    const heatmap = [];
    const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
    for (const r of resultsSince) {
      const dt = new Date(r.createdAt);
      const dow = dt.getUTCDay();
      const hour = dt.getUTCHours();
      grid[dow][hour] += 1;
    }
    for (let dow = 0; dow < 7; dow++) {
      for (let hour = 0; hour < 24; hour++) {
        if (grid[dow][hour] > 0)
          heatmap.push({ dow, hour, count: grid[dow][hour] });
      }
    }

    // Activity heatmap by date (last 7 days) x hour
    const last7 = labelsDays.slice(-7);
    const dateHourGrid = Array.from({ length: last7.length }, () =>
      new Array(24).fill(0)
    );
    const byDateMap = new Map();
    for (let i = 0; i < last7.length; i++) byDateMap.set(last7[i], i);
    for (const r of resultsSince) {
      const dt = new Date(r.createdAt);
      const dayStr = dt.toISOString().split("T")[0];
      const idx = byDateMap.get(dayStr);
      if (idx === undefined) continue;
      const hour = dt.getUTCHours();
      dateHourGrid[idx][hour] += 1;
    }

    // Peak stats
    let peakHour = null;
    let peakHourCount = -1;
    const hourTotals = new Array(24).fill(0);
    for (let h = 0; h < 24; h++) {
      let sum = 0;
      for (let d = 0; d < dateHourGrid.length; d++) sum += dateHourGrid[d][h];
      hourTotals[h] = sum;
      if (sum > peakHourCount) {
        peakHourCount = sum;
        peakHour = h;
      }
    }
    let busiestDate = null;
    let busiestDateCount = -1;
    for (let i = 0; i < last7.length; i++) {
      const c = dateHourGrid[i].reduce((a, b) => a + b, 0);
      if (c > busiestDateCount) {
        busiestDateCount = c;
        busiestDate = last7[i];
      }
    }

    // Build students directory list (using allStudents from Promise.all above)
    const studentAvgAgg = await TestResult.aggregate([
      { $match: { createdAt: { $gte: sinceDate } } },
      {
        $project: {
          studentId: 1,
          pct: {
            $cond: [
              { $gt: ["$totalQuestions", 0] },
              { $multiply: [{ $divide: ["$score", "$totalQuestions"] }, 100] },
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: "$studentId",
          avg: { $avg: "$pct" },
          count: { $sum: 1 },
        },
      },
    ]);
    const avgMap = new Map(
      studentAvgAgg.map((a) => [
        String(a._id),
        { avg: Number(a.avg.toFixed(1)), count: a.count },
      ])
    );
    const onlineThresholdMs = 5 * 60 * 1000;
    const nowMs = Date.now();
    const computeRank = (totalPoints = 0) => {
      if (totalPoints >= 850) return "Valedictorian";
      if (totalPoints >= 700) return "Dean's Lister";
      if (totalPoints >= 550) return "High Honors";
      if (totalPoints >= 400) return "Honor Student";
      if (totalPoints >= 250) return "Scholar";
      return "Apprentice";
    };
    const studentsList = allStudents.map((s) => {
      const id = String(s._id);
      const stats = avgMap.get(id) || { avg: 0, count: 0 };
      const lastLogin = s.lastLogin ? new Date(s.lastLogin) : null;
      const online = lastLogin
        ? nowMs - lastLogin.getTime() <= onlineThresholdMs
        : false;
      return {
        id,
        name: `${s.firstName} ${s.lastName}`.trim(),
        track: s.track,
        yearLevel: s.yearLevel,
        rank: computeRank(s.totalPoints || 0),
        totalPoints: s.totalPoints || 0,
        pvpStars: s.pvpStars || 0,
        weeklyAvg: stats.avg,
        weeklyTestsCompleted: stats.count,
        online,
        lastLogin: s.lastLogin || null,
      };
    });

    // Recently online (last 24h) and inactive > 14 days
    const last24h = new Date(now);
    last24h.setDate(now.getDate() - 1);
    const recentlyOnline = studentsList
      .filter((s) => s.lastLogin && new Date(s.lastLogin) >= last24h)
      .sort((a, b) => new Date(b.lastLogin) - new Date(a.lastLogin))
      .slice(0, 20);
    const inactive14d = studentsList
      .filter(
        (s) =>
          !s.lastLogin ||
          nowMs - new Date(s.lastLogin).getTime() > 14 * 24 * 60 * 60 * 1000
      )
      .slice(0, 20);

    // Overview extras: testsInRange, avgTestsPerStudent, medianScore, passRate, subjectsAttempted
    const testsInRange = resultsSince.length;
    const participantsCount = participantsIds.length;
    const avgTestsPerStudent = participantsCount
      ? Number((testsInRange / participantsCount).toFixed(2))
      : 0;
    const pctList = resultsSince
      .map((r) => (r.totalQuestions ? (r.score / r.totalQuestions) * 100 : 0))
      .sort((a, b) => a - b);
    const medianScore = pctList.length
      ? Number(
          (pctList.length % 2 === 1
            ? pctList[(pctList.length - 1) / 2]
            : (pctList[pctList.length / 2 - 1] + pctList[pctList.length / 2]) /
              2
          ).toFixed(1)
        )
      : 0;
    const passRate = testsInRange
      ? Number(
          (
            (pctList.filter((p) => p >= 60).length / testsInRange) *
            100
          ).toFixed(1)
        )
      : 0;
    const subjectsAttempted = new Set(
      resultsSince.map((r) => String(r.subjectId))
    ).size;

    // PvP analytics
    const pvpSince = sinceDate;
    const pvpMatches = await PvPMatch.find({
      createdAt: { $gte: pvpSince },
      status: { $in: ["completed"] },
    })
      .select(
        "player1 player2 winner createdAt gameMode matchDuration startedAt completedAt"
      )
      .lean();
    const pvpTotal = pvpMatches.length;
    const pvpWins = new Map();
    const pvpPlays = new Map();
    const pvpPlaysByDay = new Map();
    const modeCounts = new Map();
    const matchesByHour = new Array(24).fill(0);
    const durationsSec = [];
    const playerMatches = new Map();
    for (const m of pvpMatches) {
      const day = new Date(m.createdAt).toISOString().split("T")[0];
      pvpPlaysByDay.set(day, (pvpPlaysByDay.get(day) || 0) + 1);
      const p1 = String(m.player1);
      const p2 = String(m.player2);
      pvpPlays.set(p1, (pvpPlays.get(p1) || 0) + 1);
      pvpPlays.set(p2, (pvpPlays.get(p2) || 0) + 1);
      if (m.winner) {
        const wid = String(m.winner);
        pvpWins.set(wid, (pvpWins.get(wid) || 0) + 1);
      }
      // Normalize to single game mode label 'demo' per product naming
      const mode = "demo";
      modeCounts.set(mode, (modeCounts.get(mode) || 0) + 1);
      const hour = new Date(m.createdAt).getUTCHours();
      matchesByHour[hour] += 1;
      const dur =
        m.matchDuration ||
        (m.completedAt && m.startedAt
          ? Math.max(
              0,
              Math.round(
                (new Date(m.completedAt) - new Date(m.startedAt)) / 1000
              )
            )
          : 0);
      if (dur > 0) durationsSec.push(dur);
      const isWinP1 = m.winner && String(m.winner) === p1;
      const isWinP2 = m.winner && String(m.winner) === p2;
      if (!playerMatches.has(p1)) playerMatches.set(p1, []);
      if (!playerMatches.has(p2)) playerMatches.set(p2, []);
      playerMatches.get(p1).push({ date: m.createdAt, isWin: !!isWinP1 });
      playerMatches.get(p2).push({ date: m.createdAt, isWin: !!isWinP2 });
    }
    const pvpLabels = labelsDays.slice(-7);
    const pvpDaily = pvpLabels.map((d) => pvpPlaysByDay.get(d) || 0);
    const topWinners = Array.from(pvpWins.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const topWinnerDocs = await Student.find({
      _id: { $in: topWinners.map((t) => t[0]) },
    })
      .select("firstName lastName pvpStars")
      .lean();
    const idToName = new Map(
      topWinnerDocs.map((s) => [
        String(s._id),
        `${s.firstName} ${s.lastName}`.trim(),
      ])
    );
    const pvpTopPlayers = topWinners.map(([id, wins]) => ({
      id,
      name: idToName.get(id) || id,
      wins,
    }));
    const winRateEntries = Array.from(pvpPlays.entries())
      .map(([id, plays]) => ({
        id,
        plays,
        wins: pvpWins.get(id) || 0,
        rate: plays ? (pvpWins.get(id) || 0) / plays : 0,
      }))
      .filter((e) => e.plays >= 3)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);
    const pvpWinRates = winRateEntries.map((e) => ({
      id: e.id,
      name: idToName.get(e.id) || e.id,
      winRate: Number((e.rate * 100).toFixed(1)),
      plays: e.plays,
    }));
    const pvpModeSplit = {
      labels: Array.from(modeCounts.keys()),
      data: Array.from(modeCounts.values()),
    };
    const recentMatchesRaw = [...pvpMatches]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);
    const recentIds = new Set();
    recentMatchesRaw.forEach((m) => {
      recentIds.add(String(m.player1));
      recentIds.add(String(m.player2));
      if (m.winner) recentIds.add(String(m.winner));
    });
    const recentDocs = await Student.find({
      _id: { $in: Array.from(recentIds) },
    })
      .select("firstName lastName")
      .lean();
    const recentMap = new Map(
      recentDocs.map((s) => [
        String(s._id),
        `${s.firstName} ${s.lastName}`.trim(),
      ])
    );
    const recentMatches = recentMatchesRaw.map((m) => ({
      date: m.createdAt,
      player1: recentMap.get(String(m.player1)) || String(m.player1),
      player2: recentMap.get(String(m.player2)) || String(m.player2),
      winner: m.winner
        ? recentMap.get(String(m.winner)) || String(m.winner)
        : "",
      mode: "demo",
    }));
    const starDocs = await Student.find({})
      .select("firstName lastName pvpStars")
      .sort({ pvpStars: -1 })
      .limit(5)
      .lean();
    const pvpStarsTop = starDocs.map((s) => ({
      id: String(s._id),
      name: `${s.firstName} ${s.lastName}`.trim(),
      stars: s.pvpStars || 0,
    }));

    const avgDurationSec = durationsSec.length
      ? Math.round(
          durationsSec.reduce((a, b) => a + b, 0) / durationsSec.length
        )
      : 0;
    const sortedDur = durationsSec.slice().sort((a, b) => a - b);
    const medianDurationSec = sortedDur.length
      ? sortedDur.length % 2
        ? sortedDur[(sortedDur.length - 1) / 2]
        : Math.round(
            (sortedDur[sortedDur.length / 2 - 1] +
              sortedDur[sortedDur.length / 2]) /
              2
          )
      : 0;

    const streaks = [];
    for (const [pid, arr] of playerMatches) {
      arr.sort((a, b) => new Date(a.date) - new Date(b.date));
      let best = 0;
      let cur = 0;
      for (const it of arr) {
        if (it.isWin) {
          cur += 1;
          best = Math.max(best, cur);
        } else {
          cur = 0;
        }
      }
      if (best > 0) streaks.push({ id: pid, streak: best });
    }
    streaks.sort((a, b) => b.streak - a.streak);
    const topStreakIds = streaks.slice(0, 5).map((s) => s.id);
    const streakDocs = await Student.find({ _id: { $in: topStreakIds } })
      .select("firstName lastName")
      .lean();
    const streakNameMap = new Map(
      streakDocs.map((s) => [
        String(s._id),
        `${s.firstName} ${s.lastName}`.trim(),
      ])
    );
    const topStreaks = streaks.slice(0, 5).map((s) => ({
      id: s.id,
      name: streakNameMap.get(s.id) || s.id,
      streak: s.streak,
    }));

    // Additional Valuable Statistics
    // Learning Engagement Metrics
    const dailyActiveUsers = await Student.countDocuments({
      lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    const weeklyActiveUsers = await Student.countDocuments({
      lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });

    // Collaboration Analytics (Team Tests)
    const collaborativeTests = teamAttempts.length;
    const soloTests = userAttempts.filter((ua) => ua.mode === "solo").length;
    const collaborationRate =
      collaborativeTests + soloTests > 0
        ? (collaborativeTests / (collaborativeTests + soloTests)) * 100
        : 0;

    // Learning Progress Indicators
    const totalQuestionsAttempted = resultsSince.reduce(
      (sum, r) => sum + (r.totalQuestions || 0),
      0
    );
    const questionsPerStudent =
      totalStudents > 0
        ? Math.round(totalQuestionsAttempted / totalStudents)
        : 0;

    // Time-based Learning Patterns
    const peakLearningHours = {};
    resultsSince.forEach((result) => {
      const hour = new Date(result.createdAt).getHours();
      peakLearningHours[hour] = (peakLearningHours[hour] || 0) + 1;
    });

    const mostActiveHour =
      Object.entries(peakLearningHours).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      "14";

    // Student Retention & Growth
    const newStudentsThisMonth = recentRegistrations.length;
    const retentionRate = (activeStudents / totalStudents) * 100;

    // Performance Trends
    const recentScores = resultsSince
      .slice(-30)
      .map((r) => (r.totalQuestions ? (r.score / r.totalQuestions) * 100 : 0));
    const scoresTrend =
      recentScores.length > 15
        ? recentScores.slice(-15).reduce((a, b) => a + b, 0) / 15 -
          recentScores.slice(0, 15).reduce((a, b) => a + b, 0) / 15
        : 0;

    const response = {
      overview: {
        totalStudents,
        activeStudents,
        totalQuestions,
        totalTests,
        averageScore: Number(avgScore.toFixed(1)),
        completionRate: Number(completionRate.toFixed(1)),
        participationRate,
        assignedTests,
        completedTests,
        testsInRange,
        participants: participantsCount,
        avgTestsPerStudent,
        medianScore,
        passRate,
        subjectsAttempted,
        // Enhanced metrics
        dailyActiveUsers,
        weeklyActiveUsers,
        collaborativeTests,
        soloTests,
        collaborationRate: Number(collaborationRate.toFixed(1)),
        questionsPerStudent,
        mostActiveHour: parseInt(mostActiveHour),
        newStudentsThisMonth,
        retentionRate: Number(retentionRate.toFixed(1)),
        scoresTrend: Number(scoresTrend.toFixed(1)),
        totalQuestionsAttempted,
      },
      students: {
        registrationTrend: {
          labels: labelsDays.slice(-7),
          data: registrationData.slice(-7),
        },
        performanceByTrack: {
          labels: trackLabels,
          data: trackData,
        },
        topPerformers,
        mostActive,
        newVsReturning,
        retention,
        topImprovers,
        atRisk,
        byYearLevel,
        byTrack,
        // bySection removed
        studentsList,
        participantsTrend: {
          labels: participantsPerDayLabels,
          data: participantsPerDayData,
        },
        recentlyOnline,
        inactive14d,
      },
      questions: {
        difficultyDistribution: {
          labels: bloomsLevels,
          data: bloomsData,
        },
        accuracyBySubject: {
          labels: subjectsLabels,
          data: subjectsData,
        },
        mostMissedQuestions,
        bloomsAccuracy: {
          labels: bloomsLevels,
          data: bloomsAccuracyData,
        },
        hardest: hardestQuestions,
        topAttempted,
      },
      subjects: {
        popularity: { labels: subjLabels, data: subjAttempts },
        performance: {
          labels: subjectsLabels,
          data: subjectsData,
        },
        attempts: { labels: subjLabels, data: subjAttempts },
        coverage: { labels: subjLabels, data: subjCoverage },
      },
      tests: {
        completionTrend: {
          labels: labelsDays.slice(-7),
          data: completionTrendData.slice(-7),
        },
        averageScoreTrend: {
          labels: labelsDays.slice(-7),
          data: averageScoreTrendData.slice(-7),
        },
        testsBySubject: { labels: subjLabels, data: subjAttempts },
        peak: { hour: peakHour, date: busiestDate },
        funnel: {
          assigned: assignedTests,
          started: completedTests,
          submitted: completedTests,
        },
        scoreHistogram: { bins, counts: histCounts },
        activityHeatmap: heatmap,
        activityHeatmapDates: { dates: last7, grid: dateHourGrid },
      },
      game: {
        pvp: {
          totalMatches: pvpTotal,
          matchesPerDay: { labels: pvpLabels, data: pvpDaily },
          topPlayers: pvpTopPlayers,
          winRates: pvpWinRates,
          modeSplit: pvpModeSplit,
          matchesByHour,
          recentMatches,
          starsTop: pvpStarsTop,
          avgDurationSec,
          medianDurationSec,
          topStreaks,
        },
      },
    };

    return res.json(response);
  } catch (err) {
    console.error("Error building analytics:", err);
    return res.status(500).json({ error: "Failed to load analytics" });
  }
};

// GET /api/admin/students/:id/performance
exports.getStudentPerformance = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id).lean();
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Last 10 results
    const results = await TestResult.find({ studentId: student._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("subjectId", "subject")
      .lean();

    const scores = results.map((r) =>
      r.totalQuestions ? Math.round((r.score / r.totalQuestions) * 100) : 0
    );
    const labels = results
      .map((r) => new Date(r.createdAt).toISOString().split("T")[0])
      .reverse();
    const data = [...scores].reverse();

    // Subject performance averages over all student results
    const allStudentResults = await TestResult.find({ studentId: student._id })
      .populate("subjectId", "subject")
      .lean();
    const bySubject = {};
    for (const r of allStudentResults) {
      const name = r.subjectId?.subject || "Unknown";
      if (!bySubject[name]) bySubject[name] = { sum: 0, n: 0 };
      const pct = r.totalQuestions ? (r.score / r.totalQuestions) * 100 : 0;
      bySubject[name].sum += pct;
      bySubject[name].n += 1;
    }
    const subjectLabels = Object.keys(bySubject);
    const subjectData = Object.values(bySubject).map((v) =>
      v.n ? Math.round(v.sum / v.n) : 0
    );

    // Bloom's performance: approximate by mapping TestResult percentages into all blooms equally (no per-question blooms recorded here)
    const bloomsLabels = [
      "Remembering",
      "Understanding",
      "Applying",
      "Analyzing",
      "Evaluating",
      "Creating",
    ];
    const overallAvg = subjectData.length
      ? Math.round(subjectData.reduce((a, b) => a + b, 0) / subjectData.length)
      : scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    const bloomsData = bloomsLabels.map(() => overallAvg);

    const performance = {
      overview: {
        averageScore: overallAvg,
        testsCompleted: allStudentResults.length,
        totalTestsAvailable: allStudentResults.length, // no separate availability tracking
        currentStreak: 0,
        bestSubject: subjectLabels[0] || "N/A",
        improvementNeeded: subjectLabels[subjectLabels.length - 1] || "N/A",
        rank: 0,
        totalStudents: 0,
      },
      scoreHistory: { labels, data },
      subjectPerformance: { labels: subjectLabels, data: subjectData },
      bloomsPerformance: { labels: bloomsLabels, data: bloomsData },
      testHistory: results
        .map((r, idx) => ({
          id: r._id,
          subject: r.subjectId?.subject || "Unknown",
          date: r.createdAt,
          score: r.totalQuestions
            ? Math.round((r.score / r.totalQuestions) * 100)
            : 0,
          totalQuestions: r.totalQuestions,
          correctAnswers: r.score,
          timeSpent: "—",
        }))
        .reverse(),
      weeklyActivity: [],
    };

    return res.json({ student, performance });
  } catch (err) {
    console.error("Error building student performance:", err);
    return res
      .status(500)
      .json({ error: "Failed to load student performance" });
  }
};

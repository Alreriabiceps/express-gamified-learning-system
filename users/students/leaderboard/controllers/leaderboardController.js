const Leaderboard = require("../models/leaderboardModel");
const Student = require("../../../../users/admin/student/models/studentModels");

// Helper function to get rank name based on total points
const getRankFromPoints = (totalPoints) => {
  const RANKS = [
    { min: 0, max: 149, name: "Absent Legend" },
    { min: 150, max: 299, name: "The Crammer" },
    { min: 300, max: 449, name: "Seatwarmer" },
    { min: 450, max: 599, name: "Group Project Ghost" },
    { min: 600, max: 749, name: "Google Scholar (Unofficial)" },
    { min: 750, max: 899, name: "The Lowkey Genius" },
    { min: 900, max: 1049, name: "Almost Valedictorian" },
    { min: 1050, max: Infinity, name: "The Valedictornator" },
  ];

  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (totalPoints >= RANKS[i].min) {
      return RANKS[i];
    }
  }
  return RANKS[0];
};

// Get global weekly leaderboard (aggregated across all subjects) with enhanced features
exports.getGlobalWeeklyLeaderboard = async (req, res) => {
  try {
    const {
      timeFrame = "total",
      page = 1,
      limit = 50,
      search = "",
      yearLevel = "",
      track = "",
      section = "",
      sortBy = "points",
      sortOrder = "desc",
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let sortField;
    switch (timeFrame) {
      case "weekly":
        sortField = "weeklyPoints";
        break;
      case "monthly":
        sortField = "monthlyPoints";
        break;
      default:
        sortField = "totalPoints";
    }

    // Build student filter for advanced filtering
    let studentFilter = { isActive: true };
    if (yearLevel) studentFilter.yearLevel = yearLevel;
    if (track) studentFilter.track = track;
    if (section) studentFilter.section = section;
    if (search) {
      studentFilter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // First get matching students
    const matchingStudents = await Student.find(studentFilter).select("_id");
    const studentIds = matchingStudents.map((s) => s._id);

    if (studentIds.length === 0) {
      return res.json({
        success: true,
        leaderboard: [],
        pagination: {
          currentPage: pageNum,
          totalPages: 0,
          totalItems: 0,
          hasNext: false,
          hasPrev: false,
        },
        filters: {
          yearLevels: await Student.distinct("yearLevel", { isActive: true }),
          tracks: await Student.distinct("track", { isActive: true }),
          sections: await Student.distinct("section", { isActive: true }),
        },
      });
    }

    // Get total count for pagination
    const totalCountPipeline = [
      {
        $match: {
          student: { $in: studentIds },
        },
      },
      {
        $group: {
          _id: "$student",
          totalPoints: { $sum: "$totalPoints" },
          weeklyPoints: { $sum: "$weeklyPoints" },
          monthlyPoints: { $sum: "$monthlyPoints" },
        },
      },
      {
        $count: "total",
      },
    ];

    const totalCountResult = await Leaderboard.aggregate(totalCountPipeline);
    const totalItems =
      totalCountResult.length > 0 ? totalCountResult[0].total : 0;
    const totalPages = Math.ceil(totalItems / limitNum);

    // Main aggregation pipeline with pagination
    const pipeline = [
      {
        $match: {
          student: { $in: studentIds },
        },
      },
      {
        $group: {
          _id: "$student",
          totalPoints: { $sum: "$totalPoints" },
          weeklyPoints: { $sum: "$weeklyPoints" },
          monthlyPoints: { $sum: "$monthlyPoints" },
        },
      },
      {
        $lookup: {
          from: "students",
          localField: "_id",
          foreignField: "_id",
          as: "studentData",
        },
      },
      {
        $unwind: "$studentData",
      },
      {
        $project: {
          _id: 1,
          totalPoints: 1,
          weeklyPoints: 1,
          monthlyPoints: 1,
          student: {
            _id: "$studentData._id",
            firstName: "$studentData.firstName",
            lastName: "$studentData.lastName",
            email: "$studentData.email",
            yearLevel: "$studentData.yearLevel",
            track: "$studentData.track",
            section: "$studentData.section",
          },
        },
      },
      { $sort: { [sortField]: sortOrder === "desc" ? -1 : 1 } },
      { $skip: skip },
      { $limit: limitNum },
    ];

    const leaderboard = await Leaderboard.aggregate(pipeline);

    // Format data for frontend with global positions
    const formattedLeaderboard = leaderboard.map((entry, index) => {
      const pointsToUse = entry[sortField] || 0;
      const fullName = `${entry.student.firstName} ${entry.student.lastName}`;
      const rank = getRankFromPoints(pointsToUse);

      return {
        id: entry.student._id,
        username: fullName,
        handle: `@${entry.student.firstName.toLowerCase()}${entry.student.lastName.toLowerCase()}`,
        mmr: pointsToUse,
        rankName: rank.name,
        avatarInitial: `${entry.student.firstName.charAt(
          0
        )}${entry.student.lastName.charAt(0)}`.toUpperCase(),
        position: skip + index + 1,
        globalPosition: skip + index + 1, // Will need to calculate true global position
        yearLevel: entry.student.yearLevel,
        track: entry.student.track,
        section: entry.student.section,
        pointsThisWeek: entry.weeklyPoints || 0,
        pointsThisMonth: entry.monthlyPoints || 0,
        totalPoints: entry.totalPoints || 0,
      };
    });

    // Get filter options
    const filterOptions = {
      yearLevels: await Student.distinct("yearLevel", { isActive: true }),
      tracks: await Student.distinct("track", { isActive: true }),
      sections: await Student.distinct("section", { isActive: true }),
    };

    res.json({
      success: true,
      leaderboard: formattedLeaderboard,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
        limit: limitNum,
      },
      filters: filterOptions,
    });
  } catch (error) {
    console.error("Error fetching global weekly leaderboard:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get PvP leaderboard (real data from Student.pvpStars)
exports.getPvpLeaderboard = async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    // Pull active students sorted by PvP stars (desc)
    const students = await Student.find({ isActive: true })
      .select("firstName lastName username pvpStars")
      .sort({ pvpStars: -1, lastName: 1 })
      .skip(Math.max(0, Number(offset) || 0))
      .limit(Math.max(1, Math.min(200, Number(limit) || 100)));

    // Build rows with rank names based on star thresholds
    const getRankName = (stars) => {
      if (stars >= 480) return "Supreme";
      if (stars >= 400) return "Titan";
      if (stars >= 320) return "Legend";
      if (stars >= 240) return "Elite";
      if (stars >= 160) return "Gladiator";
      if (stars >= 80) return "Knight";
      return "Grasshopper";
    };

    const leaderboard = students.map((s, index) => {
      const stars = typeof s.pvpStars === "number" ? s.pvpStars : 0;
      const fullName =
        `${s.firstName || ""} ${s.lastName || ""}`.trim() ||
        s.username ||
        "Student";
      return {
        id: s._id,
        username: fullName,
        handle: s.username ? `@${s.username}` : undefined,
        stars,
        rankName: getRankName(stars),
        avatarInitial:
          `${(s.firstName || "").charAt(0)}${(s.lastName || "").charAt(
            0
          )}`.toUpperCase() || (fullName[0] || "?").toUpperCase(),
        position: (Number(offset) || 0) + index + 1,
      };
    });

    res.json({ success: true, leaderboard });
  } catch (error) {
    console.error("Error fetching PvP leaderboard:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get leaderboard by subject
exports.getLeaderboardBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { timeFrame = "total" } = req.query;

    let sortField;
    switch (timeFrame) {
      case "weekly":
        sortField = "weeklyPoints";
        break;
      case "monthly":
        sortField = "monthlyPoints";
        break;
      default:
        sortField = "totalPoints";
    }

    const leaderboard = await Leaderboard.find({ subject: subjectId })
      .populate("student", "firstName lastName totalPoints")
      .populate("subject", "name")
      .sort({ [sortField]: -1 })
      .limit(100);

    res.json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get student's rank
exports.getStudentRank = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const studentId = req.user.id;
    const { timeFrame = "total" } = req.query;

    let sortField;
    switch (timeFrame) {
      case "weekly":
        sortField = "weeklyPoints";
        break;
      case "monthly":
        sortField = "monthlyPoints";
        break;
      default:
        sortField = "totalPoints";
    }

    const studentRank = await Leaderboard.findOne({
      subject: subjectId,
      student: studentId,
    })
      .populate("student", "firstName lastName totalPoints")
      .populate("subject", "name");

    if (!studentRank) {
      return res.status(404).json({
        success: false,
        message: "Student not found in leaderboard",
      });
    }

    // Get total number of students in this subject
    const totalStudents = await Leaderboard.countDocuments({
      subject: subjectId,
    });

    res.json({
      success: true,
      data: {
        ...studentRank.toObject(),
        totalStudents,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update student points
exports.updateStudentPoints = async (req, res) => {
  try {
    const { studentId, subjectId, points } = req.body;

    let leaderboardEntry = await Leaderboard.findOne({
      student: studentId,
      subject: subjectId,
    });

    if (!leaderboardEntry) {
      leaderboardEntry = new Leaderboard({
        student: studentId,
        subject: subjectId,
        totalPoints: points,
        weeklyPoints: points,
        monthlyPoints: points,
      });
    } else {
      leaderboardEntry.totalPoints += points;
      leaderboardEntry.weeklyPoints += points;
      leaderboardEntry.monthlyPoints += points;
    }

    await leaderboardEntry.save();

    // Update ranks
    await updateRanks(subjectId);

    res.json({
      success: true,
      data: leaderboardEntry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get student position in leaderboard
exports.getStudentPosition = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { timeFrame = "total" } = req.query;

    let sortField;
    switch (timeFrame) {
      case "weekly":
        sortField = "weeklyPoints";
        break;
      case "monthly":
        sortField = "monthlyPoints";
        break;
      default:
        sortField = "totalPoints";
    }

    // Get student's aggregated points
    const studentData = await Leaderboard.aggregate([
      {
        $match: { student: studentId },
      },
      {
        $group: {
          _id: "$student",
          totalPoints: { $sum: "$totalPoints" },
          weeklyPoints: { $sum: "$weeklyPoints" },
          monthlyPoints: { $sum: "$monthlyPoints" },
        },
      },
    ]);

    if (studentData.length === 0) {
      return res.json({
        success: true,
        position: null,
        message: "Student not found in leaderboard",
      });
    }

    const studentPoints = studentData[0][sortField] || 0;

    // Count students with higher points
    const higherRankedCount = await Leaderboard.aggregate([
      {
        $group: {
          _id: "$student",
          totalPoints: { $sum: "$totalPoints" },
          weeklyPoints: { $sum: "$weeklyPoints" },
          monthlyPoints: { $sum: "$monthlyPoints" },
        },
      },
      {
        $match: {
          [sortField]: { $gt: studentPoints },
        },
      },
      {
        $count: "count",
      },
    ]);

    const position =
      higherRankedCount.length > 0 ? higherRankedCount[0].count + 1 : 1;
    const page = Math.ceil(position / 50); // Assuming 50 items per page

    res.json({
      success: true,
      position,
      page,
      studentPoints,
      rank: getRankFromPoints(studentPoints),
    });
  } catch (error) {
    console.error("Error fetching student position:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get students near a specific rank
exports.getStudentsNearRank = async (req, res) => {
  try {
    const { position, range = 5, timeFrame = "total" } = req.query;
    const targetPosition = parseInt(position);
    const rangeNum = parseInt(range);

    let sortField;
    switch (timeFrame) {
      case "weekly":
        sortField = "weeklyPoints";
        break;
      case "monthly":
        sortField = "monthlyPoints";
        break;
      default:
        sortField = "totalPoints";
    }

    const startPosition = Math.max(1, targetPosition - rangeNum);
    const skip = startPosition - 1;
    const limit = rangeNum * 2 + 1;

    const pipeline = [
      {
        $group: {
          _id: "$student",
          totalPoints: { $sum: "$totalPoints" },
          weeklyPoints: { $sum: "$weeklyPoints" },
          monthlyPoints: { $sum: "$monthlyPoints" },
        },
      },
      {
        $lookup: {
          from: "students",
          localField: "_id",
          foreignField: "_id",
          as: "studentData",
        },
      },
      {
        $unwind: "$studentData",
      },
      {
        $match: {
          "studentData.isActive": true,
        },
      },
      {
        $project: {
          _id: 1,
          totalPoints: 1,
          weeklyPoints: 1,
          monthlyPoints: 1,
          student: {
            _id: "$studentData._id",
            firstName: "$studentData.firstName",
            lastName: "$studentData.lastName",
            email: "$studentData.email",
          },
        },
      },
      { $sort: { [sortField]: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const nearbyStudents = await Leaderboard.aggregate(pipeline);

    const formattedStudents = nearbyStudents.map((entry, index) => {
      const pointsToUse = entry[sortField] || 0;
      const fullName = `${entry.student.firstName} ${entry.student.lastName}`;

      return {
        id: entry.student._id,
        username: fullName,
        handle: `@${entry.student.firstName.toLowerCase()}${entry.student.lastName.toLowerCase()}`,
        mmr: pointsToUse,
        rankName: getRankFromPoints(pointsToUse).name,
        avatarInitial: `${entry.student.firstName.charAt(
          0
        )}${entry.student.lastName.charAt(0)}`.toUpperCase(),
        position: startPosition + index,
      };
    });

    res.json({
      success: true,
      students: formattedStudents,
      targetPosition,
      range: rangeNum,
    });
  } catch (error) {
    console.error("Error fetching students near rank:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get trending performers (biggest gainers)
exports.getTrendingPerformers = async (req, res) => {
  try {
    const { timeFrame = "weekly", limit = 10 } = req.query;
    const limitNum = parseInt(limit);

    // For now, return students with highest recent points
    // In the future, this could compare against previous periods
    let sortField = "weeklyPoints";
    if (timeFrame === "monthly") sortField = "monthlyPoints";

    const pipeline = [
      {
        $group: {
          _id: "$student",
          totalPoints: { $sum: "$totalPoints" },
          weeklyPoints: { $sum: "$weeklyPoints" },
          monthlyPoints: { $sum: "$monthlyPoints" },
        },
      },
      {
        $lookup: {
          from: "students",
          localField: "_id",
          foreignField: "_id",
          as: "studentData",
        },
      },
      {
        $unwind: "$studentData",
      },
      {
        $match: {
          "studentData.isActive": true,
          [sortField]: { $gt: 0 },
        },
      },
      {
        $project: {
          _id: 1,
          totalPoints: 1,
          weeklyPoints: 1,
          monthlyPoints: 1,
          student: {
            _id: "$studentData._id",
            firstName: "$studentData.firstName",
            lastName: "$studentData.lastName",
            email: "$studentData.email",
          },
        },
      },
      { $sort: { [sortField]: -1 } },
      { $limit: limitNum },
    ];

    const trendingStudents = await Leaderboard.aggregate(pipeline);

    const formattedStudents = trendingStudents.map((entry, index) => {
      const pointsToUse = entry[sortField] || 0;
      const fullName = `${entry.student.firstName} ${entry.student.lastName}`;

      return {
        id: entry.student._id,
        username: fullName,
        handle: `@${entry.student.firstName.toLowerCase()}${entry.student.lastName.toLowerCase()}`,
        mmr: pointsToUse,
        rankName: getRankFromPoints(entry.totalPoints || 0).name,
        avatarInitial: `${entry.student.firstName.charAt(
          0
        )}${entry.student.lastName.charAt(0)}`.toUpperCase(),
        recentPoints: pointsToUse,
        totalPoints: entry.totalPoints || 0,
        trend: "up", // Could be calculated based on historical data
      };
    });

    res.json({
      success: true,
      trendingStudents: formattedStudents,
      timeFrame,
    });
  } catch (error) {
    console.error("Error fetching trending performers:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Debug endpoint to check students and leaderboard data
exports.getDebugInfo = async (req, res) => {
  try {
    // Get total students count
    const totalStudents = await Student.countDocuments({ isActive: true });

    // Get total leaderboard entries
    const totalLeaderboardEntries = await Leaderboard.countDocuments();

    // Get sample students
    const sampleStudents = await Student.find({ isActive: true })
      .select("firstName lastName email totalPoints")
      .limit(10);

    // Get sample leaderboard entries
    const sampleLeaderboard = await Leaderboard.find()
      .populate("student", "firstName lastName email")
      .populate("subject", "name")
      .sort({ totalPoints: -1 })
      .limit(10);

    // Get aggregated data sample
    const aggregatedSample = await Leaderboard.aggregate([
      {
        $group: {
          _id: "$student",
          totalPoints: { $sum: "$totalPoints" },
          weeklyPoints: { $sum: "$weeklyPoints" },
          monthlyPoints: { $sum: "$monthlyPoints" },
        },
      },
      {
        $lookup: {
          from: "students",
          localField: "_id",
          foreignField: "_id",
          as: "studentData",
        },
      },
      {
        $unwind: "$studentData",
      },
      {
        $project: {
          _id: 1,
          totalPoints: 1,
          weeklyPoints: 1,
          monthlyPoints: 1,
          student: {
            _id: "$studentData._id",
            firstName: "$studentData.firstName",
            lastName: "$studentData.lastName",
            email: "$studentData.email",
          },
        },
      },
      { $sort: { totalPoints: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      success: true,
      debug: {
        totalStudents,
        totalLeaderboardEntries,
        sampleStudents,
        sampleLeaderboard,
        aggregatedSample,
        message:
          totalStudents === 0
            ? "No students found. You may need to create some student accounts."
            : totalLeaderboardEntries === 0
            ? "Students exist but no leaderboard entries. Students need to take weekly tests to generate leaderboard data."
            : "Data looks good!",
      },
    });
  } catch (error) {
    console.error("Error fetching debug info:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Helper function to update ranks
async function updateRanks(subjectId) {
  const leaderboard = await Leaderboard.find({ subject: subjectId }).sort({
    totalPoints: -1,
  });

  for (let i = 0; i < leaderboard.length; i++) {
    leaderboard[i].rank = i + 1;
    await leaderboard[i].save();
  }

  const weeklyLeaderboard = await Leaderboard.find({ subject: subjectId }).sort(
    { weeklyPoints: -1 }
  );

  for (let i = 0; i < weeklyLeaderboard.length; i++) {
    weeklyLeaderboard[i].weeklyRank = i + 1;
    await weeklyLeaderboard[i].save();
  }

  const monthlyLeaderboard = await Leaderboard.find({
    subject: subjectId,
  }).sort({ monthlyPoints: -1 });

  for (let i = 0; i < monthlyLeaderboard.length; i++) {
    monthlyLeaderboard[i].monthlyRank = i + 1;
    await monthlyLeaderboard[i].save();
  }
}

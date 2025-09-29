import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../../../contexts/AuthContext";
import styles from "./Dashboard.module.css";
import {
  FaFire,
  FaBullseye,
  FaTrophy,
  FaChartBar,
  FaCalendarAlt,
  FaGift,
  FaTasks,
  FaSpinner,
  FaExclamationTriangle,
  FaRedo,
  FaStar,
  FaGamepad,
  FaUsers,
  FaClock,
} from "react-icons/fa";
import FloatingStars from "../../../components/FloatingStars/FloatingStars";
import ApprovalStatus from "../../../components/ApprovalStatus";

const rankingTiers = [
  { name: "Absent Legend", mmr: 0, colorClass: styles.rankBronze },
  { name: "The Crammer", mmr: 150, colorClass: styles.rankSilver },
  { name: "Seatwarmer", mmr: 300, colorClass: styles.rankGold },
  { name: "Group Project Ghost", mmr: 450, colorClass: styles.rankPlatinum },
  {
    name: "Google Scholar (Unofficial)",
    mmr: 600,
    colorClass: styles.rankDiamond,
  },
  { name: "The Lowkey Genius", mmr: 750, colorClass: styles.rankMaster },
  {
    name: "Almost Valedictorian",
    mmr: 900,
    colorClass: styles.rankGrandmaster,
  },
  {
    name: "The Valedictornator",
    mmr: 1050,
    colorClass: styles.rankGrandmaster,
  },
];

// Remove gamified reward text; keep milestones only (empty list shown)
const staticDailyStreakRewards = [];

// Helper function for rank color class
const getRankClass = (rankName) => {
  switch (rankName?.toLowerCase()) {
    case "absent legend":
      return styles.rankBronze;
    case "the crammer":
      return styles.rankSilver;
    case "seatwarmer":
      return styles.rankGold;
    case "group project ghost":
      return styles.rankPlatinum;
    case "google scholar (unofficial)":
      return styles.rankDiamond;
    case "the lowkey genius":
      return styles.rankMaster;
    case "almost valedictorian":
    case "the valedictornator":
      return styles.rankGrandmaster;
    default:
      return styles.rankBronze;
  }
};

const Dashboard = () => {
  const { user } = useAuth();

  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Initialize state for all dashboard data
  const [userDataState, setUserDataState] = useState({
    username: "Student",
    mmr: 0,
    rankName: "Absent Legend",
    testsCompleted: 0,
    pvpStars: 0,
    totalGamesPlayed: 0,
    winRate: 0,
  });

  const [weeklyRankProgressDataState, setWeeklyRankProgressDataState] =
    useState({
      currentMmr: 0,
      currentRankName: "Absent Legend",
      nextRankMmr: 150,
      nextRankName: "The Crammer",
      progressPercent: 0,
      pointsNeeded: 150,
    });

  const [weeklyChallengeDataState, setWeeklyChallengeDataState] = useState({
    hasActiveTests: false,
    activeTests: [],
    completedThisWeek: 0,
    averageScore: 0,
  });

  const [dailyStreakDataState, setDailyStreakDataState] = useState({
    currentStreakDays: 0,
    completedToday: false,
    nextRewardDays: 1,
    progressPercent: 0,
    rewards: staticDailyStreakRewards,
    bestStreak: 0,
  });

  const [leaderboardDataState, setLeaderboardDataState] = useState({
    weekly: [],
    pvp: [],
    myWeeklyRank: null,
    myPvpRank: null,
  });

  useEffect(() => {
    const backendurl = import.meta.env.VITE_BACKEND_URL;
    const token = localStorage.getItem("token");
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    // Enhanced helper functions
    const getTierNameFromMmr = (mmr) => {
      const sortedTiers = [...rankingTiers].sort((a, b) => b.mmr - a.mmr);
      for (let tier of sortedTiers) {
        if (mmr >= tier.mmr) return tier.name;
      }
      return "Absent Legend";
    };

    const getNextTierInfo = (currentMmr) => {
      const sortedTiers = [...rankingTiers].sort((a, b) => a.mmr - b.mmr);
      const nextTier = sortedTiers.find((tier) => tier.mmr > currentMmr);
      return nextTier || null;
    };

    const calculateRankProgress = (currentMmr, currentTier, nextTier) => {
      if (!nextTier) return { progressPercent: 100, pointsNeeded: 0 };

      const currentTierMmr = currentTier?.mmr || 0;
      const nextTierMmr = nextTier.mmr;
      const progress = currentMmr - currentTierMmr;
      const total = nextTierMmr - currentTierMmr;

      return {
        progressPercent: Math.min(100, Math.round((progress / total) * 100)),
        pointsNeeded: Math.max(0, nextTierMmr - currentMmr),
      };
    };

    const computeDailyStreak = (results) => {
      const daysSet = new Set(
        results
          .map((r) => r.completedAt)
          .filter(Boolean)
          .map((d) => new Date(d))
          .map((dt) =>
            new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime()
          )
      );
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const day = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - i
        ).getTime();
        if (daysSet.has(day)) streak++;
        else break;
      }
      // Progress toward next reward tier
      const tiers = [1, 3, 5, 7, 14, 30];
      const nextRewardDays = tiers.find((t) => t > streak) || 30;
      const prevTier = [...tiers].reverse().find((t) => t <= streak) || 0;
      const progressPercentStreak =
        nextRewardDays > prevTier
          ? Math.min(
              100,
              Math.round(
                ((streak - prevTier) / (nextRewardDays - prevTier)) * 100
              )
            )
          : 100;
      const completedToday = daysSet.has(
        new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        ).getTime()
      );
      return { streak, nextRewardDays, progressPercentStreak, completedToday };
    };

    const fetchAll = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Parallel fetches with timeout
        const fetchWithTimeout = (url, options, timeout = 10000) => {
          return Promise.race([
            fetch(url, options),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Request timeout")), timeout)
            ),
          ]);
        };

        const [studentRes, resultsRes, weeksRes, weeklyLbRes, pvpLbRes] =
          await Promise.all([
            fetchWithTimeout(`${backendurl}/api/students/${user.id}`, {
              headers: authHeaders,
            }),
            fetchWithTimeout(
              `${backendurl}/api/weekly-test/results/student/${user.id}`,
              {
                headers: authHeaders,
              }
            ),
            fetchWithTimeout(`${backendurl}/api/weeks/active`, {
              headers: authHeaders,
            }),
            fetchWithTimeout(
              `${backendurl}/api/leaderboard/global?timeFrame=weekly`
            ),
            fetchWithTimeout(`${backendurl}/api/leaderboard/pvp`, {
              headers: authHeaders,
            }),
          ]);

        // Enhanced student data processing
        if (studentRes.ok) {
          const studentData = await studentRes.json();
          const sd = studentData.data || {};
          setUserDataState((prev) => ({
            ...prev,
            username: sd.firstName || user?.firstName || "Innovator",
            pvpStars: sd.pvpStars || 0,
            totalGamesPlayed: sd.totalGamesPlayed || 0,
            winRate:
              sd.totalGamesPlayed > 0
                ? Math.round(((sd.gamesWon || 0) / sd.totalGamesPlayed) * 100)
                : 0,
          }));
        } else {
          console.warn("Failed to fetch student data:", studentRes.status);
        }

        // Process weekly leaderboard data first (only read once)
        let weeklyLeaderboardData = null;
        if (weeklyLbRes.ok) {
          weeklyLeaderboardData = await weeklyLbRes.json();
        }

        // Enhanced weekly test results processing
        let results = [];
        let prPoints = 0;
        let tierName = "Absent Legend";

        if (resultsRes.ok) {
          const resData = await resultsRes.json();
          results = resData.data?.results || [];
          const testsCompleted = results.length;

          // Use leaderboard data for ranking if available, otherwise fallback to test points
          if (weeklyLeaderboardData) {
            const leaderboard = weeklyLeaderboardData.leaderboard || [];
            const myEntry = leaderboard.find(
              (player) => player.id === user.id || player._id === user.id
            );

            if (myEntry) {
              prPoints = myEntry.mmr || myEntry.totalPoints || 0;
              tierName = myEntry.rankName || getTierNameFromMmr(prPoints);
            } else {
              // Fallback to summing test points if not in leaderboard
              prPoints = results.reduce(
                (acc, r) => acc + (r.pointsEarned || 0),
                0
              );
              tierName = getTierNameFromMmr(prPoints);
            }
          } else {
            // Fallback to summing test points if leaderboard fails
            prPoints = results.reduce(
              (acc, r) => acc + (r.pointsEarned || 0),
              0
            );
            tierName = getTierNameFromMmr(prPoints);
          }

          // Calculate weekly stats
          const now = new Date();
          const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
          const weeklyResults = results.filter(
            (r) => new Date(r.completedAt) >= weekStart
          );
          const completedThisWeek = weeklyResults.length;
          const averageScore =
            weeklyResults.length > 0
              ? Math.round(
                  weeklyResults.reduce((acc, r) => acc + (r.score || 0), 0) /
                    weeklyResults.length
                )
              : 0;

          setUserDataState((prev) => ({
            ...prev,
            mmr: prPoints,
            rankName: tierName,
            testsCompleted,
          }));

          // Enhanced rank progress calculation
          const currentTier = rankingTiers.find(
            (tier) => tier.name === tierName
          );
          const nextTier = getNextTierInfo(prPoints);
          const { progressPercent, pointsNeeded } = calculateRankProgress(
            prPoints,
            currentTier,
            nextTier
          );

          setWeeklyRankProgressDataState({
            currentMmr: prPoints,
            currentRankName: tierName,
            nextRankMmr: nextTier?.mmr || prPoints,
            nextRankName: nextTier?.name || "Max Rank",
            progressPercent,
            pointsNeeded,
          });

          // Update weekly challenge data
          setWeeklyChallengeDataState((prev) => ({
            ...prev,
            completedThisWeek,
            averageScore,
          }));

          // Enhanced daily streak calculation
          const {
            streak,
            nextRewardDays,
            progressPercentStreak,
            completedToday,
          } = computeDailyStreak(results);

          // Calculate best streak from historical data
          const bestStreak = Math.max(
            streak,
            results.length > 0
              ? Math.max(...results.map((r) => r.streak || 0))
              : 0
          );

          setDailyStreakDataState({
            currentStreakDays: streak,
            completedToday,
            nextRewardDays,
            progressPercent: progressPercentStreak,
            rewards: staticDailyStreakRewards,
            bestStreak,
          });
        } else {
          console.warn("Failed to fetch test results:", resultsRes.status);
        }

        // Enhanced weekly challenges processing
        if (weeksRes.ok) {
          const weeksData = await weeksRes.json();
          const scheduleArray = Array.isArray(weeksData) ? weeksData : [];
          const activeTests = scheduleArray.slice(0, 5).map((w) => ({
            id: w._id,
            name: `Week ${w.weekNumber} — ${w.subjectId?.subject || "Subject"}`,
            difficulty: w.difficulty || "Medium",
            deadline: w.deadline,
            status: w.status || "active",
          }));
          setWeeklyChallengeDataState((prev) => ({
            ...prev,
            hasActiveTests: scheduleArray.length > 0,
            activeTests,
          }));
        } else {
          console.warn("Failed to fetch active weeks:", weeksRes.status);
        }

        // Enhanced leaderboard processing (using already-read data)
        if (weeklyLeaderboardData) {
          const leaderboard = weeklyLeaderboardData.leaderboard || [];
          const myRank =
            leaderboard.findIndex(
              (player) => player.id === user.id || player._id === user.id
            ) + 1;

          setLeaderboardDataState((prev) => ({
            ...prev,
            weekly: leaderboard,
            myWeeklyRank: myRank > 0 ? myRank : null,
          }));
        } else {
          console.warn(
            "Failed to fetch weekly leaderboard:",
            weeklyLbRes.status
          );
        }

        // Enhanced PvP leaderboard processing
        if (pvpLbRes.ok) {
          const pvpData = await pvpLbRes.json();
          const leaderboard = pvpData.leaderboard || [];
          const myRank =
            leaderboard.findIndex(
              (player) => player.id === user.id || player._id === user.id
            ) + 1;

          setLeaderboardDataState((prev) => ({
            ...prev,
            pvp: leaderboard,
            myPvpRank: myRank > 0 ? myRank : null,
          }));
        } else {
          console.warn("Failed to fetch PvP leaderboard:", pvpLbRes.status);
        }

        setLastUpdated(new Date());
      } catch (err) {
        console.error("Failed to load dashboard:", err);
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.id) {
      fetchAll();
    }
  }, [user?.id]);

  // Refresh function for manual data refresh
  const handleRefresh = useCallback(() => {
    if (user?.id && !isLoading) {
      const backendurl = import.meta.env.VITE_BACKEND_URL;
      const token = localStorage.getItem("token");
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

      // Reuse the same fetchAll logic but as a callback
      const refreshData = async () => {
        try {
          setIsLoading(true);
          setError(null);

          // Same fetch logic as in useEffect
          const fetchWithTimeout = (url, options, timeout = 10000) => {
            return Promise.race([
              fetch(url, options),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Request timeout")), timeout)
              ),
            ]);
          };

          // Simplified refresh - just fetch the most critical data
          const [studentRes, resultsRes] = await Promise.all([
            fetchWithTimeout(`${backendurl}/api/students/${user.id}`, {
              headers: authHeaders,
            }),
            fetchWithTimeout(
              `${backendurl}/api/weekly-test/results/student/${user.id}`,
              {
                headers: authHeaders,
              }
            ),
          ]);

          // Process student data
          if (studentRes.ok) {
            const studentData = await studentRes.json();
            const sd = studentData.data || {};
            setUserDataState((prev) => ({
              ...prev,
              username: sd.firstName || user?.firstName || "Innovator",
              pvpStars: sd.pvpStars || 0,
              totalGamesPlayed: sd.totalGamesPlayed || 0,
              winRate:
                sd.totalGamesPlayed > 0
                  ? Math.round(((sd.gamesWon || 0) / sd.totalGamesPlayed) * 100)
                  : 0,
            }));
          }

          if (resultsRes.ok) {
            const resData = await resultsRes.json();
            const results = resData.data?.results || [];

            // Calculate points from results (simplified for refresh)
            const prPoints = results.reduce(
              (acc, r) => acc + (r.pointsEarned || 0),
              0
            );
            const tierName = getTierNameFromMmr(prPoints);

            setUserDataState((prev) => ({
              ...prev,
              mmr: prPoints,
              rankName: tierName,
              testsCompleted: results.length,
            }));
          }

          setLastUpdated(new Date());
        } catch (err) {
          console.error("Failed to refresh dashboard:", err);
          setError("Failed to refresh data");
        } finally {
          setIsLoading(false);
        }
      };

      refreshData();
    }
  }, [user?.id, isLoading]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (user?.id && !isLoading) {
        handleRefresh();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user?.id, isLoading, handleRefresh]);

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className={styles.dashboardContainer}>
      <FloatingStars />
      <div className={styles.pageHeader}>
        <div
          style={{
            height: "40px",
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: "8px",
            marginBottom: "10px",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
        <div
          style={{
            height: "20px",
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: "4px",
            width: "60%",
          }}
        />
      </div>
      <div className={styles.statsGrid}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={styles.statCard} style={{ opacity: 0.3 }}>
            <FaSpinner style={{ animation: "spin 1s linear infinite" }} />
            <span>Loading...</span>
            <span>Please wait</span>
          </div>
        ))}
      </div>
    </div>
  );

  // Error component
  const ErrorDisplay = () => (
    <div className={styles.dashboardContainer}>
      <FloatingStars />
      <div className={styles.pageHeader}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: "#ef4444",
            marginBottom: "20px",
          }}
        >
          <FaExclamationTriangle />
          <h2>Failed to Load Dashboard</h2>
        </div>
        <p style={{ color: "#6b7280", marginBottom: "20px" }}>{error}</p>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          style={{
            background: "var(--legendary-gold)",
            color: "#1f2937",
            border: "none",
            padding: "10px 20px",
            borderRadius: "8px",
            fontWeight: "700",
            cursor: isLoading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {isLoading ? (
            <FaSpinner style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <FaRedo />
          )}
          {isLoading ? "Refreshing..." : "Retry"}
        </button>
      </div>
    </div>
  );

  if (isLoading && !lastUpdated) {
    return <LoadingSkeleton />;
  }

  if (error && !lastUpdated) {
    return <ErrorDisplay />;
  }

  return (
    <div className={styles.dashboardContainer}>
      <FloatingStars />
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>
          Welcome,{" "}
          <span className={styles.pageTitleUsername}>
            {userDataState.username || "Innovator"}!
          </span>
        </h1>
      </div>
      {/* Enhanced Stats Cards Row */}
      <div className={styles.statsGrid}>
        <div
          className={styles.statCard}
          title={`${weeklyChallengeDataState.completedThisWeek} completed this week`}
        >
          <span className={styles.statIcon}>
            <FaTasks />
          </span>
          <span className={styles.statValue}>
            {weeklyChallengeDataState.activeTests.length}
          </span>
          <span className={styles.statLabel}>Active Tests</span>
          {weeklyChallengeDataState.completedThisWeek > 0 && (
            <span style={{ fontSize: "0.7em", opacity: 0.8, marginTop: "2px" }}>
              +{weeklyChallengeDataState.completedThisWeek} this week
            </span>
          )}
        </div>

        <div
          className={styles.statCard}
          title={`Best streak: ${dailyStreakDataState.bestStreak} days`}
        >
          <span className={styles.statIcon}>
            <FaFire />
          </span>
          <span className={styles.statValue}>
            {dailyStreakDataState.currentStreakDays}
          </span>
          <span className={styles.statLabel}>Day Streak</span>
          {dailyStreakDataState.bestStreak >
            dailyStreakDataState.currentStreakDays && (
            <span style={{ fontSize: "0.7em", opacity: 0.8, marginTop: "2px" }}>
              Best: {dailyStreakDataState.bestStreak}
            </span>
          )}
        </div>

        <div
          className={styles.statCard}
          title={`${userDataState.testsCompleted} total tests completed`}
        >
          <span className={styles.statIcon}>
            <FaBullseye />
          </span>
          <span className={styles.statValue}>{userDataState.mmr}</span>
          <span className={styles.statLabel}>Total Points</span>
          {leaderboardDataState.myWeeklyRank && (
            <span style={{ fontSize: "0.7em", opacity: 0.8, marginTop: "2px" }}>
              Rank #{leaderboardDataState.myWeeklyRank}
            </span>
          )}
        </div>

        <div
          className={styles.statCard}
          title={`${userDataState.totalGamesPlayed} PvP games played`}
        >
          <span className={styles.statIcon}>
            <FaGamepad />
          </span>
          <span className={styles.statValue}>{userDataState.pvpStars}</span>
          <span className={styles.statLabel}>PvP Stars</span>
          {userDataState.totalGamesPlayed > 0 && (
            <span style={{ fontSize: "0.7em", opacity: 0.8, marginTop: "2px" }}>
              {userDataState.winRate}% win rate
            </span>
          )}
        </div>

        {/* Additional rank card */}
        <div
          className={`${styles.statCard} ${styles.rankCard}`}
          style={{ gridColumn: "span 2" }}
        >
          <span className={styles.statIcon}>
            <FaTrophy />
          </span>
          <span
            className={`${styles.statValue} ${getRankClass(
              userDataState.rankName
            )}`}
          >
            {userDataState.rankName}
          </span>
          <span className={styles.statLabel}>Current Rank</span>
          <div
            style={{
              fontSize: "0.8em",
              opacity: 0.9,
              marginTop: "5px",
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <span>
              Progress: {weeklyRankProgressDataState.progressPercent}%
            </span>
            {weeklyRankProgressDataState.pointsNeeded > 0 && (
              <span>{weeklyRankProgressDataState.pointsNeeded} pts needed</span>
            )}
          </div>
        </div>

        {/* Weekly performance card */}
        <div className={styles.statCard} title="This week's performance">
          <span className={styles.statIcon}>
            <FaClock />
          </span>
          <span className={styles.statValue}>
            {weeklyChallengeDataState.averageScore}%
          </span>
          <span className={styles.statLabel}>Avg Score</span>
          <span style={{ fontSize: "0.7em", opacity: 0.8, marginTop: "2px" }}>
            This week
          </span>
        </div>
      </div>
      {/* Dashboard Layout Grid */}
      <div className={styles.dashboardLayoutGrid}>
        {/* Main Content Area */}
        <div className={styles.mainContentArea}>
          {/* Approval Status */}
          <ApprovalStatus
            isApproved={user?.isApproved}
            isActive={user?.isActive}
          />

          {/* MMR Progress Panel */}
          <div className={styles.panel}>
            <h2 className={styles.panelHeader}>
              <span className={styles.panelIcon}>
                <FaChartBar />
              </span>{" "}
              Points Progress
            </h2>
            <div className={styles.mmrProgress}>
              <div className={styles.mmrInfo}>
                <span
                  className={`${styles.currentRankMmr} ${getRankClass(
                    weeklyRankProgressDataState.currentRankName
                  )}`}
                >
                  {weeklyRankProgressDataState.currentMmr}{" "}
                  <span className={styles.rankName}>
                    {weeklyRankProgressDataState.currentRankName}
                  </span>
                </span>
                <span className={styles.nextRank}>
                  {weeklyRankProgressDataState.nextRankName
                    ? `Next: ${weeklyRankProgressDataState.nextRankName}`
                    : "MAX EFFICIENCY"}
                </span>
              </div>
              <div className={styles.progressBarContainer}>
                <div
                  className={`${styles.progressBarFill} ${styles.progressBarFillMmr}`}
                  style={{
                    width: `${weeklyRankProgressDataState.progressPercent}%`,
                  }}
                  aria-valuenow={weeklyRankProgressDataState.progressPercent}
                  aria-valuemin="0"
                  aria-valuemax="100"
                ></div>
              </div>
              <div className={styles.progressText}>
                <span>
                  {weeklyRankProgressDataState.pointsNeeded > 0
                    ? `${weeklyRankProgressDataState.pointsNeeded} Data Points needed for next designation`
                    : "You've reached MAX EFFICIENCY!"}
                </span>
                <span>{weeklyRankProgressDataState.progressPercent}%</span>
              </div>
            </div>
            <div className={styles.tierInfoGrid}>
              {rankingTiers.map((tier) => (
                <div
                  key={tier.name}
                  className={`${styles.tierBox} ${
                    tier.name === userDataState.rankName
                      ? styles.currentTier
                      : ""
                  }`}
                  style={{
                    opacity: tier.name === userDataState.rankName ? 1 : 0.7,
                    transform:
                      tier.name === userDataState.rankName
                        ? "scale(1.05)"
                        : "scale(1)",
                    border:
                      tier.name === userDataState.rankName
                        ? "2px solid var(--legendary-gold)"
                        : "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <span className={styles.tierName}>{tier.name}</span>
                  <span className={`${styles.tierMmr} ${tier.colorClass}`}>
                    {tier.mmr}+ pts
                  </span>
                  {tier.name === userDataState.rankName && (
                    <div
                      style={{
                        fontSize: "0.7em",
                        color: "var(--legendary-gold)",
                        marginTop: "4px",
                        fontWeight: "bold",
                      }}
                    >
                      ← Current
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Challenges Panel */}
          <div className={styles.panel}>
            <h2 className={styles.panelHeader}>
              <span className={styles.panelIcon}>
                <FaBullseye />
              </span>{" "}
              Weekly Challenges
            </h2>
            <div className={styles.weeklyChallengesContent}>
              {weeklyChallengeDataState.hasActiveTests ? (
                <ul className={styles.activeTestsList}>
                  {weeklyChallengeDataState.activeTests.map((test) => (
                    <li
                      key={test.id || test.name}
                      className={styles.activeTestItem}
                    >
                      <Link
                        to={`/student/weeklytest`}
                        className={styles.activeTestLink}
                      >
                        {test.name || test.projectName || "Unnamed Project"}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.noTestsMessage}>
                  No active weeks. Check back later!
                </p>
              )}
              <Link to="/student/weeklytest" className={styles.browseButton}>
                Go to Weekly Tests
              </Link>
            </div>
          </div>
        </div>
        {/* End Main Content Area */}
        {/* Sidebar Area */}
        <div className={styles.sidebarArea}>
          {/* Daily Streak Panel */}
          <div className={`${styles.panel} ${styles.dailyStreakPanel}`}>
            <h2 className={styles.panelHeader}>
              <span className={styles.panelIcon}>
                <FaCalendarAlt />
              </span>{" "}
              Learning Streak
            </h2>
            <div className={styles.dailyStreakContent}>
              <div className={styles.streakHeader}>
                <span className={styles.streakDays}>
                  {dailyStreakDataState.currentStreakDays} Day
                  {dailyStreakDataState.currentStreakDays !== 1 ? "s" : ""}
                </span>
                <span
                  className={`${styles.streakStatus} ${
                    dailyStreakDataState.completedToday
                      ? styles.statusComplete
                      : styles.statusIncomplete
                  }`}
                >
                  {dailyStreakDataState.completedToday
                    ? "Did a test today!"
                    : "Do a test today!"}
                </span>
              </div>
              <div
                className={`${styles.progressBarContainer} ${styles.streakProgressBarContainer}`}
              >
                <div
                  className={`${styles.progressBarFill} ${styles.streakProgressBarFill}`}
                  style={{ width: `${dailyStreakDataState.progressPercent}%` }}
                  aria-valuenow={dailyStreakDataState.progressPercent}
                  aria-valuemin="0"
                  aria-valuemax="100"
                ></div>
              </div>
              <div className={styles.streakNextReward}>
                Next Reward:{" "}
                {dailyStreakDataState.currentStreakDays >= 30
                  ? "Max streak achieved!"
                  : `Reach ${dailyStreakDataState.nextRewardDays} days for a new reward!`}
              </div>
              <ul className={styles.streakRewardList}>
                {dailyStreakDataState.rewards.map((reward) => (
                  <li key={reward.days} className={styles.streakRewardItem}>
                    <span className={styles.rewardDays}>
                      <span className={styles.rewardDaysIcon}>
                        <FaGift />
                      </span>
                      {reward.days} day{reward.days > 1 ? "s" : ""}
                    </span>
                    <span className={styles.rewardText}>
                      {reward.rewardText}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>{" "}
        {/* End Sidebar Area */}
      </div>{" "}
      {/* End Dashboard Layout Grid */}
      {/* Leaderboards Section */}
      <div className={styles.leaderboardSection}>
        {/* Weekly Test Rankings */}
        <div className={`${styles.panel} ${styles.leaderboardPanel}`}>
          <div className={styles.leaderboardHeader}>
            <h2 className={`${styles.panelHeader} ${styles.leaderboardTitle}`}>
              <span className={styles.panelIcon}>
                <FaTrophy />
              </span>{" "}
              Weekly Test Rankings
            </h2>
            <Link to="/leaderboard/global" className={styles.viewAllLink}>
              View All
            </Link>
          </div>
          <table className={styles.leaderboardTable}>
            <thead>
              <tr>
                <th className={styles.rankHeader}>#</th>
                <th>Student</th>
                <th className={styles.mmrHeader}>Points (Week)</th>
                <th className={styles.rankTierHeader}>Rank</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardDataState.weekly.length === 0 && (
                <tr>
                  <td
                    colSpan="4"
                    style={{
                      textAlign: "center",
                      padding: "15px",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    No Weekly Rankings
                  </td>
                </tr>
              )}
              {leaderboardDataState.weekly.slice(0, 3).map((u, index) => {
                const displayName =
                  u.username || u.name || u.user?.username || "Student";
                const avatarInitial = (
                  u.avatarInitial || displayName.charAt(0)
                ).toUpperCase();
                const weeklyPoints = u.pointsThisWeek ?? u.points ?? u.mmr ?? 0;
                const rankName = u.rankName || "-";
                return (
                  <tr key={u.id || u._id || displayName + index}>
                    <td className={styles.leaderboardRankNumber}>
                      <span className={styles.leaderboardRankIcon}>
                        <FaTrophy />
                      </span>
                      {index + 1}
                    </td>
                    <td>
                      <div className={styles.leaderboardStudentCell}>
                        <div className={styles.leaderboardAvatar}>
                          {avatarInitial}
                        </div>
                        <div className={styles.leaderboardStudentInfo}>
                          <span className={styles.leaderboardUsername}>
                            {displayName}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className={styles.leaderboardMmrValue}>
                      {weeklyPoints}
                    </td>
                    <td
                      className={`${
                        styles.leaderboardRankTierValue
                      } ${getRankClass(rankName)}`}
                    >
                      {rankName}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* PvP Rankings */}
        <div className={`${styles.panel} ${styles.leaderboardPanel}`}>
          <div className={styles.leaderboardHeader}>
            <h2 className={`${styles.panelHeader} ${styles.leaderboardTitle}`}>
              <span className={styles.panelIcon}>
                <FaTrophy />
              </span>{" "}
              PvP Rankings
            </h2>
          </div>
          <table className={styles.leaderboardTable}>
            <thead>
              <tr>
                <th className={styles.rankHeader}>#</th>
                <th>Student</th>
                <th className={styles.mmrHeader}>Stars</th>
                <th className={styles.rankTierHeader}>Rank</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardDataState.pvp.length === 0 && (
                <tr>
                  <td
                    colSpan="4"
                    style={{
                      textAlign: "center",
                      padding: "15px",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    No PvP Rankings
                  </td>
                </tr>
              )}
              {leaderboardDataState.pvp.slice(0, 3).map((u, index) => {
                const displayName =
                  u.username || u.name || u.user?.username || "Student";
                const avatarInitial = (
                  u.avatarInitial || displayName.charAt(0)
                ).toUpperCase();
                const stars = u.stars ?? u.points ?? u.mmr ?? 0;
                const rankName = u.rankName || "-";
                return (
                  <tr key={u.id || u._id || displayName + index}>
                    <td className={styles.leaderboardRankNumber}>
                      <span className={styles.leaderboardRankIcon}>
                        <FaTrophy />
                      </span>
                      {index + 1}
                    </td>
                    <td>
                      <div className={styles.leaderboardStudentCell}>
                        <div className={styles.leaderboardAvatar}>
                          {avatarInitial}
                        </div>
                        <div className={styles.leaderboardStudentInfo}>
                          <span className={styles.leaderboardUsername}>
                            {displayName}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className={styles.leaderboardMmrValue}>{stars}</td>
                    <td className={styles.leaderboardRankTierValue}>
                      {rankName}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

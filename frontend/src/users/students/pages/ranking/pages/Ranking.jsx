import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  useQuery,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import { useDebounce } from "use-debounce";
import { useInView } from "react-intersection-observer";
import { FixedSizeList as List } from "react-window";
import styles from "./Ranking.module.css";
import {
  FaFilter,
  FaListOl,
  FaSearch,
  FaTrophy,
  FaChevronUp,
  FaChevronDown,
  FaFire,
  FaArrowUp,
  FaArrowDown,
  FaMinus,
  FaEye,
  FaUsers,
  FaStar,
  FaBed,
  FaClock,
  FaBookOpen,
  FaPaperclip,
  FaBookReader,
  FaMedal,
  FaMicrophoneAlt,
  FaBug,
  FaUserShield,
  FaShieldAlt,
  FaCrown,
  FaFistRaised,
  FaAward,
  FaChartLine,
  FaLocationArrow,
  FaSync,
  FaCalendarAlt,
  FaGraduationCap,
} from "react-icons/fa";
import FloatingStars from "../../../components/FloatingStars/FloatingStars";
import { useAuth } from "../../../../../contexts/AuthContext";

// Icon Components
const iconComponents = {
  FaBed,
  FaClock,
  FaBookOpen,
  FaPaperclip,
  FaSearch,
  FaBookReader,
  FaMedal,
  FaMicrophoneAlt,
  FaBug,
  FaUserShield,
  FaShieldAlt,
  FaCrown,
  FaStar,
  FaFistRaised,
  FaAward,
};

const IconComponent = ({ iconName, ...props }) => {
  const ActualIcon = iconComponents[iconName];
  if (!ActualIcon) return null;
  return <ActualIcon {...props} />;
};

// Rank Systems
const weeklyRanks = [
  {
    min: 0,
    max: 149,
    name: "Absent Legend",
    prIcon: "FaBed",
    description: "Technically enrolled.",
    color: "#888",
  },
  {
    min: 150,
    max: 299,
    name: "The Crammer",
    prIcon: "FaClock",
    description:
      "Studies best under extreme pressure—like 5 minutes before class.",
    color: "#FFC107",
  },
  {
    min: 300,
    max: 449,
    name: "Seatwarmer",
    prIcon: "FaBookOpen",
    description: "Physically present, mentally... buffering.",
    color: "#A0522D",
  },
  {
    min: 450,
    max: 599,
    name: "Group Project Ghost",
    prIcon: "FaPaperclip",
    description: "Appears only during final presentation day.",
    color: "#B0C4DE",
  },
  {
    min: 600,
    max: 749,
    name: "Google Scholar (Unofficial)",
    prIcon: "FaSearch",
    description: 'Master of Ctrl+F and "Quizlet."',
    color: "#27ae60",
  },
  {
    min: 750,
    max: 899,
    name: "The Lowkey Genius",
    prIcon: "FaBookReader",
    description: "Never recites, still gets the highest score.",
    color: "#3498db",
  },
  {
    min: 900,
    max: 1049,
    name: "Almost Valedictorian",
    prIcon: "FaMedal",
    description: "Always 0.01 short—every time.",
    color: "#f1c40f",
  },
  {
    min: 1050,
    max: Infinity,
    name: "The Valedictornator",
    prIcon: "FaMicrophoneAlt",
    description: "Delivers speeches, aces tests, and might run the school.",
    color: "#e74c3c",
  },
];

const pvpRanks = [
  {
    min: 0,
    max: 79,
    name: "Grasshopper",
    pvpIcon: "FaBug",
    description: "Newbie — Just starting out.",
    color: "#27ae60",
  },
  {
    min: 80,
    max: 159,
    name: "Knight",
    pvpIcon: "FaUserShield",
    description: "Rising Warrior — Showing promise.",
    color: "#B0C4DE",
  },
  {
    min: 160,
    max: 239,
    name: "Gladiator",
    pvpIcon: "FaShieldAlt",
    description: "Skilled Fighter — Battle-ready.",
    color: "#C0C0C0",
  },
  {
    min: 240,
    max: 319,
    name: "Elite",
    pvpIcon: "FaCrown",
    description: "Champion in the Making.",
    color: "#f1c40f",
  },
  {
    min: 320,
    max: 399,
    name: "Legend",
    pvpIcon: "FaStar",
    description: "Feared by many.",
    color: "#3498db",
  },
  {
    min: 400,
    max: 479,
    name: "Titan",
    pvpIcon: "FaFistRaised",
    description: "Legendary Force — Near unstoppable.",
    color: "#D8A2FF",
  },
  {
    min: 480,
    max: 500,
    name: "Supreme",
    pvpIcon: "FaAward",
    description: "Absolute Peak — Top of the ranks.",
    color: "#e74c3c",
  },
];

// API functions
const fetchLeaderboard = async ({ queryKey, pageParam = 1 }) => {
  const [_key, { type, filters }] = queryKey;
  const params = new URLSearchParams({
    page: pageParam.toString(),
    limit: "50",
    ...filters,
  });

  // Align with backend routes: /api/leaderboard/global for weekly totals
  const endpoint =
    type === "pvp" ? "/api/pvp/leaderboard" : "/api/leaderboard/global";
  const response = await fetch(
    `${import.meta.env.VITE_BACKEND_URL}${endpoint}?${params}`,
    {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    }
  );

  if (!response.ok) throw new Error("Failed to fetch leaderboard");
  return response.json();
};

const fetchMyPosition = async (timeFrame = "total") => {
  const response = await fetch(
    `${
      import.meta.env.VITE_BACKEND_URL
    }/api/leaderboard/my-position?timeFrame=${timeFrame}`,
    {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    }
  );
  if (!response.ok) throw new Error("Failed to fetch position");
  return response.json();
};

const fetchTrendingPerformers = async (timeFrame = "weekly") => {
  const response = await fetch(
    `${
      import.meta.env.VITE_BACKEND_URL
    }/api/leaderboard/trending?timeFrame=${timeFrame}`,
    {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    }
  );
  if (!response.ok) throw new Error("Failed to fetch trending performers");
  return response.json();
};

const fetchNearMyRank = async (position, range = 5) => {
  const response = await fetch(
    `${
      import.meta.env.VITE_BACKEND_URL
    }/api/leaderboard/near-rank?position=${position}&range=${range}`,
    {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    }
  );
  if (!response.ok) throw new Error("Failed to fetch nearby students");
  return response.json();
};

// Enhanced Loading Skeleton
const LoadingSkeleton = () => (
  <div className={styles.loadingSkeleton}>
    {[...Array(10)].map((_, i) => (
      <motion.div
        key={i}
        className={styles.skeletonRow}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
      >
        <div className={styles.skeletonRank}></div>
        <div className={styles.skeletonStudent}>
          <div className={styles.skeletonAvatar}></div>
          <div className={styles.skeletonInfo}>
            <div className={styles.skeletonName}></div>
            <div className={styles.skeletonHandle}></div>
          </div>
        </div>
        <div className={styles.skeletonPoints}></div>
        <div className={styles.skeletonRankName}></div>
      </motion.div>
    ))}
  </div>
);

// Enhanced Row Component with Animations
const StudentRow = React.memo(
  ({ student, index, isCurrentUser, previousPosition }) => {
    const [showDetails, setShowDetails] = useState(false);

    const positionChange = previousPosition
      ? previousPosition - student.position
      : 0;
    const trendIcon =
      positionChange > 0 ? (
        <FaArrowUp className={styles.trendUp} />
      ) : positionChange < 0 ? (
        <FaArrowDown className={styles.trendDown} />
      ) : (
        <FaMinus className={styles.trendNeutral} />
      );

    return (
      <motion.tr
        key={student.id}
        className={`${styles.studentRow} ${
          isCurrentUser ? styles.currentUserRow : ""
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        whileHover={{ scale: 1.02, backgroundColor: "rgba(241, 196, 15, 0.1)" }}
        onClick={() => setShowDetails(!showDetails)}
      >
        <td className={styles.rankNumber}>
          <div className={styles.rankContainer}>
            <motion.span
              className={styles.rankIcon}
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
            >
              <FaTrophy />
            </motion.span>
            <span className={styles.position}>{student.position}</span>
            {positionChange !== 0 && (
              <motion.span
                className={styles.positionChange}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500 }}
              >
                {trendIcon}
              </motion.span>
            )}
          </div>
        </td>
        <td>
          <div className={styles.studentCell}>
            <motion.div
              className={styles.avatar}
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              {student.avatarInitial}
            </motion.div>
            <div className={styles.studentInfo}>
              <span className={styles.username}>{student.username}</span>
              <span className={styles.handle}>{student.handle}</span>
              {student.yearLevel && (
                <span className={styles.yearLevel}>{student.yearLevel}</span>
              )}
            </div>
            {isCurrentUser && (
              <motion.span
                className={styles.youTag}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.5 }}
              >
                You
              </motion.span>
            )}
            {student.trend === "up" && (
              <motion.span
                className={styles.hotStreak}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <FaFire />
              </motion.span>
            )}
          </div>
        </td>
        <td className={styles.mmrValue}>
          <motion.span
            key={student.mmr}
            initial={{ scale: 1.2, color: "#f1c40f" }}
            animate={{ scale: 1, color: "#fff" }}
            transition={{ duration: 0.5 }}
          >
            {student.mmr}
          </motion.span>
          {student.pointsThisWeek > 0 && (
            <div className={styles.weeklyPoints}>
              +{student.pointsThisWeek} this week
            </div>
          )}
        </td>
        <td
          className={`${styles.rankTierValue} ${
            styles[
              `rank${student.rankName
                ?.replace(/\s+/g, "")
                .replace(/[^a-zA-Z0-9]/g, "")}`
            ]
          }`}
        >
          {student.rankName}
        </td>
      </motion.tr>
    );
  }
);

// Main Ranking Component
const Ranking = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // State management
  const [leaderboardType, setLeaderboardType] = useState("global");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [timeFrame, setTimeFrame] = useState("total");
  const [filters, setFilters] = useState({
    yearLevel: "",
    track: "",
    section: "",
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showTrending, setShowTrending] = useState(false);
  const [showNearMyRank, setShowNearMyRank] = useState(false);
  const [autoRefresh] = useState(true);
  const [showRankTiers, setShowRankTiers] = useState(false);

  // Intersection observer for infinite scroll
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: "100px",
  });

  // Build query filters
  const queryFilters = useMemo(
    () => ({
      search: debouncedSearchTerm,
      timeFrame,
      ...filters,
    }),
    [debouncedSearchTerm, timeFrame, filters]
  );

  // Main leaderboard query with infinite scrolling
  const {
    data: leaderboardData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    error,
    refetch: refetchLeaderboard,
  } = useInfiniteQuery({
    queryKey: ["leaderboard", { type: leaderboardType, filters: queryFilters }],
    queryFn: fetchLeaderboard,
    getNextPageParam: (lastPage) =>
      lastPage.pagination?.hasNext
        ? lastPage.pagination.currentPage + 1
        : undefined,
    staleTime: autoRefresh ? 30000 : 5 * 60 * 1000, // 30s with auto-refresh, 5min without
    enabled: true,
  });

  // My position query
  const { data: myPositionData } = useQuery({
    queryKey: ["myPosition", timeFrame],
    queryFn: () => fetchMyPosition(timeFrame),
    enabled: !!user,
    staleTime: 60000,
  });

  // Trending performers query
  const { data: trendingData } = useQuery({
    queryKey: ["trending", timeFrame],
    queryFn: () => fetchTrendingPerformers(timeFrame),
    enabled: showTrending,
    staleTime: 2 * 60 * 1000,
  });

  // Near my rank query
  const { data: nearMyRankData } = useQuery({
    queryKey: ["nearMyRank", myPositionData?.position],
    queryFn: () => fetchNearMyRank(myPositionData.position, 5),
    enabled: showNearMyRank && !!myPositionData?.position,
    staleTime: 60000,
  });

  // Auto-refresh effect
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries(["leaderboard"]);
      queryClient.invalidateQueries(["myPosition"]);
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [queryClient]);

  // Infinite scroll effect
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Jump to my position
  const jumpToMyPosition = useCallback(async () => {
    if (!myPositionData?.position) return;

    // Reset the query and fetch the page containing user's position
    await queryClient.resetQueries(["leaderboard"]);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [myPositionData, queryClient]);

  // Flatten all pages data
  const isPvpLeaderboard = leaderboardType === "program";

  const allStudents = useMemo(() => {
    if (!leaderboardData?.pages) return [];

    return leaderboardData.pages.reduce((acc, page) => {
      let students = [];

      // Handle PvP API response structure
      if (isPvpLeaderboard && page.data?.leaderboard) {
        students = page.data.leaderboard.map((player) => ({
          ...player,
          id: player.studentId,
          username: player.name,
          mmr: player.pvpStars,
          position: player.rank,
          // Add default values for missing fields
          avatarInitial: player.name?.charAt(0) || "?",
          handle: "",
          yearLevel: "",
          rankName: getPvpRankName(player.pvpStars),
          pointsThisWeek: 0,
          trend: "neutral",
        }));
      } else {
        // Handle regular leaderboard response structure
        students = page.leaderboard || [];
      }

      return [...acc, ...students];
    }, []);
  }, [leaderboardData, isPvpLeaderboard]);

  // Helper function to get PvP rank name based on stars
  const getPvpRankName = (stars) => {
    for (let i = pvpRanks.length - 1; i >= 0; i--) {
      if (stars >= pvpRanks[i].min) {
        return pvpRanks[i].name;
      }
    }
    return pvpRanks[0].name;
  };

  // Get filter options from first page
  const filterOptions = leaderboardData?.pages?.[0]?.filters || {
    yearLevels: [],
    tracks: [],
    sections: [],
  };

  const scoreLabel = isPvpLeaderboard ? "Stars" : "Points";
  const activeRanks = isPvpLeaderboard ? pvpRanks : weeklyRanks;

  // Handle filter changes
  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ yearLevel: "", track: "", section: "" });
    setSearchTerm("");
  }, []);

  return (
    <div className={styles.rankingContainer}>
      <FloatingStars />

      {/* Header with controls */}
      <motion.div
        className={styles.rankingHeader}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <h1 className={styles.rankingTitle}>
              <FaTrophy /> Leaderboards
            </h1>
            {myPositionData?.position && (
              <motion.div
                className={styles.myRankBadge}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.3 }}
              >
                Your Rank: #{myPositionData.position}
              </motion.div>
            )}
          </div>

          <div className={styles.headerControls}>
            <motion.button
              className={styles.jumpButton}
              onClick={jumpToMyPosition}
              disabled={!myPositionData?.position}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaLocationArrow /> Jump to My Position
            </motion.button>

            {/* Auto-refresh is always on; button hidden */}
          </div>
        </div>
      </motion.div>

      <div className={styles.layoutGrid}>
        {/* Left Sidebar */}
        <motion.div
          className={styles.leftColumn}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Filters Section */}
          <div className={styles.filterSection}>
            <h2 className={styles.filterHeader}>
              <FaFilter /> Filters
              <motion.button
                className={styles.toggleAdvanced}
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                whileHover={{ scale: 1.1 }}
              >
                {showAdvancedFilters ? <FaChevronUp /> : <FaChevronDown />}
              </motion.button>
            </h2>

            <div className={styles.filterControls}>
              {/* Leaderboard Type */}
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Leaderboard Type</label>
                <div className={styles.filterInputContainer}>
                  <FaListOl className={styles.filterInputIcon} />
                  <select
                    value={leaderboardType}
                    onChange={(e) => setLeaderboardType(e.target.value)}
                    className={styles.filterSelect}
                  >
                    <option value="global">Global Ranking (Weekly)</option>
                    <option value="program">PvP Arena Ranking</option>
                    <option value="class">Class Ranking (Weekly)</option>
                  </select>
                </div>
              </div>

              {/* Time Frame */}
              {!isPvpLeaderboard && (
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Time Frame</label>
                  <div className={styles.filterInputContainer}>
                    <FaCalendarAlt className={styles.filterInputIcon} />
                    <select
                      value={timeFrame}
                      onChange={(e) => setTimeFrame(e.target.value)}
                      className={styles.filterSelect}
                    >
                      <option value="total">All Time</option>
                      <option value="monthly">This Month</option>
                      <option value="weekly">This Week</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Search */}
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Search</label>
                <div className={styles.filterInputContainer}>
                  <FaSearch className={styles.filterInputIcon} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.filterInput}
                    placeholder="Search students..."
                  />
                </div>
              </div>

              {/* Advanced Filters */}
              <AnimatePresence>
                {showAdvancedFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className={styles.advancedFilters}
                  >
                    <div className={styles.filterGroup}>
                      <label className={styles.filterLabel}>Year Level</label>
                      <select
                        value={filters.yearLevel}
                        onChange={(e) =>
                          handleFilterChange("yearLevel", e.target.value)
                        }
                        className={styles.filterSelect}
                      >
                        <option value="">All Year Levels</option>
                        {filterOptions.yearLevels.map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.filterGroup}>
                      <label className={styles.filterLabel}>Track</label>
                      <select
                        value={filters.track}
                        onChange={(e) =>
                          handleFilterChange("track", e.target.value)
                        }
                        className={styles.filterSelect}
                      >
                        <option value="">All Tracks</option>
                        {filterOptions.tracks.map((track) => (
                          <option key={track} value={track}>
                            {track}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.filterGroup}>
                      <label className={styles.filterLabel}>Section</label>
                      <select
                        value={filters.section}
                        onChange={(e) =>
                          handleFilterChange("section", e.target.value)
                        }
                        className={styles.filterSelect}
                      >
                        <option value="">All Sections</option>
                        {filterOptions.sections.map((section) => (
                          <option key={section} value={section}>
                            {section}
                          </option>
                        ))}
                      </select>
                    </div>

                    <motion.button
                      className={styles.clearFiltersBtn}
                      onClick={clearFilters}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Clear All Filters
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Quick Actions */}
          <div className={styles.quickActions}>
            <h3 className={styles.sectionTitle}>Quick Actions</h3>

            <motion.button
              className={`${styles.actionBtn} ${
                showTrending ? styles.active : ""
              }`}
              onClick={() => setShowTrending(!showTrending)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaFire /> Trending Performers
            </motion.button>

            <motion.button
              className={`${styles.actionBtn} ${
                showNearMyRank ? styles.active : ""
              }`}
              onClick={() => setShowNearMyRank(!showNearMyRank)}
              disabled={!myPositionData?.position}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaUsers /> Students Near My Rank
            </motion.button>
          </div>

          {/* Rank Tiers */}
          <div className={styles.tiersSection}>
            <motion.button
              className={`${styles.actionBtn} ${
                showRankTiers ? styles.active : ""
              }`}
              onClick={() => setShowRankTiers(!showRankTiers)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaTrophy />{" "}
              {isPvpLeaderboard ? "PvP Arena Tiers" : "Weekly Progress Tiers"}
              {showRankTiers ? <FaChevronUp /> : <FaChevronDown />}
            </motion.button>

            <AnimatePresence>
              {showRankTiers && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className={styles.tiersContent}
                >
                  <div className={styles.tiersGrid}>
                    {activeRanks.map((tier, index) => (
                      <motion.div
                        key={tier.name}
                        className={styles.tierBox}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.05, y: -2 }}
                      >
                        <IconComponent
                          iconName={tier.prIcon || tier.pvpIcon}
                          className={styles.tierIcon}
                          style={{ color: tier.color }}
                        />
                        <div className={styles.tierInfo}>
                          <span
                            className={styles.tierName}
                            style={{ color: tier.color }}
                          >
                            {tier.name}
                          </span>
                          <span
                            className={styles.tierMmr}
                            style={{ color: tier.color }}
                          >
                            {tier.min}+ {isPvpLeaderboard ? "stars" : "pts"}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div
          className={styles.rightColumn}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {/* Trending Section */}
          <AnimatePresence>
            {showTrending && trendingData?.trendingStudents && (
              <motion.div
                className={styles.trendingSection}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h3 className={styles.sectionTitle}>
                  <FaFire /> Trending This{" "}
                  {timeFrame === "weekly" ? "Week" : "Month"}
                </h3>
                <div className={styles.trendingGrid}>
                  {trendingData.trendingStudents
                    .slice(0, 5)
                    .map((student, index) => (
                      <motion.div
                        key={student.id}
                        className={styles.trendingCard}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className={styles.trendingAvatar}>
                          {student.avatarInitial}
                        </div>
                        <div className={styles.trendingInfo}>
                          <span className={styles.trendingName}>
                            {student.username}
                          </span>
                          <span className={styles.trendingPoints}>
                            +{student.recentPoints}
                          </span>
                        </div>
                        <FaArrowUp className={styles.trendingIcon} />
                      </motion.div>
                    ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Near My Rank Section */}
          <AnimatePresence>
            {showNearMyRank && nearMyRankData?.students && (
              <motion.div
                className={styles.nearRankSection}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h3 className={styles.sectionTitle}>
                  <FaUsers /> Students Near Your Rank (#
                  {myPositionData?.position})
                </h3>
                <div className={styles.nearRankList}>
                  {nearMyRankData.students.map((student, index) => (
                    <motion.div
                      key={student.id}
                      className={`${styles.nearRankItem} ${
                        student.id === user?.id ? styles.currentUser : ""
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <span className={styles.nearRankPosition}>
                        #{student.position}
                      </span>
                      <div className={styles.nearRankAvatar}>
                        {student.avatarInitial}
                      </div>
                      <span className={styles.nearRankName}>
                        {student.username}
                      </span>
                      <span className={styles.nearRankPoints}>
                        {student.mmr}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Leaderboard Table */}
          <div className={styles.tableContainer}>
            {status === "loading" ? (
              <LoadingSkeleton />
            ) : status === "error" ? (
              <motion.div
                className={styles.errorContainer}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <h3>Error Loading Leaderboard</h3>
                <p>{error?.message || "Something went wrong"}</p>
                <motion.button
                  className={styles.retryBtn}
                  onClick={refetchLeaderboard}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaSync /> Retry
                </motion.button>
              </motion.div>
            ) : (
              <motion.table
                className={styles.rankingTable}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <thead>
                  <tr>
                    <th className={styles.rankHeader}>Rank</th>
                    <th>Student</th>
                    <th className={styles.mmrHeader}>{scoreLabel}</th>
                    <th className={styles.rankTierHeader}>Tier</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {allStudents.map((student, index) => (
                      <StudentRow
                        key={`${student.id}-${student.position}`}
                        student={student}
                        index={index}
                        isCurrentUser={student.id === user?.id}
                      />
                    ))}
                  </AnimatePresence>
                </tbody>
              </motion.table>
            )}

            {/* Load More Trigger */}
            <div ref={loadMoreRef} className={styles.loadMoreTrigger}>
              {isFetchingNextPage && (
                <motion.div
                  className={styles.loadingMore}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <FaSync className={styles.spinning} /> Loading more...
                </motion.div>
              )}
              {!hasNextPage && allStudents.length > 0 && (
                <motion.div
                  className={styles.endMessage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  🎉 You've reached the end of the leaderboard!
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Ranking;

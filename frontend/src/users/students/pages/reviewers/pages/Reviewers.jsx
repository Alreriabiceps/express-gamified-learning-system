import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useInView } from "react-intersection-observer";
import { useSwipeable } from "react-swipeable";
import {
  FaSearch,
  FaBook,
  FaFileAlt,
  FaSyncAlt,
  FaStar,
  FaRegStar,
  FaFilePdf,
  FaFileWord,
  FaFilePowerpoint,
  FaTag,
  FaEraser,
  FaFilter,
  FaListUl,
  FaHeart,
  FaUndo,
  FaChevronDown,
  FaChevronUp,
  FaCalendarAlt,
  FaDownload,
  FaClock,
  FaFire,
  FaEye,
  FaShareAlt,
  FaExpand,
  FaTimes,
  FaArrowUp,
  FaKeyboard,
  FaBookmark,
  FaSort,
  FaThList,
  FaTh,
  FaRedo,
  FaExclamationTriangle,
  FaUsers,
  FaGraduationCap,
  FaLayerGroup,
} from "react-icons/fa";
import { toast } from "react-toastify";

// Custom components and hooks
import FloatingStars from "../../../components/FloatingStars/FloatingStars";
import SearchBar from "../../../../../components/SearchBar";
import PdfThumbnail from "../../../../../components/PdfThumbnail";
import {
  useReviewers,
  useAdvancedSearch,
  useInfiniteReviewers,
} from "../../../../../hooks/useReviewers";
import {
  useKeyboardShortcuts,
  useCardShortcuts,
} from "../../../../../hooks/useKeyboardShortcuts";

import styles from "./Reviewers.module.css";

// Constants
const DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard"];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest First", icon: FaClock },
  { value: "oldest", label: "Oldest First", icon: FaClock },
  { value: "title-asc", label: "Title (A-Z)", icon: FaSort },
  { value: "title-desc", label: "Title (Z-A)", icon: FaSort },
  { value: "popularity", label: "Most Downloaded", icon: FaFire },
  { value: "difficulty", label: "By Difficulty", icon: FaTag },
];

const VIEW_MODES = [
  { value: "grid", label: "Grid View", icon: FaTh },
  { value: "list", label: "List View", icon: FaThList },
];

// Sample data for fallback when API fails
const SAMPLE_REVIEWERS = [
  {
    id: "sample-1",
    title: "General Mathematics Reviewer",
    type: "pdf",
    description:
      "Complete reviewer for General Mathematics covering algebra, geometry, and statistics.",
    url: "#",
    subjects: ["General Mathematics"],
    tags: ["algebra", "geometry", "statistics"],
    createdAt: new Date().toISOString(),
    downloadCount: 45,
    difficulty: "Medium",
  },
  {
    id: "sample-2",
    title: "Science and Technology Review",
    type: "docx",
    description:
      "Comprehensive review materials for Science and Technology subjects.",
    url: "#",
    subjects: ["General Science"],
    tags: ["physics", "chemistry", "biology"],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    downloadCount: 23,
    difficulty: "Hard",
  },
  {
    id: "sample-3",
    title: "Effective Communication Guide",
    type: "pptx",
    description:
      "Guide for improving communication skills in academic and professional settings.",
    url: "#",
    subjects: ["Effective Communication"],
    tags: ["speaking", "writing", "presentation"],
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    downloadCount: 67,
    difficulty: "Easy",
  },
];

// Enhanced File Type Icon Component
const FileTypeIcon = ({ type, url, size = "medium" }) => {
  const className = `${styles.fileTypeIcon} ${
    styles[`icon${size.charAt(0).toUpperCase() + size.slice(1)}`]
  }`;

  switch (type?.toLowerCase()) {
    case "pdf":
      return url && url !== "#" ? (
        <PdfThumbnail url={url} className={className} />
      ) : (
        <FaFilePdf className={`${className} ${styles.iconPdf}`} />
      );
    case "docx":
    case "doc":
      return <FaFileWord className={`${className} ${styles.iconDocx}`} />;
    case "pptx":
    case "ppt":
      return <FaFilePowerpoint className={`${className} ${styles.iconPptx}`} />;
    default:
      return <FaFileAlt className={`${className} ${styles.iconDefault}`} />;
  }
};

// Loading Skeleton Component
const ReviewerSkeleton = () => (
  <div className={styles.skeletonCard}>
    <div className={styles.skeletonHeader}>
      <div className={styles.skeletonIcon}></div>
      <div className={styles.skeletonContent}>
        <div className={styles.skeletonTitle}></div>
        <div className={styles.skeletonMeta}></div>
      </div>
      <div className={styles.skeletonActions}></div>
    </div>
  </div>
);

// Enhanced Reviewer Card Component
const ReviewerCard = React.memo(
  ({
    reviewer,
    isFavorite,
    onToggleFavorite,
    onAccess,
    viewMode = "grid",
    // eslint-disable-next-line no-unused-vars
    index = 0,
  }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const cardRef = useRef(null);
    const timersRef = useRef({
      progressIntervalId: null,
      resetTimeoutId: null,
    });
    const expandBtnRef = useRef(null);
    const detailsRef = useRef(null);
    const focusTargetRef = useRef(null); // 'details' | 'toggle' | null

    // Swipe handlers for mobile
    const swipeHandlers = useSwipeable({
      onSwipedLeft: () => onAccess(reviewer.id, reviewer.url),
      onSwipedRight: () => onToggleFavorite(reviewer.id),
      delta: 50,
      trackTouch: true,
      trackMouse: false,
    });

    // Keyboard shortcuts for focused card
    useCardShortcuts({
      onToggleFavorite: () => onToggleFavorite(reviewer.id),
      onAccess: () => onAccess(reviewer.id, reviewer.url),
      onExpand: () => setIsExpanded(!isExpanded),
      isEnabled: isHovered,
    });

    const handleAccess = useCallback(async () => {
      if (reviewer.url === "#") {
        toast.info(
          "This is a sample reviewer. Real links will open documents."
        );
        return;
      }

      setDownloadProgress(10);

      // Simulate download progress
      if (timersRef.current.progressIntervalId) {
        clearInterval(timersRef.current.progressIntervalId);
      }
      const progressInterval = setInterval(() => {
        setDownloadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);
      timersRef.current.progressIntervalId = progressInterval;

      try {
        await onAccess(reviewer.id, reviewer.url);
        if (timersRef.current.progressIntervalId) {
          clearInterval(timersRef.current.progressIntervalId);
          timersRef.current.progressIntervalId = null;
        }
        setDownloadProgress(100);
        if (timersRef.current.resetTimeoutId) {
          clearTimeout(timersRef.current.resetTimeoutId);
        }
        timersRef.current.resetTimeoutId = setTimeout(() => {
          setDownloadProgress(0);
          timersRef.current.resetTimeoutId = null;
        }, 1000);
      } catch {
        setDownloadProgress(0);
        if (timersRef.current.progressIntervalId) {
          clearInterval(timersRef.current.progressIntervalId);
          timersRef.current.progressIntervalId = null;
        }
      }
    }, [reviewer.id, reviewer.url, onAccess]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (timersRef.current.progressIntervalId) {
          clearInterval(timersRef.current.progressIntervalId);
          timersRef.current.progressIntervalId = null;
        }
        if (timersRef.current.resetTimeoutId) {
          clearTimeout(timersRef.current.resetTimeoutId);
          timersRef.current.resetTimeoutId = null;
        }
      };
    }, []);

    // Focus management when expanding/collapsing
    useEffect(() => {
      if (
        focusTargetRef.current === "details" &&
        isExpanded &&
        detailsRef.current
      ) {
        detailsRef.current.focus();
        focusTargetRef.current = null;
      } else if (
        focusTargetRef.current === "toggle" &&
        !isExpanded &&
        expandBtnRef.current
      ) {
        expandBtnRef.current.focus();
        focusTargetRef.current = null;
      }
    }, [isExpanded]);

    return (
      <div
        ref={cardRef}
        className={`${styles.reviewerCard} ${styles[viewMode]} ${
          isExpanded ? styles.expanded : ""
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        tabIndex={0}
        aria-busy={downloadProgress > 0}
        {...swipeHandlers}
      >
        {/* Download Progress Bar */}
        {downloadProgress > 0 && (
          <div
            className={styles.progressBar}
            style={{ width: `${downloadProgress}%` }}
          />
        )}

        <div className={styles.cardHeader}>
          <div className={styles.fileIconContainer}>
            <FileTypeIcon type={reviewer.type} url={reviewer.url} />
            {reviewer.difficulty && (
              <span
                className={`${styles.difficultyBadge} ${
                  styles[`difficulty${reviewer.difficulty}`]
                }`}
              >
                {reviewer.difficulty}
              </span>
            )}
          </div>

          <div className={styles.cardContent}>
            <h3
              id={`title-${reviewer.id}`}
              className={styles.cardTitle}
              title={reviewer.title}
            >
              {reviewer.title}
            </h3>
            <div className={styles.cardMeta}>
              <span className={styles.subject}>
                {reviewer.subjects?.join(", ") || "General"}
              </span>
              <span className={styles.date}>
                {reviewer.createdAt &&
                  new Date(reviewer.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className={styles.cardStats}>
              <span className={styles.downloads}>
                <FaDownload /> {reviewer.downloadCount || 0}
              </span>
              {reviewer.popularity > 0 && (
                <span className={styles.popularity}>
                  <FaFire /> Popular
                </span>
              )}
            </div>
          </div>

          <div className={styles.cardActions}>
            <button
              className={`${styles.favoriteBtn} ${
                isFavorite ? styles.active : ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(reviewer.id);
              }}
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              {isFavorite ? <FaStar /> : <FaRegStar />}
            </button>

            <button
              className={styles.accessBtn}
              onClick={(e) => {
                e.stopPropagation();
                handleAccess();
              }}
              disabled={downloadProgress > 0}
            >
              {downloadProgress > 0 ? "Opening..." : "Access"}
            </button>

            <button
              className={styles.expandBtn}
              ref={expandBtnRef}
              onClick={() => {
                focusTargetRef.current = isExpanded ? "toggle" : "details";
                setIsExpanded(!isExpanded);
              }}
              title={isExpanded ? "Collapse details" : "Expand details"}
              aria-expanded={isExpanded}
              aria-controls={`details-${reviewer.id}`}
            >
              {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div
            id={`details-${reviewer.id}`}
            className={styles.cardDetails}
            role="region"
            aria-labelledby={`title-${reviewer.id}`}
            ref={detailsRef}
            tabIndex={-1}
          >
            <p className={styles.description}>
              {reviewer.description || "No description available."}
            </p>

            {reviewer.tags && reviewer.tags.length > 0 && (
              <div className={styles.tags}>
                {reviewer.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    <FaTag /> {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

// Main Reviewers Component
const Reviewers = () => {
  const [viewMode, setViewMode] = useState("grid");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [autoFocus, setAutoFocus] = useState(false);
  const [useFallbackData, setUseFallbackData] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const searchInputRef = useRef(null);

  // Data hooks with fallback
  const {
    reviewers: apiReviewers,
    favorites,
    uniqueSubjects: apiUniqueSubjects,
    uniqueFileTypes: apiUniqueFileTypes,
    isLoading,
    // eslint-disable-next-line no-unused-vars
    error,
    refetch,
    toggleFavorite,
    handleAccess,
  } = useReviewers();

  // Local favorites for demo/fallback mode
  const [localFavorites, setLocalFavorites] = useState(() => {
    try {
      const raw = localStorage.getItem("demoReviewerFavorites");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Use fallback data if API fails
  const reviewers = useMemo(() => {
    return useFallbackData || apiReviewers.length === 0
      ? SAMPLE_REVIEWERS
      : apiReviewers;
  }, [useFallbackData, apiReviewers]);

  // React to API error outside of useMemo (side-effect safe)
  useEffect(() => {
    if (error && !useFallbackData) {
      setUseFallbackData(true);
      toast.warning("Using sample data - Backend not available");
    }
  }, [error, useFallbackData]);

  // Persist local favorites in demo mode
  useEffect(() => {
    if (useFallbackData) {
      try {
        localStorage.setItem(
          "demoReviewerFavorites",
          JSON.stringify(localFavorites)
        );
      } catch {}
    }
  }, [useFallbackData, localFavorites]);

  // Effective favorites depending on mode
  const effectiveFavorites = useMemo(
    () => (useFallbackData ? localFavorites : favorites),
    [useFallbackData, localFavorites, favorites]
  );

  const uniqueSubjects = useMemo(() => {
    if (useFallbackData) {
      const subjects = SAMPLE_REVIEWERS.flatMap((r) => r.subjects);
      return [...new Set(subjects)].sort();
    }
    return apiUniqueSubjects;
  }, [useFallbackData, apiUniqueSubjects]);

  const uniqueFileTypes = useMemo(() => {
    if (useFallbackData) {
      const types = SAMPLE_REVIEWERS.map((r) => r.type).filter(Boolean);
      return [...new Set(types)].sort();
    }
    return apiUniqueFileTypes;
  }, [useFallbackData, apiUniqueFileTypes]);

  // Advanced search and filtering
  const searchFilters = useAdvancedSearch(
    reviewers,
    favorites,
    showFavoritesOnly
  );
  const {
    searchTerm,
    setSearchTerm,
    selectedSubjects,
    selectedFileTypes,
    difficultyFilter,
    setDifficultyFilter,
    // eslint-disable-next-line no-unused-vars
    dateRange,
    setDateRange,
    sortBy,
    setSortBy,
    // eslint-disable-next-line no-unused-vars
    searchHistory,
    filteredReviewers,
    clearFilters,
    addSubjectFilter,
    addFileTypeFilter,
    hasActiveFilters,
  } = searchFilters;

  // Infinite scroll
  const {
    items: displayedReviewers,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteReviewers(filteredReviewers, viewMode === "grid" ? 12 : 8);

  // Intersection observer for infinite scroll
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: "100px",
  });

  // Load more when in view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Filter change handler
  const handleFilterChange = useCallback(
    (type, value) => {
      switch (type) {
        case "subject":
          addSubjectFilter(value);
          break;
        case "fileType":
          addFileTypeFilter(value);
          break;
        case "difficulty":
          setDifficultyFilter((prev) => (prev === value ? "" : value));
          break;
        case "dateStart":
          setDateRange((prev) => ({ ...prev, start: value }));
          break;
        case "dateEnd":
          setDateRange((prev) => ({ ...prev, end: value }));
          break;
      }
    },
    [addSubjectFilter, addFileTypeFilter, setDifficultyFilter, setDateRange]
  );

  // Enhanced handlers for fallback mode
  const handleToggleFavorite = useCallback(
    (id) => {
      if (useFallbackData) {
        setLocalFavorites((prev) =>
          prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
        return;
      }
      toggleFavorite(id);
    },
    [useFallbackData, toggleFavorite]
  );

  const handleAccessFile = useCallback(
    (id, url) => {
      if (useFallbackData) {
        if (url === "#") {
          toast.info("This is a sample reviewer. Real files would open here.");
          return;
        }
      }
      handleAccess(id, url);
    },
    [useFallbackData, handleAccess]
  );

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSearch: () => {
      setAutoFocus(true);
      searchInputRef.current?.focus();
    },
    onClearFilters: clearFilters,
    onRefresh: () => {
      if (useFallbackData) {
        setUseFallbackData(false);
        toast.info("Trying to reconnect to backend...");
      }
      refetch();
    },
    onToggleFavorites: () => setShowFavoritesOnly(!showFavoritesOnly),
    onFocusFirstResult: () => {
      // Focus first reviewer card
      const firstCard = document.querySelector(`.${styles.reviewerCard}`);
      firstCard?.focus();
    },
    onEscape: () => {
      // Clear search and filters
      setSearchTerm("");
      setAutoFocus(false);
    },
  });

  if (error && !useFallbackData) {
    return (
      <div className={styles.reviewersContainer}>
        <div className={styles.errorContainer}>
          <FaExclamationTriangle className={styles.errorIcon} />
          <h2>Backend Connection Error</h2>
          <p>
            Unable to connect to the server. You can still explore with sample
            data.
          </p>
          <div className={styles.errorButtons}>
            <button className={styles.retryBtn} onClick={refetch}>
              <FaRedo /> Try Again
            </button>
            <button
              className={`${styles.retryBtn} ${styles.sampleBtn}`}
              onClick={() => setUseFallbackData(true)}
            >
              <FaBook /> Use Sample Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.reviewersContainer}>
      <FloatingStars />

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>
          Reviewer Materials
          {useFallbackData && (
            <span className={styles.demoMode}>(Demo Mode)</span>
          )}
        </h1>
        <p className={styles.pageSubtitle}>
          Access comprehensive study materials and enhance your learning.
        </p>
      </div>

      {/* Filter Panel */}
      <div className={styles.filterPanel}>
        <div className={styles.panelHeader}>
          <FaFilter className={styles.panelIcon} />
          Filters & Controls
          <button
            className={styles.toggleAdvanced}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            {showAdvancedFilters ? <FaChevronUp /> : <FaChevronDown />}
          </button>
        </div>

        <div className={styles.basicFilters}>
          <div className={styles.filterRow}>
            <div className={styles.searchContainer}>
              <SearchBar
                ref={searchInputRef}
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search reviewers..."
                className={styles.searchInput}
              />
            </div>

            <div className={styles.controlsGroup}>
              <div className={styles.viewModeToggle}>
                {VIEW_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    className={`${styles.viewModeBtn} ${
                      viewMode === mode.value ? styles.active : ""
                    }`}
                    onClick={() => setViewMode(mode.value)}
                    title={mode.label}
                  >
                    <mode.icon />
                  </button>
                ))}
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={styles.sortSelect}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <button
                className={`${styles.favoritesToggle} ${
                  showFavoritesOnly ? styles.active : ""
                }`}
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                disabled={useFallbackData}
                title={useFallbackData ? "Not available in demo mode" : ""}
              >
                <FaHeart />
                {showFavoritesOnly ? "Show All" : "Favorites"}
              </button>

              <button
                className={styles.refreshBtn}
                onClick={() => {
                  if (useFallbackData) {
                    setUseFallbackData(false);
                    toast.info("Trying to reconnect...");
                  }
                  refetch();
                }}
                title={useFallbackData ? "Reconnect to backend" : "Refresh"}
              >
                <FaSyncAlt />
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className={styles.advancedFilters}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Subjects</label>
              <div className={styles.chipContainer}>
                {uniqueSubjects.map((subject) => (
                  <button
                    key={subject}
                    className={`${styles.filterChip} ${
                      selectedSubjects.includes(subject) ? styles.active : ""
                    }`}
                    onClick={() => handleFilterChange("subject", subject)}
                  >
                    <FaGraduationCap />
                    {subject}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>File Types</label>
              <div className={styles.chipContainer}>
                {uniqueFileTypes.map((type) => (
                  <button
                    key={type}
                    className={`${styles.filterChip} ${
                      selectedFileTypes.includes(type) ? styles.active : ""
                    }`}
                    onClick={() => handleFilterChange("fileType", type)}
                  >
                    <FileTypeIcon type={type} size="small" />
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Difficulty</label>
              <div className={styles.chipContainer}>
                {DIFFICULTY_LEVELS.map((level) => (
                  <button
                    key={level}
                    className={`${styles.filterChip} ${
                      difficultyFilter === level ? styles.active : ""
                    }`}
                    onClick={() => handleFilterChange("difficulty", level)}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <button className={styles.clearFiltersBtn} onClick={clearFilters}>
              <FaEraser /> Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Results Stats */}
      <div className={styles.statsPanel}>
        <div className={styles.statsContent}>
          <span className={styles.statItem}>
            <FaBook />
            {showFavoritesOnly ? "Favorites" : "Total"}:{" "}
            <strong>{filteredReviewers.length}</strong>
            {!showFavoritesOnly &&
              reviewers.length !== filteredReviewers.length && (
                <span className={styles.totalCount}>
                  {" "}
                  of {reviewers.length}
                </span>
              )}
          </span>
          {useFallbackData && (
            <span className={styles.statItem}>
              <FaExclamationTriangle /> Demo Mode Active
            </span>
          )}
        </div>
      </div>

      {/* Main Content Panel */}
      <div className={styles.contentPanel}>
        {/* Results Section */}
        {isLoading && !useFallbackData ? (
          <div className={`${styles.reviewersGrid} ${styles[viewMode]}`}>
            {[...Array(12)].map((_, i) => (
              <ReviewerSkeleton key={i} />
            ))}
          </div>
        ) : displayedReviewers.length === 0 ? (
          <div className={styles.emptyState}>
            <FaBook className={styles.emptyIcon} />
            <h3>No reviewers found</h3>
            <p>Try adjusting your search or filters</p>
            {hasActiveFilters && (
              <button className={styles.clearFiltersBtn} onClick={clearFilters}>
                <FaEraser /> Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className={`${styles.reviewersGrid} ${styles[viewMode]}`}>
              {displayedReviewers.map((reviewer, index) => (
                <ReviewerCard
                  key={reviewer.id}
                  reviewer={reviewer}
                  isFavorite={effectiveFavorites.includes(reviewer.id)}
                  onToggleFavorite={handleToggleFavorite}
                  onAccess={handleAccessFile}
                  viewMode={viewMode}
                  index={index}
                />
              ))}
            </div>

            {/* Load More Trigger */}
            <div ref={loadMoreRef} className={styles.loadMoreTrigger}>
              {isFetchingNextPage && (
                <div className={styles.loadingMore}>
                  <FaSyncAlt className={styles.spinning} /> Loading more...
                </div>
              )}
              {!hasNextPage && displayedReviewers.length > 0 && (
                <div className={styles.endMessage}>
                  🎉 You've reached the end!
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Reviewers;

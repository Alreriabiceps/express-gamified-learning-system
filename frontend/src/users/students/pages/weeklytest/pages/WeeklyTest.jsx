import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import styles from "./WeeklyTest.module.css"; // Use CSS Modules
import { useAuth } from "../../../../../contexts/AuthContext";
import FilterPanel from "../components/FilterPanel";
import QuestionDisplay from "../components/QuestionDisplay";
import ResultModal from "../components/ResultModal";
import Leaderboard from "../components/Leaderboard";
import FloatingStars from "../../../components/FloatingStars/FloatingStars"; // Import FloatingStars

// Constants for Filters
const SUBJECTS = [
  "All Subjects",
  "Effective Communication",
  "Life Skills",
  "General Mathematics",
  "General Science",
  "Pag-aaral ng Kasaysayan",
];

const WEEKS = [
  "All Weeks",
  "Week 1",
  "Week 2",
  "Week 3",
  "Week 4",
  "Week 5",
  "Week 6",
];

// Constants for sound effects - disabled to prevent unwanted audio
const SOUNDS = {
  correct: null,
  wrong: null,
  complete: null,
};

// New Rank System based on user request
const RANKS = [
  {
    min: 0,
    max: 149,
    name: "Absent Legend",
    emoji: "🛌",
    description: "Technically enrolled.",
  },
  {
    min: 150,
    max: 299,
    name: "The Crammer",
    emoji: "⏰",
    description:
      "Studies best under extreme pressure—like 5 minutes before class.",
  },
  {
    min: 300,
    max: 449,
    name: "Seatwarmer",
    emoji: "📖",
    description: "Physically present, mentally... buffering.",
  },
  {
    min: 450,
    max: 599,
    name: "Group Project Ghost",
    emoji: "📎",
    description: "Appears only during final presentation day.",
  },
  {
    min: 600,
    max: 749,
    name: "Google Scholar (Unofficial)",
    emoji: "🔍",
    description: 'Master of Ctrl+F and "Quizlet."',
  },
  {
    min: 750,
    max: 899,
    name: "The Lowkey Genius",
    emoji: "📚",
    description: "Never recites, still gets the highest score.",
  },
  {
    min: 900,
    max: 1049,
    name: "Almost Valedictorian",
    emoji: "🏅",
    description: "Always 0.01 short—every time.",
  },
  {
    min: 1050,
    max: Infinity,
    name: "The Valedictornator",
    emoji: "🎤",
    description: "Delivers speeches, aces tests, and might run the school.",
  },
];

// Points calculation based on score percentage
const calculatePointsGain = (score, totalQuestions) => {
  const percentage = (score / totalQuestions) * 100;

  if (percentage >= 90) {
    return 30; // 90% and above
  } else if (percentage >= 70) {
    return 20; // 70% to 89%
  } else if (percentage >= 50) {
    return 10; // 50% to 69%
  } else {
    return -10; // Below 50%
  }
};

// Get rank based on total points
const getRank = (totalPoints) => {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (totalPoints >= RANKS[i].min) {
      return RANKS[i];
    }
  }
  return RANKS[0];
};

// Helper function to get localStorage key
const getLocalStorageKey = (userId) =>
  userId ? `weeklyTestState_${userId}` : null;

// Achievements definitions
const ACHIEVEMENTS = [
  {
    id: "first_test",
    name: "First Test Completed",
    description: "Congratulations on completing your first weekly test!",
    icon: "🏅",
    check: ({ previousCompletions }) => previousCompletions === 0,
  },
  {
    id: "perfect_score",
    name: "Perfect Score",
    description: "You scored 100% on a weekly test. Amazing!",
    icon: "🌟",
    check: ({ score, totalQuestions }) => score === totalQuestions,
  },
  {
    id: "streak_3",
    name: "3 Correct in a Row",
    description: "You answered 3 questions correctly in a row!",
    icon: "🔥",
    check: ({ answers, tests }) => {
      let streak = 0;
      for (let i = 0; i < tests.length; i++) {
        const q = tests[i];
        if (answers[q._id] === q.correctAnswer) {
          streak++;
          if (streak >= 3) return true;
        } else {
          streak = 0;
        }
      }
      return false;
    },
  },
];

const WeeklyTest = () => {
  const { user } = useAuth();
  const justRestoredSessionRef = useRef(false); // Ref to signal post-restoration

  // Dashboard theme variables (memoized)
  const theme = useMemo(
    () => ({
      bg: "#0D131A",
      panelBg: "#18202b",
      panelBorder: "#232c3a",
      text: "#E0F2F7",
      accent: "#f1c40f",
      fontBody: "Montserrat, sans-serif",
      fontHeader: "Bangers, cursive",
      bubbleDarkText: "#0D131A", // For text on yellow accent elements
      inputBg: "#0D131A", // For input fields, matching theme.bg
    }),
    []
  );

  // Backend + auth helpers
  const backendurl = useMemo(() => import.meta.env.VITE_BACKEND_URL, []);
  const getAuthHeaders = useCallback(
    (extra = {}) => ({
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      ...extra,
    }),
    []
  );

  // Debug gating
  const DEBUG = import.meta.env.MODE === "development";

  // --- State Variables ---
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedWeek, setSelectedWeek] = useState("");
  const [tests, setTests] = useState([]); // Holds the fetched questions
  const [isLoading, setIsLoading] = useState(false); // Loading state for API call
  const [error, setError] = useState(null); // Error state for API call/no tests
  const [answers, setAnswers] = useState({}); // Stores user's answers { questionIndex: answerText }
  const [isTestStarted, setIsTestStarted] = useState(false); // Tracks if the test is in progress
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // Index of the current question
  const [showAnimation, setShowAnimation] = useState(false); // Controls question transition animation
  const [subjects, setSubjects] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentSchedule, setCurrentSchedule] = useState(null); // Add this line
  const [currentRank, setCurrentRank] = useState(null);
  const [pointsChange, setPointsChange] = useState(0);
  const [testResult, setTestResult] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultLoading, setResultLoading] = useState(false);
  const [filteredWeeks, setFilteredWeeks] = useState([]);
  const [testAlreadyCompleted, setTestAlreadyCompleted] = useState(false);
  const [previousTestResult, setPreviousTestResult] = useState(null);
  const [checkingCompletion, setCheckingCompletion] = useState(false);
  const [restoredSessionData, setRestoredSessionData] = useState(null); // New state
  // Timer states
  const TEST_TIME_LIMIT = 15 * 60; // 15 minutes in seconds
  const TEST_TIMER_WARNING_THRESHOLD = 60; // 1 minute left warning
  const [testTimeLeft, setTestTimeLeft] = useState(TEST_TIME_LIMIT);
  const [testTimerActive, setTestTimerActive] = useState(false);
  const [showTestTimerWarning, setShowTestTimerWarning] = useState(false);
  // State for unlocked achievements (session only)
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [newAchievements, setNewAchievements] = useState([]);
  // Challenge banner state
  const [challengeBanner, setChallengeBanner] = useState(null);
  // Retry / loading helpers
  const [retryAction, setRetryAction] = useState(null); // 'schedule' | 'tests' | 'leaderboard' | null
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Abort controllers
  const scheduleFetchControllerRef = useRef(null);
  const testsFetchControllerRef = useRef(null);
  const leaderboardFetchControllerRef = useRef(null);

  // Ensure timer keyframes exist
  useEffect(() => {
    const id = "weeklytest-flash-timer-style";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = `@keyframes flash-timer { 50% { opacity: 0.3; } }`;
      document.head.appendChild(style);
    }
  }, []);

  // Helper function to clear test data from localStorage
  const clearLocalStorageTestData = () => {
    const key = getLocalStorageKey(user?.id);
    if (key) {
      localStorage.removeItem(key);
    }
  };

  // --- Effect to Load Test State from LocalStorage ---
  useEffect(() => {
    const key = getLocalStorageKey(user?.id);
    if (!key) {
      setRestoredSessionData(null); // Ensure no stale data
      setIsLoading(false);
      return;
    }

    dlog(
      "[DEBUG] Attempting to load test state from localStorage with key:",
      key
    );
    // Set loading to true here; main effect will set it to false after processing or fetching.
    setIsLoading(true);
    const savedStateRaw = localStorage.getItem(key);

    if (savedStateRaw) {
      dlog("[DEBUG] Found saved state in localStorage:", savedStateRaw);
      try {
        const savedState = JSON.parse(savedStateRaw);
        dlog("[DEBUG] Parsed saved state:", savedState);

        // Basic structural validation before passing it on
        if (
          savedState &&
          savedState.selectedSubject &&
          savedState.selectedSubject.id &&
          savedState.selectedWeek &&
          savedState.selectedWeek.number !== undefined &&
          savedState.selectedWeek.year !== undefined &&
          savedState.currentSchedule !== undefined &&
          savedState.isTestStarted !== undefined &&
          typeof savedState.currentQuestionIndex === "number" &&
          savedState.answers !== undefined
        ) {
          dlog(
            "[DEBUG] localStorage: Filters and full savedState will be processed by main effect."
          );
          // Set filters immediately for UI consistency and for main effect's direct dependencies
          setSelectedSubject(savedState.selectedSubject);
          setSelectedWeek(savedState.selectedWeek);
          setRestoredSessionData(savedState); // Pass the whole object for the main effect to process
          // setIsLoading(true) is already set. The main effect or fetch will set it to false.
        } else {
          if (DEBUG)
            console.warn(
              "[DEBUG] localStorage: Invalid or incomplete saved test state found. Clearing localStorage. Problematic state:",
              savedState
            );
          localStorage.removeItem(key);
          setRestoredSessionData(null);
          setIsLoading(false); // Failed to load valid structure, stop loading
        }
      } catch (e) {
        if (DEBUG)
          console.error(
            "[DEBUG] localStorage: Failed to parse saved test state. Clearing localStorage. Error:",
            e
          );
        localStorage.removeItem(key);
        setRestoredSessionData(null);
        setIsLoading(false); // Error in parsing, stop loading
      }
    } else {
      dlog("[DEBUG] localStorage: No saved state found for key:", key);
      setRestoredSessionData(null);
      setIsLoading(false); // No saved state, stop loading
    }
  }, [user?.id]);

  // --- Effect to Save Test State to LocalStorage ---
  useEffect(() => {
    const key = getLocalStorageKey(user?.id);
    if (!key) return;

    if (isTestStarted && currentSchedule && tests && tests.length > 0) {
      const testStateToSave = {
        selectedSubject,
        selectedWeek,
        currentSchedule,
        isTestStarted,
        currentQuestionIndex,
        answers,
      };
      localStorage.setItem(key, JSON.stringify(testStateToSave));
    }
    // Explicit removal is handled in complete/reset functions
  }, [
    selectedSubject,
    selectedWeek,
    currentSchedule,
    isTestStarted,
    currentQuestionIndex,
    answers,
    user?.id,
    tests,
  ]);

  // Fetch subjects and weeks with abort + retry
  const fetchSchedule = useCallback(async () => {
    try {
      if (scheduleFetchControllerRef.current) {
        scheduleFetchControllerRef.current.abort();
      }
      const controller = new AbortController();
      scheduleFetchControllerRef.current = controller;
      dlog("Fetching schedule from:", `${backendurl}/api/weeks/active`);

      const response = await fetch(`${backendurl}/api/weeks/active`, {
        headers: getAuthHeaders(),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      dlog("Raw schedule data:", data);

      // Ensure data is an array
      const scheduleArray = Array.isArray(data) ? data : [];

      if (scheduleArray.length === 0) {
        if (DEBUG) console.warn("No active schedule data available");
        setError(
          "No active schedules available. Please contact your administrator to activate week schedules."
        );
        setRetryAction("schedule");
        return;
      }

      // Extract unique subjects and weeks from the weekschedules
      const subjectMap = {};
      scheduleArray
        .filter((item) => item && item.subjectId && item.isActive)
        .forEach((item) => {
          subjectMap[item.subjectId._id] = {
            id: item.subjectId._id,
            name: item.subjectId.subject || `Subject ${item.subjectId._id}`,
          };
        });
      const uniqueSubjects = Object.values(subjectMap);

      // Filter weeks based on the selected subject
      const uniqueWeeks = [
        ...new Set(
          scheduleArray
            .filter((item) => item && item.weekNumber && item.isActive)
            .map((item) => ({
              number: item.weekNumber,
              display: `Week ${item.weekNumber}`,
              year: item.year,
              subjectId: item.subjectId._id, // Add subjectId to each week
            }))
        ),
      ].sort((a, b) => a.number - b.number);

      dlog("Extracted subjects:", uniqueSubjects);
      dlog("Extracted weeks:", uniqueWeeks);

      if (uniqueSubjects.length === 0 || uniqueWeeks.length === 0) {
        setError(
          "No active schedules found. Please contact your administrator."
        );
        setRetryAction("schedule");
        return;
      }

      setSubjects(uniqueSubjects);
      setWeeks(uniqueWeeks);
      setError(null);
      setRetryAction(null);
    } catch (err) {
      if (err.name === "AbortError") return;
      if (DEBUG) console.error("Error fetching schedule:", err);
      setError(
        `Failed to load schedule: ${err.message}. Please try again later.`
      );
      setRetryAction("schedule");
    }
  }, [backendurl, getAuthHeaders, DEBUG]);

  useEffect(() => {
    fetchSchedule();
    return () => {
      if (scheduleFetchControllerRef.current)
        scheduleFetchControllerRef.current.abort();
    };
  }, [fetchSchedule]);

  // Add this useEffect to filter weeks when subject changes
  useEffect(() => {
    if (selectedSubject) {
      const filteredWeeks = weeks.filter(
        (week) => week.subjectId === selectedSubject.id
      );
      setFilteredWeeks(filteredWeeks);
    } else {
      setFilteredWeeks([]);
    }
  }, [selectedSubject, weeks]);

  // Check if test has already been completed
  const checkTestCompletion = useCallback(async () => {
    if (!currentSchedule || !user?.id) {
      setTestAlreadyCompleted(false);
      setPreviousTestResult(null);
      setCheckingCompletion(false);
      return;
    }

    setCheckingCompletion(true);

    try {
      const response = await fetch(
        `${backendurl}/api/weekly-test/results/student/${user.id}?weekScheduleId=${currentSchedule._id}`,
        { headers: getAuthHeaders() }
      );

      console.log("Completion check response:", response.status, response.ok);

      if (!response.ok) {
        console.log(
          "Response not ok, test not completed. Status:",
          response.status
        );

        // Check if it's an authentication error
        if (response.status === 401 || response.status === 403) {
          console.log("Authentication error, checking localStorage fallback");
        } else if (response.status === 404) {
          console.log("API endpoint not found, checking localStorage fallback");
        }

        // Fallback: Check localStorage for completion status
        const completionKey = `testCompleted_${user.id}_${currentSchedule._id}`;
        const completedInStorage = localStorage.getItem(completionKey);

        if (completedInStorage) {
          console.log(
            "Found completion status in localStorage, marking as completed"
          );
          setTestAlreadyCompleted(true);
          try {
            const storedResult = JSON.parse(completedInStorage);
            setPreviousTestResult(storedResult);
          } catch (e) {
            console.log("Error parsing stored result:", e);
          }
        } else {
          console.log("No completion status found in localStorage");
          setTestAlreadyCompleted(false);
          setPreviousTestResult(null);
        }

        setCheckingCompletion(false);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        console.log("Completion check data:", data);

        if (data.success && data.data && data.data.results) {
          // Find the specific test result for this weekScheduleId
          const existingResult = data.data.results.find(
            (result) => result.weekScheduleId === currentSchedule._id
          );

          if (existingResult) {
            console.log(
              "Test already completed, setting states:",
              existingResult
            );
            setTestAlreadyCompleted(true);
            setPreviousTestResult(existingResult);
            setScore(existingResult.score);
            setPointsEarned(existingResult.pointsEarned);
            setCurrentRank(getRank(existingResult.pointsEarned)); // Use pointsEarned as totalPoints for now
          } else {
            console.log("No existing test found for this week");
            setTestAlreadyCompleted(false);
            setPreviousTestResult(null);
          }
        } else {
          console.log("API returned success: false, test not completed");
          setTestAlreadyCompleted(false);
          setPreviousTestResult(null);
        }
      } else {
        console.log("Response not ok, test not completed");
        setTestAlreadyCompleted(false);
        setPreviousTestResult(null);
      }
    } catch (error) {
      console.error("Error checking test completion:", error);
      setTestAlreadyCompleted(false);
      setPreviousTestResult(null);
    } finally {
      setCheckingCompletion(false);
    }
  }, [
    currentSchedule,
    user?.id,
    backendurl,
    getAuthHeaders,
    selectedSubject,
    selectedWeek,
  ]);

  // Check test completion when component loads or when schedule changes
  useEffect(() => {
    if (currentSchedule && user?.id) {
      console.log("Running completion check due to schedule/user change");
      checkTestCompletion();
    } else {
      setTestAlreadyCompleted(false);
      setPreviousTestResult(null);
    }
  }, [currentSchedule, user?.id, checkTestCompletion]);

  // Also check on initial load if we have schedule data
  useEffect(() => {
    if (currentSchedule && user?.id && !testAlreadyCompleted) {
      console.log("Running completion check due to initial load");
      checkTestCompletion();
    }
  }, [currentSchedule, user?.id, testAlreadyCompleted, checkTestCompletion]);

  // Force check completion whenever tests are loaded
  useEffect(() => {
    if (tests.length > 0 && currentSchedule && user?.id) {
      console.log("Tests loaded, forcing completion check");
      setTimeout(() => {
        checkTestCompletion();
      }, 100);
    }
  }, [tests.length, currentSchedule, user?.id, checkTestCompletion]);
  const fetchAndSetNewTestData = React.useCallback(async () => {
    if (
      !selectedSubject ||
      !selectedSubject.id ||
      !selectedWeek ||
      selectedWeek.number === undefined ||
      selectedWeek.year === undefined
    ) {
      dlog(
        "[DEBUG] fetchAndSetNewTestData: Filters not selected. Aborting fetch."
      );
      // Ensure states are reset if filters are incomplete, even if called directly
      setIsLoading(false); // Stop loading if it was somehow true
      setError(null); // Clear any previous errors
      // Do not clear testStarted here, let the main effect handle it based on context
      return;
    }

    dlog(
      `[DEBUG] fetchAndSetNewTestData called for Subject: ${selectedSubject?.name}, Week: ${selectedWeek?.display}`
    );
    setIsLoading(true);
    setError(null);
    setRetryAction(null);
    // This is critical: fetching new data means it's a new test session or a reset.
    setIsTestStarted(false);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setTests([]);
    setCurrentSchedule(null);

    try {
      if (testsFetchControllerRef.current) {
        testsFetchControllerRef.current.abort();
      }
      const controller = new AbortController();
      testsFetchControllerRef.current = controller;
      const response = await fetch(
        `${backendurl}/api/weeks/active?subjectId=${encodeURIComponent(
          selectedSubject.id
        )}&weekNumber=${encodeURIComponent(
          selectedWeek.number
        )}&year=${encodeURIComponent(selectedWeek.year)}`,
        { headers: getAuthHeaders(), signal: controller.signal }
      );

      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status} ${response.statusText}`
        );
      }
      const data = await response.json();
      const schedule = Array.isArray(data)
        ? data.find(
            (s) =>
              s.subjectId?._id === selectedSubject.id &&
              s.weekNumber === selectedWeek.number &&
              s.year === selectedWeek.year &&
              s.isActive
          )
        : null;

      if (!schedule) {
        setError(
          "No active schedule found for this week and subject. Please contact your administrator."
        );
        setTests([]);
        setRetryAction("tests");
        return;
      }
      setCurrentSchedule(schedule);
      if (schedule.questionIds && schedule.questionIds.length > 0) {
        setTests(schedule.questionIds);
        setError(null);
        setRetryAction(null);
      } else {
        setError(
          "No questions assigned to this week schedule. Please contact your administrator."
        );
        setTests([]);
        setRetryAction("tests");
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(`Failed to load tests: ${err.message}. Please try again later.`);
      setTests([]);
      setRetryAction("tests");
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedSubject, // Dependency: reads selectedSubject
    selectedWeek, // Dependency: reads selectedWeek
    backendurl,
    getAuthHeaders,
    // user?.id is not directly used here but in the calling effect
  ]);

  // Main Test Logic Effect
  useEffect(() => {
    dlog(
      `[DEBUG] MAIN EFFECT RUN. User: ${user?.id}, SelSub: ${
        selectedSubject?.name
      }, SelWeek: ${
        selectedWeek?.display
      }, IsTestStarted_STATE: ${isTestStarted}, CQI_STATE: ${currentQuestionIndex}, HasRestoredData: ${!!restoredSessionData}, JustRestoredFlag: ${
        justRestoredSessionRef.current
      }`
    );

    if (restoredSessionData) {
      const dataToProcess = restoredSessionData;
      setRestoredSessionData(null); // Consume the data immediately

      dlog(
        "[DEBUG] MAIN EFFECT: Processing restoredSessionData:",
        dataToProcess
      );

      const {
        selectedSubject: rSelectedSubject,
        selectedWeek: rSelectedWeek,
        currentSchedule: rCurrentSchedule,
        isTestStarted: rIsTestStarted,
        currentQuestionIndex: rCurrentQuestionIndex,
        answers: rAnswers,
      } = dataToProcess;

      if (
        rIsTestStarted &&
        rCurrentSchedule &&
        rCurrentSchedule.questionIds &&
        rCurrentSchedule.questionIds.length > 0 &&
        rSelectedSubject &&
        rSelectedSubject.id &&
        rSelectedWeek &&
        rSelectedWeek.number !== undefined &&
        rSelectedWeek.year !== undefined &&
        rCurrentSchedule.subjectId?._id === rSelectedSubject.id &&
        rCurrentSchedule.weekNumber === rSelectedWeek.number &&
        rCurrentSchedule.year === rSelectedWeek.year &&
        rCurrentSchedule.questionIds.every((q) => q && q._id) &&
        rCurrentQuestionIndex < rCurrentSchedule.questionIds.length &&
        rCurrentQuestionIndex >= 0
      ) {
        dlog(
          "[DEBUG] MAIN EFFECT: Restored session from dataToProcess is VALID. Setting all states. CQI:",
          rCurrentQuestionIndex
        );
        setSelectedSubject(rSelectedSubject);
        setSelectedWeek(rSelectedWeek);
        setCurrentSchedule(rCurrentSchedule);
        setTests(rCurrentSchedule.questionIds);
        setIsTestStarted(rIsTestStarted);
        setCurrentQuestionIndex(rCurrentQuestionIndex);
        setAnswers(rAnswers || {});
        setError(null);
        setIsLoading(false);
        setShowAnimation(true); // Ensure question content is shown with animation
        justRestoredSessionRef.current = true; // Signal for the next run
        return;
      } else {
        if (DEBUG)
          console.warn(
            "[DEBUG] MAIN EFFECT: Restored session from dataToProcess FAILED validation or was not an active test. Details:",
            {
              rIsTestStarted,
              rCQI: rCurrentQuestionIndex,
              rScheduleID: rCurrentSchedule?._id,
            }
          );
        // If validation fails, isLoading was true from localStorage effect.
        // It will either proceed to fetch (if filters are valid) which handles isLoading,
        // or it will hit a filter check / user check which sets isLoading(false).
      }
    }

    // If this run is immediately after a successful restoration, skip further processing.
    if (justRestoredSessionRef.current) {
      justRestoredSessionRef.current = false; // Consume the flag
      dlog(
        "[DEBUG] MAIN EFFECT: Post-restoration run. No-op. isLoading should be false."
      );
      // setIsLoading(false); // Should have been set by the restoration block
      return;
    }

    if (!user?.id) {
      dlog("[DEBUG] MAIN EFFECT: No user.id. Returning.");
      setIsLoading(false);
      return;
    }

    // If filters are not selected (and no session was successfully restored AND preserved above)
    if (
      !selectedSubject ||
      !selectedSubject.id ||
      !selectedWeek ||
      selectedWeek.number === undefined ||
      selectedWeek.year === undefined
    ) {
      dlog(
        `[DEBUG] MAIN EFFECT: Filters not fully selected. SelSub: ${selectedSubject?.name}, SelWeek: ${selectedWeek?.display}.`
      );
      // If a test was marked as started (e.g. from a failed restore attempt or previous state)
      // but filters are now incomplete, we need to reset the test state.
      if (isTestStarted) {
        dlog(
          "[DEBUG] MAIN EFFECT: Filters not selected BUT test was started. Resetting active test state."
        );
        setIsTestStarted(false);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setTests([]);
        setCurrentSchedule(null);
        setError(null); // Clear any test-related errors
      } else {
        // Filters not selected, and no test was active. Minimal reset.
        setError(null);
      }
      setIsLoading(false);
      return;
    }

    // If we reach here: user is loaded, filters ARE selected in component state.
    // AND ( (no restoredSessionData was processed) OR
    //      (restoredSessionData was processed but FAILED validation) )
    // So, fetch new data for the selectedSubject and selectedWeek from component state.
    dlog(
      `[DEBUG] MAIN EFFECT: Proceeding to fetchAndSetNewTestData for Sub: ${selectedSubject.name} Week: ${selectedWeek.display}.`
    );
    fetchAndSetNewTestData();
  }, [
    user?.id,
    selectedSubject, // Depends on component state for filters
    selectedWeek,
    restoredSessionData, // Triggers processing of restored data
    fetchAndSetNewTestData, // Memoized fetch function
    // setters removed from deps to avoid unnecessary reruns
    justRestoredSessionRef,
  ]);

  // --- Audio Effects ---
  const audioRefs = useRef({});
  useEffect(() => {
    // Sound effects disabled - no audio initialization
    audioRefs.current = {
      correct: null,
      wrong: null,
      complete: null,
    };
  }, []);
  const playSound = useCallback((type) => {
    // Sound effects disabled - no audio playback
    return;
  }, []);

  // --- Handle Answer Selection ---
  const handleAnswerSelect = useCallback(
    (questionId, answer) => {
      if (isTestStarted) {
        const currentQuestion = tests[currentQuestionIndex];
        const isCorrect = currentQuestion.correctAnswer === answer;
        setAnswers((prev) => ({ ...prev, [questionId]: answer }));

        // Play sound based on answer
        if (isCorrect) {
          playSound("correct");
        } else {
          playSound("wrong");
        }
        // No auto-advance; user must click Next
      }
    },
    [isTestStarted, tests, currentQuestionIndex, playSound]
  );

  // --- Handle Test Completion ---
  const handleTestComplete = useCallback(async () => {
    if (!currentSchedule) {
      setError("No active schedule found. Please try again.");
      return;
    }
    if (!user || !user.id) {
      setError("Student data not found. Please log in again.");
      return;
    }
    setIsTestStarted(false);
    playSound("complete");
    setResultLoading(true);
    setShowResultModal(true);

    // Calculate score
    const finalScore = Object.entries(answers).reduce(
      (acc, [questionId, answer]) => {
        const question = tests.find((q) => q._id === questionId);
        return acc + (question && question.correctAnswer === answer ? 1 : 0);
      },
      0
    );

    // Calculate points change based on score
    const pointsGain = calculatePointsGain(finalScore, tests.length);
    setPointsChange(pointsGain);

    // Prepare answers array for saving
    const answersArray = Object.entries(answers).map(
      ([questionId, selectedAnswer]) => {
        const question = tests.find((q) => q._id === questionId);
        return {
          questionId,
          selectedAnswer,
          isCorrect: question.correctAnswer === selectedAnswer,
        };
      }
    );

    // Prepare request data
    const requestData = {
      studentId: user.id,
      weekScheduleId: currentSchedule._id,
      subjectId: selectedSubject.id,
      weekNumber: selectedWeek.number,
      year: selectedWeek.year,
      score: finalScore,
      totalQuestions: tests.length,
      answers: answersArray,
      pointsGain: pointsGain,
    };

    // console.log('WeeklyTest SUBMIT requestData:', requestData); // Existing log
    console.log(
      "[DEBUG 400_ERROR_CHECK] Full requestData for POST /api/weekly-test/results:",
      JSON.stringify(requestData, null, 2)
    );

    try {
      const response = await fetch(`${backendurl}/api/weekly-test/results`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.message === "You have already completed this test") {
          try {
            const previousResultsResponse = await fetch(
              `${backendurl}/api/weekly-test/results/${user.id}?weekScheduleId=${currentSchedule._id}`,
              { headers: getAuthHeaders() }
            );
            if (previousResultsResponse.ok) {
              const previousResults = await previousResultsResponse.json();
              setScore(previousResults.data.score);
              setPointsEarned(previousResults.data.pointsEarned);
              setCurrentRank(getRank(previousResults.data.totalPoints));
              setTestResult(previousResults.data);
              setTestAlreadyCompleted(true);
              setPreviousTestResult(previousResults.data);
            } else {
              // Failed to fetch previous results, but test IS already completed.
              console.error(
                "Test already completed, but failed to fetch previous results. Status:",
                previousResultsResponse.status
              );
              setError(
                "You have already completed this test. Failed to load your previous score."
              );
              setTestResult(null); // Explicitly nullify testResult on fetch failure
            }
          } catch (fetchErr) {
            console.error(
              'Error fetching previous results after "already completed" notice:',
              fetchErr
            );
            setError(
              "You have already completed this test. Error fetching your previous score."
            );
            setTestResult(null); // Explicitly nullify testResult on fetch failure
          } finally {
            // Whether fetching previous results succeeded or failed, the original test submission was for an already completed test.
            // Clear localStorage to prevent re-submission attempts on refresh.
            clearLocalStorageTestData();
            setResultLoading(false); // Ensure loading is stopped.
            return; // Exit handleTestComplete as the main action (submit) is resolved as "already completed".
          }
        }
        // If it wasn't an "already completed" error, or if some other !response.ok issue occurred with the POST
        throw new Error(
          data.message ||
            `Failed to save test result: ${response.status} ${response.statusText}`
        );
      }

      if (!data.success) {
        throw new Error(data.message || "Server returned an error");
      }

      console.log("Test result saved successfully:", data);

      // Update state with the response data
      setScore(data.data.testResult.score);
      setPointsEarned(data.data.pointsEarned);
      setCurrentRank(getRank(data.data.totalPoints));
      setTestResult({
        ...data.data.testResult,
        score: data.data.testResult.score,
        totalQuestions: data.data.testResult.totalQuestions,
      });
      setTestAlreadyCompleted(true);
      const testResult = {
        ...data.data.testResult,
        score: data.data.testResult.score,
        totalQuestions: data.data.testResult.totalQuestions,
      };
      setPreviousTestResult(testResult);
      setResultLoading(false);

      // Store completion status in localStorage as fallback
      const completionKey = `testCompleted_${user.id}_${currentSchedule._id}`;
      localStorage.setItem(completionKey, JSON.stringify(testResult));
      console.log("Stored completion status in localStorage:", completionKey);

      clearLocalStorageTestData(); // Clear after successful save

      // Force another completion check after a short delay to ensure state is locked
      setTimeout(() => {
        console.log("Forcing completion check after test completion");
        checkTestCompletion();
      }, 500);

      // --- Achievement logic ---
      // For demo, count completions in localStorage (or use backend if available)
      const completionsKey = user ? `weeklyTestCompletions_${user.id}` : null;
      let previousCompletions = 0;
      if (completionsKey) {
        previousCompletions = parseInt(
          localStorage.getItem(completionsKey) || "0",
          10
        );
        localStorage.setItem(
          completionsKey,
          (previousCompletions + 1).toString()
        );
      }
      // Check for new achievements
      const context = {
        previousCompletions,
        score: data.data.testResult.score,
        totalQuestions: data.data.testResult.totalQuestions,
        answers,
        tests,
      };
      const newlyUnlocked = ACHIEVEMENTS.filter(
        (a) =>
          a.check(context) && !unlockedAchievements.some((u) => u.id === a.id)
      );
      if (newlyUnlocked.length > 0) {
        setUnlockedAchievements((prev) => [...prev, ...newlyUnlocked]);
        setNewAchievements(newlyUnlocked);
        setShowAchievementModal(true);
      }
    } catch (err) {
      console.error("Error saving test result:", err);
      setError(
        `Failed to save test result: ${err.message}. Please try again later.`
      );
      setResultLoading(false);
      // Decide if to clear on error: for now, only on success/already completed.
    }
  }, [
    currentSchedule,
    user,
    playSound,
    getAuthHeaders,
    backendurl,
    answers,
    tests,
    unlockedAchievements,
    selectedSubject,
    selectedWeek,
  ]);

  // --- Effect: Whole test timer logic ---
  useEffect(() => {
    if (!isTestStarted) {
      setTestTimerActive(false);
      setTestTimeLeft(TEST_TIME_LIMIT);
      setShowTestTimerWarning(false);
      return;
    }
    setTestTimerActive(true);
    setShowTestTimerWarning(false);
  }, [isTestStarted]);

  useEffect(() => {
    if (!testTimerActive) return;
    if (!isTestStarted) return;
    if (testTimeLeft <= 0) {
      // Time's up: auto-submit
      handleTestComplete();
      setTestTimerActive(false);
      return;
    }
    if (testTimeLeft <= TEST_TIMER_WARNING_THRESHOLD) {
      setShowTestTimerWarning(true);
    } else {
      setShowTestTimerWarning(false);
    }
    const timer = setTimeout(() => {
      setTestTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [testTimerActive, testTimeLeft, isTestStarted]);

  // --- Event Handlers ---

  // Start the test view
  const handleStartTest = useCallback(() => {
    if (tests.length > 0) {
      setIsTestStarted(true);
      setCurrentQuestionIndex(0); // Go to the first question
      setAnswers({}); // Clear any previous answers
      setShowAnimation(true); // Trigger animation for the first question
      setTestTimeLeft(TEST_TIME_LIMIT);
      setTestTimerActive(true);
      setShowTestTimerWarning(false);
    }
  }, [tests.length]);

  // Navigate to the next question
  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIndex < tests.length - 1) {
      setShowAnimation(false); // Start fade-out animation
      setTimeout(() => {
        setCurrentQuestionIndex((prev) => prev + 1);
        setShowAnimation(true);
      }, 300); // Should match CSS transition duration
    }
  }, [currentQuestionIndex, tests.length]);

  // Navigate to the previous question
  const handlePreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setShowAnimation(false); // Start fade-out animation
      setTimeout(() => {
        setCurrentQuestionIndex((prev) => prev - 1);
        setShowAnimation(true);
      }, 300); // Should match CSS transition duration
    }
  }, [currentQuestionIndex]);

  // Reset filters to initial state
  const handleResetFilters = useCallback(() => {
    // If test is already completed, don't show confirmation dialog
    if (testAlreadyCompleted) {
      setSelectedSubject("");
      setSelectedWeek("");
      setIsTestStarted(false);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setTests([]);
      setCurrentSchedule(null);
      setError(null);
      setShowResultModal(false);
      clearLocalStorageTestData();
      setTestTimeLeft(TEST_TIME_LIMIT);
      setTestTimerActive(false);
      setShowTestTimerWarning(false);
      setTestAlreadyCompleted(false);
      setPreviousTestResult(null);
      setCheckingCompletion(false);

      // Clear localStorage completion status
      if (user?.id && currentSchedule?._id) {
        const completionKey = `testCompleted_${user.id}_${currentSchedule._id}`;
        localStorage.removeItem(completionKey);
        console.log("Cleared localStorage completion status:", completionKey);
      }
      return;
    }

    // Only show confirmation if there's actual progress to lose
    if (isTestStarted || Object.keys(answers).length > 0) {
      const ok = window.confirm(
        "This will clear your current test progress. Continue?"
      );
      if (!ok) return;
    }

    setSelectedSubject("");
    setSelectedWeek("");
    setIsTestStarted(false);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setTests([]);
    setCurrentSchedule(null);
    setError(null);
    setShowResultModal(false);
    clearLocalStorageTestData();
    setTestTimeLeft(TEST_TIME_LIMIT);
    setTestTimerActive(false);
    setShowTestTimerWarning(false);
    setTestAlreadyCompleted(false);
    setPreviousTestResult(null);
    setCheckingCompletion(false);
  }, [isTestStarted, answers, testAlreadyCompleted]);

  // Handle test submission
  const handleSubmit = useCallback(() => {
    // Call handleTestComplete instead of just logging
    handleTestComplete();
  }, [handleTestComplete]);

  // --- Handle Leaderboard View ---
  const handleViewLeaderboard = useCallback(async () => {
    try {
      if (leaderboardFetchControllerRef.current) {
        leaderboardFetchControllerRef.current.abort();
      }
      const controller = new AbortController();
      leaderboardFetchControllerRef.current = controller;
      setLeaderboardLoading(true);
      const response = await fetch(
        `${backendurl}/api/weeklytest/leaderboard?subjectId=${encodeURIComponent(
          selectedSubject.id
        )}&year=${encodeURIComponent(
          selectedWeek.year
        )}&weekNumber=${encodeURIComponent(selectedWeek.number)}`,
        { headers: getAuthHeaders(), signal: controller.signal }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }

      const data = await response.json();
      if (data.success) {
        setLeaderboard(data.data);
        setShowLeaderboard(true);
        setError(null);
        setRetryAction(null);
      } else {
        throw new Error(data.message || "Failed to fetch leaderboard");
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      if (DEBUG) console.error("Error fetching leaderboard:", err);
      setError("Failed to load leaderboard. Please try again later.");
      setRetryAction("leaderboard");
    } finally {
      setLeaderboardLoading(false);
    }
  }, [backendurl, getAuthHeaders, selectedSubject, selectedWeek, DEBUG]);

  // --- Derived State ---
  // Get the current question object based on the index (null if test not started/no tests)
  const currentQuestion = useMemo(
    () =>
      isTestStarted && tests && tests.length > 0
        ? tests[currentQuestionIndex]
        : null,
    [isTestStarted, tests, currentQuestionIndex]
  );

  // Confirm before changing filters if there is progress
  const confirmDiscardIfNeeded = useCallback(() => {
    if (!isTestStarted && Object.keys(answers).length === 0) return true;
    return window.confirm(
      "Changing filters will reset your current test progress. Continue?"
    );
  }, [isTestStarted, answers]);

  const safeSetSelectedSubject = useCallback(
    (val) => {
      if (!selectedSubject || val?.id !== selectedSubject.id) {
        if (!confirmDiscardIfNeeded()) return;
        setIsTestStarted(false);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setTests([]);
        setCurrentSchedule(null);
        setShowResultModal(false);
        clearLocalStorageTestData();
      }
      setSelectedSubject(val);
    },
    [selectedSubject, confirmDiscardIfNeeded]
  );

  const safeSetSelectedWeek = useCallback(
    (val) => {
      if (
        !selectedWeek ||
        val?.number !== selectedWeek.number ||
        val?.year !== selectedWeek.year
      ) {
        if (!confirmDiscardIfNeeded()) return;
        setIsTestStarted(false);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setTests([]);
        setCurrentSchedule(null);
        setShowResultModal(false);
        clearLocalStorageTestData();
      }
      setSelectedWeek(val);
    },
    [selectedWeek, confirmDiscardIfNeeded]
  );

  // Retry handler
  const handleRetry = useCallback(() => {
    if (retryAction === "schedule") return fetchSchedule();
    if (retryAction === "tests") return fetchAndSetNewTestData();
    if (retryAction === "leaderboard") return handleViewLeaderboard();
  }, [
    retryAction,
    fetchSchedule,
    fetchAndSetNewTestData,
    handleViewLeaderboard,
  ]);

  const getScoreColor = (score, totalQuestions) => {
    const percentage = (score / totalQuestions) * 100;
    if (percentage >= 90) return styles.scoreExcellent;
    if (percentage >= 70) return styles.scoreGood;
    if (percentage >= 50) return styles.scoreAverage;
    return styles.scorePoor;
  };

  const getPointsColor = (points) => {
    if (points > 0) return styles.pointsPositive;
    if (points < 0) return styles.pointsNegative;
    return styles.pointsNeutral;
  };

  // Helper to format time as mm:ss
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Achievement Modal
  const AchievementModal = ({ achievements, onClose }) => (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.7)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#232c3a",
          color: "#fff",
          borderRadius: 16,
          padding: 32,
          minWidth: 320,
          maxWidth: 400,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          textAlign: "center",
        }}
      >
        <h2 style={{ fontSize: "2rem", marginBottom: 16 }}>
          Achievement Unlocked!
        </h2>
        {achievements.map((a) => (
          <div
            key={a.id}
            style={{
              margin: "18px 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "3rem", marginBottom: 8 }}>{a.icon}</span>
            <span
              style={{ fontWeight: 700, fontSize: "1.2rem", marginBottom: 4 }}
            >
              {a.name}
            </span>
            <span style={{ fontSize: "1rem", opacity: 0.85 }}>
              {a.description}
            </span>
          </div>
        ))}
        <button
          onClick={onClose}
          style={{
            marginTop: 18,
            padding: "10px 28px",
            borderRadius: 8,
            background: "#f1c40f",
            color: "#232c3a",
            fontWeight: 700,
            fontSize: "1.1rem",
            border: "none",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );

  // --- Effect: Check for challenge in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("challenge") === "1") {
      const from = params.get("from") || "A friend";
      const score = params.get("score");
      setChallengeBanner({ from, score });
    } else {
      setChallengeBanner(null);
    }
  }, []);

  // --- Render Logic ---
  return (
    <div
      style={{
        width: "100vw",
        minHeight: "100vh", // Use minHeight to allow content to expand
        boxSizing: "border-box",
        background: theme.bg,
        display: "flex",
        flexDirection: "column", // Main layout is vertical
        alignItems: "center", // Center content horizontally
        fontFamily: theme.fontBody,
        color: theme.text,
        position: "relative",
        overflowX: "hidden", // Prevent horizontal scroll from stars
        padding: "25px 15px 50px 15px", // Add some padding like Dashboard
      }}
      className={styles.testListContainer_themed}
    >
      {" "}
      {/* Add a new class for CSS overrides if needed */}
      <FloatingStars />
      {/* Page Header - Themed */}
      <div
        style={{
          width: "100%",
          maxWidth: "1000px", // Consistent with Dashboard
          marginBottom: "30px", // Increased spacing
          textAlign: "center",
          zIndex: 1,
        }}
      >
        <h1
          style={{
            fontFamily: theme.fontHeader,
            fontSize: "3.5rem", // Slightly adjusted from Dashboard for context
            color: theme.accent,
            letterSpacing: "3px",
            textShadow: `2px 2px 0 ${theme.bubbleDarkText}, -1px -1px 0 ${theme.bg}, 1px -1px 0 ${theme.bg}, -1px 1px 0 ${theme.bg}, 1px 1px 0 ${theme.bg}`,
            marginBottom: "0.5rem",
            lineHeight: 1.1,
          }}
        >
          Weekly Lab Tests
        </h1>
        <p
          style={{
            fontFamily: theme.fontAccent, // Using dashboard's accent font for subtitle
            fontSize: "1.3rem",
            color: theme.text,
            opacity: 0.85,
            textShadow: `1px 1px 2px ${theme.bubbleDarkText}`,
            marginTop: "5px",
          }}
        >
          Enhance your schematics and earn TechBlueprints.
        </p>
      </div>
      {/* Challenge Banner */}
      {challengeBanner && (
        <div
          style={{
            background: "#f1c40f",
            color: "#0D131A",
            fontWeight: 700,
            fontSize: "1.1rem",
            borderRadius: 10,
            padding: "12px 24px",
            margin: "18px 0",
            boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
            textAlign: "center",
            maxWidth: 600,
            alignSelf: "center",
          }}
        >
          {challengeBanner.from} has challenged you to beat their score of{" "}
          <span style={{ color: "#e74c3c", fontWeight: 900 }}>
            {challengeBanner.score}
          </span>
          !<br />
          Take the test and see if you can do better!
        </div>
      )}
      {/* Filter Panel - Themed Wrapper */}
      <div
        className={styles.filterPanelWrapper_themed}
        style={{
          background: theme.panelBg,
          border: `1px solid ${theme.panelBorder}`,
          borderRadius: "15px",
          padding: "25px",
          width: "100%",
          maxWidth: "1000px",
          marginBottom: "30px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
          boxSizing: "border-box",
        }}
      >
        <FilterPanel
          selectedSubject={selectedSubject}
          setSelectedSubject={safeSetSelectedSubject}
          selectedWeek={selectedWeek}
          setSelectedWeek={safeSetSelectedWeek}
          subjects={subjects}
          weeks={weeks}
          filteredWeeks={filteredWeeks}
          handleResetFilters={handleResetFilters}
          theme={theme} // Pass theme to FilterPanel
        />
      </div>
      {/* Content Panel (Test Area) - Themed Wrapper */}
      <div
        className={styles.contentPanel_themed}
        style={{
          background: theme.panelBg,
          border: `1px solid ${theme.panelBorder}`,
          borderRadius: "15px",
          padding: "25px", // Uniform padding
          width: "100%",
          maxWidth: "1000px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
          boxSizing: "border-box",
          display: "flex", // Added for centering content inside
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "300px", // Ensure it has some height
        }}
      >
        {/* Whole test timer display */}
        {isTestStarted && (
          <div
            className={styles.timerContainer}
            style={{
              textAlign: "center",
              marginBottom: "10px",
              fontWeight: "bold",
              fontSize: "1.3rem",
              color: showTestTimerWarning ? "#ff3b3b" : theme.accent,
              transition: "color 0.2s",
              animation: showTestTimerWarning
                ? "flash-timer 1s steps(2, start) infinite"
                : "none",
            }}
            aria-live="polite"
            role="status"
          >
            ⏰ Test Time Left: {formatTime(testTimeLeft)}
            {showTestTimerWarning && (
              <span
                style={{ marginLeft: 10, color: "#ff3b3b", fontWeight: 700 }}
              >
                Less than 1 minute left!
              </span>
            )}
          </div>
        )}
        {isLoading ? (
          <div
            className={styles.messageContainer_themed}
            style={{ color: theme.text, fontSize: "1.2rem" }}
            aria-live="polite"
            role="status"
          >
            <p className={styles.loadingMessage_themed}>
              Loading Schematics...
            </p>
          </div>
        ) : error ? (
          <div
            className={styles.messageContainer_themed}
            style={{
              color: theme.accent,
              fontSize: "1.2rem",
              textAlign: "center",
            }}
            aria-live="polite"
            role="alert"
          >
            <p className={styles.errorMessage_themed}>{error}</p>
            {retryAction && (
              <button
                onClick={handleRetry}
                style={{
                  marginTop: 12,
                  padding: "8px 16px",
                  borderRadius: 8,
                  background: theme.accent,
                  color: theme.bubbleDarkText,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Retry
              </button>
            )}
          </div>
        ) : !selectedSubject || !selectedWeek ? (
          <div
            className={styles.messageContainer_themed}
            style={{
              color: theme.text,
              opacity: 0.8,
              fontSize: "1.2rem",
              textAlign: "center",
            }}
            aria-live="polite"
            role="status"
          >
            <p className={styles.infoMessage_themed}>
              Select Subject & Week to initiate test sequence.
            </p>
          </div>
        ) : tests.length > 0 && !isTestStarted ? (
          <div
            className={styles.startTestContainer_themed}
            style={{ textAlign: "center", color: theme.text }}
          >
            {checkingCompletion ? (
              <div style={{ padding: "40px" }}>
                <div
                  style={{
                    color: "#ccc",
                    fontSize: "1.1rem",
                    marginBottom: "20px",
                  }}
                >
                  Checking test status...
                </div>
                <div className={styles.spinner}></div>
              </div>
            ) : testAlreadyCompleted ? (
              <>
                <h3
                  style={{
                    fontFamily: theme.fontHeader,
                    fontSize: "2rem",
                    color: "#e74c3c",
                    marginBottom: "15px",
                  }}
                >
                  Test Already Completed
                </h3>
                <div
                  style={{
                    background: "rgba(231, 76, 60, 0.1)",
                    border: "2px solid #e74c3c",
                    borderRadius: "12px",
                    padding: "20px",
                    marginBottom: "20px",
                  }}
                >
                  <p
                    style={{
                      marginBottom: "10px",
                      fontSize: "1.1rem",
                      fontWeight: 600,
                    }}
                  >
                    You have already taken this test
                  </p>
                  <p style={{ marginBottom: "10px" }}>
                    Subject: {selectedSubject ? selectedSubject.name : ""}
                  </p>
                  <p style={{ marginBottom: "10px" }}>
                    Week: {selectedWeek ? selectedWeek.display : ""}
                  </p>
                  {previousTestResult && (
                    <>
                      <p style={{ marginBottom: "5px" }}>
                        Your Score:{" "}
                        <strong style={{ color: "#4ade80" }}>
                          {previousTestResult.score}/
                          {previousTestResult.totalQuestions}
                        </strong>
                      </p>
                      <p style={{ marginBottom: "5px" }}>
                        Points Earned:{" "}
                        <strong
                          style={{
                            color:
                              previousTestResult.pointsEarned >= 0
                                ? "#4ade80"
                                : "#e74c3c",
                          }}
                        >
                          {previousTestResult.pointsEarned > 0 ? "+" : ""}
                          {previousTestResult.pointsEarned}
                        </strong>
                      </p>
                      <p>
                        Completed:{" "}
                        {new Date(
                          previousTestResult.completedAt
                        ).toLocaleDateString()}
                      </p>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <h3
                  style={{
                    fontFamily: theme.fontHeader,
                    fontSize: "2rem",
                    color: theme.accent,
                    marginBottom: "15px",
                  }}
                >
                  Ready for System Analysis?
                </h3>
                <p style={{ marginBottom: "5px" }}>
                  Subject: {selectedSubject ? selectedSubject.name : ""}
                </p>
                <p style={{ marginBottom: "5px" }}>
                  Week: {selectedWeek ? selectedWeek.display : ""}
                </p>
                <p style={{ marginBottom: "20px" }}>
                  Questions: {tests.length}
                </p>
                <p
                  style={{
                    marginBottom: "20px",
                    color: theme.accent,
                    fontWeight: 600,
                  }}
                >
                  <span role="img" aria-label="timer">
                    ⏰
                  </span>{" "}
                  You will have {Math.floor(TEST_TIME_LIMIT / 60)} minutes for
                  the entire test.
                  <br />
                  The test will auto-submit when time runs out.
                </p>
                <button
                  onClick={handleStartTest}
                  className={styles.startButton_themed}
                  style={{
                    background: theme.accent,
                    color: theme.bubbleDarkText,
                    fontFamily: theme.fontBody,
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    padding: "12px 30px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                    transition: "background-color 0.2s, transform 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#e0b00d";
                    e.currentTarget.style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = theme.accent;
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  Initiate Test
                </button>
              </>
            )}
          </div>
        ) : isTestStarted && currentQuestion ? (
          <QuestionDisplay
            currentQuestion={currentQuestion}
            currentQuestionIndex={currentQuestionIndex}
            tests={tests}
            answers={answers}
            handleAnswerSelect={handleAnswerSelect}
            handleNextQuestion={handleNextQuestion}
            handlePreviousQuestion={handlePreviousQuestion}
            handleSubmit={handleSubmit}
            isTestStarted={isTestStarted}
            showAnimation={showAnimation}
            theme={theme} // Pass theme
            setCurrentQuestionIndex={setCurrentQuestionIndex}
          />
        ) : showResults ? (
          // ... (Results Screen - This part will need its own themed component or significant inline styling later)
          <div
            className={styles.resultsContainer_themed}
            style={{ color: theme.text, textAlign: "center" }}
          >
            <h3
              style={{
                fontFamily: theme.fontHeader,
                fontSize: "2.5rem",
                color: theme.accent,
              }}
            >
              Test Analysis Complete
            </h3>
            {/* Further styling for results here */}
          </div>
        ) : (
          <div
            className={styles.messageContainer_themed}
            style={{
              color: theme.text,
              opacity: 0.7,
              fontSize: "1.1rem",
              textAlign: "center",
            }}
          >
            <p className={styles.infoMessage_themed}>
              No schematics available for selected parameters.
            </p>
          </div>
        )}
      </div>
      {/* Leaderboard Modal - Pass theme */}
      {showLeaderboard && (
        <Leaderboard
          leaderboard={leaderboard}
          handleViewLeaderboard={handleViewLeaderboard} // This seems to be for closing it, might need renaming
          handleResetFilters={handleResetFilters} // Or a dedicated close handler
          theme={theme}
        />
      )}
      {leaderboardLoading && (
        <div
          className={styles.messageContainer_themed}
          style={{
            color: theme.text,
            fontSize: "1.1rem",
            textAlign: "center",
            marginTop: 10,
          }}
          aria-live="polite"
          role="status"
        >
          Loading leaderboard...
        </div>
      )}
      {/* Test Results Modal - Already passing theme (from a previous step if it was done) */}
      {showResultModal && (
        <ResultModal
          showResultModal={showResultModal}
          setShowResultModal={setShowResultModal}
          testResult={testResult}
          score={score}
          pointsEarned={pointsEarned}
          currentRank={currentRank}
          getScoreColor={getScoreColor}
          getPointsColor={getPointsColor}
          loading={resultLoading}
          error={error}
          theme={theme}
          user={user}
          selectedSubject={selectedSubject}
          selectedWeek={selectedWeek}
        />
      )}
      {/* Listen for custom event to jump to a question index (from Review Unanswered button) */}
      {React.useEffect(() => {
        const handler = (e) => {
          if (typeof e.detail?.index === "number") {
            setCurrentQuestionIndex(e.detail.index);
            setShowAnimation(true);
            setTestTimeLeft(TEST_TIME_LIMIT);
            setTestTimerActive(true);
            setShowTestTimerWarning(false);
          }
        };
        window.addEventListener("jumpToQuestionIndex", handler);
        return () => window.removeEventListener("jumpToQuestionIndex", handler);
      }, [])}
      {/* Achievement Modal */}
      {showAchievementModal && newAchievements.length > 0 && (
        <AchievementModal
          achievements={newAchievements}
          onClose={() => setShowAchievementModal(false)}
        />
      )}
    </div>
  );
};

export default WeeklyTest;

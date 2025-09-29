import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  MdAdd,
  MdCheck,
  MdClose,
  MdSave,
  MdSearch,
  MdFilterList,
  MdVisibility,
  MdDragIndicator,
  MdContentCopy,
  MdHistory,
  MdAnalytics,
  MdCalendarToday,
  MdShuffle,
  MdSelectAll,
  MdClear,
  MdPreview,
  MdAutoAwesome,
  MdTrendingUp,
  MdWarning,
  MdInfo,
  MdBookmark,
  MdExpandMore,
  MdExpandLess,
  MdEdit,
  MdDelete,
  MdRefresh,
} from "react-icons/md";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { FixedSizeList as List } from "react-window";

// Sortable Question Item Component
const SortableQuestionItem = ({
  question,
  index,
  isSelected,
  onToggle,
  onExpand,
  isExpanded,
  onRemove,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getDifficultyColor = (level) => {
    const colors = {
      Remembering: "badge-success",
      Understanding: "badge-info",
      Applying: "badge-warning",
      Analyzing: "badge-secondary",
      Evaluating: "badge-accent",
      Creating: "badge-error",
    };
    return colors[level] || "badge-ghost";
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card bg-base-100 border-2 transition-all duration-200 hover:shadow-lg ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-base-300 hover:border-primary/50"
      } ${isDragging ? "z-50" : ""}`}
    >
      <div className="card-body p-1 sm:p-3">
        <div className="flex items-start gap-1 sm:gap-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-base-200 rounded flex-shrink-0"
          >
            <MdDragIndicator className="w-3 h-3 sm:w-4 sm:h-4 text-base-content/50" />
          </div>

          <input
            type="checkbox"
            className="checkbox checkbox-primary checkbox-xs sm:checkbox-sm mt-1 flex-shrink-0"
            checked={isSelected}
            onChange={() => onToggle(question._id)}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1 mb-1">
              <p className="font-medium text-xs leading-tight line-clamp-2">
                {question.questionText}
              </p>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => onExpand(question._id)}
                  className="btn btn-ghost btn-xs p-1"
                  title="Expand/Collapse"
                >
                  {isExpanded ? (
                    <MdExpandLess className="w-3 h-3" />
                  ) : (
                    <MdExpandMore className="w-3 h-3" />
                  )}
                </button>
                {isSelected && (
                  <button
                    onClick={() => onRemove(question._id)}
                    className="btn btn-ghost btn-xs p-1 text-error"
                    title="Remove"
                  >
                    <MdClose className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mb-1">
              <span
                className={`badge badge-xs ${getDifficultyColor(
                  question.bloomsLevel
                )}`}
              >
                <span className="hidden sm:inline">{question.bloomsLevel}</span>
                <span className="sm:hidden">
                  {question.bloomsLevel.slice(0, 4)}
                </span>
              </span>
              <span className="badge badge-outline badge-xs">
                {question.choices?.length || 0}
              </span>
              <span className="badge badge-ghost badge-xs">#{index + 1}</span>
            </div>

            {isExpanded && (
              <div className="mt-3 p-3 bg-base-200 rounded-lg">
                <h4 className="font-medium text-xs mb-2 text-base-content/70">
                  CHOICES:
                </h4>
                <div className="space-y-1">
                  {question.choices?.map((choice, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 text-sm p-2 rounded ${
                        choice === question.correctAnswer
                          ? "bg-success/20 text-success-content font-medium"
                          : "bg-base-100"
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-base-300 flex items-center justify-center text-xs">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{choice}</span>
                      {choice === question.correctAnswer && (
                        <MdCheck className="w-4 h-4 text-success ml-auto" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Virtual List Item Component
const VirtualQuestionItem = ({ index, style, data }) => {
  const {
    questions,
    selectedQuestions,
    onToggle,
    expandedQuestions,
    onExpand,
  } = data;
  const question = questions[index];

  return (
    <div style={style}>
      <SortableQuestionItem
        question={question}
        index={index}
        isSelected={selectedQuestions.includes(question._id)}
        onToggle={onToggle}
        onExpand={onExpand}
        isExpanded={expandedQuestions.includes(question._id)}
        onRemove={() => {}}
      />
    </div>
  );
};

const WeekSchedule = () => {
  // Core state
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [weekData, setWeekData] = useState({ weekNumber: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI state
  const [expandedQuestions, setExpandedQuestions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [showPreview, setShowPreview] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBloom, setFilterBloom] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [activeTab, setActiveTab] = useState("selected");

  // Data state
  const [existingWeeks, setExistingWeeks] = useState([]);
  const [questionUsageStats, setQuestionUsageStats] = useState({});
  const [bloomsDistribution, setBloomsDistribution] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [conflictWarning, setConflictWarning] = useState("");
  const [lastSaved, setLastSaved] = useState(null);

  const backendurl = import.meta.env.VITE_BACKEND_URL;
  const autosaveInterval = useRef(null);

  const BLOOMS_LEVELS = [
    "Remembering",
    "Understanding",
    "Applying",
    "Analyzing",
    "Evaluating",
    "Creating",
  ];

  const COLORS = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7300",
    "#8dd1e1",
    "#d084d0",
  ];

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Auto-save functionality
  const autosave = useCallback(() => {
    if (weekData.weekNumber && selectedQuestions.length > 0) {
      const draftData = {
        weekNumber: weekData.weekNumber,
        selectedSubject,
        selectedQuestions,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem("weekScheduleDraft", JSON.stringify(draftData));
      setLastSaved(new Date());
    }
  }, [weekData, selectedSubject, selectedQuestions]);

  // Load draft on component mount
  useEffect(() => {
    const draft = localStorage.getItem("weekScheduleDraft");
    if (draft) {
      try {
        const draftData = JSON.parse(draft);
        setWeekData({ weekNumber: draftData.weekNumber });
        setSelectedSubject(draftData.selectedSubject);
        setSelectedQuestions(draftData.selectedQuestions || []);
      } catch (err) {
        console.error("Failed to load draft:", err);
      }
    }
  }, []);

  // Auto-save timer
  useEffect(() => {
    if (weekData.weekNumber && selectedQuestions.length > 0) {
      autosaveInterval.current = setInterval(autosave, 30000); // Every 30 seconds
      return () => clearInterval(autosaveInterval.current);
    }
  }, [autosave, weekData.weekNumber, selectedQuestions.length]);

  // Fetch initial data
  useEffect(() => {
    fetchSubjects();
    fetchExistingWeeks();
  }, []);

  // Fetch questions when subject changes
  useEffect(() => {
    if (selectedSubject) {
      fetchQuestions();
      fetchQuestionUsageStats();
    }
  }, [selectedSubject]);

  // Filter and sort questions
  useEffect(() => {
    let filtered = [...questions];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (q) =>
          q.questionText.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.choices?.some((choice) =>
            choice.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
    }

    // Bloom's level filter
    if (filterBloom) {
      filtered = filtered.filter((q) => q.bloomsLevel === filterBloom);
    }

    // Sort questions
    switch (sortBy) {
      case "recent":
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case "alphabetical":
        filtered.sort((a, b) => a.questionText.localeCompare(b.questionText));
        break;
      case "bloom":
        filtered.sort(
          (a, b) =>
            BLOOMS_LEVELS.indexOf(a.bloomsLevel) -
            BLOOMS_LEVELS.indexOf(b.bloomsLevel)
        );
        break;
      case "usage":
        filtered.sort(
          (a, b) =>
            (questionUsageStats[b._id] || 0) - (questionUsageStats[a._id] || 0)
        );
        break;
    }

    setFilteredQuestions(filtered);
    setCurrentPage(1);
  }, [questions, searchTerm, filterBloom, sortBy, questionUsageStats]);

  // Calculate analytics
  useEffect(() => {
    const selectedQs = questions.filter((q) =>
      selectedQuestions.includes(q._id)
    );

    // Bloom's distribution
    const distribution = BLOOMS_LEVELS.map((level) => ({
      name: level,
      value: selectedQs.filter((q) => q.bloomsLevel === level).length,
      color: COLORS[BLOOMS_LEVELS.indexOf(level)],
    })).filter((item) => item.value > 0);

    setBloomsDistribution(distribution);

    // Validation
    const errors = [];
    if (selectedQs.length < 5) errors.push("Minimum 5 questions required");
    if (selectedQs.length > 25) errors.push("Maximum 25 questions recommended");
    if (distribution.length < 2)
      errors.push("Include questions from at least 2 Bloom's levels");

    setValidationErrors(errors);

    // Conflict detection
    if (weekData.weekNumber && selectedSubject) {
      const conflict = existingWeeks.find(
        (w) =>
          w.weekNumber === parseInt(weekData.weekNumber) &&
          w.subjectId === selectedSubject
      );
      setConflictWarning(
        conflict
          ? `Week ${weekData.weekNumber} already exists for this subject`
          : ""
      );
    }
  }, [
    selectedQuestions,
    questions,
    weekData.weekNumber,
    selectedSubject,
    existingWeeks,
  ]);

  // API functions
  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${backendurl}/api/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch subjects");
      const data = await res.json();
      setSubjects(data);
    } catch {
      setError("Failed to load subjects");
    }
  };

  const fetchQuestions = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${backendurl}/api/questions/${selectedSubject}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch questions");
      const data = await res.json();
      setQuestions(data);
    } catch {
      setError("Failed to load questions for this subject");
    }
  };

  const fetchExistingWeeks = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${backendurl}/api/weeks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch weeks");
      const data = await res.json();
      setExistingWeeks(data);
    } catch {
      console.error("Failed to fetch existing weeks");
    }
  };

  const fetchQuestionUsageStats = async () => {
    // Mock usage stats for now
    const stats = {};
    questions.forEach((q) => {
      stats[q._id] = Math.floor(Math.random() * 10);
    });
    setQuestionUsageStats(stats);
  };

  // Event handlers
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setSelectedQuestions((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleQuestionToggle = (questionId) => {
    setSelectedQuestions((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleExpandQuestion = (questionId) => {
    setExpandedQuestions((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleBulkSelect = (type) => {
    console.log(
      "Bulk select triggered:",
      type,
      "Available questions:",
      filteredQuestions.length
    );

    const availableQuestions = filteredQuestions.map((q) => q._id);

    switch (type) {
      case "all":
        console.log("Selecting all questions:", availableQuestions);
        setSelectedQuestions((prev) => {
          const newSelection = [...new Set([...prev, ...availableQuestions])];
          console.log("New selection after all:", newSelection);
          return newSelection;
        });
        break;
      case "none":
        console.log("Clearing all selections");
        setSelectedQuestions([]);
        break;
      case "random": {
        const random = availableQuestions
          .sort(() => 0.5 - Math.random())
          .slice(0, 10);
        console.log("Random selection:", random);
        setSelectedQuestions((prev) => {
          const newSelection = [...new Set([...prev, ...random])];
          console.log("New selection after random:", newSelection);
          return newSelection;
        });
        break;
      }
      case "bloom": {
        if (filterBloom) {
          const bloomQuestions = filteredQuestions
            .filter((q) => q.bloomsLevel === filterBloom)
            .map((q) => q._id);
          console.log("Bloom filtered questions:", bloomQuestions);
          setSelectedQuestions((prev) => {
            const newSelection = [...new Set([...prev, ...bloomQuestions])];
            console.log("New selection after bloom:", newSelection);
            return newSelection;
          });
        }
        break;
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    console.log("Submit triggered with data:", {
      weekNumber: weekData.weekNumber,
      selectedSubject,
      selectedQuestions: selectedQuestions.length,
      validationErrors,
    });

    if (validationErrors.length > 0) {
      setError("Please fix validation errors before submitting");
      return;
    }

    if (
      !weekData.weekNumber ||
      !selectedSubject ||
      selectedQuestions.length === 0
    ) {
      setError(
        "Please fill in all required fields and select at least one question"
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const requestData = {
        weekNumber: parseInt(weekData.weekNumber),
        subject: selectedSubject,
        questions: selectedQuestions,
      };

      console.log("Sending request with data:", requestData);

      const response = await fetch(`${backendurl}/api/weeks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.log("Error response:", errorData);
        throw new Error(errorData.message || "Failed to create week schedule");
      }

      const result = await response.json();
      console.log("Success response:", result);

      setSuccess("Week schedule created successfully!");
      localStorage.removeItem("weekScheduleDraft");

      // Reset form
      setWeekData({ weekNumber: "" });
      setSelectedQuestions([]);
      setSelectedSubject("");
      setQuestions([]);
      setFilteredQuestions([]);
    } catch (err) {
      console.error("Submit error:", err);
      setError(err.message || "An error occurred while creating the schedule.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pagination
  const totalPages =
    itemsPerPage >= 1000
      ? 1
      : Math.ceil(filteredQuestions.length / itemsPerPage);
  const paginatedQuestions =
    itemsPerPage >= 1000
      ? filteredQuestions
      : filteredQuestions.slice(
          (currentPage - 1) * itemsPerPage,
          currentPage * itemsPerPage
        );

  const selectedQuestionsData = useMemo(
    () => questions.filter((q) => selectedQuestions.includes(q._id)),
    [questions, selectedQuestions]
  );

  return (
    <div className="min-h-screen bg-base-300">
      <div className="container mx-auto px-2 sm:px-3 py-2 sm:py-3">
        {/* Header */}
        <div className="mb-2 sm:mb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-primary">
                Create Week Schedule
              </h1>
              <p className="text-xs sm:text-sm text-base-content/70">
                Build weekly assessments
              </p>
            </div>

            <div className="flex gap-1 sm:gap-2">
              <button
                className="btn btn-outline btn-xs sm:btn-sm gap-1"
                onClick={() => setShowAnalytics(!showAnalytics)}
              >
                <MdAnalytics className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Analytics</span>
              </button>
              <button
                className="btn btn-outline btn-xs sm:btn-sm gap-1"
                onClick={() => setShowPreview(!showPreview)}
              >
                <MdPreview className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Preview</span>
              </button>
            </div>
          </div>

          {/* Progress Indicators */}
          <div className="mt-2">
            <div className="grid grid-cols-4 sm:flex sm:items-center gap-1 sm:gap-3 text-xs">
              <div className="flex items-center gap-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    weekData.weekNumber ? "bg-success" : "bg-base-400"
                  }`}
                ></div>
                <span className="truncate">Week</span>
              </div>
              <div className="flex items-center gap-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    selectedSubject ? "bg-success" : "bg-base-400"
                  }`}
                ></div>
                <span className="truncate">Subject</span>
              </div>
              <div className="flex items-center gap-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    selectedQuestions.length >= 5
                      ? "bg-success"
                      : selectedQuestions.length > 0
                      ? "bg-warning"
                      : "bg-base-400"
                  }`}
                ></div>
                <span className="truncate">Q ({selectedQuestions.length})</span>
              </div>
              <div className="flex items-center gap-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    validationErrors.length === 0 &&
                    selectedQuestions.length > 0
                      ? "bg-success"
                      : "bg-base-400"
                  }`}
                ></div>
                <span className="truncate">Valid</span>
              </div>
            </div>

            {lastSaved && (
              <div className="text-xs text-success mt-1">
                Auto-saved {lastSaved.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="alert alert-error mb-4">
            <MdWarning />
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              className="btn btn-ghost btn-xs"
            >
              <MdClose />
            </button>
          </div>
        )}

        {success && (
          <div className="alert alert-success mb-4">
            <MdCheck />
            <span>{success}</span>
            <button
              onClick={() => setSuccess("")}
              className="btn btn-ghost btn-xs"
            >
              <MdClose />
            </button>
          </div>
        )}

        {conflictWarning && (
          <div className="alert alert-warning mb-4">
            <MdWarning />
            <span>{conflictWarning}</span>
          </div>
        )}

        {validationErrors.length > 0 && (
          <div className="alert alert-warning mb-4">
            <MdWarning />
            <div>
              <div className="font-medium">Validation Issues:</div>
              <ul className="list-disc list-inside text-sm">
                {validationErrors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Main Layout - Compact 3 Panel Design */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 h-[calc(100vh-200px)] overflow-hidden">
          {/* LEFT PANEL - Subject & Filters */}
          <div className="lg:col-span-3 order-1 flex flex-col min-h-0">
            <div className="card bg-base-100 flex-1 flex flex-col min-h-0">
              <div className="card-body p-2 sm:p-4 flex-1 flex flex-col min-h-0">
                <h2 className="card-title text-sm sm:text-base mb-2 sm:mb-3 flex-shrink-0">
                  Configuration
                </h2>

                {/* Week Number */}
                <div className="form-control mb-2">
                  <label className="label py-1">
                    <span className="label-text text-xs sm:text-sm font-medium">
                      Week Number
                    </span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered input-sm"
                    placeholder="e.g., 1"
                    value={weekData.weekNumber}
                    onChange={(e) =>
                      setWeekData((prev) => ({
                        ...prev,
                        weekNumber: e.target.value,
                      }))
                    }
                    required
                  />
                </div>

                {/* Subject Selection */}
                <div className="form-control mb-2">
                  <label className="label py-1">
                    <span className="label-text text-xs sm:text-sm font-medium">
                      Subject
                    </span>
                  </label>
                  <select
                    className="select select-bordered select-sm"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Subject --</option>
                    {subjects.map((subject) => (
                      <option key={subject._id} value={subject._id}>
                        {subject.name || subject.subject || subject.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="divider"></div>

                {/* Filters */}
                <h3 className="font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                  Filters & Search
                </h3>

                <div className="form-control mb-1">
                  <input
                    type="text"
                    placeholder="Search questions..."
                    className="input input-bordered input-xs sm:input-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="form-control mb-1">
                  <select
                    className="select select-bordered select-xs sm:select-sm"
                    value={filterBloom}
                    onChange={(e) => setFilterBloom(e.target.value)}
                  >
                    <option value="">All Bloom's Levels</option>
                    {BLOOMS_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control mb-2">
                  <select
                    className="select select-bordered select-xs sm:select-sm"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="recent">Most Recent</option>
                    <option value="alphabetical">Alphabetical</option>
                    <option value="bloom">Bloom's Level</option>
                    <option value="usage">Usage Count</option>
                  </select>
                </div>

                <div className="form-control mb-2">
                  <select
                    className="select select-bordered select-xs sm:select-sm"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={20}>20 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                    <option value={200}>200 per page</option>
                    <option value={500}>500 per page</option>
                    <option value={1000}>All questions</option>
                  </select>
                </div>

                {/* Bulk Actions */}
                <div className="divider my-1 sm:my-2"></div>
                <h3 className="font-medium mb-1 sm:mb-2 text-xs sm:text-sm">
                  Quick Actions
                </h3>

                <div className="grid grid-cols-2 gap-1">
                  <button
                    className="btn btn-outline btn-xs"
                    onClick={() => handleBulkSelect("all")}
                    disabled={!selectedSubject}
                  >
                    <MdSelectAll className="w-3 h-3" />
                    <span className="hidden sm:inline text-xs">All</span>
                  </button>
                  <button
                    className="btn btn-outline btn-xs"
                    onClick={() => handleBulkSelect("none")}
                  >
                    <MdClear className="w-3 h-3" />
                    <span className="hidden sm:inline text-xs">None</span>
                  </button>
                  <button
                    className="btn btn-outline btn-xs"
                    onClick={() => handleBulkSelect("random")}
                    disabled={!selectedSubject}
                  >
                    <MdShuffle className="w-3 h-3" />
                    <span className="hidden sm:inline text-xs">Random</span>
                  </button>
                  <button
                    className="btn btn-outline btn-xs"
                    onClick={() => handleBulkSelect("bloom")}
                    disabled={!filterBloom}
                  >
                    <MdAutoAwesome className="w-3 h-3" />
                    <span className="hidden sm:inline text-xs">Level</span>
                  </button>
                </div>

                {/* Quick Stats */}
                <div className="divider my-1"></div>
                <div className="stats stats-vertical text-center">
                  <div className="stat py-1 px-2">
                    <div className="stat-title text-xs">Available</div>
                    <div className="stat-value text-sm">
                      {filteredQuestions.length}
                    </div>
                  </div>
                  <div className="stat py-1 px-2">
                    <div className="stat-title text-xs">Selected</div>
                    <div className="stat-value text-sm text-primary">
                      {selectedQuestions.length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CENTER PANEL - Question List */}
          <div className="lg:col-span-5 order-3 lg:order-2 flex flex-col min-h-0 min-w-0">
            <div className="card bg-base-100 flex-1 flex flex-col min-h-0">
              <div className="card-body p-2 sm:p-4 flex-1 flex flex-col min-h-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-1 flex-shrink-0">
                  <h2 className="card-title text-sm sm:text-base">
                    Available Questions
                  </h2>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-base-content/70">
                      {filteredQuestions.length} questions
                    </span>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => setExpandedQuestions([])}
                    >
                      <span className="hidden sm:inline">Collapse All</span>
                      <span className="sm:hidden">Collapse</span>
                    </button>
                  </div>
                </div>

                {selectedSubject ? (
                  <div className="flex-1 space-y-1 sm:space-y-2 overflow-y-auto min-h-0">
                    {filteredQuestions.length === 0 ? (
                      <div className="text-center py-4 sm:py-6">
                        <p className="text-xs sm:text-sm text-base-content/70">
                          No questions found matching your criteria.
                        </p>
                      </div>
                    ) : (
                      paginatedQuestions.map((question, index) => (
                        <SortableQuestionItem
                          key={question._id}
                          question={question}
                          index={(currentPage - 1) * itemsPerPage + index}
                          isSelected={selectedQuestions.includes(question._id)}
                          onToggle={handleQuestionToggle}
                          onExpand={handleExpandQuestion}
                          isExpanded={expandedQuestions.includes(question._id)}
                          onRemove={() => {}}
                        />
                      ))
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && itemsPerPage < 1000 && (
                      <div className="flex justify-center mt-2 sm:mt-4">
                        <div className="join">
                          <button
                            className="join-item btn btn-xs sm:btn-sm"
                            onClick={() =>
                              setCurrentPage((p) => Math.max(1, p - 1))
                            }
                            disabled={currentPage === 1}
                          >
                            <span className="hidden sm:inline">Previous</span>
                            <span className="sm:hidden">Prev</span>
                          </button>
                          <span className="join-item btn btn-xs sm:btn-sm btn-active text-xs">
                            {currentPage} / {totalPages}
                          </span>
                          <button
                            className="join-item btn btn-xs sm:btn-sm"
                            onClick={() =>
                              setCurrentPage((p) => Math.min(totalPages, p + 1))
                            }
                            disabled={currentPage === totalPages}
                          >
                            <span className="hidden sm:inline">Next</span>
                            <span className="sm:hidden">Next</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <MdBookmark className="w-8 h-8 sm:w-12 sm:h-12 mx-auto text-base-content/30 mb-2 sm:mb-3" />
                    <p className="text-xs sm:text-sm text-base-content/70">
                      Select a subject to view questions
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL - Selected Questions & Analytics */}
          <div className="lg:col-span-4 order-2 lg:order-3 flex flex-col min-h-0 min-w-0">
            <div className="card bg-base-100 flex-1 flex flex-col min-h-0">
              <div className="card-body p-2 sm:p-4 flex-1 flex flex-col min-h-0">
                <div className="tabs tabs-lifted mb-2 flex-shrink-0">
                  <button
                    className={`tab tab-lifted text-xs ${
                      activeTab === "selected" ? "tab-active" : ""
                    }`}
                    onClick={() => setActiveTab("selected")}
                  >
                    <span className="hidden sm:inline">
                      Selected ({selectedQuestions.length})
                    </span>
                    <span className="sm:hidden">
                      Sel ({selectedQuestions.length})
                    </span>
                  </button>
                  <button
                    className={`tab tab-lifted text-xs ${
                      activeTab === "analytics" ? "tab-active" : ""
                    }`}
                    onClick={() => setActiveTab("analytics")}
                  >
                    <span className="hidden sm:inline">Analytics</span>
                    <span className="sm:hidden">Stats</span>
                  </button>
                </div>

                {activeTab === "selected" && (
                  <div className="flex-1 space-y-1 sm:space-y-2 overflow-y-auto min-h-0">
                    {selectedQuestionsData.length === 0 ? (
                      <div className="text-center py-4 sm:py-6">
                        <MdAdd className="w-8 h-8 sm:w-12 sm:h-12 mx-auto text-base-content/30 mb-2 sm:mb-3" />
                        <p className="text-xs sm:text-sm text-base-content/70">
                          No questions selected yet
                        </p>
                        <p className="text-xs text-base-content/50">
                          Select questions from center panel
                        </p>
                      </div>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={selectedQuestions}
                          strategy={verticalListSortingStrategy}
                        >
                          {selectedQuestionsData.map((question, index) => (
                            <SortableQuestionItem
                              key={question._id}
                              question={question}
                              index={index}
                              isSelected={true}
                              onToggle={handleQuestionToggle}
                              onExpand={handleExpandQuestion}
                              isExpanded={expandedQuestions.includes(
                                question._id
                              )}
                              onRemove={handleQuestionToggle}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                )}

                {activeTab === "analytics" && (
                  <div className="flex-1 space-y-4 overflow-y-auto min-h-0">
                    {/* Bloom's Distribution */}
                    <div>
                      <h3 className="font-medium mb-3">
                        Bloom's Taxonomy Distribution
                      </h3>
                      {bloomsDistribution.length > 0 ? (
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={bloomsDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={80}
                                dataKey="value"
                                label={({ name, value }) => `${name}: ${value}`}
                              >
                                {bloomsDistribution.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color}
                                  />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-base-content/70">
                            Select questions to see distribution
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Bloom's Level Breakdown */}
                    <div>
                      <h3 className="font-medium mb-3">
                        Bloom's Level Breakdown
                      </h3>
                      <div className="space-y-2">
                        {BLOOMS_LEVELS.map((level, index) => {
                          const count = selectedQuestionsData.filter(
                            (q) => q.bloomsLevel === level
                          ).length;
                          const percentage =
                            selectedQuestionsData.length > 0
                              ? (
                                  (count / selectedQuestionsData.length) *
                                  100
                                ).toFixed(1)
                              : 0;

                          return (
                            <div
                              key={level}
                              className="flex items-center gap-3"
                            >
                              <span className="w-20 text-xs">{level}</span>
                              <div className="flex-1 bg-base-300 rounded-full h-2">
                                <div
                                  className="h-2 rounded-full transition-all duration-300"
                                  style={{
                                    width: `${percentage}%`,
                                    backgroundColor: COLORS[index],
                                  }}
                                ></div>
                              </div>
                              <span className="w-8 text-sm text-right">
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Smart Recommendations */}
                    <div>
                      <h3 className="font-medium mb-3">
                        Smart Recommendations
                      </h3>
                      <div className="space-y-2">
                        {(() => {
                          const totalQuestions = selectedQuestionsData.length;
                          const recommendations = [];

                          // Basic quantity recommendations
                          if (totalQuestions === 0) {
                            recommendations.push({
                              type: "info",
                              icon: <MdInfo className="w-4 h-4" />,
                              message:
                                "Start by selecting questions to see personalized recommendations",
                            });
                          } else if (totalQuestions < 5) {
                            recommendations.push({
                              type: "warning",
                              icon: <MdWarning className="w-4 h-4" />,
                              message: `Add ${
                                5 - totalQuestions
                              } more questions to reach minimum (5 total)`,
                            });
                          } else if (totalQuestions > 25) {
                            recommendations.push({
                              type: "error",
                              icon: <MdWarning className="w-4 h-4" />,
                              message: `Consider reducing by ${
                                totalQuestions - 25
                              } questions (current: ${totalQuestions}, recommended max: 25)`,
                            });
                          }

                          // Bloom's taxonomy recommendations
                          if (totalQuestions > 0) {
                            const bloomsCounts = BLOOMS_LEVELS.map((level) => ({
                              level,
                              count: selectedQuestionsData.filter(
                                (q) => q.bloomsLevel === level
                              ).length,
                            }));

                            const missingBasic = bloomsCounts.filter(
                              (b) =>
                                ["Remembering", "Understanding"].includes(
                                  b.level
                                ) && b.count === 0
                            );
                            const missingAdvanced = bloomsCounts.filter(
                              (b) =>
                                [
                                  "Analyzing",
                                  "Evaluating",
                                  "Creating",
                                ].includes(b.level) && b.count === 0
                            );

                            if (bloomsDistribution.length < 2) {
                              recommendations.push({
                                type: "info",
                                icon: <MdTrendingUp className="w-4 h-4" />,
                                message:
                                  "Include questions from multiple Bloom's levels for better assessment",
                              });
                            }

                            if (
                              missingBasic.length === 2 &&
                              totalQuestions >= 5
                            ) {
                              recommendations.push({
                                type: "info",
                                icon: <MdAutoAwesome className="w-4 h-4" />,
                                message:
                                  "Add some Remembering/Understanding questions for knowledge foundation",
                              });
                            }

                            if (
                              missingAdvanced.length === 3 &&
                              totalQuestions >= 8
                            ) {
                              recommendations.push({
                                type: "info",
                                icon: <MdAutoAwesome className="w-4 h-4" />,
                                message:
                                  "Consider adding higher-order thinking questions (Analyzing/Evaluating/Creating)",
                              });
                            }

                            // Balance recommendations
                            const basicCount = bloomsCounts
                              .filter((b) =>
                                ["Remembering", "Understanding"].includes(
                                  b.level
                                )
                              )
                              .reduce((sum, b) => sum + b.count, 0);

                            const advancedCount = bloomsCounts
                              .filter((b) =>
                                [
                                  "Analyzing",
                                  "Evaluating",
                                  "Creating",
                                ].includes(b.level)
                              )
                              .reduce((sum, b) => sum + b.count, 0);

                            if (totalQuestions >= 8) {
                              const basicPercentage =
                                (basicCount / totalQuestions) * 100;
                              const advancedPercentage =
                                (advancedCount / totalQuestions) * 100;

                              if (basicPercentage > 70) {
                                recommendations.push({
                                  type: "info",
                                  icon: <MdTrendingUp className="w-4 h-4" />,
                                  message:
                                    "Good foundation! Consider adding more analytical questions for depth",
                                });
                              }

                              if (advancedPercentage > 60 && basicCount < 2) {
                                recommendations.push({
                                  type: "warning",
                                  icon: <MdInfo className="w-4 h-4" />,
                                  message:
                                    "Many advanced questions! Add some basic ones for accessibility",
                                });
                              }
                            }

                            // Optimal range recommendations
                            if (
                              totalQuestions >= 5 &&
                              totalQuestions <= 15 &&
                              bloomsDistribution.length >= 3
                            ) {
                              recommendations.push({
                                type: "success",
                                icon: <MdCheck className="w-4 h-4" />,
                                message:
                                  "Excellent! Good question count with diverse Bloom's levels",
                              });
                            }
                          }

                          // Weekly context recommendations
                          if (
                            weekData.weekNumber &&
                            parseInt(weekData.weekNumber) === 1
                          ) {
                            recommendations.push({
                              type: "info",
                              icon: <MdBookmark className="w-4 h-4" />,
                              message:
                                "Week 1: Focus on foundational concepts (Remembering/Understanding)",
                            });
                          } else if (
                            weekData.weekNumber &&
                            parseInt(weekData.weekNumber) >= 10
                          ) {
                            recommendations.push({
                              type: "info",
                              icon: <MdBookmark className="w-4 h-4" />,
                              message:
                                "Late semester: Include more synthesis and evaluation questions",
                            });
                          }

                          return recommendations.map((rec, index) => (
                            <div
                              key={index}
                              className={`alert alert-${rec.type} alert-sm`}
                            >
                              {rec.icon}
                              <span className="text-xs">{rec.message}</span>
                            </div>
                          ));
                        })()}

                        {selectedQuestionsData.length === 0 &&
                          filteredQuestions.length > 0 && (
                            <div className="mt-3 p-3 bg-base-200 rounded-lg">
                              <h4 className="font-medium text-xs mb-2">
                                Quick Start:
                              </h4>
                              <div className="flex flex-wrap gap-1">
                                <button
                                  className="btn btn-xs btn-outline"
                                  onClick={() => handleBulkSelect("random")}
                                >
                                  Pick 10 Random
                                </button>
                                {filterBloom && (
                                  <button
                                    className="btn btn-xs btn-outline"
                                    onClick={() => handleBulkSelect("bloom")}
                                  >
                                    Select {filterBloom}
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Panel - Actions */}
        <div className="mt-2 sm:mt-4">
          <div className="card bg-base-100">
            <div className="card-body p-2 sm:p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                {/* Compact Stats */}
                <div className="flex gap-3 sm:gap-4">
                  <div className="text-center">
                    <div className="text-xs text-base-content/70">
                      Questions
                    </div>
                    <div className="text-sm font-bold text-primary">
                      {selectedQuestions.length}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-base-content/70">Levels</div>
                    <div className="text-sm font-bold">
                      {bloomsDistribution.length}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-base-content/70">Status</div>
                    <div
                      className={`text-sm font-bold ${
                        validationErrors.length === 0
                          ? "text-success"
                          : "text-warning"
                      }`}
                    >
                      {validationErrors.length === 0 ? "✓" : "!"}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    className="btn btn-outline btn-xs sm:btn-sm gap-1 flex-1 sm:flex-none"
                    onClick={autosave}
                    disabled={
                      !weekData.weekNumber || selectedQuestions.length === 0
                    }
                  >
                    <MdSave className="w-3 h-3" />
                    <span className="hidden sm:inline">Save Draft</span>
                    <span className="sm:hidden">Draft</span>
                  </button>

                  <button
                    onClick={handleSubmit}
                    className="btn btn-primary btn-xs sm:btn-sm gap-1 flex-1 sm:flex-none"
                    disabled={
                      isSubmitting ||
                      validationErrors.length > 0 ||
                      !weekData.weekNumber ||
                      !selectedSubject ||
                      selectedQuestions.length === 0
                    }
                  >
                    <MdCheck className="w-3 h-3" />
                    <span className="hidden sm:inline">
                      {isSubmitting ? "Creating..." : "Create Schedule"}
                    </span>
                    <span className="sm:hidden">
                      {isSubmitting ? "Creating..." : "Create"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeekSchedule;

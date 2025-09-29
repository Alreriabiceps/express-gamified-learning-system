import React, { useState, useEffect, useCallback } from "react";
import {
  MdEdit,
  MdDelete,
  MdSave,
  MdClose,
  MdAdd,
  MdSearch,
  MdFilterList,
  MdVisibility,
  MdAnalytics,
  MdCheckCircle,
  MdError,
  MdWarning,
  MdSelectAll,
  MdClear,
  MdContentCopy,
  MdFileDownload,
  MdUpload,
  MdSort,
  MdGridView,
  MdViewList,
  MdBookmark,
  MdRefresh,
  MdTrendingUp,
  MdFolder,
  MdSchedule,
  MdQuiz,
  MdAssignment,
  MdExpandMore,
  MdExpandLess,
  MdInfo,
  MdStar,
  MdBarChart,
} from "react-icons/md";
import { useGuideMode } from "../../../../contexts/GuideModeContext";

const BLOOMS_LEVELS = [
  "Remembering",
  "Understanding",
  "Applying",
  "Analyzing",
  "Evaluating",
  "Creating",
];

const SORT_OPTIONS = [
  { value: "questionText", label: "Question A-Z" },
  { value: "-questionText", label: "Question Z-A" },
  { value: "-createdAt", label: "Newest First" },
  { value: "createdAt", label: "Oldest First" },
  { value: "subject", label: "Subject A-Z" },
  { value: "bloomsLevel", label: "Bloom's Level" },
  { value: "difficulty", label: "Difficulty" },
];

const COLORS = [
  "#8B5CF6",
  "#06B6D4",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
];

const QuestionList = () => {
  // Core state
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // UI state
  const [activeTab, setActiveTab] = useState("dashboard");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'table'

  // Advanced filtering and search
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterBloom, setFilterBloom] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [sortBy, setSortBy] = useState("-createdAt");
  const [showFilters, setShowFilters] = useState(false);

  // Bulk operations
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Edit functionality
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Advanced features
  const [expandedQuestions, setExpandedQuestions] = useState([]);

  // Export/Import
  // const fileInputRef = useRef(null);

  const { guideMode } = useGuideMode();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  // Memoize functions to fix useEffect dependencies
  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");

      const response = await fetch(`${backendUrl}/api/questions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch questions");
      const data = await response.json();
      setQuestions(data);
    } catch (err) {
      console.error("Error fetching questions:", err);
      setError(err.message || "Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, [backendUrl]);

  const fetchSubjects = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${backendUrl}/api/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch subjects");
      const data = await response.json();
      setSubjects(data);
    } catch (err) {
      console.error("Error fetching subjects:", err);
    }
  }, [backendUrl]);

  useEffect(() => {
    fetchQuestions();
    fetchSubjects();
  }, [fetchQuestions, fetchSubjects]);

  const handleEditQuestion = (question) => {
    setEditingQuestion(question._id);
    setEditForm({
      questionText: question.questionText,
      choices: [...question.choices],
      correctAnswer: question.correctAnswer,
      bloomsLevel: question.bloomsLevel,
      subject: question.subject,
      difficulty: question.difficulty || "medium",
    });
  };

  const handleSaveEdit = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${backendUrl}/api/questions/${editingQuestion}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(editForm),
        }
      );

      if (!response.ok) throw new Error("Failed to update question");

      await fetchQuestions();
      setEditingQuestion(null);
      setEditForm({});
      setSuccess("Question updated successfully!");
    } catch (err) {
      console.error("Error updating question:", err);
      setError(err.message || "Failed to update question");
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm("Are you sure you want to delete this question?"))
      return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${backendUrl}/api/questions/${questionId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to delete question");

      await fetchQuestions();
      setSuccess("Question deleted successfully!");
    } catch (err) {
      console.error("Error deleting question:", err);
      setError(err.message || "Failed to delete question");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedQuestions.length === 0) {
      setError("No questions selected");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedQuestions.length} questions?`
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const promises = selectedQuestions.map((id) =>
        fetch(`${backendUrl}/api/questions/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      await Promise.all(promises);
      await fetchQuestions();
      setSelectedQuestions([]);
      setSuccess(`${selectedQuestions.length} questions deleted successfully!`);
    } catch (err) {
      console.error("Error deleting questions:", err);
      setError(err.message || "Failed to delete questions");
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterSubject("");
    setFilterBloom("");
    setFilterDifficulty("");
    setCurrentPage(1);
  };

  const toggleExpanded = (questionId) => {
    setExpandedQuestions((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    );
  };

  // Filter and sort logic
  const filteredQuestions = questions
    .filter((question) => {
      const matchesSearch =
        searchTerm === "" ||
        question.questionText
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        question.choices?.some((choice) =>
          choice.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchesSubject =
        filterSubject === "" ||
        (question.subject && question.subject.subject === filterSubject);
      const matchesBloom =
        filterBloom === "" || question.bloomsLevel === filterBloom;
      const matchesDifficulty =
        filterDifficulty === "" || question.difficulty === filterDifficulty;

      return (
        matchesSearch && matchesSubject && matchesBloom && matchesDifficulty
      );
    })
    .sort((a, b) => {
      const [field, direction] = sortBy.startsWith("-")
        ? [sortBy.slice(1), "desc"]
        : [sortBy, "asc"];
      const aVal = a[field] || "";
      const bVal = b[field] || "";

      if (direction === "desc") {
        return bVal.toString().localeCompare(aVal.toString());
      }
      return aVal.toString().localeCompare(bVal.toString());
    });

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

  // Statistics
  const stats = {
    total: questions.length,
    bySubject: subjects.map((subject) => ({
      name: subject.subject,
      count: questions.filter(
        (q) => q.subject && q.subject.subject === subject.subject
      ).length,
    })),
    byBloom: BLOOMS_LEVELS.map((level) => ({
      name: level,
      count: questions.filter((q) => q.bloomsLevel === level).length,
    })),
    byDifficulty: [
      {
        name: "Easy",
        count: questions.filter((q) => q.difficulty === "easy").length,
      },
      {
        name: "Medium",
        count: questions.filter((q) => q.difficulty === "medium").length,
      },
      {
        name: "Hard",
        count: questions.filter((q) => q.difficulty === "hard").length,
      },
    ].filter((item) => item.count > 0),
    recentlyAdded: questions.filter((q) => {
      const addedDate = new Date(q.createdAt || Date.now());
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return addedDate > weekAgo;
    }).length,
  };

  const getBloomColor = (level) => {
    const index = BLOOMS_LEVELS.indexOf(level);
    return COLORS[index] || "#6B7280";
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      easy: "badge-success",
      medium: "badge-warning",
      hard: "badge-error",
    };
    return colors[difficulty] || "badge-ghost";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-primary">
            Question Bank
          </h1>
          <p className="text-base-content/70">
            Manage and analyze your question collection
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => (window.location.href = "/admin/addquestions")}
          >
            <MdAdd className="w-4 h-4" />
            Add Question
          </button>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <MdFilterList className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Guide Mode */}
      {guideMode && (
        <div className="alert alert-info mb-6">
          <MdInfo />
          <div>
            <h4 className="font-semibold">Question Management Guide</h4>
            <p className="text-sm">
              Use filters to find questions, bulk operations for efficiency, and
              analytics to understand your question distribution.
            </p>
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="alert alert-error mb-4">
          <MdError />
          <span>{error}</span>
          <button onClick={() => setError("")} className="btn btn-ghost btn-xs">
            <MdClear />
          </button>
        </div>
      )}

      {success && (
        <div className="alert alert-success mb-4">
          <MdCheckCircle />
          <span>{success}</span>
          <button
            onClick={() => setSuccess("")}
            className="btn btn-ghost btn-xs"
          >
            <MdClear />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="tabs tabs-boxed mb-6 bg-base-200">
        <button
          className={`tab tab-lg ${
            activeTab === "dashboard" ? "tab-active" : ""
          }`}
          onClick={() => setActiveTab("dashboard")}
        >
          <MdAnalytics className="w-4 h-4 mr-2" />
          Dashboard
        </button>
        <button
          className={`tab tab-lg ${activeTab === "list" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("list")}
        >
          <MdViewList className="w-4 h-4 mr-2" />
          Questions ({filteredQuestions.length})
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="stat bg-base-200 rounded-lg p-4">
              <div className="stat-figure text-primary">
                <MdQuiz className="w-8 h-8" />
              </div>
              <div className="stat-title">Total Questions</div>
              <div className="stat-value text-primary">{stats.total}</div>
            </div>
            <div className="stat bg-base-200 rounded-lg p-4">
              <div className="stat-figure text-secondary">
                <MdSchedule className="w-8 h-8" />
              </div>
              <div className="stat-title">This Week</div>
              <div className="stat-value text-secondary">
                {stats.recentlyAdded}
              </div>
            </div>
            <div className="stat bg-base-200 rounded-lg p-4">
              <div className="stat-figure text-accent">
                <MdBookmark className="w-8 h-8" />
              </div>
              <div className="stat-title">Subjects</div>
              <div className="stat-value text-accent">
                {stats.bySubject.filter((s) => s.count > 0).length}
              </div>
            </div>
            <div className="stat bg-base-200 rounded-lg p-4">
              <div className="stat-figure text-info">
                <MdBarChart className="w-8 h-8" />
              </div>
              <div className="stat-title">Bloom Levels</div>
              <div className="stat-value text-info">
                {stats.byBloom.filter((b) => b.count > 0).length}
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subject Distribution */}
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h3 className="card-title">Questions by Subject</h3>
                <div className="space-y-2">
                  {stats.bySubject
                    .filter((s) => s.count > 0)
                    .map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between p-2 bg-base-200 rounded"
                      >
                        <span className="text-sm">{item.name}</span>
                        <span className="badge badge-primary">
                          {item.count}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Bloom's Taxonomy Distribution */}
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h3 className="card-title">Bloom's Taxonomy Levels</h3>
                <div className="space-y-2">
                  {stats.byBloom
                    .filter((b) => b.count > 0)
                    .map((item) => (
                      <div key={item.name} className="flex items-center gap-3">
                        <span className="w-20 text-xs">{item.name}</span>
                        <div className="flex-1 bg-base-300 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-secondary transition-all duration-300"
                            style={{
                              width: `${(item.count / stats.total) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <span className="w-8 text-xs text-right">
                          {item.count}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Questions */}
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h3 className="card-title">Recent Questions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {questions.slice(0, 6).map((question) => (
                  <div
                    key={question._id}
                    className="card bg-base-200 shadow-sm"
                  >
                    <div className="card-body p-4">
                      <h4 className="font-medium text-sm line-clamp-2 mb-2">
                        {question.questionText}
                      </h4>
                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className="badge badge-xs badge-outline">
                          {question.subject
                            ? question.subject.subject
                            : "No Subject"}
                        </span>
                        <span
                          className="badge badge-xs text-white"
                          style={{
                            backgroundColor: getBloomColor(
                              question.bloomsLevel
                            ),
                          }}
                        >
                          {question.bloomsLevel}
                        </span>
                        {question.difficulty && (
                          <span
                            className={`badge badge-xs ${getDifficultyColor(
                              question.difficulty
                            )}`}
                          >
                            {question.difficulty}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-base-content/70 line-clamp-1">
                        {question.choices?.length || 0} choices
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Questions List Tab */}
      {activeTab === "list" && (
        <div className="space-y-4">
          {/* Search and Filter Bar */}
          <div className="card bg-base-100 shadow">
            <div className="card-body p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="form-control">
                    <div className="input-group">
                      <input
                        type="text"
                        className="input input-bordered flex-1"
                        placeholder="Search questions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <button className="btn btn-square">
                        <MdSearch className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <select
                    className="select select-bordered select-sm"
                    value={filterSubject}
                    onChange={(e) => setFilterSubject(e.target.value)}
                  >
                    <option value="">All Subjects</option>
                    {subjects.map((subject) => (
                      <option key={subject._id} value={subject.subject}>
                        {subject.subject}
                      </option>
                    ))}
                  </select>

                  <select
                    className="select select-bordered select-sm"
                    value={filterBloom}
                    onChange={(e) => setFilterBloom(e.target.value)}
                  >
                    <option value="">All Bloom Levels</option>
                    {BLOOMS_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>

                  <select
                    className="select select-bordered select-sm"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <select
                    className="select select-bordered select-sm"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={12}>12 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                    <option value={200}>200 per page</option>
                    <option value={1000}>All questions</option>
                  </select>

                  <button
                    className="btn btn-outline btn-sm"
                    onClick={clearFilters}
                  >
                    <MdClear className="w-4 h-4" />
                    Clear
                  </button>

                  <div className="btn-group">
                    <button
                      className={`btn btn-sm ${
                        viewMode === "grid" ? "btn-active" : ""
                      }`}
                      onClick={() => setViewMode("grid")}
                    >
                      <MdGridView className="w-4 h-4" />
                    </button>
                    <button
                      className={`btn btn-sm ${
                        viewMode === "table" ? "btn-active" : ""
                      }`}
                      onClick={() => setViewMode("table")}
                    >
                      <MdViewList className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedQuestions.length > 0 && (
                <div className="mt-4 p-3 bg-base-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      {selectedQuestions.length} questions selected
                    </span>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-sm btn-error"
                        onClick={handleBulkDelete}
                      >
                        <MdDelete className="w-4 h-4" />
                        Delete Selected
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => setSelectedQuestions([])}
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Content Area */}
          {paginatedQuestions.length === 0 ? (
            <div className="text-center py-12">
              <MdQuiz className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
              <p className="text-base-content/60">No questions found</p>
              <button
                className="btn btn-primary mt-4"
                onClick={() => (window.location.href = "/admin/addquestions")}
              >
                Add First Question
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedQuestions.map((question) => (
                <div
                  key={question._id}
                  className="card bg-base-100 shadow hover:shadow-lg transition-shadow"
                >
                  <div className="card-body p-4">
                    <div className="flex items-start justify-between mb-3">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={selectedQuestions.includes(question._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedQuestions((prev) => [
                              ...prev,
                              question._id,
                            ]);
                          } else {
                            setSelectedQuestions((prev) =>
                              prev.filter((id) => id !== question._id)
                            );
                          }
                        }}
                      />
                      <div className="dropdown dropdown-end">
                        <label tabIndex={0} className="btn btn-ghost btn-xs">
                          ⋮
                        </label>
                        <ul
                          tabIndex={0}
                          className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52"
                        >
                          <li>
                            <a onClick={() => handleEditQuestion(question)}>
                              <MdEdit />
                              Edit
                            </a>
                          </li>
                          <li>
                            <a
                              onClick={() => handleDeleteQuestion(question._id)}
                            >
                              <MdDelete />
                              Delete
                            </a>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <h3 className="font-medium text-sm line-clamp-3 mb-3">
                      {question.questionText}
                    </h3>

                    <div className="flex flex-wrap gap-1 mb-3">
                      <span className="badge badge-xs badge-outline">
                        {question.subject
                          ? question.subject.subject
                          : "No Subject"}
                      </span>
                      <span
                        className="badge badge-xs text-white"
                        style={{
                          backgroundColor: getBloomColor(question.bloomsLevel),
                        }}
                      >
                        {question.bloomsLevel}
                      </span>
                      {question.difficulty && (
                        <span
                          className={`badge badge-xs ${getDifficultyColor(
                            question.difficulty
                          )}`}
                        >
                          {question.difficulty}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-base-content/60 mb-3">
                      {question.choices?.length || 0} choices • Correct:{" "}
                      {question.correctAnswer}
                    </div>

                    <button
                      className="btn btn-ghost btn-xs w-full"
                      onClick={() => toggleExpanded(question._id)}
                    >
                      {expandedQuestions.includes(question._id) ? (
                        <>
                          Hide Choices <MdExpandLess className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          Show Choices <MdExpandMore className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    {expandedQuestions.includes(question._id) && (
                      <div className="mt-3 pt-3 border-t border-base-300">
                        <div className="space-y-1">
                          {question.choices?.map((choice, idx) => (
                            <div
                              key={idx}
                              className={`text-xs p-2 rounded ${
                                choice === question.correctAnswer
                                  ? "bg-success/20 text-success-content font-medium"
                                  : "bg-base-200"
                              }`}
                            >
                              <span className="font-medium">
                                {String.fromCharCode(65 + idx)}:
                              </span>{" "}
                              {choice}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-1 mt-3">
                      <button
                        className="btn btn-primary btn-sm flex-1"
                        onClick={() => handleEditQuestion(question)}
                      >
                        <MdEdit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDeleteQuestion(question._id)}
                      >
                        <MdDelete className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card bg-base-100 shadow">
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={
                            selectedQuestions.length ===
                              paginatedQuestions.length &&
                            paginatedQuestions.length > 0
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedQuestions(
                                paginatedQuestions.map((q) => q._id)
                              );
                            } else {
                              setSelectedQuestions([]);
                            }
                          }}
                        />
                      </th>
                      <th>Question</th>
                      <th>Subject</th>
                      <th>Bloom's Level</th>
                      <th>Difficulty</th>
                      <th>Choices</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedQuestions.map((question) => (
                      <tr key={question._id}>
                        <td>
                          <input
                            type="checkbox"
                            className="checkbox"
                            checked={selectedQuestions.includes(question._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedQuestions((prev) => [
                                  ...prev,
                                  question._id,
                                ]);
                              } else {
                                setSelectedQuestions((prev) =>
                                  prev.filter((id) => id !== question._id)
                                );
                              }
                            }}
                          />
                        </td>
                        <td>
                          <div className="max-w-md">
                            <p className="font-medium line-clamp-2">
                              {question.questionText}
                            </p>
                            <p className="text-sm text-success font-medium">
                              ✓ {question.correctAnswer}
                            </p>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-outline">
                            {question.subject
                              ? question.subject.subject
                              : "No Subject"}
                          </span>
                        </td>
                        <td>
                          <span
                            className="badge text-white text-xs"
                            style={{
                              backgroundColor: getBloomColor(
                                question.bloomsLevel
                              ),
                            }}
                          >
                            {question.bloomsLevel}
                          </span>
                        </td>
                        <td>
                          {question.difficulty && (
                            <span
                              className={`badge ${getDifficultyColor(
                                question.difficulty
                              )}`}
                            >
                              {question.difficulty}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-ghost">
                            {question.choices?.length || 0} choices
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => handleEditQuestion(question)}
                              title="Edit"
                            >
                              <MdEdit className="w-4 h-4" />
                            </button>
                            <button
                              className="btn btn-ghost btn-xs text-error"
                              onClick={() => handleDeleteQuestion(question._id)}
                              title="Delete"
                            >
                              <MdDelete className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && itemsPerPage < 1000 && (
            <div className="flex justify-center mt-6">
              <div className="join">
                <button
                  className="join-item btn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span className="join-item btn btn-active">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="join-item btn"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingQuestion && (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <h3 className="font-bold text-lg mb-4">Edit Question</h3>

            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Question Text</span>
                </label>
                <textarea
                  className="textarea textarea-bordered min-h-[100px]"
                  value={editForm.questionText}
                  onChange={(e) =>
                    setEditForm({ ...editForm, questionText: e.target.value })
                  }
                  placeholder="Enter question text"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Subject</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={editForm.subject}
                    onChange={(e) =>
                      setEditForm({ ...editForm, subject: e.target.value })
                    }
                  >
                    {subjects.map((subject) => (
                      <option key={subject._id} value={subject.subject}>
                        {subject.subject}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">
                      Bloom's Level
                    </span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={editForm.bloomsLevel}
                    onChange={(e) =>
                      setEditForm({ ...editForm, bloomsLevel: e.target.value })
                    }
                  >
                    {BLOOMS_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Difficulty</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={editForm.difficulty}
                    onChange={(e) =>
                      setEditForm({ ...editForm, difficulty: e.target.value })
                    }
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Choices</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {editForm.choices?.map((choice, index) => (
                    <input
                      key={index}
                      type="text"
                      className="input input-bordered"
                      value={choice}
                      onChange={(e) => {
                        const newChoices = [...editForm.choices];
                        newChoices[index] = e.target.value;
                        setEditForm({ ...editForm, choices: newChoices });
                      }}
                      placeholder={`Choice ${String.fromCharCode(65 + index)}`}
                    />
                  ))}
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Correct Answer</span>
                </label>
                <select
                  className="select select-bordered"
                  value={editForm.correctAnswer}
                  onChange={(e) =>
                    setEditForm({ ...editForm, correctAnswer: e.target.value })
                  }
                >
                  {editForm.choices?.map((choice) => (
                    <option key={choice} value={choice}>
                      {choice}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-action">
              <button className="btn btn-primary" onClick={handleSaveEdit}>
                <MdSave className="w-4 h-4" />
                Save Changes
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setEditingQuestion(null);
                  setEditForm({});
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionList;

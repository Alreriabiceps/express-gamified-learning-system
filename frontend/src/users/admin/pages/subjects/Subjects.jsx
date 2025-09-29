// components/Subjects.js
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdSave,
  MdClose,
  MdAnalytics,
  MdViewList,
  MdSearch,
  MdFilterList,
  MdFileDownload,
  MdCheckBox,
  MdCheckBoxOutlineBlank,
  MdSelectAll,
  MdClear,
  MdInfo,
  MdCheckCircle,
  MdError,
  MdWarning,
  MdAutorenew,
  MdCloud,
  MdCloudDone,
  MdBookmark,
  MdQuiz,
  MdSchedule,
  MdBarChart,
} from "react-icons/md";
import { FaChartPie, FaHistory, FaUsers, FaBookOpen } from "react-icons/fa";
import { useGuideMode } from "../../../../contexts/GuideModeContext";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [newSubject, setNewSubject] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [editedSubjectName, setEditedSubjectName] = useState("");
  const { guideMode } = useGuideMode();

  // Enhanced state for modern features
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name"); // name, questions, created, updated
  const [sortOrder, setSortOrder] = useState("asc"); // asc, desc
  const [viewMode, setViewMode] = useState("grid"); // grid, table
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  // Remove unused state variables
  // const [subjectAnalytics, setSubjectAnalytics] = useState([]);
  const [questionsData, setQuestionsData] = useState([]);
  const [weeksData, setWeeksData] = useState([]);

  // Auto-save and validation states
  const [autoSaveStatus, setAutoSaveStatus] = useState("saved");
  const [lastSaved, setLastSaved] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  const backendurl =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
  const COLORS = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7c7c",
    "#8dd1e1",
    "#d084d0",
    "#ffb347",
    "#87ceeb",
  ];

  // Auto-save functionality
  const saveToLocalStorage = useCallback((data) => {
    try {
      localStorage.setItem(
        "subjects_state",
        JSON.stringify({
          ...data,
          timestamp: Date.now(),
        })
      );
      setLastSaved(new Date());
      setAutoSaveStatus("saved");
    } catch (error) {
      console.error("Failed to save state:", error);
    }
  }, []);

  // Subject validation
  const validateSubject = useCallback(
    (subjectName) => {
      const errors = [];

      if (!subjectName.trim()) {
        errors.push("Subject name is required");
      } else if (subjectName.trim().length < 2) {
        errors.push("Subject name must be at least 2 characters");
      } else if (subjectName.trim().length > 50) {
        errors.push("Subject name must be less than 50 characters");
      }

      if (
        subjects.some(
          (s) =>
            s.subject.toLowerCase() === subjectName.trim().toLowerCase() &&
            s._id !== editingSubject?._id
        )
      ) {
        errors.push("Subject with this name already exists");
      }

      // Check for inappropriate content (basic)
      const inappropriateWords = ["test", "dummy", "temp"];
      if (
        inappropriateWords.some((word) =>
          subjectName.toLowerCase().includes(word)
        )
      ) {
        errors.push("Subject name should be professional");
      }

      return errors;
    },
    [subjects, editingSubject]
  );

  // Enhanced data fetching
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        // Fetch subjects
        const subjectsRes = await fetch(`${backendurl}/api/subjects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!subjectsRes.ok) throw new Error("Failed to fetch subjects");
        const subjectsData = await subjectsRes.json();
        setSubjects(subjectsData);

        // Fetch questions for analytics
        const questionsRes = await fetch(`${backendurl}/api/questions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (questionsRes.ok) {
          const questionsData = await questionsRes.json();
          setQuestionsData(questionsData);
        }

        // Fetch weeks data for analytics
        const weeksRes = await fetch(`${backendurl}/api/weeks`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (weeksRes.ok) {
          const weeksData = await weeksRes.json();
          setWeeksData(weeksData);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError(`Failed to fetch data: ${err.message}`);
        if (
          err.message.includes("token") ||
          err.message.includes("authentication")
        ) {
          window.location.href = "/admin/login";
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [backendurl]);

  // Auto-clear messages
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Enhanced statistics calculation
  const stats = useMemo(() => {
    const totalSubjects = subjects.length;
    const questionsPerSubject = subjects.map((subject) => ({
      name: subject.subject,
      count: questionsData.filter(
        (q) =>
          q.subject?._id === subject._id ||
          q.subject?.subject === subject.subject
      ).length,
      _id: subject._id,
    }));

    const weeksPerSubject = subjects.map((subject) => ({
      name: subject.subject,
      count: weeksData.filter(
        (w) =>
          w.subject?._id === subject._id ||
          w.subject?.subject === subject.subject
      ).length,
      _id: subject._id,
    }));

    const averageQuestions =
      totalSubjects > 0
        ? questionsPerSubject.reduce((sum, s) => sum + s.count, 0) /
          totalSubjects
        : 0;

    const recentlyAdded = subjects.filter((s) => {
      const addedDate = new Date(s.createdAt || Date.now());
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return addedDate > weekAgo;
    }).length;

    return {
      total: totalSubjects,
      questionsPerSubject: questionsPerSubject.sort(
        (a, b) => b.count - a.count
      ),
      weeksPerSubject: weeksPerSubject.sort((a, b) => b.count - a.count),
      averageQuestions: Math.round(averageQuestions),
      recentlyAdded,
      totalQuestions: questionsData.length,
      totalWeeks: weeksData.length,
      mostActiveSubject:
        questionsPerSubject.length > 0 ? questionsPerSubject[0] : null,
      subjectUtilization: questionsPerSubject.filter((s) => s.count > 0).length,
    };
  }, [subjects, questionsData, weeksData]);

  // Enhanced filtering and sorting
  const filteredAndSortedSubjects = useMemo(() => {
    let filtered = subjects.filter((subject) =>
      subject.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Add question counts to subjects for sorting
    filtered = filtered.map((subject) => ({
      ...subject,
      questionCount: questionsData.filter(
        (q) =>
          q.subject?._id === subject._id ||
          q.subject?.subject === subject.subject
      ).length,
      weekCount: weeksData.filter(
        (w) =>
          w.subject?._id === subject._id ||
          w.subject?.subject === subject.subject
      ).length,
    }));

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case "name":
          aVal = a.subject.toLowerCase();
          bVal = b.subject.toLowerCase();
          break;
        case "questions":
          aVal = a.questionCount;
          bVal = b.questionCount;
          break;
        case "weeks":
          aVal = a.weekCount;
          bVal = b.weekCount;
          break;
        case "created":
          aVal = new Date(a.createdAt || 0);
          bVal = new Date(b.createdAt || 0);
          break;
        default:
          aVal = a.subject.toLowerCase();
          bVal = b.subject.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [subjects, searchTerm, sortBy, sortOrder, questionsData, weeksData]);

  // Enhanced add subject with validation
  const handleAddSubject = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const trimmedSubject = newSubject.trim();
    const errors = validateSubject(trimmedSubject);

    if (errors.length > 0) {
      setError(errors.join(". "));
      return;
    }

    setLoading(true);
    setAutoSaveStatus("saving");

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");

      const res = await fetch(`${backendurl}/api/subjects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subject: trimmedSubject }),
      });

      const result = await res.json();
      if (!res.ok)
        throw new Error(
          result.message || `Failed to add subject. Status: ${res.status}`
        );

      setSubjects((prev) =>
        [...prev, result].sort((a, b) => a.subject.localeCompare(b.subject))
      );
      setNewSubject("");
      setSuccess(`Subject "${result.subject}" added successfully!`);
      setAutoSaveStatus("saved");

      // Auto-save state
      saveToLocalStorage({ subjects: [...subjects, result] });

      document.getElementById("add-subject-modal").close();
    } catch (err) {
      console.error("Error adding subject:", err);
      setError(`Error adding subject: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Bulk operations
  const handleSelectAll = () => {
    if (selectedSubjects.length === filteredAndSortedSubjects.length) {
      setSelectedSubjects([]);
    } else {
      setSelectedSubjects(filteredAndSortedSubjects.map((s) => s._id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSubjects.length === 0) return;

    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedSubjects.length} subjects? This action cannot be undone.`
      )
    ) {
      return;
    }

    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const subjectId of selectedSubjects) {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${backendurl}/api/subjects/${subjectId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (err) {
        errorCount++;
        console.error("Error deleting subject:", err);
      }
    }

    // Update local state
    setSubjects((prev) =>
      prev.filter((s) => !selectedSubjects.includes(s._id))
    );
    setSelectedSubjects([]);

    if (successCount > 0) {
      setSuccess(`Successfully deleted ${successCount} subjects`);
    }
    if (errorCount > 0) {
      setError(`Failed to delete ${errorCount} subjects`);
    }

    setLoading(false);
  };

  // Enhanced delete with analytics check
  const handleDeleteSubject = async (id, subjectName) => {
    const subject = subjects.find((s) => s._id === id);
    if (!subject) return;

    const questionCount = questionsData.filter(
      (q) => q.subject?._id === id || q.subject?.subject === subjectName
    ).length;

    const weekCount = weeksData.filter(
      (w) => w.subject?._id === id || w.subject?.subject === subjectName
    ).length;

    let confirmMessage = `Are you sure you want to delete the subject "${subjectName}"?`;
    if (questionCount > 0 || weekCount > 0) {
      confirmMessage += `\n\nThis will affect:\n- ${questionCount} questions\n- ${weekCount} weeks\n\nThis action cannot be undone.`;
    }

    if (!window.confirm(confirmMessage)) return;

    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${backendurl}/api/subjects/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete subject");
      }

      setSubjects((prev) => prev.filter((subject) => subject._id !== id));
      setSuccess(`Subject "${subjectName}" deleted successfully!`);

      // Auto-save state
      saveToLocalStorage({ subjects: subjects.filter((s) => s._id !== id) });
    } catch (err) {
      console.error("Error deleting subject:", err);
      setError(`Error deleting subject: ${err.message}`);
    }
  };

  // Enhanced update with validation
  const handleUpdateSubject = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const trimmedEditedName = editedSubjectName.trim();
    const errors = validateSubject(trimmedEditedName);

    if (errors.length > 0) {
      setValidationErrors({ [editingSubject._id]: errors });
      setError(errors.join(". "));
      return;
    }

    if (editingSubject && trimmedEditedName === editingSubject.subject) {
      setEditingSubject(null);
      setEditedSubjectName("");
      setValidationErrors({});
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${backendurl}/api/subjects/${editingSubject._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ subject: trimmedEditedName }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          errorData.message || `Failed to update subject. Status: ${res.status}`
        );
      }

      const updatedSubject = await res.json();
      setSubjects((prevSubjects) => {
        const updatedSubjects = prevSubjects.map((subject) =>
          subject._id === updatedSubject._id ? updatedSubject : subject
        );
        return updatedSubjects.sort((a, b) =>
          a.subject.localeCompare(b.subject)
        );
      });

      setEditingSubject(null);
      setEditedSubjectName("");
      setValidationErrors({});
      setSuccess(
        `Subject updated to "${updatedSubject.subject}" successfully!`
      );

      // Auto-save state
      saveToLocalStorage({
        subjects: subjects.map((s) =>
          s._id === updatedSubject._id ? updatedSubject : s
        ),
      });
    } catch (err) {
      console.error("Error updating subject:", err);
      setError(`Error updating subject: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubject = (subject) => {
    setEditingSubject(subject);
    setEditedSubjectName(subject.subject);
    setError("");
    setSuccess("");
    setValidationErrors({});
  };

  const handleCancelEdit = () => {
    setEditingSubject(null);
    setEditedSubjectName("");
    setError("");
    setValidationErrors({});
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-2 text-base-content/70">
            Loading subjects dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-primary">
            Subject Management
          </h1>
          <p className="text-base-content/70">
            Manage subjects and analyze their usage across the system
          </p>

          {/* Auto-save Status */}
          <div className="flex items-center gap-2 mt-2">
            {autoSaveStatus === "saving" && (
              <div className="flex items-center gap-1 text-warning">
                <MdAutorenew className="w-4 h-4 animate-spin" />
                <span className="text-xs">Saving...</span>
              </div>
            )}
            {autoSaveStatus === "saved" && lastSaved && (
              <div className="flex items-center gap-1 text-success">
                <MdCloudDone className="w-4 h-4" />
                <span className="text-xs">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-primary btn-sm"
            onClick={() =>
              document.getElementById("add-subject-modal").showModal()
            }
          >
            <MdAdd className="w-4 h-4" />
            Add Subject
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
            <h4 className="font-semibold">Subject Management Guide</h4>
            <p className="text-sm">
              Use the dashboard to monitor subject usage, manage subjects
              efficiently with bulk operations, and analyze data distribution.
            </p>
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="alert alert-error mb-4">
          <MdError />
          <span className="whitespace-pre-line">{error}</span>
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
          className={`tab tab-lg ${activeTab === "manage" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("manage")}
        >
          <MdViewList className="w-4 h-4 mr-2" />
          Manage Subjects ({filteredAndSortedSubjects.length})
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="stat bg-base-200 rounded-lg p-4">
              <div className="stat-figure text-primary">
                <FaBookOpen className="w-8 h-8" />
              </div>
              <div className="stat-title">Total Subjects</div>
              <div className="stat-value text-primary">{stats.total}</div>
              <div className="stat-desc">
                {stats.subjectUtilization} with questions
              </div>
            </div>
            <div className="stat bg-base-200 rounded-lg p-4">
              <div className="stat-figure text-secondary">
                <MdQuiz className="w-8 h-8" />
              </div>
              <div className="stat-title">Total Questions</div>
              <div className="stat-value text-secondary">
                {stats.totalQuestions}
              </div>
              <div className="stat-desc">
                Avg {stats.averageQuestions} per subject
              </div>
            </div>
            <div className="stat bg-base-200 rounded-lg p-4">
              <div className="stat-figure text-accent">
                <MdSchedule className="w-8 h-8" />
              </div>
              <div className="stat-title">Total Weeks</div>
              <div className="stat-value text-accent">{stats.totalWeeks}</div>
              <div className="stat-desc">Weekly schedules</div>
            </div>
            <div className="stat bg-base-200 rounded-lg p-4">
              <div className="stat-figure text-info">
                <FaHistory className="w-8 h-8" />
              </div>
              <div className="stat-title">Recent</div>
              <div className="stat-value text-info">{stats.recentlyAdded}</div>
              <div className="stat-desc">Added this week</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Questions Distribution */}
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h3 className="card-title">Questions per Subject</h3>
                {stats.questionsPerSubject.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.questionsPerSubject.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        fontSize={12}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-base-content/50">
                    No questions data available
                  </div>
                )}
              </div>
            </div>

            {/* Subject Usage Pie Chart */}
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h3 className="card-title">Subject Usage Distribution</h3>
                {stats.questionsPerSubject.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.questionsPerSubject.slice(0, 6)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${
                            name.length > 10
                              ? name.substring(0, 10) + "..."
                              : name
                          } ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {stats.questionsPerSubject
                          .slice(0, 6)
                          .map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-base-content/50">
                    No usage data available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top Performing Subjects */}
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h3 className="card-title">Top Performing Subjects</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.questionsPerSubject.slice(0, 6).map((subject, index) => (
                  <div key={subject._id} className="card bg-base-200 shadow-sm">
                    <div className="card-body p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={`badge ${
                            index === 0
                              ? "badge-primary"
                              : index === 1
                              ? "badge-secondary"
                              : "badge-accent"
                          }`}
                        >
                          #{index + 1}
                        </div>
                        <h4 className="font-medium text-sm">{subject.name}</h4>
                      </div>
                      <div className="flex justify-between text-xs text-base-content/70">
                        <span>{subject.count} questions</span>
                        <span>
                          {stats.weeksPerSubject.find(
                            (w) => w._id === subject._id
                          )?.count || 0}{" "}
                          weeks
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Subjects Tab */}
      {activeTab === "manage" && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="card bg-base-100 shadow">
            <div className="card-body p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/50 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search subjects..."
                      className="input input-bordered w-full pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {showFilters && (
                  <div className="flex flex-wrap gap-2">
                    <select
                      className="select select-bordered select-sm"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="name">Sort by Name</option>
                      <option value="questions">Sort by Questions</option>
                      <option value="weeks">Sort by Weeks</option>
                      <option value="created">Sort by Created</option>
                    </select>

                    <select
                      className="select select-bordered select-sm"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                    >
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </select>

                    <div className="btn-group">
                      <button
                        className={`btn btn-sm ${
                          viewMode === "grid" ? "btn-active" : ""
                        }`}
                        onClick={() => setViewMode("grid")}
                      >
                        Grid
                      </button>
                      <button
                        className={`btn btn-sm ${
                          viewMode === "table" ? "btn-active" : ""
                        }`}
                        onClick={() => setViewMode("table")}
                      >
                        Table
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bulk Operations */}
          {selectedSubjects.length > 0 && (
            <div className="card bg-warning/10 border border-warning/20">
              <div className="card-body p-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-2">
                    <MdCheckCircle className="w-5 h-5 text-warning" />
                    <span className="font-medium">
                      {selectedSubjects.length} subjects selected
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setSelectedSubjects([])}
                    >
                      Clear Selection
                    </button>
                    <button
                      className="btn btn-error btn-sm"
                      onClick={handleBulkDelete}
                    >
                      <MdDelete className="w-4 h-4" />
                      Delete Selected
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Grid View */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSortedSubjects.map((subject) => (
                <div
                  key={subject._id}
                  className={`card bg-base-200 shadow hover:shadow-lg transition-all cursor-pointer ${
                    selectedSubjects.includes(subject._id)
                      ? "ring-2 ring-primary"
                      : ""
                  }`}
                >
                  <div className="card-body p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          checked={selectedSubjects.includes(subject._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSubjects([
                                ...selectedSubjects,
                                subject._id,
                              ]);
                            } else {
                              setSelectedSubjects(
                                selectedSubjects.filter(
                                  (id) => id !== subject._id
                                )
                              );
                            }
                          }}
                        />
                        <h3 className="font-medium text-sm line-clamp-2">
                          {subject.subject}
                        </h3>
                      </div>

                      <div className="dropdown dropdown-end">
                        <label tabIndex={0} className="btn btn-ghost btn-xs">
                          ⋮
                        </label>
                        <ul
                          tabIndex={0}
                          className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52"
                        >
                          <li>
                            <button onClick={() => handleEditSubject(subject)}>
                              <MdEdit className="w-4 h-4" />
                              Edit
                            </button>
                          </li>
                          <li>
                            <button
                              className="text-error"
                              onClick={() =>
                                handleDeleteSubject(
                                  subject._id,
                                  subject.subject
                                )
                              }
                            >
                              <MdDelete className="w-4 h-4" />
                              Delete
                            </button>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      <div className="badge badge-primary badge-sm">
                        {subject.questionCount} questions
                      </div>
                      <div className="badge badge-secondary badge-sm">
                        {subject.weekCount} weeks
                      </div>
                    </div>

                    <div className="text-xs text-base-content/60">
                      Created:{" "}
                      {subject.createdAt
                        ? new Date(subject.createdAt).toLocaleDateString()
                        : "Unknown"}
                    </div>

                    {validationErrors[subject._id] && (
                      <div className="alert alert-error py-1 mt-2">
                        <MdError className="w-4 h-4" />
                        <span className="text-xs">
                          {validationErrors[subject._id].join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Table View */}
          {viewMode === "table" && (
            <div className="card bg-base-100 shadow">
              <div className="card-body p-0">
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead>
                      <tr>
                        <th>
                          <label>
                            <input
                              type="checkbox"
                              className="checkbox"
                              checked={
                                selectedSubjects.length ===
                                  filteredAndSortedSubjects.length &&
                                filteredAndSortedSubjects.length > 0
                              }
                              onChange={handleSelectAll}
                            />
                          </label>
                        </th>
                        <th>Subject Name</th>
                        <th>Questions</th>
                        <th>Weeks</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedSubjects.map((subject) => (
                        <tr key={subject._id}>
                          <th>
                            <label>
                              <input
                                type="checkbox"
                                className="checkbox"
                                checked={selectedSubjects.includes(subject._id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSubjects([
                                      ...selectedSubjects,
                                      subject._id,
                                    ]);
                                  } else {
                                    setSelectedSubjects(
                                      selectedSubjects.filter(
                                        (id) => id !== subject._id
                                      )
                                    );
                                  }
                                }}
                              />
                            </label>
                          </th>
                          <td>
                            {editingSubject?._id === subject._id ? (
                              <form
                                onSubmit={handleUpdateSubject}
                                className="flex gap-2"
                              >
                                <input
                                  type="text"
                                  value={editedSubjectName}
                                  onChange={(e) =>
                                    setEditedSubjectName(e.target.value)
                                  }
                                  className="input input-bordered input-sm w-full"
                                  placeholder="Enter subject name"
                                />
                                <button
                                  type="submit"
                                  className="btn btn-primary btn-sm"
                                >
                                  <MdSave className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEdit}
                                  className="btn btn-ghost btn-sm"
                                >
                                  <MdClose className="w-4 h-4" />
                                </button>
                              </form>
                            ) : (
                              <div className="font-medium">
                                {subject.subject}
                              </div>
                            )}
                            {validationErrors[subject._id] && (
                              <div className="text-error text-xs mt-1">
                                {validationErrors[subject._id].join(", ")}
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="badge badge-primary">
                              {subject.questionCount}
                            </div>
                          </td>
                          <td>
                            <div className="badge badge-secondary">
                              {subject.weekCount}
                            </div>
                          </td>
                          <td>
                            <div className="text-sm text-base-content/70">
                              {subject.createdAt
                                ? new Date(
                                    subject.createdAt
                                  ).toLocaleDateString()
                                : "Unknown"}
                            </div>
                          </td>
                          <td>
                            {editingSubject?._id !== subject._id && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditSubject(subject)}
                                  className="btn btn-ghost btn-sm"
                                >
                                  <MdEdit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteSubject(
                                      subject._id,
                                      subject.subject
                                    )
                                  }
                                  className="btn btn-ghost btn-sm text-error"
                                >
                                  <MdDelete className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {filteredAndSortedSubjects.length === 0 && (
            <div className="text-center py-12">
              <FaBookOpen className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
              <h3 className="text-lg font-medium text-base-content/70 mb-2">
                No subjects found
              </h3>
              <p className="text-base-content/50 mb-4">
                {searchTerm
                  ? `No subjects match "${searchTerm}"`
                  : "Get started by adding your first subject"}
              </p>
              <button
                className="btn btn-primary"
                onClick={() =>
                  document.getElementById("add-subject-modal").showModal()
                }
              >
                <MdAdd className="w-4 h-4" />
                Add Subject
              </button>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Add Subject Modal */}
      <dialog id="add-subject-modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Add New Subject</h3>
          <form onSubmit={handleAddSubject}>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Subject Name</span>
              </label>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="input input-bordered w-full"
                placeholder="Enter subject name (e.g., Mathematics, Computer Science)"
                maxLength={50}
              />
              <div className="label">
                <span className="label-text-alt text-base-content/60">
                  {newSubject.length}/50 characters
                </span>
              </div>

              {/* Real-time validation feedback */}
              {newSubject && (
                <div className="mt-2">
                  {validateSubject(newSubject).length === 0 ? (
                    <div className="flex items-center gap-1 text-success text-sm">
                      <MdCheckCircle className="w-4 h-4" />
                      Valid subject name
                    </div>
                  ) : (
                    <div className="text-error text-sm">
                      <ul className="list-disc list-inside">
                        {validateSubject(newSubject).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-action">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || validateSubject(newSubject).length > 0}
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Adding...
                  </>
                ) : (
                  <>
                    <MdAdd className="w-4 h-4" />
                    Add Subject
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  document.getElementById("add-subject-modal").close();
                  setNewSubject("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
};

export default Subjects;

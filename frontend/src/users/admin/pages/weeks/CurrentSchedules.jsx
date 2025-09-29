import { useState, useEffect, useMemo, useCallback } from "react";
import {
  MdEdit,
  MdDelete,
  MdSave,
  MdClose,
  MdCheck,
  MdClose as MdCloseIcon,
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
  MdCalendarToday,
  MdPlayArrow,
  MdPause,
  MdVisibility,
} from "react-icons/md";
import {
  FaChartPie,
  FaHistory,
  FaCalendarAlt,
  FaClock,
  FaChartLine,
} from "react-icons/fa";
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
  Area,
  AreaChart,
} from "recharts";

const CurrentSchedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [editWeekNumber, setEditWeekNumber] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editQuestions, setEditQuestions] = useState([]);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [questionsPerPage] = useState(5);
  const { guideMode } = useGuideMode();

  // Enhanced state for modern features
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, active, inactive
  const [sortBy, setSortBy] = useState("week"); // week, subject, questions, created
  const [sortOrder, setSortOrder] = useState("asc");
  const [viewMode, setViewMode] = useState("grid");
  const [selectedSchedules, setSelectedSchedules] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const [dateRange, setDateRange] = useState("all");

  // Auto-save and analytics states
  const [autoSaveStatus, setAutoSaveStatus] = useState("saved");
  const [lastSaved, setLastSaved] = useState(null);
  const [questionsData, setQuestionsData] = useState([]);
  const [scheduleHistory, setScheduleHistory] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);

  const backendurl = import.meta.env.VITE_BACKEND_URL;
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
        "schedules_state",
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

  // Enhanced statistics calculation
  const stats = useMemo(() => {
    const totalSchedules = schedules.length;
    const activeSchedules = schedules.filter((s) => s.isActive).length;
    const inactiveSchedules = totalSchedules - activeSchedules;

    // Questions distribution
    const totalQuestions = schedules.reduce(
      (sum, s) => sum + (s.questionIds?.length || 0),
      0
    );
    const avgQuestionsPerSchedule =
      totalSchedules > 0 ? Math.round(totalQuestions / totalSchedules) : 0;

    // Subject distribution
    const subjectStats = subjects.map((subject) => ({
      name: subject.subject,
      count: schedules.filter((s) => s.subjectId?._id === subject._id).length,
      active: schedules.filter(
        (s) => s.subjectId?._id === subject._id && s.isActive
      ).length,
      _id: subject._id,
    }));

    // Weekly distribution
    const weeklyStats = [];
    for (let week = 1; week <= 52; week++) {
      const weekSchedules = schedules.filter((s) => s.weekNumber === week);
      if (weekSchedules.length > 0) {
        weeklyStats.push({
          week: `Week ${week}`,
          total: weekSchedules.length,
          active: weekSchedules.filter((s) => s.isActive).length,
          questions: weekSchedules.reduce(
            (sum, s) => sum + (s.questionIds?.length || 0),
            0
          ),
        });
      }
    }

    // Recent activity
    const recentlyCreated = schedules.filter((s) => {
      const createdDate = new Date(s.createdAt || Date.now());
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return createdDate > weekAgo;
    }).length;

    return {
      total: totalSchedules,
      active: activeSchedules,
      inactive: inactiveSchedules,
      activationRate:
        totalSchedules > 0
          ? Math.round((activeSchedules / totalSchedules) * 100)
          : 0,
      totalQuestions,
      avgQuestionsPerSchedule,
      subjectStats: subjectStats.sort((a, b) => b.count - a.count),
      weeklyStats: weeklyStats.slice(0, 10), // Top 10 weeks
      recentlyCreated,
      mostActiveSubject: subjectStats.length > 0 ? subjectStats[0] : null,
    };
  }, [schedules, subjects]);

  // Fetch schedules and subjects
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        // Fetch schedules
        const schedulesRes = await fetch(`${backendurl}/api/weeks`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!schedulesRes.ok) throw new Error("Failed to fetch schedules");
        const schedulesData = await schedulesRes.json();
        setSchedules(Array.isArray(schedulesData) ? schedulesData : []);

        // Fetch subjects
        const subjectsRes = await fetch(`${backendurl}/api/subjects`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
      } catch (err) {
        console.error("Failed to fetch data", err);
        setError("Failed to load data");
        if (
          err.message.includes("token") ||
          err.message.includes("authentication")
        ) {
          window.location.href = "/admin/login";
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [backendurl]);

  // Fetch questions when editing
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!editSubject) {
        setAvailableQuestions([]);
        return;
      }

      try {
        const res = await fetch(`${backendurl}/api/questions/${editSubject}`);
        if (!res.ok) throw new Error("Failed to fetch questions");
        const data = await res.json();
        setAvailableQuestions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch questions", err);
        setError("Failed to load questions");
      }
    };

    fetchQuestions();
  }, [editSubject, backendurl]);

  // Enhanced filtering and sorting
  const filteredAndSortedSchedules = useMemo(() => {
    let filtered = schedules.filter((schedule) => {
      const weekMatch =
        !selectedWeek || schedule.weekNumber === parseInt(selectedWeek);
      const subjectMatch =
        !selectedSubject || schedule.subjectId?._id === selectedSubject;
      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "active" && schedule.isActive) ||
        (statusFilter === "inactive" && !schedule.isActive);
      const searchMatch =
        !searchTerm ||
        schedule.subjectId?.subject
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        schedule.weekNumber.toString().includes(searchTerm);

      return weekMatch && subjectMatch && statusMatch && searchMatch;
    });

    // Add computed fields for sorting
    filtered = filtered.map((schedule) => ({
      ...schedule,
      questionCount: schedule.questionIds?.length || 0,
      subjectName: schedule.subjectId?.subject || "Unknown",
    }));

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case "week":
          aVal = a.weekNumber;
          bVal = b.weekNumber;
          break;
        case "subject":
          aVal = a.subjectName.toLowerCase();
          bVal = b.subjectName.toLowerCase();
          break;
        case "questions":
          aVal = a.questionCount;
          bVal = b.questionCount;
          break;
        case "created":
          aVal = new Date(a.createdAt || 0);
          bVal = new Date(b.createdAt || 0);
          break;
        case "status":
          aVal = a.isActive ? 1 : 0;
          bVal = b.isActive ? 1 : 0;
          break;
        default:
          aVal = a.weekNumber;
          bVal = b.weekNumber;
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [
    schedules,
    selectedWeek,
    selectedSubject,
    statusFilter,
    searchTerm,
    sortBy,
    sortOrder,
  ]);

  // Backwards compatibility
  const filteredSchedules = filteredAndSortedSchedules;

  // Group filtered schedules by week
  const schedulesByWeek = filteredSchedules.reduce((acc, schedule) => {
    const weekKey = `Week ${schedule.weekNumber}`;
    if (!acc[weekKey]) {
      acc[weekKey] = [];
    }
    acc[weekKey].push(schedule);
    return acc;
  }, {});

  // Bulk operations
  const handleSelectAll = () => {
    if (selectedSchedules.length === filteredAndSortedSchedules.length) {
      setSelectedSchedules([]);
    } else {
      setSelectedSchedules(filteredAndSortedSchedules.map((s) => s._id));
    }
  };

  const handleBulkToggleActive = async (makeActive = true) => {
    if (selectedSchedules.length === 0) return;

    setAutoSaveStatus("saving");
    let successCount = 0;
    let errorCount = 0;

    for (const scheduleId of selectedSchedules) {
      try {
        const token = localStorage.getItem("token");
        const schedule = schedules.find((s) => s._id === scheduleId);

        // Only toggle if needed
        if (schedule && schedule.isActive !== makeActive) {
          const res = await fetch(
            `${backendurl}/api/weeks/${scheduleId}/toggle-active`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (res.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        }
      } catch (err) {
        errorCount++;
        console.error("Error in bulk toggle:", err);
      }
    }

    // Refresh data
    if (successCount > 0) {
      const fetchData = async () => {
        try {
          const token = localStorage.getItem("token");
          const schedulesRes = await fetch(`${backendurl}/api/weeks`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (schedulesRes.ok) {
            const schedulesData = await schedulesRes.json();
            setSchedules(Array.isArray(schedulesData) ? schedulesData : []);
            saveToLocalStorage({ schedules: schedulesData });
          }
        } catch (err) {
          console.error("Failed to refresh data", err);
        }
      };
      fetchData();
      setSuccess(
        `Successfully ${
          makeActive ? "activated" : "deactivated"
        } ${successCount} schedules`
      );
    }

    if (errorCount > 0) {
      setError(`Failed to update ${errorCount} schedules`);
    }

    setSelectedSchedules([]);
    setAutoSaveStatus("saved");
  };

  const handleBulkDelete = async () => {
    if (selectedSchedules.length === 0) return;

    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedSchedules.length} schedules? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const scheduleId of selectedSchedules) {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${backendurl}/api/weeks/${scheduleId}`, {
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
        console.error("Error deleting schedule:", err);
      }
    }

    // Update local state
    setSchedules((prev) =>
      prev.filter((s) => !selectedSchedules.includes(s._id))
    );
    setSelectedSchedules([]);

    if (successCount > 0) {
      setSuccess(`Successfully deleted ${successCount} schedules`);
      saveToLocalStorage({
        schedules: schedules.filter((s) => !selectedSchedules.includes(s._id)),
      });
    }
    if (errorCount > 0) {
      setError(`Failed to delete ${errorCount} schedules`);
    }

    setIsLoading(false);
  };

  const handleToggleActive = async (scheduleId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const res = await fetch(
        `${backendurl}/api/weeks/${scheduleId}/toggle-active`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to toggle active status");
      }

      const updatedSchedule = await res.json();
      setSchedules((prev) => {
        const updated = prev.map((schedule) =>
          schedule._id === scheduleId ? updatedSchedule : schedule
        );
        saveToLocalStorage({ schedules: updated });
        return updated;
      });
      setSuccess("Schedule status updated successfully!");
    } catch (err) {
      console.error("Error toggling active status:", err);
      setError(err.message || "Failed to update schedule status");
      if (
        err.message.includes("token") ||
        err.message.includes("authentication")
      ) {
        window.location.href = "/admin/login";
      }
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm("Are you sure you want to delete this schedule?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const res = await fetch(`${backendurl}/api/weeks/${scheduleId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete schedule");
      }

      setSchedules((prev) =>
        prev.filter((schedule) => schedule._id !== scheduleId)
      );
      setSuccess("Schedule deleted successfully!");
    } catch (err) {
      console.error("Error deleting schedule:", err);
      if (
        err.message.includes("token") ||
        err.message.includes("authentication")
      ) {
        window.location.href = "/admin/login";
      } else {
        setError(err.message || "Failed to delete schedule. Please try again.");
      }
    }
  };

  const handleEditSchedule = (schedule) => {
    setSelectedSchedule(schedule);
    setEditWeekNumber(schedule.weekNumber.toString());
    setEditSubject(schedule.subjectId._id);
    setEditQuestions(schedule.questionIds.map((q) => q._id));
    setShowModal(true);
  };

  const handleUpdateSchedule = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!editSubject) {
      setError("Please select a subject");
      return;
    }

    if (editQuestions.length === 0) {
      setError("Please select at least one question");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const res = await fetch(
        `${backendurl}/api/weeks/${selectedSchedule._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            subject: editSubject,
            questions: editQuestions,
            weekNumber: parseInt(editWeekNumber),
            year: selectedSchedule.year,
          }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update schedule");
      }

      const updatedSchedule = await res.json();
      setSchedules((prev) =>
        prev.map((schedule) =>
          schedule._id === selectedSchedule._id ? updatedSchedule : schedule
        )
      );
      setSuccess("Schedule updated successfully!");
      setShowModal(false);
      setSelectedSchedule(null);
      setEditQuestions([]);
    } catch (err) {
      console.error("Error updating schedule:", err);
      setError(err.message || "Failed to update schedule");
      if (
        err.message.includes("token") ||
        err.message.includes("authentication")
      ) {
        window.location.href = "/admin/login";
      }
    }
  };

  const handleQuestionSelect = (questionId) => {
    setEditQuestions((prev) => {
      if (prev.includes(questionId)) {
        return prev.filter((id) => id !== questionId);
      } else {
        return [...prev, questionId];
      }
    });
  };

  // Pagination for questions in edit modal
  const indexOfLastQuestion = currentPage * questionsPerPage;
  const indexOfFirstQuestion = indexOfLastQuestion - questionsPerPage;
  const currentQuestions = availableQuestions.slice(
    indexOfFirstQuestion,
    indexOfLastQuestion
  );
  const totalPages = Math.ceil(availableQuestions.length / questionsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-2 text-base-content/70">
            Loading schedule dashboard...
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
            Schedule Management
          </h1>
          <p className="text-base-content/70">
            Manage weekly schedules and monitor system activity
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
            onClick={() => (window.location.href = "/admin/weeks/schedule")}
          >
            <MdCalendarToday className="w-4 h-4" />
            Create Schedule
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
            <h4 className="font-semibold">Schedule Management Guide</h4>
            <p className="text-sm">
              Use the dashboard to monitor schedule performance, manage
              schedules with bulk operations, and analyze weekly distribution
              patterns.
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
          Manage Schedules ({filteredAndSortedSchedules.length})
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="stat bg-base-200 rounded-lg p-4">
              <div className="stat-figure text-primary">
                <FaCalendarAlt className="w-8 h-8" />
              </div>
              <div className="stat-title">Total Schedules</div>
              <div className="stat-value text-primary">{stats.total}</div>
              <div className="stat-desc">{stats.activationRate}% active</div>
            </div>
            <div className="stat bg-base-200 rounded-lg p-4">
              <div className="stat-figure text-secondary">
                <MdPlayArrow className="w-8 h-8" />
              </div>
              <div className="stat-title">Active</div>
              <div className="stat-value text-secondary">{stats.active}</div>
              <div className="stat-desc">Currently running</div>
            </div>
            <div className="stat bg-base-200 rounded-lg p-4">
              <div className="stat-figure text-accent">
                <MdQuiz className="w-8 h-8" />
              </div>
              <div className="stat-title">Total Questions</div>
              <div className="stat-value text-accent">
                {stats.totalQuestions}
              </div>
              <div className="stat-desc">
                Avg {stats.avgQuestionsPerSchedule} per schedule
              </div>
            </div>
            <div className="stat bg-base-200 rounded-lg p-4">
              <div className="stat-figure text-info">
                <FaClock className="w-8 h-8" />
              </div>
              <div className="stat-title">Recent</div>
              <div className="stat-value text-info">
                {stats.recentlyCreated}
              </div>
              <div className="stat-desc">Added this week</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subject Distribution */}
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h3 className="card-title">Schedules by Subject</h3>
                {stats.subjectStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.subjectStats.slice(0, 8)}>
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
                      <Bar dataKey="count" fill="#8884d8" name="Total" />
                      <Bar dataKey="active" fill="#82ca9d" name="Active" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-base-content/50">
                    No schedule data available
                  </div>
                )}
              </div>
            </div>

            {/* Weekly Activity */}
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h3 className="card-title">Weekly Activity</h3>
                {stats.weeklyStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={stats.weeklyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" fontSize={12} />
                      <YAxis />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stackId="1"
                        stroke="#8884d8"
                        fill="#8884d8"
                        name="Total Schedules"
                      />
                      <Area
                        type="monotone"
                        dataKey="active"
                        stackId="2"
                        stroke="#82ca9d"
                        fill="#82ca9d"
                        name="Active Schedules"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-base-content/50">
                    No weekly data available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top Performing Subjects */}
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h3 className="card-title">Subject Performance</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.subjectStats.slice(0, 6).map((subject, index) => (
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
                        <span>{subject.count} total</span>
                        <span>{subject.active} active</span>
                      </div>
                      <div className="w-full bg-base-300 rounded-full h-2 mt-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${
                              subject.count > 0
                                ? (subject.active / subject.count) * 100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Schedules Tab */}
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
                      placeholder="Search schedules..."
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
                      value={selectedWeek}
                      onChange={(e) => setSelectedWeek(e.target.value)}
                    >
                      <option value="">All Weeks</option>
                      {[...Array(52)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          Week {i + 1}
                        </option>
                      ))}
                    </select>

                    <select
                      className="select select-bordered select-sm"
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                    >
                      <option value="">All Subjects</option>
                      {subjects.map((subject) => (
                        <option key={subject._id} value={subject._id}>
                          {subject.subject}
                        </option>
                      ))}
                    </select>

                    <select
                      className="select select-bordered select-sm"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>

                    <select
                      className="select select-bordered select-sm"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="week">Sort by Week</option>
                      <option value="subject">Sort by Subject</option>
                      <option value="questions">Sort by Questions</option>
                      <option value="status">Sort by Status</option>
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
          {selectedSchedules.length > 0 && (
            <div className="card bg-warning/10 border border-warning/20">
              <div className="card-body p-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-2">
                    <MdCheckCircle className="w-5 h-5 text-warning" />
                    <span className="font-medium">
                      {selectedSchedules.length} schedules selected
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setSelectedSchedules([])}
                    >
                      Clear Selection
                    </button>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleBulkToggleActive(true)}
                    >
                      <MdPlayArrow className="w-4 h-4" />
                      Activate Selected
                    </button>
                    <button
                      className="btn btn-warning btn-sm"
                      onClick={() => handleBulkToggleActive(false)}
                    >
                      <MdPause className="w-4 h-4" />
                      Deactivate Selected
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
              {filteredAndSortedSchedules.map((schedule) => (
                <div
                  key={schedule._id}
                  className={`card bg-base-200 shadow hover:shadow-lg transition-all cursor-pointer ${
                    selectedSchedules.includes(schedule._id)
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
                          checked={selectedSchedules.includes(schedule._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSchedules([
                                ...selectedSchedules,
                                schedule._id,
                              ]);
                            } else {
                              setSelectedSchedules(
                                selectedSchedules.filter(
                                  (id) => id !== schedule._id
                                )
                              );
                            }
                          }}
                        />
                        <div>
                          <h3 className="font-medium text-sm">
                            Week {schedule.weekNumber}
                          </h3>
                          <p className="text-xs text-base-content/70">
                            {schedule.subjectName}
                          </p>
                        </div>
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
                            <button
                              onClick={() => handleToggleActive(schedule._id)}
                            >
                              {schedule.isActive ? (
                                <MdPause className="w-4 h-4" />
                              ) : (
                                <MdPlayArrow className="w-4 h-4" />
                              )}
                              {schedule.isActive ? "Deactivate" : "Activate"}
                            </button>
                          </li>
                          <li>
                            <button
                              onClick={() => handleEditSchedule(schedule)}
                            >
                              <MdEdit className="w-4 h-4" />
                              Edit
                            </button>
                          </li>
                          <li>
                            <button
                              className="text-error"
                              onClick={() => handleDeleteSchedule(schedule._id)}
                            >
                              <MdDelete className="w-4 h-4" />
                              Delete
                            </button>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      <div
                        className={`badge badge-sm ${
                          schedule.isActive ? "badge-success" : "badge-error"
                        }`}
                      >
                        {schedule.isActive ? "Active" : "Inactive"}
                      </div>
                      <div className="badge badge-primary badge-sm">
                        {schedule.questionCount} questions
                      </div>
                    </div>

                    <div className="text-xs text-base-content/60">
                      Created:{" "}
                      {schedule.createdAt
                        ? new Date(schedule.createdAt).toLocaleDateString()
                        : "Unknown"}
                    </div>
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
                                selectedSchedules.length ===
                                  filteredAndSortedSchedules.length &&
                                filteredAndSortedSchedules.length > 0
                              }
                              onChange={handleSelectAll}
                            />
                          </label>
                        </th>
                        <th>Week</th>
                        <th>Subject</th>
                        <th>Questions</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedSchedules.map((schedule) => (
                        <tr key={schedule._id}>
                          <th>
                            <label>
                              <input
                                type="checkbox"
                                className="checkbox"
                                checked={selectedSchedules.includes(
                                  schedule._id
                                )}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSchedules([
                                      ...selectedSchedules,
                                      schedule._id,
                                    ]);
                                  } else {
                                    setSelectedSchedules(
                                      selectedSchedules.filter(
                                        (id) => id !== schedule._id
                                      )
                                    );
                                  }
                                }}
                              />
                            </label>
                          </th>
                          <td>
                            <div className="font-medium">
                              Week {schedule.weekNumber}
                            </div>
                          </td>
                          <td>
                            <div className="font-medium">
                              {schedule.subjectName}
                            </div>
                          </td>
                          <td>
                            <div className="badge badge-primary">
                              {schedule.questionCount}
                            </div>
                          </td>
                          <td>
                            <div
                              className={`badge ${
                                schedule.isActive
                                  ? "badge-success"
                                  : "badge-error"
                              }`}
                            >
                              {schedule.isActive ? "Active" : "Inactive"}
                            </div>
                          </td>
                          <td>
                            <div className="text-sm text-base-content/70">
                              {schedule.createdAt
                                ? new Date(
                                    schedule.createdAt
                                  ).toLocaleDateString()
                                : "Unknown"}
                            </div>
                          </td>
                          <td>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleToggleActive(schedule._id)}
                                className={`btn btn-sm ${
                                  schedule.isActive
                                    ? "btn-warning"
                                    : "btn-success"
                                }`}
                              >
                                {schedule.isActive ? (
                                  <MdPause className="w-4 h-4" />
                                ) : (
                                  <MdPlayArrow className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleEditSchedule(schedule)}
                                className="btn btn-ghost btn-sm"
                              >
                                <MdEdit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteSchedule(schedule._id)
                                }
                                className="btn btn-ghost btn-sm text-error"
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
            </div>
          )}

          {filteredAndSortedSchedules.length === 0 && (
            <div className="text-center py-12">
              <FaCalendarAlt className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
              <h3 className="text-lg font-medium text-base-content/70 mb-2">
                No schedules found
              </h3>
              <p className="text-base-content/50 mb-4">
                {searchTerm ||
                selectedWeek ||
                selectedSubject ||
                statusFilter !== "all"
                  ? "No schedules match your current filters"
                  : "Get started by creating your first schedule"}
              </p>
              <button
                className="btn btn-primary"
                onClick={() => (window.location.href = "/admin/weeks/schedule")}
              >
                <MdCalendarToday className="w-4 h-4" />
                Create Schedule
              </button>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Edit Modal */}
      <dialog
        id="edit-modal"
        className={`modal ${showModal ? "modal-open" : ""}`}
      >
        <div className="modal-box max-w-4xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-lg text-primary">Edit Schedule</h3>
              <p className="text-sm text-base-content/70">
                Modify schedule details and question assignments
              </p>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowModal(false)}
            >
              <MdClose className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleUpdateSchedule} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium flex items-center gap-2">
                    <MdCalendarToday className="w-4 h-4" />
                    Week Number
                  </span>
                </label>
                <input
                  type="number"
                  className="input input-bordered w-full bg-base-100"
                  value={editWeekNumber}
                  onChange={(e) => setEditWeekNumber(e.target.value)}
                  min="1"
                  max="52"
                  required
                  placeholder="1-52"
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/50">
                    Academic week number (1-52)
                  </span>
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium flex items-center gap-2">
                    <MdBookmark className="w-4 h-4" />
                    Subject
                  </span>
                </label>
                <select
                  className="select select-bordered w-full bg-base-100"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  required
                >
                  <option value="">-- Select a Subject --</option>
                  {subjects.map((subject) => (
                    <option key={subject._id} value={subject._id}>
                      {subject.subject}
                    </option>
                  ))}
                </select>
                <label className="label">
                  <span className="label-text-alt text-base-content/50">
                    Choose the subject for this week
                  </span>
                </label>
              </div>
            </div>
            <div className="form-control">
              <div className="flex items-center justify-between">
                <label className="label">
                  <span className="label-text font-medium flex items-center gap-2">
                    <MdQuiz className="w-4 h-4" />
                    Questions ({editQuestions.length} selected)
                  </span>
                </label>
                <div className="text-sm text-base-content/70">
                  {availableQuestions.length} available
                </div>
              </div>

              {editQuestions.length > 0 && (
                <div className="alert alert-info mb-3">
                  <MdInfo className="w-4 h-4" />
                  <span className="text-sm">
                    {editQuestions.length} questions selected for this weekly
                    test
                  </span>
                </div>
              )}

              <div className="bg-base-100 rounded-lg p-4 max-h-96 overflow-y-auto border">
                {currentQuestions.length > 0 ? (
                  <div className="space-y-3">
                    {currentQuestions.map((question) => (
                      <div
                        key={question._id}
                        className={`card bg-base-200 hover:bg-base-300 transition-colors ${
                          editQuestions.includes(question._id)
                            ? "ring-2 ring-primary"
                            : ""
                        }`}
                      >
                        <div className="card-body p-4">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              className="checkbox checkbox-primary mt-1"
                              checked={editQuestions.includes(question._id)}
                              onChange={() =>
                                handleQuestionSelect(question._id)
                              }
                            />
                            <div className="flex-1">
                              <p className="font-medium text-sm mb-2">
                                {question.questionText}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {question.choices &&
                                  question.choices.map((choice, index) => (
                                    <span
                                      key={index}
                                      className={`badge badge-sm ${
                                        choice === question.correctAnswer
                                          ? "badge-success"
                                          : "badge-outline"
                                      }`}
                                    >
                                      {choice}
                                      {choice === question.correctAnswer && (
                                        <MdCheck className="inline-block ml-1 w-3 h-3" />
                                      )}
                                    </span>
                                  ))}
                              </div>

                              {question.bloomsTaxonomy && (
                                <div className="mt-2">
                                  <span className="badge badge-accent badge-xs">
                                    {question.bloomsTaxonomy}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-base-content/50">
                    {editSubject
                      ? "No questions available for this subject"
                      : "Please select a subject first"}
                  </div>
                )}
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <div className="join">
                    {[...Array(totalPages)].map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        className={`join-item btn btn-sm ${
                          currentPage === index + 1 ? "btn-active" : ""
                        }`}
                        onClick={() => handlePageChange(index + 1)}
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowModal(false)}
              >
                <MdClose className="w-4 h-4" />
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!editSubject || editQuestions.length === 0}
              >
                <MdSave className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setShowModal(false)}>close</button>
        </form>
      </dialog>
    </div>
  );
};

export default CurrentSchedules;

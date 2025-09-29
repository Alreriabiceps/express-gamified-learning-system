import React, { useState, useEffect } from "react";
import {
  MdTrendingUp,
  MdPeople,
  MdQuiz,
  MdAssessment,
  MdFileDownload,
  MdDateRange,
  MdBarChart,
  MdPieChart,
  MdShowChart,
  MdAccessTime,
  MdGroup,
  MdInsights,
  MdSpeed,
} from "react-icons/md";
import { useAuth } from "../../../../contexts/AuthContext";
import { useGuideMode } from "../../../../contexts/GuideModeContext";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar, Pie, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Analytics = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState("30");
  const [analyticsData, setAnalyticsData] = useState({
    overview: {},
    students: {},
    questions: {},
    subjects: {},
    tests: {},
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { token } = useAuth();
  const { guideMode } = useGuideMode();

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  // Export functionality
  const exportData = (format) => {
    const exportableData = {
      overview: analyticsData.overview,
      students: analyticsData.students,
      questions: analyticsData.questions,
      subjects: analyticsData.subjects,
      tests: analyticsData.tests,
      game: analyticsData.game,
      generatedAt: new Date().toISOString(),
      dateRange: dateRange,
    };

    if (format === "json") {
      const dataStr = JSON.stringify(exportableData, null, 2);
      const dataUri =
        "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
      const exportFileDefaultName = `analytics_${dateRange}days_${
        new Date().toISOString().split("T")[0]
      }.json`;
      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", exportFileDefaultName);
      linkElement.click();
    } else if (format === "csv") {
      // Convert to CSV format
      let csv = "Metric,Value\\n";
      Object.entries(exportableData.overview || {}).forEach(([key, value]) => {
        csv += `${key},${value}\\n`;
      });

      const dataUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
      const exportFileDefaultName = `analytics_overview_${dateRange}days_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", exportFileDefaultName);
      linkElement.click();
    }
  };

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!token) return;

      setIsLoading(true);
      setError("");
      try {
        const response = await fetch(
          `${backendUrl}/api/admin/analytics?range=${dateRange}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch analytics data");
        }

        const data = await response.json();
        setAnalyticsData(data);
      } catch (err) {
        console.error("Error fetching analytics:", err);
        setError("Failed to load analytics data");
        // Enhanced error handling - still use real API structure but with fallbacks
        console.warn(
          "Analytics API failed, but continuing with partial data structure"
        );
        setAnalyticsData({
          overview: {},
          students: {},
          questions: {},
          subjects: {},
          tests: {},
          game: {},
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [token, dateRange, backendUrl]);

  // Chart configurations
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
      },
    },
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-base-200 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center h-64">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-base-200 rounded-lg shadow-lg p-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                <MdBarChart className="w-8 h-8" />
                Analytics & Reports
              </h1>
              <p className="text-base-content/70 mt-1">
                Comprehensive insights into your learning platform
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                className="select select-bordered select-sm bg-base-100"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 3 months</option>
                <option value="365">Last year</option>
              </select>
              <div className="dropdown dropdown-end">
                <button className="btn btn-outline btn-sm" tabIndex={0}>
                  <MdFileDownload className="w-4 h-4" />
                  Export
                </button>
                <ul className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-32">
                  <li>
                    <a onClick={() => exportData("csv")}>CSV</a>
                  </li>
                  <li>
                    <a onClick={() => exportData("json")}>JSON</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {guideMode && (
            <details className="mb-6 bg-info/10 border border-info rounded p-3">
              <summary className="cursor-pointer font-medium text-base text-info mb-1">
                How to use Analytics & Reports?
              </summary>
              <ol className="mt-2 text-sm text-base-content list-decimal list-inside space-y-1">
                <li>
                  Use the tabs to switch between different analytics views.
                </li>
                <li>
                  Change the date range to view data for different time periods.
                </li>

                <li>
                  Hover over charts for detailed information about data points.
                </li>
              </ol>
            </details>
          )}

          {error && (
            <div className="alert alert-error mb-6">
              <span>{error}</span>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="tabs tabs-boxed mb-6 bg-base-100">
            <button
              className={`tab tab-lg ${
                activeTab === "overview" ? "tab-active" : ""
              }`}
              onClick={() => setActiveTab("overview")}
            >
              <MdTrendingUp className="w-4 h-4 mr-2" />
              Overview
            </button>
            <button
              className={`tab tab-lg ${
                activeTab === "students" ? "tab-active" : ""
              }`}
              onClick={() => setActiveTab("students")}
            >
              <MdPeople className="w-4 h-4 mr-2" />
              Students
            </button>
            <button
              className={`tab tab-lg ${
                activeTab === "studentsDirectory" ? "tab-active" : ""
              }`}
              onClick={() => setActiveTab("studentsDirectory")}
            >
              <MdPeople className="w-4 h-4 mr-2" />
              Students Directory
            </button>
            <button
              className={`tab tab-lg ${
                activeTab === "questions" ? "tab-active" : ""
              }`}
              onClick={() => setActiveTab("questions")}
            >
              <MdQuiz className="w-4 h-4 mr-2" />
              Questions
            </button>
            <button
              className={`tab tab-lg ${
                activeTab === "subjects" ? "tab-active" : ""
              }`}
              onClick={() => setActiveTab("subjects")}
            >
              <MdAssessment className="w-4 h-4 mr-2" />
              Subjects
            </button>
            <button
              className={`tab tab-lg ${
                activeTab === "tests" ? "tab-active" : ""
              }`}
              onClick={() => setActiveTab("tests")}
            >
              <MdShowChart className="w-4 h-4 mr-2" />
              Tests
            </button>
            <button
              className={`tab tab-lg ${
                activeTab === "game" ? "tab-active" : ""
              }`}
              onClick={() => setActiveTab("game")}
            >
              <MdShowChart className="w-4 h-4 mr-2" />
              Game
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="card bg-base-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-base-content/70">
                        Total Students
                      </p>
                      <p className="text-2xl font-bold">
                        {analyticsData.overview.totalStudents}
                      </p>
                      <p className="text-xs text-success">
                        +12% from last month
                      </p>
                    </div>
                    <MdPeople className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <div className="card bg-base-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-base-content/70">
                        Active Students
                      </p>
                      <p className="text-2xl font-bold">
                        {analyticsData.overview.activeStudents}
                      </p>
                      <p className="text-xs text-success">
                        +8% from last month
                      </p>
                    </div>
                    <MdTrendingUp className="w-8 h-8 text-success" />
                  </div>
                </div>
                <div className="card bg-base-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-base-content/70">
                        Average Score
                      </p>
                      <p className="text-2xl font-bold">
                        {analyticsData.overview.averageScore}%
                      </p>
                      <p className="text-xs text-success">
                        +2.3% from last month
                      </p>
                    </div>
                    <MdBarChart className="w-8 h-8 text-accent" />
                  </div>
                </div>
                <div className="card bg-base-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-base-content/70">
                        Total Questions
                      </p>
                      <p className="text-2xl font-bold">
                        {analyticsData.overview.totalQuestions}
                      </p>
                      <p className="text-xs text-info">+45 new this month</p>
                    </div>
                    <MdQuiz className="w-8 h-8 text-secondary" />
                  </div>
                </div>
                <div className="card bg-base-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-base-content/70">
                        Completion Rate
                      </p>
                      <p className="text-2xl font-bold">
                        {analyticsData.overview.completionRate}%
                      </p>
                      <p className="text-xs text-success">
                        +5.2% from last month
                      </p>
                    </div>
                    <MdAssessment className="w-8 h-8 text-warning" />
                  </div>
                </div>
                <div className="card bg-base-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-base-content/70">
                        Total Tests
                      </p>
                      <p className="text-2xl font-bold">
                        {analyticsData.overview.totalTests}
                      </p>
                      <p className="text-xs text-info">+3 new this week</p>
                    </div>
                    <MdDateRange className="w-8 h-8 text-error" />
                  </div>
                </div>
              </div>

              {/* Engagement KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="card bg-base-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-base-content/70">
                        Participation Rate
                      </p>
                      <p className="text-2xl font-bold">
                        {analyticsData.overview.participationRate ?? 0}%
                      </p>
                    </div>
                  </div>
                </div>
                <div className="card bg-base-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-base-content/70">
                        Assigned Tests
                      </p>
                      <p className="text-2xl font-bold">
                        {analyticsData.overview.assignedTests ?? 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="card bg-base-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-base-content/70">
                        Completed Tests
                      </p>
                      <p className="text-2xl font-bold">
                        {analyticsData.overview.completedTests ?? 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="card bg-base-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-base-content/70">
                        Tests in Range
                      </p>
                      <p className="text-2xl font-bold">
                        {analyticsData.overview.testsInRange ?? 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="card bg-base-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-base-content/70">
                        Participants
                      </p>
                      <p className="text-2xl font-bold">
                        {analyticsData.overview.participants ?? 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="card bg-base-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-base-content/70">
                        Avg Tests / Student
                      </p>
                      <p className="text-2xl font-bold">
                        {analyticsData.overview.avgTestsPerStudent ?? 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="card bg-base-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-base-content/70">
                        Median Score
                      </p>
                      <p className="text-2xl font-bold">
                        {analyticsData.overview.medianScore ?? 0}%
                      </p>
                    </div>
                  </div>
                </div>
                <div className="card bg-base-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-base-content/70">
                        Pass Rate
                      </p>
                      <p className="text-2xl font-bold">
                        {analyticsData.overview.passRate ?? 0}%
                      </p>
                    </div>
                  </div>
                </div>
                <div className="card bg-base-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-base-content/70">
                        Subjects Attempted
                      </p>
                      <p className="text-2xl font-bold">
                        {analyticsData.overview.subjectsAttempted ?? 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Learning Insights */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MdInsights className="w-5 h-5" />
                  Enhanced Learning Insights
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="card bg-base-100 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-base-content/70">
                          Daily Active Users
                        </p>
                        <p className="text-2xl font-bold">
                          {analyticsData.overview.dailyActiveUsers ?? 0}
                        </p>
                        <p className="text-xs text-info">Last 24 hours</p>
                      </div>
                      <MdPeople className="w-8 h-8 text-info" />
                    </div>
                  </div>
                  <div className="card bg-base-100 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-base-content/70">
                          Collaboration Rate
                        </p>
                        <p className="text-2xl font-bold">
                          {analyticsData.overview.collaborationRate ?? 0}%
                        </p>
                        <p className="text-xs text-accent">
                          Team vs Solo tests
                        </p>
                      </div>
                      <MdGroup className="w-8 h-8 text-accent" />
                    </div>
                  </div>
                  <div className="card bg-base-100 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-base-content/70">
                          Peak Learning Hour
                        </p>
                        <p className="text-2xl font-bold">
                          {analyticsData.overview.mostActiveHour ?? 14}:00
                        </p>
                        <p className="text-xs text-warning">Most active time</p>
                      </div>
                      <MdAccessTime className="w-8 h-8 text-warning" />
                    </div>
                  </div>
                  <div className="card bg-base-100 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-base-content/70">
                          Retention Rate
                        </p>
                        <p className="text-2xl font-bold">
                          {analyticsData.overview.retentionRate ?? 0}%
                        </p>
                        <p className="text-xs text-success">Active students</p>
                      </div>
                      <MdSpeed className="w-8 h-8 text-success" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Game Tab */}
          {activeTab === "game" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    PvP Matches Per Day
                  </h3>
                  <div className="h-64">
                    <Line
                      data={{
                        labels:
                          analyticsData.game?.pvp?.matchesPerDay?.labels || [],
                        datasets: [
                          {
                            label: "Matches",
                            data:
                              analyticsData.game?.pvp?.matchesPerDay?.data ||
                              [],
                            borderColor: "rgb(239, 68, 68)",
                            backgroundColor: "rgba(239, 68, 68, 0.1)",
                            tension: 0.4,
                          },
                        ],
                      }}
                      options={chartOptions}
                    />
                  </div>
                </div>
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Top PvP Players
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="table w-full">
                      <thead>
                        <tr>
                          <th>Player</th>
                          <th>Wins</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(analyticsData.game?.pvp?.topPlayers || []).map(
                          (p) => (
                            <tr key={p.id}>
                              <td>{p.name}</td>
                              <td>{p.wins}</td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="card bg-base-100 p-4">
                <div className="stats stats-vertical lg:stats-horizontal shadow">
                  <div className="stat">
                    <div className="stat-title">Total PvP Matches</div>
                    <div className="stat-value">
                      {analyticsData.game?.pvp?.totalMatches || 0}
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Avg & Median Duration
                  </h3>
                  <div className="stats shadow">
                    <div className="stat">
                      <div className="stat-title">Average</div>
                      <div className="stat-value text-sm">
                        {(() => {
                          const sec =
                            analyticsData.game?.pvp?.avgDurationSec || 0;
                          const m = Math.floor(sec / 60);
                          const s = Math.round(sec % 60);
                          return `${m}m ${s}s`;
                        })()}
                      </div>
                    </div>
                    <div className="stat">
                      <div className="stat-title">Median</div>
                      <div className="stat-value text-sm">
                        {(() => {
                          const sec =
                            analyticsData.game?.pvp?.medianDurationSec || 0;
                          const m = Math.floor(sec / 60);
                          const s = Math.round(sec % 60);
                          return `${m}m ${s}s`;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Top Win Streaks
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="table w-full">
                      <thead>
                        <tr>
                          <th>Player</th>
                          <th>Streak</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(analyticsData.game?.pvp?.topStreaks || []).map(
                          (s) => (
                            <tr key={s.id}>
                              <td>{s.name}</td>
                              <td>{s.streak}</td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Win Rates (min 3 matches)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="table w-full">
                      <thead>
                        <tr>
                          <th>Player</th>
                          <th>Win Rate</th>
                          <th>Plays</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(analyticsData.game?.pvp?.winRates || []).map((r) => (
                          <tr key={r.id}>
                            <td>{r.name}</td>
                            <td>{r.winRate}%</td>
                            <td>{r.plays}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* PvP Mode Split removed */}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Matches by Hour (UTC)
                  </h3>
                  <div className="h-64">
                    <Bar
                      data={{
                        labels: [...Array(24)].map((_, i) => i),
                        datasets: [
                          {
                            label: "Matches",
                            data: analyticsData.game?.pvp?.matchesByHour || [],
                            backgroundColor: "rgba(99,102,241,0.8)",
                          },
                        ],
                      }}
                      options={chartOptions}
                    />
                  </div>
                </div>
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">Recent Matches</h3>
                  <div className="overflow-x-auto">
                    <table className="table w-full">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Player 1</th>
                          <th>Player 2</th>
                          <th>Winner</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(analyticsData.game?.pvp?.recentMatches || []).map(
                          (m, idx) => (
                            <tr key={idx}>
                              <td>{new Date(m.date).toLocaleString()}</td>
                              <td>{m.player1}</td>
                              <td>{m.player2}</td>
                              <td>{m.winner}</td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="card bg-base-100 p-4">
                <h3 className="text-lg font-semibold mb-4">
                  Stars Leaderboard
                </h3>
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead>
                      <tr>
                        <th>Player</th>
                        <th>Stars</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(analyticsData.game?.pvp?.starsTop || []).map((s) => (
                        <tr key={s.id}>
                          <td>{s.name}</td>
                          <td>{s.stars}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Students Tab */}
          {activeTab === "students" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Student Registration Trend */}
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Student Registration Trend
                  </h3>
                  <div className="h-64">
                    <Line
                      data={{
                        labels:
                          analyticsData.students.registrationTrend?.labels ||
                          [],
                        datasets: [
                          {
                            label: "New Registrations",
                            data:
                              analyticsData.students.registrationTrend?.data ||
                              [],
                            borderColor: "rgb(59, 130, 246)",
                            backgroundColor: "rgba(59, 130, 246, 0.1)",
                            tension: 0.4,
                          },
                        ],
                      }}
                      options={chartOptions}
                    />
                  </div>
                </div>

                {/* Performance by Track */}
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Performance by Track
                  </h3>
                  <div className="h-64">
                    <Bar
                      data={{
                        labels:
                          analyticsData.students.performanceByTrack?.labels ||
                          [],
                        datasets: [
                          {
                            label: "Average Score (%)",
                            data:
                              analyticsData.students.performanceByTrack?.data ||
                              [],
                            backgroundColor: [
                              "rgba(59, 130, 246, 0.8)",
                              "rgba(16, 185, 129, 0.8)",
                            ],
                          },
                        ],
                      }}
                      options={chartOptions}
                    />
                  </div>
                </div>
              </div>

              {/* New vs Returning and Segments */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    New vs Returning
                  </h3>
                  <div className="h-64">
                    <Doughnut
                      data={{
                        labels: ["New", "Returning"],
                        datasets: [
                          {
                            data: [
                              analyticsData.students.newVsReturning?.new || 0,
                              analyticsData.students.newVsReturning
                                ?.returning || 0,
                            ],
                            backgroundColor: ["#3B82F6", "#10B981"],
                          },
                        ],
                      }}
                      options={pieChartOptions}
                    />
                  </div>
                </div>
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">By Year Level</h3>
                  <div className="h-64">
                    <Bar
                      data={{
                        labels:
                          analyticsData.students.byYearLevel?.labels || [],
                        datasets: [
                          {
                            label: "Avg Score (%)",
                            data:
                              analyticsData.students.byYearLevel?.data || [],
                            backgroundColor: "rgba(59, 130, 246, 0.8)",
                          },
                        ],
                      }}
                      options={chartOptions}
                    />
                  </div>
                </div>
              </div>

              {/* Participants per day trend */}
              <div className="card bg-base-100 p-4">
                <h3 className="text-lg font-semibold mb-4">
                  Participants Per Day
                </h3>
                <div className="h-64">
                  <Line
                    data={{
                      labels:
                        analyticsData.students.participantsTrend?.labels || [],
                      datasets: [
                        {
                          label: "Participants",
                          data:
                            analyticsData.students.participantsTrend?.data ||
                            [],
                          borderColor: "rgb(99, 102, 241)",
                          backgroundColor: "rgba(99, 102, 241, 0.1)",
                          tension: 0.4,
                        },
                      ],
                    }}
                    options={chartOptions}
                  />
                </div>
              </div>

              {/* Removed duplicate By Track chart */}

              {/* Top Performers */}
              <div className="card bg-base-100 p-4">
                <h3 className="text-lg font-semibold mb-4">Top Performers</h3>
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Student Name</th>
                        <th>Track</th>
                        <th>Average Score</th>
                        <th>Tests</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.students.topPerformers?.map(
                        (student, index) => (
                          <tr key={index}>
                            <td className="font-bold">#{index + 1}</td>
                            <td>{student.name}</td>
                            <td>
                              <span className="badge badge-outline">
                                {student.track}
                              </span>
                            </td>
                            <td>
                              <span className="font-bold text-success">
                                {student.score}%
                              </span>
                            </td>
                            <td>{student.tests}</td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Most Active Students */}
              <div className="card bg-base-100 p-4">
                <h3 className="text-lg font-semibold mb-4">
                  Most Active Students
                </h3>
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Tests</th>
                        <th>Avg Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.students.mostActive?.map((s, idx) => (
                        <tr key={idx}>
                          <td>{s.name}</td>
                          <td>{s.tests}</td>
                          <td>{s.avgScore}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top Improvers and At Risk */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">Top Improvers</h3>
                  <div className="overflow-x-auto">
                    <table className="table w-full">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Delta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.students.topImprovers?.map((s, idx) => (
                          <tr key={idx}>
                            <td>{s.studentId}</td>
                            <td className="text-success font-bold">
                              +{s.delta}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">At Risk</h3>
                  <div className="overflow-x-auto">
                    <table className="table w-full">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Avg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.students.atRisk?.map((s, idx) => (
                          <tr key={idx}>
                            <td>{s.studentId}</td>
                            <td className="text-error font-bold">{s.avg}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Recently Online and Inactive */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Recently Online (24h)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="table w-full">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Track</th>
                          <th>Last Login</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.students.recentlyOnline?.map((s) => (
                          <tr key={s.id}>
                            <td>{s.name}</td>
                            <td>
                              <span
                                className="badge badge-outline badge-sm max-w-[160px] md:max-w-[200px] truncate"
                                title={s.track}
                              >
                                {s.track}
                              </span>
                            </td>
                            <td>
                              {s.lastLogin
                                ? new Date(s.lastLogin).toLocaleString()
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Inactive &gt; 14 days
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="table w-full">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Track</th>
                          <th>Last Login</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.students.inactive14d?.map((s) => (
                          <tr key={s.id}>
                            <td>{s.name}</td>
                            <td>
                              <span
                                className="badge badge-outline badge-sm max-w-[160px] md:max-w-[200px] truncate"
                                title={s.track}
                              >
                                {s.track}
                              </span>
                            </td>
                            <td>
                              {s.lastLogin
                                ? new Date(s.lastLogin).toLocaleString()
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Students Directory Tab */}
          {activeTab === "studentsDirectory" && (
            <div className="space-y-6">
              <div className="card bg-base-100 p-4">
                <h3 className="text-lg font-semibold mb-4">
                  Students Directory
                </h3>
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Track</th>
                        <th>Year</th>
                        <th>Rank</th>
                        <th>Total Points</th>
                        <th>PvP Stars</th>
                        <th>Weekly Avg</th>
                        <th>Weekly Tests</th>
                        <th>Online</th>
                        <th>Last Login</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(analyticsData.students.studentsList || []).map((s) => (
                        <tr key={s.id}>
                          <td>{s.name}</td>
                          <td>
                            <span
                              className="badge badge-outline badge-sm max-w-[160px] md:max-w-[200px] truncate"
                              title={s.track}
                            >
                              {s.track}
                            </span>
                          </td>
                          <td>{s.yearLevel}</td>
                          <td>{s.rank}</td>
                          <td>{s.totalPoints}</td>
                          <td>{s.pvpStars}</td>
                          <td>{s.weeklyAvg}%</td>
                          <td>{s.weeklyTestsCompleted}</td>
                          <td>
                            {s.online ? (
                              <span className="badge badge-success">
                                Online
                              </span>
                            ) : (
                              <span className="badge">Offline</span>
                            )}
                          </td>
                          <td>
                            {s.lastLogin
                              ? new Date(s.lastLogin).toLocaleString()
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Questions Tab */}
          {activeTab === "questions" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Difficulty Distribution */}
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Questions by Bloom's Taxonomy
                  </h3>
                  <div className="h-64">
                    <Doughnut
                      data={{
                        labels:
                          analyticsData.questions.difficultyDistribution
                            ?.labels || [],
                        datasets: [
                          {
                            data:
                              analyticsData.questions.difficultyDistribution
                                ?.data || [],
                            backgroundColor: [
                              "#3B82F6",
                              "#10B981",
                              "#F59E0B",
                              "#EF4444",
                              "#8B5CF6",
                              "#06B6D4",
                            ],
                          },
                        ],
                      }}
                      options={pieChartOptions}
                    />
                  </div>
                </div>

                {/* Accuracy by Subject */}
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Question Accuracy by Subject
                  </h3>
                  <div className="h-64">
                    <Bar
                      data={{
                        labels:
                          analyticsData.questions.accuracyBySubject?.labels ||
                          [],
                        datasets: [
                          {
                            label: "Accuracy (%)",
                            data:
                              analyticsData.questions.accuracyBySubject?.data ||
                              [],
                            backgroundColor: "rgba(16, 185, 129, 0.8)",
                          },
                        ],
                      }}
                      options={chartOptions}
                    />
                  </div>
                </div>
              </div>

              {/* Bloom Accuracy and Hardest Questions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">Bloom Accuracy</h3>
                  <div className="h-64">
                    <Bar
                      data={{
                        labels:
                          analyticsData.questions.bloomsAccuracy?.labels || [],
                        datasets: [
                          {
                            label: "Accuracy (%)",
                            data:
                              analyticsData.questions.bloomsAccuracy?.data ||
                              [],
                            backgroundColor: "rgba(59, 130, 246, 0.8)",
                          },
                        ],
                      }}
                      options={chartOptions}
                    />
                  </div>
                </div>
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Hardest Questions
                  </h3>
                  <div className="space-y-3">
                    {analyticsData.questions.hardest?.map((q, index) => (
                      <div key={index} className="p-3 bg-base-200 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">{q.question}</p>
                            <div className="mt-1 flex gap-2 flex-wrap">
                              <span className="badge badge-outline badge-sm">
                                Attempts: {q.attempts}
                              </span>
                              {q.subject && (
                                <span className="badge badge-outline badge-sm">
                                  {q.subject}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm text-base-content/70">
                              Accuracy
                            </span>
                            <p className="font-bold text-error">
                              {q.accuracy}%
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Attempted Questions */}
              <div className="card bg-base-100 p-4">
                <h3 className="text-lg font-semibold mb-4">
                  Top Attempted Questions
                </h3>
                <div className="h-64">
                  <Bar
                    data={{
                      labels:
                        analyticsData.questions.topAttempted?.labels || [],
                      datasets: [
                        {
                          label: "Attempts",
                          data:
                            analyticsData.questions.topAttempted?.data || [],
                          backgroundColor: "rgba(16, 185, 129, 0.8)",
                        },
                      ],
                    }}
                    options={{
                      ...chartOptions,
                      plugins: { legend: { display: false } },
                    }}
                  />
                </div>
              </div>

              {/* Most Missed Questions */}
              <div className="card bg-base-100 p-4">
                <h3 className="text-lg font-semibold mb-4">
                  Most Challenging Questions
                </h3>
                <div className="space-y-3">
                  {analyticsData.questions.mostMissedQuestions?.map(
                    (question, index) => (
                      <div key={index} className="p-3 bg-base-200 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">{question.question}</p>
                            <span className="badge badge-outline badge-sm mt-1">
                              {question.subject}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm text-base-content/70">
                              Accuracy
                            </span>
                            <p className="font-bold text-error">
                              {question.accuracy}%
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Subjects Tab */}
          {activeTab === "subjects" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Subject Popularity (by attempts) */}
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Subject Popularity
                  </h3>
                  <div className="h-64">
                    <Pie
                      data={{
                        labels: analyticsData.subjects.popularity?.labels || [],
                        datasets: [
                          {
                            data: analyticsData.subjects.popularity?.data || [],
                            backgroundColor: [
                              "#3B82F6",
                              "#10B981",
                              "#F59E0B",
                              "#EF4444",
                              "#8B5CF6",
                            ],
                          },
                        ],
                      }}
                      options={pieChartOptions}
                    />
                  </div>
                </div>

                {/* Subject Performance */}
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Average Performance by Subject
                  </h3>
                  <div className="h-64">
                    <Bar
                      data={{
                        labels:
                          analyticsData.subjects.performance?.labels || [],
                        datasets: [
                          {
                            label: "Average Score (%)",
                            data:
                              analyticsData.subjects.performance?.data || [],
                            backgroundColor: "rgba(139, 92, 246, 0.8)",
                          },
                        ],
                      }}
                      options={chartOptions}
                    />
                  </div>
                </div>
              </div>

              {/* Attempts and Coverage */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Attempts by Subject
                  </h3>
                  <div className="h-64">
                    <Bar
                      data={{
                        labels: analyticsData.subjects.attempts?.labels || [],
                        datasets: [
                          {
                            label: "Attempts",
                            data: analyticsData.subjects.attempts?.data || [],
                            backgroundColor: "rgba(59, 130, 246, 0.8)",
                          },
                        ],
                      }}
                      options={chartOptions}
                    />
                  </div>
                </div>
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Coverage by Subject
                  </h3>
                  <div className="h-64">
                    <Bar
                      data={{
                        labels: analyticsData.subjects.coverage?.labels || [],
                        datasets: [
                          {
                            label: "Coverage (%)",
                            data: analyticsData.subjects.coverage?.data || [],
                            backgroundColor: "rgba(16, 185, 129, 0.8)",
                          },
                        ],
                      }}
                      options={chartOptions}
                    />
                  </div>
                </div>
              </div>
              {/* Tests by Subject */}
              <div className="card bg-base-100 p-4">
                <h3 className="text-lg font-semibold mb-4">Tests by Subject</h3>
                <div className="h-64">
                  <Bar
                    data={{
                      labels: analyticsData.tests?.testsBySubject?.labels || [],
                      datasets: [
                        {
                          label: "Tests",
                          data: analyticsData.tests?.testsBySubject?.data || [],
                          backgroundColor: "rgba(234, 88, 12, 0.8)",
                        },
                      ],
                    }}
                    options={chartOptions}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tests Tab */}
          {activeTab === "tests" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Test Completion Trend */}
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Test Completion Rate Trend
                  </h3>
                  <div className="h-64">
                    <Line
                      data={{
                        labels:
                          analyticsData.tests.completionTrend?.labels || [],
                        datasets: [
                          {
                            label: "Completion Rate (%)",
                            data:
                              analyticsData.tests.completionTrend?.data || [],
                            borderColor: "rgb(16, 185, 129)",
                            backgroundColor: "rgba(16, 185, 129, 0.1)",
                            tension: 0.4,
                          },
                        ],
                      }}
                      options={chartOptions}
                    />
                  </div>
                </div>

                {/* Average Score Trend */}
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Average Score Trend
                  </h3>
                  <div className="h-64">
                    <Line
                      data={{
                        labels:
                          analyticsData.tests.averageScoreTrend?.labels || [],
                        datasets: [
                          {
                            label: "Average Score (%)",
                            data:
                              analyticsData.tests.averageScoreTrend?.data || [],
                            borderColor: "rgb(245, 158, 11)",
                            backgroundColor: "rgba(245, 158, 11, 0.1)",
                            tension: 0.4,
                          },
                        ],
                      }}
                      options={chartOptions}
                    />
                  </div>
                </div>
              </div>

              {/* Funnel and Score Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">Test Funnel</h3>
                  <div className="h-64">
                    <Bar
                      data={{
                        labels: ["Assigned", "Started", "Submitted"],
                        datasets: [
                          {
                            label: "Count",
                            data: [
                              analyticsData.tests.funnel?.assigned || 0,
                              analyticsData.tests.funnel?.started || 0,
                              analyticsData.tests.funnel?.submitted || 0,
                            ],
                            backgroundColor: ["#3B82F6", "#F59E0B", "#10B981"],
                          },
                        ],
                      }}
                      options={{
                        ...chartOptions,
                        scales: {
                          y: { beginAtZero: true, ticks: { precision: 0 } },
                        },
                      }}
                    />
                  </div>
                </div>
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Score Distribution
                  </h3>
                  <div className="h-64">
                    <Bar
                      data={{
                        labels: (analyticsData.tests.scoreHistogram?.bins || [])
                          .slice(0, -1)
                          .map(
                            (b, i) =>
                              `${b}-${
                                (analyticsData.tests.scoreHistogram?.bins ||
                                  [])[i + 1] - 1
                              }`
                          ),
                        datasets: [
                          {
                            label: "Attempts",
                            data:
                              analyticsData.tests.scoreHistogram?.counts || [],
                            backgroundColor: "rgba(99, 102, 241, 0.8)",
                          },
                        ],
                      }}
                      options={{
                        ...chartOptions,
                        scales: {
                          y: { beginAtZero: true, ticks: { precision: 0 } },
                        },
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Activity Heatmap with dates (dark mode friendly) */}
              <div className="card bg-base-100 p-4">
                <h3 className="text-lg font-semibold mb-4">
                  Activity Heatmap (UTC)
                </h3>
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead>
                      <tr>
                        <th></th>
                        {[...Array(24)].map((_, h) => (
                          <th key={h} className="text-xs">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        analyticsData.tests.activityHeatmapDates?.dates || []
                      ).map((date, rowIdx) => (
                        <tr key={date}>
                          <td className="text-xs text-base-content/70">
                            {date}
                          </td>
                          {[...Array(24)].map((_, hour) => {
                            const count =
                              analyticsData.tests.activityHeatmapDates?.grid?.[
                                rowIdx
                              ]?.[hour] || 0;
                            const intensity = Math.min(1, count / 5);
                            const bg = `rgba(59, 130, 246, ${intensity})`;
                            return (
                              <td key={hour} className="p-0">
                                <div
                                  className="h-5 w-full"
                                  title={`${date} ${hour}:00 → ${count}`}
                                  style={{ backgroundColor: bg }}
                                ></div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {analyticsData.tests.peak && (
                  <div className="mt-3 text-sm text-base-content/70">
                    Peak hour:{" "}
                    <span className="font-semibold">
                      {analyticsData.tests.peak.hour}:00
                    </span>
                    , Busiest date:{" "}
                    <span className="font-semibold">
                      {analyticsData.tests.peak.date}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;

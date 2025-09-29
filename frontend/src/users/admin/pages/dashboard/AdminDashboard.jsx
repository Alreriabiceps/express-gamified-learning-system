import React, { useState, useEffect } from "react";
import {
  MdPeople,
  MdQuiz,
  MdBook,
  MdCalendarToday,
  MdWarning,
  MdCheckCircle,
  MdPendingActions,
  MdTrendingUp,
  MdTrendingDown,
  MdAccessTime,
  MdGroup,
  MdStar,
  MdSpeed,
  MdInsights,
} from "react-icons/md";
import { useAuth } from "../../../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalQuestions: 0,
    totalSubjects: 0,
    totalWeeklyTests: 0,
    activePlayers: 0,
  });
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!token) {
          console.error("No token found in AuthContext");
          navigate("/admin/login");
          return;
        }

        if (!user || user.role !== "admin") {
          console.error("User is not an admin:", user);
          navigate("/admin/login");
          return;
        }

        console.log("Fetching dashboard data with token:", token);

        // Fetch statistics
        const statsResponse = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/admin/dashboard/stats`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        console.log("Stats response status:", statsResponse.status);
        console.log(
          "Stats response headers:",
          Object.fromEntries(statsResponse.headers.entries())
        );

        if (!statsResponse.ok) {
          const errorText = await statsResponse.text();
          console.error("Stats response error text:", errorText);
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            errorData = { error: errorText };
          }
          console.error("Stats response error:", errorData);
          throw new Error(
            errorData.error ||
              `Failed to fetch dashboard statistics (${statsResponse.status})`
          );
        }

        const statsData = await statsResponse.json();
        console.log("Stats data received:", statsData);
        setStats(statsData);

        // Fetch analytics data for dashboard insights
        try {
          const analyticsResponse = await fetch(
            `${import.meta.env.VITE_BACKEND_URL}/api/admin/analytics?range=7`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (analyticsResponse.ok) {
            const analytics = await analyticsResponse.json();
            console.log("Analytics data received:", analytics);
            setAnalyticsData(analytics);
          }
        } catch (analyticsError) {
          console.warn("Analytics data failed to load:", analyticsError);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError(err.message);
        if (
          err.message.includes("token") ||
          err.message.includes("unauthorized")
        ) {
          navigate("/admin/login");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [token, user, navigate]);

  const statCards = [
    {
      title: "Total Students",
      value: stats.totalStudents,
      subtitle: analyticsData
        ? `${analyticsData.overview.activeStudents || 0} active`
        : "Loading...",
      icon: <MdPeople className="w-8 h-8" />,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Daily Active Users",
      value: analyticsData?.overview.dailyActiveUsers || 0,
      subtitle: analyticsData
        ? `${analyticsData.overview.weeklyActiveUsers || 0} weekly`
        : "Loading...",
      icon: <MdTrendingUp className="w-8 h-8" />,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Average Score",
      value: analyticsData
        ? `${analyticsData.overview.averageScore || 0}%`
        : "0%",
      subtitle:
        analyticsData && analyticsData.overview.scoresTrend >= 0
          ? `+${analyticsData.overview.scoresTrend.toFixed(1)}% trend`
          : analyticsData
          ? `${analyticsData.overview.scoresTrend?.toFixed(1) || 0}% trend`
          : "Loading...",
      icon: <MdInsights className="w-8 h-8" />,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Collaboration Rate",
      value: analyticsData
        ? `${analyticsData.overview.collaborationRate || 0}%`
        : "0%",
      subtitle: "Team vs Solo tests",
      icon: <MdGroup className="w-8 h-8" />,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      title: "Peak Hour",
      value: analyticsData
        ? `${analyticsData.overview.mostActiveHour || 14}:00`
        : "14:00",
      subtitle: "Most active time",
      icon: <MdAccessTime className="w-8 h-8" />,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Retention Rate",
      value: analyticsData
        ? `${analyticsData.overview.retentionRate || 0}%`
        : "0%",
      subtitle: "Student engagement",
      icon: <MdSpeed className="w-8 h-8" />,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-base-200 rounded-lg shadow-lg p-3 sm:p-6">
            <div className="flex items-center justify-center h-64">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-base-200 rounded-lg shadow-lg p-3 sm:p-6">
            <div className="alert alert-error">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01M12 17a9 9 0 100-18 9 9 0 000 18z"
                />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-base-200 rounded-lg shadow-lg p-3 sm:p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4 sm:mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-primary mb-4 sm:mb-6">
                Admin Dashboard
              </h1>
              <p className="text-sm text-base-content/70">
                Welcome back! Here's what's happening today.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="badge badge-success gap-1">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                Live
              </div>
              <span className="text-xs text-base-content/70">
                Last updated: {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
            <button
              onClick={() => navigate("/admin/addquestions")}
              className="btn btn-outline btn-sm gap-2 h-auto p-3 flex-col"
            >
              <MdQuiz className="w-4 h-4" />
              <span className="text-xs">Add Questions</span>
            </button>
            <button
              onClick={() => navigate("/admin/addstudent")}
              className="btn btn-outline btn-sm gap-2 h-auto p-3 flex-col"
            >
              <MdPeople className="w-4 h-4" />
              <span className="text-xs">Add Student</span>
            </button>
            <button
              onClick={() => navigate("/admin/subjects")}
              className="btn btn-outline btn-sm gap-2 h-auto p-3 flex-col"
            >
              <MdBook className="w-4 h-4" />
              <span className="text-xs">Manage Subjects</span>
            </button>
            <button
              onClick={() => navigate("/admin/weeks/schedule")}
              className="btn btn-outline btn-sm gap-2 h-auto p-3 flex-col"
            >
              <MdCalendarToday className="w-4 h-4" />
              <span className="text-xs">Schedule Test</span>
            </button>
          </div>

          {/* Enhanced Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {statCards.map((stat, index) => (
              <div
                key={index}
                className="card bg-base-100 p-3 sm:p-4 rounded-lg hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs sm:text-sm font-semibold mb-1 text-base-content/80">
                      {stat.title}
                    </h3>
                    <p className="text-lg sm:text-xl font-bold mb-1">
                      {stat.value}
                    </p>
                    {stat.subtitle && (
                      <p className="text-xs text-base-content/60 truncate">
                        {stat.subtitle}
                      </p>
                    )}
                  </div>
                  <div
                    className={`p-2 sm:p-3 rounded-full ${stat.bgColor} ${stat.color} flex-shrink-0 ml-3`}
                  >
                    {stat.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Insights */}
          {analyticsData && (
            <div className="mb-4 sm:mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="card bg-gradient-to-r from-primary/10 to-primary/20 p-3 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2">
                    <MdTrendingUp className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-xs font-medium text-primary">
                        Performance Trend
                      </p>
                      <p className="text-lg font-bold">
                        {analyticsData.overview.scoresTrend >= 0 ? "+" : ""}
                        {analyticsData.overview.scoresTrend?.toFixed(1) || 0}%
                      </p>
                    </div>
                  </div>
                </div>
                <div className="card bg-gradient-to-r from-success/10 to-success/20 p-3 rounded-lg border border-success/20">
                  <div className="flex items-center gap-2">
                    <MdStar className="w-5 h-5 text-success" />
                    <div>
                      <p className="text-xs font-medium text-success">
                        Pass Rate
                      </p>
                      <p className="text-lg font-bold">
                        {analyticsData.overview.passRate || 0}%
                      </p>
                    </div>
                  </div>
                </div>
                <div className="card bg-gradient-to-r from-warning/10 to-warning/20 p-3 rounded-lg border border-warning/20">
                  <div className="flex items-center gap-2">
                    <MdGroup className="w-5 h-5 text-warning" />
                    <div>
                      <p className="text-xs font-medium text-warning">
                        New Students
                      </p>
                      <p className="text-lg font-bold">
                        {analyticsData.overview.newStudentsThisMonth || 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="card bg-gradient-to-r from-info/10 to-info/20 p-3 rounded-lg border border-info/20">
                  <div className="flex items-center gap-2">
                    <MdQuiz className="w-5 h-5 text-info" />
                    <div>
                      <p className="text-xs font-medium text-info">
                        Questions/Student
                      </p>
                      <p className="text-lg font-bold">
                        {analyticsData.overview.questionsPerStudent || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Data Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Left Column - Student Analytics */}
            <div className="space-y-3 sm:space-y-4">
              {/* Most Active Students */}
              {analyticsData?.students?.mostActive && (
                <div className="card bg-base-100 p-3 sm:p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <MdTrendingUp className="w-5 h-5 text-success" />
                    <h3 className="font-semibold text-sm sm:text-base">
                      Most Active Students
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {analyticsData.students.mostActive
                      .slice(0, 5)
                      .map((student, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-base-200 rounded"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">
                              {student.name}
                            </p>
                            <p className="text-xs text-base-content/60">
                              {student.tests} tests
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-success">
                              {student.avgScore}%
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Performance by Track */}
              {analyticsData?.students?.performanceByTrack && (
                <div className="card bg-base-100 p-3 sm:p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <MdBook className="w-5 h-5 text-accent" />
                    <h3 className="font-semibold text-sm sm:text-base">
                      Track Performance
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {analyticsData.students.performanceByTrack.labels.map(
                      (track, index) => (
                        <div
                          key={track}
                          className="flex items-center justify-between"
                        >
                          <span className="text-xs font-medium">{track}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-base-300 rounded-full h-2">
                              <div
                                className="bg-accent h-2 rounded-full"
                                style={{
                                  width: `${analyticsData.students.performanceByTrack.data[index]}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-xs font-bold">
                              {
                                analyticsData.students.performanceByTrack.data[
                                  index
                                ]
                              }
                              %
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Recently Online Students */}
              {analyticsData?.students?.recentlyOnline && (
                <div className="card bg-base-100 p-3 sm:p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <MdPeople className="w-5 h-5 text-info" />
                    <h3 className="font-semibold text-sm sm:text-base">
                      Recently Active (24h)
                    </h3>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-info">
                      {analyticsData.students.recentlyOnline.length}
                    </p>
                    <p className="text-xs text-base-content/60">
                      students online
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Middle Column - Question & Subject Analytics */}
            <div className="space-y-3 sm:space-y-4">
              {/* Hardest Questions */}
              {analyticsData?.questions?.hardest && (
                <div className="card bg-base-100 p-3 sm:p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <MdQuiz className="w-5 h-5 text-error" />
                    <h3 className="font-semibold text-sm sm:text-base">
                      Most Challenging
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {analyticsData.questions.hardest
                      .slice(0, 3)
                      .map((question, index) => (
                        <div key={index} className="p-2 bg-error/10 rounded">
                          <p className="text-xs font-medium mb-1 truncate">
                            {question.question}
                          </p>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-base-content/60">
                              {question.attempts} attempts
                            </span>
                            <span className="text-xs font-bold text-error">
                              {question.accuracy}% accuracy
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Subject Performance */}
              {analyticsData?.subjects?.performance && (
                <div className="card bg-base-100 p-3 sm:p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <MdBook className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-sm sm:text-base">
                      Subject Scores
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {analyticsData.subjects.performance.labels.map(
                      (subject, index) => (
                        <div
                          key={subject}
                          className="flex items-center justify-between"
                        >
                          <span className="text-xs font-medium">{subject}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-base-300 rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{
                                  width: `${analyticsData.subjects.performance.data[index]}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-xs font-bold">
                              {analyticsData.subjects.performance.data[index]}%
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Questions by Bloom's Taxonomy */}
              {analyticsData?.questions?.bloomsAccuracy && (
                <div className="card bg-base-100 p-3 sm:p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <MdInsights className="w-5 h-5 text-secondary" />
                    <h3 className="font-semibold text-sm sm:text-base">
                      Bloom's Accuracy
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {analyticsData.questions.bloomsAccuracy.labels.map(
                      (level, index) => (
                        <div
                          key={level}
                          className="flex items-center justify-between"
                        >
                          <span className="text-xs font-medium truncate">
                            {level}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-base-300 rounded-full h-2">
                              <div
                                className="bg-secondary h-2 rounded-full"
                                style={{
                                  width: `${analyticsData.questions.bloomsAccuracy.data[index]}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-xs font-bold">
                              {
                                analyticsData.questions.bloomsAccuracy.data[
                                  index
                                ]
                              }
                              %
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Enhanced Analytics */}
            <div className="space-y-3 sm:space-y-4">
              {/* Top Students Leaderboard */}
              <div className="card bg-base-100 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MdStar className="w-5 h-5 text-warning" />
                    <h3 className="font-semibold text-sm sm:text-base">
                      Top Performers
                    </h3>
                  </div>
                  <button
                    onClick={() => navigate("/admin/reports")}
                    className="btn btn-primary btn-xs"
                  >
                    View All
                  </button>
                </div>
                {analyticsData?.students?.topPerformers ? (
                  <div className="space-y-2">
                    {analyticsData.students.topPerformers
                      .slice(0, 5)
                      .map((student, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-base-200 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-primary font-bold text-sm">
                              #{index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium truncate">
                                {student.name}
                              </p>
                              <p className="text-xs text-base-content/60">
                                {student.track}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-success">
                              {student.score}%
                            </p>
                            <p className="text-xs text-base-content/60">
                              {student.tests} tests
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-base-content/60">
                      Loading leaderboard...
                    </p>
                  </div>
                )}
              </div>

              {/* PvP Gaming Stats */}
              {analyticsData?.game?.pvp && (
                <div className="card bg-base-100 p-3 sm:p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <MdQuiz className="w-5 h-5 text-error" />
                    <h3 className="font-semibold text-sm sm:text-base">
                      PvP Gaming
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="text-center p-2 bg-primary/10 rounded">
                      <p className="text-lg font-bold text-primary">
                        {analyticsData.game.pvp.totalMatches || 0}
                      </p>
                      <p className="text-xs text-base-content/60">Matches</p>
                    </div>
                    <div className="text-center p-2 bg-success/10 rounded">
                      <p className="text-lg font-bold text-success">
                        {Math.round(
                          (analyticsData.game.pvp.avgDurationSec || 0) / 60
                        )}
                        m
                      </p>
                      <p className="text-xs text-base-content/60">Avg Time</p>
                    </div>
                  </div>
                  {analyticsData.game.pvp.topPlayers && (
                    <div>
                      <p className="text-xs font-medium mb-2">
                        Top PvP Players
                      </p>
                      <div className="space-y-1">
                        {analyticsData.game.pvp.topPlayers
                          .slice(0, 3)
                          .map((player, index) => (
                            <div
                              key={index}
                              className="flex justify-between items-center text-xs"
                            >
                              <span className="truncate">{player.name}</span>
                              <span className="font-bold text-success">
                                {player.wins}W
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Test Analytics */}
              {analyticsData?.tests && (
                <div className="card bg-base-100 p-3 sm:p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <MdCalendarToday className="w-5 h-5 text-info" />
                    <h3 className="font-semibold text-sm sm:text-base">
                      Test Analytics
                    </h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Completion Rate:</span>
                      <span className="text-sm font-bold text-success">
                        {analyticsData.overview.completionRate || 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Pass Rate:</span>
                      <span className="text-sm font-bold text-info">
                        {analyticsData.overview.passRate || 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Tests Completed:</span>
                      <span className="text-sm font-bold text-primary">
                        {analyticsData.overview.completedTests || 0}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Growth Metrics */}
              <div className="card bg-base-100 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <MdTrendingUp className="w-5 h-5 text-success" />
                  <h3 className="font-semibold text-sm sm:text-base">
                    Growth Metrics
                  </h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs">New Students:</span>
                    <span className="text-sm font-bold text-primary">
                      +{analyticsData?.overview?.newStudentsThisMonth || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs">Total Questions:</span>
                    <span className="text-sm font-bold text-accent">
                      {analyticsData?.overview?.totalQuestionsAttempted ||
                        stats.totalQuestions ||
                        0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs">Avg Tests/Student:</span>
                    <span className="text-sm font-bold text-secondary">
                      {analyticsData?.overview?.avgTestsPerStudent || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

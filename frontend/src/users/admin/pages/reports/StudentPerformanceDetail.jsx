import React, { useState, useEffect } from "react";
import {
  MdPerson,
  MdTrendingUp,
  MdTrendingDown,
  MdQuiz,
  MdSubject,
  MdCalendarToday,
  MdArrowBack,
  MdFileDownload,
  MdSpeed,
  MdInsights,
  MdAccessTime,
  MdGroup,
} from "react-icons/md";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../../../contexts/AuthContext";
import { Line, Bar, Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend
);

const StudentPerformanceDetail = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [studentData, setStudentData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  // Export student performance data
  const exportStudentData = () => {
    const exportData = {
      student: studentData,
      performance: performanceData,
      generatedAt: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = `student_${studentId}_performance_${
      new Date().toISOString().split("T")[0]
    }.json`;
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  useEffect(() => {
    const fetchStudentPerformance = async () => {
      if (!token || !studentId) return;

      setIsLoading(true);
      setError("");
      try {
        const response = await fetch(
          `${backendUrl}/api/admin/students/${studentId}/performance`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch student performance data");
        }

        const data = await response.json();
        setStudentData(data.student);
        setPerformanceData(data.performance);
      } catch (err) {
        console.error("Error fetching student performance:", err);
        setError("Failed to load student performance data");
        // Generate mock data for demo
        setStudentData(generateMockStudentData());
        setPerformanceData(generateMockPerformanceData());
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentPerformance();
  }, [token, studentId, backendUrl]);

  const generateMockStudentData = () => ({
    _id: studentId,
    firstName: "Juan",
    lastName: "Dela Cruz",
    email: "juan.delacruz@example.com",
    studentId: "2024001",
    track: "STEM",
    section: "A",
    yearLevel: "Grade 12",
    totalPoints: 1250,
    isActive: true,
    lastLogin: new Date().toISOString(),
  });

  const generateMockPerformanceData = () => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split("T")[0];
    });

    return {
      overview: {
        averageScore: 85.3,
        testsCompleted: 12,
        totalTestsAvailable: 15,
        currentStreak: 5,
        bestSubject: "Mathematics",
        improvementNeeded: "Science",
        rank: 3,
        totalStudents: 45,
      },
      scoreHistory: {
        labels: last30Days.slice(-10),
        data: [78, 82, 75, 88, 85, 79, 83, 87, 90, 85],
      },
      subjectPerformance: {
        labels: ["Mathematics", "Science", "English", "History", "Filipino"],
        data: [92, 73, 88, 85, 81],
      },
      bloomsPerformance: {
        labels: [
          "Remembering",
          "Understanding",
          "Applying",
          "Analyzing",
          "Evaluating",
          "Creating",
        ],
        data: [95, 88, 82, 78, 74, 68],
      },
      testHistory: [
        {
          id: 1,
          subject: "Mathematics",
          date: "2024-01-15",
          score: 92,
          totalQuestions: 20,
          correctAnswers: 18,
          timeSpent: "25 minutes",
        },
        {
          id: 2,
          subject: "Science",
          date: "2024-01-12",
          score: 73,
          totalQuestions: 15,
          correctAnswers: 11,
          timeSpent: "30 minutes",
        },
        {
          id: 3,
          subject: "English",
          date: "2024-01-10",
          score: 88,
          totalQuestions: 25,
          correctAnswers: 22,
          timeSpent: "35 minutes",
        },
      ],
      weeklyActivity: last30Days.slice(-7).map((date) => ({
        date,
        testsCompleted: Math.floor(Math.random() * 3),
        timeSpent: Math.floor(Math.random() * 120) + 30,
      })),
    };
  };

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
        max: 100,
      },
    },
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
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

  if (error && !studentData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-base-200 rounded-lg shadow-lg p-6">
            <div className="alert alert-error">
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
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <button
                onClick={() => navigate("/admin/reports")}
                className="btn btn-ghost btn-sm"
              >
                <MdArrowBack className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Reports</span>
                <span className="sm:hidden">Back</span>
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-primary flex items-center gap-2">
                  <MdPerson className="w-6 h-6 sm:w-8 sm:h-8" />
                  {studentData?.firstName} {studentData?.lastName}
                </h1>
                <p className="text-sm sm:text-base text-base-content/70 mt-1">
                  {studentData?.track} • {studentData?.section} •{" "}
                  {studentData?.yearLevel}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => exportStudentData()}
                className="btn btn-outline btn-sm"
              >
                <MdFileDownload className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          {/* Student Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="card bg-base-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-base-content/70">
                    Average Score
                  </p>
                  <p className="text-2xl font-bold">
                    {performanceData?.overview.averageScore}%
                  </p>
                  <p className="text-xs text-success flex items-center gap-1">
                    <MdTrendingUp className="w-3 h-3" />
                    Above average
                  </p>
                </div>
              </div>
            </div>
            <div className="card bg-base-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-base-content/70">
                    Tests Completed
                  </p>
                  <p className="text-2xl font-bold">
                    {performanceData?.overview.testsCompleted}/
                    {performanceData?.overview.totalTestsAvailable}
                  </p>
                  <p className="text-xs text-info">
                    {Math.round(
                      (performanceData?.overview.testsCompleted /
                        performanceData?.overview.totalTestsAvailable) *
                        100
                    )}
                    % completion
                  </p>
                </div>
              </div>
            </div>
            <div className="card bg-base-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-base-content/70">
                    Class Rank
                  </p>
                  <p className="text-2xl font-bold">
                    #{performanceData?.overview.rank}
                  </p>
                  <p className="text-xs text-base-content/70">
                    out of {performanceData?.overview.totalStudents} students
                  </p>
                </div>
              </div>
            </div>
            <div className="card bg-base-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-base-content/70">
                    Current Streak
                  </p>
                  <p className="text-2xl font-bold">
                    {performanceData?.overview.currentStreak}
                  </p>
                  <p className="text-xs text-success">consecutive tests</p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="tabs tabs-boxed mb-4 sm:mb-6 bg-base-100 grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-0">
            <button
              className={`tab tab-sm sm:tab-lg ${
                activeTab === "overview" ? "tab-active" : ""
              }`}
              onClick={() => setActiveTab("overview")}
            >
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden">Over</span>
            </button>
            <button
              className={`tab tab-sm sm:tab-lg ${
                activeTab === "subjects" ? "tab-active" : ""
              }`}
              onClick={() => setActiveTab("subjects")}
            >
              <span className="hidden sm:inline">Subject Performance</span>
              <span className="sm:hidden">Subjects</span>
            </button>
            <button
              className={`tab tab-sm sm:tab-lg ${
                activeTab === "history" ? "tab-active" : ""
              }`}
              onClick={() => setActiveTab("history")}
            >
              <span className="hidden sm:inline">Test History</span>
              <span className="sm:hidden">Tests</span>
            </button>
            <button
              className={`tab tab-sm sm:tab-lg ${
                activeTab === "skills" ? "tab-active" : ""
              }`}
              onClick={() => setActiveTab("skills")}
            >
              <span className="hidden sm:inline">Skills Analysis</span>
              <span className="sm:hidden">Skills</span>
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Score Trend */}
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Score Trend (Last 10 Tests)
                  </h3>
                  <div className="h-64">
                    <Line
                      data={{
                        labels: performanceData?.scoreHistory.labels || [],
                        datasets: [
                          {
                            label: "Test Scores (%)",
                            data: performanceData?.scoreHistory.data || [],
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

                {/* Weekly Activity */}
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Weekly Activity
                  </h3>
                  <div className="h-64">
                    <Bar
                      data={{
                        labels:
                          performanceData?.weeklyActivity.map((item) =>
                            new Date(item.date).toLocaleDateString("en-US", {
                              weekday: "short",
                            })
                          ) || [],
                        datasets: [
                          {
                            label: "Tests Completed",
                            data:
                              performanceData?.weeklyActivity.map(
                                (item) => item.testsCompleted
                              ) || [],
                            backgroundColor: "rgba(16, 185, 129, 0.8)",
                            yAxisID: "y",
                          },
                          {
                            label: "Time Spent (min)",
                            data:
                              performanceData?.weeklyActivity.map(
                                (item) => item.timeSpent
                              ) || [],
                            backgroundColor: "rgba(245, 158, 11, 0.8)",
                            yAxisID: "y1",
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: "top",
                          },
                        },
                        scales: {
                          y: {
                            type: "linear",
                            display: true,
                            position: "left",
                            beginAtZero: true,
                          },
                          y1: {
                            type: "linear",
                            display: true,
                            position: "right",
                            beginAtZero: true,
                            grid: {
                              drawOnChartArea: false,
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Performance Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4 text-success">
                    Strengths
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                      <span className="font-medium">Best Subject</span>
                      <span className="badge badge-success">
                        {performanceData?.overview.bestSubject}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-info/10 rounded-lg">
                      <span className="font-medium">
                        Consistent Performance
                      </span>
                      <span className="badge badge-info">High</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                      <span className="font-medium">Test Completion Rate</span>
                      <span className="badge badge-primary">Above Average</span>
                    </div>
                  </div>
                </div>
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4 text-warning">
                    Areas for Improvement
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg">
                      <span className="font-medium">Focus Subject</span>
                      <span className="badge badge-warning">
                        {performanceData?.overview.improvementNeeded}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-error/10 rounded-lg">
                      <span className="font-medium">
                        Complex Problem Solving
                      </span>
                      <span className="badge badge-error">Needs Practice</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-accent/10 rounded-lg">
                      <span className="font-medium">Time Management</span>
                      <span className="badge badge-accent">Can Improve</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subject Performance Tab */}
          {activeTab === "subjects" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Performance by Subject
                  </h3>
                  <div className="h-64">
                    <Bar
                      data={{
                        labels:
                          performanceData?.subjectPerformance.labels || [],
                        datasets: [
                          {
                            label: "Average Score (%)",
                            data:
                              performanceData?.subjectPerformance.data || [],
                            backgroundColor: [
                              "rgba(59, 130, 246, 0.8)",
                              "rgba(16, 185, 129, 0.8)",
                              "rgba(245, 158, 11, 0.8)",
                              "rgba(239, 68, 68, 0.8)",
                              "rgba(139, 92, 246, 0.8)",
                            ],
                          },
                        ],
                      }}
                      options={chartOptions}
                    />
                  </div>
                </div>

                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Subject Details
                  </h3>
                  <div className="space-y-3">
                    {performanceData?.subjectPerformance.labels.map(
                      (subject, index) => (
                        <div
                          key={subject}
                          className="flex items-center justify-between p-3 bg-base-200 rounded-lg"
                        >
                          <div>
                            <span className="font-medium">{subject}</span>
                            <p className="text-sm text-base-content/70">
                              {Math.floor(Math.random() * 5) + 3} tests
                              completed
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold">
                              {performanceData?.subjectPerformance.data[index]}%
                            </span>
                            <p className="text-sm text-base-content/70">
                              avg score
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Test History Tab */}
          {activeTab === "history" && (
            <div className="card bg-base-100 p-4">
              <h3 className="text-lg font-semibold mb-4">
                Recent Test History
              </h3>
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Subject</th>
                      <th>Score</th>
                      <th>Correct Answers</th>
                      <th>Time Spent</th>
                      <th>Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceData?.testHistory.map((test) => (
                      <tr key={test.id}>
                        <td>{new Date(test.date).toLocaleDateString()}</td>
                        <td>
                          <span className="badge badge-outline">
                            {test.subject}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`font-bold ${
                              test.score >= 80
                                ? "text-success"
                                : test.score >= 60
                                ? "text-warning"
                                : "text-error"
                            }`}
                          >
                            {test.score}%
                          </span>
                        </td>
                        <td>
                          {test.correctAnswers}/{test.totalQuestions}
                        </td>
                        <td>{test.timeSpent}</td>
                        <td>
                          {test.score >= 80 ? (
                            <span className="badge badge-success">
                              Excellent
                            </span>
                          ) : test.score >= 60 ? (
                            <span className="badge badge-warning">Good</span>
                          ) : (
                            <span className="badge badge-error">
                              Needs Improvement
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Skills Analysis Tab */}
          {activeTab === "skills" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Bloom's Taxonomy Performance
                  </h3>
                  <div className="h-64">
                    <Radar
                      data={{
                        labels: performanceData?.bloomsPerformance.labels || [],
                        datasets: [
                          {
                            label: "Performance (%)",
                            data: performanceData?.bloomsPerformance.data || [],
                            backgroundColor: "rgba(59, 130, 246, 0.2)",
                            borderColor: "rgb(59, 130, 246)",
                            pointBackgroundColor: "rgb(59, 130, 246)",
                          },
                        ],
                      }}
                      options={radarOptions}
                    />
                  </div>
                </div>

                <div className="card bg-base-100 p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Cognitive Skills Analysis
                  </h3>
                  <div className="space-y-3">
                    {performanceData?.bloomsPerformance.labels.map(
                      (skill, index) => (
                        <div
                          key={skill}
                          className="flex items-center justify-between p-3 bg-base-200 rounded-lg"
                        >
                          <span className="font-medium">{skill}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-base-300 rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{
                                  width: `${performanceData?.bloomsPerformance.data[index]}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-sm font-bold">
                              {performanceData?.bloomsPerformance.data[index]}%
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentPerformanceDetail;

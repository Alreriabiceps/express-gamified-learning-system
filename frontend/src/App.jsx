import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

import StudentLogin from "./users/students/login/Login.jsx";
import StudentSignup from "./users/students/signup/Signup.jsx";
import AdminLogin from "./users/admin/login/Login.jsx";
import RegistrationSuccess from "./users/students/signup/RegistrationSuccess.jsx";
import ForgotPassword from "./users/students/login/ForgotPassword.jsx";
import ResetPassword from "./users/students/login/ResetPassword.jsx";

// Student routes
import StudentLayout from "./layout/StudentLayout.jsx";
import Start from "./users/students/start/Start.jsx";
import Dashboard from "./users/students/pages/dashboard/pages/Dashboard.jsx";
import WeeklyTest from "./users/students/pages/weeklytest/pages/WeeklyTest.jsx";
import Reviewers from "./users/students/pages/reviewers/pages/Reviewers.jsx";
import Ranking from "./users/students/pages/ranking/pages/Ranking.jsx";
import Profile from "./users/students/pages/profile/pages/Profile.jsx";
import Crew from "./users/students/pages/crew/pages/Crew.jsx";
import Partymmr from "./users/students/pages/partymmr/pages/Partymmr.jsx";
import TeamWeeklyTest from "./users/students/pages/teamtest/pages/TeamWeeklyTest.jsx";
import VersusModeLobby from "./users/students/pages/versusmodelobby/pages/VersusModeLobby.jsx";
import AllChats from "./users/students/pages/chat/AllChats.jsx";
import Guide from "./users/students/pages/guide/pages/Guide.jsx";
import useSocket from "./hooks/useSocket";
import Demo from "./users/students/pages/demo";

// Admin routes
import AdminLayout from "./layout/adminlayout.jsx";
import AdminDashboard from "./users/admin/pages/dashboard/AdminDashboard.jsx";
import StudentList from "./users/admin/pages/students/StudentList.jsx";
import AddStudents from "./users/admin/pages/students/AddStudents.jsx";
import Subjects from "./users/admin/pages/subjects/Subjects.jsx";
import Unauthorized from "./components/Unauthorized";
import Settings from "./users/admin/pages/settings/Settings.jsx";
import AddQuestions from "./users/admin/pages/questions/AddQuestions.jsx";
import QuestionList from "./users/admin/pages/questions/QuestionList.jsx";
import WeekSchedule from "./users/admin/pages/weeks/WeekSchedule.jsx";
import CurrentSchedules from "./users/admin/pages/weeks/CurrentSchedules.jsx";
import ReviewerLinks from "./users/admin/pages/reviewer/ReviewerLinks.jsx";
import Analytics from "./users/admin/pages/reports/Analytics.jsx";
import StudentPerformanceDetail from "./users/admin/pages/reports/StudentPerformanceDetail.jsx";

const App = () => {
  const currentUser = JSON.parse(localStorage.getItem("user")) || {};
  const socketRef = useSocket();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<StudentLogin />} />
      <Route path="/register" element={<StudentSignup />} />
      <Route path="/alogin" element={<AdminLogin />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="start" element={<Start />} />
      <Route path="/registration-success" element={<RegistrationSuccess />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Student routes */}
      <Route
        path="/student/*"
        element={
          <ProtectedRoute requireStudent>
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="weeklytest" element={<WeeklyTest />} />
        <Route path="reviewers" element={<Reviewers />} />
        <Route path="ranking" element={<Ranking />} />
        <Route path="leaderboard/global" element={<Ranking />} />
        <Route path="profile" element={<Profile />} />
        <Route path="crew" element={<Crew />} />
        <Route path="partymmr" element={<Partymmr />} />
        <Route path="teamtest/:attemptId" element={<TeamWeeklyTest />} />
        <Route path="versusmodelobby" element={<VersusModeLobby />} />
        {/* Route removed: game now uses Demo component directly */}
        <Route
          path="chats"
          element={<AllChats currentUser={currentUser} socketRef={socketRef} />}
        />
        <Route path="guide" element={<Guide />} />
        <Route path="demo" element={<Demo />} />
      </Route>

      {/* Admin routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requireAdmin>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="subjects" element={<Subjects />} />
        <Route path="addquestions" element={<AddQuestions />} />
        <Route path="questionlist" element={<QuestionList />} />
        <Route path="weeks/schedule" element={<WeekSchedule />} />
        <Route path="weeks/current" element={<CurrentSchedules />} />
        <Route path="students" element={<StudentList />} />
        <Route path="settings" element={<Settings />} />
        <Route path="addstudent" element={<AddStudents />} />
        <Route path="studentlist" element={<StudentList />} />
        <Route path="reviewer-links" element={<ReviewerLinks />} />
        <Route path="reports" element={<Analytics />} />
        <Route
          path="reports/student/:studentId"
          element={<StudentPerformanceDetail />}
        />
      </Route>

      {/* Redirect root to appropriate dashboard */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            {({ isAdmin }) => (
              <Navigate
                to={isAdmin ? "/admin/dashboard" : "/student/dashboard"}
                replace
              />
            )}
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default App;

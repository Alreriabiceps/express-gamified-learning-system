import React, { useState, useEffect, useMemo } from "react";
import {
  MdSearch,
  MdFilterList,
  MdEdit,
  MdDelete,
  MdAdd,
  MdVisibility,
  MdClose,
  MdCheck,
  MdCheckCircle,
  MdClear,
  MdViewList,
  MdSort,
  MdFileDownload,
  MdRefresh,
  MdArrowUpward,
  MdArrowDownward,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useGuideMode } from "../../../../contexts/GuideModeContext";

const COLUMN_OPTIONS = [
  { key: "firstName", label: "First Name", sortable: true },
  { key: "middleName", label: "Middle Name", sortable: true },
  { key: "lastName", label: "Last Name", sortable: true },
  { key: "email", label: "Email", sortable: true },
  { key: "studentId", label: "Student ID", sortable: true },
  { key: "track", label: "Track", sortable: true },
  { key: "section", label: "Section", sortable: true },
  { key: "yearLevel", label: "Year Level", sortable: true },
  { key: "isActive", label: "Status", sortable: true },
  { key: "isApproved", label: "Approval", sortable: true },
  { key: "lastLogin", label: "Last Login", sortable: true },
  { key: "totalPoints", label: "Total Points", sortable: true },
  { key: "createdAt", label: "Created Date", sortable: true },
];

const COLUMN_DEFAULTS = [
  "firstName",
  "lastName",
  "email",
  "studentId",
  "track",
  "section",
  "yearLevel",
  "isActive",
  "isApproved",
  "totalPoints",
];

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

const StudentList = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterTrack, setFilterTrack] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterApproval, setFilterApproval] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState(COLUMN_DEFAULTS);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [viewMode, setViewMode] = useState("table");
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const [refreshing, setRefreshing] = useState(false);
  const { guideMode } = useGuideMode();

  const backendurl = import.meta.env.VITE_BACKEND_URL;

  // Memoized filtered and sorted students
  const filteredAndSortedStudents = useMemo(() => {
    let filtered = students;

    // Apply filters
    if (searchTerm) {
      filtered = filtered.filter(
        (student) =>
          student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.studentId.toString().includes(searchTerm) ||
          (student.email &&
            student.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (student.section &&
            student.section.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (filterGrade) {
      filtered = filtered.filter(
        (student) =>
          student.yearLevel === filterGrade ||
          student.grade === filterGrade ||
          (student.yearLevel && student.yearLevel.includes(filterGrade))
      );
    }

    if (filterTrack) {
      filtered = filtered.filter((student) => student.track === filterTrack);
    }

    if (filterSection) {
      filtered = filtered.filter(
        (student) => student.section === filterSection
      );
    }

    if (filterStatus) {
      filtered = filtered.filter((student) =>
        filterStatus === "active" ? student.isActive : !student.isActive
      );
    }

    if (filterApproval) {
      filtered = filtered.filter((student) =>
        filterApproval === "approved" ? student.isApproved : !student.isApproved
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle different data types
        if (sortConfig.key === "totalPoints") {
          aValue = parseInt(aValue) || 0;
          bValue = parseInt(bValue) || 0;
        } else if (
          sortConfig.key === "createdAt" ||
          sortConfig.key === "lastLogin"
        ) {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        } else if (typeof aValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [
    students,
    searchTerm,
    filterGrade,
    filterTrack,
    filterSection,
    filterStatus,
    filterApproval,
    sortConfig,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedStudents.length / itemsPerPage);
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedStudents.slice(
      startIndex,
      startIndex + itemsPerPage
    );
  }, [filteredAndSortedStudents, currentPage, itemsPerPage]);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [
    searchTerm,
    filterGrade,
    filterTrack,
    filterSection,
    filterStatus,
    filterApproval,
  ]);

  // Close column dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showColumnDropdown && !event.target.closest(".column-dropdown")) {
        setShowColumnDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showColumnDropdown]);

  const fetchStudents = async (showRefresh = false) => {
    try {
      setLoading(!showRefresh);
      setRefreshing(showRefresh);
      setError("");
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${backendurl}/api/admin/students`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch students");
      }

      const data = await response.json();
      console.log("Student data received:", data[0]); // Debug: see student structure
      setStudents(data);
    } catch (err) {
      console.error("Error fetching students:", err);
      setError(err.message || "Failed to load students");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const handleEditStudent = (student) => {
    setEditingStudent(student._id);
    setEditForm({
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      grade: student.grade,
      section: student.section,
      track: student.track,
      yearLevel: student.yearLevel,
    });
  };

  const handleSaveEdit = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${backendurl}/api/admin/students/${editingStudent}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(editForm),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update student");
      }

      await fetchStudents();
      setEditingStudent(null);
      setEditForm({});
    } catch (err) {
      console.error("Error updating student:", err);
      setError(err.message || "Failed to update student");
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm("Are you sure you want to delete this student?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${backendurl}/api/admin/students/${studentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete student");
      }

      await fetchStudents();
    } catch (err) {
      console.error("Error deleting student:", err);
      setError(err.message || "Failed to delete student");
    }
  };

  const handleSelectStudent = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAllStudents = () => {
    if (selectedStudents.length === paginatedStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(paginatedStudents.map((student) => student._id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedStudents.length === 0) {
      alert("No students selected");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedStudents.length} students?`
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${backendurl}/api/admin/students/bulk-delete`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ studentIds: selectedStudents }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete students");
      }

      await fetchStudents();
      setSelectedStudents([]);
    } catch (err) {
      console.error("Error deleting students:", err);
      setError(err.message || "Failed to delete students");
    }
  };

  const handleBulkStatusChange = async (status) => {
    if (selectedStudents.length === 0) {
      alert("No students selected");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${backendurl}/api/admin/students/bulk-status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            studentIds: selectedStudents,
            isActive: status,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update student status");
      }

      await fetchStudents();
      setSelectedStudents([]);
    } catch (err) {
      console.error("Error updating student status:", err);
      setError(err.message || "Failed to update student status");
    }
  };

  // Handle student approval
  const handleApproveStudent = async (studentId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${backendurl}/api/student-approval/${studentId}/approve`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to approve student");
      }

      await fetchStudents();
      setSuccess("Student approved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error approving student:", err);
      setError(err.message || "Failed to approve student");
    }
  };

  // Handle student rejection
  const handleRejectStudent = async (studentId) => {
    if (
      !window.confirm(
        "Are you sure you want to reject this student? This will permanently delete their account."
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${backendurl}/api/student-approval/${studentId}/reject`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to reject student");
      }

      await fetchStudents();
      setSuccess("Student rejected successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error rejecting student:", err);
      setError(err.message || "Failed to reject student");
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterGrade("");
    setFilterTrack("");
    setFilterSection("");
    setFilterStatus("");
    setFilterApproval("");
    setSortConfig({ key: "", direction: "" });
  };

  const getUniqueValues = (key) => {
    const values = students
      .map((student) => student[key])
      .filter((value) => value !== null && value !== undefined && value !== "");
    const uniqueValues = [...new Set(values)];
    return uniqueValues;
  };

  const toggleColumn = (columnKey) => {
    setVisibleColumns((prev) =>
      prev.includes(columnKey)
        ? prev.filter((col) => col !== columnKey)
        : [...prev, columnKey]
    );
  };

  const isColumnVisible = (columnKey) => {
    return visibleColumns.includes(columnKey);
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey)
      return <MdSort className="w-3 h-3 opacity-50" />;
    return sortConfig.direction === "asc" ? (
      <MdArrowUpward className="w-3 h-3 text-primary" />
    ) : (
      <MdArrowDownward className="w-3 h-3 text-primary" />
    );
  };

  // Student Card Component for mobile view
  const StudentCard = ({ student }) => (
    <div className="card bg-base-100 p-4 mb-4 border">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={selectedStudents.includes(student._id)}
            onChange={() => handleSelectStudent(student._id)}
          />
          <div className="badge badge-primary text-xs">{student.studentId}</div>
          <span
            className={`badge badge-xs ${
              student.isActive ? "badge-success" : "badge-error"
            }`}
          >
            {student.isActive ? "Active" : "Inactive"}
          </span>
          <span
            className={`badge badge-xs ${
              student.isApproved ? "badge-success" : "badge-warning"
            }`}
          >
            {student.isApproved ? "Approved" : "Pending"}
          </span>
        </div>
        <div className="flex gap-1">
          {/* Approval buttons for unapproved students */}
          {!student.isApproved && (
            <>
              <button
                className="btn btn-success btn-xs"
                onClick={() => handleApproveStudent(student._id)}
                title="Approve Student"
              >
                <MdCheck className="w-3 h-3" />
              </button>
              <button
                className="btn btn-error btn-xs"
                onClick={() => handleRejectStudent(student._id)}
                title="Reject Student"
              >
                <MdClose className="w-3 h-3" />
              </button>
            </>
          )}

          <button
            className="btn btn-ghost btn-xs"
            onClick={() => handleEditStudent(student)}
          >
            <MdEdit className="w-3 h-3" />
          </button>
          <button
            className="btn btn-ghost btn-xs text-error"
            onClick={() => handleDeleteStudent(student._id)}
          >
            <MdDelete className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <h3 className="font-semibold text-sm">
            {student.firstName} {student.lastName}
          </h3>
          <p className="text-xs text-base-content/70">{student.email}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="font-medium">Track:</span>
            <br />
            <span className="text-base-content/70">{student.track}</span>
          </div>
          <div>
            <span className="font-medium">Section:</span>
            <br />
            <span className="text-base-content/70">{student.section}</span>
          </div>
          <div>
            <span className="font-medium">Year Level:</span>
            <br />
            <span className="text-base-content/70">{student.yearLevel}</span>
          </div>
          <div>
            <span className="font-medium">Points:</span>
            <br />
            <span className="text-base-content/70 font-mono">
              {student.totalPoints || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center py-12">
            <div className="loading loading-spinner loading-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="alert alert-error">
            <span>{error}</span>
            <button className="btn btn-sm" onClick={() => fetchStudents()}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-base-200 rounded-lg shadow-lg p-3 sm:p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary">
                Student List
              </h1>
              <p className="text-xs sm:text-sm text-base-content/70 mt-1">
                Manage student accounts and information ({students.length}{" "}
                total)
              </p>
            </div>

            {/* Success Alert */}
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

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {/* View Mode Toggle (Mobile) */}
              <div className="flex sm:hidden">
                <button
                  className={`btn btn-sm flex-1 ${
                    viewMode === "table" ? "btn-primary" : "btn-outline"
                  }`}
                  onClick={() => setViewMode("table")}
                >
                  Table
                </button>
                <button
                  className={`btn btn-sm flex-1 ${
                    viewMode === "cards" ? "btn-primary" : "btn-outline"
                  }`}
                  onClick={() => setViewMode("cards")}
                >
                  Cards
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  className="btn btn-ghost btn-sm gap-1"
                  onClick={() => fetchStudents(true)}
                  disabled={refreshing}
                >
                  <MdRefresh
                    className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`}
                  />
                  <span className="hidden sm:inline">Refresh</span>
                </button>

                <div className="relative column-dropdown">
                  <button
                    className="btn btn-secondary btn-sm gap-1 sm:gap-2 flex-1 sm:flex-none"
                    onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                    aria-label="Show/Hide Columns"
                    title="Show/Hide Columns"
                  >
                    <MdVisibility className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-xs sm:text-sm">Columns</span>
                  </button>

                  {showColumnDropdown && (
                    <div className="absolute top-full right-0 mt-2 w-56 sm:w-64 bg-base-100 rounded-lg shadow-lg border z-50 max-h-80 overflow-y-auto">
                      <div className="p-3">
                        <h3 className="font-medium text-sm mb-3">
                          Toggle Columns
                        </h3>
                        <div className="space-y-2">
                          {COLUMN_OPTIONS.map((column) => (
                            <label
                              key={column.key}
                              className="flex items-center gap-2 cursor-pointer hover:bg-base-200 p-1 rounded"
                            >
                              <input
                                type="checkbox"
                                className="checkbox checkbox-xs"
                                checked={isColumnVisible(column.key)}
                                onChange={() => toggleColumn(column.key)}
                              />
                              <span className="text-sm">{column.label}</span>
                            </label>
                          ))}
                        </div>
                        <div className="pt-3 mt-3 border-t">
                          <button
                            className="btn btn-xs btn-outline w-full"
                            onClick={() => setShowColumnDropdown(false)}
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  className="btn btn-primary btn-sm gap-1 sm:gap-2 flex-1 sm:flex-none"
                  onClick={() => navigate("/admin/addstudent")}
                >
                  <MdAdd className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm">Add Student</span>
                </button>
              </div>
            </div>
          </div>

          {guideMode && (
            <details className="mb-4 sm:mb-6 bg-info/10 border border-info rounded p-3 sm:p-4">
              <summary className="cursor-pointer font-medium text-sm sm:text-base text-info mb-1">
                How to use the Student List page?
              </summary>
              <ol className="mt-2 text-xs sm:text-sm text-base-content list-decimal list-inside space-y-1">
                <li>
                  Use the <b>search</b> box to find students by name, ID, email,
                  or section.
                </li>
                <li>
                  Filter by <b>track</b>, <b>year level</b>, or <b>status</b>{" "}
                  using the dropdowns.
                </li>
                <li>
                  Click column headers to <b>sort</b> the data
                  (ascending/descending).
                </li>
                <li>
                  Use <b>Columns</b> to show or hide table columns in real time.
                </li>
                <li>
                  Select students and use <b>bulk actions</b> to
                  activate/deactivate or delete multiple students.
                </li>

                <li>
                  On mobile, switch between <b>Table</b> and <b>Cards</b> view
                  for better readability.
                </li>
              </ol>
            </details>
          )}

          {/* Search and Filters */}
          <div className="card bg-base-100 p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div className="form-control flex-1">
                <div className="input-group">
                  <span className="bg-base-200">
                    <MdSearch className="w-4 h-4 sm:w-5 sm:h-5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search students by name, ID, email, or section..."
                    className="input input-bordered input-sm sm:input-md flex-1 bg-base-100 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setSearchTerm("")}
                    >
                      <MdClose className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <button
                className="btn btn-outline btn-sm gap-2 w-full sm:w-auto"
                onClick={() => setShowFilters(!showFilters)}
              >
                <MdFilterList className="w-4 h-4" />
                <span className="text-sm">Filters</span>
                {(filterGrade ||
                  filterTrack ||
                  filterSection ||
                  filterStatus ||
                  filterApproval) && (
                  <div className="badge badge-primary badge-sm">Active</div>
                )}
              </button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4 p-3 sm:p-4 bg-base-200 rounded-lg">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-xs sm:text-sm">Grade</span>
                  </label>
                  <select
                    className="select select-bordered select-sm bg-base-100 text-sm"
                    value={filterGrade}
                    onChange={(e) => setFilterGrade(e.target.value)}
                  >
                    <option value="">All Grades</option>
                    {getUniqueValues("yearLevel").map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-xs sm:text-sm">Track</span>
                  </label>
                  <select
                    className="select select-bordered select-sm bg-base-100 text-sm"
                    value={filterTrack}
                    onChange={(e) => setFilterTrack(e.target.value)}
                  >
                    <option value="">All Tracks</option>
                    {getUniqueValues("track").map((track) => (
                      <option key={track} value={track}>
                        {track}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-xs sm:text-sm">
                      Section
                    </span>
                  </label>
                  <select
                    className="select select-bordered select-sm bg-base-100 text-sm"
                    value={filterSection}
                    onChange={(e) => setFilterSection(e.target.value)}
                  >
                    <option value="">All Sections</option>
                    {getUniqueValues("section").map((section) => (
                      <option key={section} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-xs sm:text-sm">
                      Status
                    </span>
                  </label>
                  <select
                    className="select select-bordered select-sm bg-base-100 text-sm"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-xs sm:text-sm">
                      Approval
                    </span>
                  </label>
                  <select
                    className="select select-bordered select-sm bg-base-100 text-sm"
                    value={filterApproval}
                    onChange={(e) => setFilterApproval(e.target.value)}
                  >
                    <option value="">All Approvals</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-xs sm:text-sm">
                      Actions
                    </span>
                  </label>
                  <button
                    className="btn btn-outline btn-sm text-sm"
                    onClick={clearFilters}
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bulk Actions */}
          {selectedStudents.length > 0 && (
            <div className="card bg-base-100 p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <div>
                  <span className="font-medium text-sm sm:text-base">
                    {selectedStudents.length} student
                    {selectedStudents.length !== 1 ? "s" : ""} selected
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <button
                    className="btn btn-success btn-sm gap-2 flex-1 sm:flex-none"
                    onClick={() => handleBulkStatusChange(true)}
                  >
                    Activate
                  </button>
                  <button
                    className="btn btn-warning btn-sm gap-2 flex-1 sm:flex-none"
                    onClick={() => handleBulkStatusChange(false)}
                  >
                    Deactivate
                  </button>
                  <button
                    className="btn btn-error btn-sm gap-2 flex-1 sm:flex-none"
                    onClick={handleBulkDelete}
                  >
                    <MdDelete className="w-4 h-4" />
                    <span className="text-sm">Delete</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Results Summary and Pagination Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div className="text-sm text-base-content/70">
              Showing {paginatedStudents.length} of{" "}
              {filteredAndSortedStudents.length} students
              {searchTerm ||
              filterGrade ||
              filterTrack ||
              filterSection ||
              filterStatus ||
              filterApproval
                ? ` (filtered from ${students.length} total)`
                : ""}
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm">Show:</label>
              <select
                className="select select-bordered select-sm bg-base-100 text-sm"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Students Display */}
          <div className="card bg-base-100 p-3 sm:p-4">
            {filteredAndSortedStudents.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-base-content/70 text-sm sm:text-base">
                  No students found matching your criteria.
                </p>
                {(searchTerm ||
                  filterGrade ||
                  filterTrack ||
                  filterSection ||
                  filterStatus ||
                  filterApproval) && (
                  <button
                    className="btn btn-outline btn-sm mt-4"
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                {(viewMode === "cards" || window.innerWidth < 640) && (
                  <div className="block sm:hidden">
                    {paginatedStudents.map((student) => (
                      <StudentCard key={student._id} student={student} />
                    ))}
                  </div>
                )}

                {/* Desktop Table View */}
                {(viewMode === "table" || window.innerWidth >= 640) && (
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="table table-zebra w-full text-sm">
                      <thead>
                        <tr>
                          <th>
                            <input
                              type="checkbox"
                              className="checkbox checkbox-sm"
                              checked={
                                selectedStudents.length ===
                                  paginatedStudents.length &&
                                paginatedStudents.length > 0
                              }
                              onChange={handleSelectAllStudents}
                            />
                          </th>
                          <th
                            className="cursor-pointer hover:bg-base-200"
                            onClick={() => handleSort("studentId")}
                          >
                            <div className="flex items-center gap-1">
                              Student ID
                              {getSortIcon("studentId")}
                            </div>
                          </th>
                          {isColumnVisible("firstName") && (
                            <th
                              className="cursor-pointer hover:bg-base-200"
                              onClick={() => handleSort("firstName")}
                            >
                              <div className="flex items-center gap-1">
                                First Name
                                {getSortIcon("firstName")}
                              </div>
                            </th>
                          )}
                          {isColumnVisible("lastName") && (
                            <th
                              className="cursor-pointer hover:bg-base-200"
                              onClick={() => handleSort("lastName")}
                            >
                              <div className="flex items-center gap-1">
                                Last Name
                                {getSortIcon("lastName")}
                              </div>
                            </th>
                          )}
                          {isColumnVisible("email") && (
                            <th
                              className="hidden lg:table-cell cursor-pointer hover:bg-base-200"
                              onClick={() => handleSort("email")}
                            >
                              <div className="flex items-center gap-1">
                                Email
                                {getSortIcon("email")}
                              </div>
                            </th>
                          )}
                          {isColumnVisible("track") && (
                            <th
                              className="hidden md:table-cell cursor-pointer hover:bg-base-200"
                              onClick={() => handleSort("track")}
                            >
                              <div className="flex items-center gap-1">
                                Track
                                {getSortIcon("track")}
                              </div>
                            </th>
                          )}
                          {isColumnVisible("section") && (
                            <th
                              className="hidden lg:table-cell cursor-pointer hover:bg-base-200"
                              onClick={() => handleSort("section")}
                            >
                              <div className="flex items-center gap-1">
                                Section
                                {getSortIcon("section")}
                              </div>
                            </th>
                          )}
                          {isColumnVisible("yearLevel") && (
                            <th
                              className="hidden md:table-cell cursor-pointer hover:bg-base-200"
                              onClick={() => handleSort("yearLevel")}
                            >
                              <div className="flex items-center gap-1">
                                Year Level
                                {getSortIcon("yearLevel")}
                              </div>
                            </th>
                          )}
                          {isColumnVisible("isActive") && (
                            <th
                              className="hidden lg:table-cell cursor-pointer hover:bg-base-200"
                              onClick={() => handleSort("isActive")}
                            >
                              <div className="flex items-center gap-1">
                                Status
                                {getSortIcon("isActive")}
                              </div>
                            </th>
                          )}
                          {isColumnVisible("isApproved") && (
                            <th
                              className="hidden lg:table-cell cursor-pointer hover:bg-base-200"
                              onClick={() => handleSort("isApproved")}
                            >
                              <div className="flex items-center gap-1">
                                Approval
                                {getSortIcon("isApproved")}
                              </div>
                            </th>
                          )}
                          {isColumnVisible("totalPoints") && (
                            <th
                              className="hidden lg:table-cell cursor-pointer hover:bg-base-200"
                              onClick={() => handleSort("totalPoints")}
                            >
                              <div className="flex items-center gap-1">
                                Points
                                {getSortIcon("totalPoints")}
                              </div>
                            </th>
                          )}
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedStudents.map((student) => (
                          <tr key={student._id}>
                            <td>
                              <input
                                type="checkbox"
                                className="checkbox checkbox-sm"
                                checked={selectedStudents.includes(student._id)}
                                onChange={() =>
                                  handleSelectStudent(student._id)
                                }
                              />
                            </td>
                            <td className="font-mono text-xs">
                              {student.studentId}
                            </td>

                            {isColumnVisible("firstName") && (
                              <td className="text-xs">
                                {editingStudent === student._id ? (
                                  <input
                                    type="text"
                                    className="input input-xs input-bordered"
                                    value={editForm.firstName}
                                    onChange={(e) =>
                                      setEditForm({
                                        ...editForm,
                                        firstName: e.target.value,
                                      })
                                    }
                                    placeholder="First Name"
                                  />
                                ) : (
                                  student.firstName
                                )}
                              </td>
                            )}

                            {isColumnVisible("lastName") && (
                              <td className="text-xs">
                                {editingStudent === student._id ? (
                                  <input
                                    type="text"
                                    className="input input-xs input-bordered"
                                    value={editForm.lastName}
                                    onChange={(e) =>
                                      setEditForm({
                                        ...editForm,
                                        lastName: e.target.value,
                                      })
                                    }
                                    placeholder="Last Name"
                                  />
                                ) : (
                                  student.lastName
                                )}
                              </td>
                            )}

                            {isColumnVisible("email") && (
                              <td className="hidden lg:table-cell">
                                <span className="text-xs">{student.email}</span>
                              </td>
                            )}

                            {isColumnVisible("track") && (
                              <td className="hidden md:table-cell">
                                {editingStudent === student._id ? (
                                  <select
                                    className="select select-xs select-bordered"
                                    value={editForm.track}
                                    onChange={(e) =>
                                      setEditForm({
                                        ...editForm,
                                        track: e.target.value,
                                      })
                                    }
                                  >
                                    <option value="Academic Track">
                                      Academic Track
                                    </option>
                                    <option value="Technical-Professional Track">
                                      Technical-Professional Track
                                    </option>
                                  </select>
                                ) : (
                                  <span className="text-xs">
                                    {student.track}
                                  </span>
                                )}
                              </td>
                            )}

                            {isColumnVisible("section") && (
                              <td className="hidden lg:table-cell">
                                {editingStudent === student._id ? (
                                  <input
                                    type="text"
                                    className="input input-xs input-bordered"
                                    value={editForm.section}
                                    onChange={(e) =>
                                      setEditForm({
                                        ...editForm,
                                        section: e.target.value,
                                      })
                                    }
                                  />
                                ) : (
                                  <span className="text-xs">
                                    {student.section}
                                  </span>
                                )}
                              </td>
                            )}

                            {isColumnVisible("yearLevel") && (
                              <td className="hidden md:table-cell">
                                {editingStudent === student._id ? (
                                  <select
                                    className="select select-xs select-bordered"
                                    value={editForm.yearLevel || editForm.grade}
                                    onChange={(e) =>
                                      setEditForm({
                                        ...editForm,
                                        yearLevel: e.target.value,
                                        grade: e.target.value,
                                      })
                                    }
                                  >
                                    <option value="Grade 11">Grade 11</option>
                                    <option value="Grade 12">Grade 12</option>
                                  </select>
                                ) : (
                                  <span className="text-xs">
                                    {student.yearLevel}
                                  </span>
                                )}
                              </td>
                            )}

                            {isColumnVisible("isActive") && (
                              <td className="hidden lg:table-cell">
                                <span
                                  className={`badge badge-xs ${
                                    student.isActive
                                      ? "badge-success"
                                      : "badge-error"
                                  }`}
                                >
                                  {student.isActive ? "Active" : "Inactive"}
                                </span>
                              </td>
                            )}
                            {isColumnVisible("isApproved") && (
                              <td className="hidden lg:table-cell">
                                <span
                                  className={`badge badge-xs ${
                                    student.isApproved
                                      ? "badge-success"
                                      : "badge-warning"
                                  }`}
                                >
                                  {student.isApproved ? "Approved" : "Pending"}
                                </span>
                              </td>
                            )}

                            {isColumnVisible("totalPoints") && (
                              <td className="hidden lg:table-cell">
                                <span className="font-mono text-xs">
                                  {student.totalPoints || 0}
                                </span>
                              </td>
                            )}

                            <td>
                              <div className="flex gap-1">
                                {editingStudent === student._id ? (
                                  <>
                                    <button
                                      className="btn btn-success btn-xs"
                                      onClick={handleSaveEdit}
                                    >
                                      <MdCheck className="w-3 h-3" />
                                    </button>
                                    <button
                                      className="btn btn-ghost btn-xs"
                                      onClick={() => setEditingStudent(null)}
                                    >
                                      <MdClose className="w-3 h-3" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    {/* Approval buttons for unapproved students */}
                                    {!student.isApproved && (
                                      <>
                                        <button
                                          className="btn btn-success btn-xs"
                                          onClick={() =>
                                            handleApproveStudent(student._id)
                                          }
                                          title="Approve Student"
                                        >
                                          <MdCheck className="w-3 h-3" />
                                        </button>
                                        <button
                                          className="btn btn-error btn-xs"
                                          onClick={() =>
                                            handleRejectStudent(student._id)
                                          }
                                          title="Reject Student"
                                        >
                                          <MdClose className="w-3 h-3" />
                                        </button>
                                      </>
                                    )}

                                    <button
                                      className="btn btn-ghost btn-xs"
                                      onClick={() => handleEditStudent(student)}
                                    >
                                      <MdEdit className="w-3 h-3" />
                                    </button>
                                    <button
                                      className="btn btn-ghost btn-xs text-error"
                                      onClick={() =>
                                        handleDeleteStudent(student._id)
                                      }
                                    >
                                      <MdDelete className="w-3 h-3" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
              <div className="text-sm text-base-content/70">
                Page {currentPage} of {totalPages}
              </div>

              <div className="join">
                <button
                  className="join-item btn btn-sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                >
                  Previous
                </button>

                {/* Page Numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      className={`join-item btn btn-sm ${
                        currentPage === pageNum ? "btn-active" : ""
                      }`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  className="join-item btn btn-sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentList;

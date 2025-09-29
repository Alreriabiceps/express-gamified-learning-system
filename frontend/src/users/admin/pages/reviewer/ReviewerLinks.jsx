import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdSave,
  MdClose,
  MdSearch,
  MdFilterList,
  MdViewList,
  MdGridView,
  MdFileDownload,
  MdRefresh,
  MdAnalytics,
  MdSelectAll,
  MdClear,
  MdCheckBox,
  MdCheckBoxOutlineBlank,
  MdInfo,
  MdLink,
  MdBookmark,
  MdVisibility,
  MdSort,
  MdExpandMore,
  MdExpandLess,
  MdWarning,
  MdCheckCircle,
  MdError,
} from "react-icons/md";
import {
  FaFilePdf,
  FaFileWord,
  FaFilePowerpoint,
  FaChartPie,
  FaUsers,
  FaBookOpen,
} from "react-icons/fa";
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
} from "recharts";
// Remove unused import
// import { useGuideMode } from '../../../../contexts/GuideModeContext';

const FILE_TYPES = ["pdf", "docx", "pptx"];
const SUBJECTS = [
  "Effective Communication",
  "Life Skills",
  "General Mathematics",
  "General Science",
  "Pag-aaral ng Kasaysayan",
];

const SORT_OPTIONS = [
  { value: "title", label: "Title A-Z" },
  { value: "-title", label: "Title Z-A" },
  { value: "-createdAt", label: "Newest First" },
  { value: "createdAt", label: "Oldest First" },
  { value: "subject", label: "Subject A-Z" },
  { value: "fileType", label: "File Type" },
];

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7c7c", "#8dd1e1"];

const ReviewerLinks = () => {
  // Core state
  const [reviewerLinks, setReviewerLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState("dashboard");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'table'

  // Form state
  const [formData, setFormData] = useState({
    link: "",
    fileType: "pdf",
    title: "",
    description: "",
    subject: SUBJECTS[0],
    tags: [],
  });
  const [editingId, setEditingId] = useState(null);

  // Advanced filtering and search
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterFileType, setFilterFileType] = useState("");
  const [sortBy, setSortBy] = useState("-createdAt");

  // Bulk operations
  const [selectedLinks, setSelectedLinks] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);

  // Remove unused guideMode
  // const { guideMode } = useGuideMode();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "";

  // Fetch reviewer links
  const fetchLinks = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");

      const response = await fetch(`${backendUrl}/api/admin/reviewer-links`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch reviewer links");
      const data = await response.json();
      setReviewerLinks(data);
    } catch (err) {
      console.error("Error fetching reviewer links:", err);
      setError(err.message || "Failed to load reviewer links");
    } finally {
      setLoading(false);
    }
  }, [backendUrl]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

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
    const totalLinks = reviewerLinks.length;
    const linksBySubject = SUBJECTS.map((subject) => ({
      name: subject,
      count: reviewerLinks.filter((link) => link.subject === subject).length,
    }));

    const linksByFileType = FILE_TYPES.map((type) => ({
      name: type.toUpperCase(),
      count: reviewerLinks.filter((link) => link.fileType === type).length,
    }));

    const recentlyAdded = reviewerLinks.filter((link) => {
      const addedDate = new Date(link.createdAt || Date.now());
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return addedDate > weekAgo;
    }).length;

    return {
      total: totalLinks,
      linksBySubject: linksBySubject.filter((item) => item.count > 0),
      linksByFileType: linksByFileType.filter((item) => item.count > 0),
      recentlyAdded,
      mostActiveSubject: linksBySubject.reduce(
        (max, current) => (current.count > max.count ? current : max),
        { count: 0 }
      ),
    };
  }, [reviewerLinks]);

  // Enhanced filtering and sorting
  const filteredAndSortedLinks = useMemo(() => {
    let filtered = reviewerLinks.filter((link) => {
      const matchesSearch =
        link.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.tags.some((tag) =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        );
      const matchesSubject = !filterSubject || link.subject === filterSubject;
      const matchesFileType =
        !filterFileType || link.fileType === filterFileType;

      return matchesSearch && matchesSubject && matchesFileType;
    });

    // Sort
    filtered.sort((a, b) => {
      const [field, direction] = sortBy.startsWith("-")
        ? [sortBy.slice(1), "desc"]
        : [sortBy, "asc"];

      let aValue = a[field];
      let bValue = b[field];

      if (field === "createdAt") {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (direction === "desc") {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    });

    return filtered;
  }, [reviewerLinks, searchTerm, filterSubject, filterFileType, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedLinks.length / itemsPerPage);
  const paginatedLinks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedLinks.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedLinks, currentPage, itemsPerPage]);

  // Form handlers
  const handleInputChange = (field, value) => {
    if (field === "tags") {
      value = value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      link: "",
      fileType: "pdf",
      title: "",
      description: "",
      subject: SUBJECTS[0],
      tags: [],
    });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const url = editingId
        ? `${backendUrl}/api/admin/reviewer-links/${editingId}`
        : `${backendUrl}/api/admin/reviewer-links`;

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok)
        throw new Error(
          `Failed to ${editingId ? "update" : "add"} reviewer link`
        );

      await fetchLinks();
      resetForm();
      setSuccess(
        `Reviewer link ${editingId ? "updated" : "added"} successfully!`
      );
      setActiveTab("list");
    } catch (err) {
      console.error("Error submitting form:", err);
      setError(
        err.message || `Failed to ${editingId ? "update" : "add"} reviewer link`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (link) => {
    setFormData({
      link: link.link,
      fileType: link.fileType,
      title: link.title,
      description: link.description,
      subject: link.subject,
      tags: link.tags || [],
    });
    setEditingId(link._id);
    setActiveTab("form");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this reviewer link?"))
      return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${backendUrl}/api/admin/reviewer-links/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to delete reviewer link");

      await fetchLinks();
      setSuccess("Reviewer link deleted successfully!");
    } catch (err) {
      console.error("Error deleting link:", err);
      setError(err.message || "Failed to delete reviewer link");
    }
  };

  // Bulk operations
  const handleBulkSelect = (type) => {
    if (type === "all") {
      setSelectedLinks(filteredAndSortedLinks.map((link) => link._id));
    } else if (type === "none") {
      setSelectedLinks([]);
    } else if (type === "page") {
      setSelectedLinks(paginatedLinks.map((link) => link._id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLinks.length === 0) {
      setError("No links selected");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedLinks.length} reviewer links?`
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const promises = selectedLinks.map((id) =>
        fetch(`${backendUrl}/api/admin/reviewer-links/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      await Promise.all(promises);
      await fetchLinks();
      setSelectedLinks([]);
      setSuccess(
        `${selectedLinks.length} reviewer links deleted successfully!`
      );
    } catch (err) {
      console.error("Error in bulk delete:", err);
      setError("Failed to delete some reviewer links");
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterSubject("");
    setFilterFileType("");
    setSortBy("-createdAt");
    setCurrentPage(1);
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case "pdf":
        return <FaFilePdf className="text-red-500" />;
      case "docx":
        return <FaFileWord className="text-blue-500" />;
      case "pptx":
        return <FaFilePowerpoint className="text-orange-500" />;
      default:
        return <MdLink className="text-gray-500" />;
    }
  };

  // Dashboard component
  const DashboardView = () => (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold">{stats.total}</h3>
                <p className="text-blue-100">Total Links</p>
              </div>
              <MdLink className="text-4xl text-blue-200" />
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold">{stats.recentlyAdded}</h3>
                <p className="text-green-100">Added This Week</p>
              </div>
              <MdAdd className="text-4xl text-green-200" />
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold">{SUBJECTS.length}</h3>
                <p className="text-purple-100">Subjects Covered</p>
              </div>
              <FaBookOpen className="text-4xl text-purple-200" />
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  {stats.mostActiveSubject?.name || "N/A"}
                </h3>
                <p className="text-orange-100">Most Active Subject</p>
              </div>
              <MdAnalytics className="text-4xl text-orange-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h3 className="card-title text-lg font-bold mb-4">
              Links by Subject
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.linksBySubject}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {stats.linksBySubject.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h3 className="card-title text-lg font-bold mb-4">
              Links by File Type
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.linksByFileType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Links */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-lg font-bold mb-4">Recent Links</h3>
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Subject</th>
                  <th>File Type</th>
                  <th>Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviewerLinks.slice(0, 5).map((link) => (
                  <tr key={link._id}>
                    <td className="font-semibold">{link.title}</td>
                    <td>
                      <span className="badge badge-outline">
                        {link.subject}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {getFileIcon(link.fileType)}
                        <span className="text-sm">
                          {link.fileType.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="text-sm text-base-content/70">
                      {new Date(link.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          className="btn btn-xs btn-ghost"
                          onClick={() => handleEdit(link)}
                        >
                          <MdEdit />
                        </button>
                        <a
                          href={link.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-xs btn-ghost"
                        >
                          <MdVisibility />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  // Form component
  const FormView = () => (
    <div className="max-w-2xl mx-auto">
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold text-primary mb-6">
            <MdAdd className="text-3xl" />
            {editingId ? "Edit Reviewer Link" : "Add New Reviewer Link"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Title *</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                required
                placeholder="Enter title for the reviewer link"
                className="input input-bordered w-full"
              />
            </div>

            {/* Link */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Link (URL) *</span>
              </label>
              <input
                type="url"
                value={formData.link}
                onChange={(e) => handleInputChange("link", e.target.value)}
                required
                placeholder="https://example.com/document.pdf"
                className="input input-bordered w-full"
              />
            </div>

            {/* Subject and File Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Subject *</span>
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => handleInputChange("subject", e.target.value)}
                  className="select select-bordered w-full"
                  required
                >
                  {SUBJECTS.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">File Type *</span>
                </label>
                <select
                  value={formData.fileType}
                  onChange={(e) =>
                    handleInputChange("fileType", e.target.value)
                  }
                  className="select select-bordered w-full"
                  required
                >
                  {FILE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Description *</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                required
                placeholder="Describe the content and purpose of this reviewer material"
                className="textarea textarea-bordered w-full h-24"
              />
            </div>

            {/* Tags */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Tags</span>
                <span className="label-text-alt">Separate with commas</span>
              </label>
              <input
                type="text"
                value={formData.tags.join(", ")}
                onChange={(e) => handleInputChange("tags", e.target.value)}
                placeholder="algebra, exam, 2024, midterm"
                className="input input-bordered w-full"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className={`btn btn-primary flex-1 ${
                  isSubmitting ? "loading" : ""
                }`}
                disabled={isSubmitting}
              >
                <MdSave className="text-lg" />
                {editingId ? "Update Link" : "Add Link"}
              </button>
              <button
                type="button"
                className="btn btn-ghost flex-1"
                onClick={() => {
                  resetForm();
                  setActiveTab("list");
                }}
              >
                <MdClose className="text-lg" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  // List view components
  const TableView = () => (
    <div className="card bg-base-100 shadow-lg">
      <div className="card-body">
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>
                  <label>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={
                        selectedLinks.length === paginatedLinks.length &&
                        paginatedLinks.length > 0
                      }
                      onChange={() =>
                        handleBulkSelect(
                          selectedLinks.length === paginatedLinks.length
                            ? "none"
                            : "page"
                        )
                      }
                    />
                  </label>
                </th>
                <th>Title</th>
                <th>Subject</th>
                <th>File Type</th>
                <th>Link</th>
                <th>Tags</th>
                <th>Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLinks.map((link) => (
                <tr key={link._id}>
                  <td>
                    <label>
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={selectedLinks.includes(link._id)}
                        onChange={() => {
                          setSelectedLinks((prev) =>
                            prev.includes(link._id)
                              ? prev.filter((id) => id !== link._id)
                              : [...prev, link._id]
                          );
                        }}
                      />
                    </label>
                  </td>
                  <td>
                    <div className="font-semibold">{link.title}</div>
                    <div className="text-sm text-base-content/70 truncate max-w-xs">
                      {link.description}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-outline">{link.subject}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {getFileIcon(link.fileType)}
                      <span className="text-sm">
                        {link.fileType.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td>
                    <a
                      href={link.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-xs btn-outline btn-primary"
                    >
                      <MdVisibility /> View
                    </a>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {link.tags.slice(0, 2).map((tag, index) => (
                        <span
                          key={index}
                          className="badge badge-sm badge-ghost"
                        >
                          {tag}
                        </span>
                      ))}
                      {link.tags.length > 2 && (
                        <span className="badge badge-sm">
                          +{link.tags.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-sm text-base-content/70">
                    {new Date(link.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        className="btn btn-xs btn-ghost"
                        onClick={() => handleEdit(link)}
                        title="Edit"
                      >
                        <MdEdit />
                      </button>
                      <button
                        className="btn btn-xs btn-ghost text-error"
                        onClick={() => handleDelete(link._id)}
                        title="Delete"
                      >
                        <MdDelete />
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
  );

  const GridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {paginatedLinks.map((link) => (
        <div
          key={link._id}
          className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow"
        >
          <div className="card-body p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {getFileIcon(link.fileType)}
                <span className="text-sm font-medium">
                  {link.fileType.toUpperCase()}
                </span>
              </div>
              <label>
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={selectedLinks.includes(link._id)}
                  onChange={() => {
                    setSelectedLinks((prev) =>
                      prev.includes(link._id)
                        ? prev.filter((id) => id !== link._id)
                        : [...prev, link._id]
                    );
                  }}
                />
              </label>
            </div>

            {/* Title */}
            <h3 className="card-title text-base mb-2">{link.title}</h3>

            {/* Subject */}
            <div className="mb-2">
              <span className="badge badge-outline badge-sm">
                {link.subject}
              </span>
            </div>

            {/* Description */}
            <p className="text-sm text-base-content/70 mb-3 line-clamp-2">
              {link.description}
            </p>

            {/* Tags */}
            {link.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {link.tags.slice(0, 3).map((tag, index) => (
                  <span key={index} className="badge badge-xs badge-ghost">
                    {tag}
                  </span>
                ))}
                {link.tags.length > 3 && (
                  <span className="badge badge-xs">
                    +{link.tags.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-base-300">
              <span className="text-xs text-base-content/60">
                {new Date(link.createdAt).toLocaleDateString()}
              </span>
              <div className="flex gap-1">
                <a
                  href={link.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-xs btn-primary"
                  title="View Link"
                >
                  <MdVisibility />
                </a>
                <button
                  className="btn btn-xs btn-ghost"
                  onClick={() => handleEdit(link)}
                  title="Edit"
                >
                  <MdEdit />
                </button>
                <button
                  className="btn btn-xs btn-ghost text-error"
                  onClick={() => handleDelete(link._id)}
                  title="Delete"
                >
                  <MdDelete />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const ListView = () => (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4 bg-base-100 p-4 rounded-lg shadow">
        {/* Search */}
        <div className="flex-1">
          <div className="form-control">
            <div className="input-group">
              <input
                type="text"
                placeholder="Search titles, descriptions, or tags..."
                className="input input-bordered flex-1"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className="btn btn-square">
                <MdSearch />
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <select
            className="select select-bordered"
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
          >
            <option value="">All Subjects</option>
            {SUBJECTS.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>

          <select
            className="select select-bordered"
            value={filterFileType}
            onChange={(e) => setFilterFileType(e.target.value)}
          >
            <option value="">All Types</option>
            {FILE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.toUpperCase()}
              </option>
            ))}
          </select>

          <select
            className="select select-bordered"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* View Toggle */}
        <div className="btn-group">
          <button
            className={`btn btn-sm ${viewMode === "grid" ? "btn-active" : ""}`}
            onClick={() => setViewMode("grid")}
          >
            <MdGridView />
          </button>
          <button
            className={`btn btn-sm ${viewMode === "table" ? "btn-active" : ""}`}
            onClick={() => setViewMode("table")}
          >
            <MdViewList />
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedLinks.length > 0 && (
        <div className="alert alert-info">
          <div className="flex-1">
            <span>{selectedLinks.length} items selected</span>
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-sm"
              onClick={() => handleBulkSelect("all")}
            >
              Select All ({filteredAndSortedLinks.length})
            </button>
            <button
              className="btn btn-sm"
              onClick={() => handleBulkSelect("none")}
            >
              Clear Selection
            </button>
            <button className="btn btn-sm btn-error" onClick={handleBulkDelete}>
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : filteredAndSortedLinks.length === 0 ? (
        <div className="text-center py-12">
          <MdInfo className="text-6xl text-base-content/30 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            No reviewer links found
          </h3>
          <p className="text-base-content/70 mb-4">
            {searchTerm || filterSubject || filterFileType
              ? "Try adjusting your search or filters"
              : "Get started by adding your first reviewer link"}
          </p>
          {(searchTerm || filterSubject || filterFileType) && (
            <button className="btn btn-outline" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {viewMode === "grid" ? <GridView /> : <TableView />}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center">
              <div className="btn-group">
                <button
                  className="btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      className={`btn ${
                        currentPage === page ? "btn-active" : ""
                      }`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  className="btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">
            Reviewer Links
          </h1>
          <p className="text-base-content/70">
            Manage educational reviewer materials and resources
          </p>
        </div>

        <div className="flex gap-2 mt-4 lg:mt-0">
          <button
            className="btn btn-outline"
            onClick={() => fetchLinks()}
            title="Refresh"
          >
            <MdRefresh />
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setActiveTab("form");
            }}
          >
            <MdAdd />
            Add New Link
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="alert alert-error mb-6">
          <MdError />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success mb-6">
          <MdCheckCircle />
          <span>{success}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="tabs tabs-boxed bg-base-200 mb-8 justify-center">
        <button
          className={`tab tab-lg ${
            activeTab === "dashboard" ? "tab-active" : ""
          }`}
          onClick={() => setActiveTab("dashboard")}
        >
          <MdAnalytics className="mr-2" />
          Dashboard
        </button>
        <button
          className={`tab tab-lg ${activeTab === "list" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("list")}
        >
          <MdViewList className="mr-2" />
          All Links ({stats.total})
        </button>
        <button
          className={`tab tab-lg ${activeTab === "form" ? "tab-active" : ""}`}
          onClick={() => {
            if (!editingId) resetForm();
            setActiveTab("form");
          }}
        >
          <MdAdd className="mr-2" />
          {editingId ? "Edit Link" : "Add Link"}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "dashboard" && <DashboardView />}
      {activeTab === "list" && <ListView />}
      {activeTab === "form" && <FormView />}
    </div>
  );
};

export default ReviewerLinks;

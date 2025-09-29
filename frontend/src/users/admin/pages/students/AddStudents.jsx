import { useState, useEffect, useCallback } from "react";
import {
  MdAdd,
  MdSave,
  MdClose,
  MdVisibility,
  MdVisibilityOff,
  MdContentCopy,
  MdPreview,
  MdWarning,
} from "react-icons/md";
import { useGuideMode } from "../../../../contexts/GuideModeContext";

const AddStudents = () => {
  const [students, setStudents] = useState([
    {
      firstName: "",
      lastName: "",
      studentId: "",
      grade: "",
      section: "",
      track: "",
      password: "",
    },
  ]);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showPasswords, setShowPasswords] = useState({});
  const [existingStudentIds, setExistingStudentIds] = useState([]);
  const [duplicateIds, setDuplicateIds] = useState(new Set());
  const { guideMode } = useGuideMode();

  const backendurl = import.meta.env.VITE_BACKEND_URL;

  // Auto-save to localStorage
  useEffect(() => {
    const savedData = localStorage.getItem("addStudents_draft");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.length > 0) {
          setStudents(parsed);
        }
      } catch (err) {
        console.error("Failed to load draft:", err);
      }
    }
  }, []);

  // Save draft periodically
  useEffect(() => {
    const timer = setTimeout(() => {
      if (students.some((s) => Object.values(s).some((v) => v.trim() !== ""))) {
        localStorage.setItem("addStudents_draft", JSON.stringify(students));
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [students]);

  const handleStudentChange = (index, field, value) => {
    const updatedStudents = [...students];
    updatedStudents[index][field] = value;
    setStudents(updatedStudents);

    // Clear field-specific errors
    const errorKey = `${index}.${field}`;
    if (fieldErrors[errorKey]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }

    // Real-time validation
    validateField(index, field, value);
  };

  const validateField = (index, field, value) => {
    const errorKey = `${index}.${field}`;
    let newFieldErrors = { ...fieldErrors };

    switch (field) {
      case "firstName":
      case "lastName":
        if (value.trim().length < 2) {
          newFieldErrors[errorKey] = "Must be at least 2 characters";
        } else {
          delete newFieldErrors[errorKey];
        }
        break;
      case "studentId":
        if (!value.trim()) {
          newFieldErrors[errorKey] = "Student ID is required";
        } else if (existingStudentIds.includes(value.trim())) {
          newFieldErrors[errorKey] = "Student ID already exists";
        } else {
          delete newFieldErrors[errorKey];
        }
        break;
      case "password":
        if (value.length < 6) {
          newFieldErrors[errorKey] = "Password must be at least 6 characters";
        } else {
          delete newFieldErrors[errorKey];
        }
        break;
      default:
        if (!value.trim()) {
          newFieldErrors[errorKey] = "This field is required";
        } else {
          delete newFieldErrors[errorKey];
        }
    }

    setFieldErrors(newFieldErrors);
  };

  const checkDuplicateIds = useCallback(() => {
    const ids = students.map((s) => s.studentId.trim()).filter((id) => id);
    const duplicates = new Set();
    const seen = new Set();

    ids.forEach((id) => {
      if (seen.has(id)) {
        duplicates.add(id);
      } else {
        seen.add(id);
      }
    });

    setDuplicateIds(duplicates);
  }, [students]);

  useEffect(() => {
    checkDuplicateIds();
  }, [checkDuplicateIds]);

  useEffect(() => {
    const fetchExistingStudentIds = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await fetch(`${backendurl}/api/admin/students/ids`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setExistingStudentIds(data.studentIds || []);
        }
      } catch (err) {
        console.error("Failed to fetch existing student IDs:", err);
      }
    };

    fetchExistingStudentIds();
  }, [backendurl]);

  const generatePassword = (index) => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    handleStudentChange(index, "password", password);
  };

  const togglePasswordVisibility = (index) => {
    setShowPasswords((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const validateAllFields = () => {
    let newFieldErrors = {};
    let isValid = true;

    students.forEach((student, index) => {
      Object.entries(student).forEach(([field, value]) => {
        const errorKey = `${index}.${field}`;

        if (!value.trim()) {
          newFieldErrors[errorKey] = "This field is required";
          isValid = false;
        } else {
          // Field-specific validation
          switch (field) {
            case "firstName":
            case "lastName":
              if (value.trim().length < 2) {
                newFieldErrors[errorKey] = "Must be at least 2 characters";
                isValid = false;
              }
              break;
            case "password":
              if (value.length < 6) {
                newFieldErrors[errorKey] =
                  "Password must be at least 6 characters";
                isValid = false;
              }
              break;
            case "studentId":
              if (
                existingStudentIds.includes(value.trim()) ||
                duplicateIds.has(value.trim())
              ) {
                newFieldErrors[errorKey] =
                  "Student ID already exists or is duplicated";
                isValid = false;
              }
              break;
          }
        }
      });
    });

    setFieldErrors(newFieldErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateAllFields()) {
      setError("Please fix the validation errors before submitting.");
      return;
    }

    if (duplicateIds.size > 0) {
      setError("Please resolve duplicate Student IDs before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${backendurl}/api/admin/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ students }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add students");
      }

      // Clear draft and reset form
      localStorage.removeItem("addStudents_draft");
      alert("Students added successfully!");
      setStudents([
        {
          firstName: "",
          lastName: "",
          studentId: "",
          grade: "",
          section: "",
          track: "",
          password: "",
        },
      ]);
      setFieldErrors({});
      setShowPreview(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "An error occurred while adding students.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddStudent = () => {
    setStudents([
      ...students,
      {
        firstName: "",
        lastName: "",
        studentId: "",
        grade: "",
        section: "",
        track: "",
        password: "",
      },
    ]);
  };

  const handleRemoveStudent = (index) => {
    if (students.length === 1) {
      setError("You must have at least one student.");
      return;
    }
    setStudents(students.filter((_, i) => i !== index));

    // Clear related field errors
    const newFieldErrors = { ...fieldErrors };
    Object.keys(newFieldErrors).forEach((key) => {
      if (key.startsWith(`${index}.`)) {
        delete newFieldErrors[key];
      }
    });
    setFieldErrors(newFieldErrors);
  };

  const clearDraft = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all data? This will remove any saved draft."
      )
    ) {
      localStorage.removeItem("addStudents_draft");
      setStudents([
        {
          firstName: "",
          lastName: "",
          studentId: "",
          grade: "",
          section: "",
          track: "",
          password: "",
        },
      ]);
      setFieldErrors({});
      setError("");
    }
  };

  const getFieldError = (index, field) => {
    return fieldErrors[`${index}.${field}`];
  };

  const hasErrors =
    Object.keys(fieldErrors).length > 0 || duplicateIds.size > 0;

  return (
    <div className="container mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-base-200 rounded-lg shadow-lg p-3 sm:p-4 lg:p-6">
          {guideMode && (
            <details className="mb-4 sm:mb-6 bg-base-200 border border-primary rounded p-3 sm:p-4">
              <summary className="cursor-pointer font-medium text-sm sm:text-base text-primary mb-1">
                How to use the Add Students page?
              </summary>
              <ol className="mt-2 text-xs sm:text-sm text-base-content list-decimal list-inside space-y-1">
                <li>
                  Fill in the required information for each student: First Name,
                  Last Name, Student ID, Grade, Section, Track, and Password.
                </li>
                <li>
                  Use the password generator button to create secure passwords
                  automatically.
                </li>
                <li>
                  The form auto-saves your progress as a draft every 2 seconds.
                </li>
                <li>Red indicators show validation errors in real-time.</li>
                <li>
                  Use the Preview button to review all student data before
                  submission.
                </li>
                <li>
                  To add more students, click the <b>Add Another Student</b>{" "}
                  button.
                </li>
                <li>
                  To remove a student, click the red <b>Remove</b> button next
                  to their information.
                </li>
                <li>Make sure each Student ID is unique across the system.</li>
              </ol>
            </details>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary">
                Add Students
              </h1>
              <p className="text-xs sm:text-sm text-base-content/70 mt-1">
                Create new student accounts for the system
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="badge badge-outline text-xs">
                {students.length} Student{students.length !== 1 ? "s" : ""}
              </div>
              {hasErrors && (
                <div className="badge badge-error text-xs gap-1">
                  <MdWarning className="w-3 h-3" />
                  Errors
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="alert alert-error mb-4 sm:mb-6 text-sm">
              <span>{error}</span>
            </div>
          )}

          {duplicateIds.size > 0 && (
            <div className="alert alert-warning mb-4 sm:mb-6 text-sm">
              <MdWarning className="w-4 h-4" />
              <span>
                Duplicate Student IDs found:{" "}
                {Array.from(duplicateIds).join(", ")}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="space-y-4 sm:space-y-6">
              {students.map((student, index) => (
                <div
                  key={index}
                  className="card bg-base-100 p-3 sm:p-4 lg:p-6 border"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="badge badge-primary text-xs sm:text-sm">
                        Student {index + 1}
                      </div>
                      {duplicateIds.has(student.studentId) && (
                        <div className="badge badge-error text-xs gap-1">
                          <MdWarning className="w-3 h-3" />
                          Duplicate ID
                        </div>
                      )}
                    </div>

                    {students.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm text-error gap-1 sm:gap-2 w-full sm:w-auto"
                        onClick={() => handleRemoveStudent(index)}
                      >
                        <MdClose className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="text-xs sm:text-sm">Remove</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium text-xs sm:text-sm">
                          First Name
                        </span>
                      </label>
                      <input
                        type="text"
                        className={`input input-bordered bg-base-100 text-sm ${
                          getFieldError(index, "firstName") ? "input-error" : ""
                        }`}
                        placeholder="Enter first name"
                        value={student.firstName}
                        onChange={(e) =>
                          handleStudentChange(
                            index,
                            "firstName",
                            e.target.value
                          )
                        }
                      />
                      {getFieldError(index, "firstName") && (
                        <label className="label">
                          <span className="label-text-alt text-error text-xs">
                            {getFieldError(index, "firstName")}
                          </span>
                        </label>
                      )}
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium text-xs sm:text-sm">
                          Last Name
                        </span>
                      </label>
                      <input
                        type="text"
                        className={`input input-bordered bg-base-100 text-sm ${
                          getFieldError(index, "lastName") ? "input-error" : ""
                        }`}
                        placeholder="Enter last name"
                        value={student.lastName}
                        onChange={(e) =>
                          handleStudentChange(index, "lastName", e.target.value)
                        }
                      />
                      {getFieldError(index, "lastName") && (
                        <label className="label">
                          <span className="label-text-alt text-error text-xs">
                            {getFieldError(index, "lastName")}
                          </span>
                        </label>
                      )}
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium text-xs sm:text-sm">
                          Student ID
                        </span>
                      </label>
                      <div className="input-group">
                        <input
                          type="text"
                          className={`input input-bordered bg-base-100 text-sm font-mono flex-1 ${
                            getFieldError(index, "studentId") ||
                            duplicateIds.has(student.studentId)
                              ? "input-error"
                              : ""
                          }`}
                          placeholder="Enter student ID"
                          value={student.studentId}
                          onChange={(e) =>
                            handleStudentChange(
                              index,
                              "studentId",
                              e.target.value
                            )
                          }
                        />
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => copyToClipboard(student.studentId)}
                          disabled={!student.studentId}
                        >
                          <MdContentCopy className="w-3 h-3" />
                        </button>
                      </div>
                      {(getFieldError(index, "studentId") ||
                        duplicateIds.has(student.studentId)) && (
                        <label className="label">
                          <span className="label-text-alt text-error text-xs">
                            {getFieldError(index, "studentId") ||
                              "Duplicate Student ID"}
                          </span>
                        </label>
                      )}
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium text-xs sm:text-sm">
                          Grade
                        </span>
                      </label>
                      <select
                        className={`select select-bordered bg-base-100 text-sm ${
                          getFieldError(index, "grade") ? "select-error" : ""
                        }`}
                        value={student.grade}
                        onChange={(e) =>
                          handleStudentChange(index, "grade", e.target.value)
                        }
                      >
                        <option value="">Select Grade</option>
                        <option value="11">Grade 11</option>
                        <option value="12">Grade 12</option>
                      </select>
                      {getFieldError(index, "grade") && (
                        <label className="label">
                          <span className="label-text-alt text-error text-xs">
                            {getFieldError(index, "grade")}
                          </span>
                        </label>
                      )}
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium text-xs sm:text-sm">
                          Section
                        </span>
                      </label>
                      <input
                        type="text"
                        className={`input input-bordered bg-base-100 text-sm ${
                          getFieldError(index, "section") ? "input-error" : ""
                        }`}
                        placeholder="Enter section"
                        value={student.section}
                        onChange={(e) =>
                          handleStudentChange(index, "section", e.target.value)
                        }
                      />
                      {getFieldError(index, "section") && (
                        <label className="label">
                          <span className="label-text-alt text-error text-xs">
                            {getFieldError(index, "section")}
                          </span>
                        </label>
                      )}
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium text-xs sm:text-sm">
                          Track
                        </span>
                      </label>
                      <select
                        className={`select select-bordered bg-base-100 text-sm ${
                          getFieldError(index, "track") ? "select-error" : ""
                        }`}
                        value={student.track}
                        onChange={(e) =>
                          handleStudentChange(index, "track", e.target.value)
                        }
                      >
                        <option value="">Select Track</option>
                        <option value="Academic Track">Academic Track</option>
                        <option value="Technical-Professional Track">
                          Technical-Professional Track
                        </option>
                      </select>
                      {getFieldError(index, "track") && (
                        <label className="label">
                          <span className="label-text-alt text-error text-xs">
                            {getFieldError(index, "track")}
                          </span>
                        </label>
                      )}
                    </div>

                    <div className="form-control sm:col-span-2 xl:col-span-3">
                      <label className="label">
                        <span className="label-text font-medium text-xs sm:text-sm">
                          Password
                        </span>
                      </label>
                      <div className="input-group">
                        <input
                          type={showPasswords[index] ? "text" : "password"}
                          className={`input input-bordered bg-base-100 text-sm flex-1 ${
                            getFieldError(index, "password")
                              ? "input-error"
                              : ""
                          }`}
                          placeholder="Enter password"
                          value={student.password}
                          onChange={(e) =>
                            handleStudentChange(
                              index,
                              "password",
                              e.target.value
                            )
                          }
                        />
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => togglePasswordVisibility(index)}
                        >
                          {showPasswords[index] ? (
                            <MdVisibilityOff className="w-4 h-4" />
                          ) : (
                            <MdVisibility className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => generatePassword(index)}
                          title="Generate Password"
                        >
                          Generate
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => copyToClipboard(student.password)}
                          disabled={!student.password}
                        >
                          <MdContentCopy className="w-3 h-3" />
                        </button>
                      </div>
                      {getFieldError(index, "password") && (
                        <label className="label">
                          <span className="label-text-alt text-error text-xs">
                            {getFieldError(index, "password")}
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="sticky bottom-0 bg-base-200 p-3 sm:p-4 rounded-lg border">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  type="button"
                  className="btn btn-outline gap-2 w-full sm:w-auto order-3 sm:order-1"
                  onClick={handleAddStudent}
                >
                  <MdAdd className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Another Student</span>
                  <span className="sm:hidden">Add Student</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary gap-2 w-full sm:w-auto order-2"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <MdPreview className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {showPreview ? "Hide Preview" : "Preview"}
                  </span>
                  <span className="sm:hidden">
                    {showPreview ? "Hide" : "Preview"}
                  </span>
                </button>

                <button
                  type="button"
                  className="btn btn-ghost gap-2 w-full sm:w-auto order-4 sm:order-3"
                  onClick={clearDraft}
                >
                  Clear All
                </button>

                <button
                  type="submit"
                  className="btn btn-primary gap-2 flex-1 order-1 sm:order-4"
                  disabled={isSubmitting || hasErrors}
                >
                  <MdSave className="w-4 h-4" />
                  {isSubmitting ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      <span className="hidden sm:inline">
                        Adding Students...
                      </span>
                      <span className="sm:hidden">Adding...</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Add Students</span>
                      <span className="sm:hidden">Save</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Preview Modal */}
          {showPreview && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-base-100 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto">
                <div className="p-4 border-b flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Preview Students</h3>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowPreview(false)}
                  >
                    <MdClose className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4">
                  <div className="overflow-x-auto">
                    <table className="table table-zebra w-full text-sm">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Student ID</th>
                          <th>Grade</th>
                          <th>Section</th>
                          <th>Track</th>
                          <th>Password</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student, index) => (
                          <tr key={index}>
                            <td>
                              {student.firstName} {student.lastName}
                            </td>
                            <td className="font-mono">{student.studentId}</td>
                            <td>{student.grade}</td>
                            <td>{student.section}</td>
                            <td className="text-xs">{student.track}</td>
                            <td className="font-mono text-xs">
                              {student.password}
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
        </div>
      </div>
    </div>
  );
};

export default AddStudents;

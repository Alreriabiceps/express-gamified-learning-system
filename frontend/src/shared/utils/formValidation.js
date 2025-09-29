/**
 * Form validation utilities for admin pages
 */

/**
 * Validate required fields
 * @param {Object} data - Form data object
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object} - Validation errors object
 */
export const validateRequired = (data, requiredFields) => {
  const errors = {};

  requiredFields.forEach((field) => {
    if (
      !data[field] ||
      (typeof data[field] === "string" && data[field].trim() === "")
    ) {
      errors[field] = `${
        field.charAt(0).toUpperCase() + field.slice(1)
      } is required`;
    }
  });

  return errors;
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {string|null} - Error message or null if valid
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Please enter a valid email address";
  }
  return null;
};

/**
 * Validate minimum length
 * @param {string} value - Value to validate
 * @param {number} minLength - Minimum required length
 * @param {string} fieldName - Name of the field for error message
 * @returns {string|null} - Error message or null if valid
 */
export const validateMinLength = (value, minLength, fieldName) => {
  if (value && value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters long`;
  }
  return null;
};

/**
 * Validate maximum length
 * @param {string} value - Value to validate
 * @param {number} maxLength - Maximum allowed length
 * @param {string} fieldName - Name of the field for error message
 * @returns {string|null} - Error message or null if valid
 */
export const validateMaxLength = (value, maxLength, fieldName) => {
  if (value && value.length > maxLength) {
    return `${fieldName} must be no more than ${maxLength} characters long`;
  }
  return null;
};

/**
 * Validate numeric range
 * @param {number} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {string} fieldName - Name of the field for error message
 * @returns {string|null} - Error message or null if valid
 */
export const validateNumericRange = (value, min, max, fieldName) => {
  if (value !== null && value !== undefined) {
    if (value < min) {
      return `${fieldName} must be at least ${min}`;
    }
    if (value > max) {
      return `${fieldName} must be no more than ${max}`;
    }
  }
  return null;
};

/**
 * Validate file upload
 * @param {File} file - File to validate
 * @param {Array} allowedTypes - Array of allowed MIME types
 * @param {number} maxSize - Maximum file size in bytes
 * @returns {string|null} - Error message or null if valid
 */
export const validateFile = (
  file,
  allowedTypes = [],
  maxSize = 5 * 1024 * 1024
) => {
  if (!file) {
    return "Please select a file";
  }

  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return `File type not supported. Allowed types: ${allowedTypes.join(", ")}`;
  }

  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return `File size must be less than ${maxSizeMB}MB`;
  }

  return null;
};

/**
 * Validate question data for batch upload
 * @param {Object} question - Question object to validate
 * @returns {Object} - Validation errors object
 */
export const validateQuestion = (question) => {
  const errors = {};

  if (!question.questionText || question.questionText.trim() === "") {
    errors.questionText = "Question text is required";
  }

  if (
    !question.choices ||
    !Array.isArray(question.choices) ||
    question.choices.length < 2
  ) {
    errors.choices = "At least 2 choices are required";
  }

  if (!question.correctAnswer || question.correctAnswer.trim() === "") {
    errors.correctAnswer = "Correct answer is required";
  }

  if (!question.bloomsLevel || question.bloomsLevel.trim() === "") {
    errors.bloomsLevel = "Bloom's level is required";
  }

  if (!question.subject || question.subject.trim() === "") {
    errors.subject = "Subject is required";
  }

  return errors;
};

/**
 * Validate batch questions
 * @param {Array} questions - Array of questions to validate
 * @returns {Array} - Array of validation errors
 */
export const validateBatchQuestions = (questions) => {
  const errors = [];

  questions.forEach((question, index) => {
    const questionErrors = validateQuestion(question);
    if (Object.keys(questionErrors).length > 0) {
      errors.push({
        row: index + 1,
        errors: questionErrors,
      });
    }
  });

  return errors;
};

// Admin Bot Knowledge Base for GLEAS System
// This file contains comprehensive information about admin features and functionality

export const ADMIN_KNOWLEDGE_BASE = {
  // System Overview
  system: {
    name: "GLEAS (Gamified Learning Environment and Assessment System)",
    description:
      "A comprehensive educational platform that combines gamification with learning management and assessment tools.",
    version: "2.0",
    features: [
      "Student Management",
      "Question Bank Management",
      "AI-Powered Question Generation",
      "Test Scheduling and Management",
      "Analytics and Reporting",
      "Gamification Features",
      "Real-time Dashboard",
    ],
  },

  // Dashboard Features
  dashboard: {
    overview:
      "The admin dashboard provides real-time insights into system usage, student activity, and performance metrics.",
    keyMetrics: [
      "Total Students",
      "Total Questions",
      "Total Subjects",
      "Active Players",
      "Weekly Test Completions",
      "System Performance",
    ],
    quickActions: [
      "Add Questions",
      "Add Students",
      "Manage Subjects",
      "Schedule Tests",
      "View Analytics",
      "Generate Reports",
    ],
    navigation: {
      "Add Questions": "/admin/addquestions",
      "Add Students": "/admin/addstudent",
      "Manage Subjects": "/admin/subjects",
      "Schedule Tests": "/admin/weeks/schedule",
      "View Analytics": "/admin/analytics",
      "Question List": "/admin/questions",
    },
  },

  // Question Management
  questions: {
    overview:
      "The question management system allows you to create, edit, and organize questions for assessments.",
    features: [
      "Manual Question Creation",
      "AI-Powered Question Generation",
      "Batch Upload via CSV",
      "Bloom's Taxonomy Classification",
      "Subject Organization",
      "Question Preview and Validation",
    ],
    questionTypes: [
      "Multiple Choice",
      "True/False",
      "Short Answer",
      "Essay Questions",
    ],
    bloomsLevels: [
      "Remembering",
      "Understanding",
      "Applying",
      "Analyzing",
      "Evaluating",
      "Creating",
    ],
    aiGeneration: {
      methods: [
        "Topic-based Generation",
        "File Upload Generation",
        "Chat-style Generation",
      ],
      supportedFormats: ["PDF", "DOCX", "PPTX"],
      maxQuestions: 15,
      features: [
        "Custom Prompts",
        "Bloom's Level Targeting",
        "Subject-Specific Generation",
        "Batch Processing",
      ],
    },
    validation: {
      required: ["Question Text", "Correct Answer", "Subject", "Bloom's Level"],
      optional: ["Choices", "Explanation", "Difficulty Level"],
      limits: {
        questionText: "Minimum 10 characters",
        choices: "2-6 options for multiple choice",
        answer: "Must match one of the choices",
      },
    },
  },

  // Student Management
  students: {
    overview:
      "Manage student accounts, track progress, and monitor engagement.",
    features: [
      "Student Registration",
      "Account Management",
      "Progress Tracking",
      "Performance Analytics",
      "Bulk Import/Export",
      "Account Status Management",
    ],
    studentData: {
      required: [
        "First Name",
        "Last Name",
        "Student ID",
        "Grade",
        "Section",
        "Track",
        "Password",
      ],
      optional: ["Email", "Phone", "Additional Notes"],
      validation: {
        studentId: "Must be unique across the system",
        password: "Minimum 6 characters",
        name: "Minimum 2 characters each",
      },
    },
    tracks: ["Academic Track", "Technical-Professional Track"],
    grades: ["11", "12"],
    bulkOperations: [
      "CSV Import",
      "Bulk Password Reset",
      "Account Status Updates",
      "Data Export",
    ],
  },

  // Subject Management
  subjects: {
    overview:
      "Organize and manage academic subjects and their associated content.",
    features: [
      "Subject Creation and Editing",
      "Content Organization",
      "Question Association",
      "Test Scheduling",
      "Progress Tracking",
    ],
    subjectData: {
      required: ["Subject Name", "Description"],
      optional: ["Code", "Category", "Prerequisites", "Learning Objectives"],
    },
  },

  // Test Scheduling
  tests: {
    overview: "Schedule and manage weekly tests and assessments.",
    features: [
      "Weekly Test Scheduling",
      "Question Selection",
      "Time Management",
      "Student Notifications",
      "Result Processing",
    ],
    testTypes: [
      "Weekly Tests",
      "Practice Tests",
      "Final Assessments",
      "Team Tests",
    ],
    scheduling: {
      timeSlots: "Flexible scheduling with time zone support",
      duration: "Configurable test duration",
      attempts: "Multiple attempt support",
      notifications: "Automatic student notifications",
    },
  },

  // Analytics and Reporting
  analytics: {
    overview:
      "Comprehensive analytics and reporting system for tracking performance and usage.",
    features: [
      "Real-time Dashboard",
      "Student Performance Analytics",
      "Question Difficulty Analysis",
      "System Usage Statistics",
      "Custom Report Generation",
      "Data Export",
    ],
    metrics: [
      "Student Engagement",
      "Test Completion Rates",
      "Question Performance",
      "System Usage",
      "Learning Progress",
      "Gamification Metrics",
    ],
    reports: [
      "Student Progress Reports",
      "Question Performance Reports",
      "System Usage Reports",
      "Custom Analytics",
      "Export to CSV/PDF",
    ],
  },

  // Gamification Features
  gamification: {
    overview:
      "Gamification elements to enhance student engagement and motivation.",
    features: [
      "Points and Scoring System",
      "Achievement Badges",
      "Leaderboards",
      "Progress Tracking",
      "Rewards System",
      "Social Features",
    ],
    elements: [
      "Experience Points (XP)",
      "Level Progression",
      "Achievement Unlocks",
      "Competitive Rankings",
      "Team Challenges",
      "Power-ups and Bonuses",
    ],
  },

  // Common Issues and Solutions
  troubleshooting: {
    commonIssues: [
      {
        issue: "AI question generation not working",
        solutions: [
          "Check if Gemini API key is configured",
          "Verify subject and Bloom's level are selected",
          "Ensure topic/prompt is provided",
          "Check network connectivity",
        ],
      },
      {
        issue: "Student cannot log in",
        solutions: [
          "Verify student credentials",
          "Check if account is approved",
          "Reset password if needed",
          "Check account status",
        ],
      },
      {
        issue: "Questions not saving",
        solutions: [
          "Check all required fields are filled",
          "Verify question format is correct",
          "Check for validation errors",
          "Ensure subject is selected",
        ],
      },
      {
        issue: "Dashboard not loading data",
        solutions: [
          "Check authentication token",
          "Verify API endpoints are accessible",
          "Check browser console for errors",
          "Refresh the page",
        ],
      },
    ],
  },

  // Best Practices
  bestPractices: [
    "Always validate data before saving",
    "Use descriptive question text",
    "Provide clear answer choices",
    "Test questions before publishing",
    "Regularly backup data",
    "Monitor system performance",
    "Keep student data secure",
    "Use appropriate Bloom's levels",
    "Provide clear instructions",
    "Regularly update content",
  ],

  // API Endpoints
  apiEndpoints: {
    questions: "/api/questions",
    students: "/api/admin/students",
    subjects: "/api/admin/subjects",
    analytics: "/api/admin/analytics",
    dashboard: "/api/admin/dashboard",
    aiGeneration: "/api/generate-questions",
    chatbot: "/api/admin-chatbot",
  },
};

// Helper function to get contextual help based on current page
export const getContextualHelp = (currentPath) => {
  const pathMap = {
    "/admin/dashboard": "dashboard",
    "/admin/addquestions": "questions",
    "/admin/questions": "questions",
    "/admin/addstudent": "students",
    "/admin/students": "students",
    "/admin/subjects": "subjects",
    "/admin/weeks/schedule": "tests",
    "/admin/analytics": "analytics",
  };

  return pathMap[currentPath] || "system";
};

// Helper function to generate contextual responses
export const generateContextualResponse = (question, currentPath) => {
  const context = getContextualHelp(currentPath);
  const knowledge = ADMIN_KNOWLEDGE_BASE[context];

  // This would be used by the AI to provide more accurate responses
  return {
    context,
    knowledge,
    suggestions: knowledge?.features || [],
    relatedTopics: Object.keys(ADMIN_KNOWLEDGE_BASE).filter(
      (key) => key !== context
    ),
  };
};

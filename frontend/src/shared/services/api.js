// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper method to get auth headers
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getAuthHeaders(),
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // GET request
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  // POST request
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // PUT request
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Authentication API calls
  auth = {
    adminLogin: (credentials) => this.post('/auth/admin/login', credentials),
    studentLogin: (credentials) => this.post('/auth/student/login', credentials),
    studentRegister: (data) => this.post('/auth/student/register', data),
    requestPasswordReset: (data) => this.post('/auth/request-password-reset', data),
    resetPassword: (data) => this.post('/auth/reset-password', data),
    finalizeRegistration: (token) => this.get(`/auth/finalize-registration?token=${token}`)
  };

  // Student API calls (using new modular routes)
  students = {
    getAll: () => this.get('/modules/student'),
    getById: (id) => this.get(`/modules/student/${id}`),
    create: (data) => this.post('/modules/student', data),
    update: (id, data) => this.put(`/modules/student/${id}`, data),
    delete: (id) => this.delete(`/modules/student/${id}`)
  };

  // Admin API calls (using new modular routes)
  admin = {
    getDashboard: () => this.get('/modules/admin/dashboard')
  };

  // Legacy API calls (for backward compatibility)
  legacy = {
    // Dashboard
    getDashboard: (userType) => this.get(`/dashboard/${userType}`),
    
    // Questions
    getQuestions: () => this.get('/questions'),
    addQuestion: (data) => this.post('/questions', data),
    
    // Subjects
    getSubjects: () => this.get('/subjects'),
    addSubject: (data) => this.post('/subjects', data),
    
    // Weekly Tests
    getWeeklyTests: () => this.get('/weekly-tests'),
    submitWeeklyTest: (data) => this.post('/weekly-tests/submit', data),
    
    // Leaderboard
    getLeaderboard: () => this.get('/leaderboard'),
    
    // Chat & Messages
    getMessages: (chatId) => this.get(`/messages/${chatId}`),
    sendMessage: (data) => this.post('/messages', data),
    
    // Friend Requests
    getFriendRequests: () => this.get('/friend-requests'),
    sendFriendRequest: (data) => this.post('/friend-requests', data),
    
    // Game/Lobby
    createLobby: (data) => this.post('/lobby/create', data),
    joinLobby: (data) => this.post('/lobby/join', data),
    
    // Reviewers
    getReviewers: () => this.get('/reviewers'),
    favoriteReviewer: (reviewerId) => this.post(`/reviewers/${reviewerId}/favorite`),
  };
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService; 
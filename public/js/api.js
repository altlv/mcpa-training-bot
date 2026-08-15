/**
 * MCPA Training Bot - API Module
 * Handles all communication with the backend
 */

const API = {
  baseUrl: 'http://localhost:3000',
  
  /**
   * Make an API request
   * @param {string} endpoint - API endpoint
   * @param {object} options - Fetch options
   * @returns {Promise<object>} Response data
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    };
    
    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }
      
      return data;
    } catch (error) {
      console.error(`API Error: ${endpoint}`, error);
      throw error;
    }
  },
  
  /**
   * Health check
   * @returns {Promise<object>} Health status
   */
  async healthCheck() {
    return this.request('/api/health');
  },
  
  /**
   * Get all available tags
   * @returns {Promise<object>} Tags data
   */
  async getTags() {
    return this.request('/api/tags');
  },
  
  /**
   * Start a quiz session
   * @param {string[]} tags - Selected tags
   * @param {number} count - Number of questions
   * @returns {Promise<object>} Quiz session data
   */
  async startQuiz(tags, count = 'all') {
    return this.request('/api/quiz/start', {
      method: 'POST',
      body: JSON.stringify({ tags, count }),
    });
  },
  
  /**
   * Submit quiz answers
   * @param {string} sessionId - Quiz session ID
   * @param {object} answers - User answers
   * @returns {Promise<object>} Quiz results
   */
  async submitQuiz(sessionId, answers) {
    return this.request('/api/quiz/submit', {
      method: 'POST',
      body: JSON.stringify({ sessionId, answers }),
    });
  },
  
  /**
   * Get a single question by ID
   * @param {string} questionId - Question ID
   * @returns {Promise<object>} Question data
   */
  async getQuestion(questionId) {
    return this.request(`/api/questions/${questionId}`);
  },
};

export default API;

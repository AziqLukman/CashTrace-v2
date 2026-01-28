// frontend/app/lib/api.js
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class ApiClient {
  getToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  setToken(token) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  removeToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  }

  async request(endpoint, options = {}) {
    const token = this.getToken();
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Auth
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async getUser() {
    return this.request('/auth/me');
  }

  // Transactions
  async getTransactions(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/transactions${query ? `?${query}` : ''}`);
  }

  async createTransaction(data) {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTransaction(id, data) {
    return this.request(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTransaction(id) {
    return this.request(`/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  // Categories
  async getCategories() {
    return this.request('/categories');
  }

  async createCategory(data) {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Dashboard
  async getDashboardSummary(month, year) {
    return this.request(`/dashboard/summary?month=${month}&year=${year}`);
  }

  async getDashboardChart(month, year) {
    return this.request(`/dashboard/chart?month=${month}&year=${year}`);
  }

  async getDashboardData() {
    // Consolidated call for dashboard page
    const date = new Date();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    // Parallel requests
    const [summary, chart, recent] = await Promise.all([
      this.getDashboardSummary(month, year),
      // Chart data - dashboard endpoint might need adjustment or we use what we have
      this.request(`/dashboard/chart?month=${month}&year=${year}`), // Reusing existing or creating new
      this.getTransactions({ page: 1, limit: 5 })
    ]);

    // Format for dashboard consumption
    return {
      success: true,
      data: {
        summary: summary.data.summary,
        chart: {
          daily: chart.data, 
          categories: summary.data.topCategories // dashboard summary already returns topCategories
        }, 
        recent_transactions: recent.data
      }
    };
  }

  // Reports
  async getReports(month, year) {
    return this.request(`/reports/monthly?month=${month}&year=${year}`);
  }
}

const api = new ApiClient();
export { api };
export default api;
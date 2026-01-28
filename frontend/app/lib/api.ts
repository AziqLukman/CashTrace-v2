const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

async function fetchWithAuth(endpoint: string, options: RequestOptions = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      // Handle unauthorized access (e.g., redirect to login)
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

export const api = {
  // Auth
  login: (data: any) => fetchWithAuth('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: any) => fetchWithAuth('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  forgotPassword: (data: { name: string; email: string; newPassword: string }) => 
    fetchWithAuth('/auth/forgot-password', { method: 'POST', body: JSON.stringify(data) }),


  // Dashboard
  getDashboardData: (month?: number, year?: number) => {
    const query = month && year ? `?month=${month}&year=${year}` : '';
    return fetchWithAuth(`/dashboard/summary${query}`);
  },
  getDashboardStatsV2: (range: string = 'month', startDate?: string, endDate?: string) => {
    let url = `/dashboard/stats-v2?range=${range}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return fetchWithAuth(url);
  },
  getChartData: (range: string = 'month', startDate?: string, endDate?: string) => {
    let url = `/dashboard/chart-data?range=${range}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return fetchWithAuth(url);
  },
  getCategoryChartData: (range: string = 'month', startDate?: string, endDate?: string) => {
    let url = `/dashboard/category-data?range=${range}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return fetchWithAuth(url);
  },


  // Transactions
  getTransactions: (params?: any) => {
    const searchParams = new URLSearchParams(params).toString();
    return fetchWithAuth(`/transactions?${searchParams}`);
  },
  addTransaction: (data: any) => fetchWithAuth('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  createTransaction: (data: any) => fetchWithAuth('/transactions', { method: 'POST', body: JSON.stringify(data) }), // Alias for compatibility
  updateTransaction: (id: string | number, data: any) => fetchWithAuth(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTransaction: (id: string | number) => fetchWithAuth(`/transactions/${id}`, { method: 'DELETE' }),

  // Categories
  getCategories: () => fetchWithAuth('/categories'),

  // Reports
  getReports: (month?: number, year?: number) => {
    const query = month && year ? `?month=${month}&year=${year}` : '';
    return fetchWithAuth(`/reports/monthly${query}`);
  },
  getReportData: (range: string = 'month', startDate?: string, endDate?: string) => {
    let url = `/reports/data?range=${range}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return fetchWithAuth(url);
  },
  downloadReport: async (data: { startDate: string; endDate: string; format: string }) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/reports/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Download failed');
    return response;
  },

  // User
  updateProfile: (data: any) => fetchWithAuth('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data: { oldPassword: string; newPassword: string }) => 
    fetchWithAuth('/auth/change-password', { method: 'PUT', body: JSON.stringify(data) }),
};

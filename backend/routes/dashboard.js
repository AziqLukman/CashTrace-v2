// backend/routes/dashboard.js
const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const response = require('../utils/responseHelper');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/dashboard/summary
 * Get monthly summary (Income, Expense, Balance, Top Categories)
 */
router.get('/summary', async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    // 1. Total Income & Expense
    const [summaryRows] = await pool.query(
      `SELECT 
        type,
        SUM(amount) as total
       FROM transactions
       WHERE user_id = ?
         AND MONTH(transaction_date) = ?
         AND YEAR(transaction_date) = ?
       GROUP BY type`,
      [req.userId, currentMonth, currentYear]
    );

    const summary = {
      income: 0,
      expense: 0,
      balance: 0
    };

    summaryRows.forEach(row => {
      if (row.type === 'income') summary.income = parseFloat(row.total);
      if (row.type === 'expense') summary.expense = parseFloat(row.total);
    });

    summary.balance = summary.income - summary.expense;

    // 2. Spending by Category (Top 5)
    const [categoryRows] = await pool.query(
      `SELECT 
        c.name,
        c.color,
        c.icon,
        SUM(t.amount) as total,
        COUNT(t.id) as count
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ?
         AND t.type = 'expense'
         AND MONTH(t.transaction_date) = ?
         AND YEAR(t.transaction_date) = ?
       GROUP BY c.id, c.name, c.color, c.icon
       ORDER BY total DESC
       LIMIT 5`,
      [req.userId, currentMonth, currentYear]
    );

    // 3. Recent Transactions (Limit 10) - Added per user request
    const [recentRows] = await pool.query(
      `SELECT 
        t.id,
        t.transaction_date,
        t.type,
        t.amount,
        t.description,
        c.name as category_name,
        c.icon
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ?
       ORDER BY t.transaction_date DESC, t.id DESC
       LIMIT 10`,
      [req.userId]
    );

    return response.success(res, {
      summary,
      topCategories: categoryRows,
      recent_transactions: recentRows
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dashboard/stats
 * Get overview stats (Today, This Week, This Month)
 */
router.get('/stats', async (req, res, next) => {
  try {
    // Today
    const [todayRows] = await pool.query(
      `SELECT SUM(amount) as total FROM transactions 
       WHERE user_id = ? AND type = 'expense' AND transaction_date = CURDATE()`,
      [req.userId]
    );

    // This Week (Monday to Sunday)
    const [weekRows] = await pool.query(
      `SELECT SUM(amount) as total FROM transactions 
       WHERE user_id = ? AND type = 'expense' 
       AND YEARWEEK(transaction_date, 1) = YEARWEEK(CURDATE(), 1)`,
      [req.userId]
    );

    // This Month
    const [monthRows] = await pool.query(
      `SELECT SUM(amount) as total FROM transactions 
       WHERE user_id = ? AND type = 'expense'
       AND MONTH(transaction_date) = MONTH(CURDATE())
       AND YEAR(transaction_date) = YEAR(CURDATE())`,
      [req.userId]
    );

    return response.success(res, {
      expenseToday: parseFloat(todayRows[0].total) || 0,
      expenseThisWeek: parseFloat(weekRows[0].total) || 0,
      expenseThisMonth: parseFloat(monthRows[0].total) || 0
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dashboard/trend
 * Get 6 months income/expense trend
 */
router.get('/trend', async (req, res, next) => {
  try {
    // Get last 6 months data
    const [rows] = await pool.query(
      `SELECT 
        DATE_FORMAT(transaction_date, '%Y-%m') as period,
        type,
        SUM(amount) as total
       FROM transactions
       WHERE user_id = ?
         AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY period, type
       ORDER BY period ASC`,
      [req.userId]
    );

    // Process data into chart format
    // Result: [ { period: '2023-10', income: 5000, expense: 2000 }, ... ]
    const trendMap = new Map();

    rows.forEach(row => {
      if (!trendMap.has(row.period)) {
        trendMap.set(row.period, { period: row.period, income: 0, expense: 0 });
      }
      const entry = trendMap.get(row.period);
      if (row.type === 'income') entry.income = parseFloat(row.total);
      if (row.type === 'expense') entry.expense = parseFloat(row.total);
    });

    const chartData = Array.from(trendMap.values());

    return response.success(res, chartData);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dashboard/chart
 * Get daily transactions for current month (legacy support)
 */
router.get('/chart', async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    const [rows] = await pool.query(
      `SELECT 
        transaction_date,
        type,
        SUM(amount) as total
       FROM transactions
       WHERE user_id = ?
         AND MONTH(transaction_date) = ?
         AND YEAR(transaction_date) = ?
       GROUP BY transaction_date, type
       ORDER BY transaction_date`,
      [req.userId, currentMonth, currentYear]
    );

    return response.success(res, rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dashboard/stats-v2
 * Get dynamic stats (current vs previous period)
 * Query: ?range=day|week|month|year
 */
router.get('/stats-v2', async (req, res, next) => {
  try {
    const { range = 'month' } = req.query;

    // Calculate dates based on range
    let startDate, endDate, prevStartDate, prevEndDate;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to start of day

    if (range === 'custom') {
      const { startDate: qStart, endDate: qEnd } = req.query;
      startDate = qStart ? new Date(qStart) : new Date();
      endDate = qEnd ? new Date(qEnd) : new Date();

      // Ensure endDate is end of day
      endDate.setHours(23, 59, 59, 999);

      // Previous period: Same duration before start date
      const duration = endDate.getTime() - startDate.getTime(); // Duration in milliseconds
      prevEndDate = new Date(startDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1); // Day before current start
      prevEndDate.setHours(23, 59, 59, 999); // End of that day
      prevStartDate = new Date(prevEndDate.getTime() - duration);
      prevStartDate.setHours(0, 0, 0, 0); // Start of that day

    } else if (range === 'day') {
      startDate = new Date(today); // Today
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);

      prevStartDate = new Date(today);
      prevStartDate.setDate(today.getDate() - 1); // Yesterday
      prevEndDate = new Date(prevStartDate);
      prevEndDate.setHours(23, 59, 59, 999);

    } else if (range === 'week') {
      // Start of week (Monday)
      const day = today.getDay() || 7; // 1 (Mon) to 7 (Sun)
      startDate = new Date(today);
      startDate.setDate(today.getDate() - day + 1);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      prevStartDate = new Date(startDate);
      prevStartDate.setDate(startDate.getDate() - 7);

      prevEndDate = new Date(endDate);
      prevEndDate.setDate(endDate.getDate() - 7);

    } else if (range === 'month') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of current month
      endDate.setHours(23, 59, 59, 999);

      prevStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      prevStartDate.setHours(0, 0, 0, 0);

      prevEndDate = new Date(today.getFullYear(), today.getMonth(), 0); // Last day of previous month
      prevEndDate.setHours(23, 59, 59, 999);

    } else if (range === 'year') {
      startDate = new Date(today.getFullYear(), 0, 1);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(today.getFullYear(), 11, 31);
      endDate.setHours(23, 59, 59, 999);

      prevStartDate = new Date(today.getFullYear() - 1, 0, 1);
      prevStartDate.setHours(0, 0, 0, 0);

      prevEndDate = new Date(today.getFullYear() - 1, 11, 31);
      prevEndDate.setHours(23, 59, 59, 999);
    }

    // --- Helper Querie Functions ---

    // 1. Get Period Income/Expense (Flow)
    const getPeriodSum = async (start, end, type) => {
      const [rows] = await pool.query(
        `SELECT SUM(amount) as total FROM transactions 
         WHERE user_id = ? AND type = ? AND transaction_date >= ? AND transaction_date <= ?`,
        [req.userId, type, start, end]
      );
      return parseFloat(rows[0].total) || 0;
    };

    // 2. Get Cumulative Balance (Total Saldo up to End Date)
    // Formula: Sum(Income) - Sum(Expense) for ALL transactions <= Date
    const getCumulativeBalance = async (dateLimit) => {
      const [rows] = await pool.query(
        `SELECT 
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) - 
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as balance
         FROM transactions 
         WHERE user_id = ? AND transaction_date <= ?`,
        [req.userId, dateLimit]
      );
      return parseFloat(rows[0].balance) || 0;
    };

    // Current Period Stats
    const currIncome = await getPeriodSum(startDate, endDate, 'income');
    const currExpense = await getPeriodSum(startDate, endDate, 'expense');
    const currBalance = await getCumulativeBalance(endDate); // USER REQUEST: Total Balance (Accumulated)

    // Previous Period Stats
    const prevIncome = await getPeriodSum(prevStartDate, prevEndDate, 'income');
    const prevExpense = await getPeriodSum(prevStartDate, prevEndDate, 'expense');
    const prevBalance = await getCumulativeBalance(prevEndDate);

    // Calculate Percentages
    const calcChange = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    return response.success(res, {
      current: {
        income: currIncome,
        expense: currExpense,
        balance: currBalance
      },
      previous: {
        income: prevIncome,
        expense: prevExpense,
        balance: prevBalance
      },
      percentage: {
        income: calcChange(currIncome, prevIncome),
        expense: calcChange(currExpense, prevExpense),
        balance: calcChange(currBalance, prevBalance)
      },
      range: { // Helpful debug info
        start: startDate,
        end: endDate
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dashboard/chart-data
 * Get chart data for specific range
 * Query: ?range=day|week|month|year
 */
router.get('/chart-data', async (req, res, next) => {
  try {
    const { range = 'month' } = req.query;

    let dateFormat, groupBy;
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    if (range === 'day') {
      dateFormat = '%H:00'; // Group by Hour
      groupBy = 'hour';
    } else if (range === 'week') {
      const day = startDate.getDay() || 7;
      startDate.setDate(startDate.getDate() - day + 1); // Start of week (Mon)
      dateFormat = '%W'; // Day name (Sunday..Saturday) - simplified for mysql
      // Better to return actual date for frontend formatting
      groupBy = 'date';
    } else if (range === 'month') {
      startDate.setDate(1); // Start of month
      groupBy = 'date';
    } else if (range === 'year') {
      startDate.setMonth(0, 1); // Start of year
      groupBy = 'month';
    }

    let query = '';
    let params = [req.userId, startDate];



    if (range === 'custom') {
      const { startDate: qStart, endDate: qEnd } = req.query;
      // Default grouping by date for custom range
      query = `
         SELECT 
          DATE(transaction_date) as label,
          type,
          SUM(amount) as total
        FROM transactions
        WHERE user_id = ? AND transaction_date >= ? AND transaction_date <= ?
        GROUP BY label, type
        ORDER BY label ASC
      `;
      // Validate dates
      const s = qStart ? new Date(qStart) : new Date();
      const e = qEnd ? new Date(qEnd) : new Date();
      // Adjust params
      params = [req.userId, s, e];
    } else if (range === 'day') {
      // For day, we want all hours 0-23. 
      // Simplified: Just returning transactions grouped by hour
      query = `
        SELECT 
          DATE_FORMAT(transaction_date, '%H:00') as label,
          type,
          SUM(amount) as total
        FROM transactions
        WHERE user_id = ? AND transaction_date >= ? AND transaction_date < DATE_ADD(?, INTERVAL 1 DAY)
        GROUP BY label, type
        ORDER BY label ASC
      `;
      params.push(startDate); // For DATE_ADD
    } else if (range === 'week') {
      query = `
         SELECT 
          DATE(transaction_date) as label,
          type,
          SUM(amount) as total
        FROM transactions
        WHERE user_id = ? AND transaction_date >= ? AND transaction_date < DATE_ADD(?, INTERVAL 7 DAY)
        GROUP BY label, type
        ORDER BY label ASC
      `;
      params.push(startDate);
    } else if (range === 'month') {
      query = `
         SELECT 
          DATE(transaction_date) as label,
          type,
          SUM(amount) as total
        FROM transactions
        WHERE user_id = ? AND transaction_date >= ? AND transaction_date < DATE_ADD(?, INTERVAL 1 MONTH)
        GROUP BY label, type
        ORDER BY label ASC
      `;
      params.push(startDate);
    } else if (range === 'year') {
      query = `
         SELECT 
          DATE_FORMAT(transaction_date, '%Y-%m') as label,
          type,
          SUM(amount) as total
        FROM transactions
        WHERE user_id = ? AND transaction_date >= ? AND transaction_date < DATE_ADD(?, INTERVAL 1 YEAR)
        GROUP BY label, type
        ORDER BY label ASC
      `;
      params.push(startDate);
    }

    const [rows] = await pool.query(query, params);

    // Process into series
    // We need to fill missing gaps ideally, but for now let's just return sparse data and let frontend handle or Recharts handle it.
    // Actually, for better UX, let's normalize in backend or frontend. Let's do a simple mapping.

    // For simplicity, just returning the raw rows, but pivots might be nicer.
    // Let's return standardized JSON: { label: '...', income: X, expense: Y }

    const dataMap = new Map();
    rows.forEach(row => {
      // With dateStrings: true, row.label is already a string like "2026-01-28" or "2026-01-28 00:00:00"
      let key = String(row.label).split('T')[0].split(' ')[0];

      if (!dataMap.has(key)) dataMap.set(key, { label: key, income: 0, expense: 0 });
      const entry = dataMap.get(key);
      if (row.type === 'income') entry.income = parseFloat(row.total);
      if (row.type === 'expense') entry.expense = parseFloat(row.total);
    });

    // Sort by label (date)
    const sortedData = Array.from(dataMap.values()).sort((a, b) => a.label.localeCompare(b.label));

    return response.success(res, sortedData);

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dashboard/category-data
 * Get category breakdown for specific range
 * Query: ?range=day|week|month|year
 */
router.get('/category-data', async (req, res, next) => {
  try {
    const { range = 'month' } = req.query;
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    let queryFn = (start, end) => {
      return pool.query(
        `SELECT 
            c.name,
            c.color,
            SUM(t.amount) as value
           FROM transactions t
           JOIN categories c ON t.category_id = c.id
           WHERE t.user_id = ? 
             AND t.type = 'expense'
             AND t.transaction_date >= ? 
             AND t.transaction_date <= ?
           GROUP BY c.id, c.name, c.color
           ORDER BY value DESC`,
        [req.userId, start, end]
      );
    };

    let endDate;

    if (range === 'custom') {
      const { startDate: qStart, endDate: qEnd } = req.query;
      startDate = qStart ? new Date(qStart) : new Date();
      endDate = qEnd ? new Date(qEnd) : new Date();
      endDate.setHours(23, 59, 59, 999);
    } else {
      // ... Recalculate standard ranges to get precise start/end (reusing logic from stats-v2 concept for consistency)
      // Or keep existing interval logic but map to start/end?
      // Existing logic used INTERVAL SQL.
      // Let's rewrite to use JS dates for consistency.

      endDate = new Date(startDate);

      if (range === 'day') {
        // today 00:00 to 23:59
        endDate.setHours(23, 59, 59, 999);
      } else if (range === 'week') {
        const day = startDate.getDay() || 7;
        startDate.setDate(startDate.getDate() - day + 1);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      } else if (range === 'month') {
        startDate.setDate(1);
        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
      } else if (range === 'year') {
        startDate.setMonth(0, 1);
        endDate = new Date(startDate.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
      }
    }

    const [rows] = await queryFn(startDate, endDate);

    // Calculate percentages
    const total = rows.reduce((sum, row) => sum + parseFloat(row.value), 0);
    const result = rows.map(row => ({
      name: row.name,
      value: parseFloat(row.value),
      color: row.color,
      percentage: total > 0 ? (parseFloat(row.value) / total) * 100 : 0
    }));

    return response.success(res, result);

  } catch (error) {
    next(error);
  }
});

module.exports = router;
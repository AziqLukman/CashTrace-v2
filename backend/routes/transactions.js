// backend/routes/transactions.js
const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createTransactionRules, updateTransactionRules, getTransactionsRules } = require('../validators/transactionValidator');
const response = require('../utils/responseHelper');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/transactions
 * Get all transactions with filtering and pagination
 */
router.get('/', getTransactionsRules, validate, async (req, res, next) => {
  try {
    const { 
      startDate, 
      endDate, 
      type, 
      categoryId, 
      search,
      page = 1,
      limit = 50
    } = req.query;
    
    // Pagination params
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Base query
    let query = `
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
    `;
    const params = [req.userId];

    // Filters
    if (startDate) {
      query += ' AND t.transaction_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND t.transaction_date <= ?';
      params.push(endDate);
    }
    if (type) {
      query += ' AND t.type = ?';
      params.push(type);
    }
    if (categoryId) {
      query += ' AND t.category_id = ?';
      params.push(categoryId);
    }
    if (search) {
      query += ' AND (t.description LIKE ? OR c.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Sorting
    query += ' ORDER BY t.transaction_date DESC, t.created_at DESC';
    
    // Pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    // Execute query
    const [rows] = await pool.query(query, params);
    
    // Get total count (for pagination)
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
    `;
    const countParams = [req.userId];
    
    // Repeat filters for count
    if (startDate) { countQuery += ' AND t.transaction_date >= ?'; countParams.push(startDate); }
    if (endDate) { countQuery += ' AND t.transaction_date <= ?'; countParams.push(endDate); }
    if (type) { countQuery += ' AND t.type = ?'; countParams.push(type); }
    if (categoryId) { countQuery += ' AND t.category_id = ?'; countParams.push(categoryId); }
    if (search) { countQuery += ' AND (t.description LIKE ? OR c.name LIKE ?)'; countParams.push(`%${search}%`, `%${search}%`); }

    const [countResult] = await pool.query(countQuery, countParams);
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limitNum);

    return response.paginated(res, rows, {
      page: pageNum,
      limit: limitNum,
      totalItems,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/transactions/:id
 * Get single transaction
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ? AND t.user_id = ?`,
      [id, req.userId]
    );

    if (rows.length === 0) {
      return response.notFound(res, 'Transaksi tidak ditemukan');
    }

    return response.success(res, rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/transactions
 * Create transaction
 */
router.post('/', createTransactionRules, validate, async (req, res, next) => {
  try {
    const { categoryId, amount, type, description, transactionDate } = req.body;

    // Verify category if provided
    if (categoryId) {
      const [cat] = await pool.query(
        'SELECT id FROM categories WHERE id = ? AND (user_id IS NULL OR user_id = ?)', 
        [categoryId, req.userId]
      );
      if (cat.length === 0) {
        return response.error(res, 'Kategori tidak valid', 400);
      }
    }

    const [result] = await pool.query(
      `INSERT INTO transactions (user_id, category_id, amount, type, description, transaction_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.userId, categoryId || null, amount, type, description || null, transactionDate]
    );

    // Get created transaction with category info
    const [rows] = await pool.query(
      `SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ?`,
      [result.insertId]
    );

    return response.created(res, rows[0], 'Transaksi berhasil dibuat');
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/transactions/:id
 * Update transaction
 */
router.put('/:id', updateTransactionRules, validate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { categoryId, amount, type, description, transactionDate } = req.body;

    // Check transaction exists
    const [existing] = await pool.query(
      'SELECT id FROM transactions WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (existing.length === 0) {
      return response.notFound(res, 'Transaksi tidak ditemukan');
    }

    // Build update query
    const updates = [];
    const values = [];

    if (categoryId !== undefined) { 
      updates.push('category_id = ?'); 
      values.push(categoryId || null); 
    }
    if (amount) { updates.push('amount = ?'); values.push(amount); }
    if (type) { updates.push('type = ?'); values.push(type); }
    if (description !== undefined) { 
      updates.push('description = ?'); 
      values.push(description || null); 
    }
    if (transactionDate) { updates.push('transaction_date = ?'); values.push(transactionDate); }

    if (updates.length === 0) {
      return response.error(res, 'Tidak ada data yang diupdate', 400);
    }

    values.push(id, req.userId);
    
    await pool.query(
      `UPDATE transactions SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );

    // Get updated transaction
    const [rows] = await pool.query(
      `SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ?`,
      [id]
    );

    return response.success(res, rows[0], 'Transaksi berhasil diupdate');
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/transactions/bulk
 * Delete multiple transactions
 */
router.post('/bulk-delete', async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return response.error(res, 'Array of IDs (ids) required', 400);
    }

    // Build placeholders for IN clause
    const placeholders = ids.map(() => '?').join(',');
    const params = [...ids, req.userId];

    const [result] = await pool.query(
      `DELETE FROM transactions WHERE id IN (${placeholders}) AND user_id = ?`,
      params
    );

    return response.success(res, { deletedCount: result.affectedRows }, `${result.affectedRows} transaksi berhasil dihapus`);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/transactions/:id
 * Delete single transaction
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      'DELETE FROM transactions WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (result.affectedRows === 0) {
      return response.notFound(res, 'Transaksi tidak ditemukan');
    }

    return response.success(res, null, 'Transaksi berhasil dihapus');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
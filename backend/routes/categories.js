// backend/routes/categories.js
const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createCategoryRules, updateCategoryRules } = require('../validators/categoryValidator');
const response = require('../utils/responseHelper');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/categories
 * Get all categories (default + user's custom)
 */
router.get('/', async (req, res, next) => {
  try {
    const { type } = req.query;
    
    let query = `
      SELECT * FROM categories 
      WHERE (user_id IS NULL OR user_id = ?)
    `;
    const params = [req.userId];

    if (type && ['income', 'expense'].includes(type)) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY is_default DESC, name ASC';

    const [rows] = await pool.query(query, params);

    return response.success(res, rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/categories/:id
 * Get single category
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT * FROM categories WHERE id = ? AND (user_id IS NULL OR user_id = ?)`,
      [id, req.userId]
    );

    if (rows.length === 0) {
      return response.notFound(res, 'Kategori tidak ditemukan');
    }

    return response.success(res, rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/categories
 * Create custom category
 */
router.post('/', createCategoryRules, validate, async (req, res, next) => {
  try {
    const { name, type, color, icon } = req.body;

    // Check if category name already exists for this user
    const [existing] = await pool.query(
      `SELECT id FROM categories WHERE name = ? AND type = ? AND (user_id IS NULL OR user_id = ?)`,
      [name, type, req.userId]
    );

    if (existing.length > 0) {
      return response.error(res, 'Kategori dengan nama ini sudah ada', 400);
    }

    const [result] = await pool.query(
      `INSERT INTO categories (user_id, name, type, color, icon, is_default)
       VALUES (?, ?, ?, ?, ?, FALSE)`,
      [req.userId, name, type, color || '#3B82F6', icon || '📦']
    );

    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);

    return response.created(res, rows[0], 'Kategori berhasil dibuat');
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/categories/:id
 * Update custom category (only user's own categories)
 */
router.put('/:id', updateCategoryRules, validate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, icon, color } = req.body;

    // Check if category exists and belongs to user (not default)
    const [existing] = await pool.query(
      'SELECT * FROM categories WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (existing.length === 0) {
      return response.error(res, 'Kategori tidak ditemukan atau tidak dapat diubah', 404);
    }

    const updates = [];
    const values = [];

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (icon) {
      updates.push('icon = ?');
      values.push(icon);
    }
    if (color) {
      updates.push('color = ?');
      values.push(color);
    }

    if (updates.length === 0) {
      return response.error(res, 'Tidak ada data yang diupdate', 400);
    }

    values.push(id, req.userId);
    await pool.query(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );

    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);

    return response.success(res, rows[0], 'Kategori berhasil diupdate');
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/categories/:id
 * Delete custom category (only user's own categories)
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if category belongs to user (not default)
    const [existing] = await pool.query(
      'SELECT * FROM categories WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (existing.length === 0) {
      return response.error(res, 'Kategori tidak ditemukan atau tidak dapat dihapus', 404);
    }

    await pool.query('DELETE FROM categories WHERE id = ? AND user_id = ?', [id, req.userId]);

    return response.success(res, null, 'Kategori berhasil dihapus');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
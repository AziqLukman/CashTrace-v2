// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate');
const { registerRules, loginRules, updateProfileRules, changePasswordRules } = require('../validators/authValidator');
const response = require('../utils/responseHelper');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generate tokens (access + refresh)
 */
const generateTokens = async (userId) => {
  // Access token (short-lived)
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  // Refresh token (long-lived)
  const refreshToken = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  // Save refresh token to database
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
    [userId, refreshToken, expiresAt]
  );

  return { accessToken, refreshToken };
};

/**
 * POST /api/auth/register
 * Register new user
 */
router.post('/register', registerRules, validate, async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    // Check if email exists
    const [userExists] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (userExists.length > 0) {
      return response.error(res, 'Email sudah terdaftar', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await pool.query(
      'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
      [email, hashedPassword, name]
    );

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(result.insertId);

    return response.created(res, {
      token: accessToken,
      refreshToken,
      user: {
        id: result.insertId,
        email,
        name
      }
    }, 'Registrasi berhasil');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Login user using name
 */
router.post('/login', loginRules, validate, async (req, res, next) => {
  try {
    const { name, password } = req.body;

    // Find user by name
    const [users] = await pool.query('SELECT * FROM users WHERE name = ?', [name]);
    if (users.length === 0) {
      return response.error(res, 'Nama atau password salah', 401);
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return response.error(res, 'Nama atau password salah', 401);
    }

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(user.id);

    return response.success(res, {
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url
      }
    }, 'Login berhasil');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return response.error(res, 'Refresh token required', 400);
    }

    // Find valid refresh token
    const [tokens] = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()',
      [refreshToken]
    );

    if (tokens.length === 0) {
      return response.error(res, 'Invalid or expired refresh token', 401);
    }

    const tokenData = tokens[0];

    // Delete old refresh token
    await pool.query('DELETE FROM refresh_tokens WHERE id = ?', [tokenData.id]);

    // Generate new tokens
    const newTokens = await generateTokens(tokenData.user_id);

    return response.success(res, {
      token: newTokens.accessToken,
      refreshToken: newTokens.refreshToken
    }, 'Token refreshed');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Logout user (invalidate refresh token)
 */
router.post('/logout', authMiddleware, async (req, res, next) => {
  try {
    // Delete all refresh tokens for this user
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [req.userId]);

    return response.success(res, null, 'Logout berhasil');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current user
 */
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const [users] = await pool.query(
      'SELECT id, email, name, avatar_url, created_at FROM users WHERE id = ?',
      [req.userId]
    );

    if (users.length === 0) {
      return response.notFound(res, 'User tidak ditemukan');
    }

    return response.success(res, { user: users[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', authMiddleware, updateProfileRules, validate, async (req, res, next) => {
  try {
    const { name, avatar_url } = req.body;

    const updates = [];
    const values = [];

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      values.push(avatar_url);
    }

    if (updates.length === 0) {
      return response.error(res, 'Tidak ada data yang diupdate', 400);
    }

    values.push(req.userId);
    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Get updated user
    const [users] = await pool.query(
      'SELECT id, email, name, avatar_url FROM users WHERE id = ?',
      [req.userId]
    );

    return response.success(res, { user: users[0] }, 'Profil berhasil diupdate');
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/auth/change-password
 * Change user password
 */
router.put('/change-password', authMiddleware, changePasswordRules, validate, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // Get current user
    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [req.userId]);
    if (users.length === 0) {
      return response.notFound(res, 'User tidak ditemukan');
    }

    // Verify old password
    const isValidPassword = await bcrypt.compare(oldPassword, users[0].password);
    if (!isValidPassword) {
      return response.error(res, 'Password lama tidak sesuai', 400);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.userId]);

    // Invalidate all refresh tokens
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [req.userId]);

    return response.success(res, null, 'Password berhasil diubah');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/forgot-password
 * Reset password by verifying name and email
 */
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { name, email, newPassword } = req.body;

    if (!name || !email || !newPassword) {
      return response.error(res, 'Nama, email, dan password baru harus diisi', 400);
    }

    // Find user by name AND email
    const [users] = await pool.query(
      'SELECT id FROM users WHERE name = ? AND email = ?',
      [name, email]
    );

    if (users.length === 0) {
      return response.error(res, 'Nama atau email tidak sesuai', 400);
    }

    const user = users[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);

    // Invalidate all refresh tokens
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [user.id]);

    return response.success(res, null, 'Password berhasil diubah. Silakan login dengan password baru.');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
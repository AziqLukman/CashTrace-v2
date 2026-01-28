// backend/validators/authValidator.js
// Validation rules untuk auth endpoints

const { body } = require('express-validator');

const registerRules = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Email tidak valid')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password minimal 6 karakter'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Nama wajib diisi')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nama harus 2-100 karakter')
];

const loginRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Nama wajib diisi'),
  body('password')
    .notEmpty()
    .withMessage('Password wajib diisi')
];

const updateProfileRules = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nama harus 2-100 karakter'),
  body('avatar_url')
    .optional()
    .isURL()
    .withMessage('URL avatar tidak valid')
];

const changePasswordRules = [
  body('oldPassword')
    .notEmpty()
    .withMessage('Password lama wajib diisi'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Password baru minimal 6 karakter')
];

module.exports = {
  registerRules,
  loginRules,
  updateProfileRules,
  changePasswordRules
};

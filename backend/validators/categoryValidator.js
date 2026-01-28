// backend/validators/categoryValidator.js
// Validation rules untuk category endpoints

const { body, param } = require('express-validator');

const createCategoryRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Nama kategori wajib diisi')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nama kategori harus 2-100 karakter'),
  body('type')
    .notEmpty()
    .withMessage('Tipe kategori wajib diisi')
    .isIn(['income', 'expense'])
    .withMessage('Tipe harus income atau expense'),
  body('icon')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Icon maksimal 100 karakter'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Format warna harus hex (contoh: #3B82F6)')
];

const updateCategoryRules = [
  param('id')
    .isInt()
    .withMessage('ID kategori tidak valid'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nama kategori harus 2-100 karakter'),
  body('icon')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Icon maksimal 100 karakter'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Format warna harus hex (contoh: #3B82F6)')
];

module.exports = {
  createCategoryRules,
  updateCategoryRules
};

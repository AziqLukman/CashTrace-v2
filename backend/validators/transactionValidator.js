// backend/validators/transactionValidator.js
// Validation rules untuk transaction endpoints

const { body, query, param } = require('express-validator');

const createTransactionRules = [
  body('amount')
    .notEmpty()
    .withMessage('Jumlah wajib diisi')
    .isNumeric()
    .withMessage('Jumlah harus berupa angka')
    .custom(value => value > 0)
    .withMessage('Jumlah harus lebih dari 0'),
  body('type')
    .notEmpty()
    .withMessage('Tipe transaksi wajib diisi')
    .isIn(['income', 'expense'])
    .withMessage('Tipe harus income atau expense'),
  body('transactionDate')
    .notEmpty()
    .withMessage('Tanggal transaksi wajib diisi')
    .isISO8601()
    .withMessage('Format tanggal tidak valid'),
  body('categoryId')
    .optional({ nullable: true })
    .isInt()
    .withMessage('Category ID harus berupa angka'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Deskripsi maksimal 500 karakter')
];

const updateTransactionRules = [
  param('id')
    .isInt()
    .withMessage('ID transaksi tidak valid'),
  body('amount')
    .optional()
    .isNumeric()
    .withMessage('Jumlah harus berupa angka')
    .custom(value => value > 0)
    .withMessage('Jumlah harus lebih dari 0'),
  body('type')
    .optional()
    .isIn(['income', 'expense'])
    .withMessage('Tipe harus income atau expense'),
  body('transactionDate')
    .optional()
    .isISO8601()
    .withMessage('Format tanggal tidak valid'),
  body('categoryId')
    .optional({ nullable: true })
    .isInt()
    .withMessage('Category ID harus berupa angka'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Deskripsi maksimal 500 karakter')
];

const getTransactionsRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page harus angka positif'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit harus 1-100'),
  query('type')
    .optional()
    .isIn(['income', 'expense'])
    .withMessage('Tipe harus income atau expense'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Format startDate tidak valid'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Format endDate tidak valid')
];

module.exports = {
  createTransactionRules,
  updateTransactionRules,
  getTransactionsRules
};

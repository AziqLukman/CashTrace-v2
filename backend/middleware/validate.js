// backend/middleware/validate.js
// Validation middleware using express-validator

const { validationResult } = require('express-validator');

/**
 * Middleware to check validation results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorArray = errors.array();
    const firstError = errorArray[0].msg;
    
    return res.status(400).json({
      success: false,
      message: firstError, // Return specific error message for frontend to display
      errors: errorArray.map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  
  next();
};

module.exports = validate;

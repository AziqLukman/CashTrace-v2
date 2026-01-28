// backend/middleware/errorHandler.js
// Centralized error handling middleware

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error values
  let statusCode = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // MySQL duplicate entry error
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 400;
    message = 'Data already exists';
  }

  // MySQL foreign key error
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400;
    message = 'Referenced data not found';
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;

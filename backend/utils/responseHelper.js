// backend/utils/responseHelper.js
// Helper untuk standardisasi response API

/**
 * Success response
 */
const success = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Error response
 */
const error = (res, message = 'Error', statusCode = 400, errors = null) => {
  const response = {
    success: false,
    message
  };
  
  if (errors) {
    response.errors = errors;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Paginated response
 */
const paginated = (res, data, pagination, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination
  });
};

/**
 * Created response (201)
 */
const created = (res, data, message = 'Created successfully') => {
  return success(res, data, message, 201);
};

/**
 * Not found response (404)
 */
const notFound = (res, message = 'Resource not found') => {
  return error(res, message, 404);
};

/**
 * Unauthorized response (401)
 */
const unauthorized = (res, message = 'Unauthorized') => {
  return error(res, message, 401);
};

/**
 * Forbidden response (403)
 */
const forbidden = (res, message = 'Forbidden') => {
  return error(res, message, 403);
};

/**
 * Server error response (500)
 */
const serverError = (res, message = 'Internal server error') => {
  return error(res, message, 500);
};

module.exports = {
  success,
  error,
  paginated,
  created,
  notFound,
  unauthorized,
  forbidden,
  serverError
};

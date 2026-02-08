const { constants } = require("../config/config.inc");

const responseHandler = (
  res,
  data = null,
  message = "Request successful",
  statusCode = 200,
) => {
  res.status(statusCode).json({
    status: statusCode,
    message,
    data,
  });
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode =
    res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || "Something went wrong";

  switch (statusCode) {
    case constants.VALIDATION_ERROR:
      statusCode = 400;
      message = err.message || "Validation failed";
      break;
    case constants.UNAUTHORIZED:
      statusCode = 401;
      message = err.message || "Unauthorized";
      break;
    case constants.FORBIDDEN:
      statusCode = 403;
      message = err.message || "Forbidden";
      break;
    case constants.NOT_FOUND:
      statusCode = 404;
      message = err.message || "Not Found";
      break;
    case constants.SERVER_ERROR:
    default:
      statusCode = 500;
      message = err.message || "Server Error";
      break;
  }

  // Include stack trace in the response only in development
  const responseData = {
    status: statusCode,
    message,
  };

  // if (process.env.NODE_ENV === 'development') {
  responseData.stack = err.stack;
  //}

  res.status(statusCode).json(responseData);
};

module.exports = { responseHandler, errorHandler };

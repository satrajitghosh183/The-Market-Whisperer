/**
 * Request/Response logging middleware
 */
export function requestLogger(req, res, next) {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;

  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Request ID: ${requestId}`);

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusColor = res.statusCode >= 400 ? '🔴' : res.statusCode >= 300 ? '🟡' : '🟢';
    console.log(
      `${statusColor} [${new Date().toISOString()}] ${req.method} ${req.path} - ` +
      `Status: ${res.statusCode} - Duration: ${duration}ms - Request ID: ${requestId}`
    );
  });

  next();
}

/**
 * Error logging middleware
 */
export function errorLogger(err, req, res, next) {
  const requestId = req.requestId || 'unknown';
  
  console.error(`[${new Date().toISOString()}] ERROR - Request ID: ${requestId}`);
  console.error(`  Path: ${req.method} ${req.path}`);
  console.error(`  Error: ${err.message}`);
  if (err.stack) {
    console.error(`  Stack: ${err.stack}`);
  }
  if (err.response) {
    console.error(`  API Response Status: ${err.response.status}`);
    console.error(`  API Response Data:`, err.response.data);
  }

  next(err);
}


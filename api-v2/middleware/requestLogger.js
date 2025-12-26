const { v4: uuidv4 } = require('uuid');

const requestLogger = (req, res, next) => {
  req.id = uuidv4();
  const start = Date.now();

  // Log request
  console.log(`[${req.id}] ${req.method} ${req.path}`);

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.id}] ${res.statusCode} - ${duration}ms`);
  });

  next();
};

module.exports = requestLogger;

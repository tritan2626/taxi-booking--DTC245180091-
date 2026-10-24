const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { register, metricsMiddleware } = require('./middlewares/metrics');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
const db = require('./config/db');

// Route modules
const customerRoutes = require('./routes/customerRoutes');
const driverRoutes = require('./routes/driverRoutes');
const rideRoutes = require('./routes/rideRoutes');

const app = express();

// Standard middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Standard Morgan Logger for HTTP Access Logs (Promtail/Loki friendly)
app.use(
  morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms')
);

// Prometheus metrics recording middleware
app.use(metricsMiddleware);

// Prometheus /metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbCheck = await db.query('SELECT 1');
    res.json({
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: dbCheck ? 'CONNECTED' : 'DOWN',
    });
  } catch (err) {
    res.status(503).json({
      status: 'DEGRADED',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: 'DISCONNECTED',
      error: err.message,
    });
  }
});

// Documentation / API info route (also accessible via /api-info)
const sendApiInfo = (req, res) => {
  res.json({
    service: 'Taxi Booking Backend API',
    status: 'Running',
    version: '1.0.0',
    endpoints: {
      frontend: '/',
      metrics: '/metrics',
      health: '/health',
      customers: '/api/customers',
      drivers: '/api/drivers',
      rides: '/api/rides',
      update_ride_status: 'PATCH /api/rides/:id/status (body: { "status": "COMPLETED" | "PENDING" | ... })',
    },
  });
};

app.get('/api-info', sendApiInfo);

// Root route: Serve frontend index.html for web browsers, JSON for API-only clients
app.get('/', (req, res) => {
  if (req.accepts('html')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  return sendApiInfo(req, res);
});

// API Routes
app.use('/api/customers', customerRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/rides', rideRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

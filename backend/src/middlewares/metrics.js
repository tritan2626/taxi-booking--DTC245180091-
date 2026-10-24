const client = require('prom-client');

// Create a custom Registry
const register = new client.Registry();

// Add default recommended metrics (CPU, Memory, Event Loop, GC, etc.)
client.collectDefaultMetrics({
  register,
  prefix: 'taxibooking_',
});

// HTTP Requests Counter
const httpRequestsTotal = new client.Counter({
  name: 'taxibooking_http_requests_total',
  help: 'Total number of HTTP requests processed',
  labelNames: ['method', 'route', 'status_code'],
});
register.registerMetric(httpRequestsTotal);

// HTTP Request Duration Histogram
const httpRequestDurationSeconds = new client.Histogram({
  name: 'taxibooking_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});
register.registerMetric(httpRequestDurationSeconds);

// Ride Status Transitions Counter
const rideStatusTransitionsTotal = new client.Counter({
  name: 'taxibooking_ride_status_transitions_total',
  help: 'Total count of ride status changes',
  labelNames: ['previous_status', 'new_status'],
});
register.registerMetric(rideStatusTransitionsTotal);

// Active/Pending Rides Gauge
const activeRidesGauge = new client.Gauge({
  name: 'taxibooking_active_rides_count',
  help: 'Current number of active or in-progress rides',
  labelNames: ['status'],
});
register.registerMetric(activeRidesGauge);

// Middleware to record request metrics
const metricsMiddleware = (req, res, next) => {
  if (req.path === '/metrics') {
    return next();
  }

  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationSeconds = diff[0] + diff[1] / 1e9;
    const route = req.baseUrl + (req.route ? req.route.path : req.path);
    const statusCode = res.statusCode ? res.statusCode.toString() : 'unknown';

    httpRequestsTotal.inc({
      method: req.method,
      route,
      status_code: statusCode,
    });

    httpRequestDurationSeconds.observe(
      {
        method: req.method,
        route,
        status_code: statusCode,
      },
      durationSeconds
    );
  });

  next();
};

module.exports = {
  register,
  metricsMiddleware,
  metrics: {
    httpRequestsTotal,
    httpRequestDurationSeconds,
    rideStatusTransitionsTotal,
    activeRidesGauge,
  },
};

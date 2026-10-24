require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initDatabase, pool } = require('./config/db');

const PORT = parseInt(process.env.PORT || '5000', 10);

const startServer = async () => {
  try {
    // Ensure DB connection and schema migrations are ready
    await initDatabase();

    const server = http.createServer(app);

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`===============================================`);
      console.log(`🚖 Taxi Booking API running on port ${PORT}`);
      console.log(`📊 Prometheus Metrics: http://localhost:${PORT}/metrics`);
      console.log(`💓 Health check: http://localhost:${PORT}/health`);
      console.log(`===============================================`);
    });

    // Graceful Shutdown
    const shutdown = async (signal) => {
      console.log(`\n[SHUTDOWN] Received ${signal}. Closing server gracefully...`);
      server.close(async () => {
        console.log('[SHUTDOWN] HTTP server closed.');
        try {
          await pool.end();
          console.log('[SHUTDOWN] Database pool closed.');
          process.exit(0);
        } catch (err) {
          console.error('[SHUTDOWN] Error closing DB pool:', err);
          process.exit(1);
        }
      });

      // Force shutdown after 10s if dangling connections remain
      setTimeout(() => {
        console.error('[SHUTDOWN] Forcing shutdown after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('Fatal error starting application:', err);
    process.exit(1);
  }
};

startServer();

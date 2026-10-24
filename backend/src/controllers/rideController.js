const db = require('../config/db');
const { metrics } = require('../middlewares/metrics');

const VALID_STATUSES = ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

// Helper to refresh active rides gauge metric
const updateActiveRidesMetric = async () => {
  try {
    const { rows } = await db.query(
      `SELECT status, COUNT(*)::int AS count 
       FROM rides 
       GROUP BY status`
    );
    // Reset or update gauge for statuses
    VALID_STATUSES.forEach((st) => {
      const match = rows.find((r) => r.status === st);
      metrics.activeRidesGauge.set({ status: st }, match ? match.count : 0);
    });
  } catch (err) {
    console.error('[METRICS] Error updating active rides gauge:', err.message);
  }
};

// GET /api/rides
exports.getAllRides = async (req, res, next) => {
  try {
    const { status, customer_id, driver_id, limit = 50, offset = 0 } = req.query;

    let queryText = `
      SELECT 
        r.id,
        r.pickup_location,
        r.dropoff_location,
        r.fare,
        r.status,
        r.created_at,
        r.updated_at,
        c.id AS customer_id,
        c.name AS customer_name,
        c.phone AS customer_phone,
        d.id AS driver_id,
        d.name AS driver_name,
        d.phone AS driver_phone,
        d.license_number AS driver_license
      FROM rides r
      JOIN customers c ON r.customer_id = c.id
      LEFT JOIN drivers d ON r.driver_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status.toUpperCase());
      queryText += ` AND r.status = $${params.length}`;
    }

    if (customer_id) {
      params.push(parseInt(customer_id, 10));
      queryText += ` AND r.customer_id = $${params.length}`;
    }

    if (driver_id) {
      params.push(parseInt(driver_id, 10));
      queryText += ` AND r.driver_id = $${params.length}`;
    }

    queryText += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const { rows } = await db.query(queryText, params);

    res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/rides/:id
exports.getRideById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const queryText = `
      SELECT 
        r.id,
        r.pickup_location,
        r.dropoff_location,
        r.fare,
        r.status,
        r.created_at,
        r.updated_at,
        c.id AS customer_id,
        c.name AS customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email,
        d.id AS driver_id,
        d.name AS driver_name,
        d.phone AS driver_phone,
        d.license_number AS driver_license,
        d.rating AS driver_rating
      FROM rides r
      JOIN customers c ON r.customer_id = c.id
      LEFT JOIN drivers d ON r.driver_id = d.id
      WHERE r.id = $1
    `;

    const { rows } = await db.query(queryText, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Ride with ID ${id} not found`,
      });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/rides
exports.createRide = async (req, res, next) => {
  try {
    const { customer_id, driver_id, pickup_location, dropoff_location, fare, status } = req.body;

    if (!customer_id || !pickup_location || !dropoff_location) {
      return res.status(400).json({
        success: false,
        message: 'customer_id, pickup_location, and dropoff_location are required fields',
      });
    }

    // Verify customer exists
    const customerCheck = await db.query('SELECT id FROM customers WHERE id = $1', [customer_id]);
    if (customerCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Customer with ID ${customer_id} does not exist`,
      });
    }

    // If driver provided, verify driver
    if (driver_id) {
      const driverCheck = await db.query('SELECT id FROM drivers WHERE id = $1', [driver_id]);
      if (driverCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Driver with ID ${driver_id} does not exist`,
        });
      }
    }

    const initialStatus = status ? status.toUpperCase() : 'PENDING';
    if (!VALID_STATUSES.includes(initialStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const { rows } = await db.query(
      `INSERT INTO rides (customer_id, driver_id, pickup_location, dropoff_location, fare, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        customer_id,
        driver_id || null,
        pickup_location,
        dropoff_location,
        fare !== undefined ? parseFloat(fare) : 0.0,
        initialStatus,
      ]
    );

    // Track metrics
    metrics.rideStatusTransitionsTotal.inc({
      previous_status: 'NONE',
      new_status: initialStatus,
    });
    updateActiveRidesMetric();

    res.status(201).json({
      success: true,
      message: 'Ride created successfully',
      data: rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/rides/:id
exports.updateRide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { driver_id, pickup_location, dropoff_location, fare, status } = req.body;

    const existing = await db.query('SELECT * FROM rides WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Ride with ID ${id} not found`,
      });
    }

    const currentRide = existing.rows[0];
    const newStatus = status ? status.toUpperCase() : currentRide.status;

    if (status && !VALID_STATUSES.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const updated = await db.query(
      `UPDATE rides
       SET driver_id = COALESCE($1, driver_id),
           pickup_location = COALESCE($2, pickup_location),
           dropoff_location = COALESCE($3, dropoff_location),
           fare = COALESCE($4, fare),
           status = COALESCE($5, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [
        driver_id !== undefined ? driver_id : null,
        pickup_location || null,
        dropoff_location || null,
        fare !== undefined ? parseFloat(fare) : null,
        newStatus,
        id,
      ]
    );

    if (currentRide.status !== newStatus) {
      metrics.rideStatusTransitionsTotal.inc({
        previous_status: currentRide.status,
        new_status: newStatus,
      });
      updateActiveRidesMetric();
    }

    res.json({
      success: true,
      message: 'Ride updated successfully',
      data: updated.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/rides/:id/status (dedicated endpoint to change ride status e.g. PENDING -> COMPLETED)
exports.updateRideStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: status',
      });
    }

    const targetStatus = status.toUpperCase();
    if (!VALID_STATUSES.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status "${status}". Allowed values: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const existing = await db.query('SELECT id, status FROM rides WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Ride with ID ${id} not found`,
      });
    }

    const previousStatus = existing.rows[0].status;

    const updated = await db.query(
      `UPDATE rides
       SET status = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [targetStatus, id]
    );

    // Track Prometheus Metrics
    metrics.rideStatusTransitionsTotal.inc({
      previous_status: previousStatus,
      new_status: targetStatus,
    });
    updateActiveRidesMetric();

    res.json({
      success: true,
      message: `Ride status updated from ${previousStatus} to ${targetStatus}`,
      data: updated.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/rides/:id
exports.deleteRide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query('DELETE FROM rides WHERE id = $1', [id]);

    if (rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: `Ride with ID ${id} not found`,
      });
    }

    updateActiveRidesMetric();

    res.json({
      success: true,
      message: `Ride with ID ${id} deleted successfully`,
    });
  } catch (err) {
    next(err);
  }
};

const db = require('../config/db');

// GET /api/drivers
exports.getAllDrivers = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    let queryText = 'SELECT * FROM drivers WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status.toUpperCase());
      queryText += ` AND status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      queryText += ` AND (name ILIKE $${params.length} OR phone ILIKE $${params.length} OR license_number ILIKE $${params.length})`;
    }

    queryText += ' ORDER BY id ASC';
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

// GET /api/drivers/:id
exports.getDriverById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT * FROM drivers WHERE id = $1', [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Driver with ID ${id} not found`,
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

// POST /api/drivers
exports.createDriver = async (req, res, next) => {
  try {
    const { name, phone, license_number, status, rating } = req.body;

    if (!name || !phone || !license_number) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone, and license_number are required fields',
      });
    }

    const driverStatus = status ? status.toUpperCase() : 'AVAILABLE';
    const driverRating = rating !== undefined ? parseFloat(rating) : 5.0;

    const { rows } = await db.query(
      `INSERT INTO drivers (name, phone, license_number, status, rating)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, phone, license_number, driverStatus, driverRating]
    );

    res.status(201).json({
      success: true,
      message: 'Driver created successfully',
      data: rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Driver with this phone or license_number already exists',
      });
    }
    next(err);
  }
};

// PUT /api/drivers/:id
exports.updateDriver = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, license_number, status, rating } = req.body;

    const existing = await db.query('SELECT * FROM drivers WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Driver with ID ${id} not found`,
      });
    }

    const updated = await db.query(
      `UPDATE drivers
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           license_number = COALESCE($3, license_number),
           status = COALESCE($4, status),
           rating = COALESCE($5, rating)
       WHERE id = $6
       RETURNING *`,
      [
        name,
        phone,
        license_number,
        status ? status.toUpperCase() : null,
        rating !== undefined ? parseFloat(rating) : null,
        id,
      ]
    );

    res.json({
      success: true,
      message: 'Driver updated successfully',
      data: updated.rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Phone or license_number already in use by another driver',
      });
    }
    next(err);
  }
};

// DELETE /api/drivers/:id
exports.deleteDriver = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query('DELETE FROM drivers WHERE id = $1', [id]);

    if (rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: `Driver with ID ${id} not found`,
      });
    }

    res.json({
      success: true,
      message: `Driver with ID ${id} deleted successfully`,
    });
  } catch (err) {
    next(err);
  }
};

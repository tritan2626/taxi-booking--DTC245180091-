const db = require('../config/db');

// GET /api/customers
exports.getAllCustomers = async (req, res, next) => {
  try {
    const { search } = req.query;
    let queryText = 'SELECT * FROM customers';
    const params = [];

    if (search) {
      queryText += ' WHERE name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1';
      params.push(`%${search}%`);
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

// GET /api/customers/:id
exports.getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT * FROM customers WHERE id = $1', [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Customer with ID ${id} not found`,
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

// POST /api/customers
exports.createCustomer = async (req, res, next) => {
  try {
    const { name, phone, email } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required fields',
      });
    }

    const { rows } = await db.query(
      'INSERT INTO customers (name, phone, email) VALUES ($1, $2, $3) RETURNING *',
      [name, phone, email || null]
    );

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Customer with this phone or email already exists',
      });
    }
    next(err);
  }
};

// PUT /api/customers/:id
exports.updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, email } = req.body;

    const existing = await db.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Customer with ID ${id} not found`,
      });
    }

    const updated = await db.query(
      `UPDATE customers
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           email = COALESCE($3, email)
       WHERE id = $4
       RETURNING *`,
      [name, phone, email, id]
    );

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: updated.rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Phone or email already in use by another customer',
      });
    }
    next(err);
  }
};

// DELETE /api/customers/:id
exports.deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query('DELETE FROM customers WHERE id = $1', [id]);

    if (rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: `Customer with ID ${id} not found`,
      });
    }

    res.json({
      success: true,
      message: `Customer with ID ${id} deleted successfully`,
    });
  } catch (err) {
    next(err);
  }
};

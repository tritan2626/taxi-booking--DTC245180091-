-- Taxi Booking Initial Schema and Seed Data

-- 1. Create Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Drivers Table
CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'BUSY', 'OFFLINE')),
    rating NUMERIC(3, 2) DEFAULT 5.00 CHECK (rating >= 0 AND rating <= 5.0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Rides Table
CREATE TABLE IF NOT EXISTS rides (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    driver_id INT REFERENCES drivers(id) ON DELETE SET NULL,
    pickup_location VARCHAR(255) NOT NULL,
    dropoff_location VARCHAR(255) NOT NULL,
    fare NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for fast search and joins
CREATE INDEX IF NOT EXISTS idx_rides_customer ON rides(customer_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);

-- Seed Initial Data if empty
INSERT INTO customers (name, phone, email)
VALUES 
    ('Nguyen Van A', '0901234567', 'nguyenvana@example.com'),
    ('Tran Thi B', '0912345678', 'tranthib@example.com'),
    ('Le Van C', '0987654321', 'levanc@example.com')
ON CONFLICT (phone) DO NOTHING;

INSERT INTO drivers (name, phone, license_number, status, rating)
VALUES 
    ('Pham Van Tai', '0933112233', 'B2-882910', 'AVAILABLE', 4.95),
    ('Hoang Quoc Viet', '0944223344', 'B2-192837', 'AVAILABLE', 4.80),
    ('Doan Van Hau', '0955334455', 'B2-554433', 'BUSY', 5.00)
ON CONFLICT (phone) DO NOTHING;

INSERT INTO rides (customer_id, driver_id, pickup_location, dropoff_location, fare, status)
VALUES 
    (1, 1, '120 Le Duan, Da Nang', 'Da Nang International Airport', 85000, 'COMPLETED'),
    (2, 2, '54 Nguyen Hue, Quan 1, TP.HCM', 'Landmark 81, Binh Thanh, TP.HCM', 120000, 'PENDING'),
    (3, 3, 'My Dinh Stadium, Ha Noi', 'Hoan Kiem Lake, Ha Noi', 150000, 'IN_PROGRESS')
ON CONFLICT DO NOTHING;

-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'customer'
);

-- Crear tabla de categorías
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- Crear tabla de productos vinculada a categorías
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL
);

-- Insertar categorías por defecto (temática Bikeinn)
INSERT INTO categories (name) VALUES 
('Bicicletas'), 
('Componentes'), 
('Equipamiento'), 
('Nutrición')
ON CONFLICT (name) DO NOTHING;

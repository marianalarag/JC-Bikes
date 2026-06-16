const express = require('express');
const cors = require('cors');
const pool = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors()); // Permite peticiones desde el frontend (React)
app.use(express.json()); // Permite recibir y enviar JSON

// 1. Endpoint para iniciar sesión (Login)
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar al usuario en la base de datos
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }

        const user = userResult.rows[0];

        // Verificar que la contraseña coincida con la encriptada
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }

        // Generar un Token de sesión válido por 2 horas
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET || 'super_secreto_desarrollo',
            { expiresIn: '2h' }
        );

        // Enviar respuesta exitosa con el rol del usuario
        res.json({
            message: "Login exitoso",
            token,
            role: user.role,
            name: user.name
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error en el servidor');
    }
});

// 2. Endpoint temporal "Mágico" para crear tus usuarios de prueba iniciales
app.get('/api/setup-users', async (req, res) => {
    try {
        // Encriptamos las contraseñas
        const hashedAdminPass = await bcrypt.hash('admin123', 10);
        const hashedUserPass = await bcrypt.hash('cliente123', 10);

        // Insertamos al Administrador (Cuenta Maestra)
        await pool.query(
            "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING",
            ['Cuenta Maestra', 'admin@jcbikes.com', hashedAdminPass, 'admin']
        );

        // Insertamos al Cliente Normal
        await pool.query(
            "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING",
            ['Cliente Prueba', 'cliente@jcbikes.com', hashedUserPass, 'customer']
        );

        res.send("Usuarios de prueba creados exitosamente en DBeaver.");
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error creando usuarios');
    }
});

// 3. Endpoint para Registrar nuevos clientes
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Verificar si el usuario ya existe
        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: "El correo electrónico ya está registrado." });
        }

        // Encriptar contraseña
        const salt = await bcrypt.genSalt(10);
        const bcryptPassword = await bcrypt.hash(password, salt);

        // Insertar en la BD
        const newUser = await pool.query(
            "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'customer') RETURNING id, name, email, role",
            [name, email, bcryptPassword]
        );

        // Generar token
        const token = jwt.sign({ id: newUser.rows[0].id, role: newUser.rows[0].role }, process.env.JWT_SECRET || 'super_secreto_desarrollo', { expiresIn: '2h' });

        res.json({ message: "Registro exitoso", token, role: newUser.rows[0].role, name: newUser.rows[0].name });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error en el servidor');
    }
});

// Rutas
// 4. Endpoint "Mágico" para crear las tablas de la tienda y cargar datos de prueba
app.get('/api/setup-store', async (req, res) => {
    try {
        // Creación de las tablas relacionales
        await pool.query(`
             DROP TABLE IF EXISTS reviews, product_variants, products, categories CASCADE;
             CREATE TABLE IF NOT EXISTS categories (
                 id SERIAL PRIMARY KEY,
                 name VARCHAR(100) UNIQUE NOT NULL
             );
             CREATE TABLE IF NOT EXISTS products (
                 id SERIAL PRIMARY KEY,
                 category_id INTEGER REFERENCES categories(id),
                 name VARCHAR(255) UNIQUE NOT NULL,
                 description TEXT,
                 price NUMERIC(10, 2) NOT NULL,
                 image_url TEXT,
                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
             );
             CREATE TABLE IF NOT EXISTS product_variants (
                 id SERIAL PRIMARY KEY,
                 product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
                 color VARCHAR(50),
                 size VARCHAR(50),
                 stock INTEGER DEFAULT 0
             );
             CREATE TABLE IF NOT EXISTS reviews (
                 id SERIAL PRIMARY KEY,
                 product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
                 user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                 rating INTEGER CHECK (rating >= 1 AND rating <= 5),
                 comment TEXT,
                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
             );
         `);

        // Inserción de Categorías
        await pool.query(`INSERT INTO categories (name) VALUES ('Bicicletas'), ('Accesorios'), ('Repuestos') ON CONFLICT (name) DO NOTHING;`);

        // Inserción de Productos
        await pool.query(`
             INSERT INTO products (category_id, name, description, price, image_url) VALUES 
             ((SELECT id FROM categories WHERE name = 'Bicicletas' LIMIT 1), 'Bicicleta de Montaña Pro', 'Chasis de aluminio ligero, frenos de disco hidráulicos y suspensión avanzada.', 599.99, 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=600&q=80'),
             ((SELECT id FROM categories WHERE name = 'Accesorios' LIMIT 1), 'Casco Aerodinámico', 'Máxima protección y velocidad con diseño ergonómico y ventilado.', 89.50, 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&q=80'),
             ((SELECT id FROM categories WHERE name = 'Repuestos' LIMIT 1), 'Cadena Shimano 11v', 'Alta durabilidad y rendimiento para las subidas más exigentes.', 25.00, 'https://images.unsplash.com/photo-1558235282-50dce421d014?w=600&q=80')
             ON CONFLICT (name) DO NOTHING;
         `);

        // Limpieza rápida y carga de variantes y reseñas (para evitar duplicados infinitos al recargar)
        await pool.query(`DELETE FROM product_variants; DELETE FROM reviews;`);

        await pool.query(`
             INSERT INTO product_variants (product_id, color, size, stock) VALUES 
             ((SELECT id FROM products WHERE name = 'Bicicleta de Montaña Pro' LIMIT 1), 'Rojo', 'M', 5), 
             ((SELECT id FROM products WHERE name = 'Bicicleta de Montaña Pro' LIMIT 1), 'Rojo', 'L', 3), 
             ((SELECT id FROM products WHERE name = 'Bicicleta de Montaña Pro' LIMIT 1), 'Negro', 'M', 2),
             ((SELECT id FROM products WHERE name = 'Casco Aerodinámico' LIMIT 1), 'Blanco', 'Única', 10);
             
             INSERT INTO reviews (product_id, user_id, rating, comment) VALUES 
             ((SELECT id FROM products WHERE name = 'Bicicleta de Montaña Pro' LIMIT 1), (SELECT id FROM users LIMIT 1), 5, '¡Excelente bicicleta!'),
             ((SELECT id FROM products WHERE name = 'Bicicleta de Montaña Pro' LIMIT 1), (SELECT id FROM users LIMIT 1), 4, 'Muy buena pero algo pesada.'),
             ((SELECT id FROM products WHERE name = 'Casco Aerodinámico' LIMIT 1), (SELECT id FROM users LIMIT 1), 5, 'Muy seguro y cómodo.');
         `);

        res.send("✅ Tablas de tienda y productos de prueba creados exitosamente en PostgreSQL.");
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error configurando la tienda: ' + err.message);
    }
});

// 5. Obtener Categorías
app.get('/api/categories', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM categories ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).send('Error en el servidor');
    }
});

// 6. Obtener Productos (con buscador, filtros, variantes y agregación de reseñas)
app.get('/api/products', async (req, res) => {
    try {
        const { search, category_id } = req.query;

        let query = `
             SELECT p.*,
                    c.name as category_name,
                    (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE product_id = p.id) as average_rating,
                    (SELECT COUNT(id) FROM reviews WHERE product_id = p.id) as review_count,
                    (
                        SELECT json_agg(json_build_object('color', pv.color, 'size', pv.size, 'stock', pv.stock)) 
                        FROM product_variants pv WHERE pv.product_id = p.id
                    ) as variants
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE 1=1
         `;

        const queryParams = [];
        let paramIndex = 1;

        // Motor de búsqueda por nombre
        if (search) {
            query += ` AND p.name ILIKE $${paramIndex}`;
            queryParams.push(`%${search}%`);
            paramIndex++;
        }

        // Filtro por categoría
        if (category_id) {
            query += ` AND p.category_id = $${paramIndex}`;
            queryParams.push(category_id);
            paramIndex++;
        }

        query += ` ORDER BY p.id DESC`;

        const allProducts = await pool.query(query, queryParams);
        res.json(allProducts.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error en el servidor');
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor Express corriendo en el puerto ${PORT}`);
});
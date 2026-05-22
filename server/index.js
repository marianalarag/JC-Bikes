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
app.get('/api/products', async (req, res) => {
    try {
        // Cuando crees tu tabla "products" en DBeaver, descomenta estas dos líneas:
        // const allProducts = await pool.query('SELECT * FROM products');
        // res.json(allProducts.rows);
        
        // Datos de prueba para probar la conexión con el frontend rápidamente:
        res.json([{ id: 1, name: 'Bicicleta de Montaña', price: 499.99 }, { id: 2, name: 'Casco Profesional', price: 59.99 }]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error en el servidor');
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor Express corriendo en el puerto ${PORT}`);
});
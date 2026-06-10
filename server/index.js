const express = require("express");
const cors = require("cors");
const pool = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors()); // Permite peticiones desde el frontend (React)
app.use(express.json()); // Permite recibir y enviar JSON

// 1. Endpoint para iniciar sesión (Login)
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar al usuario en la base de datos
    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );

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
      process.env.JWT_SECRET || "super_secreto_desarrollo",
      { expiresIn: "2h" },
    );

    // Enviar respuesta exitosa con el rol del usuario
    res.json({
      message: "Login exitoso",
      token,
      role: user.role,
      name: user.name,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error en el servidor");
  }
});

// 2. Endpoint temporal "Mágico" para crear tus usuarios de prueba iniciales
app.get("/api/setup-users", async (req, res) => {
  try {
    // Encriptamos las contraseñas
    const hashedAdminPass = await bcrypt.hash("admin123", 10);
    const hashedUserPass = await bcrypt.hash("cliente123", 10);

    // Insertamos al Administrador (Cuenta Maestra)
    await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING",
      ["Cuenta Maestra", "admin@jcbikes.com", hashedAdminPass, "admin"],
    );

    // Insertamos al Cliente Normal
    await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING",
      ["Cliente Prueba", "cliente@jcbikes.com", hashedUserPass, "customer"],
    );

    res.send("Usuarios de prueba creados exitosamente en DBeaver.");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error creando usuarios");
  }
});

// 3. Endpoint para Registrar nuevos clientes
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validación: Campos requeridos
    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Todos los campos son requeridos (name, email, password).",
      });
    }

    // Validación: Nombre válido
    if (name.trim().length < 3) {
      return res
        .status(400)
        .json({ error: "El nombre debe tener al menos 3 caracteres." });
    }

    // Validación: Email válido
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ error: "Por favor ingresa un correo electrónico válido." });
    }

    // Validación: Contraseña fuerte (mínimo 8 caracteres)
    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "La contraseña debe tener al menos 8 caracteres." });
    }

    // Verificar si el usuario ya existe
    const userExists = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email.toLowerCase()],
    );
    if (userExists.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "El correo electrónico ya está registrado." });
    }

    // Encriptar contraseña con bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insertar nuevo usuario en la BD
    const newUser = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'customer') RETURNING id, name, email, role",
      [name.trim(), email.toLowerCase(), hashedPassword],
    );

    // Generar token JWT
    const token = jwt.sign(
      { id: newUser.rows[0].id, role: newUser.rows[0].role },
      process.env.JWT_SECRET || "super_secreto_desarrollo",
      { expiresIn: "2h" },
    );

    console.log(`✓ Nuevo usuario registrado: ${email}`);

    res.status(201).json({
      message: "Registro exitoso",
      token,
      role: newUser.rows[0].role,
      name: newUser.rows[0].name,
    });
  } catch (err) {
    console.error("Error en /api/register:", err.message);
    res
      .status(500)
      .json({ error: "Error en el servidor. Por favor intenta más tarde." });
  }
});

// Middleware para verificar JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Formato: "Bearer TOKEN"

  if (!token) {
    return res
      .status(401)
      .json({ error: "Acceso denegado. Token no proporcionado." });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET || "super_secreto_desarrollo",
    (err, user) => {
      if (err) {
        return res.status(403).json({ error: "Token inválido o expirado." });
      }
      req.user = user;
      next();
    },
  );
};

// Middleware para verificar si el usuario es Administrador
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res
      .status(403)
      .json({ error: "Acceso restringido. Solo administradores." });
  }
};

// ==========================================
// RUTAS DE LA ENTIDAD CATEGORÍAS
// ==========================================

// 1. GET /api/categories (Público) - Obtener todas las categorías
app.get("/api/categories", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categories ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error en el servidor al obtener categorías");
  }
});

// 2. POST /api/categories (Protegido - Admin) - Crear una nueva categoría
app.post("/api/categories", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === "") {
      return res
        .status(400)
        .json({ error: "El nombre de la categoría es obligatorio." });
    }

    const result = await pool.query(
      "INSERT INTO categories (name) VALUES ($1) RETURNING *",
      [name.trim()],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      // Código de error de clave única duplicada en Postgres
      return res.status(400).json({ error: "La categoría ya existe." });
    }
    console.error(err.message);
    res.status(500).send("Error en el servidor al crear categoría");
  }
});

// 3. PUT /api/categories/:id (Protegido - Admin) - Editar una categoría
app.put("/api/categories/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res
        .status(400)
        .json({ error: "El nombre de la categoría es obligatorio." });
    }

    const result = await pool.query(
      "UPDATE categories SET name = $1 WHERE id = $2 RETURNING *",
      [name.trim(), id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Categoría no encontrada." });
    }

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(400)
        .json({ error: "El nombre de la categoría ya está en uso." });
    }
    console.error(err.message);
    res.status(500).send("Error en el servidor al editar categoría");
  }
});

// 4. DELETE /api/categories/:id (Protegido - Admin) - Eliminar una categoría
app.delete(
  "/api/categories/:id",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        "DELETE FROM categories WHERE id = $1 RETURNING *",
        [id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Categoría no encontrada." });
      }

      res.json({
        message: "Categoría eliminada con éxito",
        category: result.rows[0],
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Error en el servidor al eliminar categoría");
    }
  },
);
// ==========================================
// RUTAS DE PRODUCTOS - VERSIÓN CON PAGINACIÓN
// ==========================================

// GET /api/products/paginated - Obtener productos con paginación (NUEVO ENDPOINT)
app.get("/api/products/paginated", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    // Obtener total de productos
    const countResult = await pool.query(
      "SELECT COUNT(*) as total FROM products",
    );
    const total = parseInt(countResult.rows[0].total);

    // Obtener productos paginados
    const result = await pool.query(
      "SELECT id, name, description, price, stock, created_at FROM products ORDER BY id ASC LIMIT $1 OFFSET $2",
      [limit, offset],
    );

    res.json({
      products: result.rows,
      total: total,
      page: page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Error en GET /api/products/paginated:", err.message);
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

// GET /api/products/:id - Obtener un producto por ID (si no existe, agregar)
// Primero verifica si ya existe esta ruta, si no existe, la agregas
app.get("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT id, name, description, price, stock, created_at FROM products WHERE id = $1",
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error en GET /api/products/:id:", err.message);
    res.status(500).json({ error: "Error al obtener el producto" });
  }
});

// POST /api/products/new (Protegido - Admin) - Crear producto (nuevo endpoint)
app.post("/api/products/new", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: "Nombre y precio son requeridos" });
    }

    const result = await pool.query(
      `INSERT INTO products (name, description, price, stock)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, description || null, price, stock || 0],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error en POST /api/products/new:", err.message);
    res.status(500).json({ error: "Error al crear producto" });
  }
});

// ==========================================
// RUTAS DE LA ENTIDAD PRODUCTOS
// ==========================================

// GET /api/products - Obtener productos (con opción de filtrar por categoría)
app.get("/api/products", async (req, res) => {
  try {
    const { category } = req.query;
    let query = "SELECT * FROM products";
    const params = [];

    if (category) {
      query += " WHERE category_id = $1";
      params.push(category);
    }

    query += " ORDER BY id ASC";
    const allProducts = await pool.query(query, params);

    // Si la base de datos de productos está vacía, sembramos productos iniciales dinámicamente
    if (allProducts.rows.length === 0 && !category) {
      const cats = await pool.query("SELECT * FROM categories");
      if (cats.rows.length > 0) {
        const biciCat =
          cats.rows.find((c) => c.name === "Bicicletas")?.id || cats.rows[0].id;
        const compCat =
          cats.rows.find((c) => c.name === "Componentes")?.id ||
          cats.rows[0].id;
        const equipCat =
          cats.rows.find((c) => c.name === "Equipamiento")?.id ||
          cats.rows[0].id;

        await pool.query(
          "INSERT INTO products (name, price, category_id) VALUES ($1, $2, $3), ($4, $5, $6), ($7, $8, $9)",
          [
            "Bicicleta de Ruta Trek Emonda",
            2499.99,
            biciCat,
            "Transmisión Shimano Dura-Ace",
            350.0,
            compCat,
            "Casco Aero Specialized Evade",
            120.0,
            equipCat,
          ],
        );

        const newProducts = await pool.query(
          "SELECT * FROM products ORDER BY id ASC",
        );
        return res.json(newProducts.rows);
      }
    }

    res.json(allProducts.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error en el servidor al obtener productos");
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en el puerto ${PORT}`);
});

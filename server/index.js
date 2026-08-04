require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sendOrderConfirmation } = require("./mailer");

const app = express();

const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

const slugify = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "producto";

const createUniqueProductSlug = async (name, excludeId = null) => {
  const baseSlug = slugify(name);
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const result = await pool.query(
      `SELECT 1
       FROM products
       WHERE slug = $1 AND ($2::integer IS NULL OR id <> $2)
       LIMIT 1`,
      [candidate, excludeId],
    );

    if (result.rows.length === 0) return candidate;
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
};

const ensureProductSlugs = async () => {
  await pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS slug VARCHAR(280)");

  const result = await pool.query(
    "SELECT id, name, slug FROM products ORDER BY id ASC",
  );
  const usedSlugs = new Set();

  for (const product of result.rows) {
    const baseSlug = slugify(product.slug || product.name);
    let slug = baseSlug;
    let suffix = 2;

    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    usedSlugs.add(slug);
    if (product.slug !== slug) {
      await pool.query("UPDATE products SET slug = $1 WHERE id = $2", [
        slug,
        product.id,
      ]);
    }
  }

  await pool.query(`
    ALTER TABLE products ALTER COLUMN slug SET NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS products_slug_unique_idx
      ON products (slug);
  `);
};

let databaseError = null;
const databaseReady = ensureProductSlugs().catch((error) => {
  databaseError = error;
  console.error("No se pudo conectar con la base de datos:", error.message);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(async (req, res, next) => {
  await databaseReady;
  if (databaseError) {
    return res.status(503).json({ error: "Base de datos no disponible" });
  }
  next();
});

// ==========================================
// CONFIGURACIÓN DE MULTER PARA IMÁGENES
// ==========================================

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten imágenes (jpeg, jpg, png, gif, webp)"));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter,
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));

// ==========================================
// ENDPOINTS DE PRUEBA
// ==========================================

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// ==========================================
// ENDPOINTS DE AUTENTICACIÓN
// ==========================================

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const user = userResult.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "super_secreto_desarrollo",
      { expiresIn: "2h" },
    );

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

app.get("/api/setup-users", async (req, res) => {
  try {
    const hashedAdminPass = await bcrypt.hash("admin123", 10);
    const hashedUserPass = await bcrypt.hash("cliente123", 10);

    await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING",
      ["Cuenta Maestra", "admin@jcbikes.com", hashedAdminPass, "admin"],
    );

    await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING",
      ["Cliente Prueba", "cliente@jcbikes.com", hashedUserPass, "customer"],
    );

    res.send("Usuarios de prueba creados exitosamente.");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error creando usuarios");
  }
});

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Todos los campos son requeridos." });
    }

    if (name.trim().length < 3) {
      return res
        .status(400)
        .json({ error: "El nombre debe tener al menos 3 caracteres." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ error: "Por favor ingresa un correo electrónico válido." });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "La contraseña debe tener al menos 8 caracteres." });
    }

    const userExists = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email.toLowerCase()],
    );
    if (userExists.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "El correo electrónico ya está registrado." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'customer') RETURNING id, name, email, role",
      [name.trim(), email.toLowerCase(), hashedPassword],
    );

    const token = jwt.sign(
      { id: newUser.rows[0].id, role: newUser.rows[0].role },
      process.env.JWT_SECRET || "super_secreto_desarrollo",
      { expiresIn: "2h" },
    );

    res.status(201).json({
      message: "Registro exitoso",
      token,
      role: newUser.rows[0].role,
      name: newUser.rows[0].name,
    });
  } catch (err) {
    console.error("Error en /api/register:", err.message);
    res.status(500).json({ error: "Error en el servidor." });
  }
});

// Middlewares
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

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
// RUTAS DE CATEGORÍAS
// ==========================================

app.get("/api/categories", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categories ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error al obtener categorías");
  }
});

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
      return res.status(400).json({ error: "La categoría ya existe." });
    }
    console.error(err.message);
    res.status(500).send("Error al crear categoría");
  }
});

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
    res.status(500).send("Error al editar categoría");
  }
});

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
      res.status(500).send("Error al eliminar categoría");
    }
  },
);

// Endpoint para crear tablas de tienda y cargar datos de prueba
app.get("/api/setup-store", async (req, res) => {
  try {
    await pool.query(`
      DROP TABLE IF EXISTS reviews, product_variants, order_items, orders, product_images, products, categories CASCADE;

      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        name VARCHAR(255) UNIQUE NOT NULL,
        slug VARCHAR(280) UNIQUE NOT NULL,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL,
        stock INTEGER DEFAULT 0 CHECK (stock >= 0),
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS product_images (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        is_primary BOOLEAN DEFAULT FALSE,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        total NUMERIC(10, 2) NOT NULL DEFAULT 0,
        status VARCHAR(30) NOT NULL DEFAULT 'created'
          CHECK (status IN ('created', 'procesando', 'enviado')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        product_name VARCHAR(255) NOT NULL,
        unit_price NUMERIC(10, 2) NOT NULL,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        line_total NUMERIC(10, 2) NOT NULL
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

    await pool.query(`
      INSERT INTO categories (name) VALUES
      ('Bicicletas'),
      ('Accesorios'),
      ('Repuestos')
      ON CONFLICT (name) DO NOTHING;
    `);

    await pool.query(`
      INSERT INTO products (category_id, name, slug, description, price, stock, image_url) VALUES
      ((SELECT id FROM categories WHERE name = 'Bicicletas' LIMIT 1), 'Bicicleta de Montana Pro', 'bicicleta-de-montana-pro', 'Chasis de aluminio ligero, frenos de disco hidraulicos y suspension avanzada.', 599.99, 10, 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=600&q=80'),
      ((SELECT id FROM categories WHERE name = 'Accesorios' LIMIT 1), 'Casco Aerodinamico', 'casco-aerodinamico', 'Maxima proteccion y velocidad con diseno ergonomico y ventilado.', 89.50, 10, 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&q=80'),
      ((SELECT id FROM categories WHERE name = 'Repuestos' LIMIT 1), 'Cadena Shimano 11v', 'cadena-shimano-11v', 'Alta durabilidad y rendimiento para las subidas mas exigentes.', 25.00, 20, 'https://images.unsplash.com/photo-1558235282-50dce421d014?w=600&q=80')
      ON CONFLICT (name) DO NOTHING;
    `);

    await pool.query("DELETE FROM product_variants; DELETE FROM reviews;");

    await pool.query(`
      INSERT INTO product_variants (product_id, color, size, stock) VALUES
      ((SELECT id FROM products WHERE name = 'Bicicleta de Montana Pro' LIMIT 1), 'Rojo', 'M', 5),
      ((SELECT id FROM products WHERE name = 'Bicicleta de Montana Pro' LIMIT 1), 'Rojo', 'L', 3),
      ((SELECT id FROM products WHERE name = 'Bicicleta de Montana Pro' LIMIT 1), 'Negro', 'M', 2),
      ((SELECT id FROM products WHERE name = 'Casco Aerodinamico' LIMIT 1), 'Blanco', 'Unica', 10);

      INSERT INTO reviews (product_id, user_id, rating, comment) VALUES
      ((SELECT id FROM products WHERE name = 'Bicicleta de Montana Pro' LIMIT 1), (SELECT id FROM users LIMIT 1), 5, 'Excelente bicicleta.'),
      ((SELECT id FROM products WHERE name = 'Bicicleta de Montana Pro' LIMIT 1), (SELECT id FROM users LIMIT 1), 4, 'Muy buena pero algo pesada.'),
      ((SELECT id FROM products WHERE name = 'Casco Aerodinamico' LIMIT 1), (SELECT id FROM users LIMIT 1), 5, 'Muy seguro y comodo.');
    `);

    res.send("Tablas de tienda y productos de prueba creados exitosamente.");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error configurando la tienda: " + err.message);
  }
});

// ==========================================
// RUTAS DE ORDENES
// ==========================================

const ensureOrderTables = async (client) => {
  await client.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;

    UPDATE products SET stock = 0 WHERE stock < 0;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'products_stock_non_negative'
      ) THEN
        ALTER TABLE products
        ADD CONSTRAINT products_stock_non_negative CHECK (stock >= 0);
      END IF;
    END
    $$;

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      total NUMERIC(10, 2) NOT NULL DEFAULT 0,
      status VARCHAR(30) NOT NULL DEFAULT 'created',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name VARCHAR(255) NOT NULL,
      unit_price NUMERIC(10, 2) NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      line_total NUMERIC(10, 2) NOT NULL
    );
  `);
};

const discountInventoryOnPayment = async (req, res, next) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      client.release();
      return res.status(400).json({ error: "La orden no tiene productos." });
    }

    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    let userId = null;

    if (token) {
      try {
        const user = jwt.verify(
          token,
          process.env.JWT_SECRET || "super_secreto_desarrollo",
        );
        userId = user.id;
      } catch {
        userId = null;
      }
    }

    await ensureOrderTables(client);
    await client.query("BEGIN");
    transactionStarted = true;

    const normalizedItems = items.map((item) => ({
      productId: Number(item.productId),
      quantity: Number(item.quantity),
    }));

    if (
      normalizedItems.some(
        (item) =>
          !Number.isInteger(item.productId) ||
          !Number.isInteger(item.quantity) ||
          item.quantity <= 0,
      )
    ) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(400).json({ error: "Productos de orden invalidos." });
    }

    const orderItems = [];
    let total = 0;

    for (const item of normalizedItems) {
      const productResult = await client.query(
        "SELECT id, name, price, stock FROM products WHERE id = $1 FOR UPDATE",
        [item.productId],
      );

      if (productResult.rows.length === 0) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(404).json({ error: "Producto no encontrado." });
      }

      const product = productResult.rows[0];
      const stock = Number(product.stock || 0);

      if (stock < item.quantity) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(409).json({
          error: `Stock insuficiente para ${product.name}.`,
          productId: product.id,
          stock,
        });
      }

      const unitPrice = Number(product.price);
      const lineTotal = unitPrice * item.quantity;
      total += lineTotal;

      await client.query(
        "UPDATE products SET stock = stock - $1 WHERE id = $2",
        [item.quantity, product.id],
      );

      orderItems.push({
        productId: product.id,
        productName: product.name,
        unitPrice,
        quantity: item.quantity,
        lineTotal,
      });
    }

    req.orderClient = client;
    req.orderDraft = { userId, total, orderItems };
    next();
  } catch (err) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }
    client.release();
    console.error("Error descontando inventario:", err.message);
    res.status(500).json({ error: "Error al descontar inventario." });
  }
};

app.post("/api/orders", discountInventoryOnPayment, async (req, res) => {
  const client = req.orderClient;

  try {
    const { userId, total, orderItems } = req.orderDraft;

    const orderResult = await client.query(
      "INSERT INTO orders (user_id, total, status) VALUES ($1, $2, $3) RETURNING id, user_id, total, status, created_at",
      [userId, total, "created"],
    );
    const order = orderResult.rows[0];

    for (const item of orderItems) {
      await client.query(
        `INSERT INTO order_items
          (order_id, product_id, product_name, unit_price, quantity, line_total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          order.id,
          item.productId,
          item.productName,
          item.unitPrice,
          item.quantity,
          item.lineTotal,
        ],
      );
    }

    let customer = null;
    if (userId) {
      const customerResult = await client.query(
        "SELECT name, email FROM users WHERE id = $1",
        [userId],
      );
      customer = customerResult.rows[0] || null;
    }

    await client.query("COMMIT");

    const responseOrder = {
      id: order.id,
      userId: order.user_id,
      total: Number(order.total),
      status: order.status,
      createdAt: order.created_at,
      items: orderItems,
    };
    const email = await sendOrderConfirmation({
      recipient: customer?.email,
      customerName: customer?.name,
      order: responseOrder,
    });

    res.status(201).json({
      order: responseOrder,
      email,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error en POST /api/orders:", err.message);
    res.status(500).json({ error: "Error al generar la orden." });
  } finally {
    client.release();
  }
});

app.get(
  "/api/admin/orders",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const client = await pool.connect();

    try {
      await ensureOrderTables(client);
      const result = await client.query(`
        SELECT
          o.id,
          o.total,
          o.status,
          o.created_at,
          o.updated_at,
          u.id AS user_id,
          u.name AS customer_name,
          u.email AS customer_email,
          COALESCE(
            json_agg(
              json_build_object(
                'id', oi.id,
                'productId', oi.product_id,
                'productName', oi.product_name,
                'unitPrice', oi.unit_price,
                'quantity', oi.quantity,
                'lineTotal', oi.line_total
              ) ORDER BY oi.id
            ) FILTER (WHERE oi.id IS NOT NULL),
            '[]'::json
          ) AS items
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
        LEFT JOIN order_items oi ON oi.order_id = o.id
        GROUP BY o.id, u.id, u.name, u.email
        ORDER BY o.created_at DESC, o.id DESC
      `);

      res.json(
        result.rows.map((order) => ({
          id: order.id,
          total: Number(order.total),
          status: order.status,
          createdAt: order.created_at,
          updatedAt: order.updated_at,
          customer: order.user_id
            ? {
                id: order.user_id,
                name: order.customer_name,
                email: order.customer_email,
              }
            : null,
          items: order.items.map((item) => ({
            ...item,
            unitPrice: Number(item.unitPrice),
            lineTotal: Number(item.lineTotal),
          })),
        })),
      );
    } catch (err) {
      console.error("Error en GET /api/admin/orders:", err.message);
      res.status(500).json({ error: "Error al obtener los pedidos." });
    } finally {
      client.release();
    }
  },
);

app.patch(
  "/api/admin/orders/:id/status",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const allowedStatuses = ["procesando", "enviado"];

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ error: "El id del pedido es inválido." });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: "Estado inválido. Usa 'procesando' o 'enviado'.",
      });
    }

    const client = await pool.connect();

    try {
      await ensureOrderTables(client);
      const result = await client.query(
        `UPDATE orders
         SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, total, status, created_at, updated_at`,
        [status, id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Pedido no encontrado." });
      }

      const order = result.rows[0];
      res.json({
        id: order.id,
        total: Number(order.total),
        status: order.status,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
      });
    } catch (err) {
      console.error("Error en PATCH /api/admin/orders/:id/status:", err.message);
      res.status(500).json({ error: "Error al actualizar el pedido." });
    } finally {
      client.release();
    }
  },
);

// ==========================================
// RUTAS DE PRODUCTOS (ORDEN CORRECTO)
// ==========================================

// 0. Ruta para productos con buscador y filtros
app.get("/api/products", async (req, res) => {
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

    if (search) {
      query += ` AND p.name ILIKE $${paramIndex}`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (category_id) {
      query += ` AND p.category_id = $${paramIndex}`;
      queryParams.push(category_id);
      paramIndex++;
    }

    query += " ORDER BY p.id DESC";

    const allProducts = await pool.query(query, queryParams);
    res.json(allProducts.rows);
  } catch (err) {
    console.error("Error en GET /api/products:", err.message);
    res.status(500).send("Error en el servidor");
  }
});

// 1. Ruta específica para productos simples (DEBE IR PRIMERO)
// Ruta para obtener productos con paginación
app.get("/api/products/paginated", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 12, 1);
    const offset = (page - 1) * limit;

    const countResult = await pool.query("SELECT COUNT(*) AS total FROM products");
    const total = Number(countResult.rows[0].total);
    const result = await pool.query(
      `SELECT id, name, description, price, stock, created_at
       FROM products
       ORDER BY id ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    res.json({
      products: result.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Error en GET /api/products/paginated:", err.message);
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

app.get("/api/products/simple", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.name, p.slug, p.description, p.price, p.stock, p.category_id, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error en /api/products/simple:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 2. Ruta para crear producto
app.post("/api/products/new", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: "Nombre y precio son requeridos" });
    }

    const slug = await createUniqueProductSlug(name);
    const result = await pool.query(
      `INSERT INTO products (name, slug, description, price, stock)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, slug, description || null, price, stock || 0],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error en POST /api/products/new:", err.message);
    res.status(500).json({ error: "Error al crear producto" });
  }
});

const getProductBySlug = async (slug) =>
  pool.query(
    `SELECT
       p.id, p.name, p.slug, p.description, p.price, p.stock, p.created_at,
       c.name AS category_name,
       (
         SELECT CASE
           WHEN pi.image_url LIKE 'http%' THEN pi.image_url
           ELSE CONCAT($2::text, pi.image_url)
         END
         FROM product_images pi
         WHERE pi.product_id = p.id
         ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.id ASC
         LIMIT 1
       ) AS image_url
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.slug = $1 OR p.id::text = $1
     LIMIT 1`,
    [slug, process.env.PUBLIC_API_URL || ""],
  );

app.get("/api/products/by-slug/:slug", async (req, res) => {
  try {
    const result = await getProductBySlug(req.params.slug);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error en GET /api/products/by-slug/:slug:", err.message);
    res.status(500).json({ error: "Error al obtener el producto" });
  }
});

app.get("/api/seo/products/:slug", async (req, res) => {
  try {
    const result = await getProductBySlug(req.params.slug);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const product = result.rows[0];
    const siteUrl = process.env.PUBLIC_SITE_URL || "http://localhost:5173";
    const description =
      product.description ||
      `Compra ${product.name} en JC Bikes. Productos y accesorios para ciclistas.`;

    res.json({
      title: `${product.name} | JC Bikes`,
      description,
      canonical: `${siteUrl}/product/${product.slug}`,
      image: product.image_url || `${siteUrl}/favicon.svg`,
      type: "product",
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: Number(product.price),
        currency: "MXN",
        availability: Number(product.stock) > 0 ? "in_stock" : "out_of_stock",
      },
    });
  } catch (err) {
    console.error("Error en GET /api/seo/products/:slug:", err.message);
    res.status(500).json({ error: "Error al obtener metadatos" });
  }
});

const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

app.get("/sitemap.xml", async (req, res) => {
  try {
    const siteUrl = process.env.PUBLIC_SITE_URL || "http://localhost:5173";
    const result = await pool.query(
      "SELECT slug, created_at FROM products ORDER BY id ASC",
    );
    const urls = [
      `<url><loc>${escapeXml(siteUrl)}/</loc></url>`,
      `<url><loc>${escapeXml(siteUrl)}/shop</loc></url>`,
      ...result.rows.map(
        (product) =>
          `<url><loc>${escapeXml(`${siteUrl}/product/${product.slug}`)}</loc><lastmod>${new Date(product.created_at).toISOString()}</lastmod></url>`,
      ),
    ].join("");

    res
      .type("application/xml")
      .send(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
      );
  } catch (err) {
    console.error("Error en GET /sitemap.xml:", err.message);
    res.status(500).send("Error al generar el sitemap");
  }
});

app.get("/robots.txt", (req, res) => {
  const apiUrl = process.env.PUBLIC_API_URL || "";
  res
    .type("text/plain")
    .send(`User-agent: *\nAllow: /\nSitemap: ${apiUrl}/sitemap.xml\n`);
});

// 3. Ruta ligera para verificar stock disponible al vuelo
app.get("/api/products/:id/stock", async (req, res) => {
  try {
    const { id } = req.params;
    const parsedQuantity = parseInt(req.query.quantity || "1", 10);
    const requestedQuantity = Number.isNaN(parsedQuantity)
      ? 1
      : Math.max(1, parsedQuantity);
    const result = await pool.query(
      "SELECT id, stock FROM products WHERE id = $1",
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const stock = Number(result.rows[0].stock || 0);

    res.json({
      productId: result.rows[0].id,
      stock,
      requestedQuantity,
      available: stock > 0,
      canFulfill: stock >= requestedQuantity,
    });
  } catch (err) {
    console.error("Error en GET /api/products/:id/stock:", err.message);
    res.status(500).json({ error: "Error al verificar stock" });
  }
});

// 4. Ruta para producto por ID (DEBE IR AL FINAL)
app.get("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT id, name, slug, description, price, stock, created_at FROM products WHERE id = $1",
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

// ==========================================
// RUTAS PARA IMÁGENES DE PRODUCTOS
// ==========================================

app.post(
  "/api/products/:id/images",
  authenticateToken,
  isAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const product = await pool.query("SELECT * FROM products WHERE id = $1", [
        id,
      ]);

      if (product.rows.length === 0) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }

      if (!req.file) {
        return res
          .status(400)
          .json({ error: "No se ha subido ninguna imagen" });
      }

      const imageUrl = `/uploads/${req.file.filename}`;
      const result = await pool.query(
        "INSERT INTO product_images (product_id, image_url, is_primary, display_order) VALUES ($1, $2, $3, $4) RETURNING *",
        [id, imageUrl, false, 0],
      );

      const countImages = await pool.query(
        "SELECT COUNT(*) FROM product_images WHERE product_id = $1",
        [id],
      );
      if (parseInt(countImages.rows[0].count) === 1) {
        await pool.query(
          "UPDATE product_images SET is_primary = TRUE WHERE id = $1",
          [result.rows[0].id],
        );
      }

      res.status(201).json({
        success: true,
        message: "Imagen subida exitosamente",
        image: result.rows[0],
        url: imageUrl,
      });
    } catch (err) {
      console.error("Error en POST /api/products/:id/images:", err.message);
      res
        .status(500)
        .json({ error: "Error al subir la imagen: " + err.message });
    }
  },
);

app.get("/api/products/:id/images", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM product_images WHERE product_id = $1 ORDER BY is_primary DESC, display_order ASC, id ASC",
      [id],
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error en GET /api/products/:id/images:", err.message);
    res.status(500).json({ error: "Error al obtener las imágenes" });
  }
});

app.put(
  "/api/products/images/:imageId/primary",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    try {
      const { imageId } = req.params;
      const image = await pool.query(
        "SELECT * FROM product_images WHERE id = $1",
        [imageId],
      );

      if (image.rows.length === 0) {
        return res.status(404).json({ error: "Imagen no encontrada" });
      }

      const productId = image.rows[0].product_id;
      await pool.query(
        "UPDATE product_images SET is_primary = FALSE WHERE product_id = $1",
        [productId],
      );
      await pool.query(
        "UPDATE product_images SET is_primary = TRUE WHERE id = $1",
        [imageId],
      );

      res.json({ message: "Imagen marcada como principal" });
    } catch (err) {
      console.error("Error:", err.message);
      res.status(500).json({ error: "Error al actualizar la imagen" });
    }
  },
);

app.delete(
  "/api/products/images/:imageId",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    try {
      const { imageId } = req.params;
      const image = await pool.query(
        "SELECT * FROM product_images WHERE id = $1",
        [imageId],
      );

      if (image.rows.length === 0) {
        return res.status(404).json({ error: "Imagen no encontrada" });
      }

      const imageUrl = image.rows[0].image_url;
      const filename = path.basename(imageUrl);
      const filePath = path.join(uploadDir, filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await pool.query("DELETE FROM product_images WHERE id = $1", [imageId]);
      res.json({ message: "Imagen eliminada exitosamente" });
    } catch (err) {
      console.error("Error:", err.message);
      res.status(500).json({ error: "Error al eliminar la imagen" });
    }
  },
);

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  databaseReady.then(() => {
    if (databaseError) throw databaseError;
    app.listen(PORT, () => {
      console.log(`Servidor Express corriendo en el puerto ${PORT}`);
    });
  }).catch((error) => {
    console.error("No se pudieron preparar los slugs de productos:", error);
    process.exit(1);
  });
}

module.exports = app;

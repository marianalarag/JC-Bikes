const express = require("express");
const cors = require("cors");
const pool = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

// Middleware
app.use(cors());
app.use(express.json());

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

// ==========================================
// RUTAS DE PRODUCTOS (ORDEN CORRECTO)
// ==========================================

// 1. Ruta específica para productos simples (DEBE IR PRIMERO)
app.get("/api/products/simple", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.name, p.description, p.price, p.stock, p.category_id, c.name as category_name
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

    const result = await pool.query(
      `INSERT INTO products (name, description, price, stock) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, description || null, price, stock || 0],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error en POST /api/products/new:", err.message);
    res.status(500).json({ error: "Error al crear producto" });
  }
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
app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en el puerto ${PORT}`);
});

# Módulo de Registro de Usuarios - Guía de Setup

## 1. Base de Datos

### Crear tabla `users`

Ejecuta el siguiente SQL en tu gestor de base de datos (DBeaver, pgAdmin, etc.):

```sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
```

## 2. Backend (Node.js/Express)

### Dependencias requeridas:

- ✅ `bcrypt` - Para encriptar contraseñas
- ✅ `express` - Framework web
- ✅ `jsonwebtoken` - Para generar tokens JWT
- ✅ `dotenv` - Para variables de entorno
- ✅ `pg` - Driver de PostgreSQL

Todas ya están en `package.json`. Asegúrate de instalarlas:

```bash
npm install
```

### Archivo `.env` requerido en la carpeta `server/`:

```
DB_USER=postgres
DB_PASSWORD=tu_contraseña
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jcbikes
JWT_SECRET=tu_clave_secreta_segura
PORT=5000
```

### Endpoint disponible:

**POST** `/api/register`

Solicitud (JSON):

```json
{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "password": "miContraseña123"
}
```

Respuesta (201 Created):

```json
{
  "message": "Registro exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "customer",
  "name": "Juan Pérez"
}
```

## 3. Frontend (React)

### Componente `Register.jsx`

Incluye las siguientes validaciones:

- ✅ Email válido
- ✅ Contraseña con mínimo 8 caracteres
- ✅ Confirmación de contraseña
- ✅ Nombre con mínimo 3 caracteres
- ✅ Estado de carga durante el registro
- ✅ Manejo de errores

### Características implementadas:

- Validación en tiempo real del formulario
- Feedback visual al usuario
- Guardado del token en localStorage
- Redirección a /shop después del registro exitoso

## 4. Cómo usar

### En el servidor:

```bash
cd server
npm install
node index.js
```

### En el cliente (otra terminal):

```bash
npm install
npm run dev
```

### Prueba el registro:

1. Navega a `http://localhost:5173/register` (o el puerto configurado)
2. Completa el formulario
3. Click en "Registrarse"
4. Serás redirigido a la tienda si el registro es exitoso

## 5. Seguridad

- Las contraseñas se encriptan con bcrypt (salt rounds: 10)
- Los tokens JWT expiran en 2 horas
- Las validaciones se hacen tanto en frontend como en backend
- Los emails se validan y normalizan (lowercase)
- Se previene SQL injection usando consultas parametrizadas

## 6. Endpoints de prueba

Para crear usuarios de prueba inicialmente, usa:

**GET** `/api/setup-users`

Esto crea dos usuarios de prueba:

- Email: `admin@jcbikes.com` / Password: `admin123`
- Email: `cliente@jcbikes.com` / Password: `cliente123`

⚠️ **Nota**: Desactiva este endpoint en producción

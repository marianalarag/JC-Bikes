const fs = require('fs');
const path = require('path');
const pool = require('./db');

const initDatabase = async () => {
    try {
        console.log("Conectando con PostgreSQL para inicializar base de datos...");
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Ejecutar las consultas del archivo schema.sql
        await pool.query(schemaSql);
        console.log("¡Base de datos inicializada exitosamente!");
        console.log("Las tablas 'users', 'categories' y 'products' han sido creadas con éxito.");
        console.log("Las categorías de prueba (Bicicletas, Componentes, Equipamiento, Nutrición) han sido insertadas.");

        process.exit(0);
    } catch (err) {
        console.error("Error al inicializar la base de datos:", err.message);
        process.exit(1);
    }
};

initDatabase();

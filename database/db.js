const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configuración de la conexión
const dbPath = path.resolve(__dirname, 'mi_tienda.db'); // Ruta a tu base de datos SQLite
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar a la base de datos SQLite:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite.');
  }
});

// Función para ejecutar consultas
async function query(sql, params) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

module.exports = { query };
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Ruta a tu base de datos SQLite
const dbPath = path.resolve(__dirname, 'mi_tienda.db');

// Crear o abrir la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar a la base de datos SQLite:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite.');
  }
});

// Configurar el tiempo de espera
db.run("PRAGMA busy_timeout = 2000"); // 2000 ms = 2 segundos

// Script para crear tablas y poblar datos
const setupDatabase = () => {
  db.serialize(() => {
    // Crear tablas
    db.run(`
      CREATE TABLE IF NOT EXISTS cart (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        cantidad INTEGER DEFAULT 1
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        price REAL NOT NULL,
        image TEXT NOT NULL,
        category_id INTEGER NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories (id)
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        apellido TEXT NOT NULL,
        contrasena TEXT NOT NULL,
        usuario TEXT NOT NULL,
        correo TEXT NOT NULL
      );
    `);

    // Insertar datos en la tabla cart
    db.run(`
      INSERT INTO cart (usuario_id, product_id, cantidad) VALUES
      (1, 1, 3),
      (1, 5, 1),
      (5, 1, 1),
      (1, 7, 6),
      (1, 3, 1);
    `);

    // Insertar datos en la tabla categories
    db.run(`
      INSERT INTO categories (name) VALUES
      ('camisa'),
      ('pantalon'),
      ('chaqueta'),
      ('sueter'),
      ('zapatos');
    `);

    // Insertar datos en la tabla products
    db.run(`
      INSERT INTO products (name, description, price, image, category_id) VALUES
      ('Camisa de Algodón', 'Camisa de algodón ligera y cómoda', 20.00, 'https://redkap.mx/img/productos/CAMISA-SC30-KHAKI-FRENTE.jpg', 1),
      ('Pantalones Jeans', 'Pantalones jeans de corte moderno.', 30.00, 'https://def-live.cdn.aboutyou.cloud/images/12662f28d2b6e7e06608ebbb6ada48b5.jpg?quality=75&height=832&width=596', 2),
      ('Chaqueta de Cuero', 'Chaqueta de cuero auténtico.', 60.00, 'https://cdn.antonymorato.com.filoblu.com/rx/ofmt_webp/media/catalog/product/m/m/mmlc00082-fa200005-9000_01.jpg', 3),
      ('Suéter Negro de Punto Suelto para Mujer', 'Suéter negro Estético y casual para mujer con hermoso cuello redondo y entramado', 20.00, 'https://i.pinimg.com/736x/c5/c3/dd/c5c3dd76f1d6175f26c63499c249bcd1.jpg', 4),
      ('Suéter casual de moda para hombres Negro', 'El suéter está hecho de nuestra exclusiva tela ligera y es adecuado para la versión profesional.\r\nMúltiples colores y tamaños\r\nAdecuado para otoño, invierno y verano, se puede combinar con abrigo.\r\nComodidad única.', 35.00, 'https://imagedelivery.net/4fYuQyy-r8_rpBpcY7lH_A/falabellaPE/123989260_01/w=1500,h=1500,fit=pad', 4),
      ('Zapatos para Mujer Louis Vuitton', 'Hermosos zapatos casuales y versatiles.', 200.00, 'https://zshopp.com/wp-content/uploads/2021/03/b1.jpg',  6);
    `);

    // Insertar datos en la tabla usuarios
    db.run(`
      INSERT INTO usuarios (nombre, apellido, contrasena, usuario, correo) VALUES
      ('yondayler', 'flores', '12345', 'yondi', 'yondi1@gmail.com'),
      ('prueba', 'prb', '1234', 'prb', 'prb@gmail.com'),
      ('prb', 'prb', '1234', 'prr', 'prrrr@gmail.com'),
      ('adawdawda', '2ee22e2', '1234', 'abc', 'dwada@gmail.com'),
      ('dayerlin', 'rincon', '1234', 'dayerlin', 'dgdadzafd@gmail.com');
    `);

    console.log('Tablas creadas y datos insertados.');
  });
};

// Ejecutar la configuración de la base de datos
setupDatabase();

// Cerrar la conexión a la base de datos
db.close((err) => {
  if (err) {
    console.error('Error al cerrar la base de datos:', err.message);
  } else {
    console.log('Conexión a la base de datos cerrada.');
  }
});
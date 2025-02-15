// models/productModel.js
const { query } = require('../database/db');

// Función para obtener todos los productos
async function getAllProducts() {
  try {
    return await query('SELECT * FROM products');
  } catch (err) {
    console.error('Error al obtener todos los productos:', err);
    throw err; // Lanza el error para que pueda ser manejado en otro lugar
  }
}

// Función para obtener un producto por ID
async function getProductById(id) {
  try {
    const result = await query('SELECT * FROM products WHERE id = ?', [id]);
    return result.length > 0 ? result[0] : null; // Devuelve el producto o null si no se encuentra
  } catch (err) {
    console.error('Error al obtener el producto por ID:', err);
    throw err; // Lanza el error para que pueda ser manejado en otro lugar
  }
}

module.exports = { getAllProducts, getProductById };
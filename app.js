const express = require('express');
const path = require('path');
const session = require('express-session'); // Importar express-session
const bodyParser = require('body-parser'); // Para manejar datos del formulario
const { query } = require('./database/db'); // Asegúrate de que esta función esté correctamente implementada
const { getAllProducts, getProductById } = require('./models/productModel');

const app = express();

// Configuración de EJS como motor de plantillas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para archivos estáticos (CSS)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para manejar datos del formulario
app.use(bodyParser.urlencoded({ extended: true }));

// Configuración de sesiones
app.use(session({
  secret: 'mi_secreto', // Cambia esto por una cadena secreta más segura
  resave: false,
  saveUninitialized: true,
}));

// Ruta para la página principal
app.get('/', async (req, res) => {
  const successMessage = req.session.successMessage || null; // Obtener el mensaje de éxito de la sesión
  const userName = req.session.user ? req.session.user.nombre : null; // Obtener el nombre del usuario si está autenticado
  req.session.successMessage = null; // Limpiar el mensaje de éxito después de mostrarlo

  try {
    const products = await getAllProducts(); // Obtener todos los productos
    res.render('index', { successMessage, userName, products }); // Renderiza la vista de inicio
  } catch (err) {
    console.error('Error al cargar los productos:', err);
    res.status(500).send('Error al cargar la página principal');
  }
});

// Ruta para mostrar el formulario de registro
app.get('/register', (req, res) => {
  const errorMessage = req.session.errorMessage || null; // Obtener el mensaje de error de la sesión
  req.session.errorMessage = null; // Limpiar el mensaje de error después de mostrarlo
  res.render('register', { errorMessage }); // Renderiza la vista de registro
});

// Ruta para procesar el registro de nuevos usuarios
app.post('/register', async (req, res) => {
  const { firstName, lastName, correo, username, password } = req.body; // Obtener los datos del formulario

  try {
    // Verificar si el nombre de usuario ya existe
    const existingUser  = await query('SELECT * FROM usuarios WHERE usuario = ?', [username]);
    if (existingUser .length > 0) {
      req.session.errorMessage = 'El nombre de usuario ya está en uso.';
      return res.redirect('/register'); // Redirigir al formulario de registro
    }

    // Verificar si el correo ya está en uso
    const existingEmail = await query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
    if (existingEmail.length > 0) {
      req.session.errorMessage = 'El correo electrónico ya está en uso.';
      return res.redirect('/register'); // Redirigir al formulario de registro
    }

    // Insertar el nuevo usuario en la base de datos
    await query('INSERT INTO usuarios (nombre, apellido, correo, usuario, contrasena) VALUES (?, ?, ?, ?, ?)', [firstName, lastName, correo, username, password]);
    req.session.successMessage = 'Registro exitoso. Puedes iniciar sesión ahora.';
    res.redirect('/login'); // Redirigir a la página de inicio de sesión
  } catch (err) {
    console.error('Error al registrar el usuario:', err);
    req.session.errorMessage = 'Ocurrió un error al registrar el usuario. Inténtalo de nuevo.';
    res.redirect('/register'); // Redirigir al formulario de registro
  }
});

// Ruta para mostrar el catálogo
app.get('/catalog', async (req, res) => {
  const categoryId = req.query.category; // Obtener la categoría seleccionada del query string
  try {
    let products;
    if (categoryId) {
      // Filtrar productos por category_id
      products = await query('SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.category_id = ?', [categoryId]);
    } else {
      // Obtener todos los productos si no hay filtro
      products = await query('SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON p.category_id = c.id');
    }
    const userName = req.session .user ? req.session.user.nombre : null; // Obtener el nombre del usuario si está autenticado
    const categories = await query('SELECT * FROM categories'); // Obtener todas las categorías para el filtro
    res.render('catalog', { products, userName, categories }); // Pasar userName y categories a la vista
  } catch (err) {
    console.error('Error al cargar el catálogo:', err);
    res.status(500).send('Error al cargar el catálogo');
  }
});

// Ruta para mostrar un producto específico
app.get('/product/:id', async (req, res) => {
  try {
    const productId = req.params.id; // Obtener el ID del producto de la URL
    const product = await getProductById(productId); // Obtener el producto por ID
    const otherProducts = await query('SELECT * FROM products WHERE id != ?', [productId]); // Obtener otros productos

    const userName = req.session.user ? req.session.user.nombre : null; // Obtener el nombre del usuario si está autenticado
    if (product) {
      res.render('product', { product, userName, otherProducts }); // Pasar userName y otros productos a la vista
    } else {
      res.status(404).send('Producto no encontrado'); // Manejo de error si el producto no existe
    }
  } catch (err) {
    console.error('Error al cargar el producto:', err);
    res.status(500).send('Error al cargar el producto');
  }
});

// Ruta para agregar un producto al carrito
app.post('/cart/add/:id', async (req, res) => {
  const productId = req.params.id;
  const userId = req.session.user ? req.session.user.id : null; // ID del usuario autenticado
  const quantity = parseInt(req.body.quantity, 10); // Obtener la cantidad del formulario

  if (!userId) {
    return res.redirect('/login'); // Redirigir si el usuario no está autenticado
  }

  // Obtener el producto de la base de datos
  try {
    const product = await getProductById(productId);
    if (product) {
      // Verificar si el producto ya está en el carrito
      const existingCartItem = await query('SELECT * FROM cart WHERE usuario_id = ? AND product_id = ?', [userId, productId]);
      if (existingCartItem.length > 0) {
        // Si ya existe, actualizar la cantidad
        await query('UPDATE cart SET cantidad = cantidad + ? WHERE usuario_id = ? AND product_id = ?', [quantity, userId, productId]);
      } else {
        // Si no existe, agregar el producto al carrito
        await query('INSERT INTO cart (usuario_id, product_id, cantidad) VALUES (?, ?, ?)', [userId, productId, quantity]);
      }
      console.log(`Producto agregado al carrito: ${product.name}`);
    }
  } catch (err) {
    console.error('Error al agregar el producto al carrito:', err);
  }

  res.redirect('/cart'); // Redirigir a la página del carrito
});

// Ruta para mostrar el carrito
app.get('/cart', async (req, res) => {
  const userId = req.session.user ? req.session.user.id : null; // ID del usuario autenticado
  let cart = [];

  if (userId) {
    // Obtener los productos del carrito de la base de datos
    try {
      cart = await query('SELECT p.id, p.name, p.description, p.price, c.cantidad, p.image FROM cart c JOIN products p ON c.product_id = p.id WHERE c.usuario_id = ?', [userId]);
    } catch (err) {
      console.error('Error al cargar el carrito:', err);
    }
  }

  res.render('cart', { cart }); // Renderiza la vista del carrito
});

// Ruta para actualizar la cantidad de un producto en el carrito
app.post('/cart/update/:id', async (req, res) => {
  const productId = req.params.id;
  const userId = req.session.user ? req.session.user.id : null; // ID del usuario autenticado
  const quantity = parseInt(req.body.quantity, 10); // Obtener la nueva cantidad del formulario

  if (!userId) {
    return res.redirect('/login'); // Redirigir si el usuario no está autenticado
  }

  // Actualizar la cantidad en el carrito
  try {
    await query('UPDATE cart SET cantidad = ? WHERE usuario_id = ? AND product_id = ?', [quantity, userId, productId]);
    console.log(`Cantidad actualizada para el producto: ${productId}`);
  } catch (err) {
    console.error('Error al actualizar la cantidad en el carrito:', err);
  }

  res.redirect('/cart'); // Redirigir a la página del carrito
});

// Ruta para eliminar un producto del carrito
 app.post('/cart/remove/:id', async (req, res) => {
  const productId = req.params.id;
  const userId = req.session.user ? req.session.user.id : null; // ID del usuario autenticado

  if (!userId) {
    return res.redirect('/login'); // Redirigir si el usuario no está autenticado
  }

  // Eliminar el producto del carrito en la base de datos
  try {
    await query('DELETE FROM cart WHERE usuario_id = ? AND product_id = ?', [userId, productId]);
    console.log(`Producto eliminado del carrito: ${productId}`);
  } catch (err) {
    console.error('Error al eliminar el producto del carrito:', err);
  }

  res.redirect('/cart'); // Redirigir a la página del carrito
});

// Ruta para mostrar el formulario de inicio de sesión
app.get('/login', (req, res) => {
  const errorMessage = req.session.errorMessage || null; // Obtener el mensaje de error de la sesión
  req.session.errorMessage = null; // Limpiar el mensaje de error después de mostrarlo
  res.render('login', { errorMessage }); // Renderiza la vista de inicio de sesión
});

// Ruta para procesar el inicio de sesión
app.post('/login', async (req, res) => {
  const { usuario, contrasena } = req.body; // Obtener los datos del formulario

  try {
    const user = await query('SELECT * FROM usuarios WHERE usuario = ? AND contrasena = ?', [usuario, contrasena]);
    if (user.length > 0) {
      req.session.user = { id: user[0].id_usuario, nombre: user[0].nombre, apellido: user[0].apellido }; // Guarda el usuario en la sesión
      req.session.successMessage = 'Inicio de sesión exitoso'; // Mensaje de éxito
      return res.redirect('/'); // Redirige a la página principal
    } else {
      req.session.errorMessage = 'Nombre de usuario o contraseña incorrectos'; // Mensaje de error
      return res.redirect('/login'); // Redirigir al formulario de inicio de sesión
    }
  } catch (err) {
    console.error('Error al iniciar sesión:', err); // Imprimir el error en la consola
    req.session.errorMessage = 'Ocurrió un error al iniciar sesión. Inténtalo de nuevo.'; // Mensaje de error genérico
    res.redirect('/login'); // Redirigir de nuevo al formulario de inicio de sesión
  }
});

// Ruta para cerrar sesión
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.redirect('/'); // Redirige a la página principal en caso de error
    }
    res.redirect('/'); // Redirige a la página de inicio de sesión
  });
});

// Ruta para mostrar el perfil del usuario
app.get('/profile', async (req, res) => {
  const userId = req.session.user ? req.session.user.id : null; // ID del usuario autenticado

  if (!userId) {
    return res.redirect('/login'); // Redirigir si el usuario no está autenticado
  }

  try {
    const user = await query('SELECT * FROM usuarios WHERE id_usuario = ?', [userId]); // Obtener los datos del usuario
    if (user.length > 0) {
      const userData = user[0]; // Obtener el primer (y único) usuario
      res.render('profile', { user: userData }); // Renderiza la vista de perfil con los datos del usuario
    } else {
      res.status(404).send('Usuario no encontrado'); // Manejo de error si el usuario no existe
    }
  } catch (err) {
    console.error('Error al cargar el perfil:', err);
    res.status(500).send('Error al cargar el perfil');
  }
});

// Ruta para actualizar el perfil del usuario
app.post('/update-profile', async (req, res) => {
  const userId = req.session.user ? req.session.user.id : null; // ID del usuario autenticado
  const { username, email, password } = req.body; // Obtener los datos del formulario

  if (!userId) {
    return res.redirect('/login'); // Redirigir si el usuario no está autenticado
  }

  try {
    // Actualizar los datos del usuario
    if (password && password.trim() !== '') {
      // Si se proporciona una nueva contraseña, actualizarla
      await query('UPDATE usuarios SET usuario = ?, correo = ?, contrasena = ? WHERE id_usuario = ?', [username, email, password, userId]);
    } else {
      // Si no se proporciona una nueva contraseña, no la actualizamos
      await query('UPDATE usuarios SET usuario = ?, correo = ? WHERE id_usuario = ?', [username, email, userId]);
    }

    req.session.successMessage = 'Perfil actualizado exitosamente.';
    res.redirect('/profile'); // Redirigir al perfil
  } catch (err) {
    console.error('Error al actualizar el perfil:', err);
    req.session.errorMessage = 'Ocurrió un error al actualizar el perfil. Inténtalo de nuevo.';
    res.redirect('/profile'); // Redirigir al perfil
  }
});

// Ruta para agregar un producto al catálogo
app.post('/catalog/add-product', async (req, res) => {
  const { name, description, price, image, category_id } = req.body; // Obtener los datos del formulario

  try {
    // Insertar el nuevo producto en la base de datos
    await query('INSERT INTO products (name, description, price, image, category_id) VALUES (?, ?, ?, ?, ?)', [name, description, price, image, category_id]);
    req.session.successMessage = 'Producto agregado exitosamente.';
    res.redirect('/catalog'); // Redirigir al catálogo después de agregar el producto
  } catch (err) {
    console.error('Error al agregar el producto:', err);
    req.session.errorMessage = 'Ocurrió un error al agregar el producto. Inténtalo de nuevo.';
    res.redirect('/catalog'); // Redirigir al catálogo en caso de error
  }
});

// Ruta para eliminar un producto del catálogo
app.post('/catalog/remove-product/:id', async (req, res) => {
  const productId = req.params.id; // Obtener el ID del producto de la URL

  try {
    // Eliminar el producto de la base de datos
    await query('DELETE FROM products WHERE id = ?', [productId]);
    req.session.successMessage = 'Producto eliminado exitosamente.';
  } catch (err) {
    console.error('Error al eliminar el producto:', err);
    req.session.errorMessage = 'Ocurrió un error al eliminar el producto. Inténtalo de nuevo.';
  }

  res.redirect('/catalog'); // Redirigir al catálogo después de eliminar el producto
});

// Ruta para agregar una categoría al catálogo
app.post('/catalog/add-category', async (req, res) => {
  const categoryName = req.body.name; // Obtener el nombre de la categoría del formulario

  try {
    // Agregar la categoría a la base de datos
    await query('INSERT INTO categories (name) VALUES (?)', [categoryName]);
    req.session.successMessage = 'Categoría agregada exitosamente.';
  } catch (err) {
    console.error('Error al agregar la categoría:', err);
    req.session.errorMessage = 'Ocurrió un error al agregar la categoría. Inténtalo de nuevo.';
  }

  res.redirect('/catalog'); // Redirigir al catálogo después de agregar la categoría
});

// Ruta para eliminar una categoría del catálogo
app.post('/catalog/remove-category/:id', async (req, res) => {
  const categoryId = req.params.id; // Obtener el ID de la categoría de la URL

  try {
    await query('DELETE FROM categories WHERE id = ?', [categoryId]);
    req.session.successMessage = 'Categoría eliminada exitosamente.';
  } catch (err) {
    console.error('Error al eliminar la categoría:', err);
    req.session.errorMessage = 'Ocurrió un error al eliminar la categoría. Inténtalo de nuevo.';
  }

  res.redirect('/catalog'); // Redirigir al catálogo después de eliminar la categoría
});

// Función para verificar la conexión a la base de datos
async function testDatabaseConnection() {
  try {
    await query('SELECT 1'); // Consulta simple para verificar la conexión
    console.log('Conexión a la base de datos exitosa');
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error);
  }
}

testDatabaseConnection();

// Iniciar el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
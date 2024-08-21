import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { engine } from 'express-handlebars';
import path from 'path';
import { fileURLToPath } from 'url';
import productsRouter from './routes/products.js';
import cartsRouter from './routes/carts.js';
import authRouter from './routes/auth.js';
import { initializeSocket } from './socket.js';
import connectDB from './config/db.js';
import passport from './config/passport.js';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import Cart from './models/Cart.js';
import Product from './models/Product.js';
import Handlebars from 'handlebars';

// Conectar a la base de datos
connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8080;
const httpServer = createServer(app);
const io = new Server(httpServer);

// Configuración de Handlebars
app.engine('handlebars', engine({
  runtimeOptions: {
    allowProtoPropertiesByDefault: true,
    allowProtoMethodsByDefault: true,
  }
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Registrar helper buildUrl`
Handlebars.registerHelper('buildUrl', (limit, page, sort, query, cartId) => {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit);
  if (page) params.append('page', page);
  if (sort && sort !== 'undefined') params.append('sort', sort);
  if (query && query !== 'undefined') params.append('query', query);
  if (cartId && cartId !== 'undefined') params.append('cartId', cartId);
  return `/products?${params.toString()}`;
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(passport.initialize());

app.use((req, res, next) => {
  req.app.set('io', io);
  next();
});

app.use('/api/products', productsRouter);
app.use('/api/carts', cartsRouter);
app.use('/api/sessions', authRouter);

// Redirección inicial dependiendo del estado de autenticación
app.get('/', (req, res) => {
  const token = req.cookies.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, 'jwt_secret');
      console.log('Token verificado:', decoded);
      return res.redirect('/products');
    } catch (error) {
      console.log('Error al verificar el token:', error.message);
      return res.redirect('/login');
    }
  } else {
    console.log('No se encontró un token');
    return res.redirect('/login');
  }
});

// Ruta para view de login
app.get('/login', (req, res) => {
  const token = req.cookies.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, 'jwt_secret');
      console.log('Token verificado en /login:', decoded);
      return res.redirect('/products');
    } catch (error) {
      console.log('Error al verificar el token en /login:', error.message);
    }
  }
  res.render('login', { title: 'Login' });
});

// Ruta para view de register
app.get('/register', (req, res) => {
  const token = req.cookies.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, 'jwt_secret');
      return res.redirect('/products');
    } catch (error) {
      console.log('Error al verificar el token en /register:', error.message);
    }
  }
  res.render('register', { title: 'Register' });
});

// Ruta protegida para mostrar los productos, redirige a login si no está autenticado
app.get('/products', passport.authenticate('jwt', { session: false, failureRedirect: '/login' }), async (req, res) => {
  try {
    const { limit = 10, page = 1, sort, query, cartId } = req.query;
    
    const sortOption = sort && (sort !== 'undefined') ? { price: sort === 'asc' ? 1 : -1 } : {};
    const queryObj = query && query !== 'undefined' ? { category: query } : {};

    const options = {
      limit: parseInt(limit),
      page: parseInt(page),
      sort: sortOption,
    };

    const products = await Product.paginate(queryObj, options);

    res.render('products', {
      title: 'Products',
      products: products.docs,
      totalPages: products.totalPages,
      prevPage: products.hasPrevPage ? products.prevPage : null,
      nextPage: products.hasNextPage ? products.nextPage : null,
      page: products.page,
      hasPrevPage: products.hasPrevPage,
      hasNextPage: products.hasNextPage,
      prevLink: products.hasPrevPage ? Handlebars.helpers.buildUrl(limit, products.prevPage, sort, query, cartId) : null,
      nextLink: products.hasNextPage ? Handlebars.helpers.buildUrl(limit, products.nextPage, sort, query, cartId) : null,
      cartId: cartId,
      user: req.user // Pasar el usuario autenticado a la vista
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Ruta protegida para desloguear al usuario, redirige a login si no está autenticado
app.get('/logout', passport.authenticate('jwt', { session: false, failureRedirect: '/login' }), (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

// Ruta protegida para mostrar el carrito del usuario autenticado
app.get('/carts', passport.authenticate('jwt', { session: false, failureRedirect: '/login' }), async (req, res) => {
  try {
    const cart = await Cart.findById(req.user.cart).populate('products.product');
    if (cart) {
      res.render('cart', {
        title: 'Cart',
        products: cart.products,
        cartId: req.user.cart,
        user: req.user
      });
    } else {
      res.status(404).json({ status: 'error', message: 'Cart not found' });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Otras rutas
app.get('/realtimeproducts', (req, res) => {
  res.render('realTimeProducts', { title: 'Real-Time Products' });
});

app.get('/carts/:cid', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const cart = await Cart.findById(req.params.cid).populate('products.product');
    if (cart) {
      res.render('cart', {
        title: 'Cart',
        products: cart.products,
        cartId: req.params.cid,
        user: req.user
      });
    } else {
      res.status(404).json({ status: 'error', message: `Cart with ID ${req.params.cid} was not found` });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

initializeSocket(io);

httpServer.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { engine } from 'express-handlebars';
import path from 'path';
import { fileURLToPath } from 'url';
import productsRouter from './routes/products.js';
import cartsRouter from './routes/carts.js';
import { initializeSocket } from './socket.js';
import connectDB from './config/db.js';
import Product from './models/Product.js';
import Cart from './models/Cart.js';

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

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  req.app.set('io', io);
  next();
});

app.use('/api/products', productsRouter);
app.use('/api/carts', cartsRouter);

app.get('/', async (req, res) => {
  try {
    const carts = await Cart.find();
    res.render('home', { title: 'Home', carts });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/realtimeproducts', (req, res) => {
  res.render('realTimeProducts', { title: 'Real-Time Products' });
});

app.get('/products', async (req, res) => {
  try {
    const { limit = 10, page = 1, sort, query, cartId } = req.query;
    
    // Manejar parámetros undefined
    const sortOption = sort && (sort === 'asc' || sort === 'desc') ? { price: sort === 'asc' ? 1 : -1 } : {};
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
      prevLink: products.hasPrevPage ? `/products?limit=${limit}&page=${products.prevPage}&sort=${sort}&query=${query}&cartId=${cartId}` : null,
      nextLink: products.hasNextPage ? `/products?limit=${limit}&page=${products.nextPage}&sort=${sort}&query=${query}&cartId=${cartId}` : null,
      cartId: cartId
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/carts/:cid', async (req, res) => {
  try {
    const cart = await Cart.findById(req.params.cid).populate('products.product');
    if (cart) {
      res.render('cart', {
        title: 'Cart',
        products: cart.products,
        cartId: req.params.cid
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

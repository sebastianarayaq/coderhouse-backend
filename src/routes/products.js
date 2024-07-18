import express from 'express';
import Product from '../models/Product.js';

const router = express.Router();

// Obtener todos los productos con filtros, paginación y ordenamiento
router.get('/', async (req, res) => {
  try {
    const { limit = 10, page = 1, sort, query } = req.query;
    const options = {
      limit: parseInt(limit),
      page: parseInt(page),
      sort: sort ? { price: sort === 'asc' ? 1 : -1 } : {},
    };
    const queryObj = query ? { $or: [{ category: query }, { status: query }] } : {};
    const products = await Product.paginate(queryObj, options);

    res.json({
      status: 'success',
      payload: products.docs,
      totalPages: products.totalPages,
      prevPage: products.hasPrevPage ? products.prevPage : null,
      nextPage: products.hasNextPage ? products.nextPage : null,
      page: products.page,
      hasPrevPage: products.hasPrevPage,
      hasNextPage: products.hasNextPage,
      prevLink: products.hasPrevPage ? `/api/products?limit=${limit}&page=${products.prevPage}&sort=${sort}&query=${query}` : null,
      nextLink: products.hasNextPage ? `/api/products?limit=${limit}&page=${products.nextPage}&sort=${sort}&query=${query}` : null
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Obtener producto por ID
router.get('/:pid', async (req, res) => {
  try {
    const product = await Product.findById(req.params.pid);
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: `Product with ID ${req.params.pid} was not found` });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Crear producto
router.post('/', async (req, res) => {
  try {
    const { title, description, code, price, status = true, stock, category, thumbnails = [] } = req.body;
    if (!title || !description || !code || !price || !stock || !category) {
      return res.status(400).json({ message: "All fields except thumbnails are required" });
    }
    const newProduct = new Product({ title, description, code, price, status, stock, category, thumbnails });
    await newProduct.save();
    req.app.get('io').emit('updateProducts', await Product.find());
    res.status(201).json({ message: 'Product successfully created', newProduct });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Actualizar producto
router.put('/:pid', async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(req.params.pid, req.body, { new: true });
    if (updatedProduct) {
      req.app.get('io').emit('updateProducts', await Product.find());
      res.json({ message: 'Product successfully updated', updatedProduct });
    } else {
      res.status(404).json({ message: `Product with ID ${req.params.pid} was not found` });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Eliminar producto
router.delete('/:pid', async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.pid);
    if (deletedProduct) {
      req.app.get('io').emit('updateProducts', await Product.find());
      res.status(200).json({ message: `Product with ID ${req.params.pid} successfully deleted` });
    } else {
      res.status(404).json({ message: `Product with ID ${req.params.pid} was not found` });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

export default router;

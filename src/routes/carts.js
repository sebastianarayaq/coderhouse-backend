import express from 'express';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

const router = express.Router();

// Crear un nuevo carrito
router.post('/', async (req, res) => {
  try {
    const newCart = new Cart();
    await newCart.save();
    res.status(201).json({ message: 'Cart successfully created', newCart });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Obtener carrito por ID
router.get('/:cid', async (req, res) => {
  try {
    const cart = await Cart.findById(req.params.cid).populate('products.product');
    if (cart) {
      res.json(cart.products);
    } else {
      res.status(404).json({ message: `Cart with ID ${req.params.cid} was not found` });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Agregar producto al carrito
router.post('/:cid/products/:pid', async (req, res) => {
  try {
    const cart = await Cart.findById(req.params.cid);
    if (!cart) {
      return res.status(404).json({ message: `Cart with ID ${req.params.cid} was not found` });
    }
    const product = await Product.findById(req.params.pid);
    if (!product) {
      return res.status(404).json({ message: `Product with ID ${req.params.pid} was not found` });
    }
    const productIndex = cart.products.findIndex(p => p.product.equals(req.params.pid));
    if (productIndex === -1) {
      cart.products.push({ product: req.params.pid, quantity: 1 });
    } else {
      cart.products[productIndex].quantity += 1;
    }
    await cart.save();
    res.status(201).json(cart);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Eliminar producto del carrito
router.delete('/:cid/products/:pid', async (req, res) => {
  try {
    const cart = await Cart.findById(req.params.cid);
    if (!cart) {
      return res.status(404).json({ message: `Cart with ID ${req.params.cid} was not found` });
    }
    const productIndex = cart.products.findIndex(p => p.product.equals(req.params.pid));
    if (productIndex !== -1) {
      cart.products.splice(productIndex, 1);
      await cart.save();
      res.status(200).json({ message: `Product with ID ${req.params.pid} successfully removed from cart` });
    } else {
      res.status(404).json({ message: `Product with ID ${req.params.pid} was not found in the cart` });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Actualizar carrito con un arreglo de productos
router.put('/:cid', async (req, res) => {
  try {
    const cart = await Cart.findById(req.params.cid);
    if (!cart) {
      return res.status(404).json({ message: `Cart with ID ${req.params.cid} was not found` });
    }
    cart.products = req.body.products;
    await cart.save();
    res.status(200).json({ message: 'Cart successfully updated', cart });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Actualizar la cantidad de un producto en el carrito
router.put('/:cid/products/:pid', async (req, res) => {
  try {
    const cart = await Cart.findById(req.params.cid);
    if (!cart) {
      return res.status(404).json({ message: `Cart with ID ${req.params.cid} was not found` });
    }
    const productIndex = cart.products.findIndex(p => p.product.equals(req.params.pid));
    if (productIndex !== -1) {
      cart.products[productIndex].quantity = req.body.quantity;
      await cart.save();
      res.status(200).json({ message: 'Product quantity successfully updated', cart });
    } else {
      res.status(404).json({ message: `Product with ID ${req.params.pid} was not found in the cart` });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Eliminar todos los productos del carrito
router.delete('/:cid', async (req, res) => {
  try {
    const cart = await Cart.findById(req.params.cid);
    if (!cart) {
      return res.status(404).json({ message: `Cart with ID ${req.params.cid} was not found` });
    }
    cart.products = [];
    await cart.save();
    res.status(200).json({ message: 'All products successfully removed from cart' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

export default router;

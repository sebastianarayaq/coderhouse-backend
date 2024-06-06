import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();
const cartsFilePath = path.resolve("./src/data/carts.json");
const productsFilePath = path.resolve("./src/data/products.json");

const getCarts = () => {
  try {
    const data = fs.readFileSync(cartsFilePath, "utf-8");
    return JSON.parse(data) || [];
  } catch (error) {
    console.error("Error reading carts file:", error);
    return [];
  }
};

const saveCarts = (carts) => {
  try {
    fs.writeFileSync(cartsFilePath, JSON.stringify(carts, null, 2));
  } catch (error) {
    console.error("Error saving carts file:", error);
  }
};

const getProducts = () => {
  try {
    const data = fs.readFileSync(productsFilePath, "utf-8");
    return JSON.parse(data) || [];
  } catch (error) {
    console.error("Error reading products file:", error);
    return [];
  }
};

//Crea un nuevo carrito
router.post("/", (req, res) => {
  const carts = getCarts();
  const id =
    (carts.length ? Math.max(...carts.map((c) => parseInt(c.id))) : 0) + 1;
  const newCart = { id: id.toString(), products: [] };
  carts.push(newCart);
  saveCarts(carts);
  res
    .status(201)
    .json({ message: `Cart with ID ${id} was successfully created`, newCart });
});

//Obtener el carrito segun el ID indicado
router.get("/:cid", (req, res) => {
  const carts = getCarts();
  const cart = carts.find((c) => c.id === req.params.cid);
  if (cart) {
    res.json(cart.products);
  } else {
    res.status(404).json({
      message: `Cart with ID ${req.params.cid} was not found`,
    });
  }
});

//Agregar un producto a un carrito segun los IDs indicados
router.post("/:cid/product/:pid", (req, res) => {
  const carts = getCarts();
  const products = getProducts();

  const cart = carts.find((c) => c.id === req.params.cid);
  if (!cart) {
    return res.status(404).json({
      message: `Cart with ID ${req.params.cid} was not found`,
    });
  }

  const product = products.find((p) => p.id === req.params.pid);
  if (!product) {
    return res.status(404).json({
      message: `Product with ID ${req.params.pid} was not found`,
    });
  }

  const productIndex = cart.products.findIndex(
    (p) => p.product === req.params.pid
  );
  if (productIndex === -1) {
    cart.products.push({ product: req.params.pid, quantity: 1 });
  } else {
    cart.products[productIndex].quantity += 1;
  }

  saveCarts(carts);
  res.status(201).json(cart);
});

export default router;

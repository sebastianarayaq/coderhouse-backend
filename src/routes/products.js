import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();
const productsFilePath = path.resolve("./src/data/products.json");

const getProducts = () => {
  try {
    const data = fs.readFileSync(productsFilePath, "utf-8");
    return JSON.parse(data) || [];
  } catch (error) {
    console.error("Error reading products file:", error);
    return [];
  }
};

const saveProducts = (products) => {
  fs.writeFileSync(productsFilePath, JSON.stringify(products, null, 2));
};

//Obtener todos los productos desde products.json o limitando con el valor obtenido desde el req.query
router.get("/", (req, res) => {
  const { limit } = req.query;
  const products = getProducts();
  if (limit) {
    res.json(products.slice(0, limit));
  } else {
    res.json(products);
  }
});

//Obtener producto segun el ID indicado
router.get("/:pid", (req, res) => {
  const products = getProducts();
  const product = products.find((p) => p.id === req.params.pid);
  if (product) {
    res.json(product);
  } else {
    res
      .status(404)
      .json({ message: `Product with ID ${req.params.pid} was not found` });
  }
});

//Crear producto validando que se ingresen los datos requeridos
router.post("/", (req, res) => {
  const {
    title,
    description,
    code,
    price,
    status = true,
    stock,
    category,
    thumbnails = [],
  } = req.body;
  if (!title || !description || !code || !price || !stock || !category) {
    return res
      .status(400)
      .json({ message: "All fields except thumbnails are required" });
  }

  const products = getProducts();
  const id =
    (products.length ? Math.max(...products.map((p) => parseInt(p.id))) : 0) +
    1;
  const newProduct = {
    id: id.toString(),
    title,
    description,
    code,
    price,
    status,
    stock,
    category,
    thumbnails,
  };
  products.push(newProduct);
  saveProducts(products);
  res.status(201).json({
    message: "Product successfully created",
    newProduct,
  });
});

//Actualizar producto segun el ID indicado
router.put("/:pid", (req, res) => {
  const products = getProducts();
  const productIndex = products.findIndex((p) => p.id === req.params.pid);
  if (productIndex === -1) {
    return res
      .status(404)
      .json({ message: `Product with ID ${req.params.pid} was not found` });
  }

  const updatedProduct = {
    ...products[productIndex],
    ...req.body,
    id: products[productIndex].id,
  };
  products[productIndex] = updatedProduct;
  saveProducts(products);
  res.json({ message: "Product successfully updated", updatedProduct });
});

//Eliminar producto segun el ID indicado
router.delete("/:pid", (req, res) => {
  const products = getProducts();
  const newProducts = products.filter((p) => p.id !== req.params.pid);

  if (newProducts.length === products.length) {
    return res
      .status(404)
      .json({ message: `Product with ID ${req.params.pid} was not found` });
  }

  saveProducts(newProducts);
  res
    .status(200)
    .json({
      message: `Product with ID ${req.params.pid} successfully deleted`,
    });
});

export default router;

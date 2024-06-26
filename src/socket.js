import { getProducts, saveProducts } from "./utils/productUtils.js";

export const initializeSocket = (io) => {
  let connectionCount = 0;

  io.on("connection", (socket) => {
    connectionCount++;
    console.log(`New client connected. Total connections: ${connectionCount}`);

    socket.emit("updateProducts", getProducts());

    socket.on("createProduct", (product) => {
      if (
        !product.title ||
        !product.description ||
        !product.code ||
        !product.price ||
        !product.stock ||
        !product.category
      ) {
        return; 
      }
      const products = getProducts();
      const id = (products.length ? Math.max(...products.map((p) => parseInt(p.id))) : 0) + 1;
      const newProduct = { id: id.toString(), ...product };
      products.push(newProduct);
      saveProducts(products);
      io.emit("updateProducts", getProducts());
    });

    socket.on("deleteProduct", (productId) => {
      const products = getProducts();
      const newProducts = products.filter((p) => p.id !== productId);
      saveProducts(newProducts);
      io.emit("updateProducts", getProducts());
    });

    socket.on("disconnect", () => {
      connectionCount--;
      console.log(`Client disconnected. Total connections: ${connectionCount}`);
    });
  });
};

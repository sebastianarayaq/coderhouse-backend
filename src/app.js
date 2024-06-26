import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { engine } from "express-handlebars";
import path from "path";
import { fileURLToPath } from "url";
import productsRouter from "./routes/products.js";
import cartsRouter from "./routes/carts.js";
import { initializeSocket } from "./socket.js";
import { getProducts } from "./utils/productUtils.js";

// Obtener el nombre de archivo y directorio actuales
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8080;
const httpServer = createServer(app);
const io = new Server(httpServer);

// Configuración de Handlebars
app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Servir archivos estáticos de socket.io
app.use("/socket.io", express.static(path.join(__dirname, "node_modules/socket.io/client-dist")));

app.use((req, res, next) => {
  req.app.set("io", io);
  next();
});

app.use("/api/products", productsRouter);
app.use("/api/carts", cartsRouter);

// Ruta para la vista home.handlebars
app.get("/", (req, res) => {
  const products = getProducts();
  console.log(products); // Verificar los productos en la consola del servidor
  res.render("home", { title: "Home", products });
});

// Ruta para la vista realTimeProducts.handlebars
app.get("/realtimeproducts", (req, res) => {
  const products = getProducts();
  res.render("realTimeProducts", { title: "Real-Time Products", products });
});

initializeSocket(io);

httpServer.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

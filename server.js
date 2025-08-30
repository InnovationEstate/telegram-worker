// server.js
import express from "express";
import { fileURLToPath } from "url";
import path from "path";
import { initNotifications } from "./worker.js"; // your existing worker

const app = express();
const PORT = process.env.PORT || 3000;

// Minimal HTTP server to satisfy Render's port requirement
app.get("/", (req, res) => {
  res.send("Worker is running ✅");
});

// Start Express server
app.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);
  
  // Start your worker after server is up
  await initNotifications();
});

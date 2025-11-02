import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import FormData from "form-data";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());

// Multer para recibir archivos
const upload = multer({ dest: "uploads/" });

// Ruta para recibir el formulario con fotos
app.post("/send", upload.array("images", 3), async (req, res) => {
  try {
    console.log("=== NUEVA PETICIÓN RECIBIDA ===");

    // Mostrar lo que llega
    console.log("Body:", req.body);
    console.log("Archivos:", req.files.map(f => f.originalname));

    const { name, comment } = req.body;
    const files = req.files || [];

    const htmlContent = `
      <h2>Nuevo comentario recibido</h2>
      <p><strong>Nombre:</strong> ${name}</p>
      <p><strong>Comentario:</strong><br>${comment}</p>
      <p>Imágenes adjuntas: ${files.length}</p>
    `;

    // Preparar FormData para enviar a Resend
    const formData = new FormData();
    formData.append("from", "Comment Form <no-reply@yourdomain.com>");
    formData.append("to", process.env.EMAIL_TO);
    formData.append("subject", "Nuevo comentario con fotos");
    formData.append("html", htmlContent);

    files.forEach(file => {
      formData.append("attachments", fs.createReadStream(file.path), file.originalname);
    });

    console.log("Enviando a Resend:", {
      to: process.env.EMAIL_TO,
      subject: "Nuevo comentario con fotos",
      attachmentsCount: files.length
    });

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: formData
    });

    const result = await response.json();

    // Limpiar archivos temporales
    files.forEach(file => fs.unlinkSync(file.path));

    console.log("Respuesta de Resend:", result);

    if (response.ok) {
      res.json({ success: true, result });
    } else {
      res.status(500).json({ success: false, result });
    }

  } catch (err) {
    console.error("Error al enviar:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

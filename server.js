import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Configurar almacenamiento temporal de imágenes
const upload = multer({ dest: "uploads/" });

// Ruta para manejar el envío del formulario
app.post("/send", upload.array("images", 3), async (req, res) => {
  try {
    console.log("=== NUEVA PETICIÓN RECIBIDA ===");
    console.log("Body:", req.body);
    console.log("Archivos:", req.files.map(f => f.originalname));

    const { name, comment } = req.body;
    const files = req.files || [];

    // Cuerpo HTML del correo
    const htmlContent = `
      <h2>Nuevo comentario recibido</h2>
      <p><strong>Nombre:</strong> ${name}</p>
      <p><strong>Comentario:</strong><br>${comment}</p>
      <p>Imágenes adjuntas: ${files.length}</p>
    `;

    // ✅ Convertir imágenes a base64 en el formato correcto para Resend
    const attachments = files.map(file => {
      const fileData = fs.readFileSync(file.path);
      return {
        filename: file.originalname,
        content: fileData.toString("base64"), // 👈 campo correcto
      };
    });

    console.log("Enviando a Resend:", {
      to: process.env.EMAIL_TO,
      subject: "Nuevo comentario con fotos",
      attachmentsCount: attachments.length
    });

    // Enviar correo usando la API de Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Comment Form <onboarding@resend.dev>", // 🟢 usa dominio de prueba de Resend
        to: process.env.EMAIL_TO,
        subject: "Nuevo comentario con fotos",
        html: htmlContent,
        attachments: attachments
      })
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

// Iniciar servidor
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

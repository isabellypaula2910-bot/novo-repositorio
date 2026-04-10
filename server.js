// Importação das bibliotecas
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configuração do Socket.io com permissão de acesso (CORS)
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

// Conexão com o Banco de Dados PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 🔥 DEBUG DE CONEXÃO (IMPORTANTE)
pool.connect()
  .then(() => console.log("✅ Conectado ao banco"))
  .catch(err => console.error("❌ Erro ao conectar no banco:", err));

// --- ROTA DE API (REST) ---

app.get('/alertas', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM alertas ORDER BY data_criacao DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro na rota GET /alertas:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/alertas', async (req, res) => {
  const { mensagem, nivel } = req.body;

  try {
    const query =
      'INSERT INTO alertas (mensagem, nivel) VALUES ($1, $2) RETURNING *';

    const result = await pool.query(query, [mensagem, nivel]);
    const novoAlerta = result.rows[0];

    io.emit('novo_alerta', novoAlerta);

    res.status(201).json(novoAlerta);
  } catch (err) {
    console.error("Erro na rota POST /alertas:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- WEBSOCKET LOGIC ---
io.on('connection', (socket) => {
  console.log('🔌 Novo cliente conectado:', socket.id);

  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado');
  });
});

// --- SERVIDOR ---
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
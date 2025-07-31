/**
 * 🧪 TESTE SIMPLES - Servidor mínimo porta 3001
 */

const express = require('express');
const cors = require('cors');

const app = express();
const port = 3001;

// Middleware básico
app.use(cors());
app.use(express.json());

// Rota de teste
app.get('/health', (req, res) => {
    console.log('📱 Health check requisitado');
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'Servidor teste funcionando na porta 3001!',
        port: port
    });
});

app.get('/', (req, res) => {
    res.json({
        message: 'LAIS IA - Servidor de Teste',
        port: port,
        endpoints: ['/health', '/test']
    });
});

app.get('/test', (req, res) => {
    res.json({
        test: 'SUCCESS',
        server: 'Funcionando perfeitamente na porta 3001!'
    });
});

// Inicia servidor
app.listen(port, () => {
    console.log(`🚀 Servidor teste rodando na porta ${port}`);
    console.log(`📱 Health: http://localhost:${port}/health`);
    console.log(`🧪 Test: http://localhost:${port}/test`);
});

// Error handlers
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Rejection:', reason);
});
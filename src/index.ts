import express from 'express';
import cors from 'cors';
import { LsegProxy } from './services/lsegProxy.js';
import apiRegistry from './data/apiRegistry.json' with { type: "json" };

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Get available APIs
app.get('/api/discovery', (req, res) => {
    res.json(apiRegistry);
});

// Proxy API calls
app.post('/api/call', async (req, res) => {
    const { apiId, category, method, endpoint, query, body } = req.body;

    try {
        const data = await LsegProxy.callApi(apiId, category, { method, endpoint, query, body });
        res.json(data);
    } catch (error: any) {
        const status = error.response?.status || 500;
        const details = error.response?.data || error.message || error;
        res.status(status).json({ error: 'API call failed', details });
    }
});

app.listen(PORT, () => {
    console.log(`DataManager Backend running on http://localhost:${PORT}`);
});

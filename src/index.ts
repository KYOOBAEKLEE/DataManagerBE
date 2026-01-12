import express from 'express';
import cors from 'cors';
import { LsegProxy } from './services/lsegProxy.js';
import apiRegistry from './data/apiRegistry.json' with { type: "json" };

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/discovery', (req, res) => {
    res.json(apiRegistry);
});

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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

app.post('/api/lipper-analyze', async (req, res) => {
    const { id, datapoints } = req.body;

    if (!id || !datapoints || !Array.isArray(datapoints) || datapoints.length === 0) {
        res.status(400).json({ error: 'id and datapoints array are required' });
        return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (event: string, data: unknown) => {
        res.write(`data: ${JSON.stringify({ event, data })}\n\n`);
    };

    const results: Array<{ property: string; data: unknown; error?: string }> = [];

    try {
        for (let i = 0; i < datapoints.length; i++) {
            const property = datapoints[i];
            
            sendEvent('progress', {
                current: i + 1,
                total: datapoints.length,
                property,
                status: 'fetching'
            });

            try {
                const endpoint = `/data/funds/v1/assets/${id}`;
                const query = { properties: property };
                
                const data = await LsegProxy.callApi(
                    'lipper-assets-id',
                    'LIPPER',
                    { method: 'GET', endpoint, query }
                );

                results.push({ property, data });
                
                sendEvent('property_complete', {
                    current: i + 1,
                    total: datapoints.length,
                    property,
                    success: true
                });
            } catch (error: any) {
                const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
                results.push({ property, data: null, error: errorMsg });
                
                sendEvent('property_complete', {
                    current: i + 1,
                    total: datapoints.length,
                    property,
                    success: false,
                    error: errorMsg
                });
            }

            if (i < datapoints.length - 1) {
                sendEvent('waiting', { seconds: 5, nextProperty: datapoints[i + 1] });
                await sleep(5000);
            }
        }

        sendEvent('complete', { results });
    } catch (error: any) {
        sendEvent('error', { message: error.message || 'Analysis failed' });
    } finally {
        res.end();
    }
});

app.listen(PORT, () => {
    console.log(`DataManager Backend running on http://localhost:${PORT}`);
});

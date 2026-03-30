import express from 'express';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
import { swaggerSpec } from './config/swagger';
import { initDatabase } from './config/database';
import ratingRoutes from './routes/rating.routes';
import eventRoutes from './routes/event.routes';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use(ratingRoutes);
app.use(eventRoutes);

// Health check
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'tumoro-rating-service' });
});

// Boot: connect to DB then start server
initDatabase()
    .then(() => {
        app.listen(port, () => {
            console.log(`🚀 Rating service running at http://localhost:${port}`);
            console.log(`📖 API docs available at http://localhost:${port}/api-docs`);
        });
    })
    .catch((err) => {
        console.error('❌ Failed to connect to database. Shutting down.', err);
        process.exit(1);
    });

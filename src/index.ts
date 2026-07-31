import express from 'express';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
import cors from 'cors';
import { swaggerSpec } from './config/swagger';
import { initDatabase } from './config/database';
import ratingRoutes from './routes/rating.routes';
import eventRoutes from './routes/event.routes';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : [
    'https://www.tumoro.org',
    'https://tumoro.org',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:8082',
  ];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-CSRF-Token'],
  optionsSuccessStatus: 200,
}));

app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use(ratingRoutes);
app.use(eventRoutes);

// Health check
app.get('/health', (req: express.Request, res: express.Response) => {
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

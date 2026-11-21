"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const swagger_1 = require("./config/swagger");
const database_1 = require("./config/database");
const rating_routes_1 = __importDefault(require("./routes/rating.routes"));
const event_routes_1 = __importDefault(require("./routes/event.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
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
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-CSRF-Token'],
    optionsSuccessStatus: 200,
}));
app.use(express_1.default.json());
// Swagger UI
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
// Routes
app.use(rating_routes_1.default);
app.use(event_routes_1.default);
// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'tumoro-rating-service' });
});
// Boot: connect to DB then start server
(0, database_1.initDatabase)()
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

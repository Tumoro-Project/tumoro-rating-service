"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const dotenv_1 = __importDefault(require("dotenv"));
const swagger_1 = require("./config/swagger");
const database_1 = require("./config/database");
const rating_routes_1 = __importDefault(require("./routes/rating.routes"));
const event_routes_1 = __importDefault(require("./routes/event.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = Number(process.env.PORT) || 3000;
app.use(express_1.default.json());
// Swagger UI
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
// Routes
app.use(rating_routes_1.default);
app.use(event_routes_1.default);
// Health check
app.get('/health', (_req, res) => {
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

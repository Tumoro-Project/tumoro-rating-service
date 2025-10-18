
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import ratingRoutes from './routes/rating.routes';

const app = express();
const port = 3000;

app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use(ratingRoutes);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

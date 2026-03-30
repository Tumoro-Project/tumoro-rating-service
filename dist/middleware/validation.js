"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const validate = (schema) => {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const { fieldErrors } = result.error.flatten();
            return res.status(400).json({
                message: 'Validation failed',
                errors: fieldErrors,
            });
        }
        // Attach parsed (and coerced) data back to req.body
        req.body = result.data;
        next();
    };
};
exports.validate = validate;

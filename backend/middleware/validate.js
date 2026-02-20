import { validationResult } from 'express-validator';

/**
 * Run express-validator checks and return 400 if errors exist.
 * Usage: router.post('/route', [...validationChain], validate, controller);
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map((err) => ({
                field: err.path,
                message: err.msg,
            })),
        });
    }

    next();
};

export default validate;

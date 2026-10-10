import jwt from 'jsonwebtoken';
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        // For demo/development fallback if token is omitted
        const demoUserId = req.headers['x-demo-user-id'];
        if (demoUserId) {
            req.user = { id: demoUserId, email: 'demo@finsphere.com', role: 'user' };
            return next();
        }
        return res.status(401).json({ success: false, message: 'Access token required' });
    }
    const secret = process.env.JWT_SECRET || 'finsphere_super_secret_jwt_key_2026_finance_app';
    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            jwt.verify(token, 'moneymate_super_secret_jwt_key_2026_finance_app', (err2, decoded2) => {
                if (err2) {
                    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
                }
                req.user = decoded2;
                next();
            });
            return;
        }
        req.user = decoded;
        next();
    });
};

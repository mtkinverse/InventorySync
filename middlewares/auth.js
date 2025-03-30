const jwt = require('jsonwebtoken');
const authFreeRoutes = ['', 'login']
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

module.exports.auth = (req, res, next) => {
    const path = req.path.split('/')[1]

    if (path && authFreeRoutes.includes(path)) return next()

    const token = req.headers.authorization;

    if (!token) return res.status(401).json({ message: 'Access Denied' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;

        const targetStoreId = req.body.store_id || req.params.store_id || req.user.store_id;
        if (req.user.role === 'superadmin' || req.user.store_id == targetStoreId)
            // return next();
            next();
        else res.status(400).json({ message: 'Kindly be precise while entering your credentials' })
    } catch (err) {
        res.status(403).json({ message: 'Invalid token' });
    }

}
module.exports.auth = (req, res, next) => {

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: 'Access Denied' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        const targetStoreId = req.body.store_id || req.params.store_id;
        if (req.user.role === 'superadmin' || req.user.store_id == targetStoreId)
            // return next();
            next();

    } catch (err) {
        res.status(403).json({ message: 'Invalid token' });
    }

}
const db = require('../modules/db');
const { eventEmitter } = require('../modules/eventBroker');

module.exports.addTheProduct = async (req, res) => {
    try {
        const eventData = req.body;
        eventEmitter.emit('add_product', eventData);
        res.status(200).json({ message: 'Product addition event published successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports.updateTheStock = async (req, res) => {
    try {
        const eventData = req.body;
        eventEmitter.emit('update_stock', eventData);
        res.status(200).json({ message: 'Stock update event published successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports.getTheProduct = async (req, res) => {
    try {
        const { product_id, store_id } = req.query;
        const product = await db.getProduct(product_id, store_id);
        res.status(200).json({ product });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports.updateProduct = async (req, res) => {
    try {
        eventEmitter.emit('update_product', req.body);
        res.status(200).json({ message: 'Product update event published successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports.getStockMovements = async (req, res) => {
    try {
        const { store_id, product_id } = req.query;
        const movements = await db.getStockMovements(store_id, product_id);
        res.status(200).json({ movements });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports.getAllProducts = async (req, res) => {
    try {
        const { store_id, page = 1 } = req.query;
        const products = await db.getAllProducts(store_id, page);
        res.status(200).json({ products });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports.getOverStockedProducts = async (req, res) => {
    try {
        const { store_id, from, to, threshold = 0.3 } = req.query;
        const overStocked = await db.getOverStockedProducts(store_id, from, to, threshold);
        res.status(200).json({ overStocked });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports.addTheStore = async (req, res) => {
    try {
        eventEmitter.emit('add_store', req.body);
        res.status(200).json({ message: 'Store addition event published successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports.removeStore = async (req, res) => {
    try {
        eventEmitter.emit('remove_store', req.params);
        res.status(200).json({ message: 'Store removal event published successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports.updateStore = async (req, res) => {
    try {
        eventEmitter.emit('update_store', req.body);
        res.status(200).json({ message: 'Store update event published successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

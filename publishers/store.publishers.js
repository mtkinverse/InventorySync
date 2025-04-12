const db = require('../modules/db');
const eventEmitter = require('../modules/eventBroker');
const cacheModal = require('../modules/cache')
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

module.exports.removeTheProduct = async (req,res) => {
    try{
        eventEmitter.emit('remove_product',req.body)
        res.status(200).json({ message: 'Product delete event published successfully' });
    }catch (err){
        res.status(500).json({ message: err.message });
    }
}

module.exports.getStockMovements = async (req, res) => {
    try {
        const limit = 10
        let { store_id, product_id, reason, to, from, page = 1 } = req.query;

        page = parseInt(page)
        if (page <= 0) return res.status(400).json({ message: 'Pages cannot be zero or less' })
        const offset = (page - 1) * limit

        const connection = db.getStoreShard(store_id)

        if (product_id) {

            const [[{ total }]] = await connection.query(`SELECT COUNT(*) as total FROM stock_movements WHERE product_id = ? and store_id = ? ${reason ? `AND reason = '${reason}'` : ''} ${from ? ` AND movement_time >= '${from}'` : ''} ${to ? ` AND movement_time <= '${to}'` : ''} ORDER BY movement_time DESC`, [product_id, store_id])
            const totalPages = Math.ceil(total / limit)

            const [rows] = await connection.query(
                `SELECT * FROM stock_movements WHERE product_id = ? and store_id = ? ${reason ? `AND reason = '${reason}'` : ''} ${from ? ` AND movement_time >= '${from}'` : ''} ${to ? ` AND movement_time <= '${to}'` : ''} ORDER BY movement_time DESC LIMIT ? OFFSET ?`,
                [product_id, store_id, limit, offset]
            );
            res.status(200).json({ total_pages: totalPages, hasMore: page < totalPages, limit, page, store_id, product_id, movements: rows })

        }
        else {

            const [[{ total }]] = await connection.query(`SELECT COUNT(*) as total FROM stock_movements WHERE store_id = ? ${reason ? `AND reason = '${reason}'` : ''} ${from ? ` AND movement_time >= '${from}'` : ''} ${to ? ` AND movement_time <= '${to}'` : ''} ORDER BY movement_time DESC`, [store_id])
            const totalPages = Math.ceil(total / limit)

            const [rows] = await connection.query(
                `SELECT * FROM stock_movements WHERE store_id = ? ${reason ? `AND reason = '${reason}'` : ''} ${from ? ` AND movement_time >= '${from}'` : ''} ${to ? ` AND movement_time <= '${to}'` : ''} ORDER BY movement_time DESC LIMIT ? OFFSET ?`,
                [store_id, limit, offset]
            );
            res.status(200).json({ total_pages: totalPages, hasMore: page < totalPages, limit, page, store_id, movements: rows });

        }

        // if (product_id)
        //     res.status(200).json({ store_id, product_id, movements })
        // else
        //     res.status(200).json({ store_id, movements });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports.getAllProducts = async (req, res) => {
    try {
        const limit = 10
        let { store_id, page = 1 } = req.query;

        page = parseInt(page);

        if (page <= 0) return res.status(400).json({ message: "Page number cannot be negative or zero" })
        const offset = (page - 1) * limit;

        const connection = db.getStoreShard(store_id);

        const [rows] = await connection.query(`SELECT * FROM products p JOIN stocks s ON p.id = s.product_id where s.store_id = ? LIMIT ? OFFSET ?`, [store_id, limit, offset]);
        const [[{ total }]] = await connection.query(`SELECT COUNT(*) as total FROM products p JOIN stocks s ON p.id = s.product_id`);

        const totalPages = Math.ceil(total / limit);
        const hasMore = totalPages > page

        res.status(200).json({ total_pages: totalPages, page, limit, hasMore, products: rows });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports.getOverStockedProducts = async (req, res) => {
    try {
        const { store_id, from, to, threshold = 0.3 } = req.query;
        const cache = cacheModal.registerStore(store_id)

        let overStocked = []
        if (!cache.dirty) {
            overStocked = cache.overStockedProducts;
        }
        else {
            overStocked = await db.overStockedProducts(store_id, from, to, threshold);
            cacheModal.cache.set(parseInt(store_id), { overStockedProducts: overStocked, dirty: false })
        }
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

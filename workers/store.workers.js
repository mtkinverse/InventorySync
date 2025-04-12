const db = require('../modules/db');
const eventEmitter = require('../modules/eventBroker');
const socket = require('../modules/socket.js');
const cacheModal = require('../modules/cache.js')
const io = socket.getIO();

const sendError = (store_id, message) => {
    io.to(`store_${store_id}`).emit('errorsss', { message });
};

// Handle product addition
eventEmitter.on('add_product', async (data) => {
    try {
        
        const product = await db.addProduct(data.name, data.category, data.price, data.description, data.store_id, data.current_stock, data.unit);
        if(product === undefined)
            sendError(data.store_id, 'Something went wrong while adding product')
        else io.to(`store_${data.store_id}`).emit('product_added', { message: `Product ${data.name} added successfully.` });
        
    } catch (error) {
        sendError(data.store_id, error.message);
    }
});

eventEmitter.on('remove_product', async (data) => {
    await db.removeProduct(data.product_id, data.store_id)
    io.to(`store_${data.store_id}`).emit('product_removed', { message: `Product ${data.name} removed successfully.` });
})

// Handle stock update
eventEmitter.on('update_stock', async (data) => {
    try {

        const res = await db.updateStock(data.product_id, data.store_id, data.quantity_change, data.reason, data.isnew, data.price, data.unit);
        if (res === undefined) throw new Error('Unable to update stock')
        const cache = cacheModal.registerStore(data.store_id)
        cache.dirty = true
        cacheModal.cache.set(data.store_id, cache)

        io.to(`store_${data.store_id}`).emit('stock_updated', { message: `Stock updated for product ${data.product_id}` });
    } catch (error) {
        sendError(data.store_id, error.message);
    }
});

// Handle product update
eventEmitter.on('update_product', async (data) => {
    try {
        const connection = db.getStoreShard(data.store_id, true);
        const [[product]] = await connection.query('SELECT * FROM products WHERE id = ?', [data.product_id]);
        if (!product) throw new Error('No such product exists');

        const newProduct = [data.name || product.name, data.description || product.description, data.category || product.category, data.product_id]

        await connection.query(
            'UPDATE products SET name = ?, description = ?, category = ? WHERE id = ?',
            [data.name || product.name,  data.description || product.description, data.category || product.category, data.product_id]
        );

        io.to(`store_${data.store_id}`).emit('product_updated', { message: 'Product updated successfully.' });
    } catch (error) {
        sendError(data.store_id, error.message);
    }
});

// Handle store addition
eventEmitter.on('add_store', async (data) => {
    try {
        const store = await db.addStore(data.name, data.address);
        io.emit('store_added', { message: `Store ${store.name} added successfully.` });
    } catch (error) {
        console.error('Error adding store:', error.message);
    }
});

// Handle store removal
eventEmitter.on('remove_store', async (data) => {
    try {
        const connection = db.getStoreShard(data.store_id, true);
        await connection.query('DELETE FROM stores WHERE id = ?', [data.store_id]);
        io.emit('store_removed', { message: `Store ID ${data.store_id} removed successfully.` });
    } catch (error) {
        sendError(data.store_id, error.message);
    }
});

// Handle store update
eventEmitter.on('update_store', async (data) => {
    try {
        const connection = db.getStoreShard(data.store_id, true);
        const [[store]] = await connection.query('SELECT * FROM stores where id = ?', [data.store_id])
        if (!store) throw new Error('Required store not found!')

        const newStore = [data.name || store.name, data.address || store.address, data.store_id]
        await connection.query('UPDATE stores SET name = ?, address = ? WHERE id = ?', [...newStore]);
        io.emit('store_updated', { message: `Store ID ${data.store_id} updated successfully.` });
    } catch (error) {
        sendError(data.store_id, error.message);
    }
});

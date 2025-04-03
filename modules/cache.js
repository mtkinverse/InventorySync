const { LRUCache } = require('lru-cache');

const cache = new LRUCache({
    max: 100,
    ttl: 1000 * 60 * 5
});

const dirtyFlags = {};

function registerStore(storeId1) {
    const storeId = parseInt(storeId1);
    if (!cache.has(storeId)) {
        cache.set(storeId, {
            overStockedProducts: [], dirty: true
        });
    }
    return cache.get(storeId)
}



module.exports = { cache, dirtyFlags, registerStore }
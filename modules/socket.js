const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const redis = require("redis");
const { RateLimiterRedis } = require("rate-limiter-flexible");

let io;

const redisClient = redis.createClient({ url: 'redis://memcached-14033.c246.us-east-1-4.ec2.redns.redis-cloud.com:14033' });
redisClient.connect();

const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    points: 5, // number of requests
    duration: 10, // seconds
    keyPrefix: 'limiter'
});

function init(server) {
    console.log('Initializing WebSocket Server...');

    io = new Server(server, { cors: { origin: "*" } });

    io.use(async (socket, next) => {
        console.log('Authenticating WebSocket connection...');

        try {
            const token = socket.handshake.query.token;
            if (!token) return next(new Error("Authentication required"));

            const user = jwt.verify(token, "YOUR_SECRET_KEY");
            socket.user = user;

            const store_id = user.store_id;

            // await rateLimiter.consume(store_id);
            // await rateLimiter.consume(socket.id); // per-client rate limiting
            next();

        } catch (err) {
            next(new Error("Authentication failed or Too many requests"));
        }
    });
    return io;
}

function getIO() {
    if (!io) {
        throw new Error('WebSocket server not initialized!');
    }
    return io;
}

module.exports = { getIO, init };

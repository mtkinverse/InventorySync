const rateLimit = require('express-rate-limit')

// import RedisStore from 'rate-limit-redis';
// import { createClient } from 'redis';

// Create Redis client
// const redisClient = createClient({ url: 'redis://memcached-14033.c246.us-east-1-4.ec2.redns.redis-cloud.com:14033' });
// redisClient.connect();

const limiter = rateLimit({
	// store: new RedisStore({
	// 	sendCommand: (...args) => redisClient.sendCommand(args),
	// }),
	windowMs: 60 * 1000,
	limit: 3,
	keyGenerator: (req) => `${req.user?.id}` || `${req.ip}`,
	standardHeaders: 'draft-8',
	legacyHeaders: false,
});

module.exports = limiter;
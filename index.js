const express = require('express');
const app = express();
const serverRoutes = require('./routes/server.route')
const userRoutes = require('./routes/user.route')
const rateLimiter = require('./middlewares/rateLimiter')
const cors = require('cors');
const { auth } = require('./middlewares/auth');
const PORT = process.env.PORT;

const cacheModal = require('./modules/cache')
const socket = require('./modules/socket')

const http = require('http');
const server = http.createServer(app);
const io = socket.init(server)
const workers = require('./workers/store.workers')



app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173']
}));
app.use(auth);
// app.use(rateLimiter)
app.use(serverRoutes);
app.use(userRoutes);


app.get('/', (req, res) => {
    res.send('This is server of the legend Taha khan!');
});


io.on("connection", (socket) => {
    console.log(`Client ${socket.id} connected as user ${socket.user.id}`);

    socket.on("subscribe", (store_id) => {
        socket.join(`store_${store_id}`);
        console.log(`User ${socket.user.id} subscribed to store ${store_id}`);
    });

    socket.on("disconnect", () => {
        console.log(`Client ${socket.id} disconnected`);
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
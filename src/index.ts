import app from './app';
import config from './config';
import dotenv from "dotenv";
import http from "http";
import { initSocketServer } from "./socket-server";
dotenv.config();

const server = http.createServer(app);

initSocketServer(server);


server.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT}`);
});

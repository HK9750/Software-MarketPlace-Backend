import { Server as socketIOServer } from "socket.io";
import http from "http";


export const initSocketServer = (server: http.Server) => {
    const io = new socketIOServer(server)

    io.on("connect", (socket) => {
        console.log("New socket connection established")

        socket.on("notification", (data) => {
            console.log(data)
            io.emit("newNotification", data)
        })

        socket.on("disconnect", () => {
            console.log("A user disconnected")
        })
    })
} 
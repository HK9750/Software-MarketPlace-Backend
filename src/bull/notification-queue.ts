import { Queue } from "bullmq";
import { createClient } from "../lib/redis-client";

const connection = createClient();


export const notificationQueue = new Queue("notifications", { connection });

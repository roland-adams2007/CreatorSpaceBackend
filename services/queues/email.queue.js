const { Queue } = require("bullmq");
const { redis } = require("./../../config/config.inc");

const emailQueue = new Queue("emailQueue", {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 200,
    removeOnFail: 200,
  },
});

module.exports = emailQueue;

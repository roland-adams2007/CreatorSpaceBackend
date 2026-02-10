const { Worker } = require("bullmq");
const { redis } = require("../../config/config.inc");
const emailServices = require("../emails/auth-email.service");

const worker = new Worker(
  "emailQueue",
  async (job) => {
    const { type, payload } = job.data;
    if (type === "VERIFY_EMAIL") {
      await emailServices.sendVerificationEmail(payload);
      return true;
    }
    if (type === "NOTIFY_USER") {
      await emailServices.sendLoginNotificationEmail(payload);
      return true;
    }
    throw new Error(`Unknown email job type: ${type}`);
  },
  { connection: redis },
);

worker.on("completed", (job) =>
  console.log(`✅ Email job completed: ${job.id}`),
);

worker.on("failed", (job, err) =>
  console.error(`❌ Email job failed: ${job?.id} ${job}`, err.message),
);

console.log("👷 Email worker running...");

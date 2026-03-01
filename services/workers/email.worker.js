const { Worker } = require("bullmq");
const { redis } = require("../../config/config.inc");
const authEmailServices = require("../emails/auth-email.service");
const teamEmailServices = require("../emails/team-email.service");

const worker = new Worker(
  "emailQueue",
  async (job) => {
    const { type, payload } = job.data;

    if (type === "VERIFY_EMAIL") {
      await authEmailServices.sendVerificationEmail(payload);
      return true;
    }

    if (type === "NOTIFY_USER") {
      await authEmailServices.sendLoginNotificationEmail(payload);
      return true;
    }

    if (type === "ADD_TO_TEAM") {
      await teamEmailServices.sendTeamInviteEmail(payload);
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
  console.error(`❌ Email job failed: ${job?.id}`, err.message),
);

console.log("👷 Email worker running...");

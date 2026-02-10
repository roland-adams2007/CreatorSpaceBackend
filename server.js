const express = require("express");
const path = require("path");
const { errorHandler } = require("./middleware/responseHandler");
const runMigrations = require("./database/createTable");
const security = require("./middleware/security");
const cors = require("cors");
const { system } = require("./config/config.inc");

const port = system.PORT;

var app = express();

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
    exposedHeaders: ["x-access-token"],
  }),
);

app.use(security);
app.use("/public", express.static(path.join(__dirname, "public")));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

(async () => {
  try {
    await runMigrations();
  } catch (err) {
    process.exit(1);
  }
})();

app.use("/users", require("./routes/user.route"));
app.use("/websites", require("./routes/website.route"));

app.use((req, res, next) => {
  return res.status(404).json({
    status: 404,
    message: "API route not found",
  });
});

app.use(errorHandler);

app.listen(port, function () {
  console.log(`Server running on port ${port}`);
});

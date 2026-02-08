const express = require("express");
const validateTokenHandler = require("../middleware/validateTokenHandler");
const {
  loginUser,
  regUser,
  currentUser,
  verifyUser,
  sendVerifyEmail,
  userCompanyCheck,
} = require("../controllers/user.controller");

const router = express.Router();

router.post("/login", loginUser);
router.post("/register", regUser);
router.post("/verify", verifyUser);
router.post("/send-verify-email", sendVerifyEmail);

router.get("/me", validateTokenHandler, currentUser);
router.get("/company-check", validateTokenHandler, userCompanyCheck);

module.exports = router;

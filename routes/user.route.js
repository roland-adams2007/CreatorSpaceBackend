const express = require("express");
const validateTokenHandler = require("../middleware/validateTokenHandler");
const {
  loginUser,
  regUser,
  currentUser,
  verifyUser,
  userCompanyCheck,
  updateProfile,
} = require("../controllers/user.controller");

const router = express.Router();

router.post("/login", loginUser);
router.post("/register", regUser);
router.post("/verify", verifyUser);

router.get("/me", validateTokenHandler, currentUser);
router.get("/company-check", validateTokenHandler, userCompanyCheck);
router.put("/update", validateTokenHandler, updateProfile);

module.exports = router;

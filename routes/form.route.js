const express = require("express");
const validateTokenHandler = require("../middleware/validateTokenHandler");
const { sendForm, fetchForms } = require("../controllers/form.controller");

const router = express.Router();

router.get("/", validateTokenHandler, fetchForms);
router.post("/submit", sendForm);

module.exports = router;

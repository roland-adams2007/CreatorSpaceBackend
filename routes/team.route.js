const express = require("express");
const validateTokenHandler = require("../middleware/validateTokenHandler");
const {
  sendTeamInvite,
  acceptTeamInvite,
  getTeamMembers,
  getPendingInvitations,
  removeMember,
  declineInvitation,
  fetchInvitationDetails,
} = require("../controllers/team.controller");

const router = express.Router();

router.get("/:websiteId", validateTokenHandler, getTeamMembers);
router.delete("/:memberId", validateTokenHandler, removeMember);

// Team invitations routes
router.post("/invite/send", validateTokenHandler, sendTeamInvite);
router.post("/invite/accept", validateTokenHandler, acceptTeamInvite);
router.post("/invite/decline", validateTokenHandler, declineInvitation);
router.get(
  "/:websiteId/invitations",
  validateTokenHandler,
  getPendingInvitations,
);
router.get("/invite/:token", fetchInvitationDetails);

module.exports = router;

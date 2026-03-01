const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const { responseHandler } = require("../middleware/responseHandler.js");
const User = require("../models/user.model.js");
const Website = require("../models/website.model.js");
const Team = require("../models/team.modal.js");
const { checkEmailRateLimit } = require("../utils/emailRateLimit.js");
const emailQueue = require("../services/queues/email.queue.js");
const generateToken = require("../utils/generateToken.js");
const { system } = require("../config/config.inc");

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const sendTeamInvite = asyncHandler(async function (req, res) {
  const { email, websiteId, role, expiresIn } = req.body;
  const userId = req.user.id;
  const ipAddress = req.ip;

  if (!email || !websiteId) {
    res.status(400);
    throw new Error("Email and website ID are required");
  }

  // Prevent self-invitation
  const currentUser = req.user;
  if (currentUser.email.toLowerCase() === email.toLowerCase()) {
    res.status(400);
    throw new Error("You cannot invite yourself to a team");
  }

  if (!["owner", "admin", "editor", "viewer"].includes(role)) {
    res.status(400);
    throw new Error("Invalid role specified");
  }

  const website = await Website.findById(websiteId, userId);
  if (!website) {
    res.status(404);
    throw new Error("Website not found");
  }

  // Check if user is already a team member
  const [existingMember] =
    await require("../config/config.inc").db_connection.execute(
      `SELECT id FROM website_users WHERE website_id = ? AND user_id = (SELECT id FROM users WHERE LOWER(email) = LOWER(?))`,
      [websiteId, email],
    );

  if (existingMember && existingMember.length > 0) {
    res.status(400);
    throw new Error("This user is already a member of this team");
  }

  // Check for pending invitation
  const [pendingInvite] =
    await require("../config/config.inc").db_connection.execute(
      `SELECT id FROM team_invitations WHERE website_id = ? AND email = ? AND status = 'pending' AND expires_at > NOW()`,
      [websiteId, email],
    );

  if (pendingInvite && pendingInvite.length > 0) {
    res.status(400);
    throw new Error("An invitation has already been sent to this email");
  }

  const rl = await checkEmailRateLimit(
    `${email}:ADD_TO_TEAM`,
    ipAddress,
    5,
    60,
  );

  if (!rl.allowed) {
    res.status(429);
    throw new Error("Too many invitation attempts. Please try again later.");
  }

  const rawToken = generateToken();
  const tokenHash = sha256(rawToken);

  const expiresAtUtc = new Date(
    Date.now() + (expiresIn || 24 * 60 * 60 * 1000),
  );
  const invitationId = await Team.createInvitation({
    website_id: websiteId,
    email,
    invited_by: userId,
    role,
    token_hash: tokenHash,
    expires_at: expiresAtUtc,
  });

  if (!invitationId) {
    res.status(500);
    throw new Error("Failed to create team invitation. Please try again.");
  }
  const invitationLink = `${system.APP_URL}/team/invite?token=${rawToken}`;
  await emailQueue.add("sendEmail", {
    type: "ADD_TO_TEAM",
    payload: {
      to: email,
      websiteName: website.name,
      role,
      invitationLink,
      expiresIn: expiresIn || 24 * 60 * 60 * 1000,
      token: rawToken,
      inviterName: `${currentUser.fname} ${currentUser.lname}`.trim(),
    },
  });

  responseHandler(res, { invitationId }, "Team invite sent successfully!");
});

const acceptTeamInvite = asyncHandler(async function (req, res) {
  const { token } = req.body;
  const userId = req.user.id;

  if (!token) {
    res.status(400);
    throw new Error("Invitation token is required");
  }

  const tokenHash = sha256(token);

  // Find invitation using Team model
  const invitation = await Team.findInvitationByToken(tokenHash);

  if (!invitation) {
    res.status(404);
    throw new Error("Invalid or expired invitation");
  }

  // Accept invitation using Team model
  const success = await Team.acceptInvitation(
    invitation.id,
    userId,
    invitation.invited_by,
    invitation.website_id,
    invitation.role,
  );

  if (!success) {
    res.status(500);
    throw new Error("Failed to accept invitation. Please try again.");
  }

  responseHandler(res, {}, "Successfully joined the team!");
});

const getTeamMembers = asyncHandler(async function (req, res) {
  const { websiteId } = req.params;
  const { limit = 10, offset = 0 } = req.query;

  if (!websiteId) {
    res.status(400);
    throw new Error("Website ID is required");
  }

  const result = await Team.findByWebsite(
    websiteId,
    parseInt(limit),
    parseInt(offset),
  );

  responseHandler(res, result, "Team members fetched successfully!");
});

const getPendingInvitations = asyncHandler(async function (req, res) {
  const { websiteId } = req.params;
  const { limit = 10, offset = 0 } = req.query;

  if (!websiteId) {
    res.status(400);
    throw new Error("Website ID is required");
  }

  const result = await Team.getPendingInvitations(
    websiteId,
    parseInt(limit),
    parseInt(offset),
  );

  responseHandler(res, result, "Pending invitations fetched successfully!");
});

const removeMember = asyncHandler(async function (req, res) {
  const { memberId } = req.params;

  if (!memberId) {
    res.status(400);
    throw new Error("Member ID is required");
  }

  const success = await Team.removeMember(memberId);

  if (!success) {
    res.status(500);
    throw new Error("Failed to remove team member.");
  }

  responseHandler(res, {}, "Team member removed successfully!");
});

const declineInvitation = asyncHandler(async function (req, res) {
  const { token, invitationId } = req.body;

  if (!token && !invitationId) {
    res.status(400);
    throw new Error("Either invitation token or invitation ID is required");
  }

  let invitation;

  if (token) {
    const tokenHash = sha256(token);
    invitation = await Team.findInvitationByToken(tokenHash);
  } else if (invitationId) {
    invitation = await Team.findById(invitationId);
  }

  if (!invitation) {
    res.status(404);
    throw new Error("Invalid or expired invitation");
  }

  const success = await Team.declineInvitation(invitation.id);

  if (!success) {
    res.status(500);
    throw new Error("Failed to decline invitation.");
  }

  responseHandler(res, {}, "Invitation declined successfully!");
});

const fetchInvitationDetails = asyncHandler(async function (req, res) {
  const { token } = req.params;

  if (!token) {
    res.status(400);
    throw new Error("Invitation token is required");
  }

  const tokenHash = sha256(token);
  const invitation = await Team.findInvitationByToken(tokenHash);

  if (!invitation) {
    res.status(404);
    throw new Error("Invalid or expired invitation");
  }

  const website = await Website.findById(invitation.website_id, null);
  if (!website) {
    res.status(404);
    throw new Error("Website not found");
  }

  const inviter = await User.findById(invitation.invited_by);
  const inviterName = inviter
    ? `${inviter.fname} ${inviter.lname}`.trim()
    : "A team member";

  const enrichedInvitation = {
    ...invitation,
    website_name: website.name,
    inviter_name: inviterName,
  };

  responseHandler(
    res,
    { invitation: enrichedInvitation },
    "Invitation details fetched successfully!",
  );
});

module.exports = {
  sendTeamInvite,
  acceptTeamInvite,
  getTeamMembers,
  getPendingInvitations,
  removeMember,
  declineInvitation,
  fetchInvitationDetails,
};

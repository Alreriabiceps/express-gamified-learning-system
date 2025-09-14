const express = require("express");
const router = express.Router();
const { verifyToken } = require("../../../../auth/authMiddleware");
const controller = require("../controllers/teamWeeklyTestController");

router.post("/start", verifyToken, controller.startTeamTest);
router.get("/state/:attemptId", verifyToken, controller.getState);
router.post("/:attemptId/answer", verifyToken, controller.answer);
router.post("/:attemptId/skip", verifyToken, controller.skip);

module.exports = router;


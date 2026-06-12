const express = require("express");
const router = express.Router();
const MonitoringController = require("../controller/MonitoringController");
const { uploadRecording, uploadScreenshot } = require("../middleware/uploadMiddleware");

// Auth Routes
router.post("/signup", MonitoringController.signup);
router.post("/login", MonitoringController.login);

// Monitoring Routes
router.get(
  "/activity-summary/:user_id",
  MonitoringController.getActivitySummary,
);

router.post("/add-logs", MonitoringController.addCallLog);
router.get("/call-logs/:user_id", MonitoringController.getCallLogs);

router.post("/add-messages", MonitoringController.addMessage);
router.post("/messages", MonitoringController.getMessages);

router.post(
  "/add-recordings",
  uploadRecording.single("recording_file"),
  MonitoringController.addRecording,
);
router.post("/recordings", MonitoringController.getRecordings);

router.post("/add-web-activity", MonitoringController.addWebActivity);
router.post("/web-activity", MonitoringController.getWebActivity);

router.post("/add-app-usage", MonitoringController.addAppUsage);
router.post("/app-usage", MonitoringController.getAppUsage);

router.post(
  "/add-screenshot",
  uploadScreenshot.single("screenshot_file"),
  MonitoringController.addScreenshot,
);
router.post("/screenshots", MonitoringController.getScreenshots);

router.post("/add-notification", MonitoringController.addNotification);
router.post("/notifications", MonitoringController.getNotifications);

module.exports = router;

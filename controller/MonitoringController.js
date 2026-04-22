const MonitoringModel = require("../model/MonitoringModel");
const jwt = require("jsonwebtoken");

const MonitoringController = {
  // User Authentication
  async signup(req, res) {
    try {
      const result = await MonitoringModel.createUser(req.body);
      res.status(201).json({
        success: true,
        message: "User created successfully",
        user_id: result.insertId,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async login(req, res) {
    try {
      const { mobile_number, password } = req.body;
      const user = await MonitoringModel.getUserByMobileNumber(mobile_number);
      if (!user || user.password_hash !== password) {
        // Note: In production use bcrypt for password hashing
        return res.status(401).json({
          success: false,
          message: "Invalid phone number or password",
        });
      }
      const token = jwt.sign(
        { user_id: user.user_id },
        process.env.JWT_SECRET || "secret",
        { expiresIn: "24h" },
      );
      res.status(200).json({
        success: true,
        token,
        user_id: user.user_id,
        full_name: user.full_name,
        mobile_number: user.mobile_number,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get Activity Summary
  async getActivitySummary(req, res) {
    try {
      const { user_id } = req.params;
      const summary = await MonitoringModel.getActivitySummary(user_id);
      res.status(200).json({ success: true, data: summary });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Add Call Log
  async addCallLog(req, res) {
    try {
      const result = await MonitoringModel.addCallLog(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get Call Logs
  async getCallLogs(req, res) {
    try {
      const { user_id } = req.params;
      const logs = await MonitoringModel.getCallLogs(user_id);
      res.status(200).json({ success: true, data: logs });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Add Message
  async addMessage(req, res) {
    try {
      const result = await MonitoringModel.addMessage(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get Messages (Input Intelligence)
  async getMessages(req, res) {
    try {
      const { user_id, search } = req.body;
      const messages = await MonitoringModel.getMessages(user_id, search);
      res.status(200).json({ success: true, data: messages });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Add Recording
  async addRecording(req, res) {
    try {
      const recordingData = req.body;
      if (req.file) {
        // Store the relative URL to the file
        recordingData.file_url = `/uploads/recordings/${req.file.filename}`;
      }
      const result = await MonitoringModel.addRecording(recordingData);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get Recordings
  async getRecordings(req, res) {
    try {
      const { user_id, source_type, search } = req.body;
      const recordings = await MonitoringModel.getRecordings(
        user_id,
        source_type,
        search,
      );
      res.status(200).json({ success: true, data: recordings });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Add Web Activity
  async addWebActivity(req, res) {
    try {
      const result = await MonitoringModel.addWebActivity(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get Web Activity
  async getWebActivity(req, res) {
    try {
      const { user_id, search } = req.body;
      const activity = await MonitoringModel.getWebActivity(user_id, search);
      res.status(200).json({ success: true, data: activity });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Add App Usage
  async addAppUsage(req, res) {
    try {
      const result = await MonitoringModel.addAppUsage(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get App Usage
  async getAppUsage(req, res) {
    try {
      const { user_id, start_date, end_date } = req.body;
      const usage = await MonitoringModel.getAppUsage(
        user_id,
        start_date,
        end_date,
      );
      res.status(200).json({ success: true, data: usage });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};

module.exports = MonitoringController;

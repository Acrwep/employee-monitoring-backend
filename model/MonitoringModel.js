const pool = require("../config/dbconfig");

const MonitoringModel = {
  // 1. User Profile
  async createUser(userData) {
    try {
      const { full_name, email, mobile_number, password_hash } = userData;
      const [result] = await pool.execute(
        `INSERT INTO users (full_name, email, mobile_number, password_hash) VALUES (?, ?, ?, ?)`,
        [full_name, email, mobile_number, password_hash],
      );
      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  async getUserByMobileNumber(mobile_number) {
    try {
      const [rows] = await pool.execute(
        `SELECT user_id, full_name, mobile_number, password_hash FROM users WHERE mobile_number = ?`,
        [mobile_number],
      );
      return rows[0];
    } catch (error) {
      throw new Error(error.message);
    }
  },

  // 2. Call Logs
  async addCallLog(callData) {
    try {
      const {
        user_id,
        contact_name,
        phone_number,
        call_type,
        call_time,
        duration,
        source_app,
      } = callData;
      const [result] = await pool.query(
        `INSERT INTO call_logs (user_id, contact_name, phone_number, call_type, call_time, duration, source_app) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          user_id,
          contact_name,
          phone_number,
          call_type,
          call_time,
          duration,
          source_app,
        ],
      );
      await this.updateActivitySummary(user_id, "calls");
      return result.affectedRows;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  async getCallLogs(user_id) {
    try {
      const [rows] = await pool.query(
        `SELECT
            cl.call_id,
            cl.user_id,
            u.full_name,
            cl.contact_name,
            cl.phone_number,
            cl.call_type,
            cl.call_time,
            cl.duration,
            cl.source_app
        FROM
            call_logs AS cl
        INNER JOIN users AS u ON
            cl.user_id = u.user_id
        WHERE cl.user_id = ?`,
        [user_id],
      );
      return rows;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  // 3. Messages (Input Intelligence)
  async addMessage(messageData) {
    try {
      const {
        user_id,
        sender_id,
        message_body,
        time_periode,
        is_read,
        attachment_url,
      } = messageData;
      const [result] = await pool.query(
        `INSERT INTO messages (user_id, sender_id, message_body, time_periode, is_read, attachment_url) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          user_id,
          sender_id,
          message_body,
          time_periode,
          is_read || false,
          attachment_url,
        ],
      );
      await this.updateActivitySummary(user_id, "messages");
      return result.affectedRows;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  async getMessages(user_id, search) {
    try {
      let query = `SELECT
            m.message_id,
            m.user_id,
            u.full_name,
            m.sender_id,
            m.message_body,
            m.time_periode,
            m.is_read,
            m.attachment_url
        FROM
            messages AS m
        INNER JOIN users AS u ON
            m.user_id = u.user_id
        WHERE m.user_id = ?`;
      let params = [user_id];
      if (search) {
        query += ` AND (m.message_body LIKE ? OR m.sender_id LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
      }
      query += ` ORDER BY m.time_periode DESC`;
      const [rows] = await pool.query(query, params);
      return rows;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  // 4. Recordings
  async addRecording(recordingData) {
    try {
      const {
        user_id,
        contact_name,
        phone_number,
        time_periode,
        duration,
        is_encrypted,
        source_type,
        file_url,
        playback_position,
      } = recordingData;

      const [result] = await pool.query(
        `INSERT INTO recordings (user_id, contact_name, phone_number, time_periode, duration, is_encrypted, source_type, file_url, playback_position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user_id,
          contact_name,
          phone_number,
          time_periode,
          duration,
          is_encrypted,
          source_type,
          file_url,
          playback_position,
        ],
      );
      return result.affectedRows;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  async getRecordings(user_id, source_type = null, search = "") {
    try {
      let query = `SELECT
            r.recording_id,
            r.user_id,
            u.full_name,
            r.contact_name,
            r.phone_number,
            r.time_periode,
            r.duration,
            r.is_encrypted,
            r.source_type,
            r.file_url,
            r.playback_position
        FROM
            recordings AS r
        INNER JOIN users AS u ON
            r.user_id = u.user_id
        WHERE r.user_id = ?`;
      let params = [user_id];
      if (source_type && source_type !== "All") {
        query += ` AND source_type = ?`;
        params.push(source_type);
      }
      if (search) {
        query += ` AND (contact_name LIKE ? OR phone_number LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
      }
      query += ` ORDER BY time_periode DESC`;
      const [rows] = await pool.query(query, params);
      return rows;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  // 5. Web Activity
  async addWebActivity(activityData) {
    try {
      const {
        user_id,
        website_name,
        website_icon,
        visit_time,
        duration_spent,
      } = activityData;
      const [result] = await pool.query(
        `INSERT INTO web_activity (user_id, website_name, website_icon, visit_time, duration_spent) VALUES (?, ?, ?, ?, ?)`,
        [user_id, website_name, website_icon, visit_time, duration_spent],
      );
      await this.updateActivitySummary(user_id, "events");
      return result.affectedRows;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  async getWebActivity(user_id, search = "") {
    try {
      let query = `SELECT
            wa.activity_id,
            wa.user_id,
            u.full_name,
            wa.website_name,
            wa.website_icon,
            wa.visit_time,
            wa.duration_spent
        FROM
            web_activity AS wa
        INNER JOIN users AS u ON
            wa.user_id = u.user_id
        WHERE wa.user_id = ?`;
      let params = [user_id];
      if (search) {
        query += ` AND website_name LIKE ?`;
        params.push(`%${search}%`);
      }
      query += ` ORDER BY visit_time DESC`;
      const [rows] = await pool.query(query, params);
      return rows;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  // 6. Activity Summary
  async updateActivitySummary(user_id, type) {
    try {
      let field = "";
      if (type === "calls") field = "total_calls";
      else if (type === "messages") field = "total_messages";
      else if (type === "events") field = "total_events";

      if (field) {
        await pool.query(
          `INSERT INTO activity_summary (user_id, ${field}) VALUES (?, 1) ON DUPLICATE KEY UPDATE ${field} = ${field} + 1`,
          [user_id],
        );
      }
    } catch (error) {
      throw new Error(error.message);
    }
  },

  async getActivitySummary(user_id) {
    try {
      const [rows] = await pool.query(
        `SELECT
            s.summary_id,
            s.user_id,
            u.full_name,
            s.total_calls,
            s.total_messages,
            s.total_events,
            s.active_alerts,
            s.last_updated
        FROM
            activity_summary AS s
        INNER JOIN users AS u ON
            s.user_id = u.user_id
        WHERE s.user_id = ?`,
        [user_id],
      );
      return rows[0];
    } catch (error) {
      throw new Error(error.message);
    }
  },

  // 7. App Usage
  async addAppUsage(usageData) {
    try {
      const { user_id, package_name, app_name, usage_duration, date_periode } =
        usageData;
      const [result] = await pool.query(
        `INSERT INTO app_usage (user_id, package_name, app_name, usage_duration, date_periode) VALUES (?, ?, ?, ?, ?)`,
        [user_id, package_name, app_name, usage_duration, date_periode],
      );
      return result.affectedRows;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  async getAppUsage(user_id, start_date, end_date) {
    try {
      const params = [];
      let query = `SELECT
            au.usage_id,
            au.user_id,
            u.full_name,
            au.package_name,
            au.app_name,
            au.usage_duration,
            au.date_periode
        FROM app_usage AS au
        INNER JOIN users AS u ON
          au.user_id = u.user_id
        WHERE au.user_id = ?`;

      params.push(user_id);

      if (start_date && end_date) {
        query += ` AND au.date_periode BETWEEN ? AND ?`;
        params.push(start_date, end_date);
      }

      query += ` ORDER BY au.date_periode DESC`;
      const [rows] = await pool.query(query, params);
      return rows;
    } catch (error) {
      throw new Error(error.message);
    }
  },
};

module.exports = MonitoringModel;

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

  async getCallLogs(user_id, page, limit, search) {
    try {
      let query = "";
      const params = [];
      let countQuery =
        "SELECT COUNT(*) AS total FROM call_logs WHERE user_id = ?";
      const countParams = [user_id];

      const pageNumber = parseInt(page, 10) || 1;
      const limitNumber = parseInt(limit, 10) || 10;
      const offset = (pageNumber - 1) * limitNumber;

      query += `SELECT
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
        WHERE 1 = 1`;

      if (search) {
        query += ` AND (contact_name LIKE ? OR phone_number LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
        countQuery += ` AND (contact_name LIKE ? OR phone_number LIKE ?)`;
        countParams.push(`%${search}%`, `%${search}%`);
      }

      query += ` ORDER BY call_time DESC`;
      query += ` LIMIT ? OFFSET ?`;
      params.push(limitNumber, offset);
      const [rows] = await pool.query(query, params);
      const [getCount] = await pool.query(countQuery, countParams);

      const total = getCount[0]?.total || 0;

      return {
        data: rows,
        pagination: {
          total: parseInt(total),
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(total / limitNumber),
        },
      };
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

  async getMessages(user_id, search, page, limit) {
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
      let countQuery =
        "SELECT COUNT(*) AS total FROM messages WHERE user_id = ?";
      let countParams = [user_id];

      const pageNumber = parseInt(page, 10) || 1;
      const limitNumber = parseInt(limit, 10) || 10;
      const offset = (pageNumber - 1) * limitNumber;
      if (search) {
        query += ` AND (m.message_body LIKE ? OR m.sender_id LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
        countQuery += ` AND (m.message_body LIKE ? OR m.sender_id LIKE ?)`;
        countParams.push(`%${search}%`, `%${search}%`);
      }
      query += ` ORDER BY m.time_periode DESC`;
      query += ` LIMIT ? OFFSET ?`;
      params.push(limitNumber, offset);
      const [rows] = await pool.query(query, params);
      const [getCount] = await pool.query(countQuery, countParams);

      const total = getCount[0]?.total || 0;

      return {
        data: rows,
        pagination: {
          total: parseInt(total),
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(total / limitNumber),
        },
      };
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

  async getRecordings(user_id, source_type = null, search = "", page, limit) {
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

      let countQuery =
        "SELECT COUNT(*) AS total FROM recordings WHERE user_id = ?";
      let countParams = [user_id];

      const pageNumber = parseInt(page, 10) || 1;
      const limitNumber = parseInt(limit, 10) || 10;
      const offset = (pageNumber - 1) * limitNumber;
      if (source_type && source_type !== "All") {
        query += ` AND source_type = ?`;
        params.push(source_type);

        countQuery += ` AND source_type = ?`;
        countParams.push(source_type);
      }
      if (search) {
        query += ` AND (contact_name LIKE ? OR phone_number LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);

        countQuery += ` AND (contact_name LIKE ? OR phone_number LIKE ?)`;
        countParams.push(`%${search}%`, `%${search}%`);
      }
      query += ` ORDER BY time_periode DESC`;
      query += ` LIMIT ? OFFSET ?`;
      params.push(limitNumber, offset);
      const [rows] = await pool.query(query, params);
      const [getCount] = await pool.query(countQuery, countParams);

      const total = getCount[0]?.total || 0;

      return {
        data: rows,
        pagination: {
          total: parseInt(total),
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(total / limitNumber),
        },
      };
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

  async getWebActivity(user_id, search = "", page, limit) {
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
      let countQuery =
        "SELECT COUNT(*) AS total FROM web_activity WHERE user_id = ?";
      let countParams = [user_id];

      const pageNumber = parseInt(page, 10) || 1;
      const limitNumber = parseInt(limit, 10) || 10;
      const offset = (pageNumber - 1) * limitNumber;
      if (search) {
        query += ` AND website_name LIKE ?`;
        params.push(`%${search}%`);

        countQuery += ` AND website_name LIKE ?`;
        countParams.push(`%${search}%`);
      }
      query += ` ORDER BY visit_time DESC`;
      query += ` LIMIT ? OFFSET ?`;
      params.push(limitNumber, offset);
      const [rows] = await pool.query(query, params);
      const [getCount] = await pool.query(countQuery, countParams);

      const total = getCount[0]?.total || 0;

      return {
        data: rows,
        pagination: {
          total: parseInt(total),
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(total / limitNumber),
        },
      };
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

  async getAppUsage(user_id, start_date, end_date, page, limit) {
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

      let countQuery =
        "SELECT COUNT(*) AS total FROM app_usage WHERE user_id = ?";
      let countParams = [user_id];

      const pageNumber = parseInt(page, 10) || 1;
      const limitNumber = parseInt(limit, 10) || 10;
      const offset = (pageNumber - 1) * limitNumber;
      query += ` ORDER BY au.date_periode DESC`;
      query += ` LIMIT ? OFFSET ?`;
      params.push(limitNumber, offset);
      const [rows] = await pool.query(query, params);
      const [getCount] = await pool.query(countQuery, countParams);

      const total = getCount[0]?.total || 0;

      return {
        data: rows,
        pagination: {
          total: parseInt(total),
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(total / limitNumber),
        },
      };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  // 8. Screenshots
  async addScreenshot(screenshotData) {
    try {
      const { user_id, file_url, capture_time } = screenshotData;
      const [result] = await pool.query(
        `INSERT INTO screenshots (user_id, file_url, capture_time) VALUES (?, ?, ?)`,
        [user_id, file_url, capture_time],
      );
      return result.affectedRows;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  async getScreenshots(user_id, start_date, end_date, page, limit) {
    try {
      const params = [user_id];
      let query = `SELECT
            s.screenshot_id,
            s.user_id,
            u.full_name,
            s.file_url,
            s.capture_time
        FROM screenshots AS s
        INNER JOIN users AS u ON
          s.user_id = u.user_id
        WHERE s.user_id = ?`;

      if (start_date && end_date) {
        query += ` AND s.capture_time BETWEEN ? AND ?`;
        params.push(start_date, end_date);
      }

      let countQuery =
        "SELECT COUNT(*) AS total FROM screenshots WHERE user_id = ?";
      let countParams = [user_id];

      const pageNumber = parseInt(page, 10) || 1;
      const limitNumber = parseInt(limit, 10) || 10;
      const offset = (pageNumber - 1) * limitNumber;

      query += ` ORDER BY s.capture_time DESC`;
      query += ` LIMIT ? OFFSET ?`;
      params.push(limitNumber, offset);
      const [rows] = await pool.query(query, params);
      const [getCount] = await pool.query(countQuery, countParams);

      const total = getCount[0]?.total || 0;

      return {
        data: rows,
        pagination: {
          total: parseInt(total),
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(total / limitNumber),
        },
      };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  // 9. Notifications
  async addNotification(notificationData) {
    try {
      const {
        user_id,
        package_name,
        app_name,
        title,
        text_content,
        post_time,
      } = notificationData;
      const [result] = await pool.query(
        `INSERT INTO notifications (user_id, package_name, app_name, title, text_content, post_time) VALUES (?, ?, ?, ?, ?, ?)`,
        [user_id, package_name, app_name, title, text_content, post_time],
      );
      await this.updateActivitySummary(user_id, "events");
      return result.affectedRows;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  async getNotifications(user_id, search = "", page, limit) {
    try {
      let query = `SELECT
            n.notification_id,
            n.user_id,
            u.full_name,
            n.package_name,
            n.app_name,
            n.title,
            n.text_content,
            n.post_time
        FROM notifications AS n
        INNER JOIN users AS u ON
          n.user_id = u.user_id
        WHERE n.user_id = ?`;
      let params = [user_id];
      let countQuery =
        "SELECT COUNT(*) AS total FROM notifications WHERE user_id = ?";
      let countParams = [user_id];

      const pageNumber = parseInt(page, 10) || 1;
      const limitNumber = parseInt(limit, 10) || 10;
      const offset = (pageNumber - 1) * limitNumber;
      if (search) {
        query += ` AND (n.title LIKE ? OR n.text_content LIKE ? OR n.app_name LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);

        countQuery += ` AND (n.title LIKE ? OR n.text_content LIKE ? OR n.app_name LIKE ?)`;
        countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      query += ` ORDER BY n.post_time DESC`;
      query += ` LIMIT ? OFFSET ?`;
      params.push(limitNumber, offset);
      const [rows] = await pool.query(query, params);
      const [getCount] = await pool.query(countQuery, countParams);

      const total = getCount[0]?.total || 0;

      return {
        data: rows,
        pagination: {
          total: parseInt(total),
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(total / limitNumber),
        },
      };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  // 10. WhatsApp Chat Logs
  async addWhatsappChatLog(chatData) {
    try {
      const { user_id, diraction, contact_name, message, created_at } =
        chatData;
      const [result] = await pool.query(
        `INSERT INTO whatsapp_chat_logs (user_id, diraction, contact_name, message, created_at) VALUES (?, ?, ?, ?, ?)`,
        [user_id, diraction, contact_name, message, created_at || new Date()],
      );
      return result.affectedRows;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  async getWhatsappChatLogs(user_id, search = "", page, limit) {
    try {
      let query = `SELECT
            wcl.id,
            wcl.user_id,
            u.full_name,
            wcl.diraction,
            wcl.contact_name,
            wcl.message,
            wcl.created_at
        FROM whatsapp_chat_logs AS wcl
        INNER JOIN users AS u ON
          wcl.user_id = u.user_id
        WHERE wcl.user_id = ?`;
      let params = [user_id];
      let countQuery =
        "SELECT COUNT(*) AS total FROM whatsapp_chat_logs WHERE user_id = ?";
      let countParams = [user_id];

      const pageNumber = parseInt(page, 10) || 1;
      const limitNumber = parseInt(limit, 10) || 10;
      const offset = (pageNumber - 1) * limitNumber;

      if (search) {
        query += ` AND (wcl.contact_name LIKE ? OR wcl.message LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);

        countQuery += ` AND (wcl.contact_name LIKE ? OR wcl.message LIKE ?)`;
        countParams.push(`%${search}%`, `%${search}%`);
      }
      query += ` ORDER BY wcl.created_at DESC`;
      query += ` LIMIT ? OFFSET ?`;
      params.push(limitNumber, offset);
      const [rows] = await pool.query(query, params);
      const [getCount] = await pool.query(countQuery, countParams);

      const total = getCount[0]?.total || 0;

      return {
        data: rows,
        pagination: {
          total: parseInt(total),
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(total / limitNumber),
        },
      };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  // 11. WhatsApp Call Logs
  async addWhatsappCallLog(callData) {
    try {
      const {
        user_id,
        diraction,
        contact_name,
        call_type,
        duration,
        created_at,
      } = callData;
      const [result] = await pool.query(
        `INSERT INTO whatsapp_call_logs (user_id, diraction, contact_name, call_type, duration, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          user_id,
          diraction,
          contact_name,
          call_type,
          duration || 0,
          created_at || new Date(),
        ],
      );
      return result.affectedRows;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  async getWhatsappCallLogs(user_id, search = "", page, limit) {
    try {
      let query = `SELECT
            wcl.id,
            wcl.user_id,
            u.full_name,
            wcl.diraction,
            wcl.contact_name,
            wcl.call_type,
            wcl.duration,
            wcl.created_at
        FROM whatsapp_call_logs AS wcl
        INNER JOIN users AS u ON
          wcl.user_id = u.user_id
        WHERE wcl.user_id = ?`;
      let params = [user_id];
      let countQuery =
        "SELECT COUNT(*) AS total FROM whatsapp_call_logs WHERE user_id = ?";
      let countParams = [user_id];

      const pageNumber = parseInt(page, 10) || 1;
      const limitNumber = parseInt(limit, 10) || 10;
      const offset = (pageNumber - 1) * limitNumber;

      if (search) {
        query += ` AND wcl.contact_name LIKE ?`;
        params.push(`%${search}%`);

        countQuery += ` AND wcl.contact_name LIKE ?`;
        countParams.push(`%${search}%`);
      }
      query += ` ORDER BY wcl.created_at DESC`;
      query += ` LIMIT ? OFFSET ?`;
      params.push(limitNumber, offset);
      const [rows] = await pool.query(query, params);
      const [getCount] = await pool.query(countQuery, countParams);

      const total = getCount[0]?.total || 0;

      return {
        data: rows,
        pagination: {
          total: parseInt(total),
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(total / limitNumber),
        },
      };
    } catch (error) {
      throw new Error(error.message);
    }
  },
};

module.exports = MonitoringModel;

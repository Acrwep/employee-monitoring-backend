const pool = require("../config/dbconfig");

const DashboardModel = {
  getCategory: async () => {
    try {
      const query = `SELECT id, name FROM category WHERE is_active = 1`;
      const [result] = await pool.query(query);
      return result;
    } catch (error) {
      throw error;
    }
  },

  getCategoryById: async (id) => {
    try {
      const query = `SELECT id, name FROM category WHERE id = ? AND is_active = 1`;
      const [result] = await pool.query(query, [id]);
      return result;
    } catch (error) {
      throw error;
    }
  },

  addCategory: async (data) => {
    try {
      const query = `INSERT INTO category (name) VALUES (?)`;
      const [result] = await pool.query(query, [data.name]);
      return result.affectedRows;
    } catch (error) {
      throw error;
    }
  },

  updateCategory: async (id, data) => {
    try {
      const query = `UPDATE category SET name = ? WHERE id = ? AND is_active = 1`;
      const [result] = await pool.query(query, [data.name, id]);
      return result.affectedRows;
    } catch (error) {
      throw error;
    }
  },

  deleteCategory: async (id) => {
    try {
      const query = `UPDATE category SET is_active = 0 WHERE id = ?`;
      const [result] = await pool.query(query, [id]);
      return result.affectedRows;
    } catch (error) {
      throw error;
    }
  },

  getDashboardSummary: async (filters) => {
    const { branch_id, user_id, start_date, end_date } = filters;

    try {
      let userSql = `SELECT user_id, full_name as name FROM users WHERE 1=1`;
      const userParams = [];

      if (branch_id) {
        userSql += ` AND category_id = ?`;
        userParams.push(branch_id);
      }
      if (user_id) {
        userSql += ` AND user_id = ?`;
        userParams.push(user_id);
      }

      const [users] = await pool.query(userSql, userParams);

      if (users.length === 0) {
        return [];
      }

      const userIds = users.map((u) => u.user_id);

      let dateFilterCallLogs = "";
      let dateFilterMessages = "";
      let dateFilterWaCalls = "";
      let dateFilterWaChats = "";
      let dateParams = [];

      if (start_date && end_date) {
        dateFilterCallLogs = ` AND call_time >= ? AND call_time < DATE_ADD(?, INTERVAL 1 DAY)`;
        dateFilterMessages = ` AND time_periode >= ? AND time_periode < DATE_ADD(?, INTERVAL 1 DAY)`;
        dateFilterWaCalls = ` AND created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)`;
        dateFilterWaChats = ` AND created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)`;
        dateParams = [start_date, end_date];
      }

      const phoneCallsSql = `
        SELECT user_id, 
          COUNT(call_id) as total_calls,
          SUM(CASE WHEN LOWER(call_type) = 'outgoing' THEN 1 ELSE 0 END) as outgoing,
          SUM(CASE WHEN LOWER(call_type) = 'incoming' THEN 1 ELSE 0 END) as incoming,
          SUM(CASE WHEN LOWER(call_type) = 'missed' THEN 1 ELSE 0 END) as missed,
          SUM(duration) as total_duration,
          MAX(call_time) as last_sync
        FROM call_logs
        WHERE user_id IN (?) ${dateFilterCallLogs}
        GROUP BY user_id
      `;

      const messagesSql = `
        SELECT user_id, 
          COUNT(message_id) as chats_sms,
          MAX(time_periode) as last_sync
        FROM messages
        WHERE user_id IN (?) ${dateFilterMessages}
        GROUP BY user_id
      `;

      const waCallsSql = `
        SELECT user_id, 
          COUNT(id) as total_calls,
          SUM(CASE WHEN LOWER(diraction) = 'outgoing' THEN 1 ELSE 0 END) as outgoing,
          SUM(CASE WHEN LOWER(diraction) = 'incoming' THEN 1 ELSE 0 END) as incoming,
          SUM(CASE WHEN LOWER(diraction) = 'missed' THEN 1 ELSE 0 END) as missed,
          SUM(duration) as total_duration,
          MAX(created_at) as last_sync
        FROM whatsapp_call_logs
        WHERE user_id IN (?) ${dateFilterWaCalls}
        GROUP BY user_id
      `;

      const waChatsSql = `
        SELECT user_id, 
          COUNT(id) as chats_sms,
          MAX(created_at) as last_sync
        FROM whatsapp_chat_logs
        WHERE user_id IN (?) ${dateFilterWaChats}
        GROUP BY user_id
      `;

      // Execute all queries concurrently for optimization
      const [[phoneCalls], [phoneMessages], [waCalls], [waChats]] =
        await Promise.all([
          pool.query(phoneCallsSql, [userIds, ...dateParams]),
          pool.query(messagesSql, [userIds, ...dateParams]),
          pool.query(waCallsSql, [userIds, ...dateParams]),
          pool.query(waChatsSql, [userIds, ...dateParams]),
        ]);

      const formatDuration = (seconds) => {
        if (!seconds || isNaN(seconds)) return "00:00:00";
        const h = Math.floor(seconds / 3600)
          .toString()
          .padStart(2, "0");
        const m = Math.floor((seconds % 3600) / 60)
          .toString()
          .padStart(2, "0");
        const s = Math.floor(seconds % 60)
          .toString()
          .padStart(2, "0");
        return `${h}:${m}:${s}`;
      };

      // Create Maps for O(1) lookups instead of O(N) array finds
      const pCallsMap = new Map(phoneCalls.map((p) => [String(p.user_id), p]));
      const pMsgsMap = new Map(
        phoneMessages.map((p) => [String(p.user_id), p]),
      );
      const wCallsMap = new Map(waCalls.map((w) => [String(w.user_id), w]));
      const wChatsMap = new Map(waChats.map((w) => [String(w.user_id), w]));

      const results = users.map((user) => {
        const userIdStr = String(user.user_id);
        const pCalls = pCallsMap.get(userIdStr) || {};
        const pMsgs = pMsgsMap.get(userIdStr) || {};
        const wCalls = wCallsMap.get(userIdStr) || {};
        const wChats = wChatsMap.get(userIdStr) || {};

        const getMaxDate = (d1, d2) => {
          if (!d1) return d2;
          if (!d2) return d1;
          return new Date(d1) > new Date(d2) ? d1 : d2;
        };

        return {
          user_id: user.user_id,
          name: user.name,
          device_monitoring_summary: [
            {
              platform: "Phone Call",
              total_calls: pCalls.total_calls || 0,
              outgoing: pCalls.outgoing || 0,
              incoming: pCalls.incoming || 0,
              missed: pCalls.missed || 0,
              total_duration: formatDuration(pCalls.total_duration || 0),
              chats_sms: pMsgs.chats_sms || "--",
              last_sync: getMaxDate(pCalls.last_sync, pMsgs.last_sync) || "--",
            },
            {
              platform: "WhatsApp",
              total_calls: wCalls.total_calls || 0,
              outgoing: wCalls.outgoing || 0,
              incoming: wCalls.incoming || 0,
              missed: wCalls.missed || 0,
              total_duration: formatDuration(wCalls.total_duration || 0),
              chats_sms: wChats.chats_sms || 0,
              last_sync: getMaxDate(wCalls.last_sync, wChats.last_sync) || "--",
            },
          ],
        };
      });

      return results;
    } catch (error) {
      throw error;
    }
  },
};

module.exports = DashboardModel;

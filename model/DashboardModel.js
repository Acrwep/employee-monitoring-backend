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
    const { branch_id, category_id, user_id, start_date, end_date, manager_id } = filters;
    const activeBranchId = branch_id || category_id;

    try {
      if (filters.group_by === 'branch') {
        const branchSql = `SELECT id as branch_id, name FROM category WHERE is_active = 1`;
        const [branches] = await pool.query(branchSql);

        if (branches.length === 0) return [];

        const branchIds = branches.map(b => b.branch_id);

        let branchDateFilterCallLogs = "";
        let branchDateFilterMessages = "";
        let branchDateFilterWaCalls = "";
        let branchDateFilterWaChats = "";
        let dateParams = [];

        if (start_date && end_date) {
          branchDateFilterCallLogs = ` AND c.call_time >= ? AND c.call_time < DATE_ADD(?, INTERVAL 1 DAY)`;
          branchDateFilterMessages = ` AND m.time_periode >= ? AND m.time_periode < DATE_ADD(?, INTERVAL 1 DAY)`;
          branchDateFilterWaCalls = ` AND w.created_at >= ? AND w.created_at < DATE_ADD(?, INTERVAL 1 DAY)`;
          branchDateFilterWaChats = ` AND w.created_at >= ? AND w.created_at < DATE_ADD(?, INTERVAL 1 DAY)`;
          dateParams = [start_date, end_date];
        }

        let managerJoin = "";
        let managerWhere = "";
        let managerParams = [];
        if (manager_id) {
          managerJoin = " JOIN assign_manager am ON u.user_id = am.user_id ";
          managerWhere = " AND am.manager_id = ? ";
          managerParams.push(manager_id);
        }

        const phoneCallsSql = `
          SELECT u.category_id as branch_id, 
            COUNT(c.call_id) as total_calls,
            SUM(CASE WHEN LOWER(c.call_type) = 'outgoing' THEN 1 ELSE 0 END) as outgoing,
            SUM(CASE WHEN LOWER(c.call_type) = 'incoming' THEN 1 ELSE 0 END) as incoming,
            SUM(CASE WHEN LOWER(c.call_type) = 'missed' THEN 1 ELSE 0 END) as missed,
            SUM(c.duration) as total_duration,
            COUNT(DISTINCT c.user_id) as sync_count
          FROM call_logs c
          JOIN users u ON c.user_id = u.user_id
          ${managerJoin}
          WHERE u.category_id IN (?) ${branchDateFilterCallLogs} ${managerWhere}
          GROUP BY u.category_id
        `;

        const messagesSql = `
          SELECT u.category_id as branch_id, 
            COUNT(m.message_id) as chats_sms,
            COUNT(DISTINCT m.user_id) as sync_count
          FROM messages m
          JOIN users u ON m.user_id = u.user_id
          ${managerJoin}
          WHERE u.category_id IN (?) ${branchDateFilterMessages} ${managerWhere}
          GROUP BY u.category_id
        `;

        const waCallsSql = `
          SELECT u.category_id as branch_id, 
            COUNT(w.id) as total_calls,
            SUM(CASE WHEN LOWER(w.diraction) = 'outgoing' THEN 1 ELSE 0 END) as outgoing,
            SUM(CASE WHEN LOWER(w.diraction) = 'incoming' THEN 1 ELSE 0 END) as incoming,
            SUM(CASE WHEN LOWER(w.diraction) = 'missed' THEN 1 ELSE 0 END) as missed,
            SUM(w.duration) as total_duration,
            COUNT(DISTINCT w.user_id) as sync_count
          FROM whatsapp_call_logs w
          JOIN users u ON w.user_id = u.user_id
          ${managerJoin}
          WHERE u.category_id IN (?) ${branchDateFilterWaCalls} ${managerWhere}
          GROUP BY u.category_id
        `;

        const waChatsSql = `
          SELECT u.category_id as branch_id, 
            COUNT(w.id) as chats_sms,
            COUNT(DISTINCT w.user_id) as sync_count
          FROM whatsapp_chat_logs w
          JOIN users u ON w.user_id = u.user_id
          ${managerJoin}
          WHERE u.category_id IN (?) ${branchDateFilterWaChats} ${managerWhere}
          GROUP BY u.category_id
        `;

        const totalUsersSql = `
          SELECT u.category_id as branch_id, COUNT(u.user_id) as total_users 
          FROM users u
          ${managerJoin}
          WHERE u.category_id IN (?) ${managerWhere}
          GROUP BY u.category_id
        `;

        const [[phoneCalls], [phoneMessages], [waCalls], [waChats], [totalUsers]] =
          await Promise.all([
            pool.query(phoneCallsSql, [branchIds, ...dateParams, ...managerParams]),
            pool.query(messagesSql, [branchIds, ...dateParams, ...managerParams]),
            pool.query(waCallsSql, [branchIds, ...dateParams, ...managerParams]),
            pool.query(waChatsSql, [branchIds, ...dateParams, ...managerParams]),
            pool.query(totalUsersSql, [branchIds, ...managerParams]),
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

        const pCallsMap = new Map(phoneCalls.map((p) => [String(p.branch_id), p]));
        const pMsgsMap = new Map(
          phoneMessages.map((p) => [String(p.branch_id), p]),
        );
        const wCallsMap = new Map(waCalls.map((w) => [String(w.branch_id), w]));
        const wChatsMap = new Map(waChats.map((w) => [String(w.branch_id), w]));
        const tUsersMap = new Map(totalUsers.map((t) => [String(t.branch_id), t]));

        const results = branches.map((branch) => {
          const bIdStr = String(branch.branch_id);
          const pCalls = pCallsMap.get(bIdStr) || {};
          const pMsgs = pMsgsMap.get(bIdStr) || {};
          const wCalls = wCallsMap.get(bIdStr) || {};
          const wChats = wChatsMap.get(bIdStr) || {};
          const tUsers = tUsersMap.get(bIdStr) || {};

          const totalUsersCount = tUsers.total_users || 0;

          const getMaxDate = (d1, d2) => {
            if (!d1) return d2;
            if (!d2) return d1;
            return new Date(d1) > new Date(d2) ? d1 : d2;
          };

          return {
            branch_id: branch.branch_id,
            name: branch.name,
            device_monitoring_summary: [
              {
                platform: "Phone Call",
                total_calls: pCalls.total_calls || 0,
                outgoing: pCalls.outgoing || 0,
                incoming: pCalls.incoming || 0,
                missed: pCalls.missed || 0,
                total_duration: formatDuration(pCalls.total_duration || 0),
                chats_sms: pMsgs.chats_sms || "--",
                last_sync: `${Math.max(pCalls.sync_count || 0, pMsgs.sync_count || 0)}/${totalUsersCount}`,
              },
              {
                platform: "WhatsApp",
                total_calls: wCalls.total_calls || 0,
                outgoing: wCalls.outgoing || 0,
                incoming: wCalls.incoming || 0,
                missed: wCalls.missed || 0,
                total_duration: formatDuration(wCalls.total_duration || 0),
                chats_sms: wChats.chats_sms || 0,
                last_sync: `${Math.max(wCalls.sync_count || 0, wChats.sync_count || 0)}/${totalUsersCount}`,
              },
            ],
          };
        });

        return results;
      }

      let userSql = `SELECT u.user_id, u.full_name as name FROM users u WHERE 1=1`;
      const userParams = [];

      if (manager_id) {
        userSql = `SELECT u.user_id, u.full_name as name FROM users u JOIN assign_manager am ON u.user_id = am.user_id WHERE am.manager_id = ?`;
        userParams.push(manager_id);
      }

      if (activeBranchId) {
        userSql += ` AND u.category_id = ?`;
        userParams.push(activeBranchId);
      }
      if (user_id) {
        userSql += ` AND u.user_id = ?`;
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
          SUM(duration) as total_duration
        FROM call_logs
        WHERE user_id IN (?) ${dateFilterCallLogs}
        GROUP BY user_id
      `;

      const messagesSql = `
        SELECT user_id, 
          COUNT(message_id) as chats_sms
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
          SUM(duration) as total_duration
        FROM whatsapp_call_logs
        WHERE user_id IN (?) ${dateFilterWaCalls}
        GROUP BY user_id
      `;

      const waChatsSql = `
        SELECT user_id, 
          COUNT(id) as chats_sms
        FROM whatsapp_chat_logs
        WHERE user_id IN (?) ${dateFilterWaChats}
        GROUP BY user_id
      `;

      // Absolute last sync queries (ignoring date filters)
      const phoneSyncSql = `SELECT user_id, MAX(call_time) as last_sync FROM call_logs WHERE user_id IN (?) GROUP BY user_id`;
      const msgSyncSql = `SELECT user_id, MAX(time_periode) as last_sync FROM messages WHERE user_id IN (?) GROUP BY user_id`;
      const waCallSyncSql = `SELECT user_id, MAX(created_at) as last_sync FROM whatsapp_call_logs WHERE user_id IN (?) GROUP BY user_id`;
      const waChatSyncSql = `SELECT user_id, MAX(created_at) as last_sync FROM whatsapp_chat_logs WHERE user_id IN (?) GROUP BY user_id`;

      // Execute all queries concurrently for optimization
      const [[phoneCalls], [phoneMessages], [waCalls], [waChats], [phoneSync], [msgSync], [waCallSync], [waChatSync]] =
        await Promise.all([
          pool.query(phoneCallsSql, [userIds, ...dateParams]),
          pool.query(messagesSql, [userIds, ...dateParams]),
          pool.query(waCallsSql, [userIds, ...dateParams]),
          pool.query(waChatsSql, [userIds, ...dateParams]),
          pool.query(phoneSyncSql, [userIds]),
          pool.query(msgSyncSql, [userIds]),
          pool.query(waCallSyncSql, [userIds]),
          pool.query(waChatSyncSql, [userIds]),
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

      const pSyncMap = new Map(phoneSync.map((p) => [String(p.user_id), p]));
      const msgSyncMap = new Map(msgSync.map((p) => [String(p.user_id), p]));
      const waCallSyncMap = new Map(waCallSync.map((w) => [String(w.user_id), w]));
      const waChatSyncMap = new Map(waChatSync.map((w) => [String(w.user_id), w]));

      const results = users.map((user) => {
        const userIdStr = String(user.user_id);
        const pCalls = pCallsMap.get(userIdStr) || {};
        const pMsgs = pMsgsMap.get(userIdStr) || {};
        const wCalls = wCallsMap.get(userIdStr) || {};
        const wChats = wChatsMap.get(userIdStr) || {};

        const pSync = pSyncMap.get(userIdStr) || {};
        const mSync = msgSyncMap.get(userIdStr) || {};
        const wCSync = waCallSyncMap.get(userIdStr) || {};
        const wMSync = waChatSyncMap.get(userIdStr) || {};

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
              last_sync: getMaxDate(pSync.last_sync, mSync.last_sync) || "--",
            },
            {
              platform: "WhatsApp",
              total_calls: wCalls.total_calls || 0,
              outgoing: wCalls.outgoing || 0,
              incoming: wCalls.incoming || 0,
              missed: wCalls.missed || 0,
              total_duration: formatDuration(wCalls.total_duration || 0),
              chats_sms: wChats.chats_sms || 0,
              last_sync: getMaxDate(wCSync.last_sync, wMSync.last_sync) || "--",
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

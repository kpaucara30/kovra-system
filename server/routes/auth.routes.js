const crypto = require("crypto");

function createAuthRoutes({
  readDb,
  writeDb,
  readJsonBody,
  sendJson,
  sessions,
  sessionTtlMs,
  parseCookies,
  slugUsername,
  hashPassword,
  userLoginName,
  publicUser,
  getSessionUser
}) {
  return function handleAuthRoutes(req, res) {
    if (req.method === "POST" && req.url === "/api/login") {
      readJsonBody(req).then((body) => {
        const db = readDb();
        const rawLogin = String(body.username || body.email || "").trim().toLowerCase();
        const login = slugUsername(body.username || body.email);
        const passwordHash = hashPassword(body.password || "");
        const user = db.users.find((item) => {
          const emailUser = String(item.email || "").trim().toLowerCase();
          return (userLoginName(item) === login || emailUser === rawLogin) && item.passwordHash === passwordHash && item.status === "Activo";
        });

        if (!user) {
          sendJson(res, 401, { ok: false, error: "No se encontro un usuario con esos datos o la contrasena no coincide." });
          return;
        }

        const token = crypto.randomUUID();
        user.lastLoginAt = new Date().toISOString();
        writeDb(db);
        sessions.set(token, {
          userId: user.id,
          expiresAt: Date.now() + sessionTtlMs
        });
        sendJson(res, 200, { ok: true, user: publicUser(user) }, {
          "Set-Cookie": `fs_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionTtlMs / 1000}`
        });
      }).catch((error) => sendJson(res, 400, { ok: false, error: error.message }));
      return true;
    }

    if (req.method === "POST" && req.url === "/api/logout") {
      const token = parseCookies(req).fs_session;
      if (token) sessions.delete(token);
      sendJson(res, 200, { ok: true }, {
        "Set-Cookie": "fs_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"
      });
      return true;
    }

    if (req.method === "GET" && req.url === "/api/me") {
      const user = getSessionUser(req);
      sendJson(res, 200, { ok: Boolean(user), user: publicUser(user) });
      return true;
    }

    return false;
  };
}

module.exports = { createAuthRoutes };

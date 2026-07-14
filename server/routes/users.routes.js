const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const USER_PHOTO_DIR = path.join("assets", "uploads", "users");
const PHOTO_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp"
};
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

function saveUserPhoto(dataUrl, userId, clientDir) {
  const value = String(dataUrl || "");
  if (!value) return "";

  const match = value.match(/^data:(image\/(?:png|jpeg|webp));base64,([a-z0-9+/=]+)$/i);
  if (!match) {
    throw new Error("La foto debe ser PNG, JPG o WEBP.");
  }

  const extension = PHOTO_TYPES[match[1].toLowerCase()];
  const buffer = Buffer.from(match[2], "base64");
  if (!extension || buffer.length > MAX_PHOTO_BYTES) {
    throw new Error("La foto no debe superar 2 MB.");
  }

  const uploadsDir = path.join(clientDir, USER_PHOTO_DIR);
  fs.mkdirSync(uploadsDir, { recursive: true });

  const fileName = `user-${userId}.${extension}`;
  const filePath = path.join(uploadsDir, fileName);
  fs.writeFileSync(filePath, buffer);
  return path.join(USER_PHOTO_DIR, fileName).replace(/\\/g, "/");
}

function defaultUsernameFromName(firstNames, lastNames, birthDate) {
  const firstName = String(firstNames || "").trim().split(/\s+/)[0] || "";
  const lastNameParts = String(lastNames || "").trim().split(/\s+/).filter(Boolean);
  const firstLastName = lastNameParts[0] || "";
  const secondLastName = lastNameParts[1] || "";
  const date = new Date(`${birthDate}T00:00:00`);
  const month = Number.isNaN(date.getTime()) ? "" : String(date.getMonth() + 1);
  return `${firstName[0] || ""}${firstLastName}${secondLastName[0] || ""}${month}`;
}

function pickBodyValue(body, keys) {
  const key = keys.find((item) => Object.prototype.hasOwnProperty.call(body, item));
  return key ? body[key] : undefined;
}

function normalizeBirthDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const slashDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!slashDate) return raw;
  const [, day, month, year] = slashDate;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function createUserRoutes({
  readDb,
  writeDb,
  readJsonBody,
  sendJson,
  requireAuth,
  canManageUsers,
  slugUsername,
  generatedUsernameFromProfile,
  hashPassword,
  userLoginName,
  publicUser,
  clientDir
}) {
  return function handleUserRoutes(req, res) {
    if (req.method === "GET" && req.url === "/api/users") {
      const user = requireAuth(req, res);
      if (!user) return true;
      if (!canManageUsers(user)) {
        sendJson(res, 403, { ok: false, error: "Tu rol no permite ver ni gestionar usuarios." });
        return true;
      }
      const db = readDb();
      sendJson(res, 200, { ok: true, users: db.users.map(publicUser) });
      return true;
    }

    if (req.method === "POST" && req.url === "/api/users") {
      const user = requireAuth(req, res);
      if (!user) return true;
      if (!canManageUsers(user)) {
        sendJson(res, 403, { ok: false, error: "Solo el administrador puede crear usuarios." });
        return true;
      }

      readJsonBody(req).then((body) => {
        const db = readDb();
        const email = String(body.email || "").trim().toLowerCase();
        const birthDate = normalizeBirthDate(pickBodyValue(body, ["birthDate", "birthdate", "fechaNacimiento", "fecha_nacimiento"]));
        const firstNames = String(body.firstNames || "").trim();
        const lastNames = String(body.lastNames || "").trim();
        const name = [firstNames, lastNames].filter(Boolean).join(" ");
        const dni = String(body.dni || "").replace(/\D/g, "").slice(0, 8);
        const username = slugUsername(body.username || defaultUsernameFromName(firstNames, lastNames, birthDate));
        const password = String(body.password || "");
        if (!email || !firstNames || !lastNames || !dni || !birthDate || !username) {
          sendJson(res, 400, { ok: false, error: "Nombres, apellidos, DNI, fecha de nacimiento, usuario y correo son obligatorios." });
          return;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
          sendJson(res, 400, { ok: false, error: "La fecha de nacimiento no es valida." });
          return;
        }
        if (!/^\d{8}$/.test(dni)) {
          sendJson(res, 400, { ok: false, error: "El DNI debe tener 8 digitos." });
          return;
        }
        if (password.length < 6) {
          sendJson(res, 400, { ok: false, error: "La contrasena debe tener minimo 6 caracteres." });
          return;
        }
        if (db.users.some((item) => userLoginName(item) === username)) {
          sendJson(res, 409, { ok: false, error: "Ya existe un usuario con ese nombre de usuario." });
          return;
        }
        if (db.users.some((item) => item.email.toLowerCase() === email)) {
          sendJson(res, 409, { ok: false, error: "Ya existe un usuario con ese correo." });
          return;
        }
        if (db.users.some((item) => String(item.dni || "") === dni)) {
          sendJson(res, 409, { ok: false, error: "Ya existe un usuario con ese DNI." });
          return;
        }

        const id = crypto.randomUUID();
        const newUser = {
          id,
          firstNames,
          lastNames,
          name,
          dni,
          birthDate,
          username,
          email,
          role: String(body.role || "Contador"),
          status: String(body.status || "Activo"),
          password,
          passwordHash: hashPassword(password),
          createdAt: new Date().toISOString()
        };
        if (body.photoData) {
          newUser.photoUrl = saveUserPhoto(body.photoData, id, clientDir);
        }
        db.users.unshift(newUser);
        writeDb(db);
        sendJson(res, 200, { ok: true, user: publicUser(newUser), users: db.users.map(publicUser) });
      }).catch((error) => sendJson(res, 400, { ok: false, error: error.message }));
      return true;
    }

    if (req.method === "POST" && req.url === "/api/users/bulk-delete") {
      const user = requireAuth(req, res);
      if (!user) return true;
      if (!canManageUsers(user)) {
        sendJson(res, 403, { ok: false, error: "Solo el administrador puede eliminar usuarios." });
        return true;
      }

      readJsonBody(req).then((body) => {
        const ids = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean) : [];
        const idSet = new Set(ids.filter((id) => id !== user.id));
        if (!idSet.size) {
          sendJson(res, 400, { ok: false, error: "Selecciona al menos un usuario distinto a tu cuenta." });
          return;
        }

        const db = readDb();
        const before = db.users.length;
        const remaining = db.users.filter((item) => !idSet.has(item.id));
        const hasAdmin = remaining.some((item) => String(item.role || "") === "Administrador");
        if (!hasAdmin) {
          sendJson(res, 400, { ok: false, error: "No se puede eliminar a todos los administradores." });
          return;
        }

        db.users = remaining;
        writeDb(db);
        sendJson(res, 200, {
          ok: true,
          deleted: before - db.users.length,
          users: db.users.map(publicUser)
        });
      }).catch((error) => sendJson(res, 400, { ok: false, error: error.message }));
      return true;
    }

    const userMatch = req.url.match(/^\/api\/users\/([^/]+)$/);
    if (userMatch && req.method === "PUT") {
      const user = requireAuth(req, res);
      if (!user) return true;
      if (!canManageUsers(user)) {
        sendJson(res, 403, { ok: false, error: "Solo el administrador puede editar usuarios." });
        return true;
      }

      readJsonBody(req).then((body) => {
        const db = readDb();
        const target = db.users.find((item) => item.id === userMatch[1]);
        if (!target) {
          sendJson(res, 404, { ok: false, error: "Usuario no encontrado." });
          return;
        }

        const email = String(body.email || target.email).trim().toLowerCase();
        const bodyBirthDate = pickBodyValue(body, ["birthDate", "birthdate", "fechaNacimiento", "fecha_nacimiento"]);
        const birthDate = normalizeBirthDate(bodyBirthDate ?? target.birthDate);
        const firstNames = String(body.firstNames || target.firstNames || "").trim();
        const lastNames = String(body.lastNames || target.lastNames || "").trim();
        const name = [firstNames, lastNames].filter(Boolean).join(" ") || String(target.name || "").trim();
        const dniProvided = Object.prototype.hasOwnProperty.call(body, "dni");
        const dni = dniProvided ? String(body.dni || "").replace(/\D/g, "").slice(0, 8) : String(target.dni || "");
        const username = slugUsername(body.username || defaultUsernameFromName(firstNames, lastNames, birthDate));
        if (!firstNames || !lastNames || !dni || !birthDate) {
          sendJson(res, 400, { ok: false, error: "Nombres, apellidos, DNI y fecha de nacimiento son obligatorios." });
          return;
        }
        if (!username) {
          sendJson(res, 400, { ok: false, error: "El usuario es obligatorio." });
          return;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
          sendJson(res, 400, { ok: false, error: "La fecha de nacimiento no es valida." });
          return;
        }
        if (!/^\d{8}$/.test(dni)) {
          sendJson(res, 400, { ok: false, error: "El DNI debe tener 8 digitos." });
          return;
        }
        if (db.users.some((item) => item.id !== target.id && userLoginName(item) === username)) {
          sendJson(res, 409, { ok: false, error: "Ya existe un usuario con ese nombre de usuario." });
          return;
        }
        if (db.users.some((item) => item.id !== target.id && item.email.toLowerCase() === email)) {
          sendJson(res, 409, { ok: false, error: "Ya existe un usuario con ese correo." });
          return;
        }
        if (dniProvided && db.users.some((item) => item.id !== target.id && String(item.dni || "") === dni)) {
          sendJson(res, 409, { ok: false, error: "Ya existe un usuario con ese DNI." });
          return;
        }

        target.firstNames = firstNames;
        target.lastNames = lastNames;
        target.name = name;
        if (dniProvided) target.dni = dni;
        target.birthDate = birthDate;
        target.username = username;
        target.email = email;
        target.role = String(body.role || target.role) === "Contadora" ? "Contador" : String(body.role || target.role);
        target.status = String(body.status || target.status);
        if (body.photoRemoved) target.photoUrl = "";
        if (body.photoData) target.photoUrl = saveUserPhoto(body.photoData, target.id, clientDir);
        if (body.password) {
          target.password = String(body.password);
          target.passwordHash = hashPassword(body.password);
        }
        target.updatedAt = new Date().toISOString();
        writeDb(db);
        sendJson(res, 200, { ok: true, users: db.users.map(publicUser), user: publicUser(target) });
      }).catch((error) => sendJson(res, 400, { ok: false, error: error.message }));
      return true;
    }

    if (req.method === "POST" && req.url === "/api/change-password") {
      const user = requireAuth(req, res);
      if (!user) return true;

      readJsonBody(req).then((body) => {
        const db = readDb();
        const target = db.users.find((item) => item.id === user.id);
        if (!target || target.passwordHash !== hashPassword(body.currentPassword || "")) {
          sendJson(res, 400, { ok: false, error: "La contrasena actual no es correcta." });
          return;
        }
        if (String(body.newPassword || "").length < 6) {
          sendJson(res, 400, { ok: false, error: "La nueva contrasena debe tener minimo 6 caracteres." });
          return;
        }
        target.passwordHash = hashPassword(body.newPassword);
        target.password = String(body.newPassword);
        target.updatedAt = new Date().toISOString();
        writeDb(db);
        sendJson(res, 200, { ok: true });
      }).catch((error) => sendJson(res, 400, { ok: false, error: error.message }));
      return true;
    }

    return false;
  };
}

module.exports = { createUserRoutes };

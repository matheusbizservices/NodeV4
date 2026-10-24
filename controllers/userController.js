const crypto = require("crypto");
const util = require("util");
const { userSchema } = require("../validation/userSchema");

// crypto.scrypt uses a callback, promisify lets us use it with await.
const scrypt = util.promisify(crypto.scrypt);

// Temporary in-memory "database": global.users, global.user_id and global.tasks
// are set up in app.js. A real database replaces this in a later week.

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePassword(inputPassword, storedHash) {
  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scrypt(inputPassword, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

async function register(req, res) {
  if (!req.body) req.body = {};

  const { error, value } = userSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.message });
  }

  // Never store the plain password, only the salted hash.
  const hashedPassword = await hashPassword(value.password);
  const newUser = {
    email: value.email,
    name: value.name,
    hashedPassword,
  };
  global.users.push(newUser);
  global.user_id = newUser;

  res.status(201).json({ name: newUser.name, email: newUser.email });
}

async function logon(req, res) {
  if (!req.body) req.body = {};
  const { email, password } = req.body;

  const user = global.users.find((u) => u.email === email);
  const goodCredentials =
    user &&
    typeof password === "string" &&
    (await comparePassword(password, user.hashedPassword));

  if (!goodCredentials) {
    return res.status(401).json({ message: "Authentication failed" });
  }

  global.user_id = user;
  res.status(200).json({ name: user.name, email: user.email });
}

function logoff(req, res) {
  global.user_id = null;
  res.status(200).json({ message: "Logged off" });
}

module.exports = {
  register,
  logon,
  logoff,
};

const crypto = require("crypto");
const util = require("util");
const { userSchema } = require("../validation/userSchema");
const pool = require("../db/pg-pool");

// crypto.scrypt uses a callback, promisify lets us use it with await.
const scrypt = util.promisify(crypto.scrypt);

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

async function register(req, res, next) {
  if (!req.body) req.body = {};

  const { error, value } = userSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      message: "Validation failed",
      details: error.details,
    });
  }

  // Never store the plain password, only the salted hash.
  const hashedPassword = await hashPassword(value.password);

  let result;
  try {
    // Parameterized query: the values are never pasted into the SQL text.
    result = await pool.query(
      `INSERT INTO users (email, name, hashed_password)
       VALUES ($1, $2, $3) RETURNING id, email, name`,
      [value.email, value.name, hashedPassword],
    );
  } catch (e) {
    if (e.code === "23505") {
      // unique constraint on email: that email is already registered
      return res.status(400).json({ message: "That email is already registered." });
    }
    return next(e); // any other error goes to the error handler
  }

  const user = result.rows[0];
  global.user_id = user.id;

  res.status(201).json({ name: user.name, email: user.email });
}

async function logon(req, res) {
  if (!req.body) req.body = {};
  const { email, password } = req.body;

  const result = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  const user = result.rows[0];

  const goodCredentials =
    user &&
    typeof password === "string" &&
    (await comparePassword(password, user.hashed_password));

  if (!goodCredentials) {
    return res.status(401).json({ message: "Authentication failed" });
  }

  global.user_id = user.id;
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

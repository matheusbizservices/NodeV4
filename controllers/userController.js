const crypto = require("crypto");
const util = require("util");
const { userSchema } = require("../validation/userSchema");
const prisma = require("../db/prisma");

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

  let user = null;
  try {
    user = await prisma.user.create({
      data: { name: value.name, email: value.email, hashedPassword },
      select: { name: true, email: true, id: true }, // columns to return
    });
  } catch (err) {
    if (err.name === "PrismaClientKnownRequestError" && err.code === "P2002") {
      // unique constraint on email: that email is already registered
      return res
        .status(400)
        .json({ message: "That email is already registered." });
    }
    return next(err); // the error handler takes care of other errors
  }

  global.user_id = user.id;
  res.status(201).json({ name: user.name, email: user.email });
}

async function logon(req, res) {
  if (!req.body) req.body = {};
  let { email, password } = req.body;

  // Joi lowercases emails on register, so do the same here to match.
  email = typeof email === "string" ? email.toLowerCase() : email;
  const user = email
    ? await prisma.user.findUnique({ where: { email } })
    : null;

  const goodCredentials =
    user &&
    typeof password === "string" &&
    (await comparePassword(password, user.hashedPassword));

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

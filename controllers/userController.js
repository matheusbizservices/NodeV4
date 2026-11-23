const crypto = require("crypto");
const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");
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

const cookieFlags = (req) => {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // only when HTTPS is available
    sameSite: "Strict",
  };
};

const setJwtCookie = (req, res, user) => {
  // Sign JWT
  const payload = { id: user.id, csrfToken: randomUUID() };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" }); // 1 hour expiration
  // Set cookie.  Note that the cookie flags have to be different in production and in test.
  res.cookie("jwt", token, { ...cookieFlags(req), maxAge: 3600000 }); // 1 hour expiration
  return payload.csrfToken; // this is needed in the body returned by logon() or register()
};

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

  try {
    // A transaction: the user and the welcome tasks are saved together,
    // or (if anything fails) neither is saved.
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { name: value.name, email: value.email, hashedPassword },
        select: { id: true, email: true, name: true },
      });

      const welcomeTaskData = [
        { title: "Complete your profile", userId: newUser.id, priority: "medium" },
        { title: "Add your first task", userId: newUser.id, priority: "high" },
        { title: "Explore the app", userId: newUser.id, priority: "low" },
      ];
      await tx.task.createMany({ data: welcomeTaskData });

      // Fetch the new tasks so we can send them back.
      const welcomeTasks = await tx.task.findMany({
        where: {
          userId: newUser.id,
          title: { in: welcomeTaskData.map((t) => t.title) },
        },
        select: {
          id: true,
          title: true,
          isCompleted: true,
          userId: true,
          priority: true,
        },
      });

      return { user: newUser, welcomeTasks };
    });

    // Log the new user on: set the jwt cookie and return the csrf token.
    const csrfToken = setJwtCookie(req, res, result.user);

    res.status(201).json({
      user: result.user,
      name: result.user.name,
      email: result.user.email,
      csrfToken,
      welcomeTasks: result.welcomeTasks,
      transactionStatus: "success",
    });
  } catch (err) {
    if (err.code === "P2002") {
      // unique constraint on email: that email is already registered
      return res.status(400).json({ error: "Email already registered" });
    }
    return next(err); // the error handler takes care of other errors
  }
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

  const csrfToken = setJwtCookie(req, res, user);
  res.status(200).json({ name: user.name, email: user.email, csrfToken });
}

function logoff(req, res) {
  // Use the same flags as when the cookie was set, and no maxAge.
  res.clearCookie("jwt", cookieFlags(req));
  res.status(200).json({ message: "Logged off" });
}

module.exports = {
  register,
  logon,
  logoff,
};

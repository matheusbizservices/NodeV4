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

    // global.user_id is not secure for production, it is replaced later.
    global.user_id = result.user.id;

    res.status(201).json({
      user: result.user,
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

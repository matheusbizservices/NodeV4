const prisma = require("../db/prisma");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

// Every query filters on userId so users only ever touch their own tasks.
// select lists the columns to return, so userId is never sent to the client.
const taskFields = { id: true, title: true, isCompleted: true };

async function create(req, res) {
  if (!req.body) req.body = {};

  const { error, value } = taskSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      message: "Validation failed",
      details: error.details,
    });
  }

  const task = await prisma.task.create({
    data: {
      title: value.title,
      isCompleted: value.isCompleted,
      userId: global.user_id,
    },
    select: taskFields,
  });

  res.status(201).json(task);
}

async function index(req, res) {
  const tasks = await prisma.task.findMany({
    where: { userId: global.user_id }, // only the tasks for this user
    select: taskFields,
  });

  if (tasks.length === 0) {
    return res.status(404).json({ message: "No tasks found" });
  }

  res.status(200).json(tasks);
}

async function show(req, res) {
  const id = parseInt(req.params?.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: "The task ID passed is not valid." });
  }

  const task = await prisma.task.findUnique({
    where: { id_userId: { id, userId: global.user_id } },
    select: taskFields,
  });

  if (!task) {
    return res.status(404).json({ message: "That task was not found" });
  }

  res.status(200).json(task);
}

async function update(req, res, next) {
  if (!req.body) req.body = {};

  const { error, value } = patchTaskSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error) {
    return res.status(400).json({
      message: "Validation failed",
      details: error.details,
    });
  }

  const id = parseInt(req.params?.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: "The task ID passed is not valid." });
  }

  try {
    const task = await prisma.task.update({
      data: value,
      where: { id_userId: { id, userId: global.user_id } },
      select: taskFields,
    });
    res.status(200).json(task);
  } catch (err) {
    if (err.code === "P2025") {
      // Prisma could not find a matching task for this user
      return res.status(404).json({ message: "That task was not found" });
    }
    return next(err); // other errors go to the global error handler
  }
}

async function deleteTask(req, res, next) {
  const id = parseInt(req.params?.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: "The task ID passed is not valid." });
  }

  try {
    const task = await prisma.task.delete({
      where: { id_userId: { id, userId: global.user_id } },
      select: taskFields,
    });
    res.status(200).json(task);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "That task was not found" });
    }
    return next(err);
  }
}

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
};

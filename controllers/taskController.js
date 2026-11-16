const prisma = require("../db/prisma");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

// Every query filters on userId so users only ever touch their own tasks.
// select lists the columns to return, so userId is never sent to the client.
const taskFields = {
  id: true,
  title: true,
  isCompleted: true,
  priority: true,
  createdAt: true,
};

// Same fields, plus the owner's name and email (eager loading in one query).
const taskFieldsWithUser = {
  ...taskFields,
  User: { select: { name: true, email: true } },
};

// Turn the optional sortBy / sortDirection query parameters into an orderBy.
const getOrderBy = (query) => {
  const validSortFields = ["title", "priority", "createdAt", "id", "isCompleted"];
  const sortBy = query.sortBy || "createdAt";
  const sortDirection = query.sortDirection === "asc" ? "asc" : "desc";

  if (validSortFields.includes(sortBy)) {
    return { [sortBy]: sortDirection };
  }
  return { createdAt: "desc" }; // default fallback
};

async function create(req, res, next) {
  if (!req.body) req.body = {};

  const { error, value } = taskSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      message: "Validation failed",
      details: error.details,
    });
  }

  try {
    const task = await prisma.task.create({
      data: {
        title: value.title,
        isCompleted: value.isCompleted,
        priority: value.priority,
        userId: global.user_id,
      },
      select: taskFields,
    });

    res.status(201).json(task);
  } catch (err) {
    return next(err);
  }
}

async function bulkCreate(req, res, next) {
  const { tasks } = req.body || {};

  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({
      error: "Invalid request data. Expected an array of tasks.",
    });
  }

  // Validate every task before inserting anything.
  const validTasks = [];
  for (const task of tasks) {
    const { error, value } = taskSchema.validate(task);
    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details,
      });
    }
    validTasks.push({
      title: value.title,
      isCompleted: value.isCompleted,
      priority: value.priority,
      userId: global.user_id,
    });
  }

  try {
    // One database call for all of the tasks.
    const result = await prisma.task.createMany({
      data: validTasks,
      skipDuplicates: false,
    });

    res.status(201).json({
      message: "success!",
      tasksCreated: result.count,
      totalRequested: validTasks.length,
    });
  } catch (err) {
    return next(err);
  }
}

async function index(req, res, next) {
  // Pagination parameters: page >= 1, limit between 1 and 100.
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const limit = req.query.limit === undefined ? 10 : Number(req.query.limit);
  if (!Number.isInteger(page) || page < 1) {
    return res.status(400).json({ message: "page must be 1 or greater." });
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res
      .status(400)
      .json({ message: "limit must be between 1 and 100." });
  }
  const skip = (page - 1) * limit;

  // Build the where clause. Only the logged-in user's tasks, plus optional search.
  const whereClause = { userId: global.user_id };
  if (req.query.find) {
    whereClause.title = {
      contains: req.query.find, // matches %find%
      mode: "insensitive", // case-insensitive (ILIKE)
    };
  }

  try {
    const tasks = await prisma.task.findMany({
      where: whereClause,
      select: taskFieldsWithUser,
      skip,
      take: limit,
      orderBy: getOrderBy(req.query),
    });

    const total = await prisma.task.count({ where: whereClause });

    if (total === 0) {
      return res.status(404).json({ message: "No tasks found" });
    }

    const pagination = {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };

    res.status(200).json({ tasks, pagination });
  } catch (err) {
    return next(err);
  }
}

async function show(req, res, next) {
  const id = parseInt(req.params?.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: "The task ID passed is not valid." });
  }

  try {
    const task = await prisma.task.findUnique({
      where: { id_userId: { id, userId: global.user_id } },
      select: taskFieldsWithUser,
    });

    if (!task) {
      return res.status(404).json({ message: "That task was not found" });
    }

    res.status(200).json(task);
  } catch (err) {
    return next(err);
  }
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
  bulkCreate,
  index,
  show,
  update,
  deleteTask,
};

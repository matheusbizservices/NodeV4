const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

// Temporary task IDs. A database will create these later.
let nextTaskId = 1;
const taskCounter = () => nextTaskId++;

// Copy of a task without the internal userId field.
const sanitize = (task) => {
  const { userId, ...sanitizedTask } = task;
  return sanitizedTask;
};

async function create(req, res) {
  if (!req.body) req.body = {};

  const { error, value } = taskSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.message });
  }

  const newTask = { id: taskCounter(), userId: global.user_id.email, ...value };
  global.tasks.push(newTask);

  res.status(201).json(sanitize(newTask));
}

async function index(req, res) {
  const userTasks = global.tasks.filter(
    (task) => task.userId === global.user_id.email,
  );

  if (userTasks.length === 0) {
    return res.status(404).json({ message: "No tasks found" });
  }

  res.status(200).json(userTasks.map(sanitize));
}

async function show(req, res) {
  const taskId = parseInt(req.params?.id);
  if (isNaN(taskId)) {
    return res.status(400).json({ message: "The task ID passed is not valid." });
  }

  const task = global.tasks.find(
    (t) => t.id === taskId && t.userId === global.user_id.email,
  );
  if (!task) {
    return res.status(404).json({ message: "That task was not found" });
  }

  res.status(200).json(sanitize(task));
}

async function update(req, res) {
  if (!req.body) req.body = {};

  const { error, value } = patchTaskSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error) {
    return res.status(400).json({ message: error.message });
  }

  const taskId = parseInt(req.params?.id);
  if (isNaN(taskId)) {
    return res.status(400).json({ message: "The task ID passed is not valid." });
  }

  const task = global.tasks.find(
    (t) => t.id === taskId && t.userId === global.user_id.email,
  );
  if (!task) {
    return res.status(404).json({ message: "That task was not found" });
  }

  // Only the fields that were sent are changed.
  Object.assign(task, value);

  res.status(200).json(sanitize(task));
}

async function deleteTask(req, res) {
  const taskId = parseInt(req.params?.id);
  if (isNaN(taskId)) {
    return res.status(400).json({ message: "The task ID passed is not valid." });
  }

  const taskIndex = global.tasks.findIndex(
    (t) => t.id === taskId && t.userId === global.user_id.email,
  );
  if (taskIndex === -1) {
    return res.status(404).json({ message: "That task was not found" });
  }

  const deletedTask = sanitize(global.tasks[taskIndex]);
  global.tasks.splice(taskIndex, 1);

  res.status(200).json(deletedTask);
}

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
};

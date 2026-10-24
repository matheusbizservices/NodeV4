const Joi = require("joi");

// Creating a task: title is required, isCompleted defaults to false.
const taskSchema = Joi.object({
  title: Joi.string().trim().min(3).max(30).required(),
  isCompleted: Joi.boolean().default(false).not(null),
});

// Updating a task: any field can be sent, but at least one is required.
// No default here, so a patch never overwrites isCompleted by accident.
const patchTaskSchema = Joi.object({
  title: Joi.string().trim().min(3).max(30),
  isCompleted: Joi.boolean().not(null),
}).min(1);

module.exports = { taskSchema, patchTaskSchema };

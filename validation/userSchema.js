const Joi = require("joi");

// A password must be at least 8 characters and mix upper case, lower case,
// a digit, and a special character, so "password" is rejected as trivial.
const userSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  name: Joi.string().trim().min(3).max(30).required(),
  password: Joi.string()
    .min(8)
    .pattern(/[a-z]/, "lowercase letter")
    .pattern(/[A-Z]/, "uppercase letter")
    .pattern(/[0-9]/, "digit")
    .pattern(/[^a-zA-Z0-9]/, "special character")
    .required(),
});

module.exports = { userSchema };

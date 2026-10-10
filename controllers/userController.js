// Temporary in-memory "database": global.users, global.user_id and global.tasks
// are set up in app.js. A real database replaces this in a later week.

function register(req, res) {
  const { name, email, password } = req.body;

  const newUser = { name, email, password };
  global.users.push(newUser);
  global.user_id = newUser;

  // Send back only the name and email, never the password.
  res.status(201).json({ name: newUser.name, email: newUser.email });
}

function logon(req, res) {
  const { email, password } = req.body;

  const user = global.users.find(
    (u) => u.email === email && u.password === password,
  );

  if (!user) {
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

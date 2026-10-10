const notFound = (req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
};

module.exports = notFound;

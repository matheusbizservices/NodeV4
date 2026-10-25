const express = require("express");
const timeRouter = require("./routes/timeRoutes");
const userRouter = require("./routes/userRoutes");
const taskRouter = require("./routes/taskRoutes");
const authMiddleware = require("./middleware/auth");
const notFound = require("./middleware/not-found");
const errorHandler = require("./middleware/error-handler");
const pool = require("./db/pg-pool");

// Users and tasks now live in PostgreSQL. global.user_id still remembers who
// is logged on until we add real sessions or tokens in a later assignment.
global.user_id = null;

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({ message: `db not connected, error: ${err.message}` });
  }
});

app.post("/testpost", (req, res) => {
  res.status(200).json({
    message: "POST route works",
  });
});

app.use("/api", timeRouter);
app.use("/api/users", userRouter);
app.use("/api/tasks", authMiddleware, taskRouter);

// Not-found goes after all real routes, error handler goes last.
app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 3000;

const server = app.listen(port, (error) => {
  if (error) {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use.`);
    } else {
      console.error("Server startup error:", error);
    }
    process.exit(1);
    return;
  }

  console.log(`Server is listening on port ${port}...`);
});

let isShuttingDown = false;

async function shutdown(code = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("Shutting down gracefully...");

  try {
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log("HTTP server closed.");
    // Release the database connections so the process can exit.
    await pool.end();
  } catch (err) {
    console.error("Error during shutdown:", err);
    code = 1;
  } finally {
    process.exit(code);
  }
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

module.exports = { app, server };

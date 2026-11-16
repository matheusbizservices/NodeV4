const prisma = require("../db/prisma");

// Read page and limit from the query. Returns an error message if they are bad.
function getPaging(query) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 10 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1) {
    return { error: "page must be 1 or greater." };
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return { error: "limit must be between 1 and 100." };
  }
  return { page, limit, skip: (page - 1) * limit };
}

async function getUserAnalytics(req, res, next) {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    // 404 if the user does not exist
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Count the user's tasks by completion status
    const taskStats = await prisma.task.groupBy({
      by: ["isCompleted"],
      where: { userId },
      _count: { id: true },
    });

    // Most recent tasks, with the user's name loaded in the same query
    const recentTasks = await prisma.task.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
        userId: true,
        User: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Tasks created in the last 7 days
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyProgress = await prisma.task.groupBy({
      by: ["createdAt"],
      where: { userId, createdAt: { gte: oneWeekAgo } },
      _count: { id: true },
    });

    res.status(200).json({ taskStats, recentTasks, weeklyProgress });
  } catch (err) {
    return next(err);
  }
}

async function getUsersWithStats(req, res, next) {
  const paging = getPaging(req.query);
  if (paging.error) {
    return res.status(400).json({ error: paging.error });
  }
  const { page, limit, skip } = paging;

  try {
    const usersRaw = await prisma.user.findMany({
      include: {
        Task: {
          where: { isCompleted: false },
          select: { id: true },
          take: 5,
        },
        _count: { select: { Task: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    // Only send back the fields we want (never hashedPassword).
    const users = usersRaw.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      _count: user._count,
      Task: user.Task,
    }));

    const total = await prisma.user.count();

    const pagination = {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };

    res.status(200).json({ users, pagination });
  } catch (err) {
    return next(err);
  }
}

async function searchTasks(req, res, next) {
  const searchQuery = req.query.q;

  if (
    typeof searchQuery !== "string" ||
    searchQuery.trim().length < 2
  ) {
    return res.status(400).json({
      error: "Search query must be at least 2 characters long",
    });
  }

  const limit = req.query.limit === undefined ? 20 : Number(req.query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res
      .status(400)
      .json({ error: "limit must be between 1 and 100." });
  }

  // Build the patterns outside the query. The values are passed to the
  // database as parameters, so user input can never become SQL code.
  const searchPattern = `%${searchQuery}%`;
  const exactMatch = searchQuery;
  const startsWith = `${searchQuery}%`;

  try {
    const results = await prisma.$queryRaw`
      SELECT
        t.id,
        t.title,
        t.is_completed as "isCompleted",
        t.priority,
        t.created_at as "createdAt",
        t.user_id as "userId",
        u.name as "user_name"
      FROM tasks t
      JOIN users u ON t.user_id = u.id
      WHERE t.title ILIKE ${searchPattern}
         OR u.name ILIKE ${searchPattern}
      ORDER BY
        CASE
          WHEN t.title ILIKE ${exactMatch} THEN 1
          WHEN t.title ILIKE ${startsWith} THEN 2
          WHEN t.title ILIKE ${searchPattern} THEN 3
          ELSE 4
        END,
        t.created_at DESC
      LIMIT ${limit}
    `;

    res.status(200).json({
      results,
      query: searchQuery,
      count: results.length,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getUserAnalytics,
  getUsersWithStats,
  searchTasks,
};

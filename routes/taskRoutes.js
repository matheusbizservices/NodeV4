const express = require("express");
const {
  bulkCreate,
  index,
  show,
  create,
  update,
  deleteTask,
} = require("../controllers/taskController");

const router = express.Router();

router.get("/", index);
// /bulk must come before /:id, or Express would treat "bulk" as an id
router.post("/bulk", bulkCreate);
router.get("/:id", show);
router.post("/", create);
router.patch("/:id", update);
router.delete("/:id", deleteTask);

module.exports = router;

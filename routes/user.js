var express = require("express");
var router = express.Router();
const { User } = require("../models/User");

//Update Benchmark
router.post("/:id/upBench", async (req, res) => {
  const { id } = req.params;
  const { benchmarkValue } = req.body;
  try {
    let user = await User.findByIdAndUpdate(id, { benchmark: benchmarkValue });
    user = await User.findById(id);
    res.status(201).send(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

/* GET users listing. */
router.get("/", function (req, res, next) {
  res.send("<h1>User Api's</h1>");
});

module.exports = router;

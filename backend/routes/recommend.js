const express = require("express");
const { recommendShoes } = require("../controllers/recommendController");

const router = express.Router();

router.post("/", recommendShoes);

module.exports = router;

const router = require("express").Router();

const engineerRoute = require("./engineers");
const userRoute = require("./auth");

router.use("/api/engineer", engineerRoute);
router.use("/api/auth", userRoute);

module.exports = router;

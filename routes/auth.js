const router = require("express").Router();
const bcrypt = require("bcrypt");
const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");

const verify = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.JWT_KEY, (err, user) => {
      if (err) {
        return res.status(403).json("token is not valid");
      }

      req.user = user;
      next();
    });
  } else {
    res.status(401).json("you are not authenticated");
  }
};
router.post("/admin", async (req, res) => {
  try {
    //generate a new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    const hashedAuth = await bcrypt.hash(req.body.auth, salt);

    //create a new user
    const username = req.body.username;
    const email = req.body.email;
    const password = hashedPassword;
    const currentPassword = password;
    const auth = hashedAuth;

    //check if admin exist
    const findAdmin = await Admin.find();
    if (findAdmin.length == 1) {
      res.status(403).json({ message: "You are not allowed to registered!" });
    } else {
      //admin does not exist, proceed to register
      const newAdmin = await new Admin({
        currentPassword,
        username,
        email,
        password,
        auth,
      });
      //save admin
      const admin = await newAdmin.save();
      res.status(200).json({
        message: `Registration successful! Kindly proceed to login.`,
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Connection Error!" });
  }
});

//login an admin
router.post("/admin-login", async (req, res) => {
  try {
    const admin =
      (await Admin.findOne({ email: req.body.email })) ||
      (await Admin.findOne({ username: req.body.username }));
    if (!admin) {
      res.status(403).json({ message: "Forbidden to  login" });
    } else if (!bcrypt.compareSync(req.body.password, admin.password)) {
      res.status(400).json({
        message:
          "Invalid  credentials,  make sure  you  input the correct details",
      });
    } else {
      res.status(200).json(admin);
    }
  } catch (err) {
    res.status(500).json({ message: "Connection Error!" });
  }
});

//validate admin before change of password
router.post("/admin-update-validate/:id", async (req, res) => {
  try {
    const adminId = req.body.adminId;
    const auth = req.body.auth;
    const currentPassword = req.body.currentPassword;
    const id = req.params.id;

    const findAdmin = await Admin.findOne({ adminId: adminId });
    if (adminId === id) {
      if (bcrypt.compareSync(currentPassword, findAdmin.currentPassword)) {
        if (bcrypt.compareSync(auth, findAdmin.auth)) {
          res.status(200).json({ message: "Validation successful" });
        } else {
          res.status(403).json({ message: "Incorrect authentication code" });
        }
      } else {
        res.status(403).json({ message: "Current password is incorrect!" });
      }
    } else {
      res.status(401).json({ message: "Incorrect authentication code" });
    }
  } catch (err) {
    res.status(500).json({ message: "Connecteion Error!" });
  }
});

//update admin password
router.put("/admin-update-details/:id", async (req, res) => {
  const auth = req.body.auth;
  const currentPassword = req.body.currentPassword;

  if (req.body.adminId === req.params.id) {
    try {
      const findAdmin = await Admin.findById(req.params.id);
      //check if typed password is same as admin current password
      if (bcrypt.compareSync(currentPassword, findAdmin.currentPassword)) {
        //further check if typed auth is same as admin auth
        if (bcrypt.compareSync(auth, findAdmin.auth)) {
          if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            req.body.password = await bcrypt.hash(req.body.password, salt);
            req.body.currentPassword = req.body.password;
            req.body.auth = await bcrypt.hash(req.body.auth, salt);
          }
          try {
            const admin = await Admin.findByIdAndUpdate(
              req.params.id,
              { $set: req.body },
              { new: true }
            );

            res.status(200).json(admin);
          } catch (err) {
            err;
          }
        } else {
          res.status(403).json({ message: "Incorrect authentication code" });
        }
      } else {
        res.status(403).json({ message: "Current password is incorrect!" });
      }
    } catch (err) {
      console.log(err);
    }
  } else {
    res
      .status(403)
      .json({ message: "You are not an authorized user of this account" });
  }
});

module.exports = router;

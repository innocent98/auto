const router = require("express").Router();
const Engineers = require("../models/Enginners");
const EngineerBackup = require("../models/EnginnerBackup");
const Admin = require("../models/Admin");

//register an engineer
router.post("/", async (req, res) => {
  try {
    const email = req.body.email;
    const phoneNumber = req.body.phoneNumber;
    //check if an engineer is registered already
    const findEngineer =
      (await EngineerBackup.findOne({ email: email })) ||
      (await EngineerBackup.findOne({ phoneNumber: phoneNumber }));
    if (findEngineer) {
      res
        .status(403)
        .json({ message: "You are already registered on this platform!" });
    } else {
      //not a registered engineer, proceed to register
      const newEngineer = await new Engineers(req.body);
      const engineer = newEngineer.save();
      const engineerBackup = await new EngineerBackup(req.body);
      const engr = engineerBackup.save();
      res.status(200).json({ message: "Registration successful!" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Connection error!",
    });
  }
});

//get all engineers
router.get("/engineers/all", async (req, res) => {
  try {
    const engrs = await EngineerBackup.find();
    if (engrs) {
      res.status(200).json(engrs);
    } else {
      res.status(404).json({ message: "No record found!" });
    }
  } catch (err) {
    res.status(500).json({ message: "Coonection Error!" });
  }
});

//get an engineer by location
router.get("/engineer", async (req, res) => {
  try {
    const country = await Engineers.find({ country: req.query.country });
    const state = await Engineers.find({ state: req.query.state });
    const town = await Engineers.find({ town: req.query.town });
    const city = await Engineers.find({ city: req.query.city });
    const address = await Engineers.find({ address: req.query.address });
    if (req.query.country && country.length > 0) {
      res.status(200).json(country);
    } else if (req.query.state && state.length > 0) {
      res.status(200).json(state);
    } else if (req.query.town && town.length > 0) {
      res.status(200).json(town);
    } else if (req.query.city && city.length > 0) {
      res.status(200).json(city);
    } else if (req.query.address && address.length > 0) {
      res.status(200).json(address);
    } else {
      res.status(404).json({
        result: "not-found",
        message: "Engineer not found in your current location",
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "connection error",
    });
  }
});

//edit an engineer by admin
router.put("/engineer/edit/:email", async (req, res) => {
  const admin = await Admin.findById(req.body.adminId);
  if (admin) {
    try {
      const engineer = await Engineers.findOneAndUpdate(
        { email: req.params.email },
        { $set: req.body },
        { new: true }
      );
      const engineerBackup = await Engineers.findOneAndUpdate(
        { email: req.params.email },
        { $set: req.body },
        { new: true }
      );
      if (engineer && engineerBackup) {
        res.status(200).json({ message: "Engineer updated successfully!" });
      } else {
        res.status(404).json({ message: "Engineer not found" });
      }
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "connection error" });
    }
  } else {
    res.status(403).json({
      message: "You are not allowed to perform this operation",
    });
  }
});

//permanently delete an engineer by an admin
router.delete("/engineer/delete/:email", async (req, res) => {
  const admin = await Admin.findById(req.body.adminId);
  if (admin) {
    try {
      //check if engineer is active in main schema before performing operation
      const engineer = await Engineers.findOne({
        email: req.params.email,
      });
      if (engineer) {
        res.status(400).json({
          message:
            "Operation cannot be performed, Engineer is in an active state.",
        });
      } else {
        //engineer is in inactive state already, so can grant request
        const engineerBackup = await EngineerBackup.findOneAndDelete({
          email: req.params.email,
        });
        if (engineerBackup) {
          res.status(200).json({ message: "Engineer deleted successfully" });
        } else {
          res.status(404).json({
            message: "Engineer not found! Probably been deleted before",
          });
        }
      }
    } catch (err) {
      res.status(500).json({
        message: "connection error!",
      });
    }
  } else {
    res
      .status(403)
      .json({ message: "You are not allowed to perform this operation!" });
  }
});

//remove an engineer when isActive is false
router.put("/remove/:email", async (req, res) => {
  //check if it is admin trying to perform operation
  const admin = await Admin.findById(req.body.adminId);
  if (admin) {
    //proceed if it is admin
    try {
      //find an engineer from the main engineer schema and remove
      const engr = await Engineers.findOneAndRemove({
        email: req.params.email,
      });
      const engrBkup = await EngineerBackup.findOneAndUpdate(
        //update the engineer backup schema from active state to inactive state
        { email: req.params.email },
        { $set: req.body },
        { new: true }
      );
      if (!engr && !engrBkup.isActive) {
        //engineer no longer present in engineer main schema and isActive is false in backup schema
        res
          .status(201)
          .json({ message: "Engineer is in inactive state already." });
      } else {
        engrBkup.isActive = false;
        res.status(200).json({ message: "Success!" });
      }
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "Connection Error!" });
    }
  } else {
    res
      .status(403)
      .json({ message: "You are not allowed to perform this operation" });
  }
});

//restore back an engineer after reactivation
router.post("/restore/:email", async (req, res) => {
  //check if it is admin trying to perfoorm this  operation
  const admin = await Admin.findById(req.body.adminId);
  if (admin) {
    //proceed to perform operation if it is admin
    try {
      //checking if engineer is available in backup schema
      const engr = await EngineerBackup.findOneAndUpdate(
        { email: req.params.email },
        { $set: req.body },
        { new: true }
      );
      if (engr) {
        //engineer is available in backup schema, proceed and then destructure engineer details to avoid conflict of id
        const { _id, ...other } = engr._doc;
        //check if the engineer we are trying to restore is in engineer main schema already
        const engineerActive = await Engineers.findOne({
          email: req.params.email,
        });
        if (!engineerActive) {
          //proceed to restore if engineer isn't present in the main schema
          const restore = await new Engineers((req.body = other));
          const restoredEngr = restore.save();
          res.status(200).json({ message: "Engineer Restored!" });
        } else {
          //engineer is active in main engineer scheme, can't perform operation
          res.status(201).json({ message: "Engineer is active!" });
        }
      } else {
        //engineer not found in backup schema
        res.status(404).json({ message: "Enginner not found!" });
      }
    } catch (err) {
      res.status(500).json({ message: "Connection Error!" });
    }
  } else {
    //not an admin? not permitted to perform operation
    res
      .status(403)
      .json({ message: "You are not allowed to perform this operation!" });
  }
});

//get single engr details
router.get("/engineer/one/:email", async (req, res) => {
  try {
    const engr = await EngineerBackup.findOne({ email: req.params.email });
    if (!engr) {
      res.status(404).json({ message: "Engineer not Found!" });
    } else {
      res.status(200).json(engr);
    }
  } catch (err) {
    res.status(500).json({ message: "Connection Error!" });
  }
});

module.exports = router;

/**
 * Centralized Model Registry
 * This file ensures models are only defined once to prevent OverwriteModelError
 */

const mongoose = require("mongoose");

// Import model schemas/definitions
const studentModelDefinition = require("../users/admin/student/models/studentModels");
const adminModelDefinition = require("../modules/admin/models/Admin");
const pendingStudentDefinition = require("../modules/student/models/PendingStudent");
const GameRoom = require("./GameRoom");

// Export the models - Mongoose will use existing models if already compiled
module.exports = {
  Student: studentModelDefinition,
  Admin: adminModelDefinition,
  PendingStudent: pendingStudentDefinition,
  GameRoom: GameRoom,
};

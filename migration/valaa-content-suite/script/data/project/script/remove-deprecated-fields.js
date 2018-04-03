"use strict";
const fs = require("fs");
const path = require("path");

const logPath = path.join(__dirname, "..", "dist", "project.event.json");
const eventLog = require(logPath);

console.log("Removing deprecated fields...");

const deprecateds = {
  Scene: {
    CREATED: {
      // actors: "initialState",
      // scale: "initialState",
    },
    MODIFIED: {
      // actors: "sets",
    }
  },
  Actor: {
    CREATED: {
      // actorName: "initialState",
      // animations: "initialState",
    }
  }
};

for (let i = 0; i < eventLog.actions.length; i++) {
  const action = eventLog.actions[i];
  if (deprecateds[action.resourceType] && deprecateds[action.resourceType][action.type]) {
    for (const field in deprecateds[action.resourceType][action.type]) {
      const removeFrom = deprecateds[action.resourceType][action.type][field];
      console.log("delete", action.resourceType, removeFrom, field);
      if (removeFrom) delete action[removeFrom][field];
    }
  }
}

fs.writeFileSync(logPath, JSON.stringify(eventLog, null, 2));
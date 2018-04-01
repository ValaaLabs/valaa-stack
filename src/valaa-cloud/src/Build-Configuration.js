const config = require("../config.json");

module.exports = {
  Configuration: function Configuration () {
    const environment = (process.env.NODE_ENV) ? process.env.NODE_ENV : "development";
    return config[environment];
  }
};

// export const FIRST_EVENT_ID = -1;

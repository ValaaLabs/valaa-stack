import config from "../config.json";

export default function Configuration () {
  const environment = (process.env.NODE_ENV) ? process.env.NODE_ENV : "development";
  return config[environment];
}

export const FIRST_EVENT_ID = -1;

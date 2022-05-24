const fs = require("fs");
const {toCustomDateString} = require('../util/utils')

exports.logger = (...params) => {
  const d = new Date();
  let logText = `\n-------${d.toLocaleString()}------\n`;
  for (let i = 0; i < params.length; i++) {
    i > 0 && (logText += ",");
    if ("json,array".indexOf(typeof params[i]) < 0) {
      logText += params[i] + "\n";
    } else {
      logText += JSON.stringify(params[i]) + "\n";
    }
  }
  console.log(logText);
  fs.appendFile(`./logger/${toCustomDateString(d)}.log`, logText, (error) => {
    if (error) throw error;
  });
};
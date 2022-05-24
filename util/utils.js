const { text } = require("cheerio/lib/static");
const schedule = require('node-schedule');
const dbmanager = require("./dbmanager")

exports.toCustomDateString = (d) => {
  return `${d.getFullYear()}-${d.getMonth() < 9 ? "0" : ""}${d.getMonth() + 1
    }-${d.getDate() < 10 ? "0" : ""}${d.getDate()}`;
};


exports.clearText = (val) => {
  if (!val) return '';
  return val.replace(/"/g, '').replace(/\n/g, '').replace(/\t/g, "").replace(/\s+/g, " ").replace(/[^\x00-\x7F]/g, "").trim()
}

exports.clearMemberID = (data) => {
  return parseInt(data.replace(/#/g, ''))
}

exports.clearNationData = (data) => {
  return data.filter(clearSharp)
}

function clearSharp(val) {
  return val != '#'
}

exports.tournamentDateStyle = (val) => {
  let returnVal = this.clearText(val);
  let date = returnVal.split(',')[0];
  let temp = returnVal.split(',')[1].split(' ');
  return `${temp[1]} ${date} ${temp[2].replace('am', ' am').replace('pm', ' pm')} ${temp[3]}`;
}

exports.convertEventType = (val) => {
  let returnVal = ''
  if (val.indexOf('Y-10') >= 0) {
    returnVal += 'Y10'
  }
  if (val.indexOf('Y-12') >= 0) {
    returnVal += 'Y12'
  }
  if (val.indexOf('Y-14') >= 0) {
    returnVal += 'Y14'
  }
  if (val.indexOf('Cadet') >= 0) {
    returnVal += 'CDT'
  }
  if (val.indexOf('Junior') >= 0) {
    returnVal += 'JNR'
  }
  if (val.indexOf('Veteran') >= 0) {
    returnVal += 'VET'
  }
  if (val.indexOf('Div I-A') >= 0) {
    returnVal += 'D1A'
  }
  if (val.indexOf('Div II') >= 0) {
    returnVal += 'DV2'
  }
  if (val.indexOf('Div I') >= 0) {
    returnVal += 'DV1'
  }
  if (val.indexOf('Div III') >= 0) {
    returnVal += 'DV3'
  }

  if (val.indexOf('Vet-40') >= 0) {
    returnVal += 'V40'
  }
  if (val.indexOf('Vet-50') >= 0) {
    returnVal += 'V80'
  }
  if (val.indexOf('Vet-60') >= 0) {
    returnVal += 'V60'
  }
  if (val.indexOf('Vet-70') >= 0) {
    returnVal += 'V70'
  }
  if (val.indexOf('Vet-80') >= 0) {
    returnVal += 'V80'
  }
  if (val.indexOf('Men') >= 0) {
    returnVal += 'M'
  }
  if (val.indexOf('Women') >= 0) {
    returnVal += 'W'
  }
  if (val.indexOf('Foil') >= 0) {
    returnVal += 'F'
  }
  if (val.indexOf('pe') >= 0) {
    returnVal += 'E'
  }
  if (val.indexOf('Saber') >= 0) {
    returnVal += 'S'
  }
  return returnVal
}

exports.isToday = (someDate) => {
  const today = new Date()
  return someDate.getDate() == today.getDate() &&
    someDate.getMonth() == today.getMonth() &&
    someDate.getFullYear() == today.getFullYear()
}

const setDailySchedule = (callback) => {
  callback();
  let result = new Date();
  result.setDate(result.getDate() + 1);
  result.setHours(1);
  result.setMinutes(0);
  const job = schedule.scheduleJob(result, function () {
    setDailySchedule(callback);
  });
}

const setWeeklySchedule = (callback) => {
  callback();
  let result = new Date();
  result.setDate(result.getDate() + 7 - result.getDay());
  result.setHours(3);
  result.setMinutes(0);
  const job = schedule.scheduleJob(result, function () {
    setWeeklySchedule(callback);
  });
}

const setMonthlySchedule = (callback) => {
  callback();
  let result = new Date();
  result.setMonth(result.getMonth() + 1);
  result.setHours(6);
  result.setMinutes(0);
  const job = schedule.scheduleJob(result, function () {
    setMonthlySchedule(callback);
  });
}

exports.setLiveSchedule = async (callback) => {
  if (dbmanager.checkScrapStatus('member') && await dbmanager.checkScrapStatus('club') && await dbmanager.checkScrapStatus('tournament')) {
    await callback();
  }
  setTimeout(() => {
    this.setLiveSchedule(callback)
  }, 1000 * 60 * 1);
}

exports.setDailySchedule = setDailySchedule;
exports.setWeeklySchedule = setWeeklySchedule;
exports.setMonthlySchedule = setMonthlySchedule;

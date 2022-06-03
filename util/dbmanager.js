const mysql = require('mysql');
const { logger } = require('../logger');

// var con = mysql.createPool({
//   connectionLimit: 10,
//   host: "localhost",
//   user: "root",
//   password: "root",
//   database: "01_web_scrapping",
//   multipleStatements: true,
// });

var con = mysql.createPool({
  connectionLimit: 10,
  host: "localhost",
  user: "root",
  password: "root",
  database: "01_web_scrapping",
  multipleStatements: true,
});

// con.connect(function (err) {
//   if (err) {
//     connectState = false;
//     logger(err)
//     throw err;
//   }
//   connectState = true;
//   logger("DB Connected!");
// });
module.exports.isConnected = () => {
  return new Promise((resolve, reject) => {
    con.getConnection(function (err, connection) {
      if (!err)
        console.log('db connected')
      resolve(!err);
    });
  })
}

module.exports.updateClubTournament = async (data) => {
  return new Promise((resolve, reject) => {
    let sql = `Select * from club_tournament_list where tournament_id = '${data.tournament_id}' AND club_id = '${data.club_id}'`
    con.query(sql, function (err, result, fields) {
      if (err) throw err;
      if (result.length == 0) {
        sql = `Insert into club_tournament_list (club_id, tournament_id, status) VALUES (?,?,?)`
        con.query(sql, Object.values(data), function (err, result, fields) {
          if (err) throw err;
          resolve()
        })
      }
      else {
        if (result[0].status != data.status) {
          con.query(`update club_tournament_list set status=? where id='${result[0].id}'`, [data.status], function (err, result2, fields) {
            if (err) throw err;
            resolve()
          })
        }
        else {
          resolve();
        }
      }
    })
  })
}

module.exports.updateClubTournamentEvent = async (data) => {
  return new Promise((resolve, reject) => {
    let sql = `Select * from club_event_list where event_id = '${data.event_id}' AND club_id = '${data.club_id}'`
    con.query(sql, function (err, result, fields) {
      if (err) throw err;
      if (result.length == 0) {
        sql = `Insert into club_event_list (club_id, tournament_id, event_id, event_data) VALUES (?,?,?,?)`
        con.query(sql, Object.values(data), function (err, result, fields) {
          if (err) throw err;
          resolve()
        })
      }
      else {
        if (result[0].event_data != data.event_data) {
          con.query(`update club_event_list set event_data=? where id='${result[0].id}'`, [data.event_data], function (err, result2, fields) {
            if (err) throw err;
            resolve()
          })
        }
        else {
          resolve()
        }
      }
    })
  })
}

module.exports.updateClubGradeList = async (club_id, data) => {
  return new Promise((resolve, reject) => {
    let sql = `Select * from club_grade_list where club_id = '${club_id}'`
    con.query(sql, function (err, result, fields) {
      if (err) throw err;
      if (result.length == 0) {
        sql = `Insert into club_grade_list (club_id, grade_data) VALUES (?,?)`
        con.query(sql, [club_id, JSON.stringify(data)], function (err, result, fields) {
          if (err) throw err;
          resolve()
        })
      }
      else {
        con.query(`update club_grade_list set grade_data=? where club_id='${club_id}'`, JSON.stringify(data), function (err, result2, fields) {
          if (err) throw err;
          resolve()
        })
      }
    })
  })
}

module.exports.updateEligibleList = async (data) => {
  return new Promise((resolve, reject) => {
    let sql = `Select * from eligible_list where member_id = ? and season = ?`
    con.query(sql, [data.member_id, data.this_season], function (err, result, fields) {
      if (err) throw err;
      if (result.length == 0) {
        sql = `Insert into eligible_list (member_id, event_type, season, event_short_type) VALUES (?,?,?,?)`
        con.query(sql, Object.values(data), function (err, result, fields) {
          if (err) throw err;
          resolve()
        })
      }
      else {
        con.query(`update eligible_list set member_id=?, event_type=?,season=?,event_short_type=? where id=${result[0].id}`, Object.values(data), function (err, result2, fields) {
          if (err) throw err;
          resolve()
        })
      }
    })
  })
}

module.exports.insertTournamentNotification = async (data) => {
  return new Promise((resolve, reject) => {
    let sql = `Insert into notification_list (object_id, content, alert_time, sub_type, type) VALUES (?,?,?,?,'tournament')`
    con.query(sql, Object.values(data), function (err, result, fields) {
      if (err) throw err;
      resolve()
    })
  })
}

const updateScrapStatus = async (type, val) => {
  return new Promise((resolve, reject) => {
    let sql = `Select * from constant_list`
    con.query(sql, function (err, result, fields) {
      if (err) throw err;
      if (result.length == 0) {
        sql = `Insert into constant_list (${type}_update) VALUES (${val})`
        con.query(sql, function (err, result, fields) {
          if (err) throw err;
          resolve()
        })
      }
      else {
        con.query(`update constant_list set ${type}_update = ${val}`, function (err, result2, fields) {
          if (err) throw err;
          resolve()
        })
      }
    })
  })
}

module.exports.updateScrapStatus = updateScrapStatus;

module.exports.checkScrapStatus = async (type) => {
  return new Promise((resolve, reject) => {
    let sql = `Select * from constant_list;`
    con.query(sql, async function (err, result, fields) {
      if (err) throw err;
      if (result.length > 0) {
        resolve(result[0][`${type}_update`])
      }
      else {
        resolve(0)
      }
    })
  })
}

module.exports.resetScrapStatus = async (type) => {
  return new Promise((resolve, reject) => {
    let sql = `update constant_list set ${type}_update = 0 where ${type}_update = 3`
    con.query(sql, async function (err, result, fields) {
      if (err) throw err;
      resolve()
    })
  })
}

module.exports.runQuery = async (sql) => {
  return new Promise((resolve, reject) => {
    con.query(sql, async function (err, result, fields) {
      if (err) throw err;
      resolve(result)
    })
  })
}

module.exports.runQuery = async (sql, data) => {
  return new Promise((resolve, reject) => {
    con.query(sql, data, async function (err, result, fields) {
      if (err) throw err;
      resolve(result)
    })
  })
}

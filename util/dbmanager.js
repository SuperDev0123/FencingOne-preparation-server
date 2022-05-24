const mysql = require('mysql');
const { logger } = require('../logger');

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

module.exports.updateMemberList = async (memberList) => {
  let databasePromises = [];
  memberList.forEach(element => {
    databasePromises.push(new Promise((resolve, reject) => {
      Object.keys(element).forEach(key => {
        if (element[key] == 'Yes') element[key] = 1;
        if (element[key] == 'No') element[key] = 0;
        if (key == 'Expiration' || key == 'Updated At' || key == 'Last Modified') {
          element[key] = new Date(element[key])
        }
        if (typeof element[key] == 'string' && element[key].trim() == "'") {
          element[key] = ''
        }
      })
      con.query(`select * from member_list where id = ?`, [element['Member #']], function (err, result, fields) {
        if (err) throw err;
        let sql = ''
        if (result.length == 0) {
          sql = `INSERT INTO member_list (last_name, first_name, middle_name, suffix, nickname, gender,birth_date, birth_date_verified, division, section, club_one_name, club_one_abbreviation, club_one_id,club_two_name, club_two_abbreviation, club_two_id, school_name, school_abbreviation, school_id, id, member_type,check_ed, competitive, expiration, saber, epee, foil, us_citizen, permanent_resident, representing_country,region, background_check_expires, safesport_expires, noncomp_eligible, referee_highest_usa_rating_earned,referee_usa_rating_foil,referee_usa_year_foil, referee_usa_rating_epee,referee_usa_year_epee,referee_usa_rating_saber,referee_usa_year_saber, referee_fie_rating_foil,referee_fie_year_foil,referee_fie_rating_epee,referee_fie_year_epee, referee_fie_rating_saber,referee_fie_year_saber,updated_at, last_modified) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
        }
        else {
          sql = `Update member_list set last_name = ?, first_name = ?, middle_name = ?, suffix = ?, nickname = ?, gender = ?,birth_date = ?, birth_date_verified = ?, division = ?, section = ?, club_one_name = ?, club_one_abbreviation = ?, club_one_id = ?,club_two_name = ?, club_two_abbreviation = ?, club_two_id = ?, school_name = ?, school_abbreviation = ?, school_id = ?, id = ?, member_type = ?,check_ed = ?, competitive = ?, expiration = ?, saber = ?, epee = ?, foil = ?, us_citizen = ?, permanent_resident = ?, representing_country = ?,region = ?, background_check_expires = ?, safesport_expires = ?, noncomp_eligible = ?, referee_highest_usa_rating_earned = ?,referee_usa_rating_foil = ?,referee_usa_year_foil = ?, referee_usa_rating_epee = ?,referee_usa_year_epee = ?,referee_usa_rating_saber = ?,referee_usa_year_saber = ?, referee_fie_rating_foil = ?,referee_fie_year_foil = ?,referee_fie_rating_epee = ?,referee_fie_year_epee = ?, referee_fie_rating_saber = ?,referee_fie_year_saber = ?,updated_at = ?, last_modified = ? where id = '${result[0].id}'`
        }
        con.query(sql, Object.values(element), function (err, result, fields) {
          if (err) throw err;
          resolve()
        })
      })
    }));
  });
  await Promise.all(databasePromises);
}

module.exports.updateTournamentList = async (tournamentData) => {
  return new Promise((resolve, reject) => {
    let sql = `Select * from tournament_list where name = ? and venue = ? and date = ? and location = ? and type = ?`
    let sqlData = { ...tournamentData }
    delete sqlData.isComplete
    con.query(sql, Object.values(sqlData), function (err, result, fields) {
      if (err) throw err;
      if (result.length == 0) {
        con.query('insert into tournament_list (name, venue, is_complete, date, location, type, url, registration_open, entry_deadline, late_entry_deadline, tournament_start, tournament_end, season) Values (?,?,?,?,?,?,?,?,?,?,?,?,?)', Object.values(tournamentData), function (err, result, fields) {
          if (err) throw err;
          resolve({ update: true, tournament_id: result.insertId })
        })
      }
      else {
        let isComplete = result[0].is_complete
        if (isComplete == 1 && tournamentData.isComplete == 1) {
          resolve({ update: false })
        }
        else {
          con.query(`update tournament_list set name=?, venue=?, is_complete=?, date=?, location=?, type=?, url=?, registration_open=?, entry_deadline=?, late_entry_deadline=?, tournament_start=?, tournament_end=?, season=? where id='${result[0].id}'`, Object.values(tournamentData), function (err, result2, fields) {
            if (err) throw err;
            resolve({ update: true, tournament_id: result[0].id })
          })
        }
      }
    })
  })
}

module.exports.updateThisSeason = (season) => {
  return new Promise((resolve, reject) => {
    let sql = `Select this_season from constant_list`
    con.query(sql, [season, season], function (err, result, fields) {
      if (err) throw err;
      if (result.length == 0) {
        sql = `insert into constant_list (this_season) Values('${season}')`
      }
      else {
        if (!result[0].this_season || result[0].this_season < season) {
          sql = `update constant_list set this_season = '${season}'`
        }
        else {
          resolve();
          return;
        }
      }
      con.query(sql, function (err, result, fields) {
        if (err) throw err;
        resolve();
      })
    })
  })
}

module.exports.updateTournamentEventList = async (eventData) => {
  return new Promise((resolve, reject) => {
    let sql = `Select * from event_list where event_id = '${eventData.event_id}'`
    con.query(sql, function (err, result, fields) {
      if (err) throw err;
      if (result.length == 0) {
        con.query('insert into event_list (tournament_id, event_id, event_name, event_time, event_possible_rating, event_type, open_spots) Values (?,?,?,?,?,?,?)', Object.values(eventData), function (err, result, fields) {
          if (err) throw err;
          resolve()
        })
      }
      else {
        con.query(`update event_list set tournament_id=?, event_id=?, event_name=?, event_time=?, event_possible_rating=?, event_type=?, open_spots=? where event_id='${eventData.event_id}'`, Object.values(eventData), function (err, result, fields) {
          if (err) throw err;
          resolve()
        })
      }
    })
  })
}

module.exports.updateEntrantList = async (event_id, tournament_id, entrantData) => {
  let databasePromises = [];
  entrantData.forEach(element => {
    databasePromises.push(new Promise((resolve, reject) => {
      let sql = `select * from event_entrant_list where event_id = '${event_id}' and member_id = '${element['ID']}';select * from tournament_register_list where tournament_id = '${tournament_id}' and member_id = '${element['ID']}'`
      con.query(sql, function (err, result, fields) {
        if (err) throw err;
        if (result[0].length == 0) {
          element['member_id'] = element['ID'];
          delete element['ID']
          con.query(`insert into event_entrant_list (club, division, name, approve, member_id, event_id) Values (?,?,?,?,?,'${event_id}')`, Object.values(element), function (err, res, fields) {
            if (err) throw err;
            if (result[1].length == 0) {
              con.query(`insert into tournament_register_list (member_id, tournament_id) Values ('${element['member_id']}','${tournament_id}')`, function (err, res, fields) {
                if (err) throw err;
                resolve();
              })
            } else {
              resolve()
            }
          });
        }
        else {
          resolve();
        }
      })
    }))
  });
  databasePromises.push(new Promise((resolve, reject) => {
    let sql = `update event_list set register_num = ${entrantData.length} where event_id = '${event_id}'`
    con.query(sql, function (err, result, fields) {
      if (err) throw err;
      resolve();
    })
  }))
  await Promise.all(databasePromises)
}

module.exports.updateResultList = async (event_id, resultData) => {
  let databasePromises = [];
  resultData.forEach(element => {
    databasePromises.push(new Promise((resolve, reject) => {
      let sql = `select * from event_result_list where event_id = '${event_id}' and member_id = '${element['ID']}'`
      con.query(sql, function (err, result, fields) {
        if (err) throw err;
        if (result.length == 0) {
          element['member_id'] = element['ID'];
          delete element['ID']
          con.query(`insert into event_result_list (club, division, ranks, name, member_id, event_id) Values (?,?,?,?,?,'${event_id}')`, Object.values(element), function (err, result, fields) {
            if (err) throw err;
            resolve()
          });
        }
        else {
          resolve();
        }
      })
    }))
  });
  await Promise.all(databasePromises)
}

module.exports.updateRegionalPointList = async (regionalData, rankData = null) => {
  return new Promise((resolve, reject) => {
    if (rankData == null) {
      let sql = `Delete from regional_point_list where age = ? and gender = ? and weapon = ? and qualifying_tournament = ? and region = ?`
      con.query(sql, Object.values(regionalData), function (err, result, fields) {
        if (err) throw err;
        resolve()
      })
    }
    else {
      let sql = `Insert into regional_point_list (age, gender, weapon, qualifying_tournament, region, ranks, points, name, member_id, birth_date, division, club, place) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
      con.query(sql, Object.values({ ...regionalData, ...rankData }), function (err, result, fields) {
        if (err) throw err;
        resolve()
      })
    }
  })
}

module.exports.updateNationalPointList = async (grade, age, nationalData) => {
  return new Promise((resolve, reject) => {
    let sql = `Delete from national_point_list where age = '${age}' and grade = '${grade}'`
    con.query(sql, async function (err, result, fields) {
      if (err) throw err;
      let databasePromises = [];
      nationalData.forEach((element, index) => {
        if (/^[0-9]/.test(element.Rank)) {
          databasePromises.push(new Promise((resolve, reject) => {
            let sql = `INSERT into national_point_list (grade, age, ranks, athlete, birth_date, points, member_id, place) VALUES(?,?,?,?,?,?,(SELECT id FROM member_list WHERE LOCATE(first_name, ?) > 0 AND LOCATE(last_name, ?) > 0 AND birth_date = ? LIMIT 1),?)`
            con.query(sql, [grade, age, element.Rank, element.Athlete, element.Born, element.Points, element.Athlete, element.Athlete, element.Born, (index + 1)], function (err, result, fields) {
              if (err) throw err;
              resolve();
            })
          }))
        }
      });
      await Promise.all(databasePromises)
      resolve()
    })
  })
}

module.exports.getEventFromName = async (event_type, event_date, tournament_id) => {
  return new Promise((resolve, reject) => {
    let sql = `Select * from event_list where tournament_id = ? AND event_type = ?`
    con.query(sql, [tournament_id, event_type], function (err, result, fields) {
      if (err) throw err;
      if (result.length > 0) {
        sql = `Update event_list set event_date = ? where tournament_id = ? AND event_type = ?`
        con.query(sql, [event_date, tournament_id, event_type], function (err, result1, fields) {
          if (err) throw err;
          resolve(result[0])
        })
      }
      else {
        resolve({ event_id: 0, status: 0 })
      }
    })
  })
}

module.exports.updateScheduleList = async (scheduleData) => {
  return new Promise((resolve, reject) => {
    let sql = `Select * from schedule_list where id = '${scheduleData.id}'`
    con.query(sql, function (err, result, fields) {
      if (err) throw err;
      if (result.length == 0) {
        con.query('insert into schedule_list (date, tournament_id, id, start_time, name, status, start_date, event_id, event_type) Values (?,?,?,?,?,?,?,?,?)', Object.values(scheduleData), function (err, result, fields) {
          if (err) throw err;
          resolve(0)
        })
      }
      else {
        con.query(`update schedule_list set date=?, tournament_id=?, id=?, start_time=?, name=?, status=?, start_date=?, event_id=?, event_type=? where id='${result[0].id}'`, Object.values(scheduleData), function (err, result2, fields) {
          if (err) throw err;
          resolve(result[0].event_id)
        })
      }
    })
  })
}

module.exports.updateFencerList = async (schedule_id, fencer_list) => {
  let databasePromises = [];
  fencer_list.forEach(fencerData => {
    if (Object.keys(fencerData).length == 7) {
      databasePromises.push(new Promise((resolve, reject) => {
        let sql = `Select * from fencer_list where schedule_id = ? and name = ?`
        con.query(sql, [schedule_id, fencerData.Name], function (err, result, fields) {
          if (err) throw err;
          if (result.length > 0) {
            sql = `update fencer_list set status=?, name=?, club=?, division=?, country=?, class=?, ranks=?, schedule_id='${schedule_id}' where id = ${result[0].id}`
            con.query(sql, Object.values(fencerData), function (err, result, fields) {
              if (err) throw err;
              resolve()
            })
          }
          else {
            sql = `Insert into fencer_list (status, name, club, division, country, class, ranks, schedule_id) VALUES (?,?,?,?,?,?,?,'${schedule_id}')`
            con.query(sql, Object.values(fencerData), function (err, result, fields) {
              if (err) throw err;
              resolve()
            })
          }
        })
      }))
    }
  });
  await Promise.all(databasePromises)
}

module.exports.updatePoolDataList = async (data) => {
  return new Promise((resolve, reject) => {
    let sql = `Select * from pool_data_list where schedule_id = ? and pool_id = ? and name = ?`
    con.query(sql, [data.schedule_id, data.pool_id, data.name], function (err, result, fields) {
      if (err) throw err;
      if (result.length > 0) {
        sql = `Update pool_data_list set pool_id=?, schedule_id=?, tournament_id=?, event_id=?, name=?, result=?, win=?, win_rate=?, total_score=?, total_lost=?, indicator=?, place=? where id=${result[0].id}`
        con.query(sql, Object.values(data), function (err, result, fields) {
          if (err) throw err;
          resolve()
        })
      }
      else {
        sql = `Insert into pool_data_list (pool_id, schedule_id, tournament_id, event_id, name, result, win, win_rate, total_score, total_lost, indicator, place, member_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,(SELECT id FROM member_list WHERE LOCATE(first_name, ?) > 0 AND LOCATE(last_name, ?) > 0 LIMIT 1))`
        con.query(sql, [...Object.values(data), data.name, data.name], function (err, result, fields) {
          if (err) throw err;
          resolve()
        })
      }
    })
  })
}


module.exports.updatePoolBoutOrderList = async (data) => {
  return new Promise(async (resolve, reject) => {
    let databasePromises = [];
    data.forEach((element, index) => {
      databasePromises.push(new Promise((resolve, reject) => {
        let sql = `select * from bout_order_list where schedule_id = '${element.schedule_id}' and pool_id = '${element.pool_id}' and place='${element.place}'`
        con.query(sql, function (err, result, fields) {
          if (err) throw err;
          if (result.length > 0) {
            sql = `update bout_order_list set pool_id=?, schedule_id=?, event_id=?, tournament_id=?, member_one_number=?, member_one=?, member_one_result=?, member_two_result=?, member_two=?, member_two_number=?, place=?, member_one_id=(SELECT id FROM member_list WHERE LOCATE(first_name, ?) > 0 AND LOCATE(last_name, ?) > 0 LIMIT 1), member_two_id=(SELECT id FROM member_list WHERE LOCATE(first_name, ?) > 0 AND LOCATE(last_name, ?) > 0 LIMIT 1) where id='${result[0].id}'`
            con.query(sql, [...Object.values(element), element.member_one, element.member_one, element.member_two, element.member_two], function (err, result, fields) {
              if (err) throw err;
              resolve()
            })
          }
          else {
            sql = `INSERT into bout_order_list (pool_id, schedule_id, event_id, tournament_id, member_one_number, member_one, member_one_result, member_two_result, member_two, member_two_number, place, member_one_id, member_two_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,(SELECT id FROM member_list WHERE LOCATE(first_name, ?) > 0 AND LOCATE(last_name, ?) > 0 LIMIT 1),(SELECT id FROM member_list WHERE LOCATE(first_name, ?) > 0 AND LOCATE(last_name, ?) > 0 LIMIT 1))`
            con.query(sql, [...Object.values(element), element.member_one, element.member_one, element.member_two, element.member_two], function (err, result, fields) {
              if (err) throw err;
              resolve()
            })
          }
        })
      }))
    });
    await Promise.all(databasePromises)
    resolve()
  })
}


module.exports.updatePoolResultList = async ({ schedule_id, event_id, tournament_id }, pool_result_list) => {
  let databasePromises = [];
  pool_result_list.forEach((pool_result, index) => {
    if (Object.keys(pool_result).length == 12) {
      databasePromises.push(new Promise((resolve, reject) => {

        let sql = `select * from pool_result_list where schedule_id = '${schedule_id}' and place = ${index + 1}`
        con.query(sql, function (err, result, fields) {
          if (err) throw err;
          if (result.length > 0) {
            resolve()
            return;
          }
          else {
            sql = `Insert into pool_result_list (ranks, name, win, games, win_rate, total_score, total_lost, indicator, fencer_status, clubs, division, country, schedule_id, event_id, tournament_id, place, member_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,(SELECT id FROM member_list WHERE LOCATE(first_name, ?) > 0 AND LOCATE(last_name, ?) > 0 LIMIT 1))`
            con.query(sql, [...Object.values(pool_result), schedule_id, event_id, tournament_id, index + 1, pool_result.Name, pool_result.Name], function (err, result, fields) {
              if (err) throw err;
              resolve()
            })
          }
        })
      }))
    }
  });
  await Promise.all(databasePromises)
}

module.exports.updateScheduleResultList = async ({ schedule_id, event_id, tournament_id }, schedule_result_list) => {
  let databasePromises = [];
  schedule_result_list.forEach((schedule_result, index) => {
    if (Object.keys(schedule_result).length > 6) {
      databasePromises.push(new Promise((resolve, reject) => {

        let sql = `select * from schedule_result_list where schedule_id = '${schedule_id}' and place = ${index + 1}`
        con.query(sql, function (err, result, fields) {
          if (err) throw err;
          if (result.length > 0) {
            resolve()
            return;
          }
          else {
            sql = `Insert into schedule_result_list (ranks, name, clubs, division, country, class, earned, schedule_id, event_id, tournament_id, place, member_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,(SELECT id FROM member_list WHERE LOCATE(first_name, ?) > 0 AND LOCATE(last_name, ?) > 0 LIMIT 1))`
            con.query(sql, [...Object.values(schedule_result).slice(0, 7), schedule_id, event_id, tournament_id, index + 1, schedule_result.Name, schedule_result.Name], function (err, result, fields) {
              if (err) throw err;
              resolve()
            })
          }
        })
      }))
    }
  });
  await Promise.all(databasePromises)
}

module.exports.updateTableauList = async (data) => {
  if (Object.keys(data).length == 9) {
    return new Promise((resolve, reject) => {

      let sql = `select * from tableau_list where schedule_id = '${data.schedule_id}' and place = ${data.place}`
      con.query(sql, function (err, result, fields) {
        if (err) throw err;
        if (result.length > 0) {
          sql = `update tableau_list set schedule_id=?, event_id=?, tournament_id=?, step=?, player1=?, player2=?, winner=?, score=?, place=?, player1_id=(SELECT id FROM member_list WHERE LOCATE(first_name, ?) > 0 AND LOCATE(last_name, ?) > 0 LIMIT 1), player2_id=(SELECT id FROM member_list WHERE LOCATE(first_name, ?) > 0 AND LOCATE(last_name, ?) > 0 LIMIT 1), winner_id=(SELECT id FROM member_list WHERE LOCATE(first_name, ?) > 0 AND LOCATE(last_name, ?) > 0 LIMIT 1) where id=${result[0].id}`
          con.query(sql, [...Object.values(data), data.player1, data.player1, data.player2, data.player2, data.winner, data.winner], function (err, result, fields) {
            if (err) throw err;
            resolve()
          })
        }
        else {
          sql = `Insert into tableau_list (schedule_id, event_id, tournament_id, step, player1, player2, winner, score, place, player1_id, player2_id, winner_id) VALUES (?,?,?,?,?,?,?,?,?,(SELECT id FROM member_list WHERE LOCATE(first_name, ?) > 0 AND LOCATE(last_name, ?) > 0 LIMIT 1),(SELECT id FROM member_list WHERE LOCATE(first_name, ?) > 0 AND LOCATE(last_name, ?) > 0 LIMIT 1),(SELECT id FROM member_list WHERE LOCATE(first_name, ?) > 0 AND LOCATE(last_name, ?) > 0 LIMIT 1))`
          con.query(sql, [...Object.values(data), data.player1, data.player1, data.player2, data.player2, data.winner, data.winner], function (err, result, fields) {
            if (err) throw err;
            resolve()
          })
        }
      })
    })
  }
}

module.exports.updateClubList = async (data) => {
  return new Promise((resolve, reject) => {
    let sql = `Select * from club_list where id = '${data.id}'`
    con.query(sql, function (err, result, fields) {
      if (err) throw err;
      if (result.length == 0) {
        sql = `Insert into club_list (name, id, address, phone, email, website, region, division) VALUES (?,?,?,?,?,?,?,?)`
        con.query(sql, Object.values(data), function (err, result, fields) {
          if (err) throw err;
          resolve()
        })
      }
      else {
        con.query(`update club_list set name=?, id=?, address=?, phone=?, email=?, website=?, region=?, division=? where id='${result[0].id}'`, Object.values(data), function (err, result2, fields) {
          if (err) throw err;
          resolve()
        })
      }
    })
  })
}

module.exports.getTodayTournament = async () => {
  return new Promise((resolve, reject) => {
    let sql = `SELECT * FROM tournament_list WHERE DATEDIFF(NOW(), tournament_start) >= 0 AND DATEDIFF(NOW(), tournament_end) <= 0`
    con.query(sql, function (err, result, fields) {
      if (err) throw err;
      resolve(result)
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
        // resolve(result[0][`${type}_update`] == 2)
        resolve(result[0][`${type}_update`] == 0)
      }
      else {
        resolve(true)
      }
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

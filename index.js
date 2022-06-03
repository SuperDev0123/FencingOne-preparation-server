process.env.TZ = 'EST';
const axios = require("axios");
const cheerio = require("cheerio");
const https = require("https");
const fs = require("fs");

const moment = require('moment');


const dbmanager = require("./util/dbmanager")
const { logger } = require("./logger");
const util = require("./util/utils");
const { weapons, classes, ages } = require("./util/constants");

const request = (option, callback) => {
  requestTemp({
    url: 'https://hidden-oasis-58034.herokuapp.com/api/test',
    method: 'POST',
    json: { url: option.url }
  }, function (error, response, body) {
    try {
      if (body.error) {
        console.log(body.error)
        throw body.error
      }
      callback(body.error, body.response, body.html);
    }
    catch (err) {
      throw err;
    }
  });
}

var this_season = '';
var member_update = 0;
var club_update = 0;
var tournament_update = 0;
var point_update = 0;

async function updateClubTournamentEvent() {
  return new Promise(async (resolve, reject) => {
    logger('start update club tournament & event')
    const tournamentList = await dbmanager.runQuery(`Select * from tournament_list where is_live_data = 1 and season >= ? and DATEDIFF(NOW(), tournament_end) <= 0`, [this_season])
    // const clubList = await dbmanager.runQuery(`Select * from club_list`)
    for (let i = 0; i < tournamentList.length; i++) {
      const tournamentData = tournamentList[i];
      logger(`check tournament ${tournamentData.name}`)
      let status = tournamentData.is_complete == 1 ? 2 : (new Date(tournamentData.torunament_start) < Date.now ? 0 : 1);
      if (tournament_update != 2 && status == 0) {
        continue;
      }
      const eventList = await dbmanager.runQuery(`Select * from event_list where tournament_id = ?`, [tournamentData.id])
      for (let j = 0; j < eventList.length; j++) {
        const eventData = eventList[j];
        logger(`check tournament ${tournamentData.name} - ${eventData.event_name}`)
        if (status == 2) {
          const result = await dbmanager.runQuery(`select * from club_event_list where event_id = ? `, [eventData.event_id]);
          if (result.length > 0) {
            continue;
          }
        }
        const clubList = await dbmanager.runQuery(`SELECT club_one_id club_0, club_two_id club_1 FROM event_entrant_list eel LEFT JOIN member_list ml ON eel.member_id = ml.id WHERE event_id = ? GROUP BY club_one_id, club_two_id`, [eventData.event_id])
        for (let k = 0; k < clubList.length * 2; k++) {
          const club_id = clubList[Math.floor(k / 2)]['club_' + k % 2];
          if (club_id == null) {
            continue
          }
          if (status == 0) {
            const result = await dbmanager.runQuery(`SELECT Count(*) entrant_count FROM event_entrant_list eel LEFT JOIN member_list ml ON eel.member_id = ml.id WHERE eel.event_id = ? AND (ml.club_one_id = ? OR ml.club_two_id = ?)`, [eventData.event_id, club_id, club_id])
            if (result[0].entrant_count > 0) {
              await dbmanager.updateClubTournament({
                club_id,
                tournament_id: tournamentData.id,
                status
              })
              await dbmanager.updateClubTournamentEvent({
                club_id,
                tournament_id: tournamentData.id,
                event_id: eventData.event_id,
                event_data: JSON.stringify({
                  event_date: eventData.event_date ? moment(new Date(eventData.event_date)).format('YYYY/MM/DD hh:mm A') : '',
                  reg_count: result[0].entrant_count
                })
              })
            }
          }
          else {
            const result = await dbmanager.runQuery(`SELECT srl.ranks, srl.name, srl.earned, srl.member_id FROM schedule_result_list srl LEFT JOIN member_list ml ON srl.member_id = ml.id WHERE srl.event_id = ? AND (ml.club_one_id = ? OR ml.club_two_id = ?)`, [eventData.event_id, club_id, club_id])
            if (result.length > 0) {
              let event_data = result.map(e => { return { place: e.ranks, fencer: e.name, earned: e.earned, member_id: e.member_id } })
              await dbmanager.updateClubTournament({
                club_id,
                tournament_id: tournamentData.id,
                status
              })
              await dbmanager.updateClubTournamentEvent({
                club_id,
                tournament_id: tournamentData.id,
                event_id: eventData.event_id,
                event_data: JSON.stringify(event_data)
              })
            }
          }
        }
      }
    }
    logger('updated club tournament & event successfully')
    resolve()
  });
}

async function updateClubGradeList() {
  if (club_update == 2 && member_update == 2) {
    return new Promise(async (resolve, reject) => {
      await dbmanager.updateScrapStatus('club', 3)
      await dbmanager.updateScrapStatus('member', 3)
      logger('start update club grade')
      const clubList = await dbmanager.runQuery(`Select * from club_list`)
      for (let i = 0; i < clubList.length; i++) {
        const clubData = clubList[i];
        logger(`check ${i + 1}th club ${clubData.name}`)
        let gradeData = {}
        for (let j = 0; j < weapons.length; j++) {
          for (let k = 0; k < classes.length; k++) {
            const result = await dbmanager.runQuery(`select id, first_name, last_name, middle_name, birth_date from member_list where LOCATE('${classes[k]}', ${weapons[j].toLowerCase()}) > 0 AND (club_one_id = ? OR club_two_id = ?)`, [clubData.id, clubData.id]);
            gradeData[`${weapons[j]}-${classes[k]}`] = result.map(e => {
              return { id: e.id, name: `${e.first_name} ${e.last_name}${e.middle_name ? ` , ${e.middle_name}` : ''}`, birthDate: e.birth_date }
            })
          }
        }
        await dbmanager.updateClubGradeList(clubData.id, gradeData)
      }
      logger('updated club grade list successfully')
      resolve()
    });
  }
}

async function updateEligibleList() {
  if (point_update == 2 && member_update == 2) {
    return new Promise(async (resolve, reject) => {
      await dbmanager.updateScrapStatus('point', 3)
      await dbmanager.updateScrapStatus('member', 3)
      logger('start update eligible list')
      const memberList = await dbmanager.runQuery(`Select id, gender, birth_date, saber, epee, foil from member_list`)
      for (let i = 0; i < memberList.length; i++) {
        const memberData = memberList[i];
        logger(`check ${i + 1}th fencer ${memberData.id}`)
        const { gender, id: member_id } = memberData;
        const fencerYear = util.getFencerYear(memberData.birth_date);
        let eligibleData = ''
        for (let j = 0; j < weapons.length; j++) {
          const gradeData = `${gender == 'M' ? 'M' : 'W'}${weapons[j][0]}`;
          const weaponGrade = memberData[weapons[j].toLowerCase()]
          if (fencerYear >= 8 && fencerYear <= 11) {
            eligibleData += `Y10${gradeData},`
          }
          if ((fencerYear >= 10 && fencerYear <= 13) || (fencerYear < 10 && await isExistGradePoint('Y10', gradeData, member_id))) {
            eligibleData += `Y12${gradeData},`
          }
          if ((fencerYear >= 12 && fencerYear <= 15) || (fencerYear < 12 && await isExistGradePoint('Y12', gradeData, member_id))) {
            eligibleData += `Y14${gradeData},`
          }
          if ((fencerYear >= 14 && fencerYear <= 17) || (fencerYear < 14 && await isExistGradePoint('Y14', gradeData, member_id))) {
            eligibleData += `CDT${gradeData},`
          }
          if ((fencerYear >= 14 && fencerYear <= 20) || (fencerYear < 14 && await isExistGradePoint('Cdt', gradeData, member_id))) {
            eligibleData += `JNR${gradeData},`
          }
          if ((fencerYear >= 14 && fencerYear < 40) || await isExistGradePoint('Jr', gradeData, member_id)) {
            eligibleData += `D1A${gradeData},`
          }
          if ((fencerYear < 40 && weaponGrade < 'D') && (fencerYear >= 14 || await isExistGradePoint('Jr', gradeData, member_id))) {
            eligibleData += `DV1${gradeData},`
          }
          if ((fencerYear < 40 && weaponGrade >= 'C') && (fencerYear >= 14 || await isExistGradePoint('Jr', gradeData, member_id))) {
            eligibleData += `DV2${gradeData},`
          }
          if ((fencerYear < 40 && weaponGrade >= 'D') && (fencerYear >= 14 || await isExistGradePoint('Jr', gradeData, member_id))) {
            eligibleData += `DV3${gradeData},`
          }
          if (fencerYear >= 40 && fencerYear <= 49) {
            eligibleData += `V40${gradeData},`
          }
          if (fencerYear >= 50 && fencerYear <= 59) {
            eligibleData += `V50${gradeData},`
          }
          if (fencerYear >= 60 && fencerYear <= 69) {
            eligibleData += `V60${gradeData},`
          }
          if (fencerYear >= 70 && fencerYear <= 79) {
            eligibleData += `V70${gradeData},`
          }
          if (fencerYear >= 80) {
            eligibleData += `V80${gradeData},`
          }
        }
        let shortGrade = ages.filter(e => eligibleData.indexOf(e) >= 0).join(',')
        await dbmanager.updateEligibleList({ member_id, eligibleData, this_season, shortGrade })
      }
      logger('updated eligible list successfully')
      resolve()
    });
  }
}

async function updateTournamentNotification() {
  return new Promise(async (resolve, reject) => {
    const isUpdated = await dbmanager.runQuery(`Select count(*) count_num from notification_list where DATEDIFF(alert_time, NOW()) = 0 and type = 'tournament'`)
    if (isUpdated && isUpdated[0].count_num == 0) {
      logger('start update Tournament notification')
      const tournamentList = await dbmanager.runQuery(`SELECT * FROM tournament_list WHERE is_live_data = 1 and DATEDIFF(registration_open, NOW()) = 0 OR DATEDIFF(entry_deadline, NOW()) = 0 OR DATEDIFF(late_entry_deadline, NOW()) = 0 OR DATEDIFF(tournament_start, NOW()) = 0 OR DATEDIFF(tournament_end, NOW()) = 0`)
      for (let i = 0; i < tournamentList.length; i++) {
        const tournamentData = tournamentList[i];
        logger(`check tournament ${tournamentData.name}`)
        if (util.isToday(tournamentData.registration_open)) {
          await dbmanager.insertTournamentNotification({ object_id: tournamentData.id, content: `${tournamentData.name} tournament is open for registration.`, alert_time: tournamentData.registration_open, sub_type: 'eligible' })
        }
        if (util.isToday(tournamentData.entry_deadline)) {
          await dbmanager.insertTournamentNotification({ object_id: tournamentData.id, content: `${tournamentData.name} tournament entry is finished.`, alert_time: tournamentData.entry_deadline, sub_type: 'eligible' })
        }
        if (tournamentData.entry_deadline != tournamentData.late_entry_deadline && util.isToday(tournamentData.late_entry_deadline)) {
          await dbmanager.insertTournamentNotification({ object_id: tournamentData.id, content: `${tournamentData.name} tournament late entry is finished.`, alert_time: tournamentData.late_entry_deadline, sub_type: 'eligible' })
        }
        if (util.isToday(tournamentData.tournament_start)) {
          await dbmanager.insertTournamentNotification({ object_id: tournamentData.id, content: `${tournamentData.name} tournament start now.`, alert_time: tournamentData.tournament_start, sub_type: 'register' })
        }
        if (util.isToday(tournamentData.tournament_end)) {
          await dbmanager.insertTournamentNotification({ object_id: tournamentData.id, content: `${tournamentData.name} tournament is just ended.`, alert_time: tournamentData.tournament_end, sub_type: 'register' })
        }
      }
      logger('updated Tournament notification successfully')
    }
    resolve()
  });
}

async function isExistGradePoint(age, grade, member_id) {
  const result = await dbmanager.runQuery(`select points from national_point_list where age = ? and grade = ? and member_id = ?`, [age, grade, member_id]);
  if (result && result.length > 0 && result[0].points > 0) {
    return true;
  }
  return false;
}

async function updateThisSeason() {
  return new Promise(async (resolve, reject) => {
    logger('start update this season')
    const now = new Date();
    if (now.getMonth() >= 8) {
      this_season = `${now.getFullYear()}-${now.getFullYear() + 1}`
    }
    else {
      this_season = `${now.getFullYear() - 1}-${now.getFullYear()}`
    }
    await dbmanager.runQuery(`update constant_list set this_season=?`, [this_season]);
    logger('updated this season to ' + this_season)
    resolve()
  });
}



async function startPreparation() {
  await updateThisSeason();
  await updateClubGradeList();
  await updateEligibleList();
  await updateTournamentNotification();
  // await updateClubTournamentEvent();
}

async function checkUpdateStatus() {
  member_update = await dbmanager.checkScrapStatus('member')
  club_update = await dbmanager.checkScrapStatus('club')
  tournament_update = await dbmanager.checkScrapStatus('tournament')
  point_update = await dbmanager.checkScrapStatus('point')
}

async function resetUpdateStatus() {
  await dbmanager.resetScrapStatus('member')
  await dbmanager.resetScrapStatus('club')
  await dbmanager.resetScrapStatus('tournament')
  await dbmanager.resetScrapStatus('point')
}

async function init() {
  let dbState = await dbmanager.isConnected();
  if (!dbState) {
    logger('There is error in database connection-------->', '----server off------->')
    return;
  }
  util.setLiveSchedule(async () => {
    await checkUpdateStatus();
    await startPreparation();
    await resetUpdateStatus();
  })
}

init();

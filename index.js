const axios = require("axios");
const cheerio = require("cheerio");
const https = require("https");
const fs = require("fs");
const request = require('request');
// const requestTemp = require('request');
// const request = (option, callback) => {
//   requestTemp({
//     url: 'https://hidden-oasis-58034.herokuapp.com/api/test',
//     method: 'POST',
//     json: { url: option.url }
//   }, function (error, response, body) {
//     try {
//       if(body.error){
//         console.log(body.error)
//         throw body.error
//       }
//       callback(body.error, body.response, body.html);
//     }
//     catch (err) {
//       throw err;
//     }
//   });
// }
const moment = require('moment');


const dbmanager = require("./util/dbmanager")
const { logger } = require("./logger");
const util = require("./util/utils");
const { nationalYoungGrade, nationalYoungAge } = require("./util/constants");

let this_season = '';

async function updateClubTournamentEvent() {
  return new Promise(async (resolve, reject) => {
    logger('update club tournament & event')
    let tournamentList = await dbmanager.runQuery(`Select * from tournament_list where season >= ?`, [this_season])
    let clubList = await dbmanager.runQuery(`Select * from club_list`)
    for(let i = 0; i < tournamentList.length; i++){
      let tournamentData = tournamentList[i];
      let status = tournamentData.is_complete == 1 ? 2 : (new Date(tournamentData.torunament_start) < Date.now ? 0 : 1);
      let eventList = await dbmanager.runQuery(`Select * from event_list where tournament_id = ?`, [tournamentData.id])
      for(let j = 0; j < eventList.length; j++){
        let eventData = eventList[j];
        if(status == 2){
          const result = await dbmanager.runQuery(`select * from club_event_list where event_id = ? `, [eventData.event_id]);
          if(result.length == 0){
            continue;
          }
        }
        for(let k = 0; k < clubList.length; k++){
          let clubData = clubList[k];
          console.log(clubData)
        }
      }
    }
    logger('updated club tournament & event successfully')
  });
}

async function updateThisSeason() {
  return new Promise(async (resolve, reject) => {
    logger('update this season')
    const now = new Date();
    if(now.getMonth() >= 8){
      this_season = `${now.getFullYear()}-${now.getFullYear()+1}`
    }
    else{
      this_season = `${now.getFullYear()-1}-${now.getFullYear()}`
    }
    await dbmanager.runQuery(`update constant_list set this_season=?`, [this_season]);
    logger('updated this season to ' + this_season)
    resolve()
  });
}

async function startPreparation() {
  return new Promise(async (resolve, reject) => {
    await updateThisSeason();
    await updateClubTournamentEvent();
  });
}

async function init() {
  let dbState = await dbmanager.isConnected();
  if (!dbState) {
    logger('There is error in database connection-------->', '----server off------->')
    return;
  }
  util.setLiveSchedule(async () => {
    await startPreparation();
  })
}

init();

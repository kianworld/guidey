const express = require("express");
const request = require("request");
const path = require("path");
const epoq = require("epoq");
// const zlib = require('zlib');
// const deasync = require("deasync");
const https = require("https");
const bodyParser = require("body-parser");
const { write, stat } = require("fs");
const app = express();

var cookieParser = require('cookie-parser');
app.use(cookieParser());

// create application/json parser
var jsonParser = bodyParser.json()
 
// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })

app.set("view engine", "ejs");
// app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('public'));

let token = "";
let errorMsg = "";
let chosenLineup = "";
let lineupArray = [];
let channelListingArray = [];
let programArray = [];
let lineNum = 0;
let imageURL = "";
let imagePoster = [];
let chosenStationID = "";
let chosenStationName = "";
let chosenDate = "";
let today = new Date();
let todayNoTime = today.getFullYear() + '-' + (today.getMonth()+1).toString().padStart(2, "0") + '-' + today.getDate().toString().padStart(2, "0");

// Returns token or error
function callAndFindToken(opt, callback) {
  request(opt, function (error, response) {
    // if (error) throw new Error(error);
    console.log(response.body);
    const tokenData = JSON.parse(response.body);
    if (tokenData.code == 4003)
    {
      errorMsg = "Invalid username or password.";
      return callback(errorMsg);
    }
    else if (tokenData.code == 4004)
    {
      errorMsg = "Too many failed logins. Locked for 15 minutes.";
      return callback(errorMsg);
    }
    else if (tokenData.code == 0)
    {
      token = tokenData.token;
      console.log(token +"request");
      errorMsg = "";
      return callback(token);
    }
    else
    {
      errorMsg = "Something different happened. Check console log.";
      return callback(errorMsg);
    }
  });
};

// Returns whole JSON
function callAndGetStatus(statOpt, callback) {
  request(statOpt, function (error, response) {
    console.log(response.body);
    const statusData = JSON.parse(response.body);
    return callback(statusData);
  })
}

// Returns whole JSON
function callAndGetLineup(chanOpt, callback) {
  request(chanOpt, function (error, response) {
    const lineupData = JSON.parse(response.body);
    return callback(lineupData);
  })
}

// Returns whole JSON
function callAndGetChannel(netOpt, callback) {
  request(netOpt, function (error, response) {
    const networkData = JSON.parse(response.body);
    return callback(networkData);
  })
}

// Returns whole JSON
function callAndGetProgramInfo(progOpt, callback) {
  request(progOpt, function(error, response) {
    const programData = JSON.parse(response.body);
    return callback(programData);
  })
}

// Returns whole JSON
function callAndGetZipCode(zipOpt, callback) {
  request(zipOpt, function(error, response) {
    console.log(response.body);
    const zipData = JSON.parse(response.body);
    return callback(zipData);
  })
}

function addProvider(addOpt, callback) {
  request(addOpt, function (error, response) {
    // if (error) throw new Error(error);
    console.log(response.body);
    const providerData = JSON.parse(response.body);
    if (providerData.code != 0)
    {
      errorMsg = providerData.message;
      return callback(errorMsg);
    }
    else if (providerData.code == 0)
    {
      return callback();
    }
    else
    {
      errorMsg = "Something different happened. Check console log.";
      return callback(errorMsg);
    }
  });
};

function axeProvider(axeOpt, callback) {
  request(axeOpt, function (error, response) {
    // if (error) throw new Error(error);
    console.log(response.body);
    const providerData = JSON.parse(response.body);
    if (providerData.code != 0)
    {
      errorMsg = providerData.message;
      return callback(errorMsg);
    }
    else if (providerData.code == 0)
    {
      return callback();
    }
    else
    {
      errorMsg = "Something different happened. Check console log.";
      return callback(errorMsg);
    }
  });
};

function callAndGetTMDBCall(tmdbOpt, programArr, k) {
  request(tmdbOpt, function(error, response) {
    const tmdbData = JSON.parse(response.body);
    if (tmdbData?.results[0]?.poster_path === undefined || tmdbData.total_results == "0")
    {
      console.log("no poster path");
      imageURL = "image/noimage.jpg";
      programArr[k].program_image = imageURL;
      // imagePoster.push(imageURL);
      // return imageURL;
    }
    else
    {
      imageURL = "https://image.tmdb.org/t/p/w500" + tmdbData.results[0].poster_path;
      console.log("TMBD poster URL: " + imageURL);
      programArr[k].program_image = imageURL;
      // imagePoster.push(imageURL);
      // return imageURL;
    }
    console.log(programArr[k]);
  })
}

function pushToProgramArray(date, choDate, i, j, k, net, program, callback) {
  // Formats a TMDb search 
  var tmdbURL = 'https://api.themoviedb.org/3/search/multi?api_key=48a3c674e3b440b67b081d3f7c62d9eb&query=' + program[k].titles[0].title120;
  console.log(tmdbURL);
  // Options for TMDb search API call, currently unused
  var tmdbOpt = {
    'method': 'GET',
    'url': tmdbURL
  };
  // Declare release date variable
  let releaseDate = "";

  // Declare today/chosen date and sets it to 6am today
  let todaySixAM = new Date(choDate);
  todaySixAM.setDate(todaySixAM.getDate() + 1);
  todaySixAM.setHours(6,0,0,0);

  // Declare tomorrow/day after chosen and sets it to 5:59am tomrorrow
  let tomorrowSixAM = new Date(todaySixAM);
  tomorrowSixAM.setDate(tomorrowSixAM.getDate() + 1);
  tomorrowSixAM.setHours(5,59,0,0);

  console.log(todaySixAM + " " + tomorrowSixAM);

  // Failed attempt at TMDb API call baked into function rather than using other function
  // request(tmdbOpt, function(error, response) {
  //   const tmdbData = JSON.parse(response.body);
  //   if (tmdbData?.results[0]?.poster_path === undefined)
  //   {
  //     console.log("no poster path");
  //     imageURL = "image/noimage.jpg";
  //     // programArray[k].program_image = imageURL;
  //   }
  //   else
  //   {
  //     console.log(tmdbData.results[0].name + " " + tmdbData.results[0].poster_path)
  //     imageURL = "https://image.tmdb.org/t/p/w200" + tmdbData.results[0].poster_path;
  //     console.log("TMBD poster URL: " + imageURL);
  //     // programArray[k].program_image = imageURL;
  //   }
    // programArray.push({
    //   program_time: date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
    //   program_ID: net[i].programs[j].programID,
    //   program_title: program[k].titles[0].title120,
    //   program_eptitle: program[k]?.episodeTitle150,
    //   program_new: net[i].programs[j].new,
    //   program_description: program[k].descriptions,
    //   program_genre: program[k].genres,
    //   program_image: imagePoster[k] 
    // });
  // });

  // If parsed time from API call is before 6am today or after 5:59am tomorrow, ignore
  if (date < todaySixAM || date > tomorrowSixAM)
  {
    console.log("ignored");
  }
  else {
    // If program ID starts with "EP" (episode), look for original air date
    if (net[i].programs[j].programID.slice(0, 2) == "EP")
    {
      releaseDate = program[k].originalAirDate;
    }
    // If program ID starts with "MV" (movie), look for year of release
    else if (net[i].programs[j].programID.slice(0, 2) == "MV")
    {
      releaseDate = program[k].movie.year;
    }

    // Declare new date based off program start time, set time to when program ends based off duration listed in network call 
    let programEnd = new Date(date);
    programEnd.setSeconds(programEnd.getSeconds() + net[i].programs[j].duration);

    // Strip out dashes, semi-colons, and milliseconds in date UMT string, for Google Calendar
    let dateCal = date.toJSON();
    dateCal = dateCal.replaceAll('-', '');
    dateCal = dateCal.replaceAll(':', '');
    dateCal = dateCal.replaceAll('000Z', 'Z');
    
    // Do same for end date UMT string
    let endCal = programEnd.toJSON();
    endCal = endCal.replaceAll('-', '');
    endCal = endCal.replaceAll(':', '');
    endCal = endCal.replaceAll('000Z', 'Z');

    // Push all info to big ol' array
    programArray.push({
      program_time: date,                                                   // Time/date of program
      program_timeCal: dateCal,                                             // Time/date of program, properly converted for Google Cal reminder 
      program_runtime: (net[i].programs[j].duration / 60) + " minutes",     // Runtime of program, made into string
      program_end: programEnd,                                              // End time of program, not really needed on the website
      program_endCal: endCal,                                               // End time of program, Google Calendar friendly
      program_ID: net[i].programs[j].programID,                             // Program ID
      program_title: program[k].titles[0].title120,                         // Program title
      program_eptitle: program[k]?.episodeTitle150,                         // Program episode title, if available
      program_new: net[i].programs[j].new,                                  // Indicator if program is new
      program_description: program[k].descriptions,                         // Program descriptions, if available
      program_genre: program[k].genres,                                     // Genre or genres of programs
      program_releaseDate: releaseDate,                                     // Initial release date
      program_image: "image/noimage.jpg"                                    // Images, currently broken
    });
  }

  
  // callAndGetTMDBCall(tmdbOpt, programArray, k);
  // console.log(programArray[k]);
}

app.get("/", function(req, res) {
  token = req.cookies['tokenCookie'];
  console.log("token cookie in app.get/ " + token);
  if (token === undefined)
  {
    res.render("login");
  }
  else {
    res.redirect("/guide?provider=0");
  }
})

app.get("/logout", function(req, res) {
  res.clearCookie('tokenCookie');
  res.redirect("/");
})

app.post("/", urlencodedParser, function(req, res) {
  // Grab username and password
  var username = req.body.sdUsername;
  var password = req.body.sdPassword;
  // Hash password using SHA1
  var crypto = require('crypto');
  var hashedPass = crypto.createHash('sha1').update(password).digest('hex');
  console.log(password + " " + hashedPass);
  // Info for API call, including user-agent and body
  var options = {
    'method': 'POST',
    'url': 'https://json.schedulesdirect.org/20141201/token',
    'headers': {
      'Content-Type': 'text/plain',
      'User-Agent': 'Guidey/0.01'
    },
    body: '{"username":"' + username + '", "password":"' + hashedPass + '"}'
  };

  // // Request call
  // request(options, function (error, response) {
  //   if (error) throw new Error(error);
  //   console.log(response.body);
  //   const tokenData = JSON.parse(response.body);
  //   var token = tokenData.token;
  //   console.log(token);
  // });
  // res.write("Token: " + findToken(token));
  // res.send;

  callAndFindToken(options, function() {
    console.log(token + " in function");
    console.log(errorMsg + " error in function");
    res.cookie('tokenCookie', token);
    if (errorMsg === "") {
      res.redirect("/guide?provider=0");
    } else {
      res.redirect("/error");
    }
  });

  // callAndFindToken(function(aaa){
  //   finalToken = aaa;
  //   var programIDArray = []; 
  //   var programIDString = "[";
  //   console.log(finalToken + "final");
  //   res.write("<div>Your token is " + finalToken + "</div>")

  //   var networkOptions = {
  //     'method': 'POST',
  //     'url': 'https://json.schedulesdirect.org/20141201/schedules',
  //     'headers': {
  //       'Content-Type': 'text/plain',
  //       'User-Agent': 'Guidey/0.01',
  //       'token': finalToken
  //     },
  //     body: '[{"stationID": "12131"}]'
  //   };
  
  //   callAndGetChannel(networkOptions, function(network){
  //     console.log("calling channel");
  //     console.log(network);
  //     res.write("<div>Programming lineup for station ID " + network[0].stationID + ":</div>");
  //     for (var i = 0; i < network.length; i++)
  //     {
  //       if (network[i]?.programs === undefined)
  //         break;
  //       else
  //       {
  //         //res.write("<br><div>" + network[i].metadata.startDate + "</div>");
  //         for (var j = 0; j < network[i].programs.length; j++)
  //         {
  //           if (network[i]?.programs === undefined)
  //             break;
  //           else
  //           {
  //             console.log(network[i].programs[j].airDateTime + ": " + network[i].programs[j].programID);
  //             programIDArray.push(network[i].programs[j].programID);
  //             //res.write("<div>" + network[i].programs[j].airDateTime + ": " + network[i].programs[j].programID);
  //             //if (network[i].programs[j].new == true)
  //             //  res.write(" - NEW!</div>");
  //             //else
  //             //  res.write("</div>");
  //           }
  //         }
  //       }
  //     }
  //     for (var k = 0; k < programIDArray.length; k++)
  //     {
  //       programIDString += "\"" + programIDArray[k] + "\"";
  //       if ((k+1) < programIDArray.length)
  //         programIDString += ", ";
  //     }
  //     programIDString += "]";

  //     var programOptions = {
  //       'method': 'POST',
  //       'url': 'https://json.schedulesdirect.org/20141201/programs',
  //       'headers': {
  //         'Content-Type': 'text/plain',
  //         'User-Agent': 'Guidey/0.01',
  //         'Accept-Encoding': 'gzip, deflate, br',
  //         'token': finalToken
  //       },
  //       body: programIDString,
  //       gzip: true
  //     };

  //     callAndGetProgramInfo(programOptions, function(progs){
  //       for (var i = 0; i < network.length; i++)
  //       {
  //         if (network[i]?.programs === undefined)
  //           break;
  //         else
  //         {
  //           res.write("<br><div>" + network[i].metadata.startDate + "</div>");
  //           for (var j = 0; j < network[i].programs.length; j++)
  //           {
  //             if (network[i]?.programs === undefined)
  //               break;
  //             else
  //             {
  //               //console.log(network[i].programs[j].airDateTime + ": " + progs[j].titles[0].title120);
  //               for (var k = 0; k < progs.length; k++)
  //               {
  //                 if (progs[k].programID == network[i].programs[j].programID)
  //                 {
  //                   res.write("<div>" + network[i].programs[j].airDateTime + ": " + progs[k].titles[0].title120);
  //                   if (progs[k]?.episodeTitle150 !== undefined)
  //                     res.write(" - " + progs[k].episodeTitle150);
  //                   if (network[i].programs[j].new == true)
  //                     res.write(" - NEW!</div>");
  //                   else
  //                     res.write("</div>");
  //                 }
  //               }
  //               // res.write("<div>" + network[i].programs[j].airDateTime + ": " + progs[j].titles[0].title120);
  //               // if (progs[j]?.episodeTitle150 !== undefined)
  //               //   res.write(" - " + progs[j].episodeTitle150);
  //               // if (network[i].programs[j].new == true)
  //               //   res.write(" - NEW!</div>");
  //               // else
  //               //   res.write("</div>");
  //             }
  //           }
  //         }
  //       }
  //       res.send();
  //     });
  //   })
  // });
  
  // function printToken(token) {
  //   // document.cookie = "token=" + token + "; expires=Mon, 03 Apr 2051 00:00:00 UTC;";
  //   res.write(token);
  //   savedToken = token;
  //   res.send();
  //   console.log(savedToken + "call");
  //   return callback(savedToken);
  // }

  // callAndFindToken(printToken(savedToken));

  /*callAndFindToken(function(token) {
    res.cookie("token", token, {maxAge: 10000000, httpOnly: true});
    res.write("<div>Login successful, your token is " + token + "</div>");
    res.write("<br><div>Your selected lineups are:</div>")
    var savedToken = token;
    console.log(savedToken + "call");

    var statOptions = {
      'method': 'GET',
      'url': 'https://json.schedulesdirect.org/20141201/status',
      'headers': {
        'Content-Type': 'text/plain',
        'User-Agent': 'Guidey/0.01',
        'token': savedToken
      }
    };

    callAndGetStatus(statOptions, function(status) {
      for (let i = 0; i < status.lineups.length; i++)
      {
        res.write("<div>Lineup " + (i + 1) + ": " + status.lineups[i].name + "</div>");
        console.log("Lineup " + (i + 1) + ": " + status.lineups[i].name);
      }

      res.send;

      var channelOptions = {
        'method': 'GET',
        'url': 'https://json.schedulesdirect.org/20141201/lineups/' + status.lineups[1].lineup,
        'headers': {
          'Content-Type': 'text/plain',
          'User-Agent': 'Guidey/0.01',
          'token': savedToken
        }
      };

      callAndGetLineup(channelOptions, function(channels) {
        res.write("<br><div>Channel lineup for " + status.lineups[1].name + "</div>")
        for (let j = 0; channels.map.length; j++)
        {
          if (channels?.map[j]?.stationID === undefined)
          {
            break;
          }
          else
          {
            for (let k = 0; k < channels.stations.length; k++)
            {
              if (channels?.stations[k]?.stationID === undefined || channels?.map[j]?.stationID === undefined)
              {
                break;
              }
              else if (channels.stations[k].stationID == channels.map[j].stationID)
              {
                res.write("<div>Channel " + channels.map[j].channel + ": " + channels.stations[k].name + "</div>")
              }
            }
          }
        }
        res.send();
      });
    });
  });*/
})

app.get("/error", function(req, res) {
  res.render("error", {displayError: errorMsg});
});

app.get("/guide", urlencodedParser, function(req, res) {
  lineNum = req.query.provider;

  today = new Date();
  todayNoTime = today.getFullYear() + '-' + (today.getMonth()+1).toString().padStart(2, "0") + '-' + today.getDate().toString().padStart(2, "0");

  // Get next day
  let nextDay = new Date(today);
  nextDay.setDate(nextDay.getDate() + 1);
  let nextDayNoTime = nextDay.getFullYear() + '-' + (nextDay.getMonth()+1).toString().padStart(2, "0") + '-' + nextDay.getDate().toString().padStart(2, "0"); 
  console.log(today + " | no time: " + todayNoTime + " | fuck: " + nextDay);

  channelListingArray = [];
  var statOptions = {
    'method': 'GET',
    'url': 'https://json.schedulesdirect.org/20141201/status',
    'headers': {
      'Content-Type': 'text/plain',
      'User-Agent': 'Guidey/0.01',
      'token': token
    }
  };

  callAndGetStatus(statOptions, function(status){
    if (status.code == 1004 || status.code == 4003)
    {
      console.log("Uh oh");
      token = "";
      res.clearCookie('tokenCookie');
      res.redirect("/");
    }
    else if (status.code == 0)
    {
      lineupArray = [];

      for (let i = 0; i < status.lineups.length; i++)
      {
        console.log("Lineup " + (i + 1) + ": " + status.lineups[i].name + " (" + status.lineups[i].lineup + ")");
        lineupArray.push({
          provider_ID: status.lineups[i].lineup,
          provider_name: status.lineups[i].name
        });
      }
      chosenLineup = lineupArray[lineNum];
  
      var channelOptions = {
        'method': 'GET',
        'url': 'https://json.schedulesdirect.org/20141201/lineups/' + chosenLineup.provider_ID,
        'headers': {
          'Content-Type': 'text/plain',
          'User-Agent': 'Guidey/0.01',
          'token': token
        }
      };
  
      callAndGetLineup(channelOptions, function(channels){
        for (let j = 0; channels.map.length; j++)
        {
          if (channels?.map[j]?.stationID === undefined)
          {
            break;
          }
          else
          {
            for (let k = 0; k < channels.stations.length; k++)
            {
              if (channels?.stations[k]?.stationID === undefined || channels?.map[j]?.stationID === undefined)
              {
                break;
              }
              else if (channels.stations[k].stationID == channels.map[j].stationID)
              {
                channelListingArray.push({
                  station_number: channels.map[j].channel,
                  station_ID: channels.map[j].stationID,
                  station_name: channels.stations[k].name,
                  station_callsign: channels.stations[k].callsign
                });
              }
            }
          }
        }
        // let bodyString = '[';
        // for (let l = 0; l < channelListingArray.length; l++)
        // {
        //   bodyString += '{"stationID": "' + channelListingArray[l].station_ID + '", "date": ["' + todayNoTime + '", "' + nextDayNoTime + '"]}';
        //   if ((l+1) < channelListingArray.length)
        //     bodyString += ", ";
        // }
        // bodyString += ']';
  
        // let networkOptions = {
        //   'method': 'POST',
        //   'url': 'https://json.schedulesdirect.org/20141201/schedules',
        //   'headers': {
        //     'Content-Type': 'text/plain',
        //     'User-Agent': 'Guidey/0.01',
        //     'token': token
        //   },
        //   body: bodyString
        // };
  
        // let completeArray = [];
  
        // callAndGetChannel(networkOptions, function(network){
        //   for (let m = 0; m > channelListingArray.length; m++)
        //   {
        //     console.log("Hello???");
        //     // console.log("Network JSON currently on " + network[m].stationID);
        //     // console.log("Next station ID is " + network[m+1].stationID);
        //     for (let n = 0; n > network.length; n++)
        //     {
        //       console.log("Channel listing array currently on " + channelListingArray[n].station_ID);
        //       if (channelListingArray[n].station_ID == network[m].stationID)
        //       {
        //         completeArray.push({
        //           station_number: channelListingArray[n].station_number,
        //           station_ID: channelListingArray[n].station_ID,
        //           station_name: channelListingArray[n].station_name,
        //           station_callsign: channelListingArray[n].station_callsign,
        //           current_program: "Station ID: " + channelListingArray[n].station_ID
        //         });
        //         console.log(completeArray[n]);
        //       }
        //     }
        //   }
        //   res.render("guide", {displayLineupArray: lineupArray, displayLineNum: lineNum, displayChannelListings: channelListingArray,
        //     displayCompleteArray: completeArray, displayTodayNoTime: todayNoTime});
        // });
  
        res.render("guide", {displayLineupArray: lineupArray, displayLineNum: lineNum, displayChannelListings: channelListingArray,
          displayTodayNoTime: todayNoTime});
      }); 
    }
    else {
      errorMsg = "Something happened.";
      res.redirect("/error");
    }
  });
});

app.get("/provideredit", function(req, res) {
  lineupArray = [];
  
  var statOptions = {
    'method': 'GET',
    'url': 'https://json.schedulesdirect.org/20141201/status',
    'headers': {
      'Content-Type': 'text/plain',
      'User-Agent': 'Guidey/0.01',
      'token': token
    }
  };

  callAndGetStatus(statOptions, function(status){
    if (status.code == 1004 || status.code == 4003)
    {
      console.log("Uh oh");
      token = "";
      res.clearCookie('tokenCookie');
      res.redirect("/");
    }
    else if (status.code == 0)
    {
      for (let i = 0; i < status.lineups.length; i++)
      {
        console.log("Lineup " + (i + 1) + ": " + status.lineups[i].name + " (" + status.lineups[i].lineup + ")");
        lineupArray.push({
          provider_ID: status.lineups[i].lineup,
          provider_name: status.lineups[i].name
        });
      }
      res.render("provideredit", {displayLineupArray: lineupArray});
    }
    else {
      errorMsg = "Something happened.";
      res.redirect("/error");
    }
  });
});

app.post("/zipcode", urlencodedParser, function(req, res) {
  var zip = req.body.zipCode;
  var zipArray = [];
  var zipOptions = {
    'method': 'GET',
    'url': 'https://json.schedulesdirect.org/20141201/headends?country=USA&postalcode=' + zip,
    'headers': {
      'Content-Type': 'text/plain',
      'User-Agent': 'Guidey/0.01',
      'token': token
    }
  };
  callAndGetZipCode(zipOptions, function(zippy){
    if (zippy.code == 1004 || zippy.code == 4003)
    {
      console.log("Uh oh");
      token = "";
      res.clearCookie('tokenCookie');
      res.redirect("/");
    }
    else if (zippy?.code === undefined)
    {
      for (var i = 0; i < zippy.length; i++)
      {
        zipArray.push({
          headend: zippy[i].headend,
          transport: zippy[i].transport,
          location: zippy[i].location,
          lineup_name: zippy[i].lineups[0].name,
          lineup_ID: zippy[i].lineups[0].lineup
        });
      }
      res.render("zipcode", {displayZipArray: zipArray, displayZip: zip});
    }
    else {
      errorMsg = "Something happened.";
      res.redirect("/error");
    }
  });
});

app.get("/addprovider", urlencodedParser, function(req, res) {
  var providerToAdd = req.query.provider;
  errorMsg = "";

  var addOpt = {
    'method': 'PUT',
    'url': 'https://json.schedulesdirect.org/20141201/lineups/' + providerToAdd,
    'headers': {
      'Content-Type': 'text/plain',
      'User-Agent': 'Guidey/0.01',
      'token': token
    }
  };

  addProvider(addOpt, function(aaa){
    if (errorMsg === "") {
      res.redirect("/provideredit");
    } else {
      res.redirect("/error");
    }
  });
});

app.get("/removeprovider", urlencodedParser, function(req, res) {
  var providerToAxe = req.query.provider;
  errorMsg = "";

  var axeOpt = {
    'method': 'DELETE',
    'url': 'https://json.schedulesdirect.org/20141201/lineups/' + providerToAxe,
    'headers': {
      'Content-Type': 'text/plain',
      'User-Agent': 'Guidey/0.01',
      'token': token
    }
  };

  axeProvider(axeOpt, function(aaa){
    if (errorMsg === "") {
      res.redirect("/provideredit");
    } else {
      res.redirect("/error");
    }
  });
});

app.get("/channel", urlencodedParser, function(req, res) {
  // Grab variables from URL
  chosenStationID = req.query.id;
  chosenStationName = req.query.name;
  chosenDate = req.query.date;

  // Convert date to Date
  date = new Date(chosenDate);
  date.setDate(date.getDate() + 1);
  dateNoTime = date.getFullYear() + '-' + (date.getMonth()+1).toString().padStart(2, "0") + '-' + date.getDate().toString().padStart(2, "0");
  
  // Get next day
  let nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  let nextDayNoTime = nextDay.getFullYear() + '-' + (nextDay.getMonth()+1).toString().padStart(2, "0") + '-' + nextDay.getDate().toString().padStart(2, "0"); 
  console.log(date + " | no time: " + dateNoTime + " | fuck: " + nextDay);

  let twoWeeksLater = new Date(date);
  twoWeeksLater.setDate(twoWeeksLater.getDate() + 13);
  let twoWeeksNoTime = twoWeeksLater.getFullYear() + '-' + (twoWeeksLater.getMonth()+1).toString().padStart(2, "0") + '-' + twoWeeksLater.getDate().toString().padStart(2, "0"); 
  
  // Prepare / reset strings and arrays
  let programIDString = "[";
  let programIDArray = [];
  programArray = [];
  imagePoster = [];
  imageURL = "";

  // Prepare body for networkOptions
  let bodyString = '[{"stationID": "' + chosenStationID + '", "date": ["' + dateNoTime + '", "' + nextDayNoTime + '"]}]';
  console.log(bodyString);

  let networkOptions = {
    'method': 'POST',
    'url': 'https://json.schedulesdirect.org/20141201/schedules',
    'headers': {
      'Content-Type': 'text/plain',
      'User-Agent': 'Guidey/0.01',
      'token': token
    },
    body: bodyString
  };

  callAndGetChannel(networkOptions, function(network){
    console.log(network);
    if (network.code == 1004 || network.code == 4003)
    {
      console.log("Uh oh");
      token = "";
      res.clearCookie('tokenCookie');
      res.redirect("/");
    }
    else if (network[0].stationID == chosenStationID)
    {
      for (var i = 0; i < network.length; i++)
      {
        if (network[i]?.programs === undefined)
          break;
        else
        {
          for (var j = 0; j < network[i].programs.length; j++)
          {
            if (network[i]?.programs === undefined)
              break;
            else
            {
              var convertDate = new Date(network[i].programs[j].airDateTime);
              console.log(convertDate.toLocaleTimeString() + ": " + network[i].programs[j].programID);
              programIDArray.push(network[i].programs[j].programID);
            }
          }
        }
      }
      for (var k = 0; k < programIDArray.length; k++)
      {
        programIDString += "\"" + programIDArray[k] + "\"";
        if ((k+1) < programIDArray.length)
          programIDString += ", ";
      }
      programIDString += "]";

      var programOptions = {
        'method': 'POST',
        'url': 'https://json.schedulesdirect.org/20141201/programs',
        'headers': {
          'Content-Type': 'text/plain',
          'User-Agent': 'Guidey/0.01',
          'Accept-Encoding': 'gzip, deflate, br',
          'token': token
        },
        body: programIDString,
        gzip: true
      };

      callAndGetProgramInfo(programOptions, function(progs){
        for (var i = 0; i < network.length; i++)
        {
          if (network[i]?.programs === undefined)
            break;
          else
          {
            for (var j = 0; j < network[i].programs.length; j++)
            {
              if (network[i]?.programs === undefined)
                break;
              else
              {
                for (var k = 0; k < progs.length; k++)
                {
                  if (progs[k].programID == network[i].programs[j].programID)
                  {
                    var convertDate = new Date(network[i].programs[j].airDateTime);
                    // callAndGetTMDBCall(tmdbOpt, k, function() {
                    // });
                    pushToProgramArray(convertDate, chosenDate, i, j, k, network, progs, function() {
                    //   //callAndGetTMDBCall(tmdbOpt, k);
                    });
                    
                    console.log(programArray[k]);
                    // console.log(imagePoster[k]);
                  }
                }
              }
            }
          }
        }
        res.render("channel", {displayProgramArray: programArray, displayID: chosenStationID, displayName: chosenStationName,
          displayDate: date, displayDateNoTime: dateNoTime, displayTodayNoTime: todayNoTime, displayTwoWeeksNoTime: twoWeeksNoTime});
      });
    }
    else {
      errorMsg = "Something happened.";
      res.redirect("/error");
    }
  });
});

app.post("/channel", urlencodedParser, function(req, res) {
  chosenDate = req.body.scheduleDay;
  console.log(chosenDate);
  res.redirect("/channel?id=" + chosenStationID + "&name=" + chosenStationName + "&date=" + chosenDate);
});

app.listen(3005, function() {
  console.log("Server's up on 3005.");
});

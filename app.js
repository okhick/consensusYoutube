const Max = require('max-api');
const google = require("./src/google_functions");
const dbQuery = require("./src/db_functions")
const fs = require('fs');

// =========================================================
// ========================= Setup =========================
// =========================================================

const IDs = {
  youtubeId: parseVideoId(process.argv[2]),
  // youtubeId: parseVideoId('https://youtu.be/hHW1oY26kxQ')
}

const loopArgs = {
  waitInterval: parseInt(process.argv[3]),
  isRunning: true
}

//get the live chat id and assign it when it comes back
getStreamDetails(IDs.youtubeId).then(id => {
  IDs.liveChatId = id;
});

//get the video_id of the video. Either a new id or existing.
getVideoId(IDs.youtubeId).then(id => {
  IDs.videoId = id;
});

//setup handlers for Max.
const handlers = {
  query: (toggle) => {
    if (toggle == 1) {
      loopArgs.isRunning = true;
      mainLoop();
    } else if (toggle == 0) {
      loopArgs.isRunning = false;
    } else {
      console.log("Please enter either a 0 or 1.");
    }
  }, 

  //nothing else for now...
}
Max.addHandlers(handlers);

// =========================================================
// ========================== Logs =========================
// =========================================================

let startTime, endTime;

function log_StartTimer() {
  startTime = new Date();
};

function log_EndTimer() {
  endTime = new Date();
  let timeDiff = endTime - startTime; //in ms
  // strip the ms
  timeDiff /= 1000;
  let log = `It's been ${timeDiff} since last query.\n`;
  //Log it
  fs.appendFile('query.log', log, function (err) {
    if (err) throw err;
  });
}

// =========================================================
// ========================== Main =========================
// =========================================================
/**
 * mainLoop makes sure things are set and calls the process function
 */
function mainLoop() {

  //stuff for logs
  log_EndTimer();
  log_StartTimer();

  if(loopArgs.isRunning) {

    setTimeout(() => {

      //if everything is set, run it!
      if(IDs.youtubeId != null && IDs.videoId != null) {
        processLiveChat();
      } else {
        //It's possible that we're waiting on some async. Give it a second to return.
        try {
          setTimeout(() => processLiveChat(), 1000);
        } catch(e) {
          console.log("Looks like an ID is not set...");
        }
      }

    }, loopArgs.waitInterval);
  }

}

/**
 * processLiveChat() - runs the main processing functions. Calls the main loop upon success
 */
async function processLiveChat() {
  const output = {};
  const chatQuery = new google.ChatQuery(IDs.liveChatId);
  const videoId = IDs.videoId;
  const messageData = await chatQuery.getLiveChatData();

  const newMessages = await checkResultsForNewMessages(messageData.messageData, videoId);

  const newUsersGoogleIds = await checkNewMessagesForNewUsers(newMessages);

  //write any new users to the db. return the ids for kicks and giggles i guess...
  if (newUsersGoogleIds.length > 0) {
    const newUserIds = await writeNew(newMessages, 'user').then( (newIds) => {
      return newIds;
    });
  }

  //get new message user google_ids into an array so we can search for them
  const newMessageUserGoogleIds = newMessages.map( (message) => message.author.authorId);

  //get google ids and user ids
  const newMessageUserIds = await getUsersByGoogleId(newMessageUserGoogleIds);

  //write new message
  const writeNewMessageArgs = {
    videoId: videoId,
    userIds: newMessageUserIds,
    messages: newMessages
  }
  const newMessageIds = await writeNew(writeNewMessageArgs, 'message').then( (newIds) => {
    return newIds;
  });

  //get the new message content
  const newlyAddedMessages = await getNewAddedMessages(newMessageIds);

  //output to Max
  output.new_messages = newlyAddedMessages
  // console.log(output);
  const outputString = JSON.stringify(output); //There seems to be a bug (or a feature) where you can't output directly an object.
  Max.outlet(outputString);

  //order the next round
  mainLoop();
}

// =========================================================
// ======================== Helpers ========================
// =========================================================

/**
 * parseVideoId() - takes a url and strips out the google video id
 *
 * @param {string} url must be a youtube url
 * @returns {string} the google id
 */
function parseVideoId(url) {
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length == 11) {
    return match[2];
  } else {
    console.log("Cannot parse YouTube id.")
  }
}

/**
 * getStreamDetails() - querys google to get liveChatId
 *
 * @param {string} youtubeId
 * @returns {promise string}  
 */
function getStreamDetails(youtubeId) {
  return new Promise((resolve, reject) => {
  try {
    let streamDetails = new google.StreamDetails(youtubeId);
    let chatId = streamDetails.getChatId();
      resolve(chatId); 
    } catch(e) {
      reject(e);
    }
  });
}

/**
 * getVideoId - querys the db and returns the video_id 
 *
 * @param {string} youtubeId
 * @returns {int} video_id
 */
async function getVideoId(youtubeId) {
  const db = new dbQuery.DBQuery;
  return await db.checkVideo(youtubeId);
}

/**
 * checkResultsForNewMessages
 *
 * @param  {object} results the google messages
 * @param  {int}    videoId
 * @return {array}          array of new messages || empty if nothing new
 */
async function checkResultsForNewMessages(results, videoId) {
  const db = new dbQuery.DBQuery;
  const allMessages = await db.getMessagesForVideo(videoId);
  return sniffNew(allMessages, results, 'chat');
}

/**
 * checkNewMessagesForNewUsers
 *
 * @param  {array} newMessages array of new messages
 * @return {array}             google ids of new messages || empty if nothing new
 */
async function checkNewMessagesForNewUsers(newMessages) {
  const db = new dbQuery.DBQuery;
  const allUsers = await db.getAllUsers();
  const newUsers = sniffNew(allUsers, newMessages, 'user');
  const newUsersGoogleIds = newUsers.map( (user) => {
    return user.author.authorId;
  });
  return newUsersGoogleIds;
}

/**
 * getUsersByGoogleId
 *
 * @param  {array} newMessageUserGoogleIds array of google ids
 * @return {array}                         result of user_ids and google_ids
 */
async function getUsersByGoogleId(newMessageUserGoogleIds) {
  const db = new dbQuery.DBQuery;
  return await db.getUsersByGoogleId(newMessageUserGoogleIds);
}

/**
 * getNewAddedMessages
 *
 * @param  {array} newMessageIds array of comment ids
 * @return {array}               result of comment_id and content
 */
async function getNewAddedMessages(newMessageIds) {
  const db = new dbQuery.DBQuery;
  return await db.getMessagesById(newMessageIds);
}

// =========================================================
// ========================= Logic =========================
// =========================================================

/**
 * writeNewUsers - writes new users to db. returns an array of new ids
 *
 * @param  {any} newItemsToSave the something you want to save
 * @return {array}                an array of new ids
 */
function writeNew(newItemsToSave, type) {
  const db = new dbQuery.DBQuery;
  let newIds;
    switch(type) {

      case "user":
        newIds = newItemsToSave.map( async (item) => {
          let googleId = item.author.authorId;
          let moderator = item.author.moderator;
          let display = item.author.display;
          let userId = await db.newUser(googleId, display, moderator);
          return userId;
        });
      break;

      case "message":
        newIds = newItemsToSave.messages.map( async (message) => {
          //match the user_id with the google user id for message
          let user_id;
          newItemsToSave.userIds.forEach( (user) => {
            if(user.google_id == message.author.authorId) {
              user_id = user.user_id;
            }
          });
          //write the message to the db
          let messageId = await db.newMessage(message.message, newItemsToSave.videoId, user_id);
          return messageId;
        });
      break
    }

  return Promise.all(newIds);
}

/**
 * sniffNew - loop through stuff and find new stuff
 *
 * @param  {array}  allKnown all things known to exist
 * @param  {array}  results     the things returned by google
 * @param  {string} type
 * @return {object}             object containg an array of known ids and new ids
 */
function sniffNew(allKnown, results, type) {
  let newItems = [];

  results.forEach( (potentialNewItem) => {
    let knownItem = false;
    let potentialNewItemId;

    //determine the google_id based on type
    switch(type) {
      case 'chat':
        potentialNewItemId = potentialNewItem.message.id;
      break;

      case 'user':
        potentialNewItemId = potentialNewItem.author.authorId;
      break;
    }

    //loop through the established items; use a classic for so we can break if we find a match
    for(i=0; i<allKnown.length; i++) {
      if (allKnown[i].google_id === potentialNewItemId) {
        knownItem = true;
        break;
      }
    }
    //if we don't know the item
    if (!knownItem) {
      newItems.push(potentialNewItem)
    }
  });

  return newItems
}

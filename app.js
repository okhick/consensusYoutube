// const Max = require('max-api');
const google = require("./src/google_functions");
const dbQuery = require("./src/db_functions")
const fs = require('fs');

// Max.addHandler("bang", async () => {
//   let data = await getThoseComments()
//   Max.outlet(data);
// })

let chatId;
// detailTest();
async function detailTest() {
  let streamDetails = new google.StreamDetails('hHW1oY26kxQ');
  chatId = await streamDetails.getChatId();
  console.log("CHAT ID IS NOW ", chatId)
}

async function processLiveChat() {
  const chatQuery = new google.ChatQuery('Cg0KC2hIVzFvWTI2a3hRKicKGFVDU0o0Z2tWQzZOcnZJSTh1bXp0ZjBPdxILaEhXMW9ZMjZreFE');
  const videoId = 12; //for now...
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
}
processLiveChat();

// =========================================================
// ======================== Helpers ========================
// =========================================================

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
 * getNewAddedMessages - NOT USED?!
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
          let userId = await db.newUser(googleId);
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

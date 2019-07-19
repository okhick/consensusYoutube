const google = require("./src/google_functions");
const dbQuery = require("./src/db_functions")
const fs = require('fs');

getThoseComments()

async function getThoseComments() {
  //let comments = new google.CommentQuery('fD-SWaIT8uk');
  //let allComments = await comments.getComments();
  //fs.writeFileSync("./testResults.json", JSON.stringify(allComments, null, 2));
  // console.log(allComments[0].snippet.authorChannelId);

  const results = ( () => {
      let rawResults = fs.readFileSync('testResults.json');
      return JSON.parse(rawResults);
    }
  )();

  const db = new dbQuery.DBQuery;

  //check for new users
  let allUsers = await db.getAllUsers();
  let newUsers = sniffNew(allUsers, results, 'user');

  //write new users to db if they exist. return the new ids.
  let newUserIds;
  if (newUsers.newItems.length > 0) {
    newUserIds = await writeNew(newUsers.newItems, 'user').then( (newIds) => {
      return newIds;
    });
  }

  //Use this function to get google ids be user ids
  let test = await db.getUsersByUserId(_________);

  //check for new comments
  let video_id = 12; //for now...
  let allComments = await db.getCommentsForVideo(video_id);
  let newAndKnownComments = sniffNew(allComments, results, 'comment');


  //TODO: record the new comments

  //TODO: check for new likes
}

// function getNeeded

/**
 * writeNewUsers - writes new users to db. returns an array of new ids
 *
 * @param  {string} newUsers the google_id to write
 * @return {array}           an array of new ids
 */
function writeNew(newUsers, type) {
  const db = new dbQuery.DBQuery;
  let newUserIds = newUsers.map( async (user) => {
    switch(type) {
      case "user":
        let userId = await db.newUser(user);
        return userId;
      break;

      case "comment":
        //somethign
      break
    }
  });

  return Promise.all(newUserIds);
}

/**
 * sniffNew - loop through stuff and find new stuff
 *
 * @param  {array}  allComments all comments known to exist
 * @param  {array}  results     the comments returned by google
 * @param  {string} type
 * @return {object}             object containg an array of known ids and new ids
 */
function sniffNew(allKnown, results, type) {
  let newItems = [];
  let knownItems = [];

  results.forEach( (potentialNewItem) => {
    let knownItem = false;
    let potentialNewItemId;

    //determine the google_id based on type
    switch(type) {
      case 'comment':
        potentialNewItemId = potentialNewItem.id;
      break;

      case 'user':
        potentialNewItemId = potentialNewItem.snippet.authorChannelId.value;
      break;
    }

    //loop through the established items; use a classic for so we can break if we find a match
    for(i=0; i<allKnown.length; i++) {
      if (allKnown[i].google_id === potentialNewItemId) {
        knownItem = true;
        break;
      }
    }

    if (knownItem) {
      knownItems.push(potentialNewItemId)
    } else {
      newItems.push(potentialNewItemId);
    }
  });

  return {
    newItems: newItems,
    knownItems: knownItems
  }
}

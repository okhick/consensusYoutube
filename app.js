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

  try {
    const videoId = 12; //for now...
    const newComments = await checkResultsForNewComments(results, videoId);

    //if there are new comments
    if (newComments.length > 0) {
      const newUsersGoogleIds = await checkNewCommentsForNewUsers(newComments);

      //write any new users to the db. return the ids for kicks and giggles i guess...
      if (newUsersGoogleIds.length > 0) {
        const newUserIds = await writeNew(newUsersGoogleIds, 'user').then( (newIds) => {
          return newIds;
        });
      }

      //get new comment google_ids into an array so we can search for the user_ids
      const newCommentUserGoogleIds = results.map( (comment) => {
        return comment.snippet.authorChannelId.value;
      });

      //get google ids and user ids
      const newCommentUserIds = await getUsersByGoogleId(newCommentUserGoogleIds);

      //write new comment
      const writeNewCommentArgs = {
        videoId: videoId,
        userIds: newCommentUserIds,
        comments: newComments
      }
      const newCommentIds = await writeNew(writeNewCommentArgs, 'comment').then( (newIds) => {
        return newIds;
      });

      //get the new comment content
      const newlyAddedComments = await getNewAddedComments(newCommentIds);
      console.log(newlyAddedComments);
    } else {
      console.log("THERE ARE NO NEW COMMENTS AT THIS TIME");
    }
  } catch (error) {
    console.log(error);
  }

}

// =========================================================
// ======================== Helpers ========================
// =========================================================

/**
 * checkResultsForNewComments
 *
 * @param  {object} results the google comments
 * @param  {int}    videoId
 * @return {array}          array of new comments || empty if nothing new
 */
async function checkResultsForNewComments(results, videoId) {
  const db = new dbQuery.DBQuery;
  const allComments = await db.getCommentsForVideo(videoId);
  return sniffNew(allComments, results, 'comment');
}

/**
 * checkNewCommentsForNewUsers
 *
 * @param  {array} newComments array of new comments
 * @return {array}             google ids of new comments || empty if nothing new
 */
async function checkNewCommentsForNewUsers(newComments) {
  const db = new dbQuery.DBQuery;
  const allUsers = await db.getAllUsers();
  const newUsers = sniffNew(allUsers, newComments, 'user');
  const newUsersGoogleIds = newUsers.map( (user) => {
    return user.snippet.authorChannelId.value;
  });
  return newUsersGoogleIds;
}

/**
 * getUsersByGoogleId
 *
 * @param  {array} newCommentUserGoogleIds array of google ids
 * @return {array}                         result of user_ids and google_ids
 */
async function getUsersByGoogleId(newCommentUserGoogleIds) {
  const db = new dbQuery.DBQuery;
  return await db.getUsersByGoogleId(newCommentUserGoogleIds);
}

/**
 * getNewAddedComments
 *
 * @param  {array} newCommentIds array of comment ids
 * @return {array}               result of comment_id and content
 */
async function getNewAddedComments(newCommentIds) {
  const db = new dbQuery.DBQuery;
  return await db.getCommentsById(newCommentIds);
}

// =========================================================
// ========================= Logic =========================
// =========================================================

/**
 * writeNewUsers - writes new users to db. returns an array of new ids
 *
 * @param  {any} newItemToSave the something you want to save
 * @return {array}                an array of new ids
 */
function writeNew(newItemToSave, type) {
  const db = new dbQuery.DBQuery;
  let newIds;
    switch(type) {

      case "user":
        newIds = newItemToSave.map( async (user) => {
          let userId = await db.newUser(user);
          return userId;
        });
      break;

      case "comment":
        newIds = newItemToSave.comments.map ( async (comment) => {
          //match the user_id with the google user id for comment
          let user_id;
          newItemToSave.userIds.forEach( (user) => {
            if(user.google_id == comment.snippet.authorChannelId.value) {
              user_id = user.user_id;
            }
          });
          //write the comment to the db
          let commentId = await db.newComment(comment, newItemToSave.videoId, user_id);
          return commentId;
        });
      break
    }

  return Promise.all(newIds);
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

    if (!knownItem) {
      newItems.push(potentialNewItem)
    }
  });

  return newItems
}

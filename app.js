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
  try {
    //check for new comments
    const video_id = 12; //for now...
    const allComments = await db.getCommentsForVideo(video_id);
    const newComments = sniffNew(allComments, results, 'comment');

    //check for new users
    const allUsers = await db.getAllUsers();
    const newUsersObjects = sniffNew(allUsers, newComments, 'user');
    const newUsersGoogleIds = newUsersObjects.map( (user) => {
      return user.snippet.authorChannelId.value;
    });

    //write any new users to the db. return the ids for kicks and giggles
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
    const newCommentUserIds = await db.getUsersByGoogleId(newCommentUserGoogleIds);

    //write new comment
    const writeNewCommentArgs = {
      video_id: video_id,
      userIds: newCommentUserIds,
      comments: newComments
    }
    const newCommentIds = await writeNew(writeNewCommentArgs, 'comment').then( (newIds) => {
      return newIds;
    });

  } catch (error) {
    console.log(error);
  }

}

// function getNeeded

/**
 * writeNewUsers - writes new users to db. returns an array of new ids
 *
 * @param  {string} newItemToSave the google_id to write
 * @return {array}           an array of new ids
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
          //write the comment
          let commentId = await db.newComment(comment, newItemToSave.video_id, user_id);
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

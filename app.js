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

  let db = new dbQuery.DBQuery;

  let video_id = 12; //for now...
  let allComments = await db.getCommentsForVideo(video_id);
  let newComments = sniffNew(allComments, results, 'comment');
  console.log(`New Comments: ${newComments} \n`);

  let allUsers = await db.getAllUsers();
  let newUsers = sniffNew(allUsers, results, 'user');
  console.log(`New Users: ${newUsers}`);

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

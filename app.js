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

  let newComments = sniffNewComments(allComments, results)
  console.log(newComments);

}

/**
 * sniffNewComments - loop through stuff and find new comments
 *
 * @param  {array} allComments all comments known to exist
 * @param  {array} results     the comments returned by google
 * @return {array}             all comments that have been added
 */
function sniffNewComments(allComments, results) {
  let newComments = [];

  results.forEach( (potentialComment) => {
    let commentExists = false;

    //loop through the established comments; use a classic for so we can break if we find a match
    for(i=0; i<allComments.length; i++) {
      if (allComments[i].google_id === potentialComment.id) {
        commentExists = true;
        break;
      }
    }

    //if comment does not exist, add it to the array to be returned
    if (!commentExists) {
      newComments.push(potentialComment.id);
    }
  });

  return newComments
}

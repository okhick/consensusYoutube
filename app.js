const google = require("./src/google_functions");
const fs = require('fs');

getThoseComments()

async function getThoseComments() {
  let comments = new google.CommentQuery('fD-SWaIT8uk');
  let allComments = await comments.getComments();
  fs.writeFileSync("./testResults.json", JSON.stringify(allComments, null, 2));
  // console.log(allComments[0].snippet.authorChannelId);
}

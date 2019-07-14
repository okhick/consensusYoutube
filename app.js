const google = require("./src/google_functions");

getThoseComments()

async function getThoseComments() {
  let comments = new google.CommentQuery('fD-SWaIT8uk');
  let allComments = await comments.getComments();
  console.log(allComments);
}

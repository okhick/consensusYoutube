const {google} = require('googleapis');
const fs = require('fs');

// Load up from the creds json with Google API key and info.
const creds = ( () => {
    let credsRaw = fs.readFileSync('creds.json');
    return JSON.parse(credsRaw)
  }
)();

//Set up the class with creds
const youtube = google.youtube({
   version: creds.version,
   auth: creds.auth
});

class CommentQuery {
  constructor(id) {
    this.videoArgs = {
      part: 'snippet',
      videoId: id,
      order: 'relevance'
    };
  }

  /**
   * async getComments - Request a comments list from YouTube and parses them into an array
   *
   * @return {Array} An array of comments objects
   */
  async getComments() {
    try{
      this.rawComments = await this._getRawComments();
      this.comments = this._drillDownToComments(this.rawComments);
      return new Promise( (resolve) => {
        resolve(this.comments);
      });
    }
    catch(e) {
      console.log(e);
    }
  }

  /**
   * _getRawComments - The actual request to YouTube
   *
   * @return {Object} A full object with lots of data about and including comments
   */
  _getRawComments() {
    return new Promise ((resolve, reject) => {
      youtube.commentThreads.list(this.videoArgs, (err, res) => {
        if (err) { reject(err); }
        else if (res) { resolve(res); }
      });
    });
  }

  /**
   * _drillDownToComments - gets only the comment data and returns an array of objects.
   *
   * @param  {Object} rawComments the full response from YouTube returned by _getRawComments
   * @return {Array}              An array with data for each comment
   */
  _drillDownToComments(rawComments) {
    let comments = [];
    rawComments.data.items.forEach( (comment) => {
      comments.push(comment.snippet.topLevelComment);
    });
    return comments;
  }
}

module.exports = {
  CommentQuery: CommentQuery
}

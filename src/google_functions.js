const {google} = require('googleapis');
const fs = require('fs');

const creds = ( () => {
    let credsRaw = fs.readFileSync('creds.json');
    return JSON.parse(credsRaw)
  }
)();

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

  async getComments() {
    try{
      this.rawComments = await this._getRawComments();
      this.comments = this._drillDownToComments(this.rawComments);
      return new Promise( (resolve, reject) => {
        resolve(this.comments);
      });
    }
    catch(e) {
      console.log(e);
    }
  }

  _getRawComments() {
    return new Promise ((resolve, reject) => {
      youtube.commentThreads.list(this.videoArgs, (err, res) => {
        if (err) { reject(err); }
        else if (res) { resolve(res); }
      });
    });
  }

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

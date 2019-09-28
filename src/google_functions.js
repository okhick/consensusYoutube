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

class StreamDetails {
  constructor(id) {
    this.queryArgs = {
      part: 'liveStreamingDetails',
      id: id,
    };
  }

  _getLiveStreamingDetails() {
    return new Promise ((resolve, reject) => {
      youtube.videos.list(this.queryArgs, (err, res) => {
          if (err) { reject(err); }
          else if (res) { resolve(res); }
      });
    });
  }

  async getChatId() {
    try {
      let streamingData = await this._getLiveStreamingDetails();
      let chatId = streamingData.data.items[0].liveStreamingDetails.activeLiveChatId;
      return new Promise ( (resolve) => {
        resolve(chatId);
      })
    } catch (e) {
      console.log(e);
    }
  }
}

class ChatQuery {
  constructor(liveChatId) {
    this.queryArgs = {
      liveChatId: liveChatId,
      part: 'snippet,authorDetails'
    };
  }

  getLiveChatData() {
    return new Promise( async (resolve, reject) => {
      try {
        let chatData = await this._requestLiveChatData();
        let messageData = chatData.data.items.map(chatObject => {
          return {
            message: {
              id: chatObject.snippet.id,
              displayMessage: chatObject.snippet.displayMessage,
            },
            author: {
              authorId: chatObject.authorDetails.channelId,
              moderator: chatObject.authorDetails.isChatModerator
            }
          };
        });
        resolve({
          nextPoll: chatData.data.pollingIntervalMillis,
          messageData:messageData
        });
      } catch(e) {
        reject(e)
      }
    });
  }

  _requestLiveChatData() {
    return new Promise ((resolve, reject) => {
      youtube.liveChatMessages.list(this.queryArgs, (err, res) => {
          if (err) { reject(err); }
          else if (res) { resolve(res); }
      });
    });
  }

  _drillDownToChat() {

  }
}

class CommentQuery {
  constructor(chatId) {
    this.videoArgs = {
      id: id,
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
  CommentQuery: CommentQuery,
  ChatQuery: ChatQuery,
  StreamDetails: StreamDetails
}

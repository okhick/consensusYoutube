const { google } = require('googleapis');
const fs = require('fs');

// Load up from the creds json with Google API key and info.
const creds = (() => {
  let credsRaw = fs.readFileSync('creds.json');
  return JSON.parse(credsRaw)
}
)();

//Set up the class with creds
const youtube = google.youtube({
  version: creds.version,
  auth: creds.auth
});

// =========================================================
// ======================== Streams ========================
// =========================================================

class StreamDetails {
  constructor(id) {
    this.queryArgs = {
      part: 'liveStreamingDetails',
      id: id,
    };
  }

  /**
   *getChatId() - parses stream details and returns the ID
  *
  * @returns {string} activeLiveChatId
  * @memberof StreamDetails
  */
  async getChatId() {
    try {
      let streamingData = await this._getLiveStreamingDetails();
      let chatId = streamingData.data.items[0].liveStreamingDetails.activeLiveChatId;
      return new Promise((resolve) => {
        resolve(chatId);
      })
    } catch (e) {
      console.log(e);
    }
  }
  
  /**
   * _getLiveStreamingDetails - requests info about a stream
   *
   * @returns {object} stream details
   * @memberof StreamDetails
   */
  _getLiveStreamingDetails() {
    return new Promise((resolve, reject) => {
      youtube.videos.list(this.queryArgs, (err, res) => {
        if (err) { reject(err); }
        else if (res) { resolve(res); }
      });
    });
  }
}

// =========================================================
// ======================== Chat ===========================
// =========================================================

class ChatQuery {
  constructor(liveChatId) {
    this.queryArgs = {
      liveChatId: liveChatId,
      part: 'snippet,authorDetails'
    };
  }

  /**
   * getLiveChatData() - returns only useful information from the return chat data
   *
   * @returns {object} {nextPoll:float, messageData:object}
   * @memberof ChatQuery
   */
  getLiveChatData() {
    return new Promise(async (resolve, reject) => {
      try {
        let chatData = await this._requestLiveChatData();
        let messageData = chatData.data.items.map(chatObject => {
          return {
            message: {
              id: chatObject.id,
              displayMessage: chatObject.snippet.displayMessage,
              publishedAt: chatObject.snippet.publishedAt
            },
            author: {
              authorId: chatObject.authorDetails.channelId,
              moderator: chatObject.authorDetails.isChatModerator
            }
          };
        });
        resolve({
          nextPoll: chatData.data.pollingIntervalMillis,
          messageData: messageData
        });
      } catch (e) {
        reject(e)
      }
    });
  }

  /**
   * _requestLiveChatData() - requests live chat data from youtube
   *
   * @returns {object} chat object from google
   * @memberof ChatQuery
   */
  _requestLiveChatData() {
    return new Promise((resolve, reject) => {
      youtube.liveChatMessages.list(this.queryArgs, (err, res) => {
        if (err) { reject(err); }
        else if (res) { resolve(res); }
      });
    });
  }
}

module.exports = {
  ChatQuery: ChatQuery,
  StreamDetails: StreamDetails
}

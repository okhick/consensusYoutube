const sqlite3 = require('sqlite3').verbose();
const dateFormat = require('date-format');
const db = new sqlite3.Database('./youtubeData.db', (err) => {
  if (err) { console.log(err) }
});

class DBQuery {
  constructor() {
    this.now = dateFormat.asString(dateFormat.ISO8601_FORMAT, new Date());
  }

  // =========================================================
  // ======================== Setters ========================
  // =========================================================

  /**
   * async newVideo - Adds a new video to the database
   *
   * @param  {string} google_id
   * @return {int}              the ID of the row created
   */
  async checkVideo(google_id) {
    let videoExists = await this._checkExists("videos", "google_id", google_id);

    if (!videoExists) {
      let insert = `INSERT INTO videos (google_id, date_added) VALUES ($google_id, $now)`;
      return new Promise( (resolve, reject) => {
        db.run(insert, { $google_id:google_id, $now:this.now }, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        });
      });

    } else if (videoExists) {
      let video_id = await this.getVideoByGoogleId(google_id);
      return new Promise ((resolve) => {
        resolve(video_id[0].video_id);
      });

    } else {
      console.log("HOW DID YOU EVEN GET HERE?! SOMETHING HAS GONE TERRIBLY WRONG...");
    }
  }

  /**
   * async newUser - quick function to write new user
   *
   * @param  {string} user google_id of user
   * @return {int}         id of new record
   */
  async newUser(user, moderator) {
    let insert = `INSERT INTO users (google_id, moderator, date_added) VALUES ($google_id, $moderator, $now )`;

    return new Promise( (resolve, reject) => {
      db.run(insert, { $google_id:user, $moderator:moderator, $now:this.now }, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  /**
   * async newMessage - write a new message
   *
   * @param  {Onject} message  the google result
   * @param  {Int}    video_id the video_id
   * @param  {Int}    users    the user_id
   * @return {Array}           the new ids
   */
  async newMessage(message, video_id, user){
    let insert = "INSERT INTO messages (google_id, video_id, user_id, content, date_added) VALUES ($google_id, $video_id, $user_id, $content, $date_added)";

    return new Promise( (resolve, reject) => {
      db.run(insert, {
          $google_id: message.id,
          $video_id: video_id,
          $user_id: user,
          $content: message.displayMessage,
          $date_added: message.publishedAt,
        }, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        });
    });
  }

  // =========================================================
  // ======================== Getters ========================
  // =========================================================
  
  getVideoByGoogleId(google_id) {
    let select = "SELECT video_id FROM videos WHERE google_id = $google_id";

    return new Promise((resolve, reject) => {
      db.all(select, {$google_id:google_id}, (err, row) => {
        if (err) { reject(err) }
        if (row) { resolve(row) }
      });
    });
  }

  /**
   * getMessagesForVideo - filters for all Messages by video_id
   *
   * @param  {int} video_id
   * @return {type}          an array of all Messages returned
   */
  getMessagesForVideo(video_id) {
    let select = "SELECT message_id, google_id, user_id, content FROM messages WHERE video_id = $video_id";

    return new Promise( (resolve, reject) => {
      db.all(select, { $video_id:video_id }, (err, row) => {
        if (err) { reject(err) }
        if (row) { resolve(row) }
      });
    });
  }

  /**
   * async getAllUsers - simple query to return all users
   *
   * @return {array}  array of all users returned by query
   */
  async getAllUsers() {
    let select = "SELECT user_id, google_id FROM users";

    return new Promise( (resolve, reject) => {
      db.all(select, { }, (err, row) => {
        if (err) { reject(err) }
        if (row) {

          resolve(row) }
      });
    });
  }

  /**
   * async getMessagesById - takes message_ids and returns matching users
   *
   * @param  {array} message_ids an array of message_ids
   * @return {array}             returns message id and content
   */
  async getMessagesById(message_ids) {
    let select = `SELECT message_id, content, messages.user_id, users.moderator FROM messages 
      JOIN users on users.user_id = messages.user_id  
      WHERE message_id in`;

    return new Promise( (resolve, reject) => {
      db.all(`${select} (${message_ids.map( _ => '?')})`, message_ids, (err, row) => {
        if (err) { reject(err) }
        if (row) { resolve(row) }
      });
    });
  }

  /**
   * async getUsersByUserId - takes user_ids and returns matching users
   *
   * @param  {Array} google_ids an array of user ids
   * @return {Array}            Array of matching results
   */
  async getUsersByGoogleId(google_ids) {
    let select = "SELECT user_id, google_id FROM users WHERE google_id in";

    return new Promise( (resolve, reject) => {
      db.all(`${select} (${google_ids.map( _ => '?')})`, google_ids, (err, row) => {
        if (err) { reject(err) }
        if (row) { resolve(row) }
      });
    });
  }

  // =========================================================
  // ==================== Helper Functions ===================
  // =========================================================

  /**
   * _checkExists - Quick helper function to check a table for a value.
   *
   * @param  {string}          table  the table you want to check
   * @param  {string}          column the column you want to check
   * @param  {string | int}    value  the value you want to check for
   * @return {boolean}                true if exists, false if doesn't exist
   */
  _checkExists(table, column, value) {
    let select = `SELECT EXISTS (SELECT * FROM ${table} WHERE ${column} = $value)`;

    return new Promise( (resolve, reject) => {
      db.get(select, { $value:value }, (err, row) => {
        if (err) { reject(err); }
        if (row) { //row is an object formatted as {query:result}
          let key = Object.keys(row);
          let exists = (row[key] == 1) ? true : false;
          resolve(exists);
        }
      });
    });
  }
}

module.exports = {
  DBQuery: DBQuery
}

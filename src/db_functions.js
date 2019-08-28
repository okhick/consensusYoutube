const sqlite3 = require('sqlite3').verbose();
const dateFormat = require('date-format');
const db = new sqlite3.Database('./youtubedata.db', (err) => {
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
  async newVideo(google_id) {
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
      console.log("ENTRY ALREADY EXISTS!");
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
  async newUser(user) {
    let insert = `INSERT INTO users (google_id, date_added) VALUES ($google_id, $now )`;

    return new Promise( (resolve, reject) => {
      db.run(insert, { $google_id:user, $now:this.now }, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  /**
   * async newComment - write a new comment
   *
   * @param  {Onject} comment  the google result
   * @param  {Int}    video_id the video_id
   * @param  {Int}    users    the user_id
   * @return {Array}           the new ids
   */
  async newComment(comment, video_id, user){
    let insert = "INSERT INTO comments (google_id, video_id, user_id, content, like_count, date_added) VALUES ($google_id, $video_id, $user_id, $content, $like_count, $date_added)";

    return new Promise( (resolve, reject) => {
      db.run(insert, {
          $google_id: comment.id,
          $video_id: video_id,
          $user_id: user,
          $content: comment.snippet.textOriginal,
          $like_count: comment.snippet.likeCount,
          $date_added: comment.snippet.publishedAt
        }, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        });
    });
  }

  async updateLikeCount(comment) {
    let update = "UPDATE comments SET like_count = $new_count WHERE comment_id = $comment_id"

    return new Promise( (resolve, reject) => {
      db.run(update, { $new_count:comment.like_count, $comment_id:comment.comment_id }, function(err) {
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

  /**
   * getCommentsForVideo - filters for all comments by video_id
   *
   * @param  {int} video_id
   * @return {type}          an array of all comments returned
   */
  getCommentsForVideo(video_id) {
    let select = "SELECT comment_id, google_id, user_id, content, like_count FROM comments WHERE video_id = $video_id";

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
   * async getCommentsById - akes comment_ids and returns matching users
   *
   * @param  {array} comment_ids an array of comment_ids
   * @return {array}             returns comment id and content
   */
  async getCommentsById(comment_ids) {
    let select = "SELECT comment_id, content FROM comments WHERE comment_id in";

    return new Promise( (resolve, reject) => {
      db.all(`${select} (${comment_ids.map( _ => '?')})`, comment_ids, (err, row) => {
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

  /**
   * async getCommentsByGoogleId - return id and like count
   *
   * @param  {Array} comment_ids array of comment_ids
   * @return {Array}             comment_id and like_count 
   */
  async getCommentsByGoogleId(google_ids) {
    let select = "SELECT * FROM comments WHERE google_id in";

    return new Promise( (resolve, reject) => {
      db.all(`${select} (${google_ids.map( _ => '?')})`, google_ids, (err, row) => {
        if (err) { reject(err) }
        if (row) { resolve(row) }
      });
    });
  }

  async getLikesById(ids) {
    let select = "SELECT comment_id, like_count FROM comments WHERE comment_id in";

    return new Promise( (resolve, reject) => {
      db.all(`${select} (${ids.map( _ => '?')})`, ids, (err, row) => {
        if (err) { reject(err) }
        if (row) { resolve(row) }
      });
    })
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

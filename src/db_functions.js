const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./youtubedata.db', (err) => {
  if (err) { console.log(err) }
});

class DBQuery {
  constructor() {
    //nothing for now
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
      let insert = "INSERT INTO videos (google_id, date_added) VALUES ($google_id, date('now'))";
      return new Promise( (resolve, reject) => {
        db.run(insert, { $google_id:google_id }, function(err) {
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
    let insert = "INSERT INTO users (google_id, date_added) VALUES ($google_id, date('now'))";
    return new Promise( (resolve, reject) => {
      db.run(insert, { $google_id: user }, function(err) {
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

// db.on("open", async () => {
//   const query = new DBQuery();
//   let nextRow = await query.newVideo('fD-SWaIT8uk');
//   quickSelect();
// });
//
// function quickSelect() {
//   let select = "SELECT * from videos";
//   db.each(select, {}, (err, row) => {
//     if (err) { console.log(err) };
//     if (row) { console.log(row) };
//   });
// }
//
// function quickUpdate() {
//   let update = "UPDATE videos SET google_id = $google_id WHERE google_id = $badGoogleID";
//   let args = {
//     $google_id: 'ZXJWO2FQ16c',
//     $badGoogleID: 'ZXJWO3FQ16c',
//   }
//
//   db.run(update, args, (err) => {
//     if (err) { console.log(err) };
//   });
// }
//
// function quickDelete() {
//   let drop = "DELETE FROM videos WHERE video_id = 2";
//
//   db.run(drop, {}, (err) => {
//     if (err) { console.log(err) };
//   });
// }

module.exports = {
  DBQuery: DBQuery
}

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./youtubedata.db', (err) => {
  if (err) { console.log(err) }
});

class DBQuery {
  constructor() {
    //nothing for now
  }

  async newVideo(google_id) {
    let videoExists = await this.checkExists("videos", "google_id", google_id);

    if (!videoExists) {
      let insert = "INSERT INTO videos (google_id, date_added) VALUES ($google_id, date('now'))";
      return new Promise( (resolve, reject) => {
        db.run(insert, { $google_id: google_id }, function(err) {
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

  checkExists(table, column, value) {
    let select = `SELECT EXISTS (SELECT * FROM ${table} WHERE ${column} = $value)`;

    return new Promise( (resolve, reject) => {
      db.get(select, { $value:value }, (err, row) => {
        if (err) { reject(err); }
        if (row) {
          let key = Object.keys(row);
          let exists = (row[key] == 1 ? true : false);
          resolve(exists);
        }
      });
    });
  }
}

db.on("open", async () => {
  const query = new DBQuery();
  let nextRow = await query.newVideo('fD-SWaIT8uk');
  console.log(nextRow);
});

// function quickSelect() {
//   let select = "SELECT * from videos";
//   db.each(select, {}, (err, row) => {
//     if (err) { console.log(err) };
//     if (row) { console.log(row) };
//   });
//
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

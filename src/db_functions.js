const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./youtubedata.db', (err) => {
  if (err) { console.log(err) }
});

db.on("open", () => {
  quickDelete();
})

function quickInsert() {
  let insert = "INSERT INTO videos (google_id, date_added) VALUES ($google_id, date('now'))";
  let args = { $google_id: 'ZXJWO3FQ16c' };

  db.run(insert, args, function(err, res) {
    if (err) {
      console.log(err);
    }
    if (res) {
      console.log(res);
    }
  });
}

function quickSelect() {
  let select = "SELECT * from videos";
  db.each(select, {}, (err, row) => {
    if (err) { console.log(err) };
    if (row) { console.log(row) };
  });

}

function quickUpdate() {
  let update = "UPDATE videos SET google_id = $google_id WHERE google_id = $badGoogleID";
  let args = {
    $google_id: 'ZXJWO2FQ16c',
    $badGoogleID: 'ZXJWO3FQ16c',
  }

  db.run(update, args, (err) => {
    if (err) { console.log(err) };
  });
}

function quickDelete() {
  let drop = "DELETE FROM videos WHERE video_id = 2";

  db.run(drop, {}, (err) => {
    if (err) { console.log(err) };
  });
}



// class Test2 {
//   constructor(thing) {
//     this.thing = thing;
//   }
// }
//
// module.exports = {
//   test1: test1,
//   Test2: Test2
// }

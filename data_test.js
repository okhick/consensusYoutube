const Max = require('max-api');

// Use the 'addHandler' function to register a function for a particular message
Max.addHandler("bang", () => {
  let obj = {
    dope: 1,
    deep: 14
  }
  let array = [1, 2, 3, 4]
	Max.outlet(array);
});

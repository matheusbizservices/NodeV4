const fs = require('fs');
const path = require('path');

const sampleFilesDir = path.join(__dirname, 'sample-files');
const sampleFile = path.join(sampleFilesDir, 'sample.txt');

// Write a sample file for demonstration
fs.mkdirSync(sampleFilesDir, { recursive: true });
fs.writeFileSync(sampleFile, 'Hello, async world!');

// 1. Callback style
// fs.readFile does not return the data. It calls our function when it is done.
function readWithCallback(done) {
  fs.readFile(sampleFile, 'utf8', (err, data) => {
    if (err) {
      done(err);
      return;
    }
    console.log('Callback read:', data);
    done(null, data);
  });
}

// Callback hell example (test and leave it in comments):
// Each step that needs the result of the previous one gets nested inside it,
// so the code drifts to the right and every level repeats its own error check.
//
// fs.readFile(sampleFile, 'utf8', (err, first) => {
//   if (err) return console.log('failed on first read');
//   fs.writeFile(copyFile, first, (err) => {
//     if (err) return console.log('failed on write');
//     fs.readFile(copyFile, 'utf8', (err, second) => {
//       if (err) return console.log('failed on second read');
//       fs.unlink(copyFile, (err) => {
//         if (err) return console.log('failed on delete');
//         console.log('done');
//       });
//     });
//   });
// });

// 2. Promise style
// Wrap the callback API in a Promise so we can chain .then() / .catch().
function readWithPromise() {
  return new Promise((resolve, reject) => {
    fs.readFile(sampleFile, 'utf8', (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(data);
    });
  });
}

// 3. Async/Await style
// Same Promise underneath, but it reads top to bottom like normal code.
// try/catch handles the error case.
async function readWithAsyncAwait() {
  try {
    const data = await fs.promises.readFile(sampleFile, 'utf8');
    console.log('Async/await read:', data);
  } catch (err) {
    console.log('Could not read file:', err.message);
  }
}

// Run the three patterns one after another so the output order is predictable.
readWithCallback((err) => {
  if (err) {
    console.log('Could not read file:', err.message);
    return;
  }

  readWithPromise()
    .then((data) => {
      console.log('Promise read:', data);
    })
    .catch((err) => {
      console.log('Could not read file:', err.message);
    })
    .then(readWithAsyncAwait);
});

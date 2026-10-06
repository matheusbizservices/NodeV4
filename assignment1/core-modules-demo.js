const os = require('os');
const path = require('path');
const fs = require('fs');

const sampleFilesDir = path.join(__dirname, 'sample-files');
if (!fs.existsSync(sampleFilesDir)) {
  fs.mkdirSync(sampleFilesDir, { recursive: true });
}

// OS module
console.log('Platform:', os.platform());
console.log('CPU:', os.cpus()[0].model);
console.log('Total Memory:', os.totalmem());

// Path module
const joinedPath = path.join(sampleFilesDir, 'folder', 'file.txt');
console.log('Joined path:', joinedPath);

// fs.promises API
async function fsPromisesDemo() {
  const demoFile = path.join(sampleFilesDir, 'demo.txt');
  await fs.promises.writeFile(demoFile, 'Hello from fs.promises!');
  const content = await fs.promises.readFile(demoFile, 'utf8');
  console.log('fs.promises read:', content);
}

// Streams for large files- log first 40 chars of each chunk
async function streamDemo() {
  const largeFile = path.join(sampleFilesDir, 'largefile.txt');

  let lines = '';
  for (let i = 1; i <= 100; i++) {
    lines += `This is line ${i} in a large file.\n`;
  }
  await fs.promises.writeFile(largeFile, lines);

  await new Promise((resolve, reject) => {
    // highWaterMark sets the chunk size: 1024 bytes = 1KB per chunk.
    const stream = fs.createReadStream(largeFile, {
      encoding: 'utf8',
      highWaterMark: 1024,
    });
    stream.on('data', (chunk) => {
      console.log('Read chunk:', chunk.slice(0, 40).replace(/\n/g, ' '));
    });
    stream.on('end', () => {
      console.log('Finished reading large file with streams.');
      resolve();
    });
    stream.on('error', reject);
  });
}

async function main() {
  await fsPromisesDemo();
  await streamDemo();
}

main().catch((err) => {
  console.log('Something went wrong:', err.message);
});

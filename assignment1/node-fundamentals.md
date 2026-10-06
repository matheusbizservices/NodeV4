# Node.js Fundamentals

## What is Node.js?
Node.js is a runtime that lets you run JavaScript outside of a web browser, for example on your own computer or on a server. It is built on Chrome's V8 engine and adds extra tools around it, like reading and writing files, talking to the network, and reading the operating system. That is what lets us build backends, APIs, and command-line tools in JavaScript.

## How does Node.js differ from running JavaScript in the browser?
In the browser, JavaScript works with the page. It has `window`, `document`, and the DOM, and it runs in a sandbox that cannot touch the user's files. Node has none of those. There is no page, so there is no `window` or `document`. Instead Node has `global`, `process`, `__dirname`, and `__filename`, plus core modules like `fs`, `path`, and `os` for the file system and operating system. Node also loads code with modules (`require` or `import`) and is a good place to keep secrets, because the code stays on the server and users cannot inspect it.

## What is the V8 engine, and how does Node use it?
V8 is the JavaScript engine Google made for Chrome. It is the program that reads JavaScript and compiles it into fast machine code. Node embeds V8 to run our JavaScript, then wraps it with its own C++ and libuv layer, which provides the event loop and non-blocking I/O. So V8 runs the JavaScript, and Node supplies the file, network, and OS features that V8 does not have on its own.

## What are some key use cases for Node.js?
- Web servers and REST APIs (this course uses Express)
- Command-line tools and automation scripts
- Real-time apps such as chat, live notifications, and dashboards
- Tools that read, write, or process files and data streams
- Build tools and tooling for front-end projects

## Explain the difference between CommonJS and ES Modules. Give a code example of each.
Both are ways to split code into files and share it between them. CommonJS is the original Node system. It uses `require()` to import and `module.exports` to export, and it loads modules synchronously. ES Modules are the official JavaScript standard. They use `import` and `export`, work in browsers too, and are loaded asynchronously. In Node, a file uses ES Modules if it ends in `.mjs` or the project's `package.json` has `"type": "module"`. I would use CommonJS for this course's Node projects, since that is how Node works by default, and ES Modules when the code is shared with front-end code or when I want the modern standard syntax.

**CommonJS (default in Node.js):**
```js
// math.js
function add(a, b) {
  return a + b;
}
module.exports = { add };

// app.js
const { add } = require('./math');
console.log(add(2, 3)); // 5
```

**ES Modules (supported in modern Node.js):**
```js
// math.mjs
export function add(a, b) {
  return a + b;
}

// app.mjs
import { add } from './math.mjs';
console.log(add(2, 3)); // 5
```

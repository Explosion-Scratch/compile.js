# Compiler.js - A unified compiler library

Ok, here's how it works:

```js
let compiler = new Compiler({from: "less", to: "css"});

//Load it, because if you didn't then there would be a bunch of massive libraries as dependencies on this project
await compiler.load(/* cdn provider here, defaults to "cdnjs" */);

/* Code in less, an improved version of CSS */
let lessCode = `
* {
  color: red;
  span {
    color: white
  }
}`

let result = await compiler.run({code: lessCode, options: {/* opts to the less compiler */}});

console.log(result.css); // Should be compiled to regular old CSS now!
```

And of course it supports other compilers, here they are:

- `less` -> `css`: Less.js to CSS code
- `jade` -> `html`: Jade to HTML
- `xml` -> `json`: XML to JSON
- `json` -> `xml`: JSON to XML
- `ts` -> `js`: Typescript to JavaScript
- `js` -> `js_beautified`: Prettier

More coming soon!

## Features
- Runs using web workers (When possible)
- It's super easy to add your own compiler
- Loads libraries on demand, therefore not loading everything at once
- A simple to use, unified API
- Lots of stuff supported and more coming soon!

### [Run tests in your browser, online](https://explosion-scratch.github.io/compile.js)

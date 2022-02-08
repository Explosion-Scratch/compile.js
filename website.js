const TESTS = {
  XML2JSON: {
    from: "xml",
    to: "json",
    input:
      "<MyRoot><test>Success</test><test2><item>val1</item><item>val2</item></test2></MyRoot>",
    expect: {
      MyRoot: {
        test: "Success",
        test2: {
          item: ["val1", "val2"]
        }
      }
    }
  },
  JSON2XML: {
    from: "json",
    to: "xml",
    input: {
      MyRoot: {
        test: "Success",
        test2: {
          item: ["val1", "val2"]
        }
      }
    },
    expect:
      "<MyRoot><test>Success</test><test2><item>val1</item><item>val2</item></test2></MyRoot>"
  },
  TS2JS: {
    from: "ts",
    to: "js",
    input: `let t:number = 3;`,
    expect: {
      outputText: "var t = 3;\r\n",
      diagnostics: [],
      sourceMapText: undefined
    }
  },
  prettier: {
    from: "js",
    to: "js_beautified",
    input: "console.log(    'test')\n\n;",
    expect: 'console.log("test");\n'
  },
  jade2HTML: {
    from: "jade",
    to: "html",
    input: `p This is Jade! Here's a variable: #{foo}`,
    expect: "<p>This is Jade! Here's a variable: cool</p>",
    options: { foo: "cool" }
  },
  less2CSS: {
    from: "less",
    to: "css",
    input:
      "* {\n      color: #333;\n      font-family: sans-serif;\n\n      &:focus {\n        outline: none;\n      }\n\n      a {\n        text-decoration: none;\n        color: lightseagreen;\n        &:hover {\n          opacity: .8;\n        }\n      }\n    }",
    expect: {
      css:
        "* {\n  color: #333;\n  font-family: sans-serif;\n}\n*:focus {\n  outline: none;\n}\n* a {\n  text-decoration: none;\n  color: lightseagreen;\n}\n* a:hover {\n  opacity: 0.8;\n}\n",
      imports: []
    }
  }
};

async function runTests() {
  for (let [name, test] of Object.entries(TESTS)) {
    let li = document.createElement("li");
    li.id = name;
    name = name.replace("2", " to ");
    name = name[0].toUpperCase() + name.slice(1);
    li.innerHTML = `<span class="icon"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--eos-icons" width="32" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8z" opacity=".5" fill="currentColor"></path><path d="M20 12h2A10 10 0 0 0 12 2v2a8 8 0 0 1 8 8z" fill="currentColor"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"></animateTransform></path></svg></span><span class="text"></span>`;
    li.querySelector(".text").innerText = `Running ${name}`;
    document.querySelector("ul").appendChild(li);
    compile({
      from: test.from,
      to: test.to,
      code: test.input,
      options: test.options || {}
    }).then((result) => {
      try {
        chai.expect(result).to.eql(test.expect);
        li.querySelector(".text").innerText = `${name} test worked`;
        li.querySelector(
          ".icon"
        ).innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--mdi" width="32" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path d="M21 7L9 19l-5.5-5.5l1.41-1.41L9 16.17L19.59 5.59L21 7z" fill="currentColor"></path></svg>`;
        li.classList.add("success");
      } catch (_) {
        li.querySelector(".text").innerText =
          `${name} test failed: ` + _.message;
        li.querySelector(
          ".icon"
        ).innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--iconoir" width="32" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><g stroke-width="1.5" fill="none"><path d="M19 11v9.4a.6.6 0 0 1-.6.6H5.6a.6.6 0 0 1-.6-.6V11" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path><path d="M10 17v-6" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path><path d="M14 17v-6" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path><path d="M21 7h-5M3 7h5m0 0V3.6a.6.6 0 0 1 .6-.6h6.8a.6.6 0 0 1 .6.6V7M8 7h8" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>`;
        li.classList.add("failed");
      }
    });
  }
}

function showMsg(text) {
  let li = document.createElement("li");
  li.innerText = text;
  document.querySelector("ul").appendChild(li);
}

let style = `h1 {
  font-family: Sans-Serif;
  color: #333;
}

body {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  opacity: 1 !important;
}

ul {
  font-family: Sans-Serif;
  padding: 0;

  li {
      width: clamp(400px, 70vw, 600px);
      border: 2px solid #facc15;
      transition: border-color .2s ease;
      list-style: none;
      padding: 10px 20px;
      border-radius: 5px;
      margin: 10px;
      display: flex;
      align-items: center;
      box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px;

      .icon {
          margin-right: 5px;
          transform: scale(.8);
      }

      &.success {
          border-color: #22c55e;
      }

      &.failed {
          border-color: #ef4444;
      }

      &.running {
          border-color: #facc15;
      }
  }
}`;

compile({ code: style, to: "css", from: "less" }).then((result) => {
  let s = document.createElement("style");
  s.innerHTML = result.css;
  document.head.appendChild(s);
  runTests();
});

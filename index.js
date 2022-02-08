const COMPILERS = [
  {
    from: ["less"],
    to: ["css"],
    requires: [
      {
        name: "less.js",
        urls: {
          jsdelivr: ["https://cdn.jsdelivr.net/npm/less@4"],
          cdnjs: [
            "https://cdnjs.cloudflare.com/ajax/libs/less.js/4.1.2/less.min.js"
          ]
        }
      }
    ],
    isAsync: true,
    inWorker: false,
    compile: async ({ code, options }) => {
      return await less.render(code, options);
    }
  },
  {
    from: ["ts", "typescript"],
    to: ["js", "javascript"],
    requires: [
      {
        name: "typescript",
        urls: {
          cdnjs: [
            "https://cdnjs.cloudflare.com/ajax/libs/typescript/4.5.5/typescript.min.js"
          ]
        }
      }
    ],
    isAsync: false,
    inWorker: true,
    compile: async ({ code, options }) => {
      return ts.transpileModule(code, options);
    }
  }
];

class WebWorker {
  constructor(fn) {
    this.hub = new hub();
    let code = `(async => {
      console.debug("Web worker started")
      self.onmessage = async ({data: msg}) => {
        console.debug("Got message: ", msg)
        if (msg.type === "run"){
          const CODE = msg.code;
          const OPTIONS = msg.options || {};
          postMessage({
            type: "run",
            result: await (${fn})({code: msg.code, options: msg.options || {}}),
            id: msg.id,
          })
        }
        if (msg.type === "loadScript"){
          if (msg.method === "fetch"){
            eval(await fetch(msg.url).then(res => res.text()));
            console.debug("Loaded %o", msg.url);
            postMessage({type: "loaded", url: msg.url, id: msg.id})
          } else if (msg.method === "import"){
            importScripts(msg.url);
            console.debug("Loaded %o", msg.url);
            postMessage({type: "loaded", url: msg.url, id: msg.id})
          }
        }
      }
    })()`;
    this.worker = new Worker(
      URL.createObjectURL(new Blob([code]), {
        type: "application/javascript; charset=utf-8"
      })
    );
    this.worker.onmessage = ({ data: msg }) => {
      this.hub.emit(msg.type, { ...msg });
      this.hub.emit(msg.id, { ...msg });
    };
  }
  getResponse(message) {
    return new Promise((resolve) => {
      let id = Math.random().toString(36).slice(2);
      this.hub.on(id, resolve);
      this.worker.postMessage({ ...message, id });
    });
  }
  async stop() {
    this.worker.terminate();
  }
  loadScript(script, method = "import") {
    return this.getResponse({
      type: "loadScript",
      url: script,
      method
    });
  }
  async run(code, options) {
    return (await this.getResponse({ type: "run", code, options })).result;
  }
}

class Compiler {
  constructor({ from, to, logLevel = "debug" }) {
    const logLevels = {
      error: ["error"],
      warn: ["error", "warn"],
      log: ["error", "warn", "log"],
      info: ["error", "warn", "log", "info"],
      debug: ["error", "warn", "log", "info", "debug"]
    };
    this.log = logLevels[logLevel];
    Object.assign(this, { from, to });
    //_compiler to denote it's inner
    this._compiler = COMPILERS.find(
      (i) => i.from.includes(from) && i.to.includes(to)
    );
    return this;
  }
  //private method syntax I think
  l(method, ...data) {
    if (this.log.includes(method)) {
      console[method](...data);
    }
  }
  run(code, options) {
    this.l("log", "Running");
    if (this._compiler.inWorker) {
      return new Promise(async (res) => {
        this.l("debug", "[Web worker] Running");
        let result = await this.worker.run(code, options);
        this.l("debug", "[Web worker] Done running, got %o as result", result);
        res(result);
      });
    } else {
      if (this._compiler.isAsync) {
        return new Promise((resolve) => {
          this._compiler.compile({ code, options }).then(resolve);
        });
      } else {
        return this._compiler.compile({ code, options });
      }
    }
  }
  load(cdnProvider = "cdnjs") {
    return new Promise(async (resolve) => {
      let c = this._compiler;
      //Log fn used by loadScripts
      let l = (...a) => this.l(...a);
      this.l("debug", "Compiler is: ", c);
      let worker;
      if (c.inWorker === true) {
        worker = new WebWorker(c.compile);
        this.worker = worker;
      }
      for (let resource of c.requires) {
        if (resource.urls[cdnProvider]) {
          await loadScripts(resource.urls[cdnProvider]);
        } else {
          let newProvider = Object.keys(resource.urls)[0];
          this.l(
            "warn",
            `Couldn't find CDN provider ${cdnProvider}, using ${newProvider} instead.`
          );
          await loadScripts(resource.urls[newProvider]);
        }
      }

      resolve();
      async function loadScripts(arr) {
        if (c.inWorker) {
          for (let s of arr) {
            l("debug", `[Web worker] Loading script %o`, s);
            await worker.loadScript(s);
            l("debug", `[Web worker] Loaded script %o`, s);
          }
        } else {
          for (let url of arr) {
            l("debug", "[Main thread] Loading script %o", url);
            let s = document.createElement("script");
            s.src = url;
            document.head.appendChild(s);
            await new Promise((r) => (s.onload = r));
            l("debug", "[Main thread] Loaded script %o", url);
          }
        }
      }
    });
  }
}

function hub() {
  return {
    hub: Object.create(null),
    emit(event, data) {
      (this.hub[event] || []).forEach((handler) => handler(data));
    },
    on(event, handler) {
      if (!this.hub[event]) this.hub[event] = [];
      this.hub[event].push(handler);
    },
    off(event, handler) {
      const i = (this.hub[event] || []).findIndex((h) => h === handler);
      if (i > -1) this.hub[event].splice(i, 1);
      if (this.hub[event].length === 0) delete this.hub[event];
    }
  };
}

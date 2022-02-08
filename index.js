const COMPILERS = [
  {
    //This should probably be an array right?
    from: ["less"],
    to: ["css"],
    //cdns
    requires: [
      {
        name: "less.js",
        urls: {
          //Should be able to import multiple
          jsdelivr: ["https://cdn.jsdelivr.net/npm/less@4"]
        }
      }
    ],
    //If it's asyncronous
    isAsync: true,
    //Run in web worker (if possible)
    inWorker: false,
    compile: (code) => {}
  },
  {
    from: ["test"],
    to: ["test2"],
    isAsync: false,
    inWorker: true,
    requires: [],
    compile: ({ code, options }) => {
      return `CODE: ${code
        .slice(0, 50)
        .toUpperCase()}, options: ${JSON.stringify(options)}`;
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
            postMessage({type: "loaded", url: msg.url, id: msg.id})
          } else if (msg.method === "import"){
            importScripts(msg.url);
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
  loadScript(script, method = "fetch") {
    return this.getResponse({
      type: "loadScript",
      url: script
    });
  }
  run(code, options) {
    return this.getResponse({ type: "run", code, options });
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
  #l(method, ...data) {
    if (this.log.includes(method)) {
      console[method](...data);
    }
  }
  run(code, options) {
    this.#l("log", "Running");
    if (this._compiler.inWorker) {
      return new Promise(async (res) => {
        this.#l("debug", "[Web worker] Running");
        let result = await this.worker.run(code, options);
        this.#l("debug", "[Web worker] Done running");
        res(result);
      });
    } else {
      if (this._compiler.isAsync) {
        return new Promise((resolve) => {
          this._compiler.compile(code, options).then(resolve);
        });
      } else {
        return this._compiler.compile(code, options);
      }
    }
    this.#l("log", "Ran");
  }
  load(cdnProvider = "cdnjs") {
    return new Promise(async (resolve) => {
      let c = this._compiler;
      this.#l("debug", "Compiler is: ", c);
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
          this.#l(
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
            this.#l("debug", `[Web worker] Loading script %o`, s);
            await worker.loadScript(s);
            this.#l("debug", `[Web worker] Loaded script %o`, s);
          }
        } else {
          for (let url of arr) {
            this.#l("debug", "[Main thread] Loading script %o", url);
            let s = document.createElement("script");
            s.src = url;
            document.head.appendChild(s);
            await new Promise((r) => (s.onload = r));
            this.#l("debug", "[Main thread] Loaded script %o", url);
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

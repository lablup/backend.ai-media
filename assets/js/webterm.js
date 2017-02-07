'use strict';

const Terminal = require('terminal.js');
const SockJS = require('sockjs-client');

class Webterm {
  constructor(container, sessionId) {
    this.container = container;
    this.term = null;
    this.pinger = null;
    this.backoff = 0;
    this.sessId = sessionId;
    this._sock = null;
    this._connecting = false;
    this._connected = false;
    this.streamOnHandlers = {};
    this.streamOnceHandlers = {};
    this.writable = null;
    this.restartLoadingTick = null;
  }

  get connecting() {
    return this._connecting;
  }

  get connected() {
    return this._connected;
  }

  connect() {
    return new Promise((resolve, reject) => {

      if (this._connecting) {
        reject('already connecting');
        return;
      }
      if (this._connected) {
        reject('already connected');
        return;
      }

      this.term = new Terminal(this.container);
      this.term.state.reset();
      this.term.write("Loading your terminal...\r\n");

      let url = "//" + document.domain
                + (location.port ? (":" + location.port) : "")  + "/ws?lang=git";
      this._sock = new SockJS(url);

      let writable = {};
      writable.removeListener = () => { };
      writable.on = (type, handler) => {
        this.streamOnHandlers[type] = handler;
      };
      writable.once = (type, handler) => {
        this.streamOnceHandlers[type] = handler;
      };
      writable.emit = (ev) => {
        let args = [];
        Array.prototype.push.apply(args, arguments);
        args.shift();
        if (this.streamOnHandlers[ev])
          this.streamOnHandlers[ev].apply(writable, args);
      };
      writable.write = (data) => {
        if (this._connected) {
          let msg = JSON.stringify({
            "sid": this.sessId,
            "type": "stdin",
            "chars": btoa(data),
          });
          this._sock.send(msg);
        }
      };
      this.writable = writable;
      this.term.dom(this.container).pipe(writable);

      let is_settled = false;

      this._sock.onopen = () => {
        this.pinger = window.setInterval(() => {
          if (this._connected) {
            this._sock.send(JSON.stringify({
              "sid": this.sessId,
              "type": "ping"
            }));
          }
        }, 5000);
        this.requestRedraw();
        this.initialKeystroke = window.setInterval(() => {
          this.requestRedraw();
        }, 300);
      };

      this._sock.onmessage = (e) => {
        if (!is_settled) {
          window.clearInterval(this.initialKeystroke);
          is_settled = true;
          this._connecting = false;
          this._connected = true;
          resolve();
        }
        if (this.restartLoadingTick) {
          this.term.write('\x1b[?25h');
          this.requestRedraw();
          this.resizeToFit();
          window.clearInterval(this.restartLoadingTick);
          this.restartLoadingTick = null;
        }
        let data = JSON.parse(e.data);
        switch (data.type) {
        case "out":
          this.term.write(atob(data.data));
          break;
        case "error":
          this.term.write('\r\n\x1b[37;41;1m Ooops, we got a server error! \x1b[0;31m\r\n' + data.reason + '\x1b[0m\r\n');
          break;
        }
      };

      this._sock.onerror = (e) => {
        if (this.streamOnHandlers["error"])
          this.streamOnHandlers["error"].apply(writable);
        if (!is_settled) {
          is_settled = true;
          this._connecting = false;
          reject('connection failure');
        }
        this._connected = false;
      };

      this._sock.onclose = (e) => {
        this._connecting = false;
        this._connected = false;
        if (this.streamOnHandlers["close"])
          this.streamOnHandlers["close"].apply(writable);
        if (this.streamOnceHandlers["close"]) {
          this.streamOnceHandlers["close"].apply(writable);
          this.streamOnceHandlers["close"] = undefined;
        }
        if (!is_settled) {
          is_settled = true;
          reject('connection failure');
        }
        console.log('close (' + e.code + ', ' + e.reason + ')');
        if (e.code == 3000) {
          this.term.write('\r\n\x1b[37;44;1m Server terminated! \x1b[0m');
          this.term.write('\r\n\x1b[36mTo launch your terminal again, click "Run" button on the sidebar.\x1b[0m\r\n');
        }
        this._sock = null;
        this.writable = null;
        window.clearInterval(this.pinger);
        this.pinger = null;
      };
    });
  }

  focus() {
    this.container.focus();
  }

  requestRedraw() {
    // Ctrl+L (redraw term)
    this.writable.write('\x0c');
  }

  resizeToFit(elem) {
    if (typeof elem == 'undefined') {
      elem = this.container;
    }
    let targetWidth = elem.offsetWidth;
    let targetHeight = elem.offsetHeight;
    let tempText = document.createElement('div');
    let computedStyle = window.getComputedStyle(this.container);
    tempText.style.fontFamily = computedStyle.fontFamily;
    tempText.style.fontSize = computedStyle.fontSize;
    tempText.style.fontStyle = computedStyle.fontStyle;
    tempText.style.fontStretch = computedStyle.fontStretch;
    tempText.style.lineHeight = computedStyle.lineHeight;
    tempText.style.position = 'absolute';
    tempText.style.visibility = 'hidden';
    tempText.style.whiteSpace = 'nowrap';
    tempText.style.padding = '0';
    tempText.style.margin = '0';
    tempText.innerText = 'A';
    document.body.appendChild(tempText);
    let charWidth = tempText.offsetWidth;
    let charHeight = tempText.offsetHeight;
    tempText.remove();
    let numRows = parseInt(targetHeight / charHeight) - 2;
    let numCols = parseInt(targetWidth / charWidth) - 2;
    numCols = 80; // FIXME

    console.log('resize to ' + numRows + ' rows and ' + numCols + ' cols.');
    this.term.state.resize({rows: numRows, columns: numCols});
    if (this._connected) {
      this._sock.send(JSON.stringify({
        "sid": this.sessId,
        "type": "resize",
        "rows": numRows,
        "cols": numCols
      }));
    }
  }

  restartKernel() {
    this._sock.send(JSON.stringify({
      "sid": this.sessId,
      "type": "restart"
    }));
    this.term.write('\r\n\x1b[37;42;1m Terminal restarting... \x1b[0m\r\n');
    this.term.write('\x1b[?25l\x1b[s');
    this.restartTick = 0;
    this.restartLoadingTick = window.setInterval(() => {
      this.restartTick = (this.restartTick + 1) % 5;
      var tick = '';
      for (var i = 0; i < 5; i++) {
        tick += (i == this.restartTick) ? 'o' : '.';
      }
      this.term.write('\x1b[u\x1b[2K');
      this.term.write('\x1b[32m' + tick + '\x1b[0m');
      this.requestRedraw();
    }, 300);
  }

}

export default Webterm;

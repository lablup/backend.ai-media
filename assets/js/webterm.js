'use strict';

const Terminal = require('xterm');
const SockJS = require('sockjs-client');
const Writable = require('stream').Writable;

require("!!style-loader!css-loader!../vendor/xterm/xterm.css");

function b64EncodeUnicode(str) {
  return window.btoa(unescape(encodeURIComponent( str )));
  //return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
  //  return String.fromCharCode('0x' + p1);
  //}));
}

function b64DecodeUnicode(str) {
  try {
    return decodeURIComponent(escape(window.atob( str )));
    //return decodeURIComponent(Array.prototype.map.call(atob(str), function(c) {
    //  return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    //}).join(''));
  } catch (e) {
    // do nothing
  }
}


class SocketWritable extends Writable {
  constructor(sessId, sock) {
    super();
    this._sessId = sessId;
    this._sock = sock;
  }

  write(chunk, encoding, cb) {
    if (this._sock === null)
      return;
    let msg = JSON.stringify({
      "sid": this._sessId,
      "type": "stdin",
      "chars": b64EncodeUnicode(chunk),
    });
    this._sock.send(msg);
    if (cb) cb();
  }
}

class Webterm {
  constructor(container, sessionId) {
    this.container = container;
    this.term = null;
    this.pinger = null;
    this.sessId = sessionId;
    this._sock = null;
    this._connecting = false;
    this._connected = false;
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

      let created = false;
      if (this.term === null) {
        this.term = new Terminal();
        this.term.open(this.container);
        created = true;
      }
      this.term.reset();
      this.term.write("Loading your terminal...\r\n");

      let url = "//" + document.domain
                + (location.port ? (":" + location.port) : "")  + "/ws?lang=git";
      this._sock = new SockJS(url);

      // TODO: remove existing handlers
      this.writable = new SocketWritable(this.sessId, this._sock);
      if (created) {
        this.term.on('data', (data) => {
          if (this.writable !== null) {
            this.writable.write(data);
          }
        });
      }

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
          this.term.write(b64DecodeUnicode(data.data));
          break;
        case "error":
          this.term.write('\r\n\x1b[37;41;1m Ooops, we got a server error! \x1b[0;31m\r\n' + data.reason + '\x1b[0m\r\n');
          break;
        }
      };

      this._sock.onerror = (e) => {
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
        if (!is_settled) {
          is_settled = true;
          reject('connection failure');
        }
        console.log('close (' + e.code + ', ' + e.reason + ')');
        switch (e.code) {
        case 1000:
          this.term.write('\r\n\x1b[37;44;1m Server terminated! \x1b[0m');
          this.term.write('\r\n\x1b[36mTo launch your terminal again, click "Run" button on the sidebar.\x1b[0m\r\n');
          break;
        default:
          this.term.write('\r\n\x1b[37;41;1m Server refused to connect! \x1b[0;31m\r\nError: ' + e.reason + '\r\nPlease try again later.\x1b[0m\r\n');
          break;
        }
        this._sock = null;
        this.writable = null;
        window.clearInterval(this.pinger);
        this.pinger = null;
      };
    });
  }

  close() {
    this._connecting = false;
    this._connected = false;
    this._sock.close(1000, 'User has moved away.');
    this._sock = null;
    this.writable = null;
    window.clearInterval(this.pinger);
    this.pinger = null;
  }

  focus() {
    this.container.focus();
  }

  requestRedraw() {
    // Ctrl+L (redraw term)
    this.writable.write('\x0c');
  }

  resizeToFit(elem, opts) {
    if (typeof elem == 'undefined') {
      elem = this.container;
    }
    opts = opts || {};
    opts.maxRows = ('maxRows' in opts) ? opts.maxRows : 0;
    opts.maxCols = ('maxCols' in opts) ? opts.maxCols : 0;
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
    if (opts.maxRows > 0)
      numRows = Math.min(numRows, opts.maxRows);
    if (opts.maxCols > 0)
      numCols = Math.min(numCols, opts.maxCols);
    this.term.resize(numCols, numRows);
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

'use strict';

import { Terminal } from 'xterm';
import base64js from 'base64-js';
require("fast-text-encoding");  // for side-effects
require("xterm/src/xterm.css");
require("styles/xterm.custom.css");

const _tencoder = new TextEncoder('utf-8');
const _tdecoder = new TextDecoder('utf-8');

function Base64Encode(str) {
    let bytes = _tencoder.encode(str);
    return base64js.fromByteArray(bytes);
}

function Base64Decode(str, encoding = 'utf-8') {
    let bytes = base64js.toByteArray(str);
    return _tdecoder.decode(bytes);
}

const defaultTheme = {
  foreground: '#c5c1c1',
  background: '#131416',
};

class Webterm {
  constructor(container, sessionId, {theme=defaultTheme} = {}) {
    this.container = container;
    this.term = null;
    this.pinger = null;
    this.sessId = sessionId;
    this._sock = null;
    this._connecting = false;
    this._connected = false;
    this.stdin = null;
    this.restartLoadingTick = null;
    this._theme = theme;
  }

  get connecting() {
    return this._connecting;
  }

  get connected() {
    return this._connected;
  }

  connect(url) {
    return new Promise((resolve, reject) => {

      if (this._connecting) {
        reject('already connecting');
        return;
      }
      if (this._connected) {
        reject('already connected');
        return;
      }

      if (this.term === null) {
        this.term = new Terminal({
          fontFamily: 'Input-Mono, Menlo, Consolas, Courier-New, Courier, monospace',
          theme: this._theme,
        });
        this.term.open(this.container);
      } else {
        this.term.off('data', this.stdin);
      }
      this.term.reset();
      this.term.write("Loading your terminal...\r\n");

      this._sock = new WebSocket(url);
      this.stdin = (chunk) => {
        if (this._sock === null)
          return;
        let msg = JSON.stringify({
          "sid": this.sessId,
          "type": "stdin",
          "chars": Base64Encode(chunk),
        });
        this._sock.send(msg);
      };
      this.term.on('data', (chunk) => {
        this.stdin(chunk);
        return false;
      });

      let is_settled = false;

      this._sock.onopen = (ev) => {
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

      this._sock.onmessage = (ev) => {
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
        let data = JSON.parse(ev.data);
        switch (data.type) {
        case "out":
          this.term.write(Base64Decode(data.data));
          break;
        case "error":
          this.term.write('\r\n\x1b[37;41;1m Ooops, we got a server error! \x1b[0m');
          this.term.write(`\r\n\x1b[91m${data.reason}\x1b[0m\r\n`);
          break;
        }
      };

      this._sock.onerror = (ev) => {
        if (!is_settled) {
          is_settled = true;
          this._connecting = false;
          reject('connection failure');
        }
        this._connected = false;
      };

      this._sock.onclose = (ev) => {
        this._connecting = false;
        this._connected = false;
        if (!is_settled) {
          is_settled = true;
          reject('connection failure');
        }
        console.log(`close (${ev.code}, ${ev.reason})`);
        if (ev.code >= 1000 && ev.code < 2000) {
          this.term.write('\r\n\x1b[37;44;1m Server terminated! \x1b[0m');
          this.term.write('\r\n\x1b[94mTo launch your terminal again, click "Run" button on the sidebar.\x1b[0m\r\n');
        } else if (ev.code >= 4000 && ev.code < 5000) {
          this.term.write('\r\n\x1b[37;41;1m Server error! \x1b[0m');
          this.term.write(`\r\n\x1b[91mError: ${ev.reason}\r\nPlease try again later.\x1b[0m\r\n`);
        } else {
          this.term.write('\r\n\x1b[37;41;1m Server refused to connect! \x1b[0m');
          this.term.write(`\r\n\x1b[91mError: ${ev.reason}\r\nPlease try again later.\x1b[0m\r\n`);
        }
        this._sock = null;
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
    window.clearInterval(this.pinger);
    this.pinger = null;
  }

  focus() {
    this.container.focus();
  }

  requestRedraw() {
    // Ctrl+L (redraw term)
    this.stdin('\x0c');
  }

  resizeToFit(elem, {maxRows=0, maxCols=0} = {}) {
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
    if (maxRows > 0)
      numRows = Math.min(numRows, maxRows);
    if (maxCols > 0)
      numCols = Math.min(numCols, maxCols);
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

  get theme() {
    return this.term.getOption('theme');
  }

  set theme(value) {
    this.term.setOption('theme', value);
    this._theme = value;
  }

}

export default Webterm;

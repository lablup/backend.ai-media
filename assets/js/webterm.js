'use strict';

import { Terminal } from 'xterm';
import * as fit from 'xterm/lib/addons/fit/fit';
import base64js from 'base64-js';
require("fast-text-encoding");  // for side-effects
require("xterm/src/xterm.css");
require("styles/xterm.custom.css");

Terminal.applyAddon(fit);  // Apply the `fit` addon

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
    this._sock = null;
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
      }
      this.term.reset();
      this.term.write("Loading your terminal...\r\n");
      this._sock = new WebSocket(url);

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
        this._sock = null;
      };

      this._sock.onclose = (ev) => {
        window.clearInterval(this.pinger);
        this.pinger = null;
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
        // we don't destroy the terminal object to show error logs to user.
      };
    });
  }

  close() {
    this._sock.close(1000, 'User has moved away.');
  }

  focus() {
    this.term.focus();
  }

  requestRedraw() {
    // Ctrl+L (redraw term)
    this.stdin('\x0c');
    this.term.refresh(0, this.term.rows - 1, true);
  }

  resizeToFit(elem) {
    this.term.fit();
    if (this._connected) {
      this._sock.send(JSON.stringify({
        "sid": this.sessId,
        "type": "resize",
        "rows": this.term.rows,
        "cols": this.term.cols
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

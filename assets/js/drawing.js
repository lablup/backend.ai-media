'use strict';

__webpack_public_path__ = Sorna.assetRoot;
__webpack_require__.p = Sorna.assetRoot + 'js/';

var msgpack = require('msgpack-lite');

window.Sorna = window.Sorna || {};

window.Sorna.Drawing = {
  decode_commands: function(data) {
    var raw = atob(data);
    var u8array = new Uint8Array(new ArrayBuffer(raw.length));
    for (var i = 0; i < raw.length; i++)
      u8array[i] = raw.charCodeAt(i);
    return msgpack.decode(u8array);
  },

  _canvas_instances: {},
  _obj_map: {},

  get_canvas: function(canvas_id, container) {
    var _id = 'sorna-canvas-' + canvas_id;
    var canvas_elem = document.getElementById(_id);
    var canvas_obj = null;
    if (!canvas_elem) {
      canvas_elem = document.createElement('canvas');
      canvas_elem.id = _id;
      container.appendChild(canvas_elem);
      canvas_obj = new fabric.Canvas(_id, {width: 0, height: 0});
      this._canvas_instances[_id] = canvas_obj;
    } else {
      canvas_obj = this._canvas_instances[_id];
    }
    return canvas_obj;
  },

  get_object: function(canvas_id, obj_id) {
    var key = canvas_id + ':' + obj_id;
    return this._obj_map[key] || null;
  },

  register_object: function(canvas_id, obj_id, obj) {
    var key = canvas_id + ':' + obj_id;
    this._obj_map[key] = obj;
  },

  hex2rgba: function(val) {
    val = val.replace('#', '');
    var r = parseInt(val.substring(0, 2), 16),
        g = parseInt(val.substring(2, 4), 16),
        b = parseInt(val.substring(4, 6), 16),
        a = parseInt(val.substring(6, 8), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + (a/255) + ')';
  },

  update: function(result_id, type, data, container) {
    var cmds = this.decode_commands(data);
    for (var i = 0; i < cmds.length; i++) {
      var cmd = cmds[i];
      var canvas_id = cmd[0];
      var canvas = this.get_canvas(canvas_id, container);
      switch (cmd[1]) {
      case 'canvas':
        canvas.setWidth(cmd[2]);
        canvas.setHeight(cmd[3]);
        canvas.setBackgroundColor(this.hex2rgba(cmd[4]));
        canvas._sorna_default_fgcolor = this.hex2rgba(cmd[5]);
        break;
      case 'obj':
        var obj_id = cmd[2];
        var args = cmd[3];
        var obj = this.get_object(canvas_id, obj_id);
        if (obj == null) {
          // create
          switch (args[0]) {
          case 'line':
            obj = new fabric.Line([
              args[1], args[2],
              args[3], args[4]
            ], {
              stroke: this.hex2rgba(args[5]),
              selectable: false
            });
            break;
          case 'circle':
            obj = new fabric.Circle({
              left: args[1] - args[3],
              top: args[2] - args[3],
              radius: args[3],
              stroke: this.hex2rgba(args[4]),
              fill: this.hex2rgba(args[5]),
              angle: args[6],
              strokeWidth: 2,
              selectable: false
            });
            break;
          case 'rect':
            obj = new fabric.Circle({
              left: args[1],
              top: args[2],
              width: args[3],
              height: args[4],
              stroke: this.hex2rgba(args[5]),
              fill: this.hex2rgba(args[6]),
              angle: args[7],
              strokeWidth: 2,
              selectable: false
            });
            break;
          default:
            obj = null;
          }
          if (obj) {
            obj._sorna_id = obj_id;
            this.register_object(canvas_id, obj_id, obj);
            canvas.add(obj);
          }
        }
        break;
      case 'update':
        var obj_id = cmd[2];
        var obj = this.get_object(canvas_id, obj_id);
        if (obj == null)
          continue;
        var prop = cmd[3];
        var val = cmd[4];
        console.log('update', [canvas_id, obj_id], prop, val);
        switch (prop) {
        case 'x':
          if (obj.type == 'circle') val -= obj.radius;
          obj.setLeft(val);
          break;
        case 'y':
          if (obj.type == 'circle') val -= obj.radius;
          obj.setTop(val);
          break;
        case 'x1':
          obj.set('x1', val);
          break;
        case 'y1':
          obj.set('y1', val);
          break;
        case 'x2':
          obj.set('x2', val);
          break;
        case 'y2':
          obj.set('y2', val);
          break;
        case 'radius':
          obj.setRadius(val);
          break;
        case 'color':
          obj.setColor(this.hex2rgba(val));
          break;
        case 'border':
          obj.setStroke(this.hex2rgba(val));
          break;
        case 'fill':
          obj.setFill(this.hex2rgba(val));
          break;
        }
      }
      canvas.renderAll();
    }
  }
};


// vim: sts=2 sw=2 et

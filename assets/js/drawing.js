'use strict';

/* Sorna Simplified Drawing API for HTML5 Canvas. */

var msgpack = require('msgpack-lite');

module.exports.Drawing = {
  decode_commands: function(data) {
    var raw = atob(data);
    var u8array = new Uint8Array(new ArrayBuffer(raw.length));
    for (var i = 0; i < raw.length; i++)
      u8array[i] = raw.charCodeAt(i);
    return msgpack.decode(u8array);
  },

  _canvas_instances: {},
  _obj_map: {},
  _patched_fabric: false,
  _delay_between_animations: 300,

  _patch_fabric: function() {
    // Extend fabric.js's animation for color properties
    if (this._patched_fabric) return;

    // Calculate an in-between color. Returns a "rgba()" string.
    // Credit: Edwin Martin <edwin@bitstorm.org>
    //         http://www.bitstorm.org/jquery/color-animation/jquery.animate-colors.js
    function calculateColor(begin, end, pos) {
      var color = 'rgba('
          + parseInt((begin[0] + pos * (end[0] - begin[0])), 10) + ','
          + parseInt((begin[1] + pos * (end[1] - begin[1])), 10) + ','
          + parseInt((begin[2] + pos * (end[2] - begin[2])), 10);

      color += ',' + (begin && end ? parseFloat(begin[3] + pos * (end[3] - begin[3])) : 1);
      color += ')';
      return color;
    }

    // From fabric.js' GitHub repository.
    function animateColorUtil(fromColor, toColor, duration, options) {
      var startColor = new fabric.Color(fromColor).getSource(),
          endColor = new fabric.Color(toColor).getSource();

      options = options || {};

      fabric.util.animate(fabric.util.object.extend(options, {
        duration: duration || 500,
        startValue: startColor,
        endValue: endColor,
        byValue: endColor,
        easing: function (currentTime, startValue, byValue, duration) {
          var posValue = options.colorEasing
                ? options.colorEasing(currentTime, duration)
                : 1 - Math.cos(currentTime / duration * (Math.PI / 2));
          return calculateColor(startValue, byValue, posValue);
        }
      }));
    }

    fabric.util.animateColor = animateColorUtil;

    fabric.util.object.extend(fabric.Object.prototype, {
      animateColor: function() {
        if (arguments[0] && typeof arguments[0] === 'object') {
          var propsToAnimate = [ ], prop, skipCallbacks;
          for (prop in arguments[0]) {
            propsToAnimate.push(prop);
          }
          for (var i = 0, len = propsToAnimate.length; i < len; i++) {
            prop = propsToAnimate[i];
            skipCallbacks = i !== len - 1;
            this._animateColor(prop, arguments[0][prop], arguments[1], skipCallbacks);
          }
        }
        else {
          this._animateColor.apply(this, arguments);
        }
        return this;
      },

      _animateColor: function(property, to, options, skipCallbacks) {
        var _this = this, propPair;

        if (!options) {
          options = { };
        }
        else {
          options = fabric.util.object.clone(options);
        }

        if (~property.indexOf('.')) {
          propPair = property.split('.');
        }

        var currentValue = propPair
          ? this.get(propPair[0])[propPair[1]]
          : this.get(property);

        if (!('from' in options)) {
          options.from = currentValue;
        }


        fabric.util.animateColor(options.from, to, options.duration, {
          startValue: options.from,
          endValue: to,
          byValue: options.by,
          duration: options.duration,
          abort: options.abort && function() {
            return options.abort.call(_this);
          },
          onChange: function(value) {
            if (propPair) {
              _this[propPair[0]][propPair[1]] = value;
            }
            else {
              _this.set(property, value);
            }
            if (skipCallbacks) {
              return;
            }
            options.onChange && options.onChange();
          },
          onComplete: function() {
            if (skipCallbacks)
              return;
            _this.setCoords();
            options.onComplete && options.onComplete();
          }
        });
      }
    });
    this._patched_fabric = true;
  },

  _create_anim: function(/* variable args */) {
    return resolve => {
      var canvas = arguments[0];
      var obj = arguments[1];
      var args = Array.prototype.slice.call(arguments, 2);
      var last = args[args.length - 1];
      if (typeof last == 'object') {
        last.ease = fabric.util.ease.easeInOutExpo;
        last.duration = 350;
        last.onChange = () => { canvas.renderAll(); };
        last.onComplete = resolve;
      } else {
        args.push({
          ease: fabric.util.ease.easeInOutExpo,
          duration: 350,
          onChange: () => { canvas.renderAll(); },
          onComplete: resolve
        });
      }
      if (args[0] == 'fill' || args[0] == 'color') {
        obj.animateColor.apply(obj, args);
      } else {
        obj.animate.apply(obj, args);
      }
    };
  },

  get_canvas: function(canvas_id, container) {
    var _id = 'sorna-canvas-' + canvas_id;
    var canvas_elem = document.getElementById(_id);
    var canvas_obj = null;
    if (!canvas_elem) {
      canvas_elem = document.createElement('canvas');
      canvas_elem.id = _id;
      container.appendChild(canvas_elem);
      canvas_obj = new fabric.Canvas(_id, {width: 0, height: 0});
      canvas_obj._sorna_anim = true;
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
    this._patch_fabric();
    var _this = this;
    var cmds = this.decode_commands(data);
    var anim_chain = [];
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
      case 'stop-anim':
        canvas._sorna_anim = false;
        break;
      case 'resume-anim':
        canvas._sorna_anim = true;
        break;
      case 'obj':
        var obj_id = cmd[2];
        var args = cmd[3];
        var obj = this.get_object(canvas_id, obj_id);
        if (obj == null) {
          // create
          switch (args[0]) {
          case 'line':
            if (canvas._sorna_anim) {
              obj = new fabric.Line([
                args[1], args[2],
                args[1], args[2] // start from x1,y1
              ], {
                stroke: this.hex2rgba(args[5]),
                selectable: false
              });
              anim_chain.push([
                  this._create_anim(canvas, obj, 'x2', args[3]),
                  this._create_anim(canvas, obj, 'y2', args[4])
              ]);
            } else {
              obj = new fabric.Line([
                args[1], args[2],
                args[3], args[4]
              ], {
                stroke: this.hex2rgba(args[5]),
                selectable: false
              });
            }
            break;
          case 'circle':
            // TODO: implement animated creation
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
            // TODO: implement animated creation
            obj = new fabric.Rect({
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
        switch (prop) {
        case 'x':
          if (obj.type == 'circle') val -= obj.radius;
          if (canvas._sorna_anim) {
            anim_chain.push([
              this._create_anim(canvas, obj, 'left', val)
            ]);
          } else {
            obj.set('left', val);
          }
          break;
        case 'y':
          if (obj.type == 'circle') val -= obj.radius;
          if (canvas._sorna_anim) {
            anim_chain.push([
              this._create_anim(canvas, obj, 'top', val)
            ]);
          } else {
            obj.set('top', val);
          }
          break;
        case 'x1':
          if (canvas._sorna_anim) {
            anim_chain.push([
              this._create_anim(canvas, obj, 'x1', val)
            ]);
          } else {
            obj.set('x1', val);
          }
          break;
        case 'y1':
          if (canvas._sorna_anim) {
            anim_chain.push([
              this._create_anim(canvas, obj, 'y1', val)
            ]);
          } else {
            obj.set('y1', val);
          }
          break;
        case 'x2':
          if (canvas._sorna_anim) {
            anim_chain.push([
              this._create_anim(canvas, obj, 'x2', val)
            ]);
          } else {
            obj.set('x2', val);
          }
          break;
        case 'y2':
          if (canvas._sorna_anim) {
            anim_chain.push([
              this._create_anim(canvas, obj, 'y2', val)
            ]);
          } else {
            obj.set('y2', val);
          }
          break;
        case 'rotate':
          if (canvas._sorna_anim) {
            anim_chain.push([
              (val >= 0) ? this._create_anim(canvas, obj, 'angle', '+=' + val)
                         : this._create_anim(canvas, obj, 'angle', '-=' + Math.abs(val))
            ]);
          } else {
            var cur = obj.get('angle');
            obj.set('angle', cur + val);
          }
          break;
        case 'angle':
          if (canvas._sorna_anim) {
            anim_chain.push([
              this._create_anim(canvas, obj, 'angle', val)
            ]);
          } else {
            obj.set('angle', val);
          }
          break;
        case 'radius':
          if (canvas._sorna_anim) {
            anim_chain.push([
              this._create_anim(canvas, obj, 'radius', val)
            ]);
          } else {
            obj.set('radius', val);
          }
          break;
        case 'color':
          if (canvas._sorna_anim) {
            anim_chain.push([
              this._create_anim(canvas, obj, 'color', this.hex2rgba(val))
            ]);
          } else {
            obj.setColor(this.hex2rgba(val));
          }
          break;
        case 'border':
          if (canvas._sorna_anim) {
            anim_chain.push([
              this._create_anim(canvas, obj, 'stroke', this.hex2rgba(val))
            ]);
          } else {
            obj.setStroke(this.hex2rgba(val));
          }
          break;
        case 'fill':
          if (canvas._sorna_anim) {
            anim_chain.push([
              this._create_anim(canvas, obj, 'fill', this.hex2rgba(val))
            ]);
          } else {
            obj.setFill(this.hex2rgba(val));
          }
          break;
        }
      }
      Sorna.Utils.async_series(anim_chain, (item) => {
        var subanims = [];
        item.forEach(subanim => {
          subanims.push(new Promise(subanim));
        });
        return new Promise(resolve => {
          Promise.all(subanims).then(function() {
            setTimeout(resolve, _this._delay_between_animations);
          });
        });
      }).then(results => {
        canvas.renderAll();
      });
      canvas.renderAll();
    }
  }
};


// vim: sts=2 sw=2 et

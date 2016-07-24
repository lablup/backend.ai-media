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

  _canvas_map: {},
  _obj_map: {},
  _patched_fabric: false,
  _animation_duration: 180,
  _delay_between_animations: 120,

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
            options.onComplete && options.onComplete();
          }
        });
      }
    });
    this._patched_fabric = true;
  },

  _create_anim: function(/* variable args */) {
    var _args = Array.prototype.slice.call(arguments);
    var _this = this;
    return function(resolve) {
      var canvas = _args[0];
      var obj = _args[1];
      var args = _args.slice(2);
      var last = args[args.length - 1];
      if (typeof last == 'object') {
        var _orig_complete = last.onComplete;
        var _begin_val;
        last.ease = fabric.util.ease.easeOutQuad;
        last.duration = _this._animation_duration;
        if (args[0] == 'angle')
          _begin_val = obj.get('angle');
        last.onComplete = function() {
          _orig_complete && _orig_complete(_begin_val);
          obj.bringToFront();
          resolve();
        };
      } else {
        args.push({
          ease: fabric.util.ease.easeOutQuad,
          duration: _this._animation_duration,
          onComplete: function() {
            obj.bringToFront();
            resolve();
          }
        });
      }
      if (args[0] == 'fill' || args[0] == 'color' || args[0] == 'stroke') {
        obj.animateColor.apply(obj, args);
      } else {
        obj.animate.apply(obj, args);
      }
    };
  },

  get_canvas: function(canvas_id, container) {
    var _id = 'sorna-canvas-' + canvas_id;
    var canvas_elem = document.getElementById(_id);
    var canvas_obj = this._canvas_map[_id];
    var elem_created = false;
    if (!canvas_elem) {
      var outer_elem = document.createElement('div');
      outer_elem.setAttribute('class', 'sorna-media-item sorna-media-drawing');
      outer_elem.style.cssText = 'text-align: center; margin: 5px;';
      canvas_elem = document.createElement('canvas');
      canvas_elem.id = _id;
      canvas_elem.style.cssText = 'margin: 0 auto; max-width: 100%; height: auto;';
      outer_elem.appendChild(canvas_elem);
      container.appendChild(outer_elem);
      elem_created = true;
    }
    if (!canvas_obj) {
      canvas_obj = new fabric.StaticCanvas(canvas_elem, {width: 1, height: 1});
      canvas_obj.enableRetinaScaling = true;
      canvas_obj._sorna_anim = true;
      canvas_obj._group = false;
      canvas_obj._last_anim = [];
      this._canvas_map[_id] = canvas_obj;
    } else {
      if (elem_created) {
        // The canvas element is destroyed and recreated.
        // Thus, our fabric.StaticCanvas object has a dangling reference.
        // Re-initialize it to use the newly created canvas element.
        var w = canvas_obj.getWidth();
        var h = canvas_obj.getHeight();
        var bg = canvas_obj.backgroundColor;
        // We perform some stuffs in fabric.StaticCanvas.prototype._initStatic
        // on our own...
        // The reason that we cannot call _initStatic() directly is because
        // it clears the objects array which we want to keep intact.
        canvas_obj._createLowerCanvas(canvas_elem)
        canvas_obj._initOptions({
          width: w, height: h, backgroundColor: bg
        });
        canvas_obj._initRetinaScaling();
        canvas_obj.calcOffset();
        canvas_obj.lowerCanvasEl.style.height = 'auto';
        canvas_obj.renderAll();
      }
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
    this._aborted = true;
    var wait_stop = function(resolve) {
      if (this._playing) {
        setTimeout(function() { wait_stop(resolve); }, 10);
      } else {
        resolve();
        this._aborted = false;
      }
    }.bind(this);
    (new Promise(wait_stop)).then(function() {
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
          canvas.lowerCanvasEl.style.height = 'auto';
          canvas._sorna_default_fgcolor = this.hex2rgba(cmd[5]);
          break;
        case 'stop-anim':
          canvas._sorna_anim = false;
          break;
        case 'resume-anim':
          canvas._sorna_anim = true;
          break;
        case 'begin-group':
          canvas._group = true;
          canvas._last_anim = [];
          break;
        case 'end-group':
          canvas._group = false;
          anim_chain.push(canvas._last_anim);
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
                originX: 'center',
                originY: 'center',
                stroke: this.hex2rgba(args[5]),
                strokeWidth: 2,
                selectable: false
              });
              if (canvas._sorna_anim) {
                obj.set('x2', args[1]);
                obj.set('y2', args[2]);
                var ani = [
                  this._create_anim(canvas, obj, 'x2', args[3]),
                  this._create_anim(canvas, obj, 'y2', args[4])
                ];
                if (canvas._group)
                  canvas._last_anim.push.apply(canvas._last_anim, ani);
                else
                  anim_chain.push(ani);
              }
              break;
            case 'circle':
              obj = new fabric.Circle({
                left: args[1],
                top: args[2],
                radius: args[3],
                originX: 'center',
                originY: 'center',
                stroke: this.hex2rgba(args[4]),
                fill: this.hex2rgba(args[5]),
                angle: args[6],
                strokeWidth: 2,
                selectable: false
              });
              if (canvas._sorna_anim) {
                obj.set('opacity', 0.0);
                obj.set('scale', 0.3);
                var ani = [
                  this._create_anim(canvas, obj, 'opacity', 1.0),
                  this._create_anim(canvas, obj, 'scale', 1.0)
                ];
                if (canvas._group)
                  canvas._last_anim.push.apply(canvas._last_anim, ani);
                else
                  anim_chain.push(ani);
              }
              break;
            case 'rect':
              obj = new fabric.Rect({
                left: args[1],
                top: args[2],
                width: args[3],
                height: args[4],
                originX: 'center',
                originY: 'center',
                stroke: this.hex2rgba(args[5]),
                fill: this.hex2rgba(args[6]),
                angle: args[7],
                strokeWidth: 2,
                selectable: false
              });
              if (canvas._sorna_anim) {
                obj.set('opacity', 0.0);
                obj.set('scale', 0.3);
                var ani = [
                  this._create_anim(canvas, obj, 'opacity', 1.0),
                  this._create_anim(canvas, obj, 'scale', 1.0)
                ];
                if (canvas._group)
                  canvas._last_anim.push.apply(canvas._last_anim, ani);
                else
                  anim_chain.push(ani);
              }
              break;
            case 'triangle':
              obj = new fabric.Triangle({
                left: args[1],
                top: args[2],
                width: args[3],
                height: args[4],
                originX: 'center',
                originY: 'center',
                stroke: this.hex2rgba(args[5]),
                fill: this.hex2rgba(args[6]),
                angle: args[7],
                strokeWidth: 2,
                selectable: false
              });
              if (canvas._sorna_anim) {
                obj.set('opacity', 0.0);
                obj.set('scale', 0.3);
                var ani = [
                  this._create_anim(canvas, obj, 'opacity', 1.0),
                  this._create_anim(canvas, obj, 'scale', 1.0)
                ];
                if (canvas._group)
                  canvas._last_anim.push.apply(canvas._last_anim, ani);
                else
                  anim_chain.push(ani);
              }
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
            if (canvas._sorna_anim) {
              var ani = [
                this._create_anim(canvas, obj, 'left', val)
              ];
              if (canvas._group)
                canvas._last_anim.push.apply(canvas._last_anim, ani);
              else
                anim_chain.push(ani);
            } else {
              obj.set('left', val);
            }
            break;
          case 'y':
            if (canvas._sorna_anim) {
              var ani = [
                this._create_anim(canvas, obj, 'top', val)
              ];
              if (canvas._group)
                canvas._last_anim.push.apply(canvas._last_anim, ani);
              else
                anim_chain.push(ani);
            } else {
              obj.set('top', val);
            }
            break;
          case 'x1':
            if (canvas._sorna_anim) {
              var ani = [
                this._create_anim(canvas, obj, 'x1', val)
              ];
              if (canvas._group)
                canvas._last_anim.push.apply(canvas._last_anim, ani);
              else
                anim_chain.push(ani);
            } else {
              obj.set('x1', val);
            }
            break;
          case 'y1':
            if (canvas._sorna_anim) {
              var ani = [
                this._create_anim(canvas, obj, 'y1', val)
              ];
              if (canvas._group)
                canvas._last_anim.push.apply(canvas._last_anim, ani);
              else
                anim_chain.push(ani);
            } else {
              obj.set('y1', val);
            }
            break;
          case 'x2':
            if (canvas._sorna_anim) {
              var ani = [
                this._create_anim(canvas, obj, 'x2', val)
              ];
              if (canvas._group)
                canvas._last_anim.push.apply(canvas._last_anim, ani);
              else
                anim_chain.push(ani);
            } else {
              obj.set('x2', val);
            }
            break;
          case 'y2':
            if (canvas._sorna_anim) {
              var ani = [
                this._create_anim(canvas, obj, 'y2', val)
              ];
              if (canvas._group)
                canvas._last_anim.push.apply(canvas._last_anim, ani);
              else
                anim_chain.push(ani);
            } else {
              obj.set('y2', val);
            }
            break;
          case 'rotate':
            if (canvas._sorna_anim) {
              var ani = [
                (val >= 0) ? this._create_anim(canvas, obj, 'angle', '+=' + val)
                           : this._create_anim(canvas, obj, 'angle', '-=' + Math.abs(val))
              ];
              if (canvas._group)
                canvas._last_anim.push.apply(canvas._last_anim, ani);
              else
                anim_chain.push(ani);
            } else {
              var cur = obj.get('angle');
              obj.set('angle', cur + val);
            }
            break;
          case 'angle':
            if (canvas._sorna_anim) {
              var ani = [
                this._create_anim(canvas, obj, 'angle', val)
              ];
              if (canvas._group)
                canvas._last_anim.push.apply(canvas._last_anim, ani);
              else
                anim_chain.push(ani);
            } else {
              obj.set('angle', val);
            }
            break;
          case 'radius':
            if (canvas._sorna_anim) {
              var ani = [
                this._create_anim(canvas, obj, 'radius', val)
              ];
              if (canvas._group)
                canvas._last_anim.push.apply(canvas._last_anim, ani);
              else
                anim_chain.push(ani);
            } else {
              obj.set('radius', val);
            }
            break;
          case 'color':
            if (canvas._sorna_anim) {
              var ani = [
                this._create_anim(canvas, obj, 'color', this.hex2rgba(val))
              ];
              if (canvas._group)
                canvas._last_anim.push.apply(canvas._last_anim, ani);
              else
                anim_chain.push(ani);
            } else {
              obj.set('color', this.hex2rgba(val));
            }
            break;
          case 'border':
            if (canvas._sorna_anim) {
              var ani = [
                this._create_anim(canvas, obj, 'stroke', this.hex2rgba(val)),
              ];
              if (canvas._group)
                canvas._last_anim.push.apply(canvas._last_anim, ani);
              else
                anim_chain.push(ani);
            } else {
              obj.set('stroke', this.hex2rgba(val));
            }
            break;
          case 'fill':
            if (canvas._sorna_anim) {
              var ani = [
                this._create_anim(canvas, obj, 'fill', this.hex2rgba(val))
              ];
              if (canvas._group)
                canvas._last_anim.push.apply(canvas._last_anim, ani);
              else
                anim_chain.push(ani);
            } else {
              obj.set('fill', this.hex2rgba(val));
            }
            break;
          }
        } // endswitch
        canvas.renderAll();
      }
      this._playing = true;
      Sorna.Utils.async_series(anim_chain, function(anim_group) {
        // Our own animation loop because grouped animation causes
        // severe frame drops due to overlapping of multiple
        // animation loops with "canvas.renderAll()".
        var finish = (+new Date()) + this._animation_duration;
        var anim_id;
        var anim_loop = function() {
          var time = +new Date();
          if (time > finish || this._aborted) return;
          anim_id = window.requestAnimationFrame(anim_loop);
          canvas.renderAll();
        }.bind(this);
        anim_id = window.requestAnimationFrame(anim_loop);

        var subanims = [];
        anim_group.forEach(function(subanim) {
          subanims.push(new Promise(subanim));
        });

        return new Promise(function(resolve, reject) {
          Promise.all(subanims).then(function(results) {
            if (this._aborted) {
              window.cancelAnimationFrame(anim_id);
              reject();
              return;
            }
            setTimeout(resolve, this._delay_between_animations);
          }.bind(this));
        }.bind(this));
      }.bind(this)).then(function(results) {
        canvas.renderAll();
        this._playing = false;
      }.bind(this)).catch(function(err) {
        // when animation is stopped
        this._playing = false;
      }.bind(this));
    }.bind(this));
  }
};


// vim: sts=2 sw=2 et

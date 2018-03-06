'use strict';

/* Backend.AI Simplified Drawing API for HTML5 Canvas. */

import msgpack from 'msgpack-lite';

function decode_commands(data) {
  var raw = atob(data);
  var u8array = new Uint8Array(new ArrayBuffer(raw.length));
  for (var i = 0; i < raw.length; i++)
    u8array[i] = raw.charCodeAt(i);
  return msgpack.decode(u8array);
}

function hex2rgba(val) {
  val = val.replace('#', '');
  var r = parseInt(val.substring(0, 2), 16),
      g = parseInt(val.substring(2, 4), 16),
      b = parseInt(val.substring(4, 6), 16),
      a = parseInt(val.substring(6, 8), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + (a/255) + ')';
}

let _patched_fabric = false;

function _patch_fabric() {
  // Extend fabric.js's animation for color properties
  if (_patched_fabric) return;

  // Calculate an in-between color. Returns a "rgba()" string.
  // Credit: Edwin Martin <edwin@bitstorm.org>
  //         http://www.bitstorm.org/jquery/color-animation/jquery.animate-colors.js
  function calculateColor(begin, end, pos) {
    let color = 'rgba('
        + parseInt((begin[0] + pos * (end[0] - begin[0])), 10) + ','
        + parseInt((begin[1] + pos * (end[1] - begin[1])), 10) + ','
        + parseInt((begin[2] + pos * (end[2] - begin[2])), 10);
    color += ',' + (begin && end ? parseFloat(begin[3] + pos * (end[3] - begin[3])) : 1);
    color += ')';
    return color;
  }

  // From fabric.js' GitHub repository.
  function animateColorUtil(fromColor, toColor, duration, options) {
    let startColor = new fabric.Color(fromColor).getSource(),
        endColor = new fabric.Color(toColor).getSource();

    options = options || {};

    fabric.util.animate(fabric.util.object.extend(options, {
      duration: duration || 500,
      startValue: startColor,
      endValue: endColor,
      byValue: endColor,
      easing: function (currentTime, startValue, byValue, duration) {
        let posValue = options.colorEasing
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
      let propPair;

      if (!options) {
        options = { };
      }
      else {
        options = fabric.util.object.clone(options);
      }

      if (~property.indexOf('.')) {
        propPair = property.split('.');
      }

      let currentValue = propPair
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
        abort: options.abort && (() => {
          return options.abort.call(this);
        }),
        onChange: (value) => {
          if (propPair) {
            this[propPair[0]][propPair[1]] = value;
          }
          else {
            this.set(property, value);
          }
          if (skipCallbacks) {
            return;
          }
          options.onChange && options.onChange();
        },
        onComplete: () => {
          if (skipCallbacks)
            return;
          options.onComplete && options.onComplete();
        }
      });
    }
  });
  _patched_fabric = true;
}


class Drawing {

  constructor(result_id, container) {
    _patch_fabric();
    this._result_id = result_id;
    this._container = container;
    this._canvas_map = new Map;
    this._animation_duration = 180;
    this._delay_between_animations = 120;
    this._playing = false;  // status flag true during animation
    this._aborted = false;  // internal flag to suspend/abort animation
  }

  _create_anim(/* variable args */) {
    var _args = Array.prototype.slice.call(arguments);
    return (resolve) => {
      var canvas = _args[0];
      var obj = _args[1];
      var args = _args.slice(2);
      var last = args[args.length - 1];
      if (typeof last == 'object') {
        var _orig_complete = last.onComplete;
        var _begin_val;
        last.ease = fabric.util.ease.easeOutQuad;
        last.duration = this._animation_duration;
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
          duration: this._animation_duration,
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
  }

  getCanvas(canvas_id) {
    var _id = 'sorna-canvas-' + canvas_id;
    var canvas_elem = document.getElementById(_id);
    var canvas_obj = this._canvas_map.get(_id);
    var elem_created = false;
    if (canvas_elem === null) {
      var outer_elem = document.createElement('div');
      outer_elem.setAttribute('class', 'sorna-media-item sorna-media-drawing');
      outer_elem.style.cssText = 'text-align: center; margin: 10px; padding: 0; line-height: 1.0;';
      canvas_elem = document.createElement('canvas');
      canvas_elem.id = _id;
      canvas_elem.style.cssText = 'margin: 0 auto; max-width: 100%; height: auto;';
      outer_elem.appendChild(canvas_elem);
      this._container.appendChild(outer_elem);
      elem_created = true;
    }
    if (canvas_obj === undefined) {
      canvas_obj = new fabric.StaticCanvas(canvas_elem, {width: 1, height: 1});
      canvas_obj.enableRetinaScaling = true;
      canvas_obj._sorna_anim = true;
      canvas_obj._group = false;
      canvas_obj._last_anim = [];
      canvas_obj._obj_map = new Map;
      this._canvas_map.set(_id, canvas_obj);
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
        canvas_obj._initOptions({ width: w, height: h });
        canvas_obj._initRetinaScaling();
        canvas_obj.setBackgroundColor(bg);
        canvas_obj.calcOffset();
        canvas_obj.lowerCanvasEl.style.height = 'auto';
        canvas_obj.renderAll();
      }
    }
    return canvas_obj;
  }

  get playing() {
    return this._playing;
  }

  static getObject(canvas, obj_id) {
    let key = 'sorna:' + obj_id;
    return canvas._obj_map.get(key) || null;
  }

  static registerObject(canvas, obj_id, obj) {
    let key = 'sorna:' + obj_id;
    canvas._obj_map.set(key, obj);
  }

  //update(result_id, type, data, container)
  update(data) {
    this._aborted = true;
    let wait_stop = (resolve) => {
      if (this._playing) {
        setTimeout(function() { wait_stop(resolve); }, 10);
      } else {
        resolve();
        this._aborted = false;
      }
    };
    (new Promise(wait_stop)).then(() => {
      let cmds = decode_commands(data);
      let anim_chain = [];
      if (cmds.length == 0)
        return;
      let canvas_id = cmds[0][0];
      let canvas = this.getCanvas(canvas_id);
      for (var i = 0; i < cmds.length; i++) {
        let cmd = cmds[i];
        switch (cmd[1]) {
        case 'canvas':
          canvas.setWidth(cmd[2]);
          canvas.setHeight(cmd[3]);
          canvas.clear();
          canvas._obj_map = new Map;
          canvas.lowerCanvasEl.style.height = 'auto';
          canvas.setBackgroundColor(hex2rgba(cmd[4]));
          canvas._sorna_default_fgcolor = hex2rgba(cmd[5]);
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
        case 'obj': {
          let obj_id = cmd[2];
          let args = cmd[3];
          let obj = this.constructor.getObject(canvas, obj_id);
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
                stroke: hex2rgba(args[5]),
                strokeWidth: 2,
                selectable: false
              });
              if (canvas._sorna_anim) {
                obj.set('x2', args[1]);
                obj.set('y2', args[2]);
                let ani = [
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
                stroke: hex2rgba(args[4]),
                fill: hex2rgba(args[5]),
                angle: args[6],
                strokeWidth: 2,
                selectable: false
              });
              if (canvas._sorna_anim) {
                obj.set('opacity', 0.0);
                obj.set('scale', 0.3);
                let ani = [
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
                stroke: hex2rgba(args[5]),
                fill: hex2rgba(args[6]),
                angle: args[7],
                strokeWidth: 2,
                selectable: false
              });
              if (canvas._sorna_anim) {
                obj.set('opacity', 0.0);
                obj.set('scale', 0.3);
                let ani = [
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
                stroke: hex2rgba(args[5]),
                fill: hex2rgba(args[6]),
                angle: args[7],
                strokeWidth: 2,
                selectable: false
              });
              if (canvas._sorna_anim) {
                obj.set('opacity', 0.0);
                obj.set('scale', 0.3);
                let ani = [
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
              this.constructor.registerObject(canvas, obj_id, obj);
              canvas.add(obj);
            }
          }
          break;
        } case 'update': {
          let obj_id = cmd[2];
          let obj = this.constructor.getObject(canvas, obj_id);
          if (obj == null)
            continue;
          let prop = cmd[3];
          let val = cmd[4];
          switch (prop) {
          case 'x':
            if (canvas._sorna_anim) {
              let ani = [
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
              let ani = [
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
              let ani = [
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
              let ani = [
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
              let ani = [
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
              let ani = [
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
              let ani = [
                (val >= 0) ? this._create_anim(canvas, obj, 'angle', '+=' + val)
                           : this._create_anim(canvas, obj, 'angle', '-=' + Math.abs(val))
              ];
              if (canvas._group)
                canvas._last_anim.push.apply(canvas._last_anim, ani);
              else
                anim_chain.push(ani);
            } else {
              let cur = obj.get('angle');
              obj.set('angle', cur + val);
            }
            break;
          case 'angle':
            if (canvas._sorna_anim) {
              let ani = [
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
              let ani = [
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
              let ani = [
                this._create_anim(canvas, obj, 'color', hex2rgba(val))
              ];
              if (canvas._group)
                canvas._last_anim.push.apply(canvas._last_anim, ani);
              else
                anim_chain.push(ani);
            } else {
              obj.set('color', hex2rgba(val));
            }
            break;
          case 'border':
            if (canvas._sorna_anim) {
              let ani = [
                this._create_anim(canvas, obj, 'stroke', hex2rgba(val)),
              ];
              if (canvas._group)
                canvas._last_anim.push.apply(canvas._last_anim, ani);
              else
                anim_chain.push(ani);
            } else {
              obj.set('stroke', hex2rgba(val));
            }
            break;
          case 'fill':
            if (canvas._sorna_anim) {
              let ani = [
                this._create_anim(canvas, obj, 'fill', hex2rgba(val))
              ];
              if (canvas._group)
                canvas._last_anim.push.apply(canvas._last_anim, ani);
              else
                anim_chain.push(ani);
            } else {
              obj.set('fill', hex2rgba(val));
            }
            break;
          }
        } // endcase
        } // endswitch
        canvas.renderAll();
      }
      this._playing = true;
      Sorna.Utils.async_series(anim_chain, (anim_group) => {
        // Our own animation loop because grouped animation causes
        // severe frame drops due to overlapping of multiple
        // animation loops with "canvas.renderAll()".
        let finish = (+new Date()) + this._animation_duration;
        let anim_id;
        let anim_loop = () => {
          let time = +new Date();
          if (time > finish || this._aborted) return;
          anim_id = window.requestAnimationFrame(anim_loop);
          canvas.renderAll();
        };
        anim_id = window.requestAnimationFrame(anim_loop);

        let subanims = [];
        anim_group.forEach((subanim) => {
          subanims.push(new Promise(subanim));
        });

        return new Promise((resolve, reject) => {
          Promise.all(subanims).then((results) => {
            if (this._aborted) {
              window.cancelAnimationFrame(anim_id);
              reject();
              return;
            }
            setTimeout(resolve, this._delay_between_animations);
          });
        });
      }).then((results) => {
        canvas.renderAll();
        this._playing = false;
      }).catch((err) => {
        // when animation is stopped
        this._playing = false;
      });
    });
  }

}

export default Drawing;

// vim: sts=2 sw=2 et

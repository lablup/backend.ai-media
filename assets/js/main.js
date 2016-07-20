'use strict';

/** Sorna Media Handlers. */

window.Sorna = window.Sorna || { version: '0.2.0' };
if (typeof(Sorna.assetRoot) == 'undefined') {
  // Fallback to the current host address
  Sorna.assetRoot = window.location.protocol + '//' + window.location.host;
}
__webpack_public_path__ = Sorna.assetRoot;
__webpack_require__.p = Sorna.assetRoot + '/js/';

var fabric_loader = function(resolve) {
  require.ensure(['fabric'], function() {
    window.fabric = require('fabric').fabric;
    resolve();
  });
};

var drawing_loader = function(resolve) {
  require.ensure(['./drawing.js'], function() {
    Sorna.Drawing = require('./drawing.js').Drawing;
    resolve();
  });
};

Sorna.Utils = {
  async_series: function(items, handler) {
    var results = null;
    var items_copy = items.slice();
    return new Promise(function(resolve, reject) {
      function next(result) {
        if (!results)
          results = [];
        else
          results.push(result);
        if (items_copy.length > 0) {
          var item = items_copy.shift();
          handler(item).then(next).catch(reject);
        } else {
          resolve(results);
        }
      }
      next();
    });
  }
};

Sorna.Media = {
  _get_drawing_impl: function() {
    return {
      scripts: [
        {id:'js.common-fabric', loader:fabric_loader},
        {id:'js.sorna-drawing', loader:drawing_loader}
      ],
      handler: function(result_id, type, data, container) {
        Sorna.Drawing.update(result_id, type, data, container);
      }
    };
  },
  _get_image_impl: function() {
    return {
      scripts: [
      ],
      handler: function(result_id, type, data, container) {
        var img_elem = document.getElementById(result_id);
        if (!img_elem) {
          var outer_elem = document.createElement('div');
          outer_elem.setAttribute('class', 'media-item media-image');
          outer_elem.style = 'text-align: center; margin: 5px;';
          img_elem = document.createElement('img');
          img_elem.id = result_id;
          img_elem.style = 'margin: 0 auto; max-width: 100%; height: auto;';
          img_elem.alt = 'generated image';
          outer_elem.appendChild(img_elem);
          container.appendChild(outer_elem);
        }
        // TODO: verify dataURI format?
        img_elem.src = data;
      }
    };
  },
  _get_svg_impl: function() {
    return {
      scripts: [
        {id:'js.common-fabric', loader:fabric_loader}
      ],
      handler: function(result_id, type, data, container) {
        var canvas_elem = document.getElementById(result_id);
        if (!canvas_elem) {
          var outer_elem = document.createElement('div');
          outer_elem.setAttribute('class', 'media-item media-image');
          outer_elem.style = 'text-align: center; margin: 5px;';
          canvas_elem = document.createElement('canvas');
          canvas_elem.id = result_id;
          canvas_elem.style = 'margin: 0 auto; max-width: 100%; height: auto;';
          outer_elem.appendChild(canvas_elem);
          container.appendChild(outer_elem);
        }
        var canvas = new fabric.StaticCanvas(result_id, {width: 0, height: 0});
        canvas.enableRetinaScaling = true;
        fabric.loadSVGFromString(data, function(objects, options) {
          options.selectable = false;
          var shape = fabric.util.groupSVGElements(objects, options);
          var dl_wrap = document.createElement('div');
          var dl = document.createElement('a');
          dl.href = 'data:image/svg+xml,' + encodeURIComponent(data);
          dl.setAttribute('class', 'media-download');
          dl.target = '_blank';
          dl.innerHTML = 'Download as SVG';
          dl_wrap.appendChild(dl);
          canvas.lowerCanvasEl.parentNode.appendChild(dl_wrap);
          canvas.setWidth(shape.width || 600);
          canvas.setHeight(shape.height || 600);
          canvas.lowerCanvasEl.style.height = 'auto';
          canvas.add(shape);
          canvas.renderAll();
        });
      }
    };
  },
  _get_media_impls: function() {
    var image_impl = this._get_image_impl();
    return {
      'application/x-sorna-drawing': this._get_drawing_impl(),
      'image/svg+xml': this._get_svg_impl(),
      'image/png': image_impl,
      'image/jpeg': image_impl,
      'image/gif': image_impl
    };
  },
  handle_all: function(items, result_id, result_container) {
    for (var i = 0; i < items.length; i++) {
      var media = items[i];
      var impl = this._get_media_impls()[media[0]];
      if (impl == undefined)
        continue;
      var script_promises = [];
      for (var j = 0; j < impl.scripts.length; j++) {
        script_promises.push(new Promise(function(resolve, reject) {
          impl.scripts[j].loader(resolve);
        }));
      }
      Promise.all(script_promises).then(function() {
        impl.handler(result_id + '-' + i, media[0], media[1], result_container);
      });
    }
  }
};

/// vim: sts=2 sw=2 et

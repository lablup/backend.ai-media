'use strict';

/** Sorna Media Handlers. */

window.Sorna = window.Sorna || { version: '0.9.0' };
if (typeof(Sorna.assetRoot) == 'undefined') {
  // Fallback to the current host address
  Sorna.assetRoot = window.location.protocol + '//' + window.location.host;
}
__webpack_public_path__ = Sorna.assetRoot;
__webpack_require__.p = Sorna.assetRoot + '/js/';

import 'babel-polyfill';

var fabric_loader = (resolve) => {
  require.ensure(['fabric'], function() {
    window.fabric = require('fabric').fabric;
    resolve();
  });
};

var drawing_loader = (resolve) => {
  require.ensure(['./drawing.js'], function() {
    Sorna.Drawing = require('./drawing.js').default;
    resolve();
  });
};

Sorna.loadWebterm = (resolve) => {
  if (typeof Sorna.Webterm == 'undefined') {
    require.ensure(['./webterm.js'], function() {
      Sorna.Webterm = require('./webterm.js').default;
      resolve();
    });
  }
};

class _Utils {
  static async_series(items, handler) {
    let results = null;
    let items_copy = items.slice();
    return new Promise((resolve, reject) => {
      function next(result) {
        if (!results)
          results = [];
        else
          results.push(result);
        if (items_copy.length > 0) {
          let item = items_copy.shift();
          handler(item).then(next).catch(reject);
        } else {
          resolve(results);
        }
      }
      next();
    });
  }
}

class _Media {
  static _get_drawing_impl() {
    return {
      scripts: [
        {id:'js.common-fabric', loader:fabric_loader},
        {id:'js.sorna-drawing', loader:drawing_loader}
      ],
      handler: (result_id, type, data, container) => {
        let drawing = new Sorna.Drawing(result_id, container);
        drawing.update(data);
      }
    };
  }

  static _get_image_impl() {
    return {
      scripts: [
      ],
      handler: (result_id, type, data, container) => {
        let img_elem = document.getElementById(result_id);
        if (!img_elem) {
          let outer_elem = document.createElement('div');
          outer_elem.setAttribute('class', 'media-item media-image');
          outer_elem.style.cssText = 'text-align: center; margin: 5px;';
          img_elem = document.createElement('img');
          img_elem.id = result_id;
          img_elem.style.cssText = 'margin: 0 auto; max-width: 100%; height: auto;';
          img_elem.alt = 'generated image';
          outer_elem.appendChild(img_elem);
          container.appendChild(outer_elem);
        }
        img_elem.src = data;
      }
    };
  }

  static _get_svg_impl() {
    return {
      scripts: [
        //{id:'js.common-fabric', loader:fabric_loader}
      ],
      handler: (result_id, type, data, container) => {
        let img_elem = document.getElementById(result_id);
        if (!img_elem) {
          let outer_elem = document.createElement('div');
          outer_elem.setAttribute('class', 'media-item media-image');
          outer_elem.style.cssText = 'text-align: center; margin: 5px;';
          img_elem = document.createElement('img');
          img_elem.id = result_id;
          img_elem.style.cssText = 'margin: 0 auto; max-width: 100%; height: auto;';
          img_elem.alt = 'generated image';
          outer_elem.appendChild(img_elem);
          container.appendChild(outer_elem);
        }
        img_elem.src = 'data:image/svg+xml,' + encodeURIComponent(data);
      }
    };
  }

  static _get_media_impls() {
    let image_impl = this._get_image_impl();
    return {
      'application/x-sorna-drawing': this._get_drawing_impl(),
      'image/svg+xml': this._get_svg_impl(),
      'image/png': image_impl,
      'image/jpeg': image_impl,
      'image/gif': image_impl
    };
  }

  static handle_all(items, result_id, result_container) {
    for (let i = 0; i < items.length; i++) {
      let media = items[i];
      let impl = this._get_media_impls()[media[0]];
      if (impl == undefined)
        continue;
      let script_promises = [];
      for (let j = 0; j < impl.scripts.length; j++) {
        script_promises.push(new Promise((resolve, reject) => {
          impl.scripts[j].loader(resolve);
        }));
      }
      Promise.all(script_promises).then(() => {
        impl.handler(result_id + '-' + i, media[0], media[1], result_container);
      });
    }
  }

  static handleAll(items, result_id, result_container) {
    this.handle_all(items, result_id, result_container);
  }
}

Sorna.Utils = _Utils;
Sorna.Media = _Media;


/// vim: sts=2 sw=2 et

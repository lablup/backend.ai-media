'use strict';

/** Sorna Media Handlers. */

window.Sorna = window.Sorna || { version: '0.9.0' };
if (Sorna.assetRoot === undefined) {
  // Fallback to the current host address
  Sorna.assetRoot = window.location.protocol + '//' + window.location.host;
}
__webpack_public_path__ = Sorna.assetRoot;
__webpack_require__.p = Sorna.assetRoot + '/js/';

require('babel-polyfill');

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

var gitgraph_loader = (resolve) => {
  require.ensure(['gitgraph.js'], function() {
    require('gitgraph.js');
    resolve();
  });
};

Sorna.loadWebterm = (resolve) => {
  if (Sorna.Webterm === undefined) {
    require.ensure(['./webterm.js'], function() {
      Sorna.Webterm = require('./webterm.js').default;
      resolve();
    });
  } else
    resolve();
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
        let img_id = result_id + '-svg';
        let img_elem = document.getElementById(img_id);
        if (!img_elem) {
          let outer_elem = document.createElement('div');
          outer_elem.setAttribute('class', 'media-item media-image');
          outer_elem.style.cssText = 'text-align: center; margin: 5px;';
          img_elem = document.createElement('img');
          img_elem.id = img_id;
          img_elem.style.cssText = 'margin: 0 auto; max-width: 100%; height: auto;';
          img_elem.alt = 'generated image';
          outer_elem.appendChild(img_elem);
          container.appendChild(outer_elem);
        }
        img_elem.src = 'data:image/svg+xml,' + encodeURIComponent(data);
      }
    };
  }

  static _get_gitgraph_impl() {
    return {
      scripts: [
        {id: 'js.gitgraph', loader: gitgraph_loader}
      ],
      handler: (result_id, type, data, container) => {
        const gitgraph = new GitGraph({ template: _getTemplate() });
        let branches = {};  // registered branches

        data.forEach((commit) => {
          let currentBranch = _getOrCreateCurrentBranch(commit);
          let commitInfo = {
            sha1: commit.oid,
            message: commit.message,
            author: commit.author
          };
          if (commit.parent_ids.length < 2) {  // normal commit
            currentBranch.commit(commitInfo);
          } else {  // merge commit
            const mergeeBranch = branches[commit.parent_branches[1]];
            mergeeBranch.merge(currentBranch, commitInfo);
          }
        });

        function _getTemplate() {
          let templateConfig = {
            // colors: [ "#F00", "#0F0", "#00F" ],  // branches colors, 1 per column
            branch: {
              lineWidth: 5,
              spacingX: 50,
              showLabel: true,  // display branch names on graph
            },
            commit: {
              spacingY: -30,
              dot: {
                size: 8
              },
              message: {
                displayAuthor: false,
                displayBranch: false,
                displayHash: true,
                font: "normal 10pt Arial"
              },
              shouldDisplayTooltipsInCompactMode: true,
              tooltipHTMLFormatter: (commit) => {
                return "" + commit.sha1 + "" + ": " + commit.message;
              }
            }
          };
          return new GitGraph.Template(templateConfig);
        }

        function _getOrCreateCurrentBranch(commit) {
          let currentBranch;
          let parentCommit;

          if (branches.hasOwnProperty(commit.branch)) {
            // Branch already exists.
            currentBranch = branches[commit.branch];
          } else {
            // Create new branch from parent commit (not from branch).
            const parentBranch = branches[commit.parent_branches[0]];
            if (parentBranch) {
              for (let i = 0; i < parentBranch.commits.length; i++) {
                if (commit.parent_ids[0] === parentBranch.commits[i].sha1) {
                  parentCommit = parentBranch.commits[i];
                  break;
                }
              }
            }
            if (parentCommit) {
              currentBranch = gitgraph.branch({
                parentBranch: parentBranch,
                parentCommit: parentCommit,
                name: commit.branch
              });
            } else {  // for master branch
              currentBranch = gitgraph.branch(commit.branch);
            }
            branches[commit.branch] = currentBranch;
          }

          return currentBranch;
        }
      }
    };
  }

  static _get_media_impls() {
    let image_impl = this._get_image_impl();
    return {
      'application/x-sorna-drawing': this._get_drawing_impl(),
      'application/vnd.sorna.gitgraph': this._get_gitgraph_impl(),
      'image/svg+xml': this._get_svg_impl(),
      'image/png': image_impl,
      'image/jpeg': image_impl,
      'image/gif': image_impl
    };
  }

  static handle(item, result_id, result_container) {
    let media_type, media_data;
    if (Array.isArray(item)) {
      media_type = item[0];
      media_data = item[1];
    } else {
      media_type = item.type;
      media_data = item.data;
    }
    let impl = this._get_media_impls()[media_type];
    if (impl === undefined)
      return false;
    let script_promises = [];
    for (let j = 0; j < impl.scripts.length; j++) {
      script_promises.push(new Promise((resolve, reject) => {
        impl.scripts[j].loader(resolve);
      }));
    }
    Promise.all(script_promises).then(() => {
      impl.handler(result_id, media_type, media_data, result_container);
    });
    return true;
  }

  static handle_all(items, result_id, result_container) {
    for (let i = 0; i < items.length; i++) {
      this.handle(items[i], result_id + '-' + i, result_container);
    }
  }

  static handleAll(items, result_id, result_container) {
    this.handle_all(items, result_id, result_container);
  }
}

Sorna.Utils = _Utils;
Sorna.Media = _Media;


/// vim: sts=2 sw=2 et

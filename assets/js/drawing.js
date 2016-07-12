'use strict';

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

    hex2rgba: function(val) {
        val = val.replace('#', '');
        var r = parseInt(val.substring(0, 2), 16),
            g = parseInt(val.substring(2, 4), 16),
            b = parseInt(val.substring(4, 6), 16),
            a = parseInt(val.substring(6, 8), 16);
        return 'rgba(' + r + ',' + g + ',' + b + ',' + (a/255) + ')';
    },

    update: function(result_id, type, data, container) {
        // TODO: This is a demo!
        var cmds = this.decode_commands(data);
        for (var i = 0; i < cmds.length; i++) {
            var cmd = cmds[i];
            var canvas = this.get_canvas(cmd[0], container);
            var obj = null;
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
                switch (args[0]) {
                case 'line':
                    obj = new fabric.Circle();
                    canvas.add(obj);
                case 'circle':
                    obj = new fabric.Circle({
                        left: args[1] - args[3],
                        top: args[2] - args[3],
                        radius: args[3],
                        fill: this.hex2rgba(args[5]),
                        stroke: this.hex2rgba(args[4]),
                        strokeWidth: 2
                    });
                    canvas.add(obj);
                case 'rect':
                    obj = new fabric.Circle({
                        left: args[1],
                        top: args[2],
                        width: args[3],
                        height: args[4],
                        fill: this.hex2rgba(args[6]),
                        stroke: this.hex2rgba(args[5]),
                        strokeWidth: 2
                    });
                    canvas.add(obj);
                }
                break;
            }
            canvas.renderAll();
        }
    }
};


// vim: sts=4 sw=4 et

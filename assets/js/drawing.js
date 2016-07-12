'use strict';

window.Sorna = window.Sorna || {};

window.Sorna.Drawing = {
    update: function(data, container) {
        // TODO: This is a demo!
        console.log('Sorna.Drawing.update: ', msgpack.decode(btoa(data)));
        var id = 'test123';
        var canvas_elem = document.getElementById(id);
        if (!canvas_elem) {
            canvas_elem = document.createElement('canvas');
            canvas_elem.id = id;
            container.appendChild(canvas_elem);
        }
        var canvas = new fabric.Canvas(id, {width: 100, height: 100, backgroundColor: 'white'});
        var circle = new fabric.Circle({left: 20, top: 20, stroke: 'red', strokeWidth: 2, fill: null, radius: 30});
        canvas.add(circle);
        canvas.renderAll();
    }
};


// vim: sts=4 sw=4 et

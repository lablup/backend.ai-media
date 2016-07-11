'use strict';

window.Sorna = window.Sorna || {};

window.Sorna.Drawing = {
    update: function(data, container) {
        console.log('Sorna.Drawing.update()');
        // TODO: This is a demo!
        var id = 'test123';
        var canvas_elem = document.getElementById(id);
        if (!canvas_elem) {
            canvas_elem = document.createElement('canvas');
            canvas_elem.id = id;
            container.appendChild(canvas_elem);
        }
        var canvas = new fabric.Canvas(id);
        var circle = new fabric.Circle({left: 50, top: 50, fill: 'red', radius: 30});
        canvas.add(circle);
        canvas.renderAll();
    }
};


// vim: sts=4 sw=4 et

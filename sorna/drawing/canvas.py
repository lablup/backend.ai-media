import uuid
import simplejson as json
import builtins
from .turtle import Turtle
from .color import Colors

def new(*args, **kwargs):
    return Canvas(*args, **kwargs)


class DrawingObject:

    def __init__(self, canvas, id_, args):
        self._canvas = canvas
        self._id = id_
        self._args = list(args)

    def set_x(self, x):
        assert self._args[0] in ('rect', 'circle')
        self._args[1] = x
        self._canvas._cmd_history.append(('update', self._id, 1, x))

    def set_y(self, y):
        assert self._args[0] in ('rect', 'circle')
        self._args[2] = y
        self._canvas._cmd_history.append(('update', self._id, 2, y))



class Canvas:

    def __init__(self, width, height, bgcolor=Colors.White, fgcolor=Colors.Black):
        self._id = str(uuid.uuid4())
        self._cmd_history = []
        self._next_objid = 0
        self._cmd_history.append(('canvas',
                                 width, height,
                                 bgcolor.to_hex(),
                                 fgcolor.to_hex()))
        self.bgcolor = bgcolor
        self.fgcolor = fgcolor

    def update(self):
        builtins._sorna_has_drawing = True
        builtins._sorna_drawing_data = json.dumps(self._cmd_history)
        self._cmd_history = []

    def create_turtle(self):
        t = Turtle(self)
        return t

    @property
    def size(self):
        pass

    def stop_animation(self):
        self._cmd_history.append(('stop-anim',))

    def resume_animation(self):
        self._cmd_history.append(('resume-anim',))

    def begin_fill(self, c):
        self._cmd_history.append(('begin-fill', c.to_hex()))

    def end_fill(self):
        self._cmd_history.append(('end-fill',))

    def background_color(self, c):
        self.bgcolor = c
        self._cmd_history.append(('bgcolor', c.to_hex()))

    def stroke_color(self, c):
        self.fgcolor = c
        self._cmd_history.append(('fgcolor', c.to_hex()))

    def line(self, x0, y0, x1, y1):
        args = ('line', x0, y0, x1, y1)
        self._cmd_history.append(('obj', self._next_objid, args))
        obj = DrawingObject(self, self._next_objid, args)
        self._next_objid += 1
        return obj

    def circle(self, x, y, r):
        args = ('circle', x, y, r)
        self._cmd_history.append(('obj', self._next_objid, args))
        obj = DrawingObject(self, self._next_objid, args)
        self._next_objid += 1
        return obj

    def rectangle(self, x0, y0, x1, y1):
        args = ('rect', x0, y0, x1, y1)
        self._cmd_history.append(('obj', self._next_objid, args))
        obj = DrawingObject(self, self._next_objid, args)
        self._next_objid += 1
        return obj



__all__ = [
    'new',
    'Canvas',
]

from six.moves import builtins
from .encoding import encode_commands, decode_commands
from .turtle import Turtle
from .color import Colors


_canvas_id_counter = 0


class DrawingObject:

    def __init__(self, canvas, id_, args):
        self._canvas = canvas
        self._id = id_
        self._args = list(args)

    def set_x(self, x):
        if self._args[0] in ('rect', 'circle'):
            self._args[1] = x
            self._canvas._cmd_history.append((self._cavnas._id, 'update', self._id, 'x', x))

    def set_y(self, y):
        if self._args[0] in ('rect', 'circle'):
            self._args[2] = y
            self._canvas._cmd_history.append((self._canvas._id, 'update', self._id, 'y', y))

    def set_x1(self, x):
        if self._args[0] == 'line':
            self._args[1] = x
            self._canvas._cmd_history.append((self._cavnas._id, 'update', self._id, 'x1', x))

    def set_y1(self, y):
        if self._args[0] == 'line':
            self._args[2] = y
            self._canvas._cmd_history.append((self._canvas._id, 'update', self._id, 'y1', y))

    def set_x2(self, x):
        if self._args[0] == 'line':
            self._args[3] = x
            self._canvas._cmd_history.append((self._canvas._id, 'update', self._id, 'x2', x))

    def set_y2(self, y):
        if self._args[0] == 'line':
            self._args[4] = y
            self._canvas._cmd_history.append((self._canvas._id, 'update', self._id, 'y2', y))

    def set_radius(self, r):
        if self._args[0] == 'circle':
            self._args[3] = r
            self._canvas._cmd_history.append((self._canvas._id, 'update', self._id, 'radius', r))

    def rotate(self, a):
        self._canvas._cmd_history.append((self._canvas._id, 'update', self._id, 'rotate', a))

    def set_angle(self, a):
        self._canvas._cmd_history.append((self._canvas._id, 'update', self._id, 'angle', a))

    def stroke(self, color):
        color = color.to_hex()
        if self._args[0] == 'line':
            self._args[5] = color
            self._canvas._cmd_history.append((self._canvas._id, 'update', self._id, 'color', color))
        elif self._args[0] == 'circle':
            self._args[4] = color
            self._canvas._cmd_history.append((self._canvas._id, 'update', self._id, 'border', color))
        elif self._args[0] == 'rect':
            self._args[5] = color
            self._canvas._cmd_history.append((self._canvas._id, 'update', self._id, 'border', color))

    def fill(self, color):
        color = color.to_hex()
        if self._args[0] == 'circle':
            self._args[5] = color
            self._canvas._cmd_history.append((self._canvas._id, 'update', self._id, 'fill', color))
        elif self._args[0] == 'rect':
            self._args[6] = color
            self._canvas._cmd_history.append((self._canvas._id, 'update', self._id, 'fill', color))


class Canvas:

    def __init__(self, width, height, bgcolor=Colors.White, fgcolor=Colors.Black):
        global _canvas_id_counter
        self._id = _canvas_id_counter
        _canvas_id_counter += 1
        self._cmd_history = []
        self._next_objid = 0
        self._cmd_history.append((self._id, 'canvas',
                                 width, height,
                                 bgcolor.to_hex(),
                                 fgcolor.to_hex()))
        self.bgcolor = bgcolor
        self.fgcolor = fgcolor

    def update(self):
        builtins._sorna_media.append((
            'application/x-sorna-drawing',
            encode_commands(self._cmd_history)
        ))
        self._cmd_history = []

    def create_turtle(self):
        t = Turtle(self)
        return t

    @property
    def size(self):
        pass

    def stop_animation(self):
        self._cmd_history.append((self._id, 'stop-anim',))

    def resume_animation(self):
        self._cmd_history.append((self._id, 'resume-anim',))

    def begin_fill(self, c):
        self._cmd_history.append((self._id, 'begin-fill', c.to_hex()))

    def end_fill(self):
        self._cmd_history.append((self._id, 'end-fill',))

    def background_color(self, c):
        self.bgcolor = c
        self._cmd_history.append((self._id, 'bgcolor', c.to_hex()))

    def stroke_color(self, c):
        self.fgcolor = c
        self._cmd_history.append((self._id, 'fgcolor', c.to_hex()))

    def line(self, x0, y0, x1, y1, color=None):
        if color is None:
            color = self.fgcolor
        args = ('line', x0, y0, x1, y1, color.to_hex())
        self._cmd_history.append((self._id, 'obj', self._next_objid, args))
        obj = DrawingObject(self, self._next_objid, args)
        self._next_objid += 1
        return obj

    def circle(self, x, y, radius, border=None, fill=None, angle=0):
        if border is None:
            border = self.fgcolor
        if fill is None:
            fill = Colors.Transparent
        args = ('circle', x, y, radius, border.to_hex(), fill.to_hex(), angle)
        self._cmd_history.append((self._id, 'obj', self._next_objid, args))
        obj = DrawingObject(self, self._next_objid, args)
        self._next_objid += 1
        return obj

    def rectangle(self, left, top, width, height, border=None, fill=None, angle=0):
        if border is None:
            border = self.fgcolor
        if fill is None:
            fill = Colors.Transparent
        args = ('rect', left, top, width, height, border.to_hex(), fill.to_hex(), angle)
        self._cmd_history.append((self._id, 'obj', self._next_objid, args))
        obj = DrawingObject(self, self._next_objid, args)
        self._next_objid += 1
        return obj



__all__ = [
    'Canvas',
]

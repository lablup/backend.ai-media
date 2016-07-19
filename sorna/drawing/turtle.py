from .color import Colors
import math


class Turtle:

    def __init__(self, canvas):
        self.canvas = canvas
        self.points = []
        w = self.canvas.width
        h = self.canvas.height
        self.cursor = self.canvas.triangle(
            w / 2, h / 2, 12, 18,
            border=Colors.Red,
            fill=Colors.from_rgba([255, 200, 200, 255]),
            angle=90)
        self.angle = 90
        self.points.append((w / 2, h / 2))

    def forward(self, amt):
        x = self.points[-1][0]
        y = self.points[-1][1]
        x_diff = math.sin(math.radians(self.angle)) * amt
        y_diff = -1 * math.cos(math.radians(self.angle)) * amt
        self.canvas.begin_group()
        self.canvas.line(x, y, x + x_diff, y + y_diff, color=Colors.from_rgba([255, 0, 0, 128]))
        self.cursor.set_x(x + x_diff)
        self.cursor.set_y(y + y_diff)
        self.canvas.end_group()
        self.points.append((x + x_diff, y + y_diff))

    def left(self, deg):
        self.cursor.rotate(-deg)
        self.angle -= deg

    def right(self, deg):
        self.cursor.rotate(deg)
        self.angle += deg

    def pos(self):
        return self.points[-1]


__all__ = [
    'Turtle',
]

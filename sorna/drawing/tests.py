import simplejson as json
import unittest
import builtins

from . import Canvas, Turtle, Color, Colors


class CanvasFunctionalTest(unittest.TestCase):

    def test_create(self):
        c = Canvas(100, 100)
        t = c.create_turtle()
        self.assertIsInstance(t, Turtle)

    def test_update(self):
        builtins._sorna_media = []
        c = Canvas(100, 120)
        l = c.line(20, 20, 50, 50)
        b = c.circle(10, 10, 30)
        c.update()
        self.assertGreater(len(builtins._sorna_media), 0)
        self.assertEqual(builtins._sorna_media[0][0], 'application/x-sorna-drawing')
        data = builtins._sorna_media[0][1]
        update = json.loads(data)
        self.assertEqual('canvas', update[0][0])
        self.assertEqual(100, update[0][1])
        self.assertEqual(120, update[0][2])
        circle_id = update[-1][1]

        builtins._sorna_media = []
        b.set_y(45)
        c.update()
        self.assertGreater(len(builtins._sorna_media), 0)
        self.assertEqual(builtins._sorna_media[0][0], 'application/x-sorna-drawing')
        data = builtins._sorna_media[0][1]
        update = json.loads(data)
        self.assertEqual('update', update[0][0])
        self.assertEqual(circle_id, update[0][1])
        self.assertEqual(2, update[0][2])
        self.assertEqual(45, update[0][3])


class ColorFunctionalTest(unittest.TestCase):

    def test_conversion(self):
        self.assertEqual('#ff0000ff', Colors.Red.to_hex())
        self.assertEqual(b'\xff\x00\x00\xff', Colors.Red.to_bytes())

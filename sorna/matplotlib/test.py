from six.moves import builtins
import unittest
import matplotlib
matplotlib.use('module://sorna.matplotlib.backend_sorna')
import matplotlib.pyplot as plt
from .backend_sorna import _backend

class BackendReplacementTest(unittest.TestCase):

    def test_show(self):

        builtins._sorna_media = []
        # Example code taken from pyplot tutorial.
        plt.plot([1,2,3,4])
        plt.ylabel('some numbers')
        plt.show()
        self.assertGreater(len(builtins._sorna_media), 0)
        if _backend == 'png':
            self.assertEqual(builtins._sorna_media[0][0], 'image/png')
        elif _backend == 'svg':
            self.assertEqual(builtins._sorna_media[0][0], 'image/svg+xml')

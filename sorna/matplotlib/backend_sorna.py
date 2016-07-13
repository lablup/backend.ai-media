'''
Displays Agg images in the browser, wrapping them as Sorna media responses.
'''

# Base imports from matplotlib.backends.backend_template
import matplotlib
from matplotlib._pylab_helpers import Gcf
from matplotlib.backend_bases import FigureManagerBase
from matplotlib.figure import Figure
from matplotlib.transforms import Bbox

# The real renderer that generates image data
from matplotlib.backends import backend_agg

# My own imports
import base64
import builtins
import io


def draw_if_interactive():
    pass

def show():
    for manager in Gcf.get_all_fig_managers():
        manager.show()

def new_figure_manager(num, *args, **kwargs):
    FigureClass = kwargs.pop('FigureClass', Figure)
    thisFig = FigureClass(*args, **kwargs)
    return new_figure_manager_given_figure(num, thisFig)

def new_figure_manager_given_figure(num, figure):
    canvas = FigureCanvasSorna(figure)
    manager = FigureManagerSorna(canvas, num)
    return manager


class FigureCanvasSorna(backend_agg.FigureCanvasAgg):
    supports_blit = False

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._is_old = True
        self._dpi_ratio = 1

    def draw(self):
        renderer = self.get_renderer(cleared=True)
        self._is_old = True
        backend_agg.RendererAgg.lock.acquire()
        try:
            self.figure.draw(renderer)
        finally:
            backend_agg.RendererAgg.lock.release()

    def get_default_filetype(self):
        return 'png'


class FigureManagerSorna(FigureManagerBase):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
    
    def show(self):
        with io.BytesIO() as buf:
            self.canvas.print_png(buf)
            raw = buf.getvalue()
        enc = base64.b64encode(raw)
        builtins._sorna_media.append((
            'image/png',
            'data:image/png;base64,' + enc.decode('ascii')
        ))


FigureCanvas = FigureCanvasSorna
FigureManager = FigureManagerSorna


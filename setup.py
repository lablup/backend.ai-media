# Always prefer setuptools over distutils
from setuptools import setup
# To use a consistent encoding
from codecs import open
from os import path
import sys

universal_requires = [
    'six',
    'simplejson',
    'namedlist',
    'u-msgpack-python',
    'matplotlib==1.5.1',
]

if sys.version_info < (3, 4, 0):
    py2_requires = ['enum34']
else:
    py2_requires = []

setup(
    name='sorna-media',

    # Versions should comply with PEP440.  For a discussion on single-sourcing
    # the version across setup.py and the project code, see
    # https://packaging.python.org/en/latest/single_source_version.html
    version='0.2.0',
    description='Sorna media supporting library',
    long_description='',
    url='https://github.com/lablup/sorna-draw',
    author='Lablup Inc.',
    author_email='joongi@lablup.com',
    license='LGPL+BSD',

    packages=['sorna.drawing', 'sorna.matplotlib'],
    namespace_packages=['sorna'],

    install_requires=universal_requires + py2_requires,
    extras_require={
        'dev': [],
        'test': ['nose'],
    },
    data_files=[],
    test_suite='nose.collector',
)

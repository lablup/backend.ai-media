# Always prefer setuptools over distutils
from setuptools import setup
# To use a consistent encoding
from codecs import open
from os import path
import sys


setup(
    name='sorna-media',

    # Versions should comply with PEP440.  For a discussion on single-sourcing
    # the version across setup.py and the project code, see
    # https://packaging.python.org/en/latest/single_source_version.html
    version='0.4.0',
    description='Sorna media supporting library',
    long_description='',
    url='https://github.com/lablup/sorna-media',
    author='Lablup Inc.',
    author_email='joongi@lablup.com',
    license='LGPLv3',
    classifiers=[
        'Development Status :: 4 - Beta',
        'License :: OSI Approved :: GNU Lesser General Public License v3 or later (LGPLv3+)',
        'Intended Audience :: Developers',
        'Programming Language :: Python',
        'Programming Language :: Python :: 2',
        'Programming Language :: Python :: 2.7',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.4',
        'Programming Language :: Python :: 3.5',
        'Programming Language :: Python :: 3.6',
        'Operating System :: POSIX',
        'Operating System :: MacOS :: MacOS X',
        'Environment :: No Input/Output (Daemon)',
        'Topic :: Scientific/Engineering',
        'Topic :: Software Development',
    ],

    packages=['sorna', 'sorna.display', 'sorna.drawing', 'sorna.matplotlib'],
    namespace_packages=['sorna'],

    install_requires=[
        'six',
        'simplejson',
        'namedlist',
        'u-msgpack-python',
        'pandas',
        'numpy',
        'matplotlib',
    ],
    extras_require={
        ':python_version < "3.4"': ['enum34'],
        'dev': [],
        'test': ['nose'],
    },
    data_files=[],
    test_suite='nose.collector',
)

# Sorna Media Library

This contains a set of media support stubs for the Sorna code execution service.

## Libraries

 * `sorna.drawing` -- This is a simple drawing library that maps server-side running Python codes into a frontend-side running Javascript/Fabric canvas drawings.
 * `sorna.matplotlib` -- A plotting backend to encode the generated plot images into dataURI strings when the user code calls `plt.show()`.

## To test with local neumann/sorna

```
$ cd sorna-media/assets
$ python -m http.server 8002
```

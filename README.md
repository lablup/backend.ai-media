# Sorna Media Library

This contains a set of media support stubs for the Sorna code execution service.


## Library Overview

 * `sorna.drawing`
   -- This is a simple drawing library that maps server-side running Python
   codes into a frontend-side running Javascript/Fabric canvas drawings.
 * `sorna.matplotlib`
   -- A plotting backend to encode the generated plot images into dataURI
   strings when the user code calls `plt.show()`.


## For Developers

### Setting up

```sh
$ cd sorna-media
# Use package.json to install dependencies:
$ npm install
# To get command-line access for webpack:
# (NOTE: ensure that both local/global webpack has the same versions)
$ npm install -g webpack
# Alternatively, you may manually call node_modules/webpack/bin/webpack.js,
# but it is recommended to have the global version for update.sh script (see below).
```

### Testing with local neumann frontend instances

```sh
$ cd sorna-media/assets
$ python -m http.server 8002
```
Note that the port number is fixed for Lablup's internal development
configuration.  You may change it if you have different frontends.

After modifying script files, please run:
```sh
$ cd sorna-media
$ ./update.sh
```

This script will update the symbolic link `assets/latest` using the latest hash
values calculated by webpack so that your development configuration uses the
latest bundled javascript files.

To debug the webpack build process, just run `webpack` and see what it says.

### Deploying for production service

We use the standard aws-cli tool.  You first need to configure your AWS access
key and the secret key.

Run the following to update all assets:
```sh
$ aws s3 cp assets s3://sorna-assets/ --recursive
```

Then you should update the production configuration using the latest hash
value.
(e.g., https://s3.ap-northeast-2.amazonaws.com/sorna-assets/1234567890abcdef1234 )


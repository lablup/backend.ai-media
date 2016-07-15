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
# Use package.json to install dependencies:
$ npm install
# To get command-line access for webpack:
$ npm install -g webpack webpack-dev-server
```

Globally installed webpack and webpack-dev-server will automatically call
the local versions at ./node_modules if they exist.

### Testing with local neumann frontend instances

We use webpack-dev-server to automatically recompile the sources on the memory
whenever they changes (aka "watch-mode").

```sh
$ webpack-dev-server --config webpack.dev.config.js
# Bundled scripts are served at http://127.0.0.1:8002/latest/js/...
```

Note that the port number in the configuration is fixed for Lablup's internal
development configuration.  You may change it if you have different frontends.

### Deploying for production service

We use the standard aws-cli tool.  You first need to configure your AWS access
key and the secret key.

Before uploading, we first need to compile the resources for production.

```sh
$ ./update.sh
```

This script will write the compiled resources into assets/<hash> directory,
where the hash value depends on the content of all resource files.
It also deletes all other assets/<old-hash> directories automatically to avoid
duplicate transfers below.
To debug the webpack build process, simply run `webpack` and see what it says.

Then, run the following to upload all assets:
```sh
$ aws s3 cp assets s3://sorna-assets/ --recursive
```

You should update the production configuration using the latest hash value.
(e.g., https://s3.ap-northeast-2.amazonaws.com/sorna-assets/1234567890abcdef1234 )


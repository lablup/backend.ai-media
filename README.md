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
the local versions at `./node_modules` if they exist.

### Integration with a front-end

You need to specify `Sorna.assetRoot` in Javascript to let our scripts know
which location to fetch additoinal scripts from.
The `main.min.js` is designed to be small for faster page loads and most
functionality (e.g., drawing support) are loaded on demand.

For production:
```html
<script>
window.Sorna = window.Sorna || {};
window.Sorna.assetRoot = '//<sorna-serving-host>/<hash>';
</script>
<script src="//<sorna-serving-host>/<hash>/js/main.min.js"></script>
```

For development:
```html
<script>
window.Sorna = window.Sorna || {};
window.Sorna.assetRoot = 'http://localhost:8002/latest';
</script>
<script src="http://localhost:8002/latest/js/main.min.js"></script>
```

### Developing with local neumann frontend instances

We use webpack-dev-server to automatically recompile the sources on the memory
whenever they change (aka "watch-mode").
However, you need to manually refresh the page to get the latest bundles as we
do not use "hot module refresh" (HMR) due to conflicts with script tags without
src attributes (e.g., ZenDesk-injected scripts).

```sh
$ webpack-dev-server --config webpack.dev.config.js
# Bundled scripts are served at http://127.0.0.1:8002/latest/js/...
```

Note that the port number in the configuration is fixed for Lablup's internal
development configuration.  You may change it if you have different frontends.

### Deploying for production service

We use the standard aws-cli tool.  You should configure your AWS access key and
the secret key to make it working.

Before uploading, we first need to compile the resources for production.

```sh
$ ./update.sh
```

This script will write the compiled resources into `assets/<hash>` directory,
where the hash value depends on the content of all resource files.
It also deletes all other `assets/<old-hash>` directories automatically to avoid
duplicate transfers below.
To debug the webpack build process, simply run `webpack` and see what it says.

Then, run the following to upload all assets:
```sh
$ aws s3 cp assets s3://sorna-assets/ --recursive
```

Afterwards, you must update the production configuration (e.g.,
`SORNA_ASSET_ROOT` in Django/Flask settings) for your front-end using the
latest hash value.
(e.g., https://s3.ap-northeast-2.amazonaws.com/sorna-assets/1234567890abcdef1234 )


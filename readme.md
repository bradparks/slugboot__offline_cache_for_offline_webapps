# slugboot

aggressively cache at the application layer for offline-only webapps

With this module serving as a kind of web bios, you can create identical "slug"
domains (with https certs) that can be flashed with any application. The
application payload is stored in indexedDB.

This way, you can load webapps from p2p networks over webrtc, bluetooth LE,
or acoustic couplers. The webapps stay saved on your computer and you can open
them on a slug domain whenever you wish.

# example

create a main.js file:

``` js
var slug = require('slugboot')('/worker.js')
slug.version(function (err, v) {
  if (err) return console.error(err)
  if (v) return console.log('already uploaded a version')

  slug.fetch('/')
  slug.fetch('/bundle.js')
  slug.fetch('/worker.js')
  slug.put('/hello.txt', 'HI THERE')
  slug.commit(function (err) {
    if (err) return console.error(err)
    else console.log('uploaded version')
  })
})

window.slug = slug
```

set up `public/` with the slugboot worker.js file:

```
$ npm i -g browserify ecstatic
$ mkdir public
$ echo '<script src="bundle.js"></script>' > public/index.html
$ cp `node -pe "require.resolve('slugboot/worker.js')"` public/
$ browserify main.js > public/bundle.js
$ ecstatic -p 44000 public/
```

Now open `http://localhost:44000` and poke around with the `slug` instance on
the REPL.

# api

``` js
var slugboot = require('slugboot')
```

## var slug = slugboot(workerURL)

Create a new slugboot instance from a `workerURL` path string to the slugboot
service worker code.

## slug.put(path, body, cb)

Stage a string `body` to be saved at the path string `path`.

`cb(err)` fires with any errors.

## slug.fetch(src, dst, cb)

Request the document at the url string `src` and save the result to the path at
`dst`.

If `dst` is not given, it will use the pathname of `src`.

`cb(err)` fires with any errors.

## slug.copy(src, dst, cb)

Copy the file path `src` from the current active version to `dst` in the staging
version.

`cb(err)` fires with any errors.

## slug.commit(cb)

Commit any staged changes and increment the version.

`cb(err)` fires with any errors.

## slug.version(cb)

Query for the integer version as `cb(err, version)`.

Before flashing, the `version` will be undefined.

The first version after a commit is version 1.

# install

```
npm install slugboot
```

# license

BSD

var idb = self.indexedDB || self.mozIndexedDB
  || self.webkitIndexedDB || self.msIndexedDB
var dbs = {}

function getdb (name, stores) {
  var dbreq = idb.open(name)
  dbreq.addEventListener('upgradeneeded', function () {
    stores.forEach(function (name) {
      dbreq.result.createObjectStore(name)
    })
  })
  var db = null
  errb(dbreq, function (err, ev) {
    dbs[name] = dbreq.result
    db = dbreq.result
    queue.forEach(function (f) { f(db) })
    queue = null
  })
  var queue = []
  return function (f) {
    if (db) f(db)
    else queue.push(f)
  }
}
var getmetadb = getdb('slugboot.meta', ['meta'])
var verdb = {}

function getvstore (version, mode, cb) {
  if (!verdb[version]) {
    verdb[version] = getdb('slugboot.v' + version, ['files'])
  }
  verdb[version](function (db) {
    var tx = db.transaction(['files'],mode)
    tx.addEventListener('error', function (err) {
      console.error(err)
    })
    cb(null, tx.objectStore('files'))
  })
}

function metaget (key, cb) {
  getmetadb(function (db) {
    var tx = db.transaction(['meta'], 'readonly')
    tx.addEventListener('error', function (err) {
      console.error(err)
    })
    var store = tx.objectStore('meta')
    errb(store.get('version'), function (err, ev) {
      if (err) cb(err)
      else cb(null, ev.target.result)
    })
  })
}

function metaput (key, value, cb) {
  getmetadb(function (db) {
    var tx = db.transaction(['meta'], 'readwrite')
    tx.addEventListener('error', function (err) {
      console.error(err)
    })
    var store = tx.objectStore('meta')
    op(store, store.put(value, key), cb)
  })
}

self.addEventListener('fetch', function (ev) {
  var req = ev.request
  if (req.method === 'GET') {
    ev.respondWith(new Promise(function (resolve, reject) {
      var u = new URL(req.url)
      getFile(u.pathname, function (err, body, version) {
        if (err) {
          resolve(new Response(err.message, { status: err.status || 500 }))
        } else if (version === undefined) {
          resolve(fetch(req))
        } else if (body === undefined) {
          resolve(new Response('not found', { status: 404 }))
        } else resolve(new Response(body))
      })
    }))
  } else {
    ev.respondWith(new Response('not found',{ status: 404 }))
  }
})

var pending = 0
var opqueue = []
function ready () {
  opqueue.splice(0).forEach(function (f) { f() })
}

self.addEventListener('message', function (ev) {
  var data = ev.data || {}
  if (data.action === 'put') {
    pending++
    putFile(data.path, data.body, function (err) {
      if (err) error(err)
      else reply()
    })
  } else if (data.action === 'fetch') {
    pending++
    errback(fetch(data.url), function (err, res) {
      if (err) return error(err)
      errback(res.blob(), function (err, body) {
        if (err) error(err)
        else putFile(data.path, body, function (err) {
          if (err) error(err)
          else reply()
        })
      })
    })
  } else if (data.action === 'copy') {
    pending++
    getFile(data.src, function (err, body) {
      if (err) error(err)
      else putFile(data.dst, body, function (err) {
        if (err) error(err)
        else reply()
      })
    })
  } else if (data.action === 'commit') {
    if (pending > 0) opqueue.push(handleCommit)
    else handleCommit()
  } else if (data.action === 'version') {
    metaget('version', function (err, version) {
      if (err) error(err)
      else reply(version)
    })
  }
  function handleCommit () {
    pending++
    metaget('version', function (err, version) {
      if (err) return error(err)
      metaput('version', (version || 0) + 1, function (err) {
        if (err) error(err)
        else if (!version) reply()
        else clear(version, function (err) {
          if (err) error(err)
          else reply()
        })
      })
    })
  }
  function clear (version, cb) {
    var db = dbs['slugboot.v' + version]
    if (db) {
      db.close()
      delete dbs['slugboot.v' + version]
    }
    errb(idb.deleteDatabase('slugboot.v' + version), cb)
  }
  function error (err) {
    console.error(err)
    ev.ports[0].postMessage({ error: err })
    if (--pending === 0) ready()
  }
  function reply (value) {
    ev.ports[0].postMessage({ response: value })
    if (--pending === 0) ready()
  }
})

function op (store, q, cb) {
  var pending = 2
  errb(q, function (err) {
    if (err) cb(err)
    else done()
  })
  store.transaction.addEventListener('complete', done)
  function done () { if (--pending === 0) cb(null) }
}

function getFile (file, cb) {
  metaget('version', function (err, version) {
    if (err) cb(err)
    else if (version === undefined) {
      cb(null, undefined)
    } else getvstore(version, 'readonly', onstore)

    function onstore (err, store) {
      if (err) return cb(err)
      try { var pathname = new URL(file).pathname }
      catch (err) { pathname = file }
      errb(store.get(pathname), function (err, ev) {
        if (err) cb(err)
        else cb(null, ev.target.result, version)
      })
    }
  })
}

function putFile (file, body, cb) {
  metaget('version', function (err, version) {
    if (err) return error(err)
    getvstore((version || 0) + 1, 'readwrite', function (err, store) {
      if (err) return error(err)
      op(store, store.put(body, file), cb)
    })
  })
}

function errb (p, cb) {
  p.addEventListener('success', function (ev) { cb(null, ev) })
  p.addEventListener('error', function (err) { cb(err) })
}

function errback (p, cb) {
  p.then(function (r) { cb(null, r) }).catch(cb)
}

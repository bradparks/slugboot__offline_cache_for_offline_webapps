var idb = self.indexedDB || self.mozIndexedDB
  || self.webkitIndexedDB || self.msIndexedDB

var getdb = (function () {
  var dbreq = idb.open('slugboot')
  dbreq.addEventListener('upgradeneeded', function () {
    dbreq.result.createObjectStore('files')
  })
  dbreq.addEventListener('success', function (ev) {
    db = dbreq.result
    queue.forEach(function (f) { f(db) })
    queue = null
  })
  var queue = []
  return function (f) {
    if (db) f(db)
    else queue.push(f)
  }
})()

function getstore (mode, fn) {
  getdb(function (db) {
    var tx = db.transaction(['files'], mode)
    tx.addEventListener('error', function (err) {
      console.error(err)
    })
    var store = tx.objectStore('files')
    fn(store)
  })
}

self.addEventListener('fetch', function (ev) {
  var req = ev.request
  if (req.method === 'GET') {
    ev.respondWith(new Promise(function (resolve, reject) {
      var u = new URL(req.url)
      getstore('readonly', function (store) {
        errsuc(store.get(u.pathname), function (err, gev) {
          if (err) resolve(new Response(err+'', {status:500}))
          else if (gev.target.result === undefined) {
            resolve(new Response('not found', {status:404}))
          } else resolve(new Response(gev.target.result))
        })
      })
    }))
  } else {
    ev.respondWith(new Response('not found',{status:404}))
  }
})

self.addEventListener('message', function (ev) {
  var data = ev.data || {}
  if (data.action === 'clear') {
    var dbnames = idb.getDatabaseNames || idb.webkitGetDatabaseNames
    if (dbnames) {
      dbnames.addEventListener('success', function (ev) {
        for (var i in ev.target.result) {
          idb.deleteDatabase(ev.target.result[i])
        }
        self.parent.postMessage({response:data.id}, ev.origin)
      })
    } else {
      idb.deleteDatabase('cache')
    }
  } else if (data.action === 'put') {
    getstore('readwrite', function (store) {
      op(store, store.put(data.value, data.key), function (err) {
        if (err) console.error(err)
        else self.parent.postMessage({response:data.id}, ev.origin)
      })
    })
  }
})

function op (store, q, cb) {
  var pending = 2
  errback(q, function (err) {
    if (err) cb(err)
    else done()
  })
  store.transaction.addEventListener('complete', done)
  function done () { if (--pending === 0) cb(null) }
}

function errback (p, cb) {
  p.then(function (x) { cb(null, x) }).catch(cb)
}

function errsuc (p, cb) {
  p.addEventListener('success', function (ev) { cb(null, ev) })
  p.addEventListener('error', function (err) { cb(err) })
}

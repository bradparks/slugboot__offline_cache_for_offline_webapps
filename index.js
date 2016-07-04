var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter

module.exports = Slug
inherits(Slug, EventEmitter)

function Slug (workerFile) {
  var self = this
  if (!(self instanceof Slug)) return new Slug(workerFile)
  self.worker = null

  var regp = navigator.serviceWorker.register(workerFile)
  errback(regp, function (err, reg) {
    if (err) return self.emit('error', err)
    if (reg.installing) {
      self.worker = reg.installing
      self.emit('state', 'installing')
    } else if (reg.waiting) {
      self.worker = reg.waiting
      self.emit('state', 'waiting')
    } else if (reg.active) {
      self.worker = reg.active
      self.emit('state', 'active')
    }
    self.worker.addEventListener('statechange', function (e) {
      self.emit('state', e.target.state)
    })
  })
}

Slug.prototype._getWorker = function (cb) {
  if (this.worker) cb(this.worker)
  else this.once('state', function () { cb(this.worker) })
}

Slug.prototype._send = function (data, cb) {
  var chan = new MessageChannel
  chan.port1.addEventListener('message', onmessage)
  this._getWorker(function (worker) {
    worker.postMessage(data, [chan.port2])
  })

  function onmessage (ev) {
    if (cb && ev.data.error) cb(ev.data.error)
    else if (cb) cb(null, ev.data.response)
  }
}

Slug.prototype.put = function (path, body, cb) {
  this._send({ action: 'put', path: path, body: body }, cb)
}

Slug.prototype.commit = function (cb) {
  this._send({ action: 'commit' }, cb)
}

Slug.prototype.fetch = function (src, dst, cb) {
  if (typeof dst === 'function') {
    cb = dst
    try { dst = new URL(src).pathname }
    catch (err) { dst = src }
  } else if (!dst) {
    try { dst = new URL(src).pathname }
    catch (err) { dst = src }
  }
  this._send({ action: 'fetch', url: src, path: dst }, cb)
}

Slug.prototype.copy = function (src, dst, cb) {
  if (typeof dst === 'function') {
    cb = dst
    try { dst = new URL(src).pathname }
    catch (err) { dst = src }
  } else if (!dst) {
    try { dst = new URL(src).pathname }
    catch (err) { dst = src }
  }
  this._send({ action: 'copy', src: src, dst: dst }, cb)
}

function errback (p, cb) {
  p.then(function (x) { cb(null, x) }).catch(cb)
}

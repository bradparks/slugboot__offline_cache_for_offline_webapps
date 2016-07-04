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

Slug.prototype._send = function (data) {
  this._getWorker(function (worker) {
    worker.postMessage(data)
  })
}

function errback (p, cb) {
  p.then(function (x) { cb(null, x) }).catch(cb)
}

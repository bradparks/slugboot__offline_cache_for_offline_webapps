var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter

module.exports = Slug
inherits(Slug, EventEmitter)

function Slug (workerFile) {
  var self = this
  if (!(self instanceof Slug)) return new Slug(workerFile)
  var regp = navigator.serviceWorker.register(workerFile)
  errback(regp, function (err, reg) {
    if (err) return self.emit('error', err)
    var worker
    if (reg.installing) {
      worker = reg.installing
      self.emit('state', 'installing')
    } else if (reg.waiting) {
      worker = reg.waiting
      self.emit('state', 'waiting')
    } else if (reg.active) {
      worker = reg.active
      self.emit('state', 'active')
    }
    worker.addEventListener('statechange', function (e) {
      self.emit('state', e.target.state)
    })
  })
}

function errback (p, cb) {
  p.then(function (x) { cb(null, x) }).catch(cb)
}

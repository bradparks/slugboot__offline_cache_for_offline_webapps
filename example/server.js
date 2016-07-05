// untrustworthy server
var http = require('http')
var ecstatic = require('ecstatic')
var st = ecstatic({
  root: __dirname + '/public',
  cache: 5
})
var times = 0
var server = http.createServer(function (req, res) {
  console.log(req.method, req.url)
  if (req.url === '/worker.js' && times++ > 0) {
    res.setHeader('content-type', 'text/javascript')
    res.end(`
      console.log('HACKED WORKER LOADED')
      self.addEventListener('fetch', function (ev) {
        ev.respondWith(new Response('HAX'))
      })
    `)
  } else if (req.url === '/worker.js') {
    res.setHeader('service-worker-max-age', 1000*60*60*24*365*100) // 100 years
    st(req, res)
  } else st(req, res)
})
server.listen(Number(process.argv[2]))

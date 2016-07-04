self.addEventListener('install', function (ev) {
})

self.addEventListener('fetch', function (ev) {
})

self.addEventListener('message', function (ev) {
  console.log('MESSAGE', ev.data)
})

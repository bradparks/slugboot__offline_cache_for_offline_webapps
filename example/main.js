var slug = require('../')('/worker.js')
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

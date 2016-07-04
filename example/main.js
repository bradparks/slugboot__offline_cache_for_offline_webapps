var slug = require('../')('/worker.js')
slug.fetch('/')
slug.fetch('/bundle.js')
slug.fetch('/worker.js')
slug.put('/hello.txt', 'HI THERE')
slug.commit()

window.slug = slug

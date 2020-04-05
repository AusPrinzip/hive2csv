const express = require('express')
const router = express.Router()
const controllers = require('../controllers')

router.get('/csv', controllers.downloadDumps)

module.exports = router
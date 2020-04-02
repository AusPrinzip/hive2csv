var express = require('express')
var router = express.Router()
const requests = require('./requests')

router.use('/requests', requests)

module.exports = router
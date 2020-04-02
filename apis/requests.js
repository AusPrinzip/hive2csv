var express = require('express')
var router = express.Router()
const utils = require('../utils')
const client = utils.getClient()

router.get('/', async function (req, res) {
  let batch1 = await client.database.call('get_account_history', ['likwid', -1, 1000])
  // let batch2 = await client.database.call('get_account_history', ['likwid', 10000, 10000])
  res.send('hivedumps test')
})

module.exports = router
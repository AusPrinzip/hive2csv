var express = require('express')
var router = express.Router()
const utils = require('../utils')
const client = utils.getClient()

function wait () {
	return new Promise((resolve, reject) => {
		setTimeout(() => { resolve() }, 1000)
	})
}

router.get('/', async function (req, res, next) {
	console.log('Incoming new GET request')
	var { operation, from, until, account } = req.query
	from = new Date(from)
	until = new Date(until)

	const batchInterval = 1000
	var batches = []

	// async loop
	for (let i = 0; i < 20; i++) {
		console.log('i = ' + i)
		let start = i == 0 ? -1 : batchInterval * i
		client.database.call('get_account_history', [account, start, batchInterval])
		.then((batch) => {
			console.log('batch ' + i + ' ' + batch.length)
			// filter only desired OPs
			let _batch = batch.filter((item) => item[1].op[0] == operation)
			// filter out by date
			
			// refactoring
			_batch = batch.map((item) => {
				let timestamp = item[1].timestamp
				let op = item[1].op[1]
				op.timestamp = timestamp
				return op
			})
			batches = batches.concat(_batch)
			let batchOldestItem = new Date(batch[batch.length - 1][1].timestamp)
			console.log(batchOldestItem, from)
			if (from > batchOldestItem) {
				console.log('BINGO!, fromDate ' + from + ' has been reached: item at ' + batchOldestItem)
				return
			}
		})
		.catch((e) => {
			console.log(e)
			next(e)
		})
		await wait()
	}
	res.status(200).send()
})

module.exports = router
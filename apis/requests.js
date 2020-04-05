var express = require('express')
var router = express.Router()
const utils = require('../utils')
const client = utils.getClient()
const stringify = require('csv-stringify')
const axios = require('axios')
const request = require('request');
const JSONStream = require('JSONStream')
const es = require('event-stream')
const fs = require('fs')
function wait () {
	return new Promise((resolve, reject) => {
		setTimeout(() => { resolve() }, 2000)
	})
}

function downloadCsv(req, res) {
  stringify(posts, { header: true })
    .pipe(res)
}

async function loop () {
	const batchInterval = 1000
	var batches = []
	var reachedInterval = false
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

			
			// batches.forEach((el) => )

			let batchOldestItem = new Date(batch[batch.length - 1][1].timestamp)
			reachedInterval = from > batchOldestItem
			if (reachedInterval) {
				console.log(' ** Reached time interval ** ')
			}
		})
		.catch((e) => {
			console.log(e)
			next(e)
		})
		await wait()
		if (reachedInterval) break
	}
}
// Why did you mark those functions with async? This makes a function to always return a Promise which has no pipe method.
router.get('/', function (req, res, next) {
	res.attachment('dump.csv')
	console.log('Incoming new GET request')
	var { operation, from, until, account } = req.query
	from = new Date(from)
	until = new Date(until)
	const data = {"jsonrpc":"2.0", "method":"condenser_api.get_account_history", "params":[account, -1, 100], "id":1}
	request.post("https://api.steemit.com", {form: JSON.stringify(data)}) // .pipe(process.stdout)
	.pipe(JSONStream.parse('result.*', function (item) {
		item[1].op[1].timestamp = item[1].timestamp
		return item[1].op[0] == 'transfer' ? item[1].op[1] : null 
	}))
	.pipe(stringify(
		{
		  header: true,
		  columns: {
		   amount: 'Amount',
		   to: 'To',
		   from: 'From',
		   timestamp: 'ts',
		   memo: 'Memo',
		  }
		}
	)).pipe(res)
})

module.exports = router
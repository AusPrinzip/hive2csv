const request = require('request')
const JSONStream = require('JSONStream')
const stringify = require('csv-stringify')
var CombinedStream = require('combined-stream')
const fs = require('fs')
const utils = require('../utils.js')
const rpcnodes = ['https://anyx.io', 'https://hived.privex.io', 'https://api.pharesim.me']
// The readable.pipe() method attaches a Writable stream to the readable, 
// causing it to switch automatically into flowing mode and push all of its data to the attached Writable. 
// The flow of data will be automatically managed so that the destination Writable stream is not 
// overwhelmed by a faster Readable stream.

const columns = {
	"transfer": {
		count: 'count',
		amount: 'Amount',
		to: 'To',
		from: 'From',
		timestamp: 'ts',
		memo: 'Memo',
		trx_id: 'trxid',
  },
  "curation_reward": {
		curator: 'Curator',
		reward: 'Reward',
		comment_author: 'Author',
		comment_permlink: 'Permlink',
		timestamp: 'ts',
  },
  "create_claimed_account": {
  	creator: 'Creator',
  	new_account_name: 'New account name',
  	owner: 'owner',
  	active: 'active',
  	posting: 'posting',
  	memo_key: 'memo_key',
  	json_metadata: 'json_metadata',
  	extensions: 'extensions',
  },
  "comment_benefactor_reward": {
  	benefactor: 'benefactor',
  	author: 'Author',
  	permlink: 'Permlink',
  	sbd_payout: 'SBD Payout',
  	steem_payout: 'STEEM Payout',
  	vesting_payout: 'Vest Payout',
  },
  "comment": {
  	parent_author: 'Parent Author',
  	parent_permlink: 'Parent Permlink',
  	author: 'Author',
  	permlink: 'Permlink',
  	title: 'title',
  	json_metadata: 'json_metadata',
  }
}

const getOptions = function (op, i) {
	return {
		header: i == 0 ? true : false,
		columns: columns[op]
	}
}

function wait (ms) {
	return new Promise((resolve, reject) => {
		setTimeout(() => { resolve() }, ms)
	})
}

async function downloadCsv (req, res, next) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=\"' + 'download-' + Date.now() + '.csv\"');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Pragma', 'no-cache');
	var { operation, from, until, account } = req.query
	console.log(operation, from, until, account)
	from = new Date(from)
	until = new Date(until)
	const depth = 10000

	// should prob call this asychronously
	var OpCount = await utils.getOpCount(account)

	var fromDateReached = false
	var untilDateReached = false
	var i = 0
	var identifier = account + from.getTime().toString() + until.getTime().toString() + operation
	// In case of rpcnode timeouts, we will push the failed request to "failed" arr and try to recover it with a diff rpcnode
	var failed = []
	const date1 = new Date()

	// date error handling
	// TODO no date prior to 2016 - creation of steem

	if (from > until) throw new Error('from > until')

	while (fromDateReached == false) {
		let rpcnode = rpcnodes[i % rpcnodes.length]
		let writeStream = fs.createWriteStream(`./${identifier}${i}.csv`)

		writeStream
		.on('error', function (err) {
			console.log(err)
			throw new Error(err)
		})

		let start = OpCount - i * depth
		console.log(i + ' - '  + start)
		const data = { "jsonrpc":"2.0", "method":"condenser_api.get_account_history", "params":[account, start, depth], "id":1 }
		// request response is always a readable type of stream on a client
		request.post(rpcnode, { form: JSON.stringify(data) }) // .pipe(process.stdout)
		.on('data', (chunk) => {
			let data = chunk.toString()
			let json = {}
			try {
				json = JSON.parse(data)
			} catch(e) {
				// not an error msg
			}
			if (json.hasOwnProperty('error')) {
				console.log('Request failed at start: ' + start + ' with rpcnode: ' + rpcnode + ' and with error: ' + json.error.message)
				let timeoutError = json.error.message.indexOf('Timeout') > -1
				if (timeoutError) {
					failed.push({ rpcnode: rpcnode, start: start })
				} else {
					throw new Error(json.error.message)
				}
			}
		})
		.pipe(JSONStream.parse('result.*', function (item) {
			let op = item[1].op[1]
			let timestamp = item[1].timestamp
			let opNum = item[0]
			let trx_id = item[1].trx_id
			if (new Date(timestamp) < from) {
				fromDateReached = true
				return null
			} else if (new Date(timestamp) > until) {
				return null
			}
			op.timestamp = timestamp
			op.count = opNum
			op.trx_id = trx_id
			if (item[1].op[0] == 'transfer') {
				let currency = op.amount.indexOf('HIVE') > -1 ? 'HIVE' : 'HBD'
				op.amount = parseFloat(op.amount).toString(3)
				op.currency = currency
			}
			// return op
			return item[1].op[0] == operation ? op : null 
		}))
		.pipe(stringify(getOptions(operation, i)))
		.pipe(writeStream)

		await wait(1200)
		i++
	}
	console.log('BINGO ' + i)

	// Timer for performance tests
	const date2 = new Date()
	const milisec = 1000
	const timediff = (date2 - date1) / milisec
	console.log(timediff)

	// Check disk for files before streaming out
	const dir = './'
	var fileCount = fs.readdirSync(dir).filter((file) => file.indexOf(identifier) > -1).length

	// Read stream combination
	var combinedStream = CombinedStream.create()
	for (let j = 0; j < fileCount; j++) {
		let path = `${identifier}${j}.csv`
		combinedStream.append(fs.createReadStream(path))
		fs.unlink(path, (err) => {
		  if (err) throw err;
		  console.log(path + ' was deleted')
		})
	}
	combinedStream.pipe(res)
}

module.exports = {
	downloadCsv: downloadCsv
}
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

	var OpCount = await utils.getOpCount(account)

	var fromLimit = false
	var untilLimit = false
	var i = 0
	var identifier = account + from.getTime().toString() + until.getTime().toString() + operation
	const date1 = new Date()
	while (fromLimit == false) {
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
				console.log(rpcnode)
				throw new Error(json.error.message)
			}
		})
		.pipe(JSONStream.parse('result.*', function (item) {
			let op = item[1].op[1]
			let timestamp = item[1].timestamp
			let opNum = item[0]
			let trx_id = item[1].trx_id
			if (new Date(timestamp) < from) {
				fromLimit = true
				return null
			} else if (new Date(timestamp) > until) {
				return null
			}
			op.timestamp = timestamp
			op.count = opNum
			op.trx_id = trx_id
			// return op
			return item[1].op[0] == operation ? op : null 
		}))
		.pipe(stringify(getOptions(operation, i)))
		.pipe(writeStream)

		await wait(1200)
		i++
	}
	console.log('BINGO ' + i)
	const date2 = new Date()
	const milisec = 1000
	const timediff = (date2 - date1) / milisec
	console.log(timediff)
	const dir = './'
	var fileCount = fs.readdirSync(dir).filter((file) => file.indexOf(identifier) > -1).length

	var combinedStream = CombinedStream.create()
	for (let j = 0; j < fileCount; j++) {
		let path = `${identifier}${j}.csv`
		combinedStream.append(fs.createReadStream(path))
		// await wait(500)
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
const request = require('request')
const JSONStream = require('JSONStream')
const stringify = require('csv-stringify')
var CombinedStream = require('combined-stream')
const fs = require('fs')
const utils = require('../utils.js')
const rpcnodes = ['https://anyx.io']
const columns = require('../constants').columns

// The readable.pipe() method attaches a Writable stream to the readable, 
// causing it to switch automatically into flowing mode and push all of its data to the attached Writable. 
// The flow of data will be automatically managed so that the destination Writable stream is not 
// overwhelmed by a faster Readable stream.

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
  // header config
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=\"' + 'download-' + Date.now() + '.csv\"');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Pragma', 'no-cache');
  // req config
  req.setTimeout(500000);

  var { operation, from, until, account } = req.query
  if (!operation || ! from || !until || !account) {
    return res.send(JSON.stringify({ error: 'missing argument/s' }))
  }
  console.log(operation, from, until, account)
  // make sure its lowercase
  account = account.toLowerCase()
  from = new Date(from)
  until = new Date(until)
  const depth = 1000
  const delay = 300
  // should prob call this asychronously
  var OpCount = await utils.getOpCount(account)

  var fromDateReached = false
  var untilDateReached = false
  var i = 0
  var identifier = account + from.getTime().toString() + until.getTime().toString() + operation
  // In case of rpcnode timeouts, we will push the failed request to "failed" arr and try to recover it with a diff rpcnode
  var timeoutRequests = []
  const date1 = new Date()

  // date error handling
  // TODO no date prior to 2016 - creation of steem

  if (from > until) throw new Error('from > until')

  var combinedStream = CombinedStream.create({ pauseStreams: false })
  
  combinedStream
  .on('error', function (err) {
    return res.send(JSON.stringify({ error: err }))
  })

  while (fromDateReached == false) {
    let rpcnode = rpcnodes[i % rpcnodes.length]
    let start = OpCount - i * depth

    if (start < depth) {
      depth = start - 1
    }
    console.log(i + ' - '  + start)
    const data = { "jsonrpc":"2.0", "method":"condenser_api.get_account_history", "params":[account, start, depth], "id":1 }

    combinedStream.append(requestBatch(rpcnode, data, i))

    await wait(delay)
    if (i == 0) {
      combinedStream.pipe(res)
    }
    i++
  }
  console.log(`Date scope reached at batch#: ${i} (at ${depth} items per batch)`)
  
  function transform (item) {
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
      op.amount = parseFloat(op.amount).toFixed(3)
      op.currency = currency
    }
    // return op
    return item[1].op[0] == operation ? op : null 
  }

  function requestBatch (rpcnode, data, i) {
    let start = 0
    try {
      start = data.params[1]
    } catch(err) {
      console.log(rpcnode, data, i)
      return res.send(JSON.stringify({ error: err }))
    }
    let depth = data.params[2]
    let stringifyWriteStream = stringify(getOptions(operation, i))
    request.post(rpcnode, { form: JSON.stringify(data) }) // .pipe(process.stdout)
    .on('data', (chunk) => {
      let textdata = chunk.toString()
      let json = {}
      try {
        json = JSON.parse(textdata)
      } catch(e) {
        // not an error msg
      }
      if (json.hasOwnProperty('error')) {
        console.log(data)
        let error = new Error('Request failed at Batch #:' + i + ', OP#(start): ' + start + ' with rpcnode: ' + rpcnode + ' and with error: ' + json.error.message)
        let timeoutError = json.error.message.indexOf('Timeout') > -1
        if (timeoutError) {
          // WHY NOT RETURN HERE ANOTHER REQUEST (AKA READSTREAM) WITH A DIFF RPC NODE ?!
          timeoutRequests.push({ rpcnode: rpcnode, data: data, batch: i })
        } else {
          return res.send(JSON.stringify({ error: json.error.message }))
        }
      }
    }) 
    .pipe(JSONStream.parse('result.*', function (item) { return transform(item) }))
    .pipe(stringifyWriteStream)
    return stringifyWriteStream
  }
}

module.exports = {
  downloadCsv: downloadCsv
}
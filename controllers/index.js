const request = require('request')
const JSONStream = require('JSONStream')
const stringify = require('csv-stringify')

function downloadDumps (req, res, next) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=\"' + 'download-' + Date.now() + '.csv\"');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Pragma', 'no-cache');
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
}

module.exports = {
	downloadDumps: downloadDumps
}
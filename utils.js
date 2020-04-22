const dsteem = require('@hivechain/dhive')
const client = new dsteem.Client('https://anyx.io')
// https://api.hivekings.com
// https://anyx.io
function getClient () {
	return client
}
async function getOpCount (account) {
	let request = await client.database.call('get_account_history', [account, -1, 0])
	return parseFloat(request[0][0])
}

module.exports = {
	getClient: getClient,
	getOpCount: getOpCount
}
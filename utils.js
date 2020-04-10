const dsteem = require('@hivechain/dhive')
const client = new dsteem.Client('https://hived.privex.io')
// https://api.hivekings.com
// https://anyx.io
function getClient () {
	return client
}
async function getOpCount (account) {
	return new Promise((resolve, reject) => {
		client.database.call('get_account_history', [account, -1, 0])
		.then((res) => {
			resolve(parseFloat(res[0][0]))
		})
	})
}
module.exports = {
	getClient: getClient,
	getOpCount: getOpCount
}
const dsteem = require('@hivechain/dhive')
const client = new dsteem.Client('https://api.hivekings.com')
// https://api.hivekings.com
// https://anyx.io
function getClient () {
	return client
}

module.exports = {
	getClient: getClient
}
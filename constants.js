const columns = {
  "transfer": {
    count: 'count',
    amount: 'Amount',
    currency: 'Currency',
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
    timestamp: 'ts',
  },
  "comment_benefactor_reward": {
    benefactor: 'benefactor',
    author: 'Author',
    permlink: 'Permlink',
    sbd_payout: 'SBD Payout',
    steem_payout: 'STEEM Payout',
    vesting_payout: 'Vest Payout',
    timestamp: 'ts',
  },
  "comment": {
    parent_author: 'Parent Author',
    parent_permlink: 'Parent Permlink',
    author: 'Author',
    permlink: 'Permlink',
    title: 'title',
    json_metadata: 'json_metadata',
    timestamp: 'ts',
  }
}

module.exports = {
  columns: columns
}
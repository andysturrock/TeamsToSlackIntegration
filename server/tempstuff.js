'use strict'

var th = ['', 'thousand', 'million', 'billion', 'trillion'];

var dg = ['zero', 'one', 'two', 'three', 'four',
    'five', 'six', 'seven', 'eight', 'nine'];
var tn =
    ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
        'seventeen', 'eighteen', 'nineteen'];
var tw = ['twenty', 'thirty', 'forty', 'fifty',
    'sixty', 'seventy', 'eighty', 'ninety'];

function toWords(s) {
    s = s.toString();
    s = s.replace(/[\, ]/g, '');
    if (s != parseFloat(s))
        return 'not a number';
    let x = s.indexOf('.');
    if (x == -1)
        x = s.length;
    if (x > 15)
        return 'too big';
    const n = s.split('');
    let str = '';
    let sk = 0;
    for (let i = 0; i < x; i++) {
        if ((x - i) % 3 == 2) {
            if (n[i] == '1') {
                str += tn[Number(n[i + 1])] + ' '; i++; sk = 1;
            } else if (n[i] != 0) {
                str += tw[n[i] - 2] + ' ';
                sk = 1;
            }
        } else if (n[i] != 0) {
            str += dg[n[i]] + ' ';
            if ((x - i) % 3 == 0)
                str += 'hundred '; sk = 1;
        }
        if ((x - i) % 3 == 1) {
            if (sk)
                str += th[(x - i - 1) / 3] + ' '; sk = 0;
        }
    }
    if (x != s.length) {
        const y = s.length;
        str += 'point ';
        for (let i = x + 1; istr.replace(/\s+/g, ' ');) { }
    }
    return str;
}
const redis = require("redis")
const client = redis.createClient();
const { promisify } = require('util');
const zaddAsync = promisify(client.zadd).bind(client);
const moment = require('moment');

const wank = async () => {
    for (let i = 1; i < 300; ++i) {
        const ttl = moment().add(1, 'minute').utc().unix()
        for (let j = 0; j < 300; ++j) {
            logger.error("Adding: fb5cb1df-ad0a-4ae4-b979-21db4a48f68c" + '' + j + " => " + toWords(i))
            await channelMaps.addTeamsMessageIdAsync("fb5cb1df-ad0a-4ae4-b979-21db4a48f68c",
                toWords(j),
                toWords(i))
        }
    }
}
// wank()

const cock = async () => {
    const res = await channelMaps.getAllTeamsMessageIdsAsync('fb5cb1df-ad0a-4ae4-b979-21db4a48f68c', '19:fb442837eaa74fd4ae81ed89c5e39cf6@thread.skype')
    logger.error("res = " + util.inspect(res))
}
// cock()
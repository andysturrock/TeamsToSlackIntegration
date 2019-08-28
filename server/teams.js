'use strict'
const util = require('util')
const logger = require('pino')()
const https = require('https');

module.exports = {
  postBotReplyAsync: async function (token, teamsChannelId, replyToId, message) {
    _postBotMessage(token, teamsChannelId, replyToId, message)
  },
  postBotMessageAsync: async function (token, teamsChannelId, message) {
    _postBotMessage(token, teamsChannelId, null, message)
  }
}

async function _postBotMessage(token, teamsChannelId, replyToId, message) {
  return new Promise((resolve, reject) => {

    const data = JSON.stringify({
      "type": "message",
      "text": message,
      "textFormat": "xml"
    })

    const path = replyToId ?
      `/uk/v3/conversations/${teamsChannelId};messageid=${replyToId}/activities/` :
      `/uk/v3/conversations/${teamsChannelId}/activities/`
    const options = {
      hostname: 'smba.trafficmanager.net',
      method: 'POST',
      path: path,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }
    var req = https.request(options, (res) => {
      res.on('data', (data) => {
        const response = JSON.parse(new String(data))
        if (response.error) {
          logger.error("Error posting bot reply: " + util.inspect(response.error))
          reject(response)
        }
        resolve(response)
      })
    })

    req.on('error', (error) => {
      logger.error("Error posting bot reply: " + util.inspect(error))
      reject(error)
    })

    req.write(data);
    req.end();
  })
}



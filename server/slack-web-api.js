'use strict'
const util = require('util')
const logger = require('pino')()
const { WebClient } = require('@slack/web-api')

// TODO - redo this.  Having a module level "global" variable
// can't be the best way.
let webClient

function connectToSlackWebAPI() {
  // Initialize
  webClient = new WebClient()
}

function web() {
  if (!webClient) {
    connectToSlackWebAPI()
  }
  return webClient
}

module.exports = {

  postMessageAsync: async function (token, message, channelId) {
    return await web().chat.postMessage({ token: token, text: message, channel: channelId })
  },

  postReplyAsync: async function (token, message, channelId, slackMessageId) {
    return await web().chat.postMessage({ token: token, text: message, channel: channelId, thread_ts: slackMessageId })
  }

}
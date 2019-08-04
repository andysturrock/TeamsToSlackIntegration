'use strict'
const util = require('util')


// TODO - redo this.  Having a module level "global" variable
// can't be the best way.
let webClient

function connectToSlackWebAPI() {
  const { WebClient } = require('@slack/web-api');

  // Read a token from the environment variables
  const token = process.env.SLACK_TOKEN;

  // Initialize
  webClient = new WebClient(token);
}

function web() {
  if(!webClient) {
    connectToSlackWebAPI()
  }
  return webClient
}

module.exports = {

  getBotConversationsAsync: async function (web) {
    return await web().users.conversations()
  },

  postMessageAsync: async function (message, channelId, slackMessageId) {
    try {
      if(slackMessageId) {
        const result = await web().chat.postMessage({ text: message, channel: channelId, thread_ts: slackMessageId });
        return result.ts
      } else {
        const result = await web().chat.postMessage({ text: message, channel: channelId });
        return result.ts
      }
    }
    catch (error) {
      console.log("Error posting to Slack: " + error.stack)
    }
  }
};
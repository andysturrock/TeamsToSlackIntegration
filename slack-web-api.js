'use strict'
var util = require('util')

var webClient

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

  postMessageAsync: async function (message, channel_id) {
    try {
      const result = await web().chat.postMessage({ text: message, channel: channel_id });
      return result.ts
    }
    catch (error) {
      console.log("Error posting to Slack: " + error.stack)
    }
  }
};
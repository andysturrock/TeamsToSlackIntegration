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

function webAsync() {
  if(!webClient) {
    connectToSlackWebAPI()
  }
  return webClient
}

module.exports = {

  getBotConversationsAsync: async function (web) {
    let arse = await web.users.conversations()
    console.count("arse = " + util.inspect(arse))
  },

  postMessageAsync: async function (message, channel_id) {
    try {
      const result = await webAsync().chat.postMessage({ text: message, channel: channel_id });
      console.log(`Successfully sent message ${result.ts} in conversation ${channel_id}: ` + util.inspect(result));
      return result.ts
    }
    catch (error) {
      console.log("Error: " + util.inspect(error))
    }
  }
};
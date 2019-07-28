'use strict'
var util = require('util')
var graph = require('./graph.js');
var channelMaps = require('./channel-maps');

var slackWeb = require('./slack-web-api');

module.exports = {
  pollTeamsForMessages: async function (accessToken) {
    console.log(`Polling Teams for messages with accessToken ${accessToken} at ...` + new Date())

    slackWeb.postMessage("Polling teams...", "C7F9N62KS")

    const teamsChannels = channelMaps.getTeamsChannels()
    for (let teamsChannel of teamsChannels) {
      const slackChannelId = channelMaps.getSlackChannel(teamsChannel.teamId, teamsChannel.teamsChannelId)
      if (slackChannelId) {
        // First get the messages from this channel since last time we checked...
        const lastPolledTime = channelMaps.getLastPolledTime(teamsChannel.teamId, teamsChannel.teamsChannelId)
        if (!lastPolledTime) {
          slackWeb.postMessage("Can't find last time I checked Teams for messages - there may be missing messages", slackChannelId)
        } else {

          const messages = await graph.getMessagesAfter(accessToken, teamsChannel.teamId, teamsChannel.teamsChannelId, lastPolledTime);

          // And post them to Slack
          for (let message of messages) {
            console.log("message id: " + util.inspect(message.id))
            console.log("Message body: " + util.inspect(message.body))
            console.log("Message from: " + util.inspect(message.from.user))
            const slackMessage = `From Teams (${message.from.user.displayName}): ${message.body.content}`
            const slackMessageId = slackWeb.postMessage(slackMessage, slackChannelId)
            channelMaps.setSlackMessageId(slackMessageId, teamsChannel.teamId, teamsChannel.teamsChannelId, message.id)

            // Now deal with any replies
            const replies = await graph.getRepliesAfter(accessToken, teamsChannel.teamId, teamsChannel.teamsChannelId, message.id, lastPolledTime);
            for (let reply of replies) {
              console.log("reply body: " + util.inspect(reply.body))
              console.log("reply to id:" + util.inspect(reply.replyToId))
              // Find the Slack message id for the original message
              const slackMessageId = channelMaps.getSlackMessageId(teamsChannel.teamId, teamsChannel.teamsChannelId, reply.replyToId)
              // Now post the reply to the slack message thread
            }
            channelMaps.setLastPolledTime(teamsChannel.teamId, teamsChannel.teamsChannelId, new Date())
          }
        }
      } else {
        console.log(`Error - cannot find mapped Slack channel for ${teamsChannel.teamId}/${teamsChannel.teamsChannelId}`)
      }
    }
  }
};





'use strict'
var util = require('util')
var graph = require('./graph.js');
var channelMaps = require('./channel-maps');

var slackWeb = require('./slack-web-api');

module.exports = {
  pollTeamsForMessages: async function (accessToken) {
    console.log(`Polling Teams for messages at ...` + new Date())

    const teamsChannels = await channelMaps.getTeamsChannelsAsync()
    for (let teamsChannel of teamsChannels) {
      const slackChannelId = await channelMaps.getSlackChannelAsync(teamsChannel.teamId, teamsChannel.teamsChannelId)
      console.log("slackChannelId: " + util.inspect(slackChannelId))
      if (slackChannelId) {
        // Check last time we polled this channel
        const lastPolledTime = await channelMaps.getLastPolledTimeAsync(teamsChannel.teamId, teamsChannel.teamsChannelId)
        console.log("lastPolledTime: " + lastPolledTime)
        // If we haven't polled it before, then post a warning and start from now
        if (!lastPolledTime) {
          slackWeb.postMessageAsync("Can't find last time I checked Teams for messages - there may be missing messages", slackChannelId)
          await channelMaps.setLastPolledTimeAsync(teamsChannel.teamId, teamsChannel.teamsChannelId, new Date())
        } else {
          // Get the messages from this channel since last time we checked...
          const messages = await graph.getMessagesAfterAsync(accessToken, teamsChannel.teamId, teamsChannel.teamsChannelId, lastPolledTime);

          // And post them to Slack
          for (let message of messages) {
            console.log("message id: " + util.inspect(message.id))
            console.log("Message body: " + util.inspect(message.body))
            console.log("Message from: " + util.inspect(message.from.user))
            const slackMessage = `From Teams (${message.from.user.displayName}): ${message.body.content}`
            const slackMessageId = slackWeb.postMessageAsync(slackMessage, slackChannelId)
            await channelMaps.setSlackMessageIdAsync(slackMessageId, teamsChannel.teamId, teamsChannel.teamsChannelId, message.id)

            // Now deal with any replies
            const replies = await graph.getRepliesAfterAsync(accessToken, teamsChannel.teamId, teamsChannel.teamsChannelId, message.id, lastPolledTime);
            for (let reply of replies) {
              console.log("reply body: " + util.inspect(reply.body))
              console.log("reply to id:" + util.inspect(reply.replyToId))
              // Find the Slack message id for the original message
              const slackMessageId = channelMaps.getSlackMessageIdAsync(teamsChannel.teamId, teamsChannel.teamsChannelId, reply.replyToId)
              // Now post the reply to the slack message thread
            }
          }
          await channelMaps.setLastPolledTimeAsync(teamsChannel.teamId, teamsChannel.teamsChannelId, new Date())
        }
      } else {
        // Shouldn't happen
        console.log(`Error - cannot find mapped Slack channel for ${teamsChannel.teamId}/${teamsChannel.teamsChannelId}`)
      }
    }
  }
};





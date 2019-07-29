'use strict'
var util = require('util')
var graph = require('./graph.js');
var channelMaps = require('./channel-maps')

var slackWeb = require('./slack-web-api')

let alreadyPolling = false

module.exports = {
  pollTeamsForMessages: async function (accessToken) {
    // Keep a note of the datetime we started this poll
    const pollingDateTime = new Date()
    // If we end up with multiple invocations of this callback, we'll double-post
    // So keep a track and just return if an existing invocation is in flight.
    if (alreadyPolling) {
      console.log("Already polling, so exiting...")
      return
    }
    console.log(`Polling Teams for messages at ...` + pollingDateTime + ` alreadyPolling = ${alreadyPolling}`)
    alreadyPolling = true
    try {
      const teamsChannels = await channelMaps.getTeamsChannelsAsync()
      console.log("teamsChannels = " + util.inspect(teamsChannels))
      for (let teamsChannel of teamsChannels) {
        console.log(`Looking for Slack channel for ${teamsChannel.teamId}/${teamsChannel.teamsChannelId}`)
        const slackChannelId = await channelMaps.getSlackChannelAsync(teamsChannel.teamId, teamsChannel.teamsChannelId)
        console.log("slackChannelId: " + util.inspect(slackChannelId))
        if (slackChannelId) {
          console.log(`Looking for last time we polled ${teamsChannel.teamId}/${teamsChannel.teamsChannelId}`)
          // Check last time we polled this channel
          const lastPolledTime = await channelMaps.getLastPolledTimeAsync(teamsChannel.teamId, teamsChannel.teamsChannelId)
          // If we haven't polled it before, then post a warning and start from now
          if (!lastPolledTime) {
            console.log(`Can't find last time we polled ${teamsChannel.teamId}/${teamsChannel.teamsChannelId}`)
            slackWeb.postMessageAsync("Can't find last time I checked Teams for messages - there may be missing messages", slackChannelId)
            await channelMaps.setLastPolledTimeAsync(teamsChannel.teamId, teamsChannel.teamsChannelId, pollingDateTime)
          } else {
            console.log("lastPolledTime: " + lastPolledTime + " getting messages...")
            // Get the messages from this channel since last time we checked...
            const messages = await graph.getMessagesAfterAsync(accessToken, teamsChannel.teamId, teamsChannel.teamsChannelId, lastPolledTime);

            console.log("Found: " + messages.length + " so processing...")
            // And post them to Slack
            for (let message of messages) {
              console.log("message id: " + util.inspect(message.id))
              console.log("Message body: " + util.inspect(message.body))
              console.log("Message created time: " + message.createdDateTime)
              console.log("Message from: " + util.inspect(message.from.user))
              const slackMessage = `From Teams (${message.from.user.displayName}): ${message.body.content}`
              const slackMessageId = await slackWeb.postMessageAsync(slackMessage, slackChannelId)
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
            console.log("Setting last polled time to " + pollingDateTime)
            // All the stuff above might have taken a few seconds, so mark the time from when
            // we started.  That way any messages posted to Teams during our processing will
            // get caught next time around.
            await channelMaps.setLastPolledTimeAsync(teamsChannel.teamId, teamsChannel.teamsChannelId, pollingDateTime)
          }
        } else {
          // Shouldn't happen
          console.log(`Error - cannot find mapped Slack channel for ${teamsChannel.teamId}/${teamsChannel.teamsChannelId}`)
        }
      }
    } catch (error) {
      console.log(`Error polling for Teams messages: ${error}`)
    } finally {
      alreadyPolling = false
    }
  } 
};





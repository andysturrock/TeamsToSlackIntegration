'use strict'
var util = require('util')
var graph = require('./graph.js');
var channelMaps = require('./channel-maps')

var slackWeb = require('./slack-web-api')

let alreadyPolling = false

module.exports = {
  pollTeamsForMessages: async function (accessToken) {
    // If we end up with multiple invocations of this callback, we'll double-post
    // So keep a track and just return if an existing invocation is in flight.
    if (alreadyPolling) {
      console.log("Already polling, so exiting...")
      return
    }

    console.log("Polling Teams for messages...")
    alreadyPolling = true
    try {
      const teamsChannels = await channelMaps.getTeamsChannelsAsync()
      console.log("teamsChannels = " + util.inspect(teamsChannels))
      for (let teamsChannel of teamsChannels) {
        console.log(`Looking for Slack channel for ${teamsChannel.teamId}/${teamsChannel.teamsChannelId}`)
        const slackChannelId = await channelMaps.getSlackChannelAsync(teamsChannel.teamId, teamsChannel.teamsChannelId)
        console.log("slackChannelId: " + util.inspect(slackChannelId))
        if (slackChannelId) {
          console.log(`Looking for last time we got a message from ${teamsChannel.teamId}/${teamsChannel.teamsChannelId}`)
          // Check the time of the last message we saw from this channel
          let lastMessageTime = await channelMaps.getLastMessageTimeAsync(teamsChannel.teamId, teamsChannel.teamsChannelId)
          // If we haven't seen any before, then post a warning and start from now
          if (!lastMessageTime) {
            console.log(`Can't find a previous message from ${teamsChannel.teamId}/${teamsChannel.teamsChannelId}`)
            slackWeb.postMessageAsync("Can't find any previous messages from this Teams channel - please check Teams", slackChannelId)
            await channelMaps.setLastMessageTimeAsync(teamsChannel.teamId, teamsChannel.teamsChannelId, new Date())
          } else {
            console.log("lastMessageTime: " + lastMessageTime + " getting messages since then...")
            // Get the messages from this channel since the last one we saw...
            const messages = await graph.getMessagesAfterAsync(accessToken, teamsChannel.teamId, teamsChannel.teamsChannelId, lastMessageTime);

            console.log("Found: " + messages.length + " so processing...")
            // And post them to Slack
            for (let message of messages) {
              const messageCreatedDateTime = new Date(message.createdDateTime)
              console.log("message id: " + util.inspect(message.id))
              console.log("Message body: " + util.inspect(message.body))
              console.log("Message created time: " + messageCreatedDateTime)
              console.log("Message from: " + util.inspect(message.from.user))
              const slackMessage = `From Teams (${message.from.user.displayName}): ${message.body.content}`
              const slackMessageId = await slackWeb.postMessageAsync(slackMessage, slackChannelId)
              await channelMaps.setSlackMessageIdAsync(slackMessageId, teamsChannel.teamId, teamsChannel.teamsChannelId, message.id)

              // Keep track of the latest message we've seen
              console.log(`Comparing ${messageCreatedDateTime} with ${lastMessageTime}`)
              if(messageCreatedDateTime >= lastMessageTime) {
                console.log(`${messageCreatedDateTime} >= ${lastMessageTime}`)
                lastMessageTime = messageCreatedDateTime
                console.log(`So now lastMessageTime = ${lastMessageTime}`)
              } else {
                console.log(`${messageCreatedDateTime} < ${lastMessageTime} ???  WTF ???`)
                console.log(`lastMessageTime still = ${lastMessageTime}`)
              }

              // Now deal with any replies
              const replies = await graph.getRepliesAfterAsync(accessToken, teamsChannel.teamId, teamsChannel.teamsChannelId, message.id, lastMessageTime);
              for (let reply of replies) {
                console.log("reply body: " + util.inspect(reply.body))
                console.log("reply to id:" + util.inspect(reply.replyToId))
                // Find the Slack message id for the original message
                const slackMessageId = channelMaps.getSlackMessageIdAsync(teamsChannel.teamId, teamsChannel.teamsChannelId, reply.replyToId)
                // Now post the reply to the slack message thread
                console.log("TODO - deal with replies!!!")
              }
            }
            console.log("Setting last message time to " + lastMessageTime)
            await channelMaps.setLastMessageTimeAsync(teamsChannel.teamId, teamsChannel.teamsChannelId, lastMessageTime)
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





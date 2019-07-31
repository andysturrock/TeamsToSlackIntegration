'use strict'
var util = require('util')
var graph = require('./graph.js');
var channelMaps = require('./channel-maps')

var slackWeb = require('./slack-web-api')

let alreadyPolling = false

module.exports = {
  pollTeamsForMessagesAsync: async function (accessToken) {
    // If we end up with multiple invocations of this callback, we'll double-post
    // So keep a track and just return if an existing invocation is in flight.
    if (alreadyPolling) {
      return
    }

    console.log("Polling Teams for messages...")
    alreadyPolling = true
    try {
      const teamsChannels = await channelMaps.getTeamsChannelsAsync()
      console.log("teamsChannels = " + util.inspect(teamsChannels))
      for (let teamsChannel of teamsChannels) {
        const teamId = teamsChannel.teamId
        const teamsChannelId = teamsChannel.teamsChannelId;
        console.log(`Looking for Slack channel for ${teamId}/${teamsChannelId}`)
        const slackChannelId = await channelMaps.getSlackChannelAsync(teamId, teamsChannelId)
        console.log("slackChannelId: " + util.inspect(slackChannelId))
        if (slackChannelId) {
          // Check the time of the last message we saw from this channel
          let lastMessageTime = await channelMaps.getLastMessageTimeAsync(teamId, teamsChannelId)
          // If we haven't seen any before, then post a warning and start from now
          if (!lastMessageTime) {
            console.log(`Can't find a previous message from ${teamId}/${teamsChannelId}`)
            slackWeb.postMessageAsync("Can't find any previous messages from this Teams channel - please check Teams", slackChannelId)
            await channelMaps.setLastMessageTimeAsync(teamId, teamsChannelId, new Date())
          } else {
            console.log("lastMessageTime: " + lastMessageTime + " getting messages since then...")
            // Get the messages from this channel since the last one we saw...
            const messages = await graph.getMessagesAfterAsync(accessToken, teamId, teamsChannelId, lastMessageTime);

            console.log("Found: " + messages.length + " messages so processing...")
            // And post them to Slack
            for (let message of messages) {
              const messageCreatedDateTime = new Date(message.createdDateTime)

              // Put this in the set for use in reply processing later.
              await channelMaps.addMessageIdAsync(teamId, teamsChannelId, message.id)
              // Set the last reply time to the message created date.  We'll check for replies from that time.
              await channelMaps.setLastReplyTimeAsync(messageCreatedDateTime, teamId, teamsChannelId, message.id)

              console.log("message id: " + util.inspect(message.id))
              console.log("Message body: " + util.inspect(message.body))
              console.log("Message created time: " + messageCreatedDateTime)
              console.log("Message from: " + util.inspect(message.from.user))
              const slackMessage = `From Teams (${message.from.user.displayName}): ${message.body.content}`
              const slackMessageId = await slackWeb.postMessageAsync(slackMessage, slackChannelId)
              console.log(`slackMessageId = ${slackMessageId}`)
              await channelMaps.setSlackMessageIdAsync(slackMessageId, teamId, teamsChannelId, message.id)

              // Keep track of the latest message we've seen             
              if (messageCreatedDateTime > lastMessageTime) {
                lastMessageTime = messageCreatedDateTime
              }
            }
            console.log("Setting last message time to " + lastMessageTime)
            await channelMaps.setLastMessageTimeAsync(teamId, teamsChannelId, lastMessageTime)
          }

          // Now get all the replies.  Because of the crappy Teams/Graph API, we'll need to check every single
          // message individually to see whether it's got a reply we haven't seen yet.
          await pollTeamsForRepliesAsync(accessToken, teamId, teamsChannelId, slackChannelId)
        } else {
          // Shouldn't happen.  We should 
          console.log(`Error - cannot find mapped Slack channel for ${teamId}/${teamsChannelId}`)
        }
      }
    } catch (error) {
      console.log(`Error polling for Teams messages: ${error}\n${error.stack}`)
    } finally {
      alreadyPolling = false
    }
  },
};

async function pollTeamsForRepliesAsync(accessToken, teamId, teamsChannelId, slackChannelId) {
  console.log("Polling Teams for messages...")
  const allMessageIds = await channelMaps.getAllMessageIdsAsync(teamId, teamsChannelId)
  for (let messageId of allMessageIds) {
    console.log("Checking message " + messageId)
    let lastReplyTime = await channelMaps.getLastReplyTimeAsync(teamId, teamsChannelId, messageId)
    const replies = await graph.getRepliesAfterAsync(accessToken, teamId, teamsChannelId, messageId, lastReplyTime)
    console.log("Found: " + replies.length + " replies so processing...")
    for (let reply of replies) {
      console.log("reply body: " + util.inspect(reply.body))
      console.log("reply to id:" + util.inspect(reply.replyToId))
      console.log("reply created time: " + reply.createdDateTime)
      console.log("reply from: " + util.inspect(reply.from.user))

      const replyCreatedDateTime = new Date(reply.createdDateTime)
      // Find the Slack message id for the original message
      const slackMessageId = await channelMaps.getSlackMessageIdAsync(teamId, teamsChannelId, reply.replyToId)
      console.log(`slackMessageId for reply = ${slackMessageId}`)
      const slackReply = `From Teams (${reply.from.user.displayName}): ${reply.body.content}`
      // Now post the reply to the slack message thread
      // Don't care about the Slack Message ID of this post as we just post back to the 
      // parent each time.  In fact the API reference https://api.slack.com/methods/chat.postMessage
      // explicitly says "Avoid using a reply's ts value; use its parent instead."
      await slackWeb.postMessageAsync(slackReply, slackChannelId, slackMessageId)

      // Keep track of the latest message we've seen             
      if (replyCreatedDateTime > lastReplyTime) {
        lastReplyTime = replyCreatedDateTime
      }
    }
    console.log("Setting last reply time to " + lastReplyTime)
    await channelMaps.setLastReplyTimeAsync(teamId, teamsChannelId, messageId, lastReplyTime)
  }
}



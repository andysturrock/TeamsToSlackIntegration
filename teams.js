'use strict'
const util = require('util')
const logger = require('pino')()

const graph = require('./graph.js');
const channelMaps = require('./channel-maps')
const slackWeb = require('./slack-web-api')

let alreadyPolling = false

module.exports = {
  pollTeamsForMessagesAsync: async function (accessToken) {
    // If we end up with multiple invocations of this callback, we'll double-post
    // So keep a track and just return if an existing invocation is in flight.
    if (alreadyPolling) {
      return
    }

    logger.info("Polling Teams for messages...")
    alreadyPolling = true
    try {
      const teamsChannels = await channelMaps.getTeamsChannelsAsync()
      logger.debug("teamsChannels = " + util.inspect(teamsChannels))
      for (let teamsChannel of teamsChannels) {
        const teamId = teamsChannel.teamId
        const teamsChannelId = teamsChannel.teamsChannelId;
        logger.debug(`Looking for Slack channel for ${teamId}/${teamsChannelId}`)
        const slackChannelId = await channelMaps.getSlackChannelAsync(teamId, teamsChannelId)
        logger.debug("slackChannelId: " + util.inspect(slackChannelId))
        if (slackChannelId) {
          // Check the time of the last message we saw from this channel
          let lastMessageTime = await channelMaps.getLastMessageTimeAsync(teamId, teamsChannelId)
          // If we haven't seen any before, then post a warning and start from now
          if (!lastMessageTime) {
            logger.info(`Can't find a previous message from ${teamId}/${teamsChannelId}`)
            slackWeb.postMessageAsync("Can't find any previous messages from this Teams channel - please check Teams", slackChannelId)
            await channelMaps.setLastMessageTimeAsync(teamId, teamsChannelId, new Date())
          } else {
            logger.debug("lastMessageTime: " + lastMessageTime + " getting messages since then...")
            // Get the messages from this channel since the last one we saw...
            const messages = await graph.getMessagesAfterAsync(accessToken, teamId, teamsChannelId, lastMessageTime);

            logger.debug("Found: " + messages.length + " messages so processing...")
            // And post them to Slack
            for (let message of messages) {
              const messageCreatedDateTime = new Date(message.createdDateTime)

              // Put this in the set for use in reply processing later.
              await channelMaps.addMessageIdAsync(teamId, teamsChannelId, message.id)
              // Set the last reply time to the message created date.  We'll check for replies from that time.
              await channelMaps.setLastReplyTimeAsync(teamId, teamsChannelId, message.id, messageCreatedDateTime)

              logger.debug("message id: " + util.inspect(message.id))
              logger.debug("Message body: " + util.inspect(message.body))
              logger.debug("Message created time: " + messageCreatedDateTime)
              logger.debug("Message from: " + util.inspect(message.from.user))
              const slackMessage = `From Teams (${message.from.user.displayName}): ${message.body.content}`
              const slackMessageId = await slackWeb.postMessageAsync(slackMessage, slackChannelId)
              logger.debug(`slackMessageId = ${slackMessageId}`)
              await channelMaps.setSlackMessageIdAsync(teamId, teamsChannelId, message.id, slackMessageId)

              // Keep track of the latest message we've seen             
              if (messageCreatedDateTime > lastMessageTime) {
                lastMessageTime = messageCreatedDateTime
              }
            }
            logger.debug("Setting last message time to " + lastMessageTime)
            await channelMaps.setLastMessageTimeAsync(teamId, teamsChannelId, lastMessageTime)
          }

          // Now get all the replies.  Because of the crappy Teams/Graph API, we'll need to check every single
          // message individually to see whether it's got a reply we haven't seen yet.
          await pollTeamsForRepliesAsync(accessToken, teamId, teamsChannelId, slackChannelId)
        } else {
          // Shouldn't happen.  We should 
          logger.error(`Error - cannot find mapped Slack channel for ${teamId}/${teamsChannelId}`)
        }
      }
    } catch (error) {
      logger.error(`Error polling for Teams messages: ${error}\n${error.stack}`)
    } finally {
      alreadyPolling = false
    }
  },
};

async function pollTeamsForRepliesAsync(accessToken, teamId, teamsChannelId, slackChannelId) {
  logger.info("Polling Teams for replies...")
  const allMessageIds = await channelMaps.getAllMessageIdsAsync(teamId, teamsChannelId)
  logger.debug("allMessageIds = " + util.inspect(allMessageIds))
  for (let messageId of allMessageIds) {
    logger.debug("Checking message " + messageId)
    let lastReplyTime = await channelMaps.getLastReplyTimeAsync(teamId, teamsChannelId, messageId)
    const replies = await graph.getRepliesAfterAsync(accessToken, teamId, teamsChannelId, messageId, lastReplyTime)
    logger.debug("Found: " + replies.length + " replies so processing...")
    for (let reply of replies) {
      logger.debug("reply body: " + util.inspect(reply.body))
      logger.debug("reply to id:" + util.inspect(reply.replyToId))
      logger.debug("reply created time: " + reply.createdDateTime)
      logger.debug("reply from: " + util.inspect(reply.from.user))

      const replyCreatedDateTime = new Date(reply.createdDateTime)
      // Find the Slack message id for the original message
      const slackMessageId = await channelMaps.getSlackMessageIdAsync(teamId, teamsChannelId, reply.replyToId)
      logger.debug(`slackMessageId for reply = ${slackMessageId}`)
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
    logger.debug("Setting last reply time to " + lastReplyTime)
    await channelMaps.setLastReplyTimeAsync(teamId, teamsChannelId, messageId, lastReplyTime)
  }
}



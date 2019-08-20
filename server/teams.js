'use strict'
const util = require('util')
const logger = require('pino')()
const https = require('https');

const graph = require('./graph.js');
const channelMaps = require('./channel-maps')
const slackWeb = require('./slack-web-api')
const oauth2 = require('./oauth/oauth')
const tokens = require('./oauth/tokens')

// Keep track of whether we are in the middle of polling for this
// team and channel.  The function is re-entrant but it makes it
// a lot more complicated if we're running it concurrently for the
// same team and channel.
const alreadyPollingForTeamAndChannel = new Map();

module.exports = {
  pollTeamsForMessagesAsync: async function (channelMapping) {
    const teamId = channelMapping.team.id
    const teamsChannelId = channelMapping.teamsChannel.id
    const teamName = channelMapping.team.name
    const teamsChannelName = channelMapping.teamsChannel.name
    try {
      const alreadyPolling = alreadyPollingForTeamAndChannel.get(`teamId/teamsChannelId`)
      if (alreadyPolling) {
        logger.debug(`Already polling for ${teamName}/${teamsChannelName} so returning`)
        return
      }
      alreadyPollingForTeamAndChannel.set(`teamId/teamsChannelId`, true)
      logger.info(`Polling for messages in ${teamName}/${teamsChannelName}...`)

      logger.debug(`Looking for Slack channel for ${teamId}/${teamsChannelId}`)
      const slackChannelId = channelMapping.slackChannel.id;

      // Refresh the token if it needs it
      const oauthToken = oauth2.accessToken.create(channelMapping.mappingOwner.token);
      const accessToken = await tokens.getRefreshedTokenAsync(oauthToken);
      // Save it back to the DB if it was actually refreshed
      if (accessToken != channelMapping.mappingOwner.token.access_token) {
        channelMapping.mappingOwner.token.access_token = accessToken
        await channelMaps.saveMapAsync(channelMapping)
      }

      // Check the time of the last message we saw from this channel
      let lastMessageTime = await channelMaps.getLastMessageTimeAsync(teamId, teamsChannelId)
      // If we haven't seen any before, then post a warning and start from now
      if (!lastMessageTime) {
        logger.info(`Can't find a previous message from ${teamId}/${teamsChannelId}`)
        slackWeb.postMessageAsync("Can't find any previous messages from this Teams channel - please check Teams", slackChannelId)
        await channelMaps.setLastMessageTimeAsync(teamId, teamsChannelId, new Date())
      } else {
        logger.info("lastMessageTime: " + lastMessageTime + " getting messages since then...")
        // Get the messages from this channel since the last one we saw...
        const messages = await graph.getMessagesAfterAsync(accessToken, teamId, teamsChannelId, lastMessageTime);

        logger.error("Found: " + messages.length + " messages so processing...")
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
          logger.error("Message.from: " + util.inspect(message.from))
          logger.error("Message:" + util.inspect(message))
          if (message.from.application) {
            logger.error("Saw a message from an application - " + message.from.application.displayName)
          } else {
            const slackMessage = `From Teams (${message.from.user.displayName}): ${message.body.content}`
            const slackMessageId = await slackWeb.postMessageAsync(slackMessage, slackChannelId)
            logger.debug(`slackMessageId = ${slackMessageId}`)
            await channelMaps.setSlackMessageIdAsync(teamId, teamsChannelId, message.id, slackMessageId)
          }

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
      await pollTeamsForRepliesAsync(accessToken, channelMapping)

    } catch (error) {
      logger.error("Error polling for Teams messages:" + util.inspect(error))
    } finally {
      logger.info(`Done polling for messages in ${teamName}/${teamsChannelName}.`)
      alreadyPollingForTeamAndChannel.set(`teamId/teamsChannelId`, false)
    }
  },

  postBotReplyAsync: async function (token, teamsChannelId, replyToId, message) {
    _postBotMessage(token, teamsChannelId, replyToId, message)
  },
  postBotMessageAsync: async function (token, teamsChannelId, message) {
    _postBotMessage(token, teamsChannelId, null, message)
  }
}

async function _postBotMessage(token, teamsChannelId, replyToId, message) {
  return new Promise((resolve, reject) => {

    const data = JSON.stringify({
      "type": "message",
      "text": message
    })

    const path = replyToId ?
      `/uk/v3/conversations/${teamsChannelId};messageid=${replyToId}/activities/` :
      `/uk/v3/conversations/${teamsChannelId}/activities/`
    const options = {
      hostname: 'smba.trafficmanager.net',
      method: 'POST',
      path: path,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }
    var req = https.request(options, (res) => {
      res.on('data', (data) => {
        const response = JSON.parse(new String(data))
        if (response.error) {
          logger.error("Error posting bot reply: " + util.inspect(response.error))
          reject(response)
        }
        logger.error("Bot reply: " + util.inspect(response))
        resolve(response)
      })
    })

    req.on('error', (error) => {
      logger.error("Error posting bot reply: " + util.inspect(error))
      reject(error)
    })
    req.write(data);
    req.end();
  })
}

async function pollTeamsForRepliesAsync(accessToken, channelMapping) {

  const teamId = channelMapping.team.id
  const teamsChannelId = channelMapping.teamsChannel.id
  const teamName = channelMapping.team.name
  const teamsChannelName = channelMapping.teamsChannel.name
  const slackChannelId = channelMapping.slackChannel.id

  logger.info(`Polling Teams for replies in ${teamName}/${teamsChannelName}...`)
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

      if (reply.from.application) {
        logger.error("Saw a reply from an application - " + reply.from.application.displayName)
      } else {
        // Find the Slack message id for the original message
        const slackMessageId = await channelMaps.getSlackMessageIdAsync(teamId, teamsChannelId, reply.replyToId)
        logger.debug(`slackMessageId for reply = ${slackMessageId}`)
        const slackReply = `From Teams (${reply.from.user.displayName}): ${reply.body.content}`
        // Now post the reply to the slack message thread
        // Don't care about the Slack Message ID of this post as we just post back to the 
        // parent each time.  In fact the API reference https://api.slack.com/methods/chat.postMessage
        // explicitly says "Avoid using a reply's ts value; use its parent instead."
        await slackWeb.postMessageAsync(slackReply, slackChannelId, slackMessageId)
      }

      // Keep track of the latest message we've seen             
      if (replyCreatedDateTime > lastReplyTime) {
        lastReplyTime = replyCreatedDateTime
      }
    }
    logger.debug("Setting last reply time to " + lastReplyTime)
    await channelMaps.setLastReplyTimeAsync(teamId, teamsChannelId, messageId, lastReplyTime)
  }
  logger.info(`Done polling for replies in ${teamName}/${teamsChannelName}.`)
}



'use strict'
const util = require('util')

const logger = require('pino')()

const oauth2 = require('./oauth/oauth')
const tokens = require('./oauth/tokens')
const channelMaps = require('./channel-maps')
const slackWeb = require('./slack-web-api')
const graph = require('./graph.js');

class TeamsToSlackMapping {

    constructor(channelMapping) {
        this._channelMapping = channelMapping
        this._alreadyPolling = false
    }

    async initAsync() {
        // setInterval(this.pollTeamsForMessagesAsync.bind(this), 5000);
        // TODO get Teams channel URL and use in message below.
        const message = `Posting messages from Teams ${this._channelMapping.team.name}/${this._channelMapping.teamsChannel.name}`
        await slackWeb.postMessageAsync(message, this._channelMapping.slackChannel.id)
        await this.pollTeamsForMessagesAsync()
    }

    async pollTeamsForMessagesAsync() {
        const teamId = this._channelMapping.team.id
        const teamsChannelId = this._channelMapping.teamsChannel.id
        const teamName = this._channelMapping.team.name
        const teamsChannelName = this._channelMapping.teamsChannel.name
        try {
            if (this._alreadyPolling) {
                logger.debug(`Already polling for ${teamName}/${teamsChannelName} so returning`)
                return
            }
            this._alreadyPolling = true
            logger.info(`Polling for messages in ${teamName}/${teamsChannelName}...`)

            const slackChannelId = this._channelMapping.slackChannel.id;

            // Refresh the token if it needs it
            const oauthToken = oauth2.accessToken.create(this._channelMapping.mappingOwner.token);
            const accessToken = await tokens.getRefreshedTokenAsync(oauthToken);
            // Save it back to the DB if it was actually refreshed
            if (accessToken != this._channelMapping.mappingOwner.token.access_token) {
                this._channelMapping.mappingOwner.token.access_token = accessToken
                await channelMaps.saveMapAsync(this._channelMapping)
            }

            // Check the time of the last message we saw from this channel
            let lastMessageTime = await channelMaps.getLastMessageTimeAsync(teamId, teamsChannelId)
            // If we haven't seen any before, then post a warning and start from now
            if (!lastMessageTime) {
                logger.info(`Can't find a previous message from ${teamId}/${teamsChannelId}`)
                const slackMessage = `Can't find any previous messages from Teams ${teamId}/${teamsChannelId} - please check Teams`
                await slackWeb.postMessageAsync(slackMessage, slackChannelId)
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
                    await channelMaps.addTeamsMessageIdAsync(teamId, teamsChannelId, message.id)
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
                        const webUrl = `<${message.webUrl}|Teams>`
                        const slackMessage = `${message.from.user.displayName} from ${webUrl}: ${message.body.content}`
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
            await this.pollTeamsForRepliesAsync()

        } catch (error) {
            logger.error("Error polling for Teams messages:" + util.inspect(error))
        } finally {
            logger.info(`Done polling for messages in ${teamName}/${teamsChannelName}.`)
            this._alreadyPolling = false
        }
    }

    async pollTeamsForRepliesAsync() {

        const teamId = this._channelMapping.team.id
        const teamsChannelId = this._channelMapping.teamsChannel.id
        const teamName = this._channelMapping.team.name
        const teamsChannelName = this._channelMapping.teamsChannel.name
        const slackChannelId = this._channelMapping.slackChannel.id
        const accessToken = this._channelMapping.mappingOwner.token.access_token
      
        logger.info(`Polling Teams for replies in ${teamName}/${teamsChannelName}...`)
        const allMessageIds = await channelMaps.getAllTeamsMessageIdsAsync(teamId, teamsChannelId)
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
}

module.exports = TeamsToSlackMapping
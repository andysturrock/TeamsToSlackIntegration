'use strict'
const util = require('util')

const logger = require('pino')()

const oauth2 = require('./oauth/oauth')
const tokens = require('./oauth/tokens')
const channelMaps = require('./channel-maps')
const slackWeb = require('./slack-web-api')
const graph = require('./graph');

const _instances = new Map()
const _poll = async () => {
    for (let teamsToSlackMapping of _instances.values()) {
        await teamsToSlackMapping._pollTeamsForMessagesAsync()
    }
}
setInterval(_poll, 5000);

class TeamsToSlackMapping {

    constructor(channelMapping) {
        this._channelMapping = channelMapping
        this._alreadyPolling = false
        _instances.set(TeamsToSlackMapping._getInstanceKey(channelMapping), this)
    }

    static getMapping(channelMapping) {
        return _instances.get(TeamsToSlackMapping._getInstanceKey(channelMapping))
    }

    // Just use the team/channel + workspace/channel for keys in the instance
    // map, as the tokens, particularly the teams token, may get updated.
    static _getInstanceKey(channelMapping) {
        return channelMapping.team.id + channelMapping.teamsChannel.id +
            channelMapping.workspace.id + channelMapping.slackChannel.id
    }

    async initAsync() {
        const botToken = await tokens.getBotTokenAsync()
        // TODO get Slack channel URL and use in message below.
        const message = `Message from this channel will be sent to ${this._channelMapping.workspace.name}/${this._channelMapping.slackChannel.name} in Slack`
        await graph.postBotMessageAsync(botToken.access_token, this._channelMapping.teamsChannel.id, message)
    }

    async destroy() {
        const botToken = await tokens.getBotTokenAsync()
        const message = `No longer sending messages from this channel to ${this._channelMapping.workspace.name}/${this._channelMapping.slackChannel.name} in Slack`
        await graph.postBotMessageAsync(botToken.access_token, this._channelMapping.teamsChannel.id, message)
        _instances.delete(TeamsToSlackMapping._getInstanceKey(this._channelMapping))
    }

    async _pollTeamsForMessagesAsync() {
        const teamId = this._channelMapping.team.id
        const teamsChannelId = this._channelMapping.teamsChannel.id
        const teamName = this._channelMapping.team.name
        const teamsChannelName = this._channelMapping.teamsChannel.name
        const slackToken = this._channelMapping.slackBotToken
        const workspaceId = this._channelMapping.workspace.id
        const slackChannelId = this._channelMapping.slackChannel.id

        if (this._alreadyPolling) {
            logger.debug(`Already polling for ${teamName}/${teamsChannelName} so returning`)
            return
        }

        try {
            this._alreadyPolling = true
            logger.info(`Polling for messages in ${teamName}/${teamsChannelName}...`)

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
                await channelMaps.setLastMessageTimeAsync(teamId, teamsChannelId, new Date())
            } else {
                logger.info("lastMessageTime: " + lastMessageTime + " getting messages since then...")
                // Get the messages from this channel since the last one we saw...
                const messages = await graph.getMessagesAfterAsync(accessToken, teamId, teamsChannelId, lastMessageTime);

                logger.debug("Found: " + messages.length + " messages so processing...")
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
                    logger.debug("Message.from: " + util.inspect(message.from))
                    if (message.from.application) {
                        logger.info(`Message is from an application (${message.from.application.displayName}) so ignoring.`)
                    } else {
                        const webUrl = `<${message.webUrl}|Teams>`
                        const slackMessage = `${message.from.user.displayName} from ${webUrl}: ${message.body.content}`
                        const slackResponse = await slackWeb.postMessageAsync(slackToken, slackMessage, slackChannelId)
                        await channelMaps.setSlackMessageIdAsync(teamId, teamsChannelId, message.id, slackResponse.ts)
                        await channelMaps.setTeamsMessageIdAsync(workspaceId, slackChannelId, slackResponse.ts, message.id)
                    }

                    // Keep track of the latest message we've seen             
                    if (messageCreatedDateTime > lastMessageTime) {
                        lastMessageTime = messageCreatedDateTime
                    }
                }
                await channelMaps.setLastMessageTimeAsync(teamId, teamsChannelId, lastMessageTime)
            }

            // Now get all the replies.  Because of the crappy Teams/Graph API, we'll need to check every single
            // message individually to see whether it's got a reply we haven't seen yet.
            await this._pollTeamsForRepliesAsync()

        } catch (error) {
            logger.error("Error polling for Teams messages:" + util.inspect(error))
        } finally {
            logger.info(`Done polling for messages in ${teamName}/${teamsChannelName}.\n\n\n\n`)
            this._alreadyPolling = false
        }
    }

    async _pollTeamsForRepliesAsync() {
        const teamId = this._channelMapping.team.id
        const teamsChannelId = this._channelMapping.teamsChannel.id
        const teamName = this._channelMapping.team.name
        const teamsChannelName = this._channelMapping.teamsChannel.name
        const slackChannelId = this._channelMapping.slackChannel.id
        const accessToken = this._channelMapping.mappingOwner.token.access_token
        const slackToken = this._channelMapping.slackBotToken

        try {
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
                    logger.debug("reply: " + util.inspect(reply))

                    const replyCreatedDateTime = new Date(reply.createdDateTime)

                    // Don't post replies from bots
                    if (reply.from.application) {
                        logger.debug("Saw a reply from an application - " + reply.from.application.displayName)
                    } else {
                        // Find the Slack message id for the original message
                        const slackMessageId = await channelMaps.getSlackMessageIdAsync(teamId, teamsChannelId, reply.replyToId)
                        const webUrl = `<${reply.webUrl}|Teams>`
                        const slackReply = `${reply.from.user.displayName} from ${webUrl}: ${reply.body.content}`
                        // Now post the reply to the slack message thread
                        // Don't care about the Slack Message ID of this post as we just post back to the 
                        // parent each time.  In fact the API reference https://api.slack.com/methods/chat.postMessage
                        // explicitly says "Avoid using a reply's ts value; use its parent instead."
                        await slackWeb.postReplyAsync(slackToken, slackReply, slackChannelId, slackMessageId)
                    }

                    // Keep track of the latest message we've seen             
                    if (replyCreatedDateTime > lastReplyTime) {
                        lastReplyTime = replyCreatedDateTime
                    }
                }
                logger.debug("Setting last reply time to " + lastReplyTime)
                await channelMaps.setLastReplyTimeAsync(teamId, teamsChannelId, messageId, lastReplyTime)
            }
        } catch (error) {
            logger.error("Error polling for Teams replies:" + error.stack)
        } finally {
            logger.info(`Done polling for replies in ${teamName}/${teamsChannelName}.`)
        }
    }
}

module.exports = TeamsToSlackMapping
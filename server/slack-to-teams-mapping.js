'use strict'

const util = require('util')
const logger = require('pino')()
const { RTMClient } = require('@slack/rtm-api');
const { WebClient } = require('@slack/web-api');
const oauth2 = require('./oauth/oauth')
const tokens = require('./oauth/tokens')
const graph = require('./graph')
const channelMaps = require('./channel-maps')


const _instances = new Map()

class SlackToTeamsMapping {

    constructor(channelMapping) {
        this._channelMapping = channelMapping
        this._userId2Details = new Map()
        _instances.set(SlackToTeamsMapping._getInstanceKey(channelMapping), this)
    }

    static getMapping(channelMapping) {
        return _instances.get(SlackToTeamsMapping._getInstanceKey(channelMapping))
    }

    // Just use the team/channel + workspace/channel for keys in the instance
    // map, as the tokens, particularly the teams token, may get updated.
    static _getInstanceKey(channelMapping) {
        return channelMapping.team.id + channelMapping.teamsChannel.id +
            channelMapping.workspace.id + channelMapping.slackChannel.id
    }

    async initAsync() {
        this._rtmclient = new RTMClient(this._channelMapping.slackBotToken);
        const res = await this._rtmclient.start()
        this._myRtmId = res.self.id

        this._rtmclient.on('ready', this._OnReadyAsync.bind(this))
        this._rtmclient.on('message', (event) => this._onMessageAsync(event))
        this._rtmclient.on('disconnecting', (event) => this._onDisconnectingAsync(event))

        this._webClient = new WebClient(this._channelMapping.slackBotToken);
        const webId = await this._webClient.auth.test()
        this._myWebId = webId.user_id

        const botToken = await tokens.getBotTokenAsync()
        this._teamsBotAccessToken = botToken.access_token
    }

    async destroy() {
        const teams = this._channelMapping.team.name + "/" + this._channelMapping.teamsChannel.name
        const message = `No longer sending messages from this channel to ${teams} in Teams`
        await this._rtmclient.sendMessage(message, this._channelMapping.slackChannel.id);
        await this._disconnectAsync()
        _instances.delete(SlackToTeamsMapping._getInstanceKey(this._channelMapping))
    }

    async _disconnectAsync() {
        await this._rtmclient.disconnect()
    }

    async _OnReadyAsync() {
        try {
            const teams = this._channelMapping.team.name + "/" + this._channelMapping.teamsChannel.name
            const message = `Messages from this channel will be sent to ${teams} in Teams`
            // await this._rtmclient.sendMessage(message, this._channelMapping.slackChannel.id);
            await this._webClient.chat.postMessage(
                { text: message, channel: this._channelMapping.slackChannel.id })
        }
        catch (error) {
            logger.error("Error in Slack RTM API: " + error.stack)
        }
    }

    async _onMessageAsync(event) {
        logger.debug('_onMessageAsync for ' + this._channelMapping.slackChannel.name + " : " + util.inspect(event));
        if (event.hidden) {
            return
        }

        // We create a SlackToTeamsMapping instance per mapping, but bots can be in multiple channels.
        // So each SlackToTeamsMapping instance will get all messages for the associated bot.
        // So ignore messages we get which are not for the channel we are monitoring.
        // TODO - optimise this - create a router for each bot which then sends messages
        // to the right SlackToTeamsMapping object.
        if (event.channel != this._channelMapping.slackChannel.id) {
            return
        }

        // Don't post bot messages to Teams.  Some of them will be from us anyway.
        if (event.subtype == 'bot_message') {
            logger.debug('A bot sent:' + util.inspect(event))
        } else {
            const workspaceId = this._channelMapping.workspace.id
            const slackChannelId = this._channelMapping.slackChannel.id
            const permaLink = await this._webClient.chat.getPermalink({ channel: event.channel, message_ts: event.ts })
            const userDetails = await this.getUserDetails(event.user)
            const userName = userDetails.user.real_name
            const message = `<a href="${permaLink.permalink}">${userName} from Slack</a><p>${event.text}</p>`

            if (event.thread_ts) {
                // It's a reply
                const teamsMessageId = await channelMaps.getTeamsMessageIdAsync(workspaceId, slackChannelId, event.thread_ts)
                if (teamsMessageId) {
                    await graph.postBotReplyAsync(this._teamsBotAccessToken, this._channelMapping.teamsChannel.id,
                        teamsMessageId, message)
                } else {
                    logger.warn(`Could not find Teams message id for Slack message ${permaLink.permalink}`)
                }
            } else {
                // It's the first message (might turn into a thread later)
                await graph.postBotMessageAsync(this._teamsBotAccessToken, this._channelMapping.teamsChannel.id,
                    message)
                // Because the method above doesn't return us the message id, we can't store the mapping of
                // Slack message to Teams message.  So instead poll Teams for the last few messages
                // and find the one we just posted.
                // Refresh the token if it needs it
                const oauthToken = oauth2.accessToken.create(this._channelMapping.mappingOwner.token);
                const accessToken = await tokens.getRefreshedTokenAsync(oauthToken);
                const teamId = this._channelMapping.team.id
                const teamsChannelId = this._channelMapping.teamsChannel.id
                // Last 25 messages should be OK as we have just posted and people don't type that quickly
                const teamsMessages = await graph.getLastXMessagesAsync(accessToken, teamId, teamsChannelId, 25)
                let teamsMessageId = null
                for (let teamsMessage of teamsMessages) {
                    const content = teamsMessage.body.content
                    if (content.includes(permaLink.permalink)) {
                        teamsMessageId = teamsMessage.id
                        break
                    }
                }
                if (teamsMessageId) {
                    const slackMessageId = event.ts
                    await channelMaps.setTeamsMessageIdAsync(workspaceId, slackChannelId, slackMessageId, teamsMessageId)
                    await channelMaps.setSlackMessageIdAsync(teamId, teamsChannelId, teamsMessageId, slackMessageId)
                } else {
                    logger.warn(`Could not find Teams message id for Slack message ${permaLink.permalink}`)
                }
            }
        }
    }

    async _onDisconnectingAsync(event) {
        const teams = this._channelMapping.team.name + "/" + this._channelMapping.teamsChannel.name
        const message = `Bot disconnecting.  Messages from this channel will NOT be sent to ${teams} in Teams`
        const res = await this._rtmclient.sendMessage(message, this._channelMapping.slackChannel.id);
    }

    async getUserDetails(userId) {
        let userDetails = this._userId2Details.get(userId)
        if (!userDetails) {
            userDetails = await this._webClient.users.info({ user: userId })
            this._userId2Details.set(userId, userDetails)
        }
        return userDetails
    }
}

module.exports = SlackToTeamsMapping

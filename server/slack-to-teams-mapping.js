'use strict'

const util = require('util')
const logger = require('pino')()
const { RTMClient } = require('@slack/rtm-api');
const { WebClient } = require('@slack/web-api');
const tokens = require('./oauth/tokens')
const teams = require('./teams')
const slackWeb = require('./slack-web-api')

const _instances = new Map()

class SlackToTeamsMapping {

    constructor(channelMapping) {
        this._channelMapping = channelMapping
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
            await this._rtmclient.sendMessage(message, this._channelMapping.slackChannel.id);
        }
        catch (error) {
            logger.error("Error in Slack RTM API: " + error.stack)
        }
    }

    async _onMessageAsync(event) {
        logger.info('_onMessageAsync for ' + this._channelMapping.slackChannel.name + " : " + util.inspect(event));
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

        // Don't port bot messages to Teams.  Some of them will be from us anyway.
        if (event.subtype == 'bot_message') {
            logger.info('A bot sent:' + util.inspect(event))
        } else {
            logger.info('A user sent:' + util.inspect(event))
            logger.info(`_onMessageAsync ${event.user} sent this:` + event.text)

            if (event.thread_ts) {
                logger.info("this is a reply - can't do those yet coz of stupid Teams API")
                // await teams.postBotReplyAsync(this._teamsBotAccessToken, this._channelMapping.teamsChannel.id,
                //     messageId, "reply using teams function")
            } else {
                const permaLink = await this._webClient.chat.getPermalink({ channel: event.channel, message_ts: event.ts })
                const message = `<a href="${permaLink.permalink}">Andy from Slack</a><p>${event.text}</p>`
                await teams.postBotMessageAsync(this._teamsBotAccessToken, this._channelMapping.teamsChannel.id,
                    message)
            }
        }
    }

    async _onDisconnectingAsync(event) {
        logger.info('_onDisconnectingAsync: ' + util.inspect(event));
        const message = `Bot disconnecting.  Messages from this channel will NOT be sent to ${teams} in Teams`
        const res = await this._rtmclient.sendMessage(message, this._channelMapping.slackChannel.id);
    }
}

module.exports = SlackToTeamsMapping

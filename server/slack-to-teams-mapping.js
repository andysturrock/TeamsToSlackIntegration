'use strict'

const util = require('util')
const logger = require('pino')()
const { RTMClient } = require('@slack/rtm-api');
const { WebClient } = require('@slack/web-api');
const tokens = require('./oauth/tokens')
const teams = require('./teams')

class SlackToTeamsMapping {

    constructor(channelMapping) {
        this._channelMapping = channelMapping
    }

    async initAsync() {
        this._rtmclient = new RTMClient(this._channelMapping.slackBotToken);
        const res = await this._rtmclient.start()
        this._myId = res.self.id

        this._rtmclient.on('ready', this._readyAsync.bind(this))
        this._rtmclient.on('message', (event) => this._messageAsync(event))
        this._rtmclient.on('disconnecting', (event) => this._disconnectingAsync(event))

        this._webClient = new WebClient(this._channelMapping.slackBotToken);

        const botToken = await tokens.getBotTokenAsync()
        this._teamsBotAccessToken = botToken.access_token
    }

    async disconnectAsync() {
        await this._rtmclient.disconnect()
    }

    async _readyAsync() {
        try {
            const teams = this._channelMapping.team.name + "/" + this._channelMapping.teamsChannel.name
            const message = `Messages from this channel will be sent to ${teams} in Teams`
            // const res = await this._rtm.sendMessage(message, this._channelMapping.slackChannel.id);
        }
        catch (error) {
            logger.error("Error in Slack RTM API: " + error.stack)
        }
    }

    async _messageAsync(event) {
        logger.info('messageAsync for ' + this._channelMapping.slackChannel.name + " : " + util.inspect(event));
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
        // If we sent this message, then don't send it back to Teams - we'll go
        // back and forth forever!
        logger.info("My id is " + util.inspect(this._myId))
        if (event.user == this._myId) {
            logger.info('messageAsync I sent this:' + event.text);
        } else {
            logger.info(`messageAsync ${event.user} sent this:` + event.text);

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

    async _disconnectingAsync(event) {
        logger.info('disconnectingAsync: ' + util.inspect(event));
        const message = `Bot disconnecting.  Messages from this channel will NOT be sent to ${teams} in Teams`
        const res = await this._rtmclient.sendMessage(message, this._channelMapping.slackChannel.id);
    }
}



module.exports = SlackToTeamsMapping

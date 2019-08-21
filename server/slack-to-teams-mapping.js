'use strict'

const util = require('util')
const logger = require('pino')()

const { RTMClient } = require('@slack/rtm-api');

class SlackToTeamsMapping {

    constructor(channelMapping) {
        this._channelMapping = channelMapping
    }

    async initAsync() {
        this._rtm = new RTMClient(this._channelMapping.slackBotToken);
        await this._rtm.start()

        this._rtm.on('ready', this._readyAsync.bind(this))
        this._rtm.on('message', (event) => this._messageAsync(event))
        this._rtm.on('disconnecting', (event) => this._disconnectingAsync(event))
    }

    async disconnectAsync() {
        await this._rtm.disconnect()
    }

    async _readyAsync() {
        try {
            const teams = this._channelMapping.team.name + "/" + this._channelMapping.teamsChannel.name
            const message = `Messages from this channel will be sent to ${teams} in Teams`
            const res = await this._rtm.sendMessage(message, this._channelMapping.slackChannel.id);
            logger.info('Message sent: ' + util.inspect(res));
        }
        catch (error) {
            logger.error("Error in Slack RTM API: " + error.stack)
        }
    }

    async _messageAsync(event) {
        // logger.info('messageAsync: ' + util.inspect(event));
    }

    async _disconnectingAsync(event) {
        logger.info('disconnectingAsync: ' + util.inspect(event));
        const message = `Bot disconnecting.  Messages from this channel will NOT be sent to ${teams} in Teams`
        const res = await this._rtm.sendMessage(message, this._channelMapping.slackChannel.id);
        logger.info('Message sent: ' + util.inspect(res));
    }
}



module.exports = SlackToTeamsMapping

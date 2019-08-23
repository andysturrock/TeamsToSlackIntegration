'use strict'
const logger = require('pino')()
const util = require('util')

module.exports = class ChannelMapping {
    constructor(other) {
        if (!other) {
            this.team = { id: null, name: null };
            this.teamsChannel = { id: null, name: null };
            this.workspace = { id: null, name: null };
            this.slackChannel = { id: null, name: null };
            this.slackBotToken = null;
            this.mappingOwner = { id: null, name: null, token: null };
            return this
        }

        const setFields = (other) => {
            this.team = other.team
            this.teamsChannel = other.teamsChannel
            this.workspace = other.workspace
            this.slackChannel = other.slackChannel
            this.slackBotToken = other.slackBotToken
            this.mappingOwner = other.mappingOwner
        }

        if (typeof other == 'string') {
            setFields(JSON.parse(other))
        } else if (other instanceof ChannelMapping) {
            setFields(other)
        } else {
            try {
                setFields(other)
            } catch (error) {
                console.error("error is " + error)
                throw new Error("Can't create from type " + other.constructor.name)
            }
        }
    }

    toString() {
        return JSON.stringify(this)
    }

    isValid() {
        return this.team && this.team.id && this.team.name
        && this.teamsChannel && this.teamsChannel.id && this.teamsChannel.name
        && this.workspace && this.workspace.id && this.workspace.name
        && this.slackChannel && this.slackChannel.id && this.slackChannel.name
        && this.slackBotToken
        && this.mappingOwner && this.mappingOwner.id && this.mappingOwner.name
        && this.mappingOwner.token
    }

}
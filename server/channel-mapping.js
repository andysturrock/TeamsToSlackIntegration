'use strict'
const logger = require('pino')()

module.exports = class ChannelMapping {
    constructor(json) {

        this.team = { id: null, name: null };
        this.teamsChannel = { id: null, name: null };
        this.workspace = { id: null, name: null };
        this.slackChannel = { id: null, name: null };
        this.mappingOwner = { id: null, name: null, token: null };
// logger.error("ctor parsing:" + json)
        if (json) {
            const jsonAny = JSON.parse(json)
            this.team.id = jsonAny.team.id
            this.team.name = jsonAny.team.name
            this.teamsChannel.id = jsonAny.teamsChannel.id;
            this.teamsChannel.name = jsonAny.teamsChannel.name;
            this.workspace.id = jsonAny.workspace.id;
            this.workspace.name = jsonAny.workspace.name;
            this.slackChannel.id = jsonAny.slackChannel.id;
            this.slackChannel.name = jsonAny.slackChannel.name;
            this.mappingOwner.id = jsonAny.mappingOwner.id;
            this.mappingOwner.name = jsonAny.mappingOwner.name;
            this.mappingOwner.token = jsonAny.mappingOwner.token;
        }
    }
}
'use strict'
const util = require('util')
const axios = require('axios');
const logger = require('pino')()

module.exports = {
  getAccessTokenAsync: async function (req) {
    if (req.user) {
      // Get the stored token
      const storedToken = req.user.oauthToken;
      if (storedToken) {
        if (storedToken.expired()) {
          // refresh token
          const newToken = await storedToken.refresh();

          // Update stored token
          req.user.oauthToken = newToken;
          return newToken.token.access_token;
        }

        // Token still valid, just return it
        return storedToken.token.access_token;
      }
    }
  },

  getRefreshedTokenAsync: async function (storedToken) {
    if (storedToken) {
      if (storedToken.expired()) {
        // refresh token
        const newToken = await storedToken.refresh();

        // Update stored token
        return newToken.token.access_token;
      }

      // Token still valid, just return it
      return storedToken.token.access_token;
    }
  },

  getOnBehalfOfTokenAsync: async function (accessToken) {
    try {
      console.trace("getOnBehalfOfTokenAsync")
      let url = `https://login.microsoftonline.com/${process.env.OAUTH_TENANT_ID}/oauth2/v2.0/token`
      // const config = {
      //   params: {
      //     grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      //     client_id: process.env.OAUTH_APP_ID,
      //     client_secret: process.env.OAUTH_APP_PASSWORD,
      //     assertion: accessToken,
      //     scope: process.env.OAUTH_SCOPES,
      //     requested_token_use: 'on_behalf_of'
      //   }
      // }
      // const config = {
      //   params: {
      //     grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      //     client_id: process.env.OAUTH_APP_ID,
      //     client_secret: process.env.OAUTH_APP_PASSWORD,
      //     assertion: accessToken,
      //     scope: process.env.OAUTH_SCOPES,
      //     requested_token_use: 'on_behalf_of'
      //   }
      // }


      const querystring = require('qs');
      const params = {
        'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'client_id': process.env.OAUTH_APP_ID,
        client_secret: process.env.OAUTH_APP_PASSWORD,
        assertion: accessToken,
        scope: 'https://graph.microsoft.com/user.read+offline_access',
        requested_token_use: 'on_behalf_of'
      }
      const options = {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        // params: querystring.stringify(params),
        data: querystring.stringify(params),
        url,
      };
      const response = await axios(options);
      logger.error("getOnBehalfOfToken() response" + util.inspect(response));


      // logger.error("getOnBehalfOfToken() config" + util.inspect(config));

      // axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';

      // const querystring = require('querystring');
      // const qsConfig = querystring.stringify(config)
      // logger.error("getOnBehalfOfToken() qsConfig" + util.inspect(qsConfig));
      // const response = await axios.post(url, null, qsConfig);
      // logger.error("getOnBehalfOfToken() response" + util.inspect(response));
    } catch (error) {
      logger.error('getOnBehalfOfToken() error = ' + util.inspect(error));
    }
  }

};
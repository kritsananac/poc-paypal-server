// TODO: add config
const { get } = require('env-var');

const config = {
  PAYPAL_CLIENT_ID: get('PAYPAL_CLIENT_ID').required().asString(),
  PAYPAL_CLIENT_SECRET: get('PAYPAL_CLIENT_SECRET').required().asString(),
  PAYPAL_ENVIRONMENT: get('PAYPAL_ENVIRONMENT').asEnum(['Sandbox', 'Production']),
}

module.exports = config;
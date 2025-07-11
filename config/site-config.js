// config/site-config.js
const siteConfig = {
  contact: "james.young@defra.gov.uk",
  serviceName: 'Spatial Data Science Quick Map',
  serviceHome: "https://github.com/jamesgyoung/sds-quick-map",
  phase: 'Prototype',
  get phaseBannerText() {
    return `This is a ${this.phase.toLowerCase() === 'prototype' ? this.phase.toLowerCase() : 'new'} service. Help us improve it and <a class="govuk-link govuk-link--no-visited-state" href="mailto:${this.contact}">give your feedback</a>.`;
  },
  baseUrl: '/',
};
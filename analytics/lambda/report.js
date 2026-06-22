const { SESv2Client, SendEmailCommand } = require("@aws-sdk/client-sesv2");
const { monthKey } = require("./shared/events");
const { queryTenant, listTenantConfigs } = require("./shared/store");
const { renderMonthlyReport } = require("./shared/reporting");

const ses = new SESv2Client({});

async function handler(event = {}) {
  const month = event.month || monthKey(new Date());
  const tenants = await listTenantConfigs(event.client_ids);
  const sent = [];

  for (const tenant of tenants) {
    if (!tenant.reporting_enabled) continue;
    const events = await queryTenant(tenant.client_id, `EVT#${month}`);
    const aggregates = await queryTenant(tenant.client_id, `AGG#${month}`);
    const html = renderMonthlyReport({ tenant, month, events, aggregates });
    const recipients = tenant.report_recipients || [];
    if (!recipients.length) continue;

    await ses.send(new SendEmailCommand({
      FromEmailAddress: process.env.REPORT_FROM_EMAIL || "info@anchorwebco.com.au",
      Destination: { ToAddresses: recipients },
      Content: {
        Simple: {
          Subject: { Data: `${tenant.display_name} analytics report, ${month}` },
          Body: {
            Html: { Data: html },
            Text: { Data: `${tenant.display_name} analytics report, ${month}` }
          }
        }
      }
    }));
    sent.push(tenant.client_id);
  }

  return { sent };
}

module.exports = {
  handler
};

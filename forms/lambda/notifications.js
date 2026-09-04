const { SESv2Client, SendEmailCommand } = require("@aws-sdk/client-sesv2");

const ses = new SESv2Client({});
const env = {
  fromEmail: process.env.FORM_ALERT_FROM_EMAIL || "info@anchorwebco.com.au",
  recipientEmail: process.env.FORM_ALERT_RECIPIENT_EMAIL || "info@anchorwebco.com.au",
};

function notificationEmail(record) {
  const notification = record?.Sns || {};
  const subject = String(notification.Subject || "Anchor Forms operational alert").slice(0, 180);
  const message = String(notification.Message || "An Anchor Forms operational notification was received.");
  return {
    FromEmailAddress: env.fromEmail,
    Destination: { ToAddresses: [env.recipientEmail] },
    ReplyToAddresses: [env.fromEmail],
    Content: {
      Simple: {
        Subject: { Data: subject },
        Body: { Text: { Data: message } },
      },
    },
  };
}

exports.handler = async function handler(event = {}) {
  let sent = 0;
  for (const record of event.Records || []) {
    if (record.EventSource !== "aws:sns") continue;
    const result = await ses.send(new SendEmailCommand(notificationEmail(record)));
    sent += 1;
    console.log(JSON.stringify({
      event: "alert_notification_sent",
      messageIdPresent: Boolean(result.MessageId),
    }));
  }
  return { sent };
};

exports._private = { notificationEmail };

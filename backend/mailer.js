const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendEmail(to, subject, html) {
  const msg = {
    to,
    from: process.env.EMAIL_FROM,
    subject,
    html,
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Email sent to ${to}`);
    return { success: true };
  } catch (err) {
    console.error(
      "❌ SendGrid error:",
      err.response?.body || err.message || err
    );
    return { success: false, error: err.response?.body || err.message || err };
  }
}

module.exports = { sendEmail };

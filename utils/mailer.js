const nodemailer = require('nodemailer');

// Use port 587 with STARTTLS - works on Render free tier
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
    ciphers: 'SSLv3'
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

transporter.verify((error) => {
  if (error) {
    console.error('Email error:', error.message);
  } else {
    console.log('Email server ready');
  }
});

function fmt(n) {
  return 'EGP ' + (n || 0).toLocaleString();
}

function orderRows(order) {
  return (order.items || []).map(i =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #ede3d0;color:#3d2f1f;font-size:13px">${i.name}${i.size ? ' — ' + i.size : ''}</td>
      <td style="padding:8px 0;border-bottom:1px solid #ede3d0;color:#3d2f1f;font-size:13px;text-align:right">x${i.qty} &nbsp; ${fmt(i.price * i.qty)}</td>
    </tr>`
  ).join('');
}

function baseTemplate(content) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
  <body style="margin:0;padding:0;background:#f5efe3;font-family:'Helvetica Neue',Arial,sans-serif">
    <div style="max-width:520px;margin:0 auto;background:#f5efe3">
      <div style="background:#062318;padding:32px 40px;text-align:center">
        <div style="font-family:Georgia,serif;font-size:32px;font-weight:300;color:#f5efe3;letter-spacing:0.04em">Dorra</div>
        <div style="font-style:italic;font-size:11px;color:rgba(184,145,60,0.7);margin-top:4px;letter-spacing:0.2em">THE LUXURY OF NATURE</div>
      </div>
      <div style="padding:36px 40px">${content}</div>
      <div style="background:#062318;padding:16px 40px;text-align:center">
        <p style="font-size:10px;color:rgba(245,239,227,0.3);margin:0">dorrastonejewelry@gmail.com &nbsp;|&nbsp; @dorrastones</p>
      </div>
    </div>
  </body></html>`;
}

async function sendOrderConfirmation(order) {
  const html = baseTemplate(`
    <p style="font-family:Georgia,serif;font-size:22px;font-weight:300;color:#062318;margin:0 0 8px">
      Thank you, ${(order.customer.name || '').split(' ')[0]}.
    </p>
    <p style="font-size:13px;color:#7a6040;line-height:1.8;margin-bottom:20px">
      Your order <strong style="color:#062318">${order.ref}</strong> has been received.
      We will begin preparing your piece by hand in Egypt and confirm within 24 hours.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
      ${orderRows(order)}
      <tr>
        <td style="padding:12px 0 0;font-size:13px;color:#062318;font-weight:500">Total</td>
        <td style="padding:12px 0 0;font-size:16px;color:#062318;font-family:Georgia,serif;text-align:right">${fmt(order.total)}</td>
      </tr>
    </table>
    <div style="background:#ede3d0;padding:14px 16px;margin-bottom:20px">
      <p style="font-size:11px;color:#7a6040;margin:0 0 4px;letter-spacing:0.12em;text-transform:uppercase">Delivery to</p>
      <p style="font-size:13px;color:#3d2f1f;margin:0;line-height:1.7">${order.customer.address}, ${order.customer.city || 'Cairo'}</p>
    </div>
    <p style="font-size:12px;color:#7a6040;line-height:1.8;margin-top:16px">
      Questions? Reply to this email or reach us on Instagram <strong>@dorrastones</strong>.
    </p>
  `);

  return transporter.sendMail({
    from: `"Dorra Jewelry" <${process.env.GMAIL_USER}>`,
    to: order.customer.email,
    subject: `Your Dorra order ${order.ref} is confirmed`,
    html,
  });
}

async function sendAdminNotification(order) {
  const html = baseTemplate(`
    <p style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#062318;margin:0 0 12px">
      New Order: ${order.ref}
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
      <tr><td style="font-size:12px;color:#7a6040;padding:4px 0;width:120px">Customer</td><td style="font-size:12px;color:#3d2f1f">${order.customer.name}</td></tr>
      <tr><td style="font-size:12px;color:#7a6040;padding:4px 0">Phone</td><td style="font-size:12px;color:#3d2f1f">${order.customer.phone}</td></tr>
      <tr><td style="font-size:12px;color:#7a6040;padding:4px 0">Email</td><td style="font-size:12px;color:#3d2f1f">${order.customer.email}</td></tr>
      <tr><td style="font-size:12px;color:#7a6040;padding:4px 0">Address</td><td style="font-size:12px;color:#3d2f1f">${order.customer.address}, ${order.customer.city || ''}</td></tr>
      <tr><td style="font-size:12px;color:#7a6040;padding:4px 0">Payment</td><td style="font-size:12px;color:#3d2f1f">${order.payment}</td></tr>
      <tr><td style="font-size:12px;color:#7a6040;padding:4px 0">Total</td><td style="font-size:13px;color:#062318;font-weight:500">${fmt(order.total)}</td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0">${orderRows(order)}</table>
    ${order.customer.notes ? `<p style="font-size:12px;color:#7a6040;margin-top:12px">Notes: ${order.customer.notes}</p>` : ''}
  `);

  return transporter.sendMail({
    from: `"Dorra Orders" <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER,
    subject: `[NEW ORDER] ${order.ref} — ${fmt(order.total)} — ${order.customer.name}`,
    html,
  });
}

async function sendStatusUpdate(order) {
  const messages = {
    confirmed: 'Your order has been confirmed and we are beginning your piece.',
    shipped: 'Your Dorra piece is on its way.',
    delivered: 'Your Dorra piece has been delivered. We hope you love it.',
  };
  const msg = messages[order.status];
  if (!msg) return;

  return transporter.sendMail({
    from: `"Dorra Jewelry" <${process.env.GMAIL_USER}>`,
    to: order.customer.email,
    subject: `Your Dorra order ${order.ref} — ${order.status}`,
    html: baseTemplate(`<p style="font-size:13px;color:#7a6040;line-height:1.8">${msg}</p>`),
  });
}

async function sendReviewNotification(review) {
  return transporter.sendMail({
    from: `"Dorra Reviews" <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER,
    subject: `[NEW REVIEW] ${review.name} — pending approval`,
    html: baseTemplate(`
      <p style="font-size:13px;color:#3d2f1f"><strong>${review.name}</strong>${review.piece ? ' — ' + review.piece : ''}</p>
      <p style="font-size:13px;color:#7a6040;font-style:italic">"${review.text}"</p>
    `),
  });
}

module.exports = { sendOrderConfirmation, sendAdminNotification, sendStatusUpdate, sendReviewNotification };

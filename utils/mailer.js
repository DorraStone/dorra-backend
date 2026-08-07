const https = require('https');

const RESEND_API_KEY = process.env.RESEND_API_KEY;

function sendEmail({ to, subject, html }) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      from: 'Dorra Jewelry <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    });

    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('Email sent:', parsed.id);
          resolve(parsed);
        } else {
          console.error('Email error:', parsed);
          reject(new Error(parsed.message || 'Email failed'));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

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
  <body style="margin:0;padding:0;background:#f5efe3;font-family:Arial,sans-serif">
    <div style="max-width:520px;margin:0 auto;background:#f5efe3">
      <div style="background:#062318;padding:28px 40px;text-align:center">
        <div style="font-family:Georgia,serif;font-size:30px;font-weight:300;color:#f5efe3;letter-spacing:0.04em">Dorra</div>
        <div style="font-style:italic;font-size:10px;color:rgba(184,145,60,0.7);margin-top:4px;letter-spacing:0.2em">THE LUXURY OF NATURE</div>
      </div>
      <div style="padding:32px 40px">${content}</div>
      <div style="background:#062318;padding:14px 40px;text-align:center">
        <p style="font-size:10px;color:rgba(245,239,227,0.3);margin:0">dorrastonejewelry@gmail.com &nbsp;|&nbsp; @dorrastones</p>
      </div>
    </div>
  </body></html>`;
}

async function sendOrderConfirmation(order) {
  return sendEmail({
    to: order.customer.email,
    subject: `Your Dorra order ${order.ref} is confirmed`,
    html: baseTemplate(`
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
      <div style="background:#ede3d0;padding:14px 16px;margin-bottom:16px">
        <p style="font-size:11px;color:#7a6040;margin:0 0 4px;text-transform:uppercase;letter-spacing:.1em">Delivery to</p>
        <p style="font-size:13px;color:#3d2f1f;margin:0">${order.customer.address}, ${order.customer.city || 'Cairo'}</p>
      </div>
      <p style="font-size:12px;color:#7a6040;line-height:1.8">
        Questions? Reply to this email or DM us on Instagram <strong>@dorrastones</strong>.
      </p>
    `),
  });
}

async function sendAdminNotification(order) {
  return sendEmail({
    to: process.env.ADMIN_EMAIL || process.env.GMAIL_USER,
    subject: `[NEW ORDER] ${order.ref} — ${fmt(order.total)} — ${order.customer.name}`,
    html: baseTemplate(`
      <p style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#062318;margin:0 0 12px">New Order: ${order.ref}</p>
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
    `),
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
  return sendEmail({
    to: order.customer.email,
    subject: `Your Dorra order ${order.ref} — ${order.status}`,
    html: baseTemplate(`<p style="font-size:13px;color:#7a6040;line-height:1.8">${msg}</p>`),
  });
}

async function sendReviewNotification(review) {
  return sendEmail({
    to: process.env.ADMIN_EMAIL || process.env.GMAIL_USER,
    subject: `[NEW REVIEW] ${review.name} — pending approval`,
    html: baseTemplate(`
      <p style="font-size:13px;color:#3d2f1f"><strong>${review.name}</strong>${review.piece ? ' — ' + review.piece : ''}</p>
      <p style="font-size:13px;color:#7a6040;font-style:italic">"${review.text}"</p>
    `),
  });
}

console.log('Resend email service loaded');
module.exports = { sendOrderConfirmation, sendAdminNotification, sendStatusUpdate, sendReviewNotification };

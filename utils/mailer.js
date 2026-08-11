const https = require('https');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN = 'dorrastonejewelry@gmail.com';

function sendEmail({ from, to, subject, html }) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ from, to: [to], subject, html });
    const buf = Buffer.from(body, 'utf8');
    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': buf.length,
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const r = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('Email sent to', to, ':', r.id);
            resolve(r);
          } else {
            console.error('Email error to', to, ':', JSON.stringify(r));
            reject(new Error(r.message || 'Email failed'));
          }
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(buf);
    req.end();
  });
}

function fmt(n) { return 'EGP ' + (n||0).toLocaleString(); }

function rows(order) {
  return (order.items||[]).map(i =>
    `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #ede3d0;font-size:13px;color:#3d2f1f;font-family:Georgia,serif">${i.name}${i.size?' — '+i.size:''}</td>
      <td style="padding:10px 0;border-bottom:1px solid #ede3d0;font-size:13px;color:#3d2f1f;text-align:right">x${i.qty}&nbsp;&nbsp;${fmt(i.price*i.qty)}</td>
    </tr>`
  ).join('');
}

function base(content, title) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ede3d0;font-family:'Helvetica Neue',Arial,sans-serif">
<div style="max-width:540px;margin:0 auto;background:#f5efe3">

  <div style="background:#062318;text-align:center;line-height:0;font-size:0">
    <img src="https://dorrastone.shop/logo-email.png" alt="Dorra" width="540" style="display:block;width:100%;max-width:540px;height:auto;border:0;" />
  </div>

  ${title ? `<div style="background:#062318;padding:0 40px 22px;text-align:center">
    <p style="margin:0;font-size:8px;letter-spacing:0.4em;text-transform:uppercase;color:rgba(184,145,60,0.8);font-family:'Helvetica Neue',Arial,sans-serif">${title}</p>
  </div>` : ''}

  <div style="height:2px;background:#b8913c;opacity:0.4"></div>

  <div style="padding:36px 40px 28px">${content}</div>

  <div style="background:#062318;padding:20px 40px;text-align:center">
    <p style="margin:0;font-size:10px;color:rgba(245,239,227,0.3);letter-spacing:0.06em">
      dorrastonejewelry@gmail.com &nbsp;&bull;&nbsp;
      <a href="https://www.instagram.com/dorrastones" style="color:rgba(184,145,60,0.5);text-decoration:none;">@dorrastones</a>
    </p>
  </div>

</div>
</body></html>`;
}

async function sendOrderConfirmation(order) {
  console.log('Sending confirmation to customer:', order.customer.email);
  return sendEmail({
    from: 'Dorra Jewelry <orders@dorrastone.shop>',
    to: order.customer.email,
    subject: `Your Dorra order ${order.ref} is confirmed`,
    html: base(`
      <p style="font-family:Georgia,serif;font-size:22px;font-weight:300;color:#062318;margin:0 0 6px">Thank you, ${(order.customer.name||'').split(' ')[0]}.</p>
      <p style="font-size:13px;color:#7a6040;line-height:1.8;margin-bottom:24px">Your order <strong style="color:#062318;letter-spacing:0.04em">${order.ref}</strong> has been received. We will begin preparing your piece by hand in Egypt and confirm within 24 hours.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
        ${rows(order)}
        <tr>
          <td style="padding:14px 0 0;font-size:13px;color:#062318;font-weight:500">Total</td>
          <td style="padding:14px 0 0;font-size:18px;color:#062318;font-family:Georgia,serif;text-align:right">${fmt(order.total)}</td>
        </tr>
      </table>
      <div style="background:#ede3d0;padding:14px 18px;margin-bottom:20px;border-left:2px solid #b8913c">
        <p style="font-size:10px;color:#7a6040;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.1em">Delivery to</p>
        <p style="font-size:13px;color:#3d2f1f;margin:0;line-height:1.7">${order.customer.address}${order.customer.city?', '+order.customer.city:''}</p>
      </div>
      <p style="font-size:12px;color:#7a6040;line-height:1.8;margin:0">Questions? Reply to this email or <a href="https://www.instagram.com/dorrastones" style="color:#b8913c;text-decoration:none;">DM us on Instagram @dorrastones</a>.</p>
    `, 'Order Confirmed'),
  });
}

async function sendAdminNotification(order) {
  console.log('Sending admin notification for order:', order.ref);
  return sendEmail({
    from: 'Dorra Orders <orders@dorrastone.shop>',
    to: ADMIN,
    subject: `[NEW ORDER] ${order.ref} — ${fmt(order.total)} — ${order.customer.name}`,
    html: base(`
      <p style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#062318;margin:0 0 16px">New Order: ${order.ref}</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
        <tr><td style="font-size:11px;color:#7a6040;padding:5px 0;width:110px;text-transform:uppercase;letter-spacing:0.08em">Customer</td><td style="font-size:13px;color:#3d2f1f">${order.customer.name}</td></tr>
        <tr><td style="font-size:11px;color:#7a6040;padding:5px 0;text-transform:uppercase;letter-spacing:0.08em">Phone</td><td style="font-size:13px;color:#3d2f1f">${order.customer.phone}</td></tr>
        <tr><td style="font-size:11px;color:#7a6040;padding:5px 0;text-transform:uppercase;letter-spacing:0.08em">Email</td><td style="font-size:13px;color:#3d2f1f">${order.customer.email}</td></tr>
        <tr><td style="font-size:11px;color:#7a6040;padding:5px 0;text-transform:uppercase;letter-spacing:0.08em">Address</td><td style="font-size:13px;color:#3d2f1f">${order.customer.address}${order.customer.city?', '+order.customer.city:''}</td></tr>
        <tr><td style="font-size:11px;color:#7a6040;padding:5px 0;text-transform:uppercase;letter-spacing:0.08em">Payment</td><td style="font-size:13px;color:#3d2f1f">${order.payment}</td></tr>
        <tr><td style="font-size:11px;color:#7a6040;padding:5px 0;text-transform:uppercase;letter-spacing:0.08em">Total</td><td style="font-size:16px;color:#062318;font-family:Georgia,serif;font-weight:300">${fmt(order.total)}</td></tr>
      </table>
      <div style="height:1px;background:#ede3d0;margin-bottom:16px"></div>
      <table width="100%" cellpadding="0" cellspacing="0">${rows(order)}</table>
      ${order.customer.notes?`<p style="font-size:12px;color:#7a6040;margin-top:14px;padding:10px 14px;background:#ede3d0;border-left:2px solid #b8913c">Notes: ${order.customer.notes}</p>`:''}
    `, 'New Order'),
  });
}

async function sendStatusUpdate(order) {
  const messages = {
    confirmed: 'Your order has been confirmed. We are beginning your piece.',
    shipped: 'Your Dorra piece is on its way to you.',
    delivered: 'Your Dorra piece has been delivered. We hope it moves you.',
  };
  const msg = messages[order.status];
  if (!msg) return;
  return sendEmail({
    from: 'Dorra Jewelry <orders@dorrastone.shop>',
    to: order.customer.email,
    subject: `Your Dorra order ${order.ref} — ${order.status}`,
    html: base(`<p style="font-size:13px;color:#7a6040;line-height:1.8">${msg}</p><p style="font-size:12px;color:#7a6040;margin-top:16px">Questions? <a href="https://www.instagram.com/dorrastones" style="color:#b8913c;text-decoration:none;">DM us @dorrastones</a></p>`, order.status.charAt(0).toUpperCase()+order.status.slice(1)),
  });
}

async function sendReviewNotification(review) {
  return sendEmail({
    from: 'Dorra Reviews <orders@dorrastone.shop>',
    to: ADMIN,
    subject: `[NEW REVIEW] ${review.name} — pending approval`,
    html: base(`
      <p style="font-size:13px;color:#3d2f1f;font-family:Georgia,serif"><strong>${review.name}</strong>${review.piece?' — '+review.piece:''}</p>
      <p style="font-size:13px;color:#7a6040;line-height:1.8;font-style:italic">"${review.text}"</p>
    `, 'New Review'),
  });
}

console.log('Resend email service ready — orders@dorrastone.shop');
module.exports = { sendOrderConfirmation, sendAdminNotification, sendStatusUpdate, sendReviewNotification };

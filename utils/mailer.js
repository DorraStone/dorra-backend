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
            console.error('Email error:', JSON.stringify(r));
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
      <td style="padding:10px 0;border-bottom:1px solid #e8dfd0;font-size:14px;color:#3d2f1f;font-family:Georgia,serif">${i.name}${i.size?' — '+i.size:''}</td>
      <td style="padding:10px 0;border-bottom:1px solid #e8dfd0;font-size:14px;color:#3d2f1f;text-align:right;white-space:nowrap">x${i.qty}&nbsp;&nbsp;${fmt(i.price*i.qty)}</td>
    </tr>`
  ).join('');
}

function base(content, title) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#e8dfd0;font-family:'Helvetica Neue',Arial,sans-serif">
<div style="max-width:540px;margin:0 auto;background:#f5efe3;box-shadow:0 2px 24px rgba(0,0,0,0.08)">

  <!-- LOGO -->
  <div style="background:#062318;padding:0;text-align:center;font-size:0;line-height:0">
    <img src="https://dorrastone.shop/logo-email.png" alt="Dorra" width="540" style="display:block;width:100%;max-width:540px;height:auto;border:0;" />
  </div>

  <!-- TITLE - seamless with header image -->
  ${title ? `<div style="background:#062318;padding:4px 40px 22px;text-align:center;margin-top:-4px">
    <p style="margin:0;font-size:14px;letter-spacing:0.36em;text-transform:uppercase;color:#b8913c;font-family:'Helvetica Neue',Arial,sans-serif;font-weight:500">${title}</p>
  </div>` : ''}

  <!-- GOLD DIVIDER -->
  <div style="background:#b8913c;height:1px"></div>

  <!-- CONTENT -->
  <div style="padding:40px 44px 32px;text-align:center">${content}</div>

  <!-- FOOTER -->
  <div style="background:#062318;padding:22px 44px;text-align:center">
    <p style="margin:0;font-size:11px;color:rgba(245,239,227,0.4);letter-spacing:0.06em">
      dorrastonejewelry@gmail.com &nbsp;&bull;&nbsp;
      <a href="https://www.instagram.com/dorrastones" style="color:rgba(184,145,60,0.6);text-decoration:none;">@dorrastones</a>
    </p>
  </div>

</div>
</body></html>`;
}

async function sendOrderConfirmation(order) {
  console.log('Sending confirmation to:', order.customer.email);
  return sendEmail({
    from: 'Dorra Jewelry <orders@dorrastone.shop>',
    to: order.customer.email,
    subject: `Your Dorra order ${order.ref} is confirmed`,
    html: base(`
      <p style="font-family:Georgia,serif;font-size:24px;font-weight:300;color:#062318;margin:0 0 8px;letter-spacing:0.01em;text-align:center">Thank you, ${(order.customer.name||'').split(' ')[0]}.</p>
      <p style="font-size:14px;color:#7a6040;line-height:1.85;margin-bottom:28px">Your order <strong style="color:#062318;letter-spacing:0.03em">${order.ref}</strong> has been received. We will begin preparing your piece by hand in Egypt and confirm within 24 hours.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;text-align:left">
        ${rows(order)}
        <tr>
          <td style="padding:16px 0 0;font-size:14px;color:#062318;font-weight:500;letter-spacing:0.04em">TOTAL</td>
          <td style="padding:16px 0 0;font-size:20px;color:#062318;font-family:Georgia,serif;text-align:right;font-weight:300">${fmt(order.total)}</td>
        </tr>
      </table>
      <div style="background:#ede3d0;padding:16px 18px;margin-bottom:24px;border-left:2px solid #b8913c">
        <p style="font-size:10px;color:#7a6040;margin:0 0 5px;text-transform:uppercase;letter-spacing:0.12em">Delivery to</p>
        <p style="font-size:14px;color:#3d2f1f;margin:0;line-height:1.7">${order.customer.address}${order.customer.city?', '+order.customer.city:''}</p>
      </div>
      <p style="font-size:13px;color:#7a6040;line-height:1.85;margin:0">Questions? Reply to this email or <a href="https://www.instagram.com/dorrastones" style="color:#b8913c;text-decoration:none;font-weight:500">DM us @dorrastones</a>.</p>
    `, 'Order Confirmed'),
  });
}

async function sendAdminNotification(order) {
  console.log('Sending admin notification:', order.ref);
  return sendEmail({
    from: 'Dorra Orders <orders@dorrastone.shop>',
    to: ADMIN,
    subject: `[NEW ORDER] ${order.ref} — ${fmt(order.total)} — ${order.customer.name}`,
    html: base(`
      <p style="font-family:Georgia,serif;font-size:22px;font-weight:300;color:#062318;margin:0 0 20px">${order.ref}</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;text-align:left">
        <tr><td style="font-size:11px;color:#7a6040;padding:6px 0;width:110px;text-transform:uppercase;letter-spacing:0.1em">Customer</td><td style="font-size:14px;color:#3d2f1f;font-weight:500">${order.customer.name}</td></tr>
        <tr><td style="font-size:11px;color:#7a6040;padding:6px 0;text-transform:uppercase;letter-spacing:0.1em">Phone</td><td style="font-size:14px;color:#3d2f1f">${order.customer.phone}</td></tr>
        <tr><td style="font-size:11px;color:#7a6040;padding:6px 0;text-transform:uppercase;letter-spacing:0.1em">Email</td><td style="font-size:14px;color:#3d2f1f">${order.customer.email}</td></tr>
        <tr><td style="font-size:11px;color:#7a6040;padding:6px 0;text-transform:uppercase;letter-spacing:0.1em">Address</td><td style="font-size:14px;color:#3d2f1f">${order.customer.address}${order.customer.city?', '+order.customer.city:''}</td></tr>
        <tr><td style="font-size:11px;color:#7a6040;padding:6px 0;text-transform:uppercase;letter-spacing:0.1em">Payment</td><td style="font-size:14px;color:#3d2f1f">${order.payment}</td></tr>
        <tr><td style="font-size:11px;color:#7a6040;padding:6px 0;text-transform:uppercase;letter-spacing:0.1em">Total</td><td style="font-size:20px;color:#062318;font-family:Georgia,serif;font-weight:300">${fmt(order.total)}</td></tr>
      </table>
      <div style="height:1px;background:#e8dfd0;margin-bottom:20px"></div>
      <table width="100%" cellpadding="0" cellspacing="0">${rows(order)}</table>
      ${order.customer.notes?`<div style="margin-top:16px;padding:12px 16px;background:#ede3d0;border-left:2px solid #b8913c"><p style="font-size:13px;color:#7a6040;margin:0"><strong>Notes:</strong> ${order.customer.notes}</p></div>`:''}
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
    html: base(`
      <p style="font-size:14px;color:#7a6040;line-height:1.85">${msg}</p>
      <p style="font-size:13px;color:#7a6040;margin-top:20px">Questions? <a href="https://www.instagram.com/dorrastones" style="color:#b8913c;text-decoration:none;">DM us @dorrastones</a></p>
    `, order.status.charAt(0).toUpperCase()+order.status.slice(1)),
  });
}

async function sendReviewNotification(review) {
  return sendEmail({
    from: 'Dorra Reviews <orders@dorrastone.shop>',
    to: ADMIN,
    subject: `[NEW REVIEW] ${review.name} — pending approval`,
    html: base(`
      <p style="font-size:15px;color:#3d2f1f;font-family:Georgia,serif;margin-bottom:8px"><strong>${review.name}</strong>${review.piece?' — '+review.piece:''}</p>
      <p style="font-size:14px;color:#7a6040;line-height:1.85;font-style:italic">"${review.text}"</p>
    `, 'New Review'),
  });
}

console.log('Resend email ready — orders@dorrastone.shop');
module.exports = { sendOrderConfirmation, sendAdminNotification, sendStatusUpdate, sendReviewNotification };

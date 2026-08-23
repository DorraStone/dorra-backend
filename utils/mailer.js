const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ORDERS = process.env.RESEND_FROM_ORDERS || 'Dorra Jewelry <onboarding@resend.dev>';
const FROM_ADMIN  = process.env.RESEND_FROM_ADMIN  || 'Dorra Orders <onboarding@resend.dev>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.GMAIL_USER;

// Hosted on GitHub (raw file URL) instead of embedded base64 — most email
// clients (Gmail included) block/strip inline base64 images, so it must be
// a real hosted image URL to actually display.
const LOGO_URL = process.env.LOGO_URL || 'https://raw.githubusercontent.com/DorraStone/dorra-backend/main/assets/dorra-logo-email.png';

function fmt(n) {
  return 'EGP ' + (n || 0).toLocaleString();
}

function fmtFinish(w) {
  if (!w) return '';
  if (w === 'gold') return 'Gold-toned wire';
  if (w === 'silver') return 'Silver-toned wire';
  return w;
}

function orderRows(order) {
  return order.items.map(i => {
    const details = [];
    if (i.size) details.push(i.size);
    if (i.wireColor) details.push(fmtFinish(i.wireColor));
    if (i.stones && i.stones.length) details.push('Stones: ' + i.stones.join(', '));
    else if (i.stone) details.push('Stone: ' + i.stone);

    const detailLine = details.length
      ? `<div style="font-size:11px;color:rgba(245,239,227,0.65);margin-top:3px;line-height:1.6">${details.join(' &middot; ')}</div>`
      : '';

    const bespokeLine = i.isCustom
      ? `<div style="font-size:11px;color:#b8913c;margin-top:4px;font-style:italic;line-height:1.6">${i.customNote || 'Bespoke piece'}</div>`
      : '';

    return `<tr>
      <td style="padding:4px 0;font-size:15px;color:#e8dfc8;vertical-align:top">
        <span style="color:rgba(245,239,227,0.65)">${i.name} x${i.qty}</span>
        ${i.isCustom ? ' <span style="color:#b8913c;font-size:10px;letter-spacing:.08em;text-transform:uppercase">&middot; Bespoke</span>' : ''}
        ${detailLine}
        ${bespokeLine}
      </td>
      <td style="padding:4px 0;font-size:15px;color:#e8dfc8;text-align:right;vertical-align:top;white-space:nowrap">${fmt(i.price * i.qty)}</td>
    </tr>`;
  }).join('');
}

function baseTemplate(content) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
  <body style="margin:0;padding:0;background:#01271a;font-family:'Helvetica Neue',Arial,sans-serif">
    <div style="max-width:480px;margin:0 auto;background:#01271a">

      <div style="padding:28px 24px 8px;text-align:center">
        <img src="${LOGO_URL}" alt="Dorra" width="150" style="display:block;margin:0 auto;height:auto;max-width:150px"/>
      </div>

      <div style="padding:20px 24px 28px;text-align:center">
        ${content}
      </div>

      <div style="padding:16px 24px;text-align:center;border-top:1px solid rgba(184,145,60,0.15)">
        <p style="font-size:10px;color:rgba(245,239,227,0.3);margin:0;letter-spacing:0.08em">
          dorrastonejewelry@gmail.com &nbsp;|&nbsp; @dorrastones
        </p>
      </div>

    </div>
  </body></html>`;
}

async function sendOrderConfirmation(order) {
  const html = baseTemplate(`
    <span style="font-size:13px;letter-spacing:0.4em;text-transform:uppercase;color:#b8913c;display:block;margin-bottom:12px">Order Confirmed</span>
    <h2 style="font-family:Georgia,serif;font-size:28px;font-weight:300;color:#f5efe3;margin:0 0 8px">Thank you, ${order.customer.name.split(' ')[0]}.</h2>
    <p style="font-size:15px;color:rgba(245,239,227,0.65);line-height:1.85;margin:0 0 16px">Your order <strong style="color:#f5efe3">${order.ref}</strong> has been received. We will confirm by email within 24 hours and begin preparing your piece by hand in Egypt.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(245,239,227,0.06);padding:12px 16px;margin-bottom:16px;text-align:left">
      ${orderRows(order)}
      <tr>
        <td style="padding-top:8px;border-top:1px solid rgba(245,239,227,0.15);font-size:15px;font-weight:500;color:#f5efe3">Total</td>
        <td style="padding-top:8px;border-top:1px solid rgba(245,239,227,0.15);font-size:15px;font-weight:500;color:#f5efe3;text-align:right">${fmt(order.total)}</td>
      </tr>
    </table>

    ${order.dueNow > 0 && order.dueNow < order.total ? `
    <p style="font-size:14px;color:#b8913c;margin-bottom:16px">Amount due now: ${fmt(order.dueNow)}  Remaining on delivery: ${fmt(order.dueOnDelivery)}</p>
    ` : ''}

    <div style="background:rgba(245,239,227,0.06);padding:14px 16px;margin-bottom:16px;text-align:left">
      <p style="font-size:11px;color:rgba(245,239,227,0.65);margin:0 0 4px;letter-spacing:0.12em;text-transform:uppercase">Delivery to</p>
      <p style="font-size:13px;color:#e8dfc8;margin:0;line-height:1.7">${order.customer.address}, ${order.customer.city}</p>
    </div>

    ${order.payment === 'full_cod' ?
      `<p style="font-size:12px;color:rgba(245,239,227,0.65);line-height:1.7">Payment method: <strong>Cash on Delivery</strong></p>` :
      order.instapayRef ?
      `<p style="font-size:12px;color:rgba(245,239,227,0.65);line-height:1.7">Instapay reference <strong>${order.instapayRef}</strong> received. We will verify and confirm shortly.</p>` : ''
    }

    <p style="font-size:12px;color:rgba(245,239,227,0.65);line-height:1.8;margin-top:16px">
      If you have any questions, reply to this email or reach us on Instagram <strong>@dorrastones</strong>.
    </p>
  `);

  return resend.emails.send({
    from: FROM_ORDERS,
    to: order.customer.email,
    reply_to: ADMIN_EMAIL,
    subject: `Your Dorra order ${order.ref} is confirmed`,
    html,
  });
}

async function sendAdminNotification(order) {
  const html = baseTemplate(`
    <p style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#f5efe3;margin:0 0 12px;text-align:left">
      New Order: ${order.ref}
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;text-align:left">
      <tr><td style="font-size:12px;color:rgba(245,239,227,0.65);padding:4px 0;width:120px">Customer</td><td style="font-size:12px;color:#e8dfc8">${order.customer.name}</td></tr>
      <tr><td style="font-size:12px;color:rgba(245,239,227,0.65);padding:4px 0">Phone</td><td style="font-size:12px;color:#e8dfc8">${order.customer.phone}</td></tr>
      <tr><td style="font-size:12px;color:rgba(245,239,227,0.65);padding:4px 0">Email</td><td style="font-size:12px;color:#e8dfc8">${order.customer.email}</td></tr>
      <tr><td style="font-size:12px;color:rgba(245,239,227,0.65);padding:4px 0">Address</td><td style="font-size:12px;color:#e8dfc8">${order.customer.address}, ${order.customer.city}</td></tr>
      <tr><td style="font-size:12px;color:rgba(245,239,227,0.65);padding:4px 0">Payment</td><td style="font-size:12px;color:#e8dfc8">${order.payment}</td></tr>
      <tr><td style="font-size:12px;color:rgba(245,239,227,0.65);padding:4px 0">Total</td><td style="font-size:13px;color:#f5efe3;font-weight:500">${fmt(order.total)}</td></tr>
      ${order.dueNow ? `<tr><td style="font-size:12px;color:#b8913c;padding:4px 0">Due now</td><td style="font-size:12px;color:#b8913c">${fmt(order.dueNow)}</td></tr>` : ''}
      ${order.instapayRef ? `<tr><td style="font-size:12px;color:rgba(245,239,227,0.65);padding:4px 0">Instapay ref</td><td style="font-size:12px;color:#e8dfc8">${order.instapayRef}</td></tr>` : ''}
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="text-align:left">${orderRows(order)}</table>
    ${order.customer.notes ? `<p style="font-size:12px;color:rgba(245,239,227,0.65);margin-top:12px;text-align:left">Notes: ${order.customer.notes}</p>` : ''}
  `);

  return resend.emails.send({
    from: FROM_ADMIN,
    to: ADMIN_EMAIL,
    reply_to: order.customer.email,
    subject: `New order ${order.ref} — ${fmt(order.total)} — ${order.customer.name}`,
    html,
  });
}

async function sendStatusUpdate(order) {
  const messages = {
    confirmed: 'Your order has been confirmed and we are beginning your piece.',
    shipped:   'Your Dorra piece is on its way.',
    delivered: 'Your Dorra piece has been delivered. We hope you love it.',
  };
  const msg = messages[order.status];
  if (!msg) return;

  const html = baseTemplate(`
    <p style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#f5efe3;margin:0 0 10px">
      Order Update — ${order.ref}
    </p>
    <p style="font-size:13px;color:rgba(245,239,227,0.65);line-height:1.8">${msg}</p>
    <p style="font-size:12px;color:rgba(245,239,227,0.65);margin-top:16px">Questions? Reply here or DM <strong>@dorrastones</strong>.</p>
  `);

  return resend.emails.send({
    from: FROM_ORDERS,
    to: order.customer.email,
    reply_to: ADMIN_EMAIL,
    subject: `Your Dorra order ${order.ref} — ${order.status}`,
    html,
  });
}

async function sendReviewNotification(review) {
  const html = baseTemplate(`
    <p style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#f5efe3;margin:0 0 12px">
      New Review Pending Approval
    </p>
    <p style="font-size:13px;color:#e8dfc8;line-height:1.8"><strong>${review.name}</strong>${review.piece ? ' — ' + review.piece : ''}</p>
    <p style="font-size:13px;color:rgba(245,239,227,0.65);line-height:1.8;font-style:italic">"${review.text}"</p>
    <p style="font-size:11px;color:rgba(245,239,227,0.65);margin-top:16px">Log in to your admin panel to approve or reject this review.</p>
  `);

  return resend.emails.send({
    from: FROM_ADMIN,
    to: ADMIN_EMAIL,
    subject: `New review — ${review.name} — pending approval`,
    html,
  });
}

async function sendRequestNotification(type, data) {
  const html = baseTemplate(`
    <p style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#f5efe3;margin:0 0 12px">
      New ${type} Request
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="text-align:left">
      <tr><td style="font-size:12px;color:rgba(245,239,227,0.65);padding:4px 0;width:110px">Order Ref</td><td style="font-size:12px;color:#e8dfc8">${data.ref || ''}</td></tr>
      <tr><td style="font-size:12px;color:rgba(245,239,227,0.65);padding:4px 0">Name</td><td style="font-size:12px;color:#e8dfc8">${data.name || ''}</td></tr>
      <tr><td style="font-size:12px;color:rgba(245,239,227,0.65);padding:4px 0">Address</td><td style="font-size:12px;color:#e8dfc8">${data.address || ''}</td></tr>
      <tr><td style="font-size:12px;color:rgba(245,239,227,0.65);padding:4px 0">Reason</td><td style="font-size:12px;color:#e8dfc8">${data.reason || ''}</td></tr>
    </table>
  `);

  return resend.emails.send({
    from: FROM_ADMIN,
    to: ADMIN_EMAIL,
    subject: `New ${type} request${data.ref ? ' — ' + data.ref : ''}`,
    html,
  });
}

module.exports = { sendOrderConfirmation, sendAdminNotification, sendStatusUpdate, sendReviewNotification, sendRequestNotification };

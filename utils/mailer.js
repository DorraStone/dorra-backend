const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ORDERS = process.env.RESEND_FROM_ORDERS || 'Dorra Jewelry <onboarding@resend.dev>';
const FROM_ADMIN  = process.env.RESEND_FROM_ADMIN  || 'Dorra Orders <onboarding@resend.dev>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.GMAIL_USER;

// Hosted on GitHub (raw file URL) instead of embedded base64 — most email
// clients (Gmail included) block/strip inline base64 images, so it must be
// a real hosted image URL to actually display.
const LOGO_URL = process.env.LOGO_URL || 'https://raw.githubusercontent.com/DorraStone/dorra-backend/main/assets/dorra-logo-email.png?v=3';

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
      ? `<div style="font-size:11px;color:#7a6040;margin-top:3px;line-height:1.6">${details.join(' &middot; ')}</div>`
      : '';

    const bespokeLine = i.isCustom
      ? `<div style="font-size:11px;color:#b8913c;margin-top:4px;font-style:italic;line-height:1.6">${i.customNote || 'Bespoke piece'}</div>`
      : '';

    return `<tr>
      <td style="padding:4px 0;font-size:15px;color:#3d2f1f;vertical-align:top">
        <span style="color:#7a6040">${i.name} x${i.qty}</span>
        ${i.isCustom ? ' <span style="color:#b8913c;font-size:10px;letter-spacing:.08em;text-transform:uppercase">&middot; Bespoke</span>' : ''}
        ${detailLine}
        ${bespokeLine}
      </td>
      <td style="padding:4px 0;font-size:15px;color:#3d2f1f;text-align:right;vertical-align:top;white-space:nowrap">${fmt(i.price * i.qty)}</td>
    </tr>`;
  }).join('');
}

function baseTemplate(content) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <style>
    body,table,td{-webkit-text-size-adjust:none;}
    :root{color-scheme:light;supported-color-schemes:light;}
    /* Force our real colors back even when Gmail auto-applies its own dark theme
       (Gmail marks recolored elements with [data-ogsc] - we override specifically there) */
    [data-ogsc] .dorra-bg-dark, u + .body .dorra-bg-dark { background-color:#01271a !important; }
    [data-ogsc] .dorra-bg-light, u + .body .dorra-bg-light { background-color:#f5efe3 !important; }
    [data-ogsc] .dorra-text-light, u + .body .dorra-text-light { color:#f5efe3 !important; }
    [data-ogsc] .dorra-text-light-muted, u + .body .dorra-text-light-muted { color:rgba(245,239,227,0.7) !important; }
    [data-ogsc] .dorra-text-dark, u + .body .dorra-text-dark { color:#062318 !important; }
    [data-ogsc] .dorra-text-dark-body, u + .body .dorra-text-dark-body { color:#3d2f1f !important; }
    [data-ogsc] .dorra-text-dark-muted, u + .body .dorra-text-dark-muted { color:#7a6040 !important; }
    [data-ogsc] .dorra-panel, u + .body .dorra-panel { background-color:#ede3d0 !important; }
    [data-ogsc] .dorra-text-gold, u + .body .dorra-text-gold { color:#b8913c !important; }
  </style>
  </head>
  <body style="margin:0;padding:0;background-color:#01271a;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;">&nbsp;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#01271a" class="dorra-bg-dark" style="background-color:#01271a;">
    <tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" bgcolor="#01271a" class="dorra-bg-dark" style="background-color:#01271a;max-width:480px;">

      <tr><td align="center" bgcolor="#01271a" class="dorra-bg-dark" style="background-color:#01271a;padding:28px 24px 8px;">
        <img src="${LOGO_URL}" alt="Dorra" width="150" style="display:block;margin:0 auto;height:auto;max-width:150px"/>
      </td></tr>

      <tr><td align="center" bgcolor="#f5efe3" class="dorra-bg-light" style="background-color:#f5efe3;padding:24px;">
        ${content}
      </td></tr>

      <tr><td align="center" bgcolor="#01271a" class="dorra-bg-dark" style="background-color:#01271a;padding:16px 24px;border-top:1px solid rgba(184,145,60,0.15);">
        <p class="dorra-text-light-muted" style="font-size:10px;color:rgba(245,239,227,0.6);margin:0;letter-spacing:0.08em">
          dorrastonejewelry@gmail.com &nbsp;|&nbsp; @dorrastones
        </p>
      </td></tr>

    </table>
    </td></tr>
  </table>
  </body></html>`;
}

async function sendOrderConfirmation(order) {
  const html = baseTemplate(`
    <span class="dorra-text-gold" style="font-size:13px;letter-spacing:0.4em;text-transform:uppercase;color:#b8913c;display:block;margin-bottom:12px">Order Confirmed</span>
    <h2 class="dorra-text-dark" style="font-family:Georgia,serif;font-size:28px;font-weight:300;color:#062318;margin:0 0 8px">Thank you, ${order.customer.name.split(' ')[0]}.</h2>
    <p class="dorra-text-dark-muted" style="font-size:15px;color:#7a6040;line-height:1.85;margin:0 0 16px">Your order <strong class="dorra-text-dark" style="color:#062318">${order.ref}</strong> has been received. We will confirm by email within 24 hours and begin preparing your piece by hand in Egypt.</p>

    <table class="dorra-panel" width="100%" cellpadding="0" cellspacing="0" style="background:#ede3d0;padding:12px 16px;margin-bottom:16px;text-align:left">
      ${orderRows(order)}
      <tr>
        <td class="dorra-text-dark" style="padding-top:8px;border-top:1px solid rgba(26,18,10,.08);font-size:15px;font-weight:500;color:#062318">Total</td>
        <td class="dorra-text-dark" style="padding-top:8px;border-top:1px solid rgba(26,18,10,.08);font-size:15px;font-weight:500;color:#062318;text-align:right">${fmt(order.total)}</td>
      </tr>
    </table>

    ${order.dueNow > 0 && order.dueNow < order.total ? `
    <p class="dorra-text-gold" style="font-size:14px;color:#b8913c;margin-bottom:16px">Amount due now: ${fmt(order.dueNow)}  Remaining on delivery: ${fmt(order.dueOnDelivery)}</p>
    ` : ''}

    <div class="dorra-panel" style="background:#ede3d0;padding:14px 16px;margin-bottom:16px;text-align:left">
      <p class="dorra-text-dark-muted" style="font-size:11px;color:#7a6040;margin:0 0 4px;letter-spacing:0.12em;text-transform:uppercase">Delivery to</p>
      <p class="dorra-text-dark-body" style="font-size:13px;color:#3d2f1f;margin:0;line-height:1.7">${order.customer.address}, ${order.customer.city}</p>
    </div>

    ${order.payment === 'full_cod' ?
      `<p class="dorra-text-dark-muted" style="font-size:12px;color:#7a6040;line-height:1.7">Payment method: <strong>Cash on Delivery</strong></p>` :
      order.instapayRef ?
      `<p class="dorra-text-dark-muted" style="font-size:12px;color:#7a6040;line-height:1.7">Instapay reference <strong>${order.instapayRef}</strong> received. We will verify and confirm shortly.</p>` : ''
    }

    <p class="dorra-text-dark-muted" style="font-size:12px;color:#7a6040;line-height:1.8;margin-top:16px">
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
    <p class="dorra-text-dark" style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#062318;margin:0 0 12px;text-align:left">
      New Order: ${order.ref}
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;text-align:left">
      <tr><td class="dorra-text-dark-muted" style="font-size:12px;color:#7a6040;padding:4px 0;width:120px">Customer</td><td class="dorra-text-dark-body" style="font-size:12px;color:#3d2f1f">${order.customer.name}</td></tr>
      <tr><td class="dorra-text-dark-muted" style="font-size:12px;color:#7a6040;padding:4px 0">Phone</td><td class="dorra-text-dark-body" style="font-size:12px;color:#3d2f1f">${order.customer.phone}</td></tr>
      <tr><td class="dorra-text-dark-muted" style="font-size:12px;color:#7a6040;padding:4px 0">Email</td><td class="dorra-text-dark-body" style="font-size:12px;color:#3d2f1f">${order.customer.email}</td></tr>
      <tr><td class="dorra-text-dark-muted" style="font-size:12px;color:#7a6040;padding:4px 0">Address</td><td class="dorra-text-dark-body" style="font-size:12px;color:#3d2f1f">${order.customer.address}, ${order.customer.city}</td></tr>
      <tr><td class="dorra-text-dark-muted" style="font-size:12px;color:#7a6040;padding:4px 0">Payment</td><td class="dorra-text-dark-body" style="font-size:12px;color:#3d2f1f">${order.payment}</td></tr>
      <tr><td class="dorra-text-dark-muted" style="font-size:12px;color:#7a6040;padding:4px 0">Total</td><td class="dorra-text-dark" style="font-size:13px;color:#062318;font-weight:500">${fmt(order.total)}</td></tr>
      ${order.dueNow ? `<tr><td class="dorra-text-gold" style="font-size:12px;color:#b8913c;padding:4px 0">Due now</td><td class="dorra-text-gold" style="font-size:12px;color:#b8913c">${fmt(order.dueNow)}</td></tr>` : ''}
      ${order.instapayRef ? `<tr><td class="dorra-text-dark-muted" style="font-size:12px;color:#7a6040;padding:4px 0">Instapay ref</td><td class="dorra-text-dark-body" style="font-size:12px;color:#3d2f1f">${order.instapayRef}</td></tr>` : ''}
    </table>
    ${order.instapayScreenshot ? `<div style="text-align:left;margin-bottom:12px"><p class="dorra-text-dark-muted" style="font-size:11px;color:#7a6040;margin:0 0 6px">Payment proof:</p><img src="${order.instapayScreenshot}" alt="Payment proof" style="max-width:220px;display:block;border:1px solid rgba(26,18,10,.15)"/></div>` : ''}
    <table width="100%" cellpadding="0" cellspacing="0" style="text-align:left">${orderRows(order)}</table>
    ${order.customer.notes ? `<p class="dorra-text-dark-muted" style="font-size:12px;color:#7a6040;margin-top:12px;text-align:left">Notes: ${order.customer.notes}</p>` : ''}
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
    <p class="dorra-text-dark" style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#062318;margin:0 0 10px">
      Order Update — ${order.ref}
    </p>
    <p class="dorra-text-dark-muted" style="font-size:13px;color:#7a6040;line-height:1.8">${msg}</p>
    <p class="dorra-text-dark-muted" style="font-size:12px;color:#7a6040;margin-top:16px">Questions? Reply here or DM <strong>@dorrastones</strong>.</p>
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
    <p class="dorra-text-dark" style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#062318;margin:0 0 12px">
      New Review Pending Approval
    </p>
    <p class="dorra-text-dark-body" style="font-size:13px;color:#3d2f1f;line-height:1.8"><strong>${review.name}</strong>${review.piece ? ' — ' + review.piece : ''}</p>
    <p class="dorra-text-dark-muted" style="font-size:13px;color:#7a6040;line-height:1.8;font-style:italic">"${review.text}"</p>
    <p class="dorra-text-dark-muted" style="font-size:11px;color:#7a6040;margin-top:16px">Log in to your admin panel to approve or reject this review.</p>
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
    <p class="dorra-text-dark" style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#062318;margin:0 0 12px">
      New ${type} Request
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="text-align:left">
      <tr><td class="dorra-text-dark-muted" style="font-size:12px;color:#7a6040;padding:4px 0;width:110px">Order Ref</td><td class="dorra-text-dark-body" style="font-size:12px;color:#3d2f1f">${data.ref || ''}</td></tr>
      <tr><td class="dorra-text-dark-muted" style="font-size:12px;color:#7a6040;padding:4px 0">Name</td><td class="dorra-text-dark-body" style="font-size:12px;color:#3d2f1f">${data.name || ''}</td></tr>
      <tr><td class="dorra-text-dark-muted" style="font-size:12px;color:#7a6040;padding:4px 0">Address</td><td class="dorra-text-dark-body" style="font-size:12px;color:#3d2f1f">${data.address || ''}</td></tr>
      <tr><td class="dorra-text-dark-muted" style="font-size:12px;color:#7a6040;padding:4px 0">Reason</td><td class="dorra-text-dark-body" style="font-size:12px;color:#3d2f1f">${data.reason || ''}</td></tr>
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

const https = require('https');

function sendEmail({ from, to, subject, html }) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ from, to: [to], subject, html });
    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const r = JSON.parse(data);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('Email sent:', r.id);
          resolve(r);
        } else {
          console.error('Email error:', JSON.stringify(r));
          reject(new Error(r.message));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const transporter = { sendMail: ({ from, to, subject, html }) => sendEmail({ from, to, subject, html }) };
console.log('Resend email loaded');

function fmt(n) { return 'EGP ' + (n||0).toLocaleString(); }

function orderRows(order) {
  return (order.items||[]).map(i=>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #ede3d0;color:#3d2f1f;font-size:13px">${i.name}</td><td style="padding:8px 0;border-bottom:1px solid #ede3d0;font-size:13px;text-align:right">x${i.qty} ${fmt(i.price*i.qty)}</td></tr>`
  ).join('');
}

function base(content) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5efe3;font-family:Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto">
    <div style="background:#062318;padding:24px 40px;text-align:center">
      <img src="https://dorrastone.shop/logo-email.png" alt="Dorra" width="240" style="display:block;margin:0 auto;max-width:240px;height:auto;" />
    </div>
    <div style="padding:32px 40px;background:#f5efe3">${content}</div>
    <div style="background:#062318;padding:14px 40px;text-align:center">
      <p style="font-size:10px;color:rgba(245,239,227,.3);margin:0">dorrastonejewelry@gmail.com | <a href="https://www.instagram.com/dorrastones" style="color:rgba(245,239,227,.3);text-decoration:none;">@dorrastones</a></p>
    </div>
  </div></body></html>`;
}

const ADMIN = 'dorrastonejewelry@gmail.com';

async function sendOrderConfirmation(order) {
  console.log("Sending confirmation to:", order.customer.email);
  // Send to customer
  try {
    await transporter.sendMail({
      from: 'Dorra Jewelry <orders@dorrastone.shop>',
      to: order.customer.email,
      subject: `Your Dorra order ${order.ref} is confirmed`,
      html: base(`
        <p style="font-family:Georgia,serif;font-size:22px;font-weight:300;color:#062318">Thank you, ${(order.customer.name||'').split(' ')[0]}.</p>
        <p style="font-size:13px;color:#7a6040;line-height:1.8">Your order <strong>${order.ref}</strong> has been received. We will confirm within 24 hours.</p>
        <table width="100%">${orderRows(order)}<tr><td style="padding:12px 0 0;font-size:13px;color:#062318;font-weight:500">Total</td><td style="padding:12px 0 0;font-size:16px;color:#062318;text-align:right">${fmt(order.total)}</td></tr></table>
        <div style="background:#ede3d0;padding:14px 16px;margin:16px 0"><p style="font-size:13px;color:#3d2f1f;margin:0">${order.customer.address}, ${order.customer.city||'Cairo'}</p></div>
        <p style="font-size:12px;color:#7a6040">Questions? <a href="https://www.instagram.com/dorrastones" style="color:#b8913c;text-decoration:none;">DM us on Instagram @dorrastones</a></p>
      `),
    });
    console.log('Customer email sent to:', order.customer.email);
  } catch(e) { console.error('Customer email failed:', e.message); }
}

async function sendAdminNotification(order) {
  try {
    await transporter.sendMail({
      from: 'Dorra Orders <orders@dorrastone.shop>',
      to: ADMIN,
      subject: `[NEW ORDER] ${order.ref} — ${fmt(order.total)} — ${order.customer.name}`,
      html: base(`
        <p style="font-family:Georgia,serif;font-size:20px;font-weight:300;color:#062318">New Order: ${order.ref}</p>
        <table width="100%">
          <tr><td style="font-size:12px;color:#7a6040;padding:4px 0;width:100px">Customer</td><td style="font-size:12px">${order.customer.name}</td></tr>
          <tr><td style="font-size:12px;color:#7a6040;padding:4px 0">Phone</td><td style="font-size:12px">${order.customer.phone}</td></tr>
          <tr><td style="font-size:12px;color:#7a6040;padding:4px 0">Email</td><td style="font-size:12px">${order.customer.email}</td></tr>
          <tr><td style="font-size:12px;color:#7a6040;padding:4px 0">Address</td><td style="font-size:12px">${order.customer.address}, ${order.customer.city||''}</td></tr>
          <tr><td style="font-size:12px;color:#7a6040;padding:4px 0">Payment</td><td style="font-size:12px">${order.payment}</td></tr>
          <tr><td style="font-size:12px;color:#7a6040;padding:4px 0">Total</td><td style="font-size:13px;font-weight:500;color:#062318">${fmt(order.total)}</td></tr>
        </table>
        <table width="100%" style="margin-top:12px">${orderRows(order)}</table>
      `),
    });
    console.log('Admin email sent');
  } catch(e) { console.error('Admin email failed:', e.message); }
}

async function sendStatusUpdate(order) {
  const msg = {confirmed:'Your order is confirmed.',shipped:'Your piece is on its way.',delivered:'Your piece has been delivered.'}[order.status];
  if(!msg) return;
  try {
    await transporter.sendMail({
      from: 'Dorra Jewelry <orders@dorrastone.shop>',
      to: order.customer.email,
      subject: `Your Dorra order ${order.ref} — ${order.status}`,
      html: base(`<p style="font-size:13px;color:#7a6040;line-height:1.8">${msg}</p>`),
    });
  } catch(e) { console.error('Status email failed:', e.message); }
}

async function sendReviewNotification(review) {
  try {
    await transporter.sendMail({
      from: 'Dorra Reviews <orders@dorrastone.shop>',
      to: ADMIN,
      subject: `[NEW REVIEW] ${review.name} — pending approval`,
      html: base(`<p style="font-size:13px;color:#3d2f1f"><strong>${review.name}</strong>${review.piece?' — '+review.piece:''}</p><p style="font-size:13px;color:#7a6040;font-style:italic">"${review.text}"</p>`),
    });
  } catch(e) { console.error('Review email failed:', e.message); }
}

module.exports = { sendOrderConfirmation, sendAdminNotification, sendStatusUpdate, sendReviewNotification };

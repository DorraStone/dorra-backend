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
      <div style="background:#062318;padding:20px 40px;text-align:center">
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAV4AAAFeCAYAAADNK3caAAAqaUlEQVR42u3dd3zV1eH/8dfnzuwdwghhh733EFRQUVBUXFittYqzS63aoa2jtV/r6K+21dZa62qt2zorVbYge48QRkgC2Xve+1m/Pz4hCGJbrWg17+fjER8PMHDh5vLKuedzzvkYRv+uLiIi8rnx6SkQEVF4RUQUXhERUXhFRBReERFReEVEFF4REVF4RUQUXhERhVdERBReERGFV0REFF4REYVXREQUXhERhVdEROEVERGFV0RE4RUREYVXREThFRERhVdEROEVEVF4RURE4RURUXhFREThFRFReEVEROEVEVF4RUQUXhERUXhFRBReERFReEVEFF4REVF4RUQUXhERhVdERBReERGFV0REFF4REYVXREQUXhERhVdEROEVERGFV0RE4RUREYVXREThFRERhVdEROEVEVF4RURE4RURUXhFREThFRFReEVEROEVEVF4RUQUXhERUXhFRBReERFReEVEFF4REVF4RUQUXhERhVdERBReERGFV0REFF4REYVXREQUXhERhVdEROEVERGFV0RE4RUREYVXREThFRERhVdEROEVEVF4RURE4RURUXhFREThFRFReEVEROEVEVF4RUQUXj0FIiIKr4iIwisiIgqviIjCKyIiCq+IiMIrIiIKr4iIwisiovCKiIjCKyKi8IqIiMIrIqLwioiIwisiovCKiCi8IiKi8IqIKLwiIqLwiogovCIiovCKiCi8IiIKr4iIKLwiIgqviIgovCIiCq+IiCi8IiIKr4iIwisiIgqviIjCKyIiCq+IiMIrIiIKr4iIwisiovCKiIjCKyKi8IqIiMIrIqLwioiIwisiovCKiCi8IiKi8IqIKLwiIqLwiogovCIiovCKiCi8Il9NruviunoeROEV+Xyiazskxobx+wxc1VcUXpHjHF3Lpkt6Ej+9cDqXnTwKw3UVX1F45TgFB3AdB9eycaMmbiSK2xo59kckimtZuI7zlYtut8wUrjt9Ik8sXEdr1OLK08YrvvIRhtG/q14R8qlCi+2AbYHjQjBAYmICmakpdM1Mp3NGGqnJiaQnJxEMBHBdl8aWVuobGymrqmVv8UGKyypoqKsHx4FAEMP/5R0HuI5LdnoSV88cz7NLN7G9oAR8Pr4+fTRBv5+n3luLpZeNKLzy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4TCpSQn0y8nmJ9deBo7zkXN3XceB5lbmnXUqoWCQtZu3695soqkG6UDxDQVZvXEbp8y/iUkjh5KRkkQwECC3T08c1+Wnv/szlbV1LF27iaaGpiPO3nU/MnNhQGuE0soazL4WV59/JnExMfzfo09TeLDUG0EbkJCUyOVfm8v3Lj2PC79/J6ZpevPAIgqvdJj4BoPUNzbxj4XL27b+AkbbmzDH8eZkg4GPHnh+rOtypsnzCxZxysTRRCyby+acxqmTxrJm6w72FB4kNTmBqWOG0zkjjfk/uY+1G7ZghMP6IojCKx1z2uGTr6M9sryWY0MoxHNvvsvUUcO4bM5MWiNRMlOTmXPyFELBIH6/j9WbdzDrmh+wWtEVhVfk02fXdfFuYOnzYVoO3/n5ryk4UMplc2aSnpJEayRKfmExf3vrPZ587R0a6howtGFCFF6RTxjetmVnsTFhtu8uYMmajd6UhM9Hq2lxzyNP8OiLb5DdOZNI1GRv0UEiTU0QDOpUMlF4RT6NxLg4YmJiWLt1J9fceT81NbXtF8kMnwGhEJU1tVRWVnvzxn6/phbkf4ruQCFfKn4DbvrGRdQ0NPLC2wupqa3TygRReEWO7wvWwLHa7k4RDB5xvzYRTTWIHAeu63p3odCOM/kS03BBREThFRFReEVEROEVEVF4RURE4RURUXhFREThFRFReEVEFF4REVF4RUQUXhERUXhFRBReERFReEVEFF4REYVXREQUXhERhVdERBReERGFV0REFF4REYVXREThFRERhVdEROEVERGFV0RE4RUREYVXREThFRFReEVEROEVEVF4RURE4RURUXhFREThFRFReEVEFF4REVF4RUQUXhERUXhFRBReERFReEVEFF4REYVXREQUXhERhVdERBReERGFV0REFF4REYVXREThFRERhVdEROEVERGFV0RE4RUREYVXREThFRFReEVEROEVEVF4RURE4RURUXhFREThFRFReEVEFF4REVF4RUQUXhERUXhFRBReERFReEVEFF4REYVXREQUXhERhVdERBReERGFV0REFF4REYVXREThFRERhVdEROEVERGFV0RE4RUREYVXREThFRERhVdEROEVEVF4RURE4RURUXhFREThFRFReEVEROEVEVF4RUQUXhERUXhFRBReERFReEVEFF4REVF4RUQUXhERhVdERBReERGFV0REFF4REYVXREQUXhERhVdEROEVERGFV0RE4RUREYVXREThFRERhVdEROEVEVF4RURE4RURUXhFREThFRFReEVEROEVEVF4RUQUXhERUXhFRBReERFReEVEvhT+P0hEfFEz56laAAAAAElFTkSuQmCC" alt="Dorra" style="height:70px;width:auto;display:inline-block;"/>
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
    to: 'dorrastonejewelry@gmail.com',
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
    to: 'dorrastonejewelry@gmail.com',
    subject: `[NEW REVIEW] ${review.name} — pending approval`,
    html: baseTemplate(`
      <p style="font-size:13px;color:#3d2f1f"><strong>${review.name}</strong>${review.piece ? ' — ' + review.piece : ''}</p>
      <p style="font-size:13px;color:#7a6040;font-style:italic">"${review.text}"</p>
    `),
  });
}

console.log('Resend email service loaded');
module.exports = { sendOrderConfirmation, sendAdminNotification, sendStatusUpdate, sendReviewNotification };

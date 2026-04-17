import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendOTP = async (to, otp, name) => {
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM || 'UCOS System <noreply@ucos.edu>',
    to,
    subject: 'UCOS — Email Verification OTP',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #ddd;border-radius:8px">
        <h2 style="color:#1B4F72">UCOS — Universal Course Opting System</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Your email verification OTP is:</p>
        <div style="font-size:32px;font-weight:bold;color:#2E86C1;text-align:center;padding:16px;background:#EAF4FB;border-radius:6px;letter-spacing:8px">${otp}</div>
        <p style="color:#888;font-size:12px">Valid for 10 minutes. Do not share this OTP.</p>
      </div>
    `,
  });
};

const sendAllocationResult = async (to, name, courses) => {
  const courseRows = courses.map((c, i) =>
    `<tr><td style="padding:8px;border:1px solid #ddd">${i+1}</td>
     <td style="padding:8px;border:1px solid #ddd"><strong>${c.course_name}</strong></td>
     <td style="padding:8px;border:1px solid #ddd">${c.subject_code || '-'}</td>
     <td style="padding:8px;border:1px solid #ddd">${c.seat_code}</td>
     <td style="padding:8px;border:1px solid #ddd">${c.token_code}</td></tr>`
  ).join('');

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to,
    subject: 'UCOS — Your Final Course Allocation',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #ddd;border-radius:8px">
        <h2 style="color:#1B4F72">Course Allocation Result</h2>
        <p>Hi <strong>${name}</strong>, your elective courses have been finalized:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <thead>
            <tr style="background:#1B4F72;color:white">
              <th style="padding:8px">#</th>
              <th style="padding:8px">Course</th>
              <th style="padding:8px">Code</th>
              <th style="padding:8px">Seat</th>
              <th style="padding:8px">Token</th>
            </tr>
          </thead>
          <tbody>${courseRows}</tbody>
        </table>
        <p style="color:#888;font-size:12px">This is an automated message from UCOS.</p>
      </div>
    `,
  });
};

const sendStudentCredentials = async (to, name, credentials) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'UCOS System <noreply@ucos.edu>',
    to,
    subject: 'UCOS — Your Student Login Credentials',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #ddd;border-radius:8px">
        <h2 style="color:#1B4F72">UCOS Student Account Ready</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Your faculty has created your account. Use these credentials to sign in:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tbody>
            <tr><td style="padding:10px;border:1px solid #ddd;font-weight:bold">Admin ID</td><td style="padding:10px;border:1px solid #ddd">${credentials.admin_id}</td></tr>
            <tr><td style="padding:10px;border:1px solid #ddd;font-weight:bold">Register Number</td><td style="padding:10px;border:1px solid #ddd">${credentials.register_number}</td></tr>
            <tr><td style="padding:10px;border:1px solid #ddd;font-weight:bold">Email</td><td style="padding:10px;border:1px solid #ddd">${credentials.email}</td></tr>
            <tr><td style="padding:10px;border:1px solid #ddd;font-weight:bold">Temporary Password</td><td style="padding:10px;border:1px solid #ddd"><strong>${credentials.password}</strong></td></tr>
          </tbody>
        </table>
        <p>Please sign in and change your password after first login.</p>
      </div>
    `,
  });
};

export { sendOTP, sendAllocationResult, sendStudentCredentials  };

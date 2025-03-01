import nodemailer, {
  Transporter,
  SentMessageInfo,
  SendMailOptions,
} from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

interface iMailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendMail = async (options: iMailOptions) => {
  const transporter: Transporter<SentMessageInfo> = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    service: process.env.SMTP_SERVICE,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  } as SendMailOptions);

  const { to, subject, html } = options;

  const mailOptions = {
    from: process.env.SMTP_USER,
    to,
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
};

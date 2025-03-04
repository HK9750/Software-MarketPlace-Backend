import nodemailer, {
    Transporter,
    SentMessageInfo,
    SendMailOptions,
} from 'nodemailer';
import dotenv from 'dotenv';
import config from '../config';

dotenv.config();

interface iMailOptions {
    to: string;
    subject: string;
    html: string;
}

export const sendMail = async (options: iMailOptions) => {
    const transporter: Transporter<SentMessageInfo> =
        nodemailer.createTransport({
            host: config.SMTP_HOST,
            port: config.SMTP_PORT,
            service: config.SMTP_SERVICE,
            auth: {
                user: config.SMTP_USER,
                pass: config.SMTP_PASS,
            },
        } as SendMailOptions);

    const { to, subject, html } = options;

    const mailOptions = {
        from: config.SMTP_USER,
        to,
        subject,
        html,
    };

    await transporter.sendMail(mailOptions);
};

import dotenv from 'dotenv';
dotenv.config();

const config = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 8000,

    DATABASE_URL: process.env.DATABASE_URL || '',
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED || '',

    ACTIVATION_EXPIRY: process.env.ACTIVATION_EXPIRY || '5m',
    ACTIVATION_SECRET: (process.env.ACTIVATION_SECRET ||
        'default_activation_secret') as string,

    JWT_REFRESH_SECRET_EXPIRY: process.env.JWT_REFRESH_SECRET_EXPIRY || '20m',
    JWT_REFRESH_SECRET: (process.env.JWT_REFRESH_SECRET ||
        'default_refresh_secret') as string,

    JWT_ACCESS_SECRET_EXPIRY: (process.env.JWT_ACCESS_SECRET_EXPIRY ||
        '10m') as string,
    JWT_ACCESS_SECRET: (process.env.JWT_ACCESS_SECRET ||
        'default_access_secret') as string,

    RESET_SECRET: (process.env.RESET_SECRET ||
        'default_reset_secret') as string,
    RESET_SECRET_EXPIRY: (process.env.RESET_SECRET_EXPIRY || '5m') as string,

    SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    SMTP_SERVICE: process.env.SMTP_SERVICE || 'gmail',
    SMTP_USER: process.env.SMTP_USER || '',
    SMTP_PASS: process.env.SMTP_PASS || '',
    SMTP_PORT: process.env.SMTP_PORT || 465,

    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
};

export default config;

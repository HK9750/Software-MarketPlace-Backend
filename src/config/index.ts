import dotenv from 'dotenv';
dotenv.config();

const config = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: Number(process.env.PORT) || 8000,

    DATABASE_URL: process.env.DATABASE_URL || '',
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED || '',

    ACTIVATION_EXPIRY: Number(process.env.ACTIVATION_EXPIRY) || 300,
    ACTIVATION_SECRET:
        process.env.ACTIVATION_SECRET || 'default_activation_secret',

    JWT_REFRESH_SECRET_EXPIRY:
        Number(process.env.JWT_REFRESH_SECRET_EXPIRY) || 1728000,
    JWT_REFRESH_SECRET:
        process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',

    JWT_ACCESS_SECRET_EXPIRY:
        Number(process.env.JWT_ACCESS_SECRET_EXPIRY) || 86400,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'default_access_secret',

    RESET_SECRET_EXPIRY: Number(process.env.RESET_SECRET_EXPIRY) || 300,
    RESET_SECRET: process.env.RESET_SECRET || 'default_reset_secret',

    CLOUD_NAME: process.env.CLOUD_NAME || '',
    CLOUD_API_KEY: process.env.CLOUD_API_KEY || '',
    CLOUD_SECRET_KEY: process.env.CLOUD_SECRET_KEY || '',

    SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    SMTP_SERVICE: process.env.SMTP_SERVICE || 'gmail',
    SMTP_USER: process.env.SMTP_USER || '',
    SMTP_PASS: process.env.SMTP_PASS || '',
    SMTP_PORT: Number(process.env.SMTP_PORT) || 465,

    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
    REDIS_URL: process.env.REDIS_URL || '',
};

export default config;

import { v2 as cloudinary } from 'cloudinary';
import config from '../config';
import fs from 'fs';

cloudinary.config({
    cloud_name: config.CLOUD_NAME,
    api_key: config.CLOUD_API_KEY,
    api_secret: config.CLOUD_SECRET_KEY,
});

export const uploadOnCloudinary = async (localFilePath: string) => {
    try {
        if (!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto',
        });

        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath);
        return null;
    }
};

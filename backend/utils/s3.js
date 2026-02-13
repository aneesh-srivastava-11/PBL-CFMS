const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { PutObjectCommand } = require('@aws-sdk/client-s3');

// ... existing code ...

const getPresignedUploadUrl = async (key, contentType) => {
    const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        ContentType: contentType
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes
    return url;
};

module.exports = { uploadFile, getFileStream, deleteFile, getPresignedUploadUrl };

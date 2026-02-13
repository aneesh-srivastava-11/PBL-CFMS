const { S3Client, GetObjectCommand, DeleteObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_ENDPOINT, // Support for Supabase/MinIO
    forcePathStyle: true, // Required for Supabase
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const uploadFile = (file) => {
    const fileStream = fs.createReadStream(file.path);

    const upload = new Upload({
        client: s3,
        params: {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: file.filename,
            Body: fileStream,
        },
    });

    return upload.done();
};

const getFileStream = async (fileKey) => {
    const downloadParams = {
        Key: fileKey,
        Bucket: process.env.AWS_BUCKET_NAME
    };

    const command = new GetObjectCommand(downloadParams);
    const response = await s3.send(command);
    return response.Body; // Requesting the stream from the response
};

const deleteFile = (fileKey) => {
    const deleteParams = {
        Key: fileKey,
        Bucket: process.env.AWS_BUCKET_NAME
    };

    const command = new DeleteObjectCommand(deleteParams);
    return s3.send(command);
};

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

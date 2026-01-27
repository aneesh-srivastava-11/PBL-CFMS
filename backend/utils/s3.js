const { S3Client, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const fs = require('fs');

const s3 = new S3Client({
    region: process.env.AWS_REGION,
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

module.exports = { uploadFile, getFileStream, deleteFile };

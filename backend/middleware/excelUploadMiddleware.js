const multer = require('multer');
const path = require('path');

// Use Memory Storage for Excel processing (no need to save to disk)
const storage = multer.memoryStorage();

const checkFileType = (file, cb) => {
    // Allowed extensions
    const filetypes = /xlsx|xls/;
    // Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime (optional, sometimes unreliable for Excel, trusting ext for now or generic app types)
    const mimetype = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel';

    // Loosen mime check slightly as it can vary, but strict on extension
    if (extname) {
        return cb(null, true);
    } else {
        cb('Error: Excel Files Only!');
    }
};

const excelUpload = multer({
    storage,
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
});

module.exports = excelUpload;

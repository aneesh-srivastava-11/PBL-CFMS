const ExcelJS = require('exceljs');

const generateMock = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Students');

    worksheet.columns = [
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Section', key: 'section', width: 10 },
        { header: 'Semester', key: 'semester', width: 15 }
    ];

    worksheet.addRows([
        { email: 'student1@example.com', section: 'A', semester: 'Fall 2025' },
        { email: 'student2@example.com', section: 'B', semester: 'Fall 2025' },
        { email: 'student3@example.com', section: 'A', semester: 'Fall 2025' },
        { email: 'missing_user@example.com', section: 'C', semester: 'Fall 2025' }, // Expected to fail
        { email: '', section: 'D', semester: 'Fall 2025' } // Empty email, should be skipped
    ]);

    await workbook.xlsx.writeFile('mock_enrollment.xlsx');
    console.log('Mock Excel file created: mock_enrollment.xlsx');
};

generateMock();

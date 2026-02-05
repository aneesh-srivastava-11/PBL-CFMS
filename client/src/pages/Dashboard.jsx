import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import { Book, User as UserIcon, Folder as FolderIcon, FolderOpen, ChevronDown, Download, Trash2, Eye, EyeOff, XCircle, CheckCircle } from "lucide-react";

const Dashboard = () => {
    console.log("Dashboard rendering");
    console.log("VITE_API_URL:", import.meta.env.VITE_API_URL);
    const { user, logout, loading, updateUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [newCourse, setNewCourse] = useState({ course_code: '', course_name: '', semester: '' });
    const [studentEmail, setStudentEmail] = useState(''); // Enrollment State
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [file, setFile] = useState(null);
    const [fileType, setFileType] = useState('handout');
    const [uploadStatus, setUploadStatus] = useState('');
    const [courseFiles, setCourseFiles] = useState([]);
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [missingFiles, setMissingFiles] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState({}); // Folder State
    const [enrolledStudents, setEnrolledStudents] = useState([]); // Enrolled Students State
    const [studentSearchQuery, setStudentSearchQuery] = useState(''); // Search filter

    // Bulk Upload & Edit State
    const [previewData, setPreviewData] = useState(null);
    const [showBulkPreviewModal, setShowBulkPreviewModal] = useState(false);
    const [pendingBulkFile, setPendingBulkFile] = useState(null);
    const [studentToEdit, setStudentToEdit] = useState(null);
    const [editForm, setEditForm] = useState({ section: '', academic_semester: '' });

    const requiredTypes = [
        'handout', 'attendance', 'assignment', 'marks',
        'academic_feedback', 'action_taken', 'exam_paper',
        'remedial', 'case_study', 'quiz', 'quiz_solution',
        'exam_solution', 'assignment_solution'
    ];

    useEffect(() => {
        if (!loading && !user) {
            navigate('/login');
        } else if (user) {
            fetchCourses();
        }
    }, [user, loading, navigate]);

    useEffect(() => {
        if (selectedCourse) {
            fetchCourseFiles(selectedCourse.id);
            if (user && user.is_coordinator) {
                fetchEnrolledStudents(selectedCourse.id);
            }
        } else {
            setCourseFiles([]);
            setEnrolledStudents([]);
        }
    }, [selectedCourse, user]);

    const fetchCourses = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/courses`, config);
            console.log("Fetched courses data:", data);
            if (Array.isArray(data)) {
                setCourses(data);
            } else {
                console.error("API did not return an array for courses:", data);
                setCourses([]);
            }
        } catch (error) {
            console.error('Error fetching courses', error);
        }
    };

    const fetchCourseFiles = async (courseId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/files/course/${courseId}`, config);
            setCourseFiles(data);
        } catch (error) {
            console.error('Error fetching files', error);
        }
    };

    const fetchEnrolledStudents = async (courseId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/enroll/${courseId}`, config);
            setEnrolledStudents(data);
        } catch (error) {
            console.error('Error fetching enrolled students', error);
        }
    };

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.post(`${import.meta.env.VITE_API_URL}/api/courses`, newCourse, config);
            setNewCourse({ course_code: '', course_name: '', semester: '' });
            fetchCourses();
        } catch (error) {
            console.error(error);
        }
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!file || !selectedCourse) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('course_id', selectedCourse.id);
        formData.append('file_type', fileType);

        try {
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${user.token}`
                }
            };
            const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/files/upload`, formData, config);
            setUploadStatus(`Uploaded: ${data.filePath}`);
            setFile(null);
            fetchCourseFiles(selectedCourse.id);
        } catch (error) {
            setUploadStatus('Upload failed');
        }
    };

    const handleDownloadFile = async (e, fileId, fileName) => {
        e.preventDefault();
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
                responseType: 'blob'
            };
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/files/${fileId}/download`, config);

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Download failed', error);
            alert('Download failed');
        }
    };

    const handleDownloadZip = async () => {
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
                responseType: 'blob'
            };
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/courses/${selectedCourse.id}/download`, config);

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${selectedCourse.course_code}_files.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Download failed', error);
            alert('Failed to download course file.');
        }
    };

    const handleDeleteFile = async (fileId) => {
        if (!window.confirm('Are you sure you want to delete this file?')) return;
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/files/${fileId}`, config);
            fetchCourseFiles(selectedCourse.id);
        } catch (error) {
            console.error('Delete failed', error);
            alert('Failed to delete file');
        }
    };

    const handleDeleteCourse = async (courseId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/courses/${courseId}`, config);

            // If the deleted course was selected, deselect it
            if (selectedCourse?.id === courseId) {
                setSelectedCourse(null);
                setCourseFiles([]);
            }

            fetchCourses(); // Refresh list
        } catch (error) {
            console.error('Course delete failed', error);
            alert('Failed to delete course');
        }
    };

    const handleToggleVisibility = async (fileId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.patch(`${import.meta.env.VITE_API_URL}/api/files/${fileId}/visibility`, {}, config);
            fetchCourseFiles(selectedCourse.id);
        } catch (error) {
            console.error('Visibility toggle failed', error);
            alert('Failed to update visibility');
        }
    };

    const handleToggleCoordinator = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.put(`${import.meta.env.VITE_API_URL}/api/auth/toggle-coordinator`, {}, config);
            updateUser({ is_coordinator: data.is_coordinator });
            alert(data.message);
        } catch (error) {
            console.error(error);
            alert('Failed to toggle status');
        }
    };

    const handleEnrollStudent = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.post(`${import.meta.env.VITE_API_URL}/api/enroll/${selectedCourse.id}`, { studentEmail }, config);
            alert('Student enrolled successfully!');
            fetchEnrolledStudents(selectedCourse.id);
            setStudentEmail('');
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.message || 'Enrollment failed');
        }
    };

    const handleDeleteEnrollment = async (studentId, studentName) => {
        if (!window.confirm(`Remove ${studentName} from this course?`)) return;
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/enroll/${selectedCourse.id}/${studentId}`, config);
            alert('Student removed successfully');
            fetchEnrolledStudents(selectedCourse.id);
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.message || 'Failed to remove enrollment');
        }
    };

    const handleGenerateCourseFile = async (force = false) => {
        if (!selectedCourse) return;
        setIsGenerating(true);
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
                responseType: 'arraybuffer' // Important for PDF
            };
            // Send force flag
            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/courses/${selectedCourse.id}/generate-pdf`,
                { force },
                config
            );

            // If successful, download PDF
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${selectedCourse.course_code}_CourseFile.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            setShowValidationModal(false);
            setMissingFiles([]);
        } catch (error) {
            console.error('Generation failed', error);

            if (error.response && error.response.data) {
                // Convert ArrayBuffer to string
                try {
                    const decoder = new TextDecoder('utf-8');
                    const jsonString = decoder.decode(error.response.data);
                    const errorData = JSON.parse(jsonString);

                    if (error.response.status === 400 && errorData.missing) {
                        setMissingFiles(errorData.missing);
                        setShowValidationModal(true);
                        return; // Handled
                    }

                    // Alert other specific errors
                    alert(errorData.message || 'Failed to generate course file.');
                } catch (parseError) {
                    // Fallback if parsing fails
                    alert('Failed to generate course file. (Parse Error)');
                }
            } else {
                alert('Failed to generate course file.');
            }
        } finally {
            setIsGenerating(false);
        }
    };


    if (loading || !user) return <div className="flex justify-center items-center h-screen text-orange-600">Loading...</div>;

    return (
        <div className="flex min-h-screen bg-gray-50 font-sans text-gray-800">
            {/* 1. Sidebar */}
            <Sidebar user={user} onLogout={logout} />

            {/* 2. Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <TopHeader user={user} />

                {/* Scrollable Content */}
                <main className="flex-1 overflow-y-auto p-6 md:p-8">

                    {/* Top Info Card */}
                    <div className="bg-white rounded-lg shadow-sm border-t-4 border-orange-500 p-6 mb-8">
                        <div className="flex items-center space-x-2 mb-4">
                            <UserIcon className="h-5 w-5 text-gray-600" />
                            <h2 className="text-lg font-bold text-gray-700">Class Coordinator Information</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
                            <div>
                                <p className="text-gray-500 text-xs uppercase font-semibold">Name:</p>
                                <p className="font-medium text-orange-600">{user.name}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs uppercase font-semibold">Email:</p>
                                <p className="font-medium text-blue-500 hover:underline cursor-pointer">{user.email}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs uppercase font-semibold">Phone:</p>
                                <p className="font-medium text-blue-500">9650789932</p> {/* Mock Data as per screenshot */}
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs uppercase font-semibold">Department:</p>
                                <p className="font-medium text-blue-500">DOCSE</p>
                            </div>
                        </div>
                    </div>

                    {/* Main Grid: Courses List (Left) & Course Details (Right) */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">

                        {/* LEFT COLUMN: List of Courses (Notifications in screenshot) */}
                        <div className="lg:col-span-1 bg-white rounded-lg shadow-sm flex flex-col h-fit md:min-h-[500px]">
                            <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                                <h3 className="font-bold text-lg text-gray-800 border-l-4 border-black pl-3">Your Courses</h3>
                            </div>

                            {/* Course List */}
                            <div className="p-0">
                                {courses.length === 0 ? (
                                    <div className="p-6 text-center text-gray-500">No courses found.</div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {courses.map(course => (
                                            <div
                                                key={course.id}
                                                onClick={() => setSelectedCourse(course)}
                                                className={`p-4 cursor-pointer transition-all hover:bg-orange-50 border-l-4 
                                                    ${selectedCourse?.id === course.id ? 'border-orange-500 bg-orange-50' : 'border-transparent'}`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-semibold text-gray-800">{course.course_name}</h4>
                                                        <p className="text-sm text-gray-500 font-medium">{course.course_code}</p>
                                                    </div>
                                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{course.semester}</span>
                                                </div>
                                                {user.role === 'faculty' && (
                                                    <button
                                                        className="text-xs text-red-400 hover:text-red-600 mt-2 hover:underline"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm(`Delete course ${course.course_code}?`)) {
                                                                handleDeleteCourse(course.id);
                                                            }
                                                        }}
                                                    >
                                                        Delete Course
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Add Course Button (Faculty Only) */}
                            {user.role === 'faculty' && (
                                <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-lg">
                                    <h4 className="text-sm font-semibold mb-2 text-gray-600">Add New Course</h4>
                                    <form onSubmit={handleCreateCourse} className="space-y-2">
                                        <input className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500" placeholder="Code (e.g. CS101)" value={newCourse.course_code} onChange={e => setNewCourse({ ...newCourse, course_code: e.target.value })} required />
                                        <input className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500" placeholder="Name" value={newCourse.course_name} onChange={e => setNewCourse({ ...newCourse, course_name: e.target.value })} required />
                                        <input className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500" placeholder="Semester" value={newCourse.semester} onChange={e => setNewCourse({ ...newCourse, semester: e.target.value })} required />
                                        <button type="submit" className="w-full bg-orange-600 text-white text-sm font-medium py-2 rounded hover:bg-orange-700 transition">Add Course</button>
                                    </form>
                                </div>
                            )}
                        </div>

                        {/* RIGHT COLUMN: Selected Course Content (List of Events in screenshot) */}
                        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm min-h-[500px] flex flex-col">
                            <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-lg flex justify-between items-center">
                                <h3 className="font-bold text-lg text-gray-800 border-l-4 border-orange-500 pl-3">
                                    {selectedCourse ? `Manage: ${selectedCourse.course_name}` : 'Course Details'}
                                </h3>
                                {selectedCourse && user.role === 'faculty' && (
                                    <div className="flex gap-2">
                                        <button onClick={handleDownloadZip} className="text-xs bg-white border border-orange-500 text-orange-600 px-3 py-1.5 rounded hover:bg-orange-50 transition">Download Zip</button>
                                        {user.is_coordinator && (
                                            <button onClick={() => handleGenerateCourseFile(false)} disabled={isGenerating} className="text-xs bg-orange-600 text-white px-3 py-1.5 rounded hover:bg-orange-700 transition">
                                                {isGenerating ? 'Wait...' : 'Generate PDF'}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="p-6 flex-1">
                                {!selectedCourse ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                                        <Book className="h-16 w-16 opacity-20" />
                                        <p>Select a course from the left to view details and manage files.</p>
                                    </div>
                                ) : (
                                    <div className="animate-fade-in">

                                        {/* Upload Section */}
                                        {user.role === 'faculty' && (
                                            <div className="bg-orange-50 border border-orange-100 rounded p-4 mb-6">
                                                <h4 className="text-sm font-bold text-orange-800 mb-3 uppercase tracking-wide">Upload Document</h4>
                                                <form onSubmit={handleFileUpload} className="flex flex-col md:flex-row gap-3 items-end">
                                                    <div className="flex-1 w-full">
                                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">File</label>
                                                        <input type="file" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200" onChange={e => setFile(e.target.files[0])} required />
                                                    </div>
                                                    <div className="w-full md:w-48">
                                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Type</label>
                                                        <select className="w-full text-sm border-gray-300 rounded focus:border-orange-500 focus:ring-orange-500 p-2" value={fileType} onChange={e => setFileType(e.target.value)}>
                                                            <option value="handout">Handout</option>
                                                            <option value="attendance">Attendance</option>
                                                            <option value="assignment">Assignment</option>
                                                            <option value="marks">Marks</option>
                                                            <option value="materials">Materials</option> {/* ADDED MATERIALS */}
                                                            <option value="academic_feedback">Academic Feedback</option>
                                                            <option value="action_taken">Action Taken</option>
                                                            <option value="exam_paper">Exam Paper</option>
                                                            <option value="remedial">Remedial Assignment</option>
                                                            <option value="case_study">Case Study</option>
                                                            <option value="quiz">Quiz</option>
                                                            <option value="quiz_solution">Quiz Solution</option>
                                                            <option value="exam_solution">Exam Solution</option>
                                                            <option value="assignment_solution">Assignment Solution</option>
                                                            <option value="other">Others</option>
                                                        </select>
                                                    </div>
                                                    <button type="submit" className="w-full md:w-auto bg-orange-600 text-white text-sm font-bold py-2 px-6 rounded hover:bg-orange-700 transition">Upload</button>
                                                </form>
                                                {uploadStatus && <p className="text-xs text-green-600 mt-2 font-medium">{uploadStatus}</p>}
                                            </div>
                                        )}

                                        {/* Files List */}
                                        <div className="space-y-4">
                                            {/* ENROLLMENT SECTION (Coordinator) */}
                                            {user.is_coordinator && (
                                                <div className="border border-green-200 bg-green-50 rounded-lg p-4 mb-6">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <h4 className="font-bold text-green-800 flex items-center gap-2">
                                                            <UserIcon size={16} /> Student Enrollment
                                                        </h4>
                                                        <button
                                                            onClick={() => fetchEnrolledStudents(selectedCourse.id)}
                                                            className="text-xs text-green-600 hover:underline"
                                                        >
                                                            Refresh List ({enrolledStudents.length})
                                                        </button>
                                                    </div>

                                                    {/* Quick Enroll */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <h5 className="text-xs font-semibold text-gray-500 mb-2">Single Enroll</h5>
                                                            <form onSubmit={handleEnrollStudent} className="flex gap-2">
                                                                <input className="flex-1 text-sm border border-gray-300 rounded p-2 focus:ring-green-500 focus:border-green-500" placeholder="Student Email" value={studentEmail} onChange={e => setStudentEmail(e.target.value)} required />
                                                                <button type="submit" className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">Add</button>
                                                            </form>
                                                        </div>
                                                        <div className="border-l border-green-200 pl-4">
                                                            <h5 className="text-xs font-semibold text-gray-500 mb-2">Bulk Enroll</h5>
                                                            <form onSubmit={async (e) => {
                                                                e.preventDefault();
                                                                const fileInput = e.target.elements.files;
                                                                if (!fileInput || !fileInput.files[0]) { alert('Please select a file'); return; }
                                                                const formData = new FormData();
                                                                formData.append('file', fileInput.files[0]);
                                                                try {
                                                                    const config = { headers: { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'multipart/form-data' } };
                                                                    await axios.post(`${import.meta.env.VITE_API_URL}/api/enroll/${selectedCourse.id}/bulk`, formData, config);
                                                                    alert('Uploaded!'); fetchEnrolledStudents(selectedCourse.id); e.target.reset();
                                                                } catch (err) { alert('Failed'); }
                                                            }} className="flex gap-2">
                                                                <input type="file" name="files" accept=".xlsx, .xls" className="flex-1 text-sm text-gray-500" required />
                                                                <button type="submit" className="text-xs border border-green-600 text-green-700 px-3 py-1 rounded hover:bg-green-50">Upload Excel</button>
                                                            </form>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* FILES DISPLAY */}
                                            {courseFiles.length > 0 ? (
                                                Object.entries(courseFiles.reduce((acc, file) => {
                                                    const type = file.file_type || 'other';
                                                    if (!acc[type]) acc[type] = [];
                                                    acc[type].push(file);
                                                    return acc;
                                                }, {})).map(([type, files]) => (
                                                    <div key={type} className="border border-gray-200 rounded-lg overflow-hidden">
                                                        <div
                                                            className="bg-gray-50 px-4 py-3 cursor-pointer flex justify-between items-center hover:bg-gray-100 transition"
                                                            onClick={() => setExpandedFolders(prev => ({ ...prev, [type]: !prev[type] }))}
                                                        >
                                                            <div className="flex items-center gap-2 font-medium text-gray-700 capitalize">
                                                                {expandedFolders[type] ? <FolderOpen size={18} className="text-orange-500" /> : <FolderIcon size={18} className="text-orange-400" />}
                                                                {type.replace(/_/g, ' ')}
                                                                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">{files.length}</span>
                                                            </div>
                                                            <ChevronDown size={16} className={`text-gray-400 transition-transform ${expandedFolders[type] ? 'rotate-180' : ''}`} />
                                                        </div>

                                                        {expandedFolders[type] && (
                                                            <div className="bg-white p-2 space-y-1 border-t border-gray-100">
                                                                {files.map(doc => (
                                                                    <div key={doc.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded group">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded flex items-center justify-center text-xs font-bold uppercase">
                                                                                {doc.filename.split('.').pop()}
                                                                            </div>
                                                                            <div className="flex flex-col">
                                                                                <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{doc.filename}</span>
                                                                                <span className="text-xs text-gray-400">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            {user.role === 'faculty' && (
                                                                                <button onClick={() => handleToggleVisibility(doc.id)} className={`p-1 rounded ${doc.is_visible ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`} title="Toggle Visibility">
                                                                                    {doc.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
                                                                                </button>
                                                                            )}
                                                                            <button onClick={(e) => handleDownloadFile(e, doc.id, doc.filename)} className="p-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100" title="Download">
                                                                                <Download size={14} />
                                                                            </button>
                                                                            {user.role === 'faculty' && (
                                                                                <button onClick={() => handleDeleteFile(doc.id)} className="p-1 bg-red-50 text-red-600 rounded hover:bg-red-100" title="Delete">
                                                                                    <Trash2 size={14} />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                                    <p className="text-gray-500 text-sm">No files uploaded in this course yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* Validation Modal (Course File Generation) */}
            {showValidationModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Incomplete Course File</h3>
                        <p className="text-sm text-gray-600 mb-4">The following mandatory documents are missing:</p>
                        <div className="max-h-60 overflow-y-auto space-y-2 mb-6">
                            {requiredTypes.map(type => (
                                <div key={type} className={`flex items-center justify-between p-2 rounded text-sm ${missingFiles.includes(type) ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                                    <span className="capitalize">{type.replace(/_/g, ' ')}</span>
                                    {missingFiles.includes(type) ? <XCircle size={16} /> : <CheckCircle size={16} />}
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowValidationModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                            <button onClick={() => handleGenerateCourseFile(true)} className="px-4 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700">Force Generate</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Student Modal */}
            {
                studentToEdit && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-2">Edit Student Details</h3>
                            <p className="text-sm text-gray-500 mb-4">{studentToEdit.email}</p>

                            <div className="mb-4">
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Section</label>
                                <input
                                    className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-orange-500 focus:border-orange-500"
                                    value={editForm.section}
                                    onChange={e => setEditForm({ ...editForm, section: e.target.value })}
                                    placeholder="e.g. A"
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Academic Semester</label>
                                <input
                                    className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-orange-500 focus:border-orange-500"
                                    value={editForm.academic_semester}
                                    onChange={e => setEditForm({ ...editForm, academic_semester: e.target.value })}
                                    placeholder="e.g. Fall 2025"
                                />
                            </div>

                            <div className="flex justify-end gap-3">
                                <button className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded" onClick={() => setStudentToEdit(null)}>Cancel</button>
                                <button
                                    className="px-4 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 font-medium"
                                    onClick={async () => {
                                        try {
                                            const config = { headers: { Authorization: `Bearer ${user.token}` } };
                                            await axios.put(`${import.meta.env.VITE_API_URL}/api/enroll/student/${studentToEdit.id}`, editForm, config);
                                            alert('Student updated');
                                            setStudentToEdit(null);
                                            fetchEnrolledStudents(selectedCourse.id);
                                        } catch (e) {
                                            console.error(e);
                                            alert('Update failed');
                                        }
                                    }}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Dashboard;

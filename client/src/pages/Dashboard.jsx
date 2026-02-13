import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import AssignmentSubmissions from '../components/AssignmentSubmissions';
import GradingPanel from '../components/GradingPanel';
import ExemplarPanel from '../components/ExemplarPanel';
import { Book, User as UserIcon, Folder as FolderIcon, FolderOpen, ChevronDown, Download, Trash2, Eye, EyeOff, XCircle, CheckCircle, Upload, Award, Clock, FileText, Edit3, ToggleLeft, ToggleRight } from "lucide-react";
import CourseFileValidationModal from '../components/CourseFileValidationModal';

const Dashboard = () => {
    const { user, logout, loading, updateUser } = useContext(AuthContext);
    const navigate = useNavigate();

    // --- State Declarations ---
    const [courses, setCourses] = useState([]);
    const [newCourse, setNewCourse] = useState({ course_code: '', course_name: '', semester: '', course_type: 'theory' });
    const [studentEmail, setStudentEmail] = useState(''); // Enrollment State
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [file, setFile] = useState(null);
    const [fileType, setFileType] = useState('handout');
    const [targetSection, setTargetSection] = useState(''); // New for uploads
    const [uploadStatus, setUploadStatus] = useState('');
    const [courseFiles, setCourseFiles] = useState([]);
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [missingFiles, setMissingFiles] = useState([]);
    const [validationData, setValidationData] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState({}); // Folder State
    const [enrolledStudents, setEnrolledStudents] = useState([]); // Enrolled Students State
    const [studentSearchQuery, setStudentSearchQuery] = useState(''); // Search filter

    // Bulk Upload & Edit State
    const [currentBulkFile, setCurrentBulkFile] = useState(null); // Unused in provided snippet but common pattern? Or maybe just use temp vars. 
    // Wait, the original code had:
    const [previewData, setPreviewData] = useState(null);
    const [showBulkPreviewModal, setShowBulkPreviewModal] = useState(false);
    const [pendingBulkFile, setPendingBulkFile] = useState(null);
    const [studentToEdit, setStudentToEdit] = useState(null);
    const [editForm, setEditForm] = useState({ section: '', academic_semester: '' });

    // Submission State
    const [mySubmissions, setMySubmissions] = useState([]);
    const [submissionFile, setSubmissionFile] = useState(null);
    const [submissionUploading, setSubmissionUploading] = useState(false);
    const [assignmentSubmissions, setAssignmentSubmissions] = useState([]);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [gradingForm, setGradingForm] = useState({ submissionId: null, marks: '' });
    const [exemplarForm, setExemplarForm] = useState({ submissionId: null, type: '' });
    const [submissionControlForm, setSubmissionControlForm] = useState({ enabled: false, deadline: '' });
    const [exemplarSubmissions, setExemplarSubmissions] = useState([]);

    // HOD & Coordinator State
    const [faculties, setFaculties] = useState([]);
    const [sections, setSections] = useState([]);
    const [instructorForm, setInstructorForm] = useState({ instructorId: '', section: '' });
    const [coordinatorId, setCoordinatorId] = useState(''); // New state for coordinator assignment

    const requiredTypes = [
        'handout', 'attendance', 'assignment', 'marks',
        'academic_feedback', 'action_taken', 'exam_paper',
        'remedial', 'case_study', 'quiz', 'quiz_solution',
        'exam_solution', 'assignment_solution'
    ];

    // Sanitize API URL
    const apiUrl = import.meta.env.VITE_API_URL.replace(/\/$/, '');

    // --- Effects ---

    // 1. Initial Load & Auth Check
    useEffect(() => {
        if (!loading && !user) {
            navigate('/login');
        } else if (user) {
            fetchCourses();
            if (user.role === 'hod' || user.role === 'admin') {
                fetchFaculties();
            }
        }
    }, [user, loading, navigate]);

    // 2. Fetch Course Details when selected
    useEffect(() => {
        if (!user) return; // Safeguard against null user
        if (selectedCourse) {
            fetchCourseFiles(selectedCourse.id);

            // If Coordinator/HOD/Admin, fetch enrollment
            const isCoord = selectedCourse.coordinators?.some(c => c.id === user.id);
            if (user.is_coordinator || user.role === 'hod' || user.role === 'admin' || isCoord) {
                fetchEnrolledStudents(selectedCourse.id);
            }

            // If HOD/Admin/Coordinator, fetch sections for management
            if (user.role === 'hod' || user.role === 'admin' || user.is_coordinator || isCoord) {
                fetchSections(selectedCourse.id);
                // Ensure faculties are loaded for assignment dropdowns
                if ((user.role === 'hod' || user.role === 'admin' || user.is_coordinator || isCoord) && faculties.length === 0) {
                    fetchFaculties();
                }
            }
        } else {
            setCourseFiles([]);
            setEnrolledStudents([]);
        }
    }, [selectedCourse, user]);

    // 3. Fetch submissions for students/coordinators
    useEffect(() => {
        if (!user) return;
        if (user.role === 'student') {
            fetchMySubmissions();
        }
        if (selectedCourse && (selectedCourse.coordinators?.some(c => c.id === user.id) || user.role === 'admin' || user.role === 'hod')) {
            fetchExemplarSubmissions(selectedCourse.id);
        }
    }, [selectedCourse, user]);

    // --- API Helper Functions ---

    const fetchCourses = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.get(`${apiUrl}/api/courses`, config);
            if (Array.isArray(data)) {
                setCourses(data);
            } else {
                setCourses([]);
            }
        } catch (error) {
            console.error('Error fetching courses', error);
        }
    };

    const fetchCourseFiles = async (courseId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.get(`${apiUrl}/api/files/course/${courseId}`, config);
            setCourseFiles(data);
        } catch (error) {
            console.error('Error fetching files', error);
        }
    };

    const fetchEnrolledStudents = async (courseId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.get(`${apiUrl}/api/enroll/${courseId}`, config);
            setEnrolledStudents(data);
        } catch (error) {
            console.error('Error fetching enrolled students', error);
        }
    };

    const fetchFaculties = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            // HOD uses strict HOD route, others (Coordinators) use the coordinator route
            const endpoint = (user.role === 'hod' || user.role === 'admin')
                ? `${apiUrl}/api/hod/faculties`
                : `${apiUrl}/api/coordinator/faculties`;

            const { data } = await axios.get(endpoint, config);
            setFaculties(data);
        } catch (error) {
            console.error('Error fetching faculties', error);
        }
    };

    const fetchSections = async (courseId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.get(`${apiUrl}/api/coordinator/courses/${courseId}/sections`, config);
            setSections(data);
        } catch (error) {
            console.error('Error fetching sections', error);
        }
    };

    // --- Event Handlers ---

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.post(`${apiUrl}/api/courses`, newCourse, config);
            setNewCourse({ course_code: '', course_name: '', semester: '' });
            fetchCourses();
        } catch (error) {
            console.error(error);
            alert('Failed to create course');
        }
    };

    const handleAssignCoordinator = async (e) => {
        e.preventDefault();
        if (!coordinatorId) {
            alert('Please select a faculty member first.');
            return;
        }
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.put(`${apiUrl}/api/hod/courses/${selectedCourse.id}/coordinator`, { facultyId: coordinatorId }, config);

            alert('Coordinator assigned successfully');

            // Update local state immediately for UI feedback
            const faculty = faculties.find(f => f.id === parseInt(coordinatorId));
            if (faculty && selectedCourse) {
                setSelectedCourse(prev => ({
                    ...prev,
                    coordinators: [...(prev.coordinators || []), faculty]
                }));
            }

            setCoordinatorId(''); // Reset selection
            fetchCourses(); // Refresh global list
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.message || 'Failed to assign coordinator');
        }
    };

    const handleAssignInstructor = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.post(`${apiUrl}/api/coordinator/courses/${selectedCourse.id}/sections`, instructorForm, config);
            alert(`Assigned to Section ${instructorForm.section}`);
            setInstructorForm({ instructorId: '', section: '' });
            fetchSections(selectedCourse.id);
        } catch (error) {
            console.error(error);
            alert('Failed to assign instructor');
        }
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!file || !selectedCourse) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('course_id', selectedCourse.id);
        formData.append('file_type', fileType);
        if (targetSection) formData.append('section', targetSection);

        try {
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${user.token}`
                }
            };
            const { data } = await axios.post(`${apiUrl}/api/files/upload`, formData, config);
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
            const response = await axios.get(`${apiUrl}/api/files/${fileId}/download`, config);

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
            const response = await axios.get(`${apiUrl}/api/courses/${selectedCourse.id}/download`, config);

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
            await axios.delete(`${apiUrl}/api/files/${fileId}`, config);
            fetchCourseFiles(selectedCourse.id);
        } catch (error) {
            console.error('Delete failed', error);
            alert('Failed to delete file');
        }
    };

    // Check if all required files are uploaded before course file generation
    const checkRequiredFiles = async (courseId) => {
        try {
            const token = await user.token;
            const response = await axios.get(
                `${apiUrl}/api/courses/${courseId}/validate-files`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            setValidationData(response.data);
            setShowValidationModal(true);
        } catch (error) {
            console.error('Validation error:', error);
            alert('Failed to validate files: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleDeleteCourse = async (courseId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.delete(`${apiUrl}/api/courses/${courseId}`, config);
            if (selectedCourse?.id === courseId) {
                setSelectedCourse(null);
                setCourseFiles([]);
            }
            fetchCourses();
        } catch (error) {
            console.error('Course delete failed', error);
            alert('Failed to delete course');
        }
    };

    const handleToggleVisibility = async (fileId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.patch(`${apiUrl}/api/files/${fileId}/visibility`, {}, config);
            fetchCourseFiles(selectedCourse.id);
        } catch (error) {
            console.error('Visibility toggle failed', error);
            alert('Failed to update visibility');
        }
    };

    // Simple toggle for testing, replaced by proper HOD assignment now usually, keep if needed
    const handleToggleCoordinator = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.put(`${apiUrl}/api/auth/toggle-coordinator`, {}, config);
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
            await axios.post(`${apiUrl}/api/enroll/${selectedCourse.id}`, { studentEmail }, config);
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
            await axios.delete(`${apiUrl}/api/enroll/${selectedCourse.id}/${studentId}`, config);
            alert('Student removed successfully');
            fetchEnrolledStudents(selectedCourse.id);
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.message || 'Failed to remove enrollment');
        }
    };

    const handleViewFile = async (e, fileId) => {
        e.preventDefault();
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
                responseType: 'blob'
            };
            const response = await axios.get(`${apiUrl}/api/files/${fileId}/view`, config);
            const file = new Blob([response.data], { type: response.headers['content-type'] });
            const fileURL = URL.createObjectURL(file);
            window.open(fileURL, '_blank');
        } catch (error) {
            console.error('View failed', error);
            alert('Failed to view file');
        }
    };

    const handleBulkUpload = async (e, type) => {
        e.preventDefault();
        const fileInput = e.target.elements.file;
        if (!fileInput || !fileInput.files[0]) return;

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        try {
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${user.token}`
                }
            };
            const endpoint = type === 'faculty' ? 'faculties' : 'students';
            const { data } = await axios.post(`${apiUrl}/api/hod/bulk/${endpoint}`, formData, config);
            alert(data.message);
            if (type === 'faculty') fetchFaculties();
            e.target.reset();
        } catch (error) {
            console.error('Bulk upload failed', error);
            const msg = error.response?.data?.message || 'Upload failed';
            const details = error.response?.data?.errors?.join('\n') || '';
            alert(`${msg}\n${details}`);
        }
    };

    const handleGenerateCourseFile = async (force = false) => {
        if (!selectedCourse) return;
        setIsGenerating(true);
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
                responseType: 'arraybuffer'
            };
            const response = await axios.post(
                `${apiUrl}/api/courses/${selectedCourse.id}/generate-pdf`,
                { force },
                config
            );

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
                try {
                    const decoder = new TextDecoder('utf-8');
                    const jsonString = decoder.decode(error.response.data);
                    const errorData = JSON.parse(jsonString);

                    if (error.response.status === 400 && errorData.missing) {
                        setMissingFiles(errorData.missing);
                        setShowValidationModal(true);
                        return;
                    }
                    alert(errorData.message || 'Failed to generate course file.');
                } catch (parseError) {
                    alert('Failed to generate course file. (Parse Error)');
                }
            } else {
                alert('Failed to generate course file.');
            }
        } finally {
            setIsGenerating(false);
        }
    };

    // === SUBMISSION API FUNCTIONS ===

    // Student: Fetch my submissions
    const fetchMySubmissions = async () => {
        if (user.role !== 'student') return;
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.get(`${apiUrl}/api/submissions/my`, config);
            setMySubmissions(data);
        } catch (error) {
            console.error('Failed to fetch submissions', error);
        }
    };

    // Student: Upload submission
    const handleUploadSubmission = async (e, assignmentId) => {
        e.preventDefault();
        if (!submissionFile) {
            alert('Please select a file');
            return;
        }
        setSubmissionUploading(true);
        const formData = new FormData();
        formData.append('file', submissionFile);
        try {
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${user.token}`
                }
            };
            await axios.post(`${apiUrl}/api/submissions/${assignmentId}`, formData, config);
            alert('Submission uploaded successfully!');
            setSubmissionFile(null);
            fetchMySubmissions();
            fetchCourseFiles(selectedCourse.id);
        } catch (error) {
            console.error('Submission failed', error);
            alert(error.response?.data?.message || 'Submission failed');
        } finally {
            setSubmissionUploading(false);
        }
    };

    // Instructor: Fetch submissions for an assignment
    const fetchAssignmentSubmissions = async (assignmentId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.get(`${apiUrl}/api/submissions/assignment/${assignmentId}`, config);
            setAssignmentSubmissions(data);
            setSelectedAssignment(assignmentId);
        } catch (error) {
            console.error('Failed to fetch submissions', error);
        }
    };

    // Instructor: Grade submission
    const handleGradeSubmission = async (e) => {
        e.preventDefault();
        if (!gradingForm.submissionId || gradingForm.marks === '') {
            alert('Please enter marks');
            return;
        }
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.put(`${apiUrl}/api/submissions/${gradingForm.submissionId}/grade`,
                { marks: gradingForm.marks },
                config
            );
            alert('Submission graded successfully');
            setGradingForm({ submissionId: null, marks: '' });
            fetchAssignmentSubmissions(selectedAssignment);
        } catch (error) {
            console.error('Grading failed', error);
            alert('Failed to grade submission');
        }
    };

    // Instructor: Mark as exemplar
    const handleMarkExemplar = async (submissionId, type) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.put(`${apiUrl}/api/submissions/${submissionId}/exemplar`,
                { exemplar_type: type },
                config
            );
            alert(`Marked as ${type}`);
            fetchAssignmentSubmissions(selectedAssignment);
        } catch (error) {
            console.error('Exemplar marking failed', error);
            alert('Failed to mark exemplar');
        }
    };

    // Faculty: Toggle submission status
    const handleToggleSubmissions = async (fileId, enabled, deadline) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.put(`${apiUrl}/api/files/${fileId}/toggle-submissions`,
                { enabled, deadline: deadline || null },
                config
            );
            alert(`Submissions ${enabled ? 'enabled' : 'disabled'}`);
            fetchCourseFiles(selectedCourse.id);
        } catch (error) {
            console.error('Toggle failed', error);
            alert('Failed to toggle submissions');
        }
    };

    // Coordinator: Fetch exemplar submissions
    const fetchExemplarSubmissions = async (courseId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.get(`${apiUrl}/api/submissions/course/${courseId}/exemplars`, config);
            setExemplarSubmissions(data);
        } catch (error) {
            console.error('Failed to fetch exemplars', error);
        }
    };

    // Download submission
    const handleDownloadSubmission = async (submissionId, filename) => {
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
                responseType: 'blob'
            };
            const response = await axios.get(`${apiUrl}/api/submissions/${submissionId}/download`, config);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Download failed', error);
        }
    };

    // Coordinator: Toggle featured exemplar (double-star for course file)
    const handleToggleFeatured = async (submissionId, isFeatured) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.put(
                `${apiUrl}/api/submissions/${submissionId}/featured`,
                { is_featured: isFeatured },
                config
            );
            // Refresh exemplar list
            if (selectedCourse) {
                fetchExemplarSubmissions(selectedCourse.id);
            }
        } catch (error) {
            console.error('Failed to toggle featured', error);
            alert('Failed to update featured status');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="flex min-h-screen bg-gray-50 font-sans text-gray-800">
            {/* 1. Sidebar */}
            <Sidebar user={user} onLogout={logout} />

            {/* 2. Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <TopHeader user={user} />

                {/* Scrollable Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8">

                    {/* Main Grid: Courses List (Left) & Course Details (Right) */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">

                        {/* LEFT COLUMN: List of Courses */}
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
                                                {(user.role === 'hod' || user.role === 'admin') && (
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

                            {/* Add Course Button (HOD Only) */}
                            {['hod', 'admin'].includes(user.role?.toLowerCase()) && (
                                <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-lg">
                                    <h4 className="text-sm font-semibold mb-2 text-gray-600">Add New Course</h4>
                                    <form onSubmit={handleCreateCourse} className="space-y-2">
                                        <input className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500" placeholder="Code (e.g. CS101)" value={newCourse.course_code} onChange={e => setNewCourse({ ...newCourse, course_code: e.target.value })} required />
                                        <input className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500" placeholder="Name" value={newCourse.course_name} onChange={e => setNewCourse({ ...newCourse, course_name: e.target.value })} required />
                                        <select className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500" value={newCourse.course_type} onChange={e => setNewCourse({ ...newCourse, course_type: e.target.value })} required>
                                            <option value="theory">Theory Course</option>
                                            <option value="lab">Lab Course</option>
                                        </select>
                                        <input className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500" placeholder="Semester" value={newCourse.semester} onChange={e => setNewCourse({ ...newCourse, semester: e.target.value })} required />
                                        <button type="submit" className="w-full bg-orange-600 text-white text-sm font-medium py-2 rounded hover:bg-orange-700 transition">Add Course</button>
                                    </form>
                                    {/* HOD Hint */}
                                    {['hod', 'admin'].includes(user.role?.toLowerCase()) && <p className="text-xs text-gray-400 mt-2 text-center">As HOD, you are the default creator.</p>}
                                </div>
                            )}

                            {/* HOD Actions: Bulk & Single */}
                            {['hod', 'admin'].includes(user.role?.toLowerCase()) && (
                                <div className="p-4 mt-4 border-t border-gray-200 bg-purple-50 rounded-lg mx-2 mb-4">
                                    <h4 className="text-sm font-bold text-purple-800 mb-2">HOD User Management</h4>

                                    <div className="space-y-4">
                                        {/* Single User Add */}
                                        <div className="bg-white p-2 rounded border border-purple-100">
                                            <h5 className="text-xs font-semibold text-purple-700 mb-1">Add Single User</h5>
                                            <form onSubmit={async (e) => {
                                                e.preventDefault();
                                                const formData = new FormData(e.target);
                                                const userData = Object.fromEntries(formData.entries());
                                                try {
                                                    const config = { headers: { Authorization: `Bearer ${user.token}` } };
                                                    await axios.post(`${apiUrl}/api/hod/users`, userData, config);
                                                    alert(`User ${userData.name} created!`);
                                                    e.target.reset();
                                                    if (userData.role === 'faculty') fetchFaculties();
                                                } catch (err) {
                                                    alert(err.response?.data?.message || 'Failed to create user');
                                                }
                                            }} className="space-y-2">
                                                <input name="name" placeholder="Name" className="w-full text-xs p-1 border rounded" required />
                                                <input name="email" type="email" placeholder="Email (@muj / @jaipur)" className="w-full text-xs p-1 border rounded" required />
                                                <div className="flex gap-2">
                                                    <select name="role" className="text-xs p-1 border rounded flex-1">
                                                        <option value="student">Student</option>
                                                        <option value="faculty">Faculty</option>
                                                    </select>
                                                    <input name="phone_number" placeholder="Phone" className="text-xs p-1 border rounded flex-1" />
                                                </div>
                                                {/* Fields for Student */}
                                                <div className="flex gap-2">
                                                    <input name="section" placeholder="Section (Student)" className="text-xs p-1 border rounded flex-1" />
                                                    <input name="academic_semester" placeholder="Semester" className="text-xs p-1 border rounded flex-1" />
                                                </div>
                                                <button type="submit" className="w-full bg-purple-600 text-white text-xs py-1 rounded hover:bg-purple-700">Create User</button>
                                            </form>
                                        </div>

                                        {/* Bulk Faculty */}
                                        <form onSubmit={(e) => handleBulkUpload(e, 'faculty')} className="space-y-1">
                                            <label className="text-xs font-semibold text-purple-700">Bulk Faculties (Excel)</label>
                                            <div className="flex gap-2">
                                                <input type="file" name="file" accept=".xlsx,.xls" className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-purple-200 file:text-purple-700 hover:file:bg-purple-300" required />
                                                <button type="submit" className="bg-purple-600 text-white text-xs px-2 py-1 rounded hover:bg-purple-700">Upload</button>
                                            </div>
                                        </form>

                                        {/* Bulk Student */}
                                        <form onSubmit={(e) => handleBulkUpload(e, 'student')} className="space-y-1">
                                            <label className="text-xs font-semibold text-purple-700">Bulk Students (Excel)</label>
                                            <div className="flex gap-2">
                                                <input type="file" name="file" accept=".xlsx,.xls" className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-purple-200 file:text-purple-700 hover:file:bg-purple-300" required />
                                                <button type="submit" className="bg-purple-600 text-white text-xs px-2 py-1 rounded hover:bg-purple-700">Upload</button>
                                            </div>
                                        </form>
                                    </div>

                                    {/* View Lists */}
                                    <div className="mt-4 pt-4 border-t border-purple-200 flex gap-2">
                                        <button
                                            onClick={() => navigate('/hod/faculties')}
                                            className="flex-1 bg-purple-600 text-white text-xs py-2 rounded hover:bg-purple-700 text-center"
                                        >
                                            View Faculties
                                        </button>
                                        <button
                                            onClick={() => navigate('/hod/students')}
                                            className="flex-1 bg-purple-600 text-white text-xs py-2 rounded hover:bg-purple-700 text-center"
                                        >
                                            View Students
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* RIGHT COLUMN: Selected Course Content */}
                        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm min-h-[500px] flex flex-col">
                            <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-lg flex justify-between items-center">
                                <h3 className="font-bold text-lg text-gray-800 border-l-4 border-orange-500 pl-3">
                                    {selectedCourse ? (
                                        <div className="flex flex-col">
                                            <span className="flex items-center gap-2">
                                                {selectedCourse.course_name}
                                                {selectedCourse.coordinators?.some(c => c.id === user.id) && <span className="bg-orange-100 text-orange-700 text-xs px-2 rounded-full">Coordinator</span>}
                                            </span>
                                            {/* Details Subheader */}
                                            <div className="text-xs font-normal text-gray-500 mt-1 flex flex-col gap-0.5">
                                                {selectedCourse.coordinators && selectedCourse.coordinators.length > 0 && (
                                                    <span>Coordinators: {selectedCourse.coordinators.map(c => c.name).join(', ')}</span>
                                                )}
                                                {selectedCourse.my_instructor && (
                                                    <span className="text-blue-600">
                                                        Your Instructor: {selectedCourse.my_instructor.name} ({selectedCourse.my_instructor.phone_number || 'No Phone'}) - Sec {selectedCourse.my_section}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ) : 'Course Details'}
                                </h3>
                                {selectedCourse && (
                                    <div className="flex gap-2">
                                        {user.role !== 'student' && (
                                            <button onClick={handleDownloadZip} className="text-xs bg-white border border-orange-500 text-orange-600 px-3 py-1.5 rounded hover:bg-orange-50 transition">Download Zip</button>
                                        )}
                                        {/* Permission Check: Is Coordinator (in list), HOD, or Admin */}
                                        {(selectedCourse.coordinators?.some(c => c.id === user.id) || user.role === 'hod' || user.role === 'admin') && (
                                            <>
                                                <button
                                                    onClick={() => checkRequiredFiles(selectedCourse.id)}
                                                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition flex items-center gap-1"
                                                >
                                                    <FileText className="w-3 h-3" />
                                                    Check Files
                                                </button>
                                                <button onClick={() => handleGenerateCourseFile(false)} disabled={isGenerating} className="text-xs bg-orange-600 text-white px-3 py-1.5 rounded hover:bg-orange-700 transition">
                                                    {isGenerating ? 'Wait...' : 'Generate PDF'}
                                                </button>
                                            </>
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
                                    <div className="animate-fade-in space-y-6">

                                        {/* HOD: ASSIGN COORDINATOR */}
                                        {(user.role === 'hod' || user.role === 'admin') && (
                                            <div className="bg-purple-50 border border-purple-200 rounded p-4">
                                                <h4 className="text-sm font-bold text-purple-800 mb-2 uppercase tracking-wide">Add Coordinator</h4>
                                                <form onSubmit={handleAssignCoordinator} className="flex flex-col sm:flex-row gap-2">
                                                    <select
                                                        className="flex-1 w-full text-sm border-gray-300 rounded p-2"
                                                        value={coordinatorId}
                                                        onChange={(e) => setCoordinatorId(e.target.value)}
                                                    >
                                                        <option value="">Select Faculty to Add</option>
                                                        {faculties.map(f => (
                                                            <option key={f.id} value={f.id}>{f.name} ({f.email})</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        type="submit"
                                                        className="w-full sm:w-auto bg-purple-600 text-white text-xs px-4 py-2 rounded hover:bg-purple-700 font-medium whitespace-nowrap"
                                                    >
                                                        Add
                                                    </button>
                                                </form>
                                                <p className="text-xs text-purple-600 mt-1">Current: {selectedCourse.coordinators?.map(c => c.name).join(', ') || 'None'}</p>
                                            </div>
                                        )}

                                        {/* COORDINATOR: MANAGE INSTRUCTORS */}
                                        {(selectedCourse.coordinators?.some(c => c.id === user.id) || user.role === 'admin') && (
                                            <div className="bg-blue-50 border border-blue-200 rounded p-4">
                                                <h4 className="text-sm font-bold text-blue-800 mb-2 uppercase tracking-wide">Course Instructors (Section Map)</h4>
                                                <form onSubmit={handleAssignInstructor} className="flex gap-2 mb-3">
                                                    <select
                                                        className="flex-1 text-sm border-gray-300 rounded p-2"
                                                        value={instructorForm.instructorId}
                                                        onChange={(e) => setInstructorForm({ ...instructorForm, instructorId: e.target.value })}
                                                        required
                                                    >
                                                        <option value="">Select Instructor...</option>
                                                        {faculties.map(f => (
                                                            <option key={f.id} value={f.id}>{f.name}</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        className="original-input w-24 text-sm border-gray-300 rounded p-2"
                                                        placeholder="Section (e.g. A)"
                                                        value={instructorForm.section}
                                                        onChange={(e) => setInstructorForm({ ...instructorForm, section: e.target.value })}
                                                        required
                                                    />
                                                    <button type="submit" className="bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded hover:bg-blue-700">Assign</button>
                                                </form>

                                                {/* List Assignments */}
                                                <div className="space-y-1">
                                                    {sections.map(sec => (
                                                        <div key={sec.id} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-blue-100">
                                                            <span className="font-semibold text-gray-700">Section {sec.section}</span>
                                                            <span className="text-gray-600">{sec.instructor ? sec.instructor.name : 'Unknown'}</span>
                                                        </div>
                                                    ))}
                                                    {sections.length === 0 && <p className="text-xs text-gray-400">No instructors assigned yet.</p>}
                                                </div>
                                            </div>
                                        )}

                                        {/* Upload Section */}
                                        {(user.role === 'faculty' || user.role === 'hod' || user.role === 'admin') && (
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
                                                            <option value="materials">Materials</option>
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

                                                    {/* Section Selector (Coordinator/HOD only) */}
                                                    {(selectedCourse.coordinators?.some(c => c.id === user.id) || user.role === 'hod' || user.role === 'admin') && (
                                                        <div className="w-full md:w-32">
                                                            <label className="text-xs font-semibold text-gray-500 mb-1 block">For Section</label>
                                                            <input
                                                                className="w-full text-sm border-gray-300 rounded p-2"
                                                                placeholder="Global (All)"
                                                                value={targetSection}
                                                                onChange={e => setTargetSection(e.target.value)}
                                                            />
                                                        </div>
                                                    )}

                                                    <button type="submit" className="w-full md:w-auto bg-orange-600 text-white text-sm font-bold py-2 px-6 rounded hover:bg-orange-700 transition">Upload</button>
                                                </form>
                                                {uploadStatus && <p className="text-xs text-green-600 mt-2 font-medium">{uploadStatus}</p>}
                                            </div>
                                        )}

                                        {/* Files List */}
                                        <div className="space-y-4">
                                            {/* ENROLLMENT SECTION (Coordinator / HOD) */}
                                            {(user.is_coordinator || selectedCourse.coordinators?.some(c => c.id === user.id) || user.role === 'hod' || user.role === 'admin') && (
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
                                                                    await axios.post(`${apiUrl}/api/enroll/${selectedCourse.id}/bulk`, formData, config);
                                                                    alert('Uploaded!'); fetchEnrolledStudents(selectedCourse.id); e.target.reset();
                                                                } catch (err) { alert('Failed'); }
                                                            }} className="flex gap-2">
                                                                <input type="file" name="files" accept=".xlsx, .xls" className="flex-1 text-sm text-gray-500" required />
                                                                <button type="submit" className="text-xs border border-green-600 text-green-700 px-3 py-1 rounded hover:bg-green-50">Upload Excel</button>
                                                            </form>
                                                        </div>
                                                    </div>


                                                    {/* Enrolled Student List Table */}
                                                    {enrolledStudents.length > 0 && (
                                                        <div className="mt-4 max-h-60 overflow-y-auto overflow-x-auto border border-gray-200 rounded">
                                                            <table className="w-full text-sm text-left">
                                                                <thead className="bg-gray-100 text-gray-600 font-semibold sticky top-0">
                                                                    <tr>
                                                                        <th className="p-2">Name</th>
                                                                        <th className="p-2">Email</th>
                                                                        <th className="p-2">Section</th>
                                                                        <th className="p-2 text-right">Action</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-100">
                                                                    {enrolledStudents
                                                                        .filter(student =>
                                                                            student.name?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                                                                            student.email.toLowerCase().includes(studentSearchQuery.toLowerCase())
                                                                        )
                                                                        .map(student => (
                                                                            <tr key={student.id} className="hover:bg-gray-50">
                                                                                <td className="p-2">{student.name || 'N/A'}</td>
                                                                                <td className="p-2">{student.email}</td>
                                                                                <td className="p-2">
                                                                                    {/* Simple display, potentially editable later */}
                                                                                    {student.Enrollment?.section || '-'}
                                                                                </td>
                                                                                <td className="p-2 text-right flex justify-end gap-2">
                                                                                    <button onClick={() => setStudentToEdit(student)} className="text-blue-500 hover:underline">Edit</button>
                                                                                    <button
                                                                                        onClick={() => handleDeleteEnrollment(student.id, student.name || student.email)}
                                                                                        className="text-red-500 hover:text-red-700"
                                                                                    >
                                                                                        <Trash2 size={14} />
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}

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
                                                                                <div className="flex gap-2 text-xs text-gray-400">
                                                                                    <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                                                                                    {doc.section && <span className="text-orange-600 font-semibold bg-orange-50 px-1 rounded">Sec {doc.section}</span>}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            {(user.role === 'faculty' || user.role === 'hod' || user.role === 'admin' || user.is_coordinator) && (
                                                                                <button onClick={() => handleToggleVisibility(doc.id)} className={`p-1 rounded ${doc.is_visible ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`} title="Toggle Visibility">
                                                                                    {doc.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
                                                                                </button>
                                                                            )}
                                                                            <button onClick={(e) => handleViewFile(e, doc.id)} className="p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200" title="View">
                                                                                <Eye size={14} />
                                                                            </button>
                                                                            <button onClick={(e) => handleDownloadFile(e, doc.id, doc.filename)} className="p-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100" title="Download">
                                                                                <Download size={14} />
                                                                            </button>
                                                                            {(user.role === 'faculty' || user.role === 'hod' || user.role === 'admin' || user.is_coordinator) && (
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

                                        {/* SUBMISSION PANELS */}
                                        {selectedCourse && (
                                            <div className="space-y-6 mt-6">
                                                {/* Student View: Assignment Submissions */}
                                                {user.role === 'student' && (
                                                    <AssignmentSubmissions
                                                        assignments={courseFiles}
                                                        mySubmissions={mySubmissions}
                                                        submissionFile={submissionFile}
                                                        setSubmissionFile={setSubmissionFile}
                                                        submissionUploading={submissionUploading}
                                                        onUploadSubmission={handleUploadSubmission}
                                                        onDownloadSubmission={handleDownloadSubmission}
                                                    />
                                                )}

                                                {/* Instructor View: Grading Panel (only if they teach a section) */}
                                                {(['faculty', 'hod', 'admin'].includes(user.role) || user.is_coordinator) && sections.some(s => s.instructor_id === user.id) && (
                                                    <GradingPanel
                                                        assignments={courseFiles}
                                                        selectedAssignment={selectedAssignment}
                                                        assignmentSubmissions={assignmentSubmissions}
                                                        onFetchSubmissions={fetchAssignmentSubmissions}
                                                        onGradeSubmission={(form) => {
                                                            setGradingForm(form);
                                                            const e = { preventDefault: () => { } };
                                                            handleGradeSubmission(e);
                                                        }}
                                                        onMarkExemplar={handleMarkExemplar}
                                                        onToggleSubmissions={handleToggleSubmissions}
                                                        onDownloadSubmission={handleDownloadSubmission}
                                                    />
                                                )}

                                                {/* Coordinator/HOD View: Exemplar Submissions (in addition to grading panel if they teach) */}
                                                {(selectedCourse.coordinators?.some(c => c.id === user.id) || user.role === 'hod' || user.role === 'admin') && (
                                                    <ExemplarPanel
                                                        exemplarSubmissions={exemplarSubmissions}
                                                        onDownloadSubmission={handleDownloadSubmission}
                                                        onToggleFeatured={handleToggleFeatured}
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* Validation Modal */}
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
            {studentToEdit && (
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
                                        await axios.put(`${apiUrl}/api/enroll/student/${studentToEdit.id}`, editForm, config);
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
            )}

            {/* Course File Validation Modal */}
            {showValidationModal && (
                <CourseFileValidationModal
                    validationData={validationData}
                    onClose={() => setShowValidationModal(false)}
                    onGenerate={() => {
                        setShowValidationModal(false);
                        // Proceed with course file generation if needed
                    }}
                />
            )}
        </div>
    );
};

export default Dashboard;

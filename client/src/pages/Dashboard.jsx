import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

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


    if (loading || !user) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-dark)' }}>
            <nav style={{ padding: '1rem 2rem', background: 'var(--bg-card)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: '1.25rem', color: 'white' }}>Course File System</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{user.name} ({user.role})</span>
                    {user.role === 'faculty' && (
                        <button
                            onClick={handleToggleCoordinator}
                            className="btn"
                            style={{
                                background: user.is_coordinator ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                border: user.is_coordinator ? 'none' : '1px solid rgba(255,255,255,0.2)'
                            }}
                            title="Toggle Coordinator Privileges"
                        >
                            {user.is_coordinator ? 'Coordinator: ON' : 'Coordinator: OFF'}
                        </button>
                    )}
                    <button onClick={logout} className="btn" style={{ background: 'rgba(255,255,255,0.1)' }}>Logout</button>
                </div>
            </nav>

            <div className="container" style={{ padding: '2rem 1rem' }}>
                {/* Course Creation (Faculty only) */}
                {(user.role === 'faculty') && (
                    <div className="card" style={{ marginBottom: '2rem' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>Add New Course</h3>
                        <form onSubmit={handleCreateCourse} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                            <div>
                                <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Course Code</label>
                                <input className="input-field" placeholder="e.g. CS101" value={newCourse.course_code} onChange={e => setNewCourse({ ...newCourse, course_code: e.target.value })} required />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Course Name</label>
                                <input className="input-field" placeholder="Intro to CS" value={newCourse.course_name} onChange={e => setNewCourse({ ...newCourse, course_name: e.target.value })} required />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Semester</label>
                                <input className="input-field" placeholder="Fall 2025" value={newCourse.semester} onChange={e => setNewCourse({ ...newCourse, semester: e.target.value })} required />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>Add</button>
                        </form>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {courses.map(course => (
                        <div key={course.id} className="card" style={{ borderColor: selectedCourse?.id === course.id ? 'var(--primary)' : 'transparent' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem' }}>{course.course_name}</h3>
                                    <p style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '0.875rem' }}>{course.course_code}</p>
                                </div>
                                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>{course.semester}</span>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    className="btn"
                                    style={{ flex: 1, background: selectedCourse?.id === course.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)' }}
                                    onClick={() => setSelectedCourse(course)}
                                >
                                    {selectedCourse?.id === course.id ? 'Active' : 'Select'}
                                </button>
                                {(user.role === 'faculty') && (
                                    <button
                                        className="btn"
                                        style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '0.5rem' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm(`Delete course ${course.course_code}? This will remove all associated files.`)) {
                                                handleDeleteCourse(course.id);
                                            }
                                        }}
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {selectedCourse && (
                    <div className="card" style={{ marginTop: '2rem', animation: 'fadeIn 0.3s ease-in-out' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>
                                Manage Files: <span style={{ color: 'var(--primary)' }}>{selectedCourse.course_code}</span>
                            </h3>
                            {(user.role === 'faculty') && (
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button
                                        className="btn"
                                        style={{ background: 'var(--bg-card)', border: '1px solid var(--primary)', color: 'var(--primary)' }}
                                        onClick={handleDownloadZip}
                                    >
                                        Download Zip
                                    </button>
                                    {user.is_coordinator && (
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => handleGenerateCourseFile(false)}
                                            disabled={isGenerating}
                                        >
                                            {isGenerating ? 'Generating...' : 'Generate Course File'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {(user.role === 'faculty') && (
                            <form onSubmit={handleFileUpload} style={{ display: 'flex', gap: '1rem', alignItems: 'end', marginBottom: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Select Document</label>
                                    <input type="file" className="input-field" onChange={e => setFile(e.target.files[0])} required />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Document Type</label>
                                    <select className="input-field" value={fileType} onChange={e => setFileType(e.target.value)}>
                                        <option value="handout">Handout</option>
                                        <option value="attendance">Attendance</option>
                                        <option value="assignment">Assignment</option>
                                        <option value="marks">Marks</option>
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
                                <button type="submit" className="btn btn-primary">Upload</button>
                            </form>
                        )}

                        {uploadStatus && <div style={{ color: 'var(--success)', marginBottom: '1rem' }}>{uploadStatus}</div>}

                        {/* Enroll Student Form (Coordinator Only) - Placed BEFORE the list */}
                        {/* Enroll Student Form (Coordinator Only) - Placed BEFORE the list */}
                        {user.is_coordinator && (
                            <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '2rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                <h4 style={{ marginBottom: '1rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>👨‍🎓</span> Manage Enrollment
                                </h4>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                    {/* Single Enroll */}
                                    <div>
                                        <h5 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Enroll Single Student</h5>
                                        <form onSubmit={handleEnrollStudent} style={{ display: 'flex', gap: '0.5rem' }}>
                                            <input
                                                type="email"
                                                className="input-field"
                                                placeholder="Student Email"
                                                value={studentEmail}
                                                onChange={e => setStudentEmail(e.target.value)}
                                                required
                                                style={{ flex: 1 }}
                                            />
                                            <button type="submit" className="btn btn-primary">Enroll</button>
                                        </form>
                                    </div>

                                    {/* Bulk Enroll */}
                                    <div style={{ paddingLeft: '2rem', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <h5 style={{ color: 'var(--text-muted)', margin: 0 }}>Bulk Enroll</h5>
                                            <a
                                                href="https://template-formatter-aneesh.vercel.app/"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}
                                            >
                                                🔗 Format Template Tool
                                            </a>
                                        </div>

                                        <form onSubmit={async (e) => {
                                            e.preventDefault();
                                            if (!e.target.files[0]) return;
                                            const fileToUpload = e.target.files[0];

                                            // PREVIEW MODE FIRST
                                            const formData = new FormData();
                                            formData.append('file', fileToUpload);
                                            try {
                                                const token = user.token;
                                                const config = { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } };

                                                // Call with ?preview=true
                                                const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/enroll/${selectedCourse.id}/bulk?preview=true`, formData, config);

                                                // Store preview data and file for later
                                                setPreviewData(res.data);
                                                setPendingBulkFile(fileToUpload);
                                                setShowBulkPreviewModal(true);

                                            } catch (err) {
                                                console.error(err);
                                                alert(err.response?.data?.message || 'Bulk upload preview failed.');
                                            }
                                        }}>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <input type="file" name="files" accept=".xlsx, .xls" className="input-field" required style={{ flex: 1 }} />
                                                <button type="submit" className="btn" style={{ background: 'var(--bg-card)', border: '1px solid var(--primary)', color: 'var(--primary)' }}>Preview Upload</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>

                                {/* Enrolled List Preview */}
                                <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                                    <h5 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>Enrolled Students ({enrolledStudents.length})</span>
                                        <button
                                            onClick={() => fetchEnrolledStudents(selectedCourse.id)}
                                            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem' }}
                                        >
                                            🔄 Refresh
                                        </button>
                                    </h5>

                                    <details style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }} open>
                                        <summary style={{ padding: '0.75rem', cursor: 'pointer', color: 'white', userSelect: 'none' }}>
                                            View Student List {enrolledStudents.length > 0 ? '⬇️' : ''}
                                        </summary>
                                        <div style={{ maxHeight: '300px', overflowY: 'auto', padding: '0.5rem' }}>
                                            {enrolledStudents.length === 0 ? (
                                                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>No students enrolled yet.</div>
                                            ) : (
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                                    <thead>
                                                        <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                                            <th style={{ padding: '0.5rem' }}>Name</th>
                                                            <th style={{ padding: '0.5rem' }}>Email</th>
                                                            <th style={{ padding: '0.5rem' }}>Section</th>
                                                            <th style={{ padding: '0.5rem' }}>Sem</th>
                                                            <th style={{ padding: '0.5rem' }}>Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {enrolledStudents.map(s => (
                                                            <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                                <td style={{ padding: '0.5rem' }}>{s.name || '-'}</td>
                                                                <td style={{ padding: '0.5rem' }}>{s.email}</td>
                                                                <td style={{ padding: '0.5rem' }}>{s.section || 'N/A'}</td>
                                                                <td style={{ padding: '0.5rem' }}>{s.academic_semester || 'N/A'}</td>
                                                                <td style={{ padding: '0.5rem' }}>
                                                                    <button
                                                                        onClick={() => {
                                                                            setStudentToEdit(s);
                                                                            setEditForm({ section: s.section || '', academic_semester: s.academic_semester || '' });
                                                                        }}
                                                                        style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '1rem' }}
                                                                        title="Edit Details"
                                                                    >
                                                                        ✏️
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </details>
                                </div>
                            </div>
                        )}

                        <div style={{ marginTop: '2rem' }}>
                            <h4 style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Uploaded Documents</h4>

                            {courseFiles.length > 0 ? (
                                Object.entries(courseFiles.reduce((acc, file) => {
                                    const type = file.file_type || 'other';
                                    if (!acc[type]) acc[type] = [];
                                    acc[type].push(file);
                                    return acc;
                                }, {})).map(([type, files]) => (
                                    <div key={type} style={{ marginBottom: '1rem' }}>
                                        {/* Folder Header */}
                                        <div
                                            onClick={() => setExpandedFolders(prev => ({ ...prev, [type]: !prev[type] }))}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                cursor: 'pointer',
                                                background: 'rgba(255,255,255,0.05)',
                                                padding: '1rem',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                        >
                                            <span style={{ fontSize: '1.25rem' }}>{expandedFolders[type] ? '📂' : '📁'}</span>
                                            <h5 style={{
                                                textTransform: 'capitalize',
                                                color: 'white',
                                                margin: 0,
                                                fontSize: '1rem',
                                                flex: 1
                                            }}>
                                                {type.replace(/_/g, ' ')}
                                                <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>({files.length})</span>
                                            </h5>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{expandedFolders[type] ? '▼' : '▶'}</span>
                                        </div>

                                        {/* Expanded Content */}
                                        {expandedFolders[type] && (
                                            <div style={{
                                                display: 'grid', gap: '0.5rem',
                                                marginTop: '0.5rem',
                                                paddingLeft: '1rem',
                                                borderLeft: '2px solid rgba(255,255,255,0.1)',
                                                marginLeft: '1rem'
                                            }}>
                                                {files.map(doc => (
                                                    <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                            <div style={{
                                                                width: '40px', height: '40px',
                                                                background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)',
                                                                borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase'
                                                            }}>
                                                                DOC
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: '500' }}>{doc.filename}</div>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(doc.uploaded_at).toLocaleDateString()}</div>
                                                            </div>
                                                        </div>

                                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                            {(user.role === 'faculty') && (
                                                                <button
                                                                    onClick={() => handleToggleVisibility(doc.id)}
                                                                    className="btn"
                                                                    title={doc.is_visible ? 'Visible to Students' : 'Hidden from Students'}
                                                                    style={{
                                                                        padding: '0.4rem',
                                                                        fontSize: '0.875rem',
                                                                        background: doc.is_visible ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                                                        color: doc.is_visible ? '#6ee7b7' : 'var(--text-muted)',
                                                                        aspectRatio: '1/1',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                                    }}
                                                                >
                                                                    {doc.is_visible ? '👁️' : '🚫'}
                                                                </button>
                                                            )}

                                                            <button
                                                                onClick={(e) => handleDownloadFile(e, doc.id, doc.filename)}
                                                                className="btn"
                                                                style={{ padding: '0.4rem 1rem', fontSize: '0.875rem', background: 'rgba(255,255,255,0.1)' }}
                                                            >
                                                                Download
                                                            </button>

                                                            {(user.role === 'faculty') && (
                                                                <button
                                                                    onClick={() => handleDeleteFile(doc.id)}
                                                                    className="btn"
                                                                    style={{ padding: '0.4rem 1rem', fontSize: '0.875rem', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5' }}
                                                                >
                                                                    Delete
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
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                                    No files uploaded yet.
                                </div>
                            )}
                        </div>
                    </div >
                )}
            </div >

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            {
                showValidationModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center',
                        zIndex: 1000
                    }}>
                        <div className="card" style={{ width: '400px', maxWidth: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
                            <h3 style={{ marginBottom: '1rem', color: 'white' }}>Course File Checklist</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                                The following files are missing. You can force generation, but the course file will be incomplete.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
                                {requiredTypes.map(type => {
                                    const isMissing = missingFiles.includes(type);
                                    return (
                                        <div key={type} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '0.5rem', borderRadius: '4px',
                                            background: isMissing ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                            border: `1px solid ${isMissing ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                                        }}>
                                            <span style={{ textTransform: 'capitalize' }}>{type.replace('_', ' ')}</span>
                                            <span>{isMissing ? '❌' : '✅'}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button
                                    className="btn"
                                    style={{ background: 'transparent' }}
                                    onClick={() => setShowValidationModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-primary"
                                    style={{ background: 'var(--warning)', color: 'black' }}
                                    onClick={() => handleGenerateCourseFile(true)}
                                    disabled={isGenerating}
                                >
                                    {isGenerating ? 'Generating...' : 'Force Generate'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Bulk Preview Modal */}
            {showBulkPreviewModal && previewData && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div className="card" style={{ width: '600px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginBottom: '1rem', color: 'white' }}>Bulk Upload Preview</h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                <h4 style={{ color: '#6ee7b7', margin: 0 }}>{previewData.stats.valid}</h4>
                                <small style={{ color: 'var(--text-muted)' }}>Valid Rows (Ready)</small>
                            </div>
                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                <h4 style={{ color: '#fca5a5', margin: 0 }}>{previewData.stats.invalid}</h4>
                                <small style={{ color: 'var(--text-muted)' }}>Invalid / Issues</small>
                            </div>
                        </div>

                        {previewData.results.failed.length > 0 && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h5 style={{ color: '#fca5a5', marginBottom: '0.5rem' }}>Issues Found:</h5>
                                <ul style={{ maxHeight: '150px', overflowY: 'auto', paddingLeft: '1.5rem', margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    {previewData.results.failed.map((fail, idx) => (
                                        <li key={idx} style={{ marginBottom: '0.25rem' }}>
                                            <strong>Row {fail.row}:</strong> {fail.email} - <span style={{ color: '#fca5a5' }}>{fail.reason}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            {previewData.stats.valid > 0
                                ? "Clicking 'Confirm' will enroll the valid students and ignore the rows with issues."
                                : "No valid students found to enroll."}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button className="btn" style={{ background: 'transparent' }} onClick={() => { setShowBulkPreviewModal(false); setPreviewData(null); setPendingBulkFile(null); }}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                disabled={previewData.stats.valid === 0}
                                onClick={async () => {
                                    if (!pendingBulkFile) return;
                                    const formData = new FormData();
                                    formData.append('file', pendingBulkFile);

                                    try {
                                        const token = user.token;
                                        const config = { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } };

                                        // EXECUTE UPLOAD (No preview flag)
                                        const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/enroll/${selectedCourse.id}/bulk`, formData, config);

                                        alert(`Upload Complete!\nEnrolled: ${res.data.enrolled_count}`);
                                        setShowBulkPreviewModal(false);
                                        setPreviewData(null);
                                        setPendingBulkFile(null);
                                        fetchEnrolledStudents(selectedCourse.id);
                                    } catch (err) {
                                        console.error(err);
                                        alert('Upload failed.');
                                    }
                                }}
                            >
                                Confirm Upload ({previewData.stats.valid})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Student Modal */}
            {studentToEdit && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div className="card" style={{ width: '400px', maxWidth: '90%' }}>
                        <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>Edit Student Details</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>{studentToEdit.email}</p>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Section</label>
                            <input
                                className="input-field"
                                value={editForm.section}
                                onChange={e => setEditForm({ ...editForm, section: e.target.value })}
                                placeholder="e.g. A"
                            />
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Academic Semester</label>
                            <input
                                className="input-field"
                                value={editForm.academic_semester}
                                onChange={e => setEditForm({ ...editForm, academic_semester: e.target.value })}
                                placeholder="e.g. Fall 2025"
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button className="btn" style={{ background: 'transparent' }} onClick={() => setStudentToEdit(null)}>Cancel</button>
                            <button
                                className="btn btn-primary"
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
            )}
        </div >
    );
};

export default Dashboard;

import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import axios from 'axios';

const Dashboard = () => {
    const { user, logout, loading } = useContext(AuthContext);
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [newCourse, setNewCourse] = useState({ course_code: '', course_name: '', semester: '' });
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [file, setFile] = useState(null);
    const [fileType, setFileType] = useState('handout');
    const [uploadStatus, setUploadStatus] = useState('');
    const [courseFiles, setCourseFiles] = useState([]);
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [missingFiles, setMissingFiles] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);

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
        } else {
            setCourseFiles([]);
        }
    }, [selectedCourse, user]);

    const fetchCourses = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.get('http://localhost:5000/api/courses', config);
            setCourses(data);
        } catch (error) {
            console.error('Error fetching courses', error);
        }
    };

    const fetchCourseFiles = async (courseId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.get(`http://localhost:5000/api/files/course/${courseId}`, config);
            setCourseFiles(data);
        } catch (error) {
            console.error('Error fetching files', error);
        }
    };

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.post('http://localhost:5000/api/courses', newCourse, config);
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
            const { data } = await axios.post('http://localhost:5000/api/files/upload', formData, config);
            setUploadStatus(`Uploaded: ${data.filePath}`);
            setFile(null);
            fetchCourseFiles(selectedCourse.id);
        } catch (error) {
            setUploadStatus('Upload failed');
        }
    };

    const handleDownloadZip = async () => {
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
                responseType: 'blob'
            };
            const response = await axios.get(`http://localhost:5000/api/courses/${selectedCourse.id}/download`, config);

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
            await axios.delete(`http://localhost:5000/api/files/${fileId}`, config);
            fetchCourseFiles(selectedCourse.id);
        } catch (error) {
            console.error('Delete failed', error);
            alert('Failed to delete file');
        }
    };

    const handleDeleteCourse = async (courseId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.delete(`http://localhost:5000/api/courses/${courseId}`, config);

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
            await axios.patch(`http://localhost:5000/api/files/${fileId}/visibility`, {}, config);
            fetchCourseFiles(selectedCourse.id);
        } catch (error) {
            console.error('Visibility toggle failed', error);
            alert('Failed to update visibility');
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
                `http://localhost:5000/api/courses/${selectedCourse.id}/generate-pdf`,
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
            if (error.response && error.response.status === 400 && error.response.data.missing) {
                // Convert ArrayBuffer to JSON to read error message
                const decoder = new TextDecoder('utf-8');
                const jsonString = decoder.decode(error.response.data);
                const errorData = JSON.parse(jsonString);

                setMissingFiles(errorData.missing);
                setShowValidationModal(true);
            } else {
                console.error('Generation failed', error);
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
                                        className="btn btn-primary"
                                        onClick={handleDownloadZip}
                                        style={{ background: 'var(--bg-card)', border: '1px solid var(--primary)', color: 'var(--primary)' }}
                                    >
                                        Download Zip
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleGenerateCourseFile(false)}
                                        disabled={isGenerating}
                                    >
                                        {isGenerating ? 'Generating...' : 'Generate Course File'}
                                    </button>
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

                        {/* Real File List */}
                        <div style={{ marginTop: '2rem' }}>
                            <h4 style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Uploaded Documents</h4>
                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                {courseFiles.length > 0 ? courseFiles.map((doc) => (
                                    <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{
                                                width: '40px', height: '40px',
                                                background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)',
                                                borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase'
                                            }}>
                                                {doc.file_type.substring(0, 3)}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '500' }}>{doc.filename}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(doc.uploaded_at).toLocaleDateString()}</div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            {/* Visibility Toggle (Faculty) */}
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

                                            {/* Download Link */}
                                            <a
                                                href={`http://localhost:5000/uploads/${doc.s3_key}`}
                                                download
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn"
                                                style={{ padding: '0.4rem 1rem', fontSize: '0.875rem', background: 'rgba(255,255,255,0.1)', textDecoration: 'none', display: 'inline-block' }}
                                            >
                                                Download
                                            </a>
                                            {/* Delete Button (Faculty) */}
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
                                )) : (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                                        No files uploaded yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            {showValidationModal && (
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
            )}
        </div>
    );
};

export default Dashboard;

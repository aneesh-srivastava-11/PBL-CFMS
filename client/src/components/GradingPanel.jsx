import { Award, Download, Edit3, ToggleLeft, ToggleRight, Clock, Users } from 'lucide-react';
import { useState } from 'react';

const GradingPanel = ({
    assignments,
    selectedAssignment,
    assignmentSubmissions,
    onFetchSubmissions,
    onGradeSubmission,
    onMarkExemplar,
    onToggleSubmissions,
    onDownloadSubmission
}) => {
    const [gradingId, setGradingId] = useState(null);
    const [marks, setMarks] = useState('');
    const [controlForm, setControlForm] = useState({});

    const assignmentFiles = assignments.filter(f => f.file_type === 'assignment');

    if (assignmentFiles.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-bold text-lg text-gray-800 border-l-4 border-blue-500 pl-3 mb-4">
                    Grade Assignments
                </h3>
                <p className="text-gray-500 text-sm text-center py-8">No assignments to grade yet.</p>
            </div>
        );
    }

    const currentAssignment = assignments.find(a => a.id === selectedAssignment);

    return (
        <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-bold text-lg text-gray-800 border-l-4 border-blue-500 pl-3 mb-4">
                Grade Assignments
            </h3>

            {/* Assignment List */}
            <div className="space-y-3 mb-6">
                {assignmentFiles.map(assignment => {
                    const submissionCount = assignment.id === selectedAssignment ? assignmentSubmissions.length : 0;

                    return (
                        <div key={assignment.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex-1">
                                    <h4 className="font-semibold text-gray-800">{assignment.filename}</h4>
                                    {assignment.submission_deadline && (
                                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                            <Clock className="h-3 w-3" />
                                            <span>Due: {new Date(assignment.submission_deadline).toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {assignment.submissions_enabled ? (
                                        <ToggleRight className="h-5 w-5 text-green-600" />
                                    ) : (
                                        <ToggleLeft className="h-5 w-5 text-gray-400" />
                                    )}
                                </div>
                            </div>

                            {/* Control Panel */}
                            <div className="bg-blue-50 rounded p-3 mb-3">
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <label className="text-xs font-semibold text-blue-800 mb-1 block">
                                            Submission Deadline
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={controlForm[assignment.id]?.deadline || ''}
                                            onChange={(e) => setControlForm({
                                                ...controlForm,
                                                [assignment.id]: { ...controlForm[assignment.id], deadline: e.target.value }
                                            })}
                                            className="w-full text-xs border-gray-300 rounded p-2"
                                        />
                                    </div>
                                    <button
                                        onClick={() => onToggleSubmissions(
                                            assignment.id,
                                            !assignment.submissions_enabled,
                                            controlForm[assignment.id]?.deadline
                                        )}
                                        className={`px-3 py-2 rounded text-xs font-bold ${assignment.submissions_enabled
                                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                                : 'bg-green-600 hover:bg-green-700 text-white'
                                            }`}
                                    >
                                        {assignment.submissions_enabled ? 'Close' : 'Open'} Submissions
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={() => onFetchSubmissions(assignment.id)}
                                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                            >
                                <Users size={14} />
                                View Submissions {selectedAssignment === assignment.id && `(${submissionCount})`}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Submissions List */}
            {selectedAssignment && currentAssignment && (
                <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-semibold text-gray-800 mb-3">
                        Submissions for: {currentAssignment.filename}
                    </h4>

                    {assignmentSubmissions.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-8">No submissions yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {assignmentSubmissions.map(sub => (
                                <div key={sub.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="font-semibold text-gray-800">{sub.student?.name || 'Unknown'}</p>
                                            <p className="text-xs text-gray-500">{sub.student?.email}</p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                Submitted: {new Date(sub.submitted_at).toLocaleString()}
                                            </p>
                                        </div>
                                        {sub.exemplar_type && (
                                            <span className={`text-xs px-2 py-1 rounded font-bold ${sub.exemplar_type === 'best' ? 'bg-yellow-100 text-yellow-800' :
                                                    sub.exemplar_type === 'average' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-gray-100 text-gray-800'
                                                }`}>
                                                <Award size={12} className="inline mr-1" />
                                                {sub.exemplar_type.toUpperCase()}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex gap-2 items-end mb-3">
                                        {gradingId === sub.id ? (
                                            <>
                                                <div className="flex-1">
                                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">
                                                        Enter Marks
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={marks}
                                                        onChange={(e) => setMarks(e.target.value)}
                                                        className="w-full text-sm border-gray-300 rounded p-2"
                                                        placeholder="85.5"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        onGradeSubmission({ submissionId: sub.id, marks });
                                                        setGradingId(null);
                                                        setMarks('');
                                                    }}
                                                    className="bg-orange-600 text-white px-3 py-2 rounded text-sm hover:bg-orange-700"
                                                >
                                                    Save Grade
                                                </button>
                                                <button
                                                    onClick={() => setGradingId(null)}
                                                    className="bg-gray-300 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-400"
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <div className="flex items-center gap-3 flex-1">
                                                {sub.marks !== null ? (
                                                    <div className="font-bold text-orange-600 text-lg">
                                                        Grade: {sub.marks}
                                                    </div>
                                                ) : null}
                                                <button
                                                    onClick={() => {
                                                        setGradingId(sub.id);
                                                        setMarks(sub.marks || '');
                                                    }}
                                                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                                >
                                                    <Edit3 size={14} />
                                                    {sub.marks !== null ? 'Edit Grade' : 'Grade'}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2 flex-wrap">
                                        <button
                                            onClick={() => onDownloadSubmission(sub.id, sub.filename)}
                                            className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 flex items-center gap-1"
                                        >
                                            <Download size={12} />
                                            Download
                                        </button>
                                        <button
                                            onClick={() => onMarkExemplar(sub.id, sub.exemplar_type === 'best' ? null : 'best')}
                                            className={`text-xs px-3 py-1 rounded flex items-center gap-1 ${sub.exemplar_type === 'best'
                                                    ? 'bg-yellow-200 text-yellow-900 hover:bg-yellow-300'
                                                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                                }`}
                                        >
                                            <Award size={12} />
                                            Best
                                        </button>
                                        <button
                                            onClick={() => onMarkExemplar(sub.id, sub.exemplar_type === 'average' ? null : 'average')}
                                            className={`text-xs px-3 py-1 rounded flex items-center gap-1 ${sub.exemplar_type === 'average'
                                                    ? 'bg-blue-200 text-blue-900 hover:bg-blue-300'
                                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                                }`}
                                        >
                                            <Award size={12} />
                                            Average
                                        </button>
                                        <button
                                            onClick={() => onMarkExemplar(sub.id, sub.exemplar_type === 'poor' ? null : 'poor')}
                                            className={`text-xs px-3 py-1 rounded flex items-center gap-1 ${sub.exemplar_type === 'poor'
                                                    ? 'bg-gray-300 text-gray-900 hover:bg-gray-400'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            <Award size={12} />
                                            Poor
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GradingPanel;

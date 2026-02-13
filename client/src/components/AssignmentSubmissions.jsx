import { Upload, CheckCircle, XCircle, Clock, FileText, Download } from 'lucide-react';

const AssignmentSubmissions = ({
    assignments,
    mySubmissions,
    submissionFile,
    setSubmissionFile,
    submissionUploading,
    onUploadSubmission,
    onDownloadSubmission
}) => {
    const getSubmissionStatus = (assignmentId) => {
        return mySubmissions.find(sub => sub.file_id === assignmentId);
    };

    const assignmentFiles = assignments.filter(f => f.file_type === 'assignment');

    if (assignmentFiles.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-bold text-lg text-gray-800 border-l-4 border-orange-500 pl-3 mb-4">
                    My Assignments
                </h3>
                <p className="text-gray-500 text-sm text-center py-8">No assignments available yet.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-bold text-lg text-gray-800 border-l-4 border-orange-500 pl-3 mb-4">
                My Assignments
            </h3>

            <div className="space-y-4">
                {assignmentFiles.map(assignment => {
                    const submission = getSubmissionStatus(assignment.id);
                    const isEnabled = assignment.submissions_enabled;
                    const isPastDeadline = assignment.submission_deadline &&
                        new Date(assignment.submission_deadline) < new Date();
                    const canSubmit = isEnabled && !isPastDeadline && !submission;

                    return (
                        <div
                            key={assignment.id}
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <FileText className="h-5 w-5 text-orange-600" />
                                        <h4 className="font-semibold text-gray-800">{assignment.filename}</h4>
                                    </div>
                                    {assignment.submission_deadline && (
                                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                            <Clock className="h-3 w-3" />
                                            <span>Due: {new Date(assignment.submission_deadline).toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                                {submission ? (
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="h-5 w-5 text-green-600" />
                                        <span className="text-sm font-medium text-green-700">Submitted</span>
                                    </div>
                                ) : isEnabled ? (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Open</span>
                                ) : (
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Closed</span>
                                )}
                            </div>

                            {submission ? (
                                <div className="bg-gray-50 rounded p-3 space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">Submitted:</span>
                                        <span className="font-medium text-gray-800">
                                            {new Date(submission.submitted_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    {submission.marks !== null && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600">Grade:</span>
                                            <span className="font-bold text-orange-600 text-lg">
                                                {submission.marks}
                                            </span>
                                        </div>
                                    )}
                                    {submission.graded_at && (
                                        <div className="text-xs text-gray-500">
                                            Graded on {new Date(submission.graded_at).toLocaleDateString()}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => onDownloadSubmission(submission.id, submission.filename)}
                                        className="text-sm text-orange-600 hover:underline flex items-center gap-1 mt-2"
                                    >
                                        <Download size={14} />
                                        Download My Submission
                                    </button>
                                </div>
                            ) : canSubmit ? (
                                <form onSubmit={(e) => onUploadSubmission(e, assignment.id)} className="mt-3">
                                    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                                        <div className="flex-1">
                                            <label className="text-xs font-semibold text-gray-500 mb-1 block">
                                                Upload Solution (PDF)
                                            </label>
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                onChange={e => setSubmissionFile(e.target.files[0])}
                                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200"
                                                required
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={submissionUploading}
                                            className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 font-medium text-sm disabled:bg-gray-400 flex items-center gap-2"
                                        >
                                            <Upload size={16} />
                                            {submissionUploading ? 'Uploading...' : 'Submit'}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="mt-3 text-sm text-gray-500 flex items-center gap-2">
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    {!isEnabled ? 'Submissions are closed' :
                                        isPastDeadline ? 'Deadline has passed' :
                                            'Unavailable'}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AssignmentSubmissions;

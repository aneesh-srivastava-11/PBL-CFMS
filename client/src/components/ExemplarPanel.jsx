import { Award, Download, FileText, Star } from 'lucide-react';

const ExemplarPanel = ({ exemplarSubmissions, onDownloadSubmission, onToggleFeatured }) => {
    if (exemplarSubmissions.length === 0) {
        return null;
    }

    const groupedByAssignment = exemplarSubmissions.reduce((acc, sub) => {
        const assignmentId = sub.file_id;
        if (!acc[assignmentId]) {
            acc[assignmentId] = {
                assignment: sub.assignment,
                submissions: []
            };
        }
        acc[assignmentId].submissions.push(sub);
        return acc;
    }, {});

    return (
        <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-bold text-lg text-gray-800 border-l-4 border-orange-500 pl-3 mb-4">
                <Award className="inline h-5 w-5 mr-2 text-orange-600" />
                Exemplar Submissions
            </h3>

            <div className="space-y-6">
                {Object.entries(groupedByAssignment).map(([assignmentId, { assignment, submissions }]) => (
                    <div key={assignmentId} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-4">
                            <FileText className="h-5 w-5 text-orange-600" />
                            <h4 className="font-semibold text-gray-800">{assignment?.filename || 'Assignment'}</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {submissions.map(sub => (
                                <div
                                    key={sub.id}
                                    className={`border-2 rounded-lg p-3 ${sub.exemplar_type === 'best' ? 'border-yellow-300 bg-yellow-50' :
                                        sub.exemplar_type === 'average' ? 'border-blue-300 bg-blue-50' :
                                            'border-gray-300 bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-xs px-2 py-1 rounded font-bold ${sub.exemplar_type === 'best' ? 'bg-yellow-200 text-yellow-900' :
                                            sub.exemplar_type === 'average' ? 'bg-blue-200 text-blue-900' :
                                                'bg-gray-200 text-gray-900'
                                            }`}>
                                            {sub.exemplar_type?.toUpperCase()}
                                        </span>
                                    </div>

                                    <p className="font-semibold text-gray-800 text-sm mb-1">
                                        {sub.student?.name || 'Unknown'}
                                    </p>

                                    {sub.marks !== null && (
                                        <p className="text-lg font-bold text-orange-600 mb-2">
                                            {sub.marks}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => onToggleFeatured(sub.id, !sub.is_featured_exemplar)}
                                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${sub.is_featured_exemplar
                                                ? 'bg-orange-100 text-orange-700 border border-orange-300'
                                                : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-orange-50'
                                                }`}
                                            title={sub.is_featured_exemplar ? "Remove from course file" : "Add to course file"}
                                        >
                                            <Star
                                                size={14}
                                                className={sub.is_featured_exemplar ? 'fill-orange-500 text-orange-500' : ''}
                                            />
                                            {sub.is_featured_exemplar ? 'Featured' : 'Star'}
                                        </button>

                                        <button
                                            onClick={() => onDownloadSubmission(sub.id, sub.filename)}
                                            className="text-xs text-orange-600 hover:underline flex items-center gap-1"
                                        >
                                            <Download size={12} />
                                            Download
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ExemplarPanel;

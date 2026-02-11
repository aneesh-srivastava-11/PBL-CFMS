import { useState } from 'react';
import { CheckCircle, XCircle, FileText } from 'lucide-react';

/**
 * Modal component to display course file validation results
 * Shows which required files are uploaded and which are missing
 */
export default function CourseFileValidationModal({ validationData, onClose, onGenerate }) {
    if (!validationData) return null;

    const progressPercent = (validationData.totalUploaded / validationData.totalRequired) * 100;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[85vh] overflow-y-auto m-4">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">
                            Required Files Checklist
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                            <span className="font-semibold capitalize">{validationData.course_type}</span> Course
                            {' • '}
                            {validationData.totalRequired} files required
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                    >
                        ×
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-gray-700">Upload Progress</span>
                        <span className="text-lg font-bold text-gray-900">
                            {validationData.totalUploaded} / {validationData.totalRequired}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                        <div
                            className={`h-6 rounded-full transition-all duration-500 flex items-center justify-end px-3 ${validationData.valid
                                    ? 'bg-gradient-to-r from-green-400 to-green-600'
                                    : progressPercent > 50
                                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-600'
                                        : 'bg-gradient-to-r from-red-400 to-red-600'
                                }`}
                            style={{ width: `${Math.max(progressPercent, 5)}%` }}
                        >
                            <span className="text-white text-xs font-bold">
                                {Math.round(progressPercent)}%
                            </span>
                        </div>
                    </div>
                    {validationData.valid && (
                        <p className="text-green-600 font-semibold text-sm mt-2 flex items-center">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            All required files uploaded! Ready to generate course file.
                        </p>
                    )}
                    {!validationData.valid && (
                        <p className="text-amber-600 font-semibold text-sm mt-2 flex items-center">
                            <XCircle className="w-4 h-4 mr-2" />
                            {validationData.missing.length} file(s) still needed
                        </p>
                    )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Uploaded Files */}
                    {validationData.uploaded.length > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 className="font-bold text-green-800 mb-3 flex items-center">
                                <CheckCircle className="w-5 h-5 mr-2" />
                                Uploaded ({validationData.uploaded.length})
                            </h4>
                            <ul className="space-y-2 max-h-96 overflow-y-auto">
                                {validationData.uploaded.map((file, idx) => (
                                    <li key={idx} className="text-sm text-gray-700 flex items-start">
                                        <CheckCircle className="w-4 h-4 mr-2 text-green-600 flex-shrink-0 mt-0.5" />
                                        <span>{file}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Missing Files */}
                    {validationData.missing.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <h4 className="font-bold text-red-800 mb-3 flex items-center">
                                <XCircle className="w-5 h-5 mr-2" />
                                Missing ({validationData.missing.length})
                            </h4>
                            <ul className="space-y-2 max-h-96 overflow-y-auto">
                                {validationData.missing.map((file, idx) => (
                                    <li key={idx} className="text-sm text-gray-700 flex items-start">
                                        <XCircle className="w-4 h-4 mr-2 text-red-600 flex-shrink-0 mt-0.5" />
                                        <span>{file}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition"
                    >
                        Close
                    </button>
                    {validationData.valid && onGenerate && (
                        <button
                            onClick={onGenerate}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition flex items-center gap-2"
                        >
                            <FileText className="w-5 h-5" />
                            Generate Course File
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

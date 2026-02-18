import { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import { ArrowLeft, Search, Edit2, Save, X, Trash } from 'lucide-react';

const UserList = ({ type }) => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});

    const apiUrl = import.meta.env.VITE_API_URL.replace(/\/$/, '');
    const title = type === 'faculty' ? 'Manage Faculties' : 'Manage Students';
    const endpoint = type === 'faculty' ? `${apiUrl}/api/hod/faculties` : `${apiUrl}/api/hod/students`;

    useEffect(() => {
        if (!user || (user.role !== 'hod' && user.role !== 'admin')) {
            navigate('/');
            return;
        }
        fetchUsers();
    }, [user, type]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.get(endpoint, config);
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users', error);
            alert('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (user) => {
        setEditingId(user.id);
        setEditForm({ ...user });
    };

    const handleSave = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.put(`${apiUrl}/api/hod/users/${editingId}`, editForm, config);
            alert('User updated successfully');
            setEditingId(null);
            fetchUsers();
        } catch (error) {
            console.error('Update failed', error);
            alert('Failed to update user');
        }
    };

    const handleDelete = async (userToDelete) => {
        if (!window.confirm(`Are you sure you want to delete ${userToDelete.name}? This action cannot be undone.`)) {
            return;
        }

        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.delete(`${apiUrl}/api/hod/users/${userToDelete.id}`, config);
            alert('User deleted successfully');
            fetchUsers();
        } catch (error) {
            console.error('Delete failed', error);
            alert(error.response?.data?.message || 'Failed to delete user');
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex min-h-screen bg-gray-50 font-sans text-gray-800">
            <Sidebar user={user} onLogout={logout} />
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <TopHeader user={user} />
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="bg-white rounded-lg shadow-sm p-6 min-h-[500px]">

                        {/* Header */}
                        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full">
                                    <ArrowLeft size={20} />
                                </button>
                                <h2 className="text-xl font-bold text-gray-800 border-l-4 border-orange-600 pl-3">{title}</h2>
                            </div>
                            <div className="relative w-full md:w-auto">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search name or email..."
                                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 w-full md:w-64"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Table */}
                        {loading ? (
                            <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
                                        <tr>
                                            <th className="p-3">Name</th>
                                            <th className="p-3">Email</th>
                                            {type === 'student' && <th className="p-3">Sem</th>}
                                            {type === 'student' && <th className="p-3">Sec</th>}
                                            <th className="p-3">Phone</th>
                                            <th className="p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredUsers.map(u => (
                                            <tr key={u.id} className="hover:bg-orange-50 transition-colors">
                                                {editingId === u.id ? (
                                                    <>
                                                        <td className="p-3"><input className="border p-1 rounded w-full" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></td>
                                                        <td className="p-3 text-gray-500">{u.email}</td>
                                                        {type === 'student' && <td className="p-3"><input className="border p-1 rounded w-16" value={editForm.academic_semester || ''} onChange={e => setEditForm({ ...editForm, academic_semester: e.target.value })} /></td>}
                                                        {type === 'student' && <td className="p-3"><input className="border p-1 rounded w-12" value={editForm.section || ''} onChange={e => setEditForm({ ...editForm, section: e.target.value })} /></td>}
                                                        <td className="p-3"><input className="border p-1 rounded w-full" value={editForm.phone_number || ''} onChange={e => setEditForm({ ...editForm, phone_number: e.target.value })} /></td>
                                                        <td className="p-3 text-right flex justify-end gap-2">
                                                            <button onClick={handleSave} className="text-green-600 hover:bg-green-100 p-1 rounded"><Save size={16} /></button>
                                                            <button onClick={() => setEditingId(null)} className="text-red-500 hover:bg-red-100 p-1 rounded"><X size={16} /></button>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="p-3 font-medium text-gray-900">{u.name}</td>
                                                        <td className="p-3 text-gray-500">{u.email}</td>
                                                        {type === 'student' && <td className="p-3">{u.academic_semester}</td>}
                                                        {type === 'student' && <td className="p-3">{u.section}</td>}
                                                        <td className="p-3 text-gray-500">{u.phone_number || '-'}</td>
                                                        <td className="p-3 text-right flex justify-end gap-2">
                                                            <button onClick={() => handleEdit(u)} className="text-blue-500 hover:bg-blue-100 p-1 rounded transition">
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button onClick={() => handleDelete(u)} className="text-red-500 hover:bg-red-100 p-1 rounded transition">
                                                                <Trash size={16} />
                                                            </button>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                        {filteredUsers.length === 0 && (
                                            <tr>
                                                <td colSpan="6" className="text-center p-8 text-gray-400">No users found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default UserList;

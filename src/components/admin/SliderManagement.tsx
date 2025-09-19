import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../ui/NotificationProvider';
import { Image as ImageIcon, Search, Filter, Eye, Edit, Trash2, Plus, ArrowLeft, Save, X, CheckCircle, AlertCircle, ChevronUp, ChevronDown, Upload, LinkIcon, Text, Type, ListOrdered } from 'lucide-react';

interface Slider {
    ts_id: string;
    ts_title: string;
    ts_subtitle?: string | null;
    ts_image_url: string;
    ts_button_text?: string | null;
    ts_button_link?: string | null;
    ts_button2_text?: string | null;
    ts_button2_link?: string | null;
    ts_sort_order: number;
    ts_is_active: boolean;
    ts_created_at: string;
    ts_updated_at: string;
    ts_created_by?: string | null;
    ts_updated_by?: string | null;
}

const SliderManagement: React.FC = () => {
    const [sliders, setSliders] = useState<Slider[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedSlider, setSelectedSlider] = useState<Slider | null>(null);
    const [showSliderDetails, setShowSliderDetails] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    const notification = useNotification();

    useEffect(() => {
        loadSliders();
    }, []);

    const loadSliders = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('🔍 Loading sliders from database...');

            const { data: sliders, error } = await supabase
                .from('tbl_sliders')
                .select('*')
                .order('ts_sort_order', { ascending: true })
                .order('ts_created_at', { ascending: false });

            if (error) {
                console.error('❌ Failed to load sliders:', error);
                throw error;
            }

            console.log('✅ Sliders loaded:', sliders);
            setSliders(sliders || []);
        } catch (error) {
            console.error('❌ Failed to load sliders:', error);
            setError('Failed to load sliders. Please check your database connection.');
            if (notification) {
                notification.showError('Load Failed', 'Failed to load slider data from database');
            }
        } finally {
            setLoading(false);
        }
    };

    const filteredSliders = sliders.filter(slider => {
        const matchesSearch =
            (slider.ts_title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (slider.ts_subtitle?.toLowerCase() || '').includes(searchTerm.toLowerCase());

        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'active' && slider.ts_is_active) ||
            (statusFilter === 'inactive' && !slider.ts_is_active);

        return matchesSearch && matchesStatus;
    });

    const handleViewSlider = (slider: Slider) => {
        setSelectedSlider(slider);
        setShowSliderDetails(true);
        setActiveTab('details');
        setEditMode(false);
    };

    const handleDeleteSlider = async (sliderId: string) => {
        if (!confirm('Are you sure you want to delete this slider? This action cannot be undone.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('tbl_sliders')
                .delete()
                .eq('ts_id', sliderId);

            if (error) throw error;

            if (notification) {
                notification.showSuccess('Slider Deleted', 'Slider has been deleted successfully');
            }

            await loadSliders();
        } catch (error) {
            console.error('Failed to delete slider:', error);
            if (notification) {
                notification.showError('Delete Failed', 'Failed to delete slider');
            }
        }
    };

    const handleToggleStatus = async (slider: Slider, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('tbl_sliders')
                .update({ ts_is_active: !currentStatus })
                .eq('ts_id', slider.ts_id);

            if (error) throw error;

            if (notification) {
                notification.showSuccess(
                    'Status Updated',
                    `Slider "${slider.ts_title}" has been ${!currentStatus ? 'activated' : 'deactivated'}`
                );
            }

            await loadSliders();
        } catch (error) {
            console.error('Failed to update slider status:', error);
            if (notification) {
                notification.showError('Update Failed', 'Failed to update slider status');
            }
        }
    };

    const handleUpdateSortOrder = async (sliderId: string, newSortOrder: number) => {
        try {
            const { error } = await supabase
                .from('tbl_sliders')
                .update({ ts_sort_order: newSortOrder })
                .eq('ts_id', sliderId);

            if (error) throw error;

            if (notification) {
                notification.showSuccess('Sort Order Updated', 'Slider order has been updated');
            }

            await loadSliders();
        } catch (error) {
            console.error('Failed to update sort order:', error);
            if (notification) {
                notification.showError('Update Failed', 'Failed to update sort order');
            }
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-16 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="text-center py-12">
                    <ImageIcon className="h-12 w-12 text-red-400 mx-auto mb-4" /> {/* ← Fixed: ImageIcon */}
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Sliders</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={loadSliders}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
                    >
                        <ImageIcon className="h-4 w-4" /> {/* ← Fixed: ImageIcon */}
                        <span>Retry</span>
                    </button>
                </div>
            </div>
        );
    }

    if (showSliderDetails && selectedSlider) {
        return (
            <SliderDetails
                slider={selectedSlider}
                onBack={() => {
                    setShowSliderDetails(false);
                    setSelectedSlider(null);
                    setEditMode(false);
                }}
                onUpdate={loadSliders}
                editMode={editMode}
                setEditMode={setEditMode}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <div className="bg-blue-100 p-3 rounded-lg">
                            <ImageIcon className="h-6 w-6 text-blue-600" /> {/* ← Fixed: ImageIcon */}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Slider Management</h3>
                            <p className="text-gray-600">Manage homepage slider content and appearance</p>
                        </div>
                    </div>
                    <div className="text-sm text-gray-500">
                        Total: {sliders.length} sliders
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Search by title or subtitle..."
                            />
                        </div>
                    </div>

                    <div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    <div>
                        <button
                            onClick={() => {
                                setSelectedSlider(null);
                                setEditMode(true);
                                setShowSliderDetails(true);
                                setActiveTab('details');
                            }}
                            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Add New Slider</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Sliders List */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Preview
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Title & Content
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Buttons
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Order
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSliders.map((slider) => (
                        <tr key={slider.ts_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="h-16 w-24 bg-gray-200 rounded-lg overflow-hidden">
                                    <img
                                        src={slider.ts_image_url}
                                        alt={slider.ts_title}
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik00IDE2TDQgMTdMMTcgMTdMMTcgMTZMNCAxNloiIGZpbGw9IiM5QzlEOUQiLz4KPHBhdGggZD0iTTQgMTNMMTAgMTNMMTAgMTBMMTQgMTBMMTQgMTNMMjAgMTNMMjAgOEwxMiAzTDQgOFYxM1oiIGZpbGw9IiM5QzlEOUQiLz4KPC9zdmc+';
                                        }}
                                    />
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">{slider.ts_title}</div>
                                <div className="text-sm text-gray-500 line-clamp-2">{slider.ts_subtitle}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="space-y-1">
                                    {slider.ts_button_text && (
                                        <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {slider.ts_button_text}
                      </span>
                                    )}
                                    {slider.ts_button2_text && (
                                        <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                        {slider.ts_button2_text}
                      </span>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-1">
                                    <button
                                        onClick={() => handleUpdateSortOrder(slider.ts_id, slider.ts_sort_order - 1)}
                                        className="p-1 text-gray-400 hover:text-gray-600"
                                        disabled={slider.ts_sort_order <= 1}
                                    >
                                        <ChevronUp className="h-4 w-4" />
                                    </button>
                                    <span className="text-sm font-medium text-gray-900 w-6 text-center">
                      {slider.ts_sort_order}
                    </span>
                                    <button
                                        onClick={() => handleUpdateSortOrder(slider.ts_id, slider.ts_sort_order + 1)}
                                        className="p-1 text-gray-400 hover:text-gray-600"
                                    >
                                        <ChevronDown className="h-4 w-4" />
                                    </button>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      slider.ts_is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                  }`}>
                    {slider.ts_is_active ? (
                        <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                        </>
                    ) : (
                        <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Inactive
                        </>
                    )}
                  </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(slider.ts_created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleViewSlider(slider)}
                                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                                        title="View Details"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleToggleStatus(slider, slider.ts_is_active)}
                                        className={`p-1 rounded ${
                                            slider.ts_is_active
                                                ? 'text-red-600 hover:text-red-800 hover:bg-red-50'
                                                : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                                        }`}
                                        title={slider.ts_is_active ? 'Deactivate' : 'Activate'}
                                    >
                                        {slider.ts_is_active ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteSlider(slider.ts_id)}
                                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {filteredSliders.length === 0 && (
                <div className="text-center py-12">
                    <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" /> {/* ← Fixed: ImageIcon */}
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No sliders found</h3>
                    <p className="text-gray-600">
                        {searchTerm || statusFilter !== 'all'
                            ? 'Try adjusting your search criteria'
                            : 'No sliders have been created yet'
                        }
                    </p>
                </div>
            )}
        </div>
    );
};

// Slider Details Component
const SliderDetails: React.FC<{
    slider: Slider | null;
    onBack: () => void;
    onUpdate: () => void;
    editMode: boolean;
    setEditMode: (mode: boolean) => void;
    activeTab: string;
    setActiveTab: (tab: string) => void;
}> = ({ slider, onBack, onUpdate, editMode, setEditMode, activeTab, setActiveTab }) => {
    const [loading, setLoading] = useState(false);
    const [editData, setEditData] = useState({
        ts_title: slider?.ts_title || '',
        ts_subtitle: slider?.ts_subtitle || '',
        ts_image_url: slider?.ts_image_url || '',
        ts_button_text: slider?.ts_button_text || '',
        ts_button_link: slider?.ts_button_link || '',
        ts_button2_text: slider?.ts_button2_text || '',
        ts_button2_link: slider?.ts_button2_link || '',
        ts_sort_order: slider?.ts_sort_order || 0,
        ts_is_active: slider?.ts_is_active ?? true,
    });
    const notification = useNotification();

    const handleSave = async () => {
        setLoading(true);
        try {
            if (slider) {
                // Update existing slider
                const { error } = await supabase
                    .from('tbl_sliders')
                    .update(editData)
                    .eq('ts_id', slider.ts_id);

                if (error) throw error;
                notification.showSuccess('Slider Updated', 'Slider has been updated successfully');
            } else {
                // Create new slider
                const { error } = await supabase
                    .from('tbl_sliders')
                    .insert([editData]);

                if (error) throw error;
                notification.showSuccess('Slider Created', 'New slider has been created successfully');
            }

            setEditMode(false);
            await onUpdate();
            if (!slider) onBack(); // Go back to list after creating new slider
        } catch (error) {
            console.error('Failed to save slider:', error);
            notification.showError('Save Failed', 'Failed to save slider information');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setEditData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
        }));
    };

    const tabs = [
        { id: 'details', label: 'Slider Details', icon: ImageIcon }, // ← Fixed: ImageIcon
        { id: 'preview', label: 'Preview', icon: Eye },
    ];

    return (
        <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={onBack}
                            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span>Back to Sliders</span>
                        </button>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                {slider ? slider.ts_title : 'Create New Slider'}
                            </h3>
                            <p className="text-gray-600">Slider Details & Management</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        {activeTab === 'details' && (
                            <>
                                {editMode ? (
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={handleSave}
                                            disabled={loading}
                                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:bg-green-300"
                                        >
                                            <Save className="h-4 w-4" />
                                            <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (slider) {
                                                    setEditMode(false);
                                                    setEditData({
                                                        ts_title: slider.ts_title,
                                                        ts_subtitle: slider.ts_subtitle || '',
                                                        ts_image_url: slider.ts_image_url,
                                                        ts_button_text: slider.ts_button_text || '',
                                                        ts_button_link: slider.ts_button_link || '',
                                                        ts_button2_text: slider.ts_button2_text || '',
                                                        ts_button2_link: slider.ts_button2_link || '',
                                                        ts_sort_order: slider.ts_sort_order,
                                                        ts_is_active: slider.ts_is_active,
                                                    });
                                                } else {
                                                    onBack();
                                                }
                                            }}
                                            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                                        >
                                            <X className="h-4 w-4" />
                                            <span>Cancel</span>
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setEditMode(true)}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                                    >
                                        <Edit className="h-4 w-4" />
                                        <span>Edit Slider</span>
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="flex space-x-8">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            <div className="p-6">
                {activeTab === 'details' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Slider Content */}
                        <div className="space-y-6">
                            <div className="bg-gray-50 p-6 rounded-lg">
                                <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                                    <Type className="h-5 w-5 mr-2" />
                                    Slider Content
                                </h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Title *</label>
                                        {editMode ? (
                                            <input
                                                type="text"
                                                name="ts_title"
                                                value={editData.ts_title}
                                                onChange={handleChange}
                                                required
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        ) : (
                                            <p className="text-gray-900 mt-1">{slider?.ts_title}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Subtitle</label>
                                        {editMode ? (
                                            <textarea
                                                name="ts_subtitle"
                                                value={editData.ts_subtitle}
                                                onChange={handleChange}
                                                rows={3}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        ) : (
                                            <p className="text-gray-900 mt-1">{slider?.ts_subtitle || 'Not provided'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Image URL *</label>
                                        {editMode ? (
                                            <div className="mt-1">
                                                <input
                                                    type="url"
                                                    name="ts_image_url"
                                                    value={editData.ts_image_url}
                                                    onChange={handleChange}
                                                    required
                                                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    placeholder="https://example.com/image.jpg"
                                                />
                                                <div className="mt-2 flex items-center space-x-2 text-sm text-gray-500">
                                                    <Upload className="h-4 w-4" />
                                                    <span>Enter a valid image URL</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-gray-900 mt-1 truncate">{slider?.ts_image_url}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Buttons & Settings */}
                        <div className="space-y-6">
                            <div className="bg-gray-50 p-6 rounded-lg">
                                <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                                    <LinkIcon className="h-5 w-5 mr-2" />
                                    Call-to-Action Buttons
                                </h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Primary Button Text</label>
                                        {editMode ? (
                                            <input
                                                type="text"
                                                name="ts_button_text"
                                                value={editData.ts_button_text}
                                                onChange={handleChange}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="e.g., Get Started"
                                            />
                                        ) : (
                                            <p className="text-gray-900 mt-1">{slider?.ts_button_text || 'Not set'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Primary Button Link</label>
                                        {editMode ? (
                                            <input
                                                type="url"
                                                name="ts_button_link"
                                                value={editData.ts_button_link}
                                                onChange={handleChange}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="https://example.com/action"
                                            />
                                        ) : (
                                            <p className="text-gray-900 mt-1 truncate">{slider?.ts_button_link || 'Not set'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Secondary Button Text</label>
                                        {editMode ? (
                                            <input
                                                type="text"
                                                name="ts_button2_text"
                                                value={editData.ts_button2_text}
                                                onChange={handleChange}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="e.g., Learn More"
                                            />
                                        ) : (
                                            <p className="text-gray-900 mt-1">{slider?.ts_button2_text || 'Not set'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Secondary Button Link</label>
                                        {editMode ? (
                                            <input
                                                type="url"
                                                name="ts_button2_link"
                                                value={editData.ts_button2_link}
                                                onChange={handleChange}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="https://example.com/learn-more"
                                            />
                                        ) : (
                                            <p className="text-gray-900 mt-1 truncate">{slider?.ts_button2_link || 'Not set'}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-6 rounded-lg">
                                <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                                    <ListOrdered className="h-5 w-5 mr-2" />
                                    Slider Settings
                                </h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Sort Order</label>
                                        {editMode ? (
                                            <input
                                                type="number"
                                                name="ts_sort_order"
                                                value={editData.ts_sort_order}
                                                onChange={handleChange}
                                                min="0"
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        ) : (
                                            <p className="text-gray-900 mt-1">{slider?.ts_sort_order}</p>
                                        )}
                                    </div>
                                    {editMode && (
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                name="ts_is_active"
                                                checked={editData.ts_is_active}
                                                onChange={handleChange}
                                                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                            />
                                            <label className="ml-2 block text-sm text-gray-700">Active (Visible on homepage)</label>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'preview' && slider && (
                    <div className="bg-gray-900 rounded-lg p-8">
                        <div className="relative h-96 rounded-lg overflow-hidden">
                            {/* Background Image */}
                            <div
                                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                                style={{ backgroundImage: `url(${slider.ts_image_url})` }}
                            ></div>

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black bg-opacity-50"></div>

                            {/* Content */}
                            <div className="relative z-10 h-full flex items-center justify-center p-8">
                                <div className="text-white text-center max-w-2xl">
                                    <h2 className="text-4xl font-bold mb-4">{slider.ts_title}</h2>
                                    {slider.ts_subtitle && (
                                        <p className="text-xl mb-8 opacity-90">{slider.ts_subtitle}</p>
                                    )}
                                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                        {slider.ts_button_text && (
                                            <a
                                                href={slider.ts_button_link || '#'}
                                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                                            >
                                                {slider.ts_button_text}
                                            </a>
                                        )}
                                        {slider.ts_button2_text && (
                                            <a
                                                href={slider.ts_button2_link || '#'}
                                                className="bg-transparent hover:bg-white/10 text-white font-bold border-2 border-white py-3 px-6 rounded-lg transition-colors"
                                            >
                                                {slider.ts_button2_text}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SliderManagement;
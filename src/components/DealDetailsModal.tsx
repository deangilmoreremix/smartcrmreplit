import React, { useState } from 'react';
import { 
  X, 
  Edit, 
  Save, 
  DollarSign, 
  Calendar, 
  User, 
  Building2,
  Phone,
  Mail,
  Target,
  Clock,
  Activity,
  Paperclip,
  MessageSquare,
  Plus,
  TrendingUp
} from 'lucide-react';
import { Deal, DealStage } from '../types/deal';
import { useDealStore } from '../store/dealStore';
import { useContactStore } from '../store/contactStore';

interface DealDetailsModalProps {
  deal: Deal | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (deal: Deal) => void;
}

const DealDetailsModal: React.FC<DealDetailsModalProps> = ({
  deal,
  isOpen,
  onClose,
  onSave
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDeal, setEditedDeal] = useState<Deal | null>(deal);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'files'>('overview');
  
  const { updateDeal, getActivePipeline } = useDealStore();
  const { contacts } = useContactStore();
  
  const pipeline = getActivePipeline();
  const contact = deal ? contacts[deal.contactId] : null;

  React.useEffect(() => {
    setEditedDeal(deal);
    setIsEditing(false);
  }, [deal]);

  if (!isOpen || !deal || !editedDeal) return null;

  const handleSave = async () => {
    if (editedDeal) {
      await updateDeal(editedDeal.id, editedDeal);
      onSave?.(editedDeal);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedDeal(deal);
    setIsEditing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: editedDeal.currency || 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStageColor = (stage: DealStage) => {
    return {
      backgroundColor: stage.color + '20',
      color: stage.color,
      borderColor: stage.color
    };
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editedDeal.title}
                onChange={(e) => setEditedDeal({ ...editedDeal, title: e.target.value })}
                className="text-xl font-semibold text-gray-900 bg-transparent border-none outline-none w-full"
              />
            ) : (
              <h2 className="text-xl font-semibold text-gray-900">{deal.title}</h2>
            )}
            <div className="flex items-center space-x-4 mt-2">
              <span
                className="px-3 py-1 rounded-full text-sm font-medium border"
                style={getStageColor(deal.stage)}
              >
                {deal.stage.name}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(deal.priority)}`}>
                {deal.priority} priority
              </span>
              <span className="text-sm text-gray-500">
                #{deal.id.slice(-6)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md"
                >
                  <Save size={16} className="mr-1" />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-md"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
              >
                <Edit size={16} className="mr-1" />
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: Target },
              { id: 'activity', label: 'Activity', icon: Activity },
              { id: 'files', label: 'Files', icon: Paperclip }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon size={16} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Deal Value & Probability */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Deal Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Deal Value
                      </label>
                      {isEditing ? (
                        <div className="flex items-center">
                          <DollarSign size={16} className="text-gray-400 mr-1" />
                          <input
                            type="number"
                            value={editedDeal.value}
                            onChange={(e) => setEditedDeal({ ...editedDeal, value: Number(e.target.value) })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center text-lg font-semibold text-gray-900">
                          <DollarSign size={16} className="text-green-600 mr-1" />
                          {formatCurrency(deal.value)}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Probability
                      </label>
                      {isEditing ? (
                        <div className="flex items-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={editedDeal.probability}
                            onChange={(e) => setEditedDeal({ ...editedDeal, probability: Number(e.target.value) })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-gray-500">%</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <TrendingUp size={16} className="text-blue-600 mr-1" />
                          <span className="text-lg font-semibold text-gray-900">{deal.probability}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editedDeal.description || ''}
                      onChange={(e) => setEditedDeal({ ...editedDeal, description: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Deal description..."
                    />
                  ) : (
                    <p className="text-gray-700 bg-gray-50 rounded-lg p-4">
                      {deal.description || 'No description provided'}
                    </p>
                  )}
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {deal.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                    {isEditing && (
                      <button className="px-3 py-1 border-2 border-dashed border-gray-300 text-gray-500 text-sm rounded-full hover:border-blue-400 hover:text-blue-600">
                        <Plus size={14} className="inline mr-1" />
                        Add Tag
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Contact Information */}
                {contact && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact</h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <User size={16} className="text-gray-400" />
                        <span className="font-medium text-gray-900">{contact.name}</span>
                      </div>
                      {contact.company && (
                        <div className="flex items-center space-x-3">
                          <Building2 size={16} className="text-gray-400" />
                          <span className="text-gray-700">{contact.company}</span>
                        </div>
                      )}
                      {contact.email && (
                        <div className="flex items-center space-x-3">
                          <Mail size={16} className="text-gray-400" />
                          <a href={`mailto:${contact.email}`} className="text-blue-600 hover:text-blue-700">
                            {contact.email}
                          </a>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center space-x-3">
                          <Phone size={16} className="text-gray-400" />
                          <a href={`tel:${contact.phone}`} className="text-blue-600 hover:text-blue-700">
                            {contact.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Calendar size={16} className="text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Created</p>
                        <p className="text-sm text-gray-600">{deal.createdAt.toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Clock size={16} className="text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Last Updated</p>
                        <p className="text-sm text-gray-600">{deal.updatedAt.toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    {deal.expectedCloseDate && (
                      <div className="flex items-center space-x-3">
                        <Target size={16} className="text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Expected Close</p>
                          <p className="text-sm text-gray-600">{deal.expectedCloseDate.toLocaleDateString()}</p>
                        </div>
                      </div>
                    )}
                    
                    {deal.daysInStage && (
                      <div className="flex items-center space-x-3">
                        <Clock size={16} className="text-orange-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Days in Stage</p>
                          <p className="text-sm text-gray-600">{deal.daysInStage} days</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Activity Timeline</h3>
                <button className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md">
                  <Plus size={16} className="mr-1" />
                  Add Activity
                </button>
              </div>
              
              <div className="space-y-4">
                {deal.activities.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare size={48} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
                    <p className="text-gray-500">Start by adding a note, call, or meeting.</p>
                  </div>
                ) : (
                  deal.activities.map((activity, index) => (
                    <div key={index} className="border-l-4 border-blue-400 pl-4 py-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">{activity.title}</h4>
                        <span className="text-sm text-gray-500">
                          {activity.createdAt.toLocaleDateString()}
                        </span>
                      </div>
                      {activity.description && (
                        <p className="text-gray-700 mt-1">{activity.description}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'files' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Attachments</h3>
                <button className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md">
                  <Plus size={16} className="mr-1" />
                  Upload File
                </button>
              </div>
              
              <div className="space-y-3">
                {deal.attachments.length === 0 ? (
                  <div className="text-center py-8">
                    <Paperclip size={48} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No files attached</h3>
                    <p className="text-gray-500">Upload contracts, proposals, or other documents.</p>
                  </div>
                ) : (
                  deal.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Paperclip size={16} className="text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{attachment.filename}</p>
                          <p className="text-sm text-gray-500">
                            {(attachment.fileSize / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        Download
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DealDetailsModal;

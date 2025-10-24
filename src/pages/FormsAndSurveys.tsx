import React, { useState, useEffect } from 'react';
import { useFormStore, FormField } from '../store/formStore';
import { 
  FileText, 
  Plus, 
  PlusCircle, 
  Trash2, 
  Share2, 
  Copy, 
  Settings, 
  MoveDown, 
  MoveUp, 
  Edit, 
  Check, 
  X,
  Brain,
  Eye,
  Clipboard,
  BarChart2,
  Link as LinkIcon,
  ToggleLeft,
  ToggleRight,
  Users
} from 'lucide-react';
import FormSubmissionsView from '../components/marketing/FormSubmissionsView';

const FormsAndSurveys: React.FC = () => {
  const { 
    forms, 
    fetchForms, 
    createForm, 
    updateForm, 
    deleteForm,
    getPublicFormUrl,
    toggleFormActive
  } = useFormStore();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showFormDetail, setShowFormDetail] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'builder' | 'preview' | 'submissions' | 'settings'>('builder');
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formPurpose, setFormPurpose] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<FormField[] | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Current form state
  const [currentForm, setCurrentForm] = useState({
    id: '',
    name: 'New Form',
    description: '',
    fields: [],
    submissions: 0,
    lastUpdated: new Date(),
    isActive: true
  });
  
  // Form field being edited currently
  const [editingField, setEditingField] = useState<FormField | null>(null);
  
  useEffect(() => {
    fetchForms();
  }, []);
  
  // Handle opening an existing form for editing
  const openFormEditor = (formId: string) => {
    const form = forms[formId];
    if (form) {
      setCurrentForm({
        id: form.id,
        name: form.name,
        description: form.description || '',
        fields: [...form.fields], // Clone to avoid mutating the original
        submissions: form.submissions,
        lastUpdated: form.lastUpdated,
        isActive: form.isActive
      });
      setShowFormDetail(formId);
      setActiveTab('builder');
    }
  };
  
  // Handle adding a new field to the form
  const addField = (type: FormField['type']) => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type,
      label: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      required: false
    };
    
    if (type === 'select' || type === 'checkbox' || type === 'radio') {
      newField.options = ['Option 1', 'Option 2', 'Option 3'];
    }
    
    setCurrentForm({
      ...currentForm,
      fields: [...currentForm.fields, newField]
    });
  };
  
  // Handle removing a field from the form
  const removeField = (id: string) => {
    setCurrentForm({
      ...currentForm,
      fields: currentForm.fields.filter(field => field.id !== id)
    });
  };
  
  // Handle moving a field up or down in the form
  const moveField = (id: string, direction: 'up' | 'down') => {
    const index = currentForm.fields.findIndex(field => field.id === id);
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === currentForm.fields.length - 1)
    ) {
      return;
    }
    
    const newFields = [...currentForm.fields];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    
    setCurrentForm({
      ...currentForm,
      fields: newFields
    });
  };
  
  // Handle starting to edit a field
  const startEditing = (field: FormField) => {
    setEditingField({ ...field });
  };
  
  // Handle saving an edited field
  const saveField = () => {
    if (!editingField) return;
    
    setCurrentForm({
      ...currentForm,
      fields: currentForm.fields.map(field => 
        field.id === editingField.id ? editingField : field
      )
    });
    
    setEditingField(null);
  };
  
  // Handle canceling field editing
  const cancelEditing = () => {
    setEditingField(null);
  };
  
  // Handle changes to the editing field
  const handleEditingChange = (key: string, value: any) => {
    if (!editingField) return;
    
    setEditingField({
      ...editingField,
      [key]: value
    });
  };
  
  // Handle adding an option to a select/checkbox/radio field
  const addOption = () => {
    if (!editingField || !editingField.options) return;
    
    setEditingField({
      ...editingField,
      options: [...editingField.options, `Option ${editingField.options.length + 1}`]
    });
  };
  
  // Handle updating an option value
  const updateOption = (index: number, value: string) => {
    if (!editingField || !editingField.options) return;
    
    const newOptions = [...editingField.options];
    newOptions[index] = value;
    
    setEditingField({
      ...editingField,
      options: newOptions
    });
  };
  
  // Handle removing an option
  const removeOption = (index: number) => {
    if (!editingField || !editingField.options) return;
    
    setEditingField({
      ...editingField,
      options: editingField.options.filter((_, i) => i !== index)
    });
  };
  
  // Handle saving the form
  const saveForm = async () => {
    if (currentForm.id) {
      // Update existing form
      await updateForm(currentForm.id, currentForm);
    } else {
      // Create new form
      await createForm(currentForm);
    }
    
    setShowCreateForm(false);
    setShowFormDetail(null);
  };
  
  // Handle deleting a form
  const handleDeleteForm = async (id: string) => {
    if (confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      await deleteForm(id);
      if (showFormDetail === id) {
        setShowFormDetail(null);
      }
    }
  };
  
  // Handle toggling a form's active status
  const handleToggleFormActive = async (id: string, isActive: boolean) => {
    await toggleFormActive(id, isActive);
    
    // If we're currently viewing this form, update the local state too
    if (showFormDetail === id) {
      setCurrentForm({
        ...currentForm,
        isActive
      });
    }
  };
  
  // Generate field suggestions with AI
  const generateAIFormFields = async () => {
    if (!formPurpose.trim()) return;
    
    setIsGenerating(true);
    setAiSuggestion(null);
    
    try {
      // In a real implementation, we would use an AI service to generate form fields
      // For demo purposes, we'll simulate a response
      
      let suggestedFields: FormField[] = [];
      
      if (formPurpose.toLowerCase().includes('contact')) {
        suggestedFields = [
          { id: `ai-1-${Date.now()}`, type: 'text', label: 'Full Name', required: true },
          { id: `ai-2-${Date.now()}`, type: 'email', label: 'Email Address', required: true },
          { id: `ai-3-${Date.now()}`, type: 'phone', label: 'Phone Number', required: false },
          { id: `ai-4-${Date.now()}`, type: 'select', label: 'How did you hear about us?', required: false, options: ['Google', 'Social Media', 'Referral', 'Advertisement', 'Other'] },
          { id: `ai-5-${Date.now()}`, type: 'textarea', label: 'Message', required: true }
        ];
      } else if (formPurpose.toLowerCase().includes('survey') || formPurpose.toLowerCase().includes('feedback')) {
        suggestedFields = [
          { id: `ai-1-${Date.now()}`, type: 'text', label: 'Full Name', required: false },
          { id: `ai-2-${Date.now()}`, type: 'email', label: 'Email Address', required: true },
          { id: `ai-3-${Date.now()}`, type: 'radio', label: 'How satisfied are you with our product?', required: true, options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'] },
          { id: `ai-4-${Date.now()}`, type: 'checkbox', label: 'Which features do you use most?', required: false, options: ['Feature A', 'Feature B', 'Feature C', 'Feature D'] },
          { id: `ai-5-${Date.now()}`, type: 'textarea', label: 'What improvements would you suggest?', required: false }
        ];
      } else if (formPurpose.toLowerCase().includes('lead') || formPurpose.toLowerCase().includes('request')) {
        suggestedFields = [
          { id: `ai-1-${Date.now()}`, type: 'text', label: 'Full Name', required: true },
          { id: `ai-2-${Date.now()}`, type: 'email', label: 'Business Email', required: true },
          { id: `ai-3-${Date.now()}`, type: 'text', label: 'Company Name', required: true },
          { id: `ai-4-${Date.now()}`, type: 'select', label: 'Company Size', required: true, options: ['1-10', '11-50', '51-200', '201-500', '500+'] },
          { id: `ai-5-${Date.now()}`, type: 'select', label: 'Budget Range', required: false, options: ['$0-$5,000', '$5,001-$10,000', '$10,001-$25,000', '$25,001+'] },
          { id: `ai-6-${Date.now()}`, type: 'textarea', label: 'Project Details', required: true }
        ];
      } else if (formPurpose.toLowerCase().includes('event') || formPurpose.toLowerCase().includes('registration')) {
        suggestedFields = [
          { id: `ai-1-${Date.now()}`, type: 'text', label: 'Full Name', required: true },
          { id: `ai-2-${Date.now()}`, type: 'email', label: 'Email Address', required: true },
          { id: `ai-3-${Date.now()}`, type: 'phone', label: 'Phone Number', required: false },
          { id: `ai-4-${Date.now()}`, type: 'text', label: 'Company Name', required: false },
          { id: `ai-5-${Date.now()}`, type: 'select', label: 'Number of Attendees', required: true, options: ['1', '2', '3', '4', '5+'] },
          { id: `ai-6-${Date.now()}`, type: 'select', label: 'Dietary Restrictions', required: false, options: ['None', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Other'] },
          { id: `ai-7-${Date.now()}`, type: 'textarea', label: 'Special Requests', required: false }
        ];
      } else {
        // Generic form
        suggestedFields = [
          { id: `ai-1-${Date.now()}`, type: 'text', label: 'Full Name', required: true },
          { id: `ai-2-${Date.now()}`, type: 'email', label: 'Email Address', required: true },
          { id: `ai-3-${Date.now()}`, type: 'textarea', label: 'Additional Information', required: false }
        ];
      }
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setAiSuggestion(suggestedFields);
    } catch (error) {
      console.error("Failed to generate form fields:", error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Use AI suggestions in the form
  const useAiSuggestion = () => {
    if (!aiSuggestion) return;
    
    setCurrentForm({
      ...currentForm,
      fields: [...currentForm.fields, ...aiSuggestion]
    });
    
    setAiSuggestion(null);
    setFormPurpose('');
  };
  
  // Copy form share URL to clipboard
  const copyShareUrl = (formId: string) => {
    const url = getPublicFormUrl(formId);
    navigator.clipboard.writeText(url)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => console.error('Failed to copy URL:', err));
  };
  
  // Render a preview of the field
  const renderFieldPreview = (field: FormField) => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'number':
        return (
          <input
            type={field.type === 'phone' ? 'tel' : field.type}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            className="w-full p-2 border rounded-md"
            disabled
          />
        );
      case 'textarea':
        return (
          <textarea
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            className="w-full p-2 border rounded-md"
            rows={3}
            disabled
          />
        );
      case 'select':
        return (
          <select className="w-full p-2 border rounded-md" disabled>
            <option value="" disabled selected>Select an option</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        );
      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <div key={index} className="flex items-center">
                <input type="checkbox" disabled className="mr-2" />
                <label className="text-sm text-gray-700">{option}</label>
              </div>
            ))}
          </div>
        );
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <div key={index} className="flex items-center">
                <input type="radio" disabled className="mr-2" />
                <label className="text-sm text-gray-700">{option}</label>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };
  
  // Render a preview of the full form
  const renderFormPreview = () => {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-50 p-6 rounded-md border border-gray-200">
          <h2 className="text-xl font-bold mb-4">{currentForm.name}</h2>
          {currentForm.description && (
            <p className="text-gray-600 mb-6">{currentForm.description}</p>
          )}
          
          <div className="space-y-6">
            {currentForm.fields.map((field) => (
              <div key={field.id} className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderFieldPreview(field)}
              </div>
            ))}
            
            <div className="pt-4">
              <button className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md">
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Render form analytics
  const renderFormAnalytics = (form: any) => {
    const conversionRate = form.submissions > 0 && form.totalViews 
      ? ((form.submissions / form.totalViews) * 100).toFixed(1) 
      : '0.0';
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Views</p>
              <p className="text-2xl font-semibold">{form.totalViews || 0}</p>
            </div>
            <div className="p-2 bg-blue-100 text-blue-600 rounded-md">
              <Eye size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Submissions</p>
              <p className="text-2xl font-semibold">{form.submissions}</p>
            </div>
            <div className="p-2 bg-green-100 text-green-600 rounded-md">
              <FileText size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Conversion Rate</p>
              <p className="text-2xl font-semibold">{conversionRate}%</p>
            </div>
            <div className="p-2 bg-purple-100 text-purple-600 rounded-md">
              <BarChart2 size={20} />
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Forms & Surveys</h1>
          <p className="text-gray-600 mt-1">Create, manage, and analyze custom forms and surveys</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button 
            onClick={() => {
              setCurrentForm({
                id: '',
                name: 'New Form',
                description: '',
                fields: [],
                submissions: 0,
                lastUpdated: new Date(),
                isActive: true
              });
              setShowCreateForm(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
          >
            <PlusCircle size={18} className="mr-1" />
            Create Form
          </button>
        </div>
      </header>

      {/* Form list when not creating/editing */}
      {!showCreateForm && !showFormDetail ? (
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Your Forms & Surveys</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Search forms..."
                className="px-3 py-1 border rounded-md text-sm"
              />
            </div>
          </div>
          
          {Object.values(forms).length === 0 ? (
            <div className="p-8 text-center">
              <FileText size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No forms yet</h3>
              <p className="text-gray-500 mt-2 mb-4">Create your first form to start collecting data</p>
              <button
                onClick={() => {
                  setCurrentForm({
                    id: '',
                    name: 'New Form',
                    description: '',
                    fields: [],
                    submissions: 0,
                    lastUpdated: new Date(),
                    isActive: true
                  });
                  setShowCreateForm(true);
                }}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
              >
                <Plus size={18} className="mr-1" />
                Create Your First Form
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Form Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fields
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submissions
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.values(forms).map((form) => (
                    <tr key={form.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600" onClick={() => openFormEditor(form.id)}>
                              {form.name}
                            </div>
                            <div className="text-sm text-gray-500">{form.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{form.fields.length} fields</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{form.submissions}</div>
                        {form.conversionRate !== undefined && (
                          <div className="text-xs text-gray-500">{form.conversionRate}% conversion</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button 
                          onClick={() => handleToggleFormActive(form.id, !form.isActive)}
                          className="inline-flex items-center"
                        >
                          {form.isActive ? (
                            <span className="flex items-center text-green-600">
                              <ToggleRight size={18} className="mr-1" />
                              <span className="text-sm">Active</span>
                            </span>
                          ) : (
                            <span className="flex items-center text-gray-500">
                              <ToggleLeft size={18} className="mr-1" />
                              <span className="text-sm">Inactive</span>
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {form.lastUpdated.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button 
                          onClick={() => openFormEditor(form.id)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => copyShareUrl(form.id)}
                          className="text-gray-600 hover:text-gray-900 mr-3"
                          title="Copy share link"
                        >
                          <Share2 size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            const url = getPublicFormUrl(form.id);
                            window.open(url, '_blank');
                          }}
                          className="text-gray-600 hover:text-gray-900 mr-3"
                          title="Preview form"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteForm(form.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete form"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        // Form creation/editing view
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">{currentForm.id ? 'Edit Form' : 'Create New Form'}</h2>
            <div className="flex space-x-2">
              {currentForm.id && (
                <div className="space-x-2">
                  <button
                    onClick={() => {
                      const url = getPublicFormUrl(currentForm.id);
                      window.open(url, '_blank');
                    }}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <Eye size={16} className="mr-1" />
                    View Live Form
                  </button>
                  <button 
                    onClick={() => setActiveTab(activeTab === 'preview' ? 'builder' : 'preview')}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {activeTab === 'preview' ? 'Back to Editor' : 'Preview Form'}
                  </button>
                </div>
              )}
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setShowFormDetail(null);
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveForm}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-md text-sm text-white"
              >
                Save Form
              </button>
            </div>
          </div>
          
          {/* Tabs for form detail view */}
          {currentForm.id && (
            <div className="border-b border-gray-200 mb-6">
              <nav className="flex space-x-8">
                <button
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'builder'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setActiveTab('builder')}
                >
                  Builder
                </button>
                <button
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'preview'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setActiveTab('preview')}
                >
                  Preview
                </button>
                <button
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'submissions'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setActiveTab('submissions')}
                >
                  Submissions
                </button>
                <button
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'settings'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setActiveTab('settings')}
                >
                  Settings
                </button>
              </nav>
            </div>
          )}
          
          {/* Form analytics */}
          {currentForm.id && activeTab !== 'preview' && forms[currentForm.id] && (
            renderFormAnalytics(forms[currentForm.id])
          )}
          
          {/* Builder Tab */}
          {(activeTab === 'builder' || !currentForm.id) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Form Name
                    </label>
                    <input
                      type="text"
                      value={currentForm.name}
                      onChange={(e) => setCurrentForm({ ...currentForm, name: e.target.value })}
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter form name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={currentForm.description}
                      onChange={(e) => setCurrentForm({ ...currentForm, description: e.target.value })}
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter form description"
                      rows={2}
                    />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-md font-medium mb-2">Form Fields</h3>
                  
                  {currentForm.fields.length === 0 ? (
                    <div className="bg-gray-50 p-8 rounded-md border-2 border-dashed border-gray-300 text-center">
                      <p className="text-gray-500 mb-2">No fields added yet</p>
                      <p className="text-gray-500 text-sm mb-4">Click "Add Field" below to create form fields</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {currentForm.fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="bg-gray-50 p-4 rounded-md border border-gray-200"
                        >
                          {editingField && editingField.id === field.id ? (
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <h4 className="text-sm font-medium">Editing Field</h4>
                                <div className="flex space-x-1">
                                  <button
                                    onClick={saveField}
                                    className="p-1 text-green-600 hover:text-green-800"
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button
                                    onClick={cancelEditing}
                                    className="p-1 text-red-600 hover:text-red-800"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              </div>
                              
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Field Label
                                </label>
                                <input
                                  type="text"
                                  value={editingField.label}
                                  onChange={(e) => handleEditingChange('label', e.target.value)}
                                  className="w-full p-1.5 text-sm border rounded-md"
                                />
                              </div>
                              
                              {['text', 'email', 'phone', 'number', 'textarea'].includes(editingField.type) && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Placeholder
                                  </label>
                                  <input
                                    type="text"
                                    value={editingField.placeholder || ''}
                                    onChange={(e) => handleEditingChange('placeholder', e.target.value)}
                                    className="w-full p-1.5 text-sm border rounded-md"
                                    placeholder="Enter placeholder text"
                                  />
                                </div>
                              )}
                              
                              {['select', 'checkbox', 'radio'].includes(editingField.type) && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Options
                                  </label>
                                  <div className="space-y-2">
                                    {editingField.options?.map((option, optIndex) => (
                                      <div key={optIndex} className="flex items-center">
                                        <input
                                          type="text"
                                          value={option}
                                          onChange={(e) => updateOption(optIndex, e.target.value)}
                                          className="flex-1 p-1.5 text-sm border rounded-md"
                                        />
                                        <button
                                          onClick={() => removeOption(optIndex)}
                                          className="ml-2 p-1 text-red-600 hover:text-red-800"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    ))}
                                    <button
                                      onClick={addOption}
                                      className="text-blue-600 hover:text-blue-800 text-xs flex items-center"
                                    >
                                      <Plus size={14} className="mr-1" />
                                      Add Option
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={editingField.required}
                                  onChange={(e) => handleEditingChange('required', e.target.checked)}
                                  className="mr-2"
                                />
                                <label className="text-xs font-medium text-gray-700">
                                  Required Field
                                </label>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center">
                                  <span className="text-sm font-medium">{field.label}</span>
                                  {field.required && (
                                    <span className="ml-1 text-red-500">*</span>
                                  )}
                                </div>
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => moveField(field.id, 'up')}
                                    disabled={index === 0}
                                    className={`p-1 ${
                                      index === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:text-gray-800'
                                    }`}
                                  >
                                    <MoveUp size={16} />
                                  </button>
                                  <button
                                    onClick={() => moveField(field.id, 'down')}
                                    disabled={index === currentForm.fields.length - 1}
                                    className={`p-1 ${
                                      index === currentForm.fields.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:text-gray-800'
                                    }`}
                                  >
                                    <MoveDown size={16} />
                                  </button>
                                  <button
                                    onClick={() => startEditing(field)}
                                    className="p-1 text-blue-600 hover:text-blue-800"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    onClick={() => removeField(field.id)}
                                    className="p-1 text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 mb-2">
                                Type: {field.type.charAt(0).toUpperCase() + field.type.slice(1)}
                              </div>
                              <div>
                                {renderFieldPreview(field)}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Add Field
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => addField('text')}
                        className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-md text-sm"
                      >
                        Text Field
                      </button>
                      <button
                        onClick={() => addField('email')}
                        className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-md text-sm"
                      >
                        Email
                      </button>
                      <button
                        onClick={() => addField('phone')}
                        className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-md text-sm"
                      >
                        Phone
                      </button>
                      <button
                        onClick={() => addField('select')}
                        className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-md text-sm"
                      >
                        Dropdown
                      </button>
                      <button
                        onClick={() => addField('checkbox')}
                        className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-md text-sm"
                      >
                        Checkboxes
                      </button>
                      <button
                        onClick={() => addField('radio')}
                        className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-md text-sm"
                      >
                        Radio Buttons
                      </button>
                      <button
                        onClick={() => addField('textarea')}
                        className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-md text-sm"
                      >
                        Text Area
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="md:col-span-1">
                <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                  <div className="flex items-center mb-4">
                    <Brain size={20} className="text-blue-500 mr-2" />
                    <h3 className="text-md font-medium">AI Form Builder</h3>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">
                    Let AI suggest fields based on your form's purpose. Describe what this form is for:
                  </p>
                  
                  <div className="space-y-3">
                    <textarea
                      value={formPurpose}
                      onChange={(e) => setFormPurpose(e.target.value)}
                      placeholder="e.g., Contact form for website, Customer satisfaction survey, Event registration form, etc."
                      className="w-full p-2 border rounded-md text-sm"
                      rows={3}
                    />
                    
                    <button
                      onClick={generateAIFormFields}
                      disabled={isGenerating || !formPurpose.trim()}
                      className={`w-full flex justify-center items-center px-3 py-2 rounded-md text-sm text-white ${
                        isGenerating || !formPurpose.trim() 
                          ? 'bg-blue-300 cursor-not-allowed' 
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Brain size={16} className="mr-1" />
                          Generate Suggested Fields
                        </>
                      )}
                    </button>
                  </div>
                  
                  {aiSuggestion && aiSuggestion.length > 0 && (
                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-medium mb-2">AI Suggestions</h4>
                      <div className="space-y-2">
                        {aiSuggestion.map((field) => (
                          <div key={field.id} className="bg-white p-2 border rounded-md text-sm">
                            <div className="font-medium">{field.label}</div>
                            <div className="text-xs text-gray-500 flex justify-between">
                              <span>Type: {field.type}</span>
                              {field.required && <span className="text-red-500">Required</span>}
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={useAiSuggestion}
                          className="w-full flex justify-center items-center px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-md text-sm text-white"
                        >
                          <Check size={16} className="mr-1" />
                          Use These Fields
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="bg-gray-50 rounded-md p-4 border border-gray-200 mt-4">
                  <h3 className="text-md font-medium mb-3">Form Settings</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Add submissions to CRM as leads</span>
                      <div className="relative inline-block w-10 mr-2 align-middle select-none">
                        <input 
                          type="checkbox" 
                          id="add-to-crm" 
                          className="sr-only"
                          checked={true}
                          readOnly
                        />
                        <label
                          htmlFor="add-to-crm"
                          className="block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
                        >
                          <span className="block h-6 w-6 rounded-full bg-blue-600 transform translate-x-4"></span>
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Email notification on submission</span>
                      <div className="relative inline-block w-10 mr-2 align-middle select-none">
                        <input 
                          type="checkbox" 
                          id="notification" 
                          className="sr-only"
                          checked={true}
                          readOnly
                        />
                        <label
                          htmlFor="notification"
                          className="block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
                        >
                          <span className="block h-6 w-6 rounded-full bg-blue-600 transform translate-x-4"></span>
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Enable spam protection</span>
                      <div className="relative inline-block w-10 mr-2 align-middle select-none">
                        <input 
                          type="checkbox" 
                          id="recaptcha" 
                          className="sr-only"
                          checked={true}
                          readOnly
                        />
                        <label
                          htmlFor="recaptcha"
                          className="block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
                        >
                          <span className="block h-6 w-6 rounded-full bg-blue-600 transform translate-x-4"></span>
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Send autoresponder email</span>
                      <div className="relative inline-block w-10 mr-2 align-middle select-none">
                        <input 
                          type="checkbox" 
                          id="autoresponder" 
                          className="sr-only"
                          checked={false}
                          readOnly
                        />
                        <label
                          htmlFor="autoresponder"
                          className="block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
                        >
                          <span className="block h-6 w-6 rounded-full bg-white transform"></span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                
                {currentForm.id && (
                  <div className="bg-gray-50 rounded-md p-4 border border-gray-200 mt-4">
                    <h3 className="text-md font-medium mb-3 flex items-center">
                      <LinkIcon size={16} className="mr-2" />
                      Share Form
                    </h3>
                    <div className="mt-2">
                      <div className="flex items-center">
                        <input
                          type="text"
                          value={getPublicFormUrl(currentForm.id)}
                          readOnly
                          className="flex-1 p-2 text-sm bg-white border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={() => copyShareUrl(currentForm.id)}
                          className="p-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-200"
                        >
                          {copySuccess ? (
                            <Check size={16} className="text-green-600" />
                          ) : (
                            <Clipboard size={16} className="text-gray-600" />
                          )}
                        </button>
                      </div>
                      <div className="flex justify-center mt-2">
                        <button
                          onClick={() => {
                            const url = getPublicFormUrl(currentForm.id);
                            window.open(url, '_blank');
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Open in new tab
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Preview Tab */}
          {activeTab === 'preview' && (
            renderFormPreview()
          )}
          
          {/* Submissions Tab */}
          {activeTab === 'submissions' && currentForm.id && (
            <FormSubmissionsView formId={currentForm.id} />
          )}
          
          {/* Settings Tab */}
          {activeTab === 'settings' && currentForm.id && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <h3 className="text-lg font-medium mb-4">Form Settings</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Form Status
                    </label>
                    <div className="flex items-center">
                      <button
                        onClick={() => handleToggleFormActive(currentForm.id, true)}
                        className={`px-4 py-2 rounded-l-md text-sm font-medium ${
                          forms[currentForm.id].isActive ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Active
                      </button>
                      <button
                        onClick={() => handleToggleFormActive(currentForm.id, false)}
                        className={`px-4 py-2 rounded-r-md text-sm font-medium ${
                          !forms[currentForm.id].isActive ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Inactive
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      When inactive, your form cannot be viewed or submitted by anyone.
                    </p>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Notification Settings</h4>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-700">Email notifications</span>
                          <span className="text-xs text-gray-500">Get notified by email when someone submits your form</span>
                        </div>
                        <div className="relative inline-block w-10 mr-2 align-middle select-none">
                          <input 
                            type="checkbox" 
                            id="email-notification" 
                            className="sr-only"
                            checked={true}
                            readOnly
                          />
                          <label
                            htmlFor="email-notification"
                            className="block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
                          >
                            <span className="block h-6 w-6 rounded-full bg-blue-600 transform translate-x-4"></span>
                          </label>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-700">CRM integration</span>
                          <span className="text-xs text-gray-500">Add form submitters as leads in your CRM</span>
                        </div>
                        <div className="relative inline-block w-10 mr-2 align-middle select-none">
                          <input 
                            type="checkbox" 
                            id="crm-integration" 
                            className="sr-only"
                            checked={true}
                            readOnly
                          />
                          <label
                            htmlFor="crm-integration"
                            className="block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
                          >
                            <span className="block h-6 w-6 rounded-full bg-blue-600 transform translate-x-4"></span>
                          </label>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-700">Spam protection</span>
                          <span className="text-xs text-gray-500">Use reCAPTCHA to prevent spam submissions</span>
                        </div>
                        <div className="relative inline-block w-10 mr-2 align-middle select-none">
                          <input 
                            type="checkbox" 
                            id="spam-protection" 
                            className="sr-only"
                            checked={true}
                            readOnly
                          />
                          <label
                            htmlFor="spam-protection"
                            className="block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
                          >
                            <span className="block h-6 w-6 rounded-full bg-blue-600 transform translate-x-4"></span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Confirmation Settings</h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confirmation Message
                        </label>
                        <textarea
                          className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={3}
                          defaultValue="Thank you for your submission! We will get back to you shortly."
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Embed Code</h4>
                    
                    <div className="bg-gray-50 p-4 rounded-md">
                      <pre className="text-xs text-gray-700 overflow-x-auto">
                        {`<iframe src="${getPublicFormUrl(currentForm.id)}" width="100%" height="500px" frameborder="0"></iframe>`}
                      </pre>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`<iframe src="${getPublicFormUrl(currentForm.id)}" width="100%" height="500px" frameborder="0"></iframe>`);
                          alert('Embed code copied to clipboard!');
                        }}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                      >
                        Copy Code
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Analytics Overview</h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Total Forms</p>
                  <p className="text-2xl font-semibold">{Object.values(forms).length}</p>
                </div>
                <div className="p-3 rounded-md bg-blue-100 text-blue-600">
                  <FileText size={20} />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Total Submissions</p>
                  <p className="text-2xl font-semibold">
                    {Object.values(forms).reduce((acc, form) => acc + form.submissions, 0)}
                  </p>
                </div>
                <div className="p-3 rounded-md bg-green-100 text-green-600">
                  <Users size={20} />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Avg. Conversion Rate</p>
                  <p className="text-2xl font-semibold">
                    {Object.values(forms).length > 0 ? 
                      (Object.values(forms).reduce((acc, form) => acc + (form.conversionRate || 0), 0) / Object.values(forms).length).toFixed(1) 
                      : '0.0'}%
                  </p>
                </div>
                <div className="p-3 rounded-md bg-purple-100 text-purple-600">
                  <BarChart2 size={20} />
                </div>
              </div>
            </div>
          </div>
          
          <h3 className="text-lg font-medium mb-4">Form Performance</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Form
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Views
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submissions
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conversion Rate
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.values(forms).map(form => (
                  <tr key={form.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText size={20} className="text-blue-500 mr-2" />
                        <div>
                          <p className="font-medium text-sm text-gray-900">{form.name}</p>
                          <p className="text-xs text-gray-500 truncate max-w-xs">{form.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {form.totalViews || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {form.submissions}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{form.conversionRate?.toFixed(1) || '0.0'}%</div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${form.conversionRate || 0}%` }}></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        form.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {form.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormsAndSurveys;
import React, { useState, useEffect, useRef } from 'react';
import { useOpenAI } from '../services/openaiService';
import { 
  MessageSquare, 
  Send, 
  Clock, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Trash2, 
  Brain, 
  Settings, 
  Calendar, 
  Plus, 
  User, 
  X, 
  Copy, 
  Search,
  Filter,
  SlidersHorizontal,
  Upload,
  ExternalLink,
  Image,
  Phone
} from 'lucide-react';
import Select from 'react-select';

interface Message {
  id: string;
  sender: 'user' | 'contact';
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  unread: number;
  lastMessage?: string;
  lastActivity?: Date;
  messages: Message[];
}

// SMS configuration
interface SmsProvider {
  name: string;
  configured: boolean;
  configFields: {
    [key: string]: string;
  };
  status: 'active' | 'inactive' | 'error';
}

interface TemplateCategory {
  id: string;
  name: string;
}

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  variables: string[];
}

interface ScheduledMessage {
  id: string;
  contactId: string;
  content: string;
  scheduledFor: Date;
  status: 'pending' | 'sent' | 'failed';
}

const TextMessages: React.FC = () => {
  const openai = useOpenAI();
  
  // SMS Provider configuration
  const [smsProvider, setSmsProvider] = useState<SmsProvider>({
    name: 'twilio',
    configured: true,
    configFields: {
      accountSid: 'AC1234567890abcdef1234567890abcdef',
      authToken: '1234567890abcdef1234567890abcdef',
      fromNumber: '+15551234567'
    },
    status: 'active'
  });
  
  // Show provider configuration modal
  const [showProviderConfig, setShowProviderConfig] = useState(false);
  
  // Mock contacts with message history
  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: '1',
      name: 'John Doe',
      phone: '(555) 123-4567',
      unread: 2,
      lastMessage: 'That sounds great! I\'ll check my calendar.',
      lastActivity: new Date('2025-06-15T14:32:00'),
      messages: [
        {
          id: 'm1',
          sender: 'user',
          content: 'Hi John, are you available for a quick call this week to discuss your needs?',
          timestamp: new Date('2025-06-15T14:30:00'),
          status: 'read'
        },
        {
          id: 'm2',
          sender: 'contact',
          content: 'That sounds great! I\'ll check my calendar.',
          timestamp: new Date('2025-06-15T14:32:00'),
          status: 'read'
        }
      ]
    },
    {
      id: '2',
      name: 'Jane Smith',
      phone: '(555) 987-6543',
      unread: 0,
      lastMessage: 'Thanks for sending the proposal. I\'ll review it today.',
      lastActivity: new Date('2025-06-14T11:15:00'),
      messages: [
        {
          id: 'm1',
          sender: 'user',
          content: 'Hello Jane, I just sent over the proposal we discussed. Let me know if you have any questions!',
          timestamp: new Date('2025-06-14T11:10:00'),
          status: 'read'
        },
        {
          id: 'm2',
          sender: 'contact',
          content: 'Thanks for sending the proposal. I\'ll review it today.',
          timestamp: new Date('2025-06-14T11:15:00'),
          status: 'read'
        }
      ]
    },
    {
      id: '3',
      name: 'Robert Johnson',
      phone: '(555) 456-7890',
      unread: 0,
      lastMessage: 'Yes, that works for me. See you then!',
      lastActivity: new Date('2025-06-13T16:45:00'),
      messages: [
        {
          id: 'm1',
          sender: 'user',
          content: 'Hi Robert, are you available for a demo next Tuesday at 2pm?',
          timestamp: new Date('2025-06-13T16:40:00'),
          status: 'read'
        },
        {
          id: 'm2',
          sender: 'contact',
          content: 'Yes, that works for me. See you then!',
          timestamp: new Date('2025-06-13T16:45:00'),
          status: 'read'
        }
      ]
    }
  ]);
  
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [showContactForm, setShowContactForm] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);

  // Template management
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([
    {
      id: 'template-1',
      name: 'Follow-up',
      content: 'Hi {name}, I wanted to follow up on our recent conversation. Do you have any questions I can answer for you?',
      category: 'follow-up',
      variables: ['name']
    },
    {
      id: 'template-2',
      name: 'Appointment Confirmation',
      content: 'Hi {name}, this is just a quick confirmation of our appointment on {date} at {time}. Looking forward to meeting with you!',
      category: 'appointment',
      variables: ['name', 'date', 'time']
    },
    {
      id: 'template-3',
      name: 'New Resource',
      content: 'Hi {name}, I thought you might find this resource helpful based on our conversation: {link}. Let me know what you think!',
      category: 'resource',
      variables: ['name', 'link']
    },
    {
      id: 'template-4',
      name: 'Birthday Greeting',
      content: 'Happy Birthday, {name}! 🎉 Wishing you a wonderful day filled with joy and success. Best regards from {company}.',
      category: 'greeting',
      variables: ['name', 'company']
    },
    {
      id: 'template-5',
      name: 'Payment Reminder',
      content: 'Hi {name}, this is a friendly reminder that your payment of ${amount} is due on {date}. Please let me know if you have any questions.',
      category: 'payment',
      variables: ['name', 'amount', 'date']
    }
  ]);
  
  // Template categories
  const [templateCategories, setTemplateCategories] = useState<TemplateCategory[]>([
    { id: 'follow-up', name: 'Follow Up' },
    { id: 'appointment', name: 'Appointments' },
    { id: 'resource', name: 'Resources' },
    { id: 'greeting', name: 'Greetings' },
    { id: 'payment', name: 'Payments' }
  ]);
  
  // Selected template category filter
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Message scheduling
  const [scheduledMessage, setScheduledMessage] = useState<{
    content: string;
    scheduledDate: string;
    scheduledTime: string;
  }>({
    content: '',
    scheduledDate: '',
    scheduledTime: ''
  });

  // Scheduled messages list
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([
    {
      id: 'sched-1',
      contactId: '1',
      content: 'Hi John, just checking in ahead of our meeting tomorrow.',
      scheduledFor: new Date(Date.now() + 86400000), // tomorrow
      status: 'pending'
    },
    {
      id: 'sched-2',
      contactId: '2',
      content: 'Hi Jane, following up on the proposal I sent last week. Any questions?',
      scheduledFor: new Date(Date.now() + 172800000), // 2 days from now
      status: 'pending'
    }
  ]);

  // Stats tracking
  const [messageStats, setMessageStats] = useState({
    sent: 145,
    received: 98,
    responseRate: 84,
    averageResponseTime: '2.3 hours'
  });
  
  // New contact form
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: ''
  });
  
  const messageEndRef = useRef<HTMLDivElement>(null);
  
  const selectedContact = contacts.find(contact => contact.id === selectedContactId);
  
  // Auto-scroll to latest message
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedContact?.messages]);
  
  const selectContact = (contactId: string) => {
    setSelectedContactId(contactId);
    
    // Mark unread messages as read
    setContacts(contacts.map(contact => 
      contact.id === contactId 
        ? { ...contact, unread: 0 } 
        : contact
    ));
    
    // Close any open panels
    setShowTemplates(false);
    setShowScheduler(false);
    setGeneratedText(null);
  };
  
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchText.toLowerCase()) ||
    contact.phone.includes(searchText)
  );
  
  const sendMessage = () => {
    if (!selectedContactId || !newMessage.trim()) return;
    
    setIsSending(true);
    
    // Create new message
    const newMessageObj: Message = {
      id: `m${Date.now()}`,
      sender: 'user',
      content: newMessage,
      timestamp: new Date(),
      status: 'sending'
    };
    
    // Update contacts state with the new message
    setContacts(contacts.map(contact => 
      contact.id === selectedContactId 
        ? {
            ...contact,
            messages: [...contact.messages, newMessageObj],
            lastMessage: newMessage,
            lastActivity: new Date()
          }
        : contact
    ));
    
    // Clear input
    setNewMessage('');
    
    // Simulate message delivery
    setTimeout(() => {
      setContacts(contacts.map(contact => 
        contact.id === selectedContactId 
          ? {
              ...contact,
              messages: contact.messages.map(message => 
                message.id === newMessageObj.id
                  ? { ...message, status: 'sent' }
                  : message
              )
            }
          : contact
      ));
      
      // Simulate delivery receipt after a bit more time
      setTimeout(() => {
        setContacts(prevContacts => 
          prevContacts.map(contact => 
            contact.id === selectedContactId 
              ? {
                  ...contact,
                  messages: contact.messages.map(message => 
                    message.id === newMessageObj.id
                      ? { ...message, status: 'delivered' }
                      : message
                  )
                }
              : contact
          )
        );
        
        // Simulate read receipt after yet more time
        setTimeout(() => {
          setContacts(prevContacts => 
            prevContacts.map(contact => 
              contact.id === selectedContactId 
                ? {
                    ...contact,
                    messages: contact.messages.map(message => 
                      message.id === newMessageObj.id
                        ? { ...message, status: 'read' }
                        : message
                    )
                  }
                : contact
            )
          );
        }, 2000);
      }, 1500);
      
      setIsSending(false);
    }, 1500);
  };
  
  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };
  
  const useTemplate = (templateContent: string) => {
    if (selectedContact) {
      const personalizedContent = templateContent.replace('{name}', selectedContact.name);
      setNewMessage(personalizedContent);
      setShowTemplates(false);
    }
  };
  
  const generateTextSuggestion = async () => {
    if (!selectedContact) return;
    
    setIsGenerating(true);
    setGeneratedText(null);
    
    try {
      // Use the OpenAI service to generate a text message suggestion
      const result = await openai.generateEmailDraft(
        selectedContact.name,
        "Short text message follow-up (keep it under 160 characters)"
      );
      
      // Extract just a simple message part from the generated content
      let message = result;
      
      // If it has multiple paragraphs, just take the first one
      if (result.includes('\n\n')) {
        message = result.split('\n\n')[0];
      }
      
      // Remove any "Subject:" line if present
      if (message.toLowerCase().startsWith('subject:')) {
        message = message.split('\n').slice(1).join('\n').trim();
      }
      
      // Remove signature if present
      if (message.includes('\n\nBest')) {
        message = message.split('\n\nBest')[0];
      }
      
      setGeneratedText(message);
    } catch (error) {
      console.error("Failed to generate text suggestion:", error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const useGeneratedText = () => {
    if (generatedText) {
      setNewMessage(generatedText);
      setGeneratedText(null);
    }
  };
  
  const scheduleMessage = () => {
    if (!selectedContactId || !scheduledMessage.content.trim() || !scheduledMessage.scheduledDate || !scheduledMessage.scheduledTime) {
      alert('Please fill in all fields to schedule a message');
      return;
    }
    
    const scheduledDateTime = new Date(`${scheduledMessage.scheduledDate}T${scheduledMessage.scheduledTime}`);
    
    // Add to scheduled messages
    const newScheduledMessage: ScheduledMessage = {
      id: `sched-${Date.now()}`,
      contactId: selectedContactId,
      content: scheduledMessage.content,
      scheduledFor: scheduledDateTime,
      status: 'pending'
    };
    
    setScheduledMessages([...scheduledMessages, newScheduledMessage]);
    
    // Reset form and close panel
    setScheduledMessage({
      content: '',
      scheduledDate: '',
      scheduledTime: ''
    });
    setShowScheduler(false);
    
    // Show confirmation
    alert(`Message scheduled for ${scheduledDateTime.toLocaleString()}`);
  };
  
  const createNewContact = () => {
    if (!newContact.name || !newContact.phone) {
      alert('Name and phone number are required');
      return;
    }
    
    const newContactObj: Contact = {
      id: `contact-${Date.now()}`,
      name: newContact.name,
      phone: newContact.phone,
      unread: 0,
      messages: [],
      lastActivity: new Date()
    };
    
    setContacts([...contacts, newContactObj]);
    setNewContact({ name: '', phone: '', email: '' });
    setShowContactForm(false);
  };
  
  const initiateCall = (phoneNumber: string) => {
    // Clean the phone number to only include digits
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Use the tel: protocol to initiate a call
    window.location.href = `tel:${cleanNumber}`;
  };
  
  const handleConfigureSmsProvider = () => {
    if (
      !smsProvider.configFields.accountSid ||
      !smsProvider.configFields.authToken ||
      !smsProvider.configFields.fromNumber
    ) {
      alert('Please fill in all provider configuration fields');
      return;
    }
    
    setSmsProvider({
      ...smsProvider,
      configured: true,
      status: 'active'
    });
    
    setShowProviderConfig(false);
    alert('SMS provider configuration saved successfully!');
  };
  
  const renderFilteredTemplates = () => {
    return messageTemplates
      .filter(template => 
        selectedCategory ? template.category === selectedCategory : true
      );
  };
  
  // Filtered templates based on selected category
  const filteredTemplates = renderFilteredTemplates();
  
  const getMessageStatusIcon = (status: string) => {
    switch(status) {
      case 'sending':
        return <Clock size={12} className="text-gray-400" />;
      case 'sent':
        return <Check size={12} className="text-gray-400" />;
      case 'delivered':
        return <Check size={12} className="text-blue-500" />;
      case 'read':
        return (
          <div className="flex">
            <Check size={12} className="text-blue-500 -mr-0.5" />
            <Check size={12} className="text-blue-500" />
          </div>
        );
      case 'failed':
        return <AlertCircle size={12} className="text-red-500" />;
      default:
        return null;
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <header className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Text Messages</h1>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowProviderConfig(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Settings size={16} className="mr-1.5" />
              SMS Provider
            </button>
          </div>
        </div>
        <p className="text-gray-600 mt-1">Send and receive SMS messages with contacts and leads</p>
      </header>
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 h-[700px]">
          
          {/* Contacts List */}
          <div className="border-r border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold">Conversations</h2>
                <button 
                  onClick={() => setShowContactForm(true)}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  <Plus size={18} />
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className="w-full pl-10 pr-4 py-2 border rounded-md"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
            
            <div className="overflow-y-auto h-[calc(700px-65px)]">
              {filteredContacts.length > 0 ? (
                filteredContacts.map(contact => (
                  <div 
                    key={contact.id}
                    onClick={() => selectContact(contact.id)}
                    className={`p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
                      selectedContactId === contact.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h3 className="text-sm font-medium text-gray-900">{contact.name}</h3>
                          {contact.unread > 0 && (
                            <span className="ml-2 bg-blue-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                              {contact.unread}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{contact.phone}</p>
                      </div>
                      {contact.lastActivity && (
                        <span className="text-xs text-gray-500">
                          {formatDate(contact.lastActivity)}
                        </span>
                      )}
                    </div>
                    {contact.lastMessage && (
                      <p className="mt-1 text-sm text-gray-600 truncate">{contact.lastMessage}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-6 text-center">
                  <MessageSquare size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">No conversations found</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Conversation View */}
          <div className="col-span-2 flex flex-col">
            {selectedContact ? (
              <>
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">{selectedContact.name}</h2>
                    <p className="text-sm text-gray-500">{selectedContact.phone}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      className="p-2 text-gray-400 hover:text-gray-600" 
                      title="Call"
                      onClick={() => initiateCall(selectedContact.phone)}
                    >
                      <Phone size={18} />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                  <div className="space-y-4">
                    {selectedContact.messages.map(message => (
                      <div 
                        key={message.id} 
                        className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-xs md:max-w-md rounded-lg p-3 ${
                            message.sender === 'user' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-white text-gray-800 border border-gray-200'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <div className={`text-xs mt-1 flex items-center ${
                            message.sender === 'user' ? 'text-blue-200 justify-end' : 'text-gray-500'
                          }`}>
                            {formatDate(message.timestamp)}
                            {message.sender === 'user' && (
                              <span className="ml-1">
                                {getMessageStatusIcon(message.status)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messageEndRef} /> {/* Auto-scroll anchor */}
                  </div>
                </div>
                
                <div className="p-4 border-t border-gray-200">
                  {/* Show templates panel */}
                  {showTemplates && (
                    <div className="mb-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="p-3 border-b border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-medium">Message Templates</h3>
                          <button 
                            onClick={() => setShowTemplates(false)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X size={18} />
                          </button>
                        </div>
                        
                        <div className="flex mb-2 overflow-x-auto py-1 scrollbar-hide">
                          <button 
                            onClick={() => setSelectedCategory(null)}
                            className={`px-2.5 py-1 text-xs rounded-full mr-2 whitespace-nowrap ${
                              selectedCategory === null ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            All
                          </button>
                          {templateCategories.map(category => (
                            <button 
                              key={category.id}
                              onClick={() => setSelectedCategory(category.id)}
                              className={`px-2.5 py-1 text-xs rounded-full mr-2 whitespace-nowrap ${
                                selectedCategory === category.id ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'
                              }`}
                            >
                              {category.name}
                            </button>
                          ))}
                        </div>
                        
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {filteredTemplates.map(template => (
                            <div 
                              key={template.id}
                              onClick={() => useTemplate(template.content)}
                              className="p-2 bg-white hover:bg-blue-50 border border-gray-200 rounded cursor-pointer"
                            >
                              <div className="flex justify-between">
                                <p className="text-sm font-medium">{template.name}</p>
                                <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded capitalize">
                                  {template.category}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 truncate mt-1">{template.content}</p>
                            </div>
                          ))}
                        </div>
                        
                        {filteredTemplates.length === 0 && (
                          <div className="p-3 text-center text-gray-500 text-sm">
                            No templates found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Message Scheduler Panel */}
                  {showScheduler && (
                    <div className="mb-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="p-3 border-b border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-medium">Schedule Message</h3>
                          <button 
                            onClick={() => setShowScheduler(false)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X size={18} />
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <label htmlFor="scheduled-message" className="block text-xs font-medium text-gray-700 mb-1">
                              Message
                            </label>
                            <textarea
                              id="scheduled-message"
                              value={scheduledMessage.content}
                              onChange={(e) => setScheduledMessage({...scheduledMessage, content: e.target.value})}
                              className="w-full px-3 py-2 border rounded-md text-sm"
                              rows={3}
                              placeholder="Enter message to schedule"
                            ></textarea>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label htmlFor="scheduled-date" className="block text-xs font-medium text-gray-700 mb-1">
                                Date
                              </label>
                              <input
                                type="date"
                                id="scheduled-date"
                                value={scheduledMessage.scheduledDate}
                                onChange={(e) => setScheduledMessage({...scheduledMessage, scheduledDate: e.target.value})}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                                min={new Date().toISOString().split('T')[0]}
                              />
                            </div>
                            <div>
                              <label htmlFor="scheduled-time" className="block text-xs font-medium text-gray-700 mb-1">
                                Time
                              </label>
                              <input
                                type="time"
                                id="scheduled-time"
                                value={scheduledMessage.scheduledTime}
                                onChange={(e) => setScheduledMessage({...scheduledMessage, scheduledTime: e.target.value})}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                              />
                            </div>
                          </div>
                          
                          <div className="flex justify-end">
                            <button 
                              onClick={scheduleMessage}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded"
                            >
                              Schedule
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Scheduled messages list */}
                      {scheduledMessages.filter(msg => msg.contactId === selectedContactId).length > 0 && (
                        <div className="p-3">
                          <h4 className="text-xs font-medium text-gray-700 mb-2">Upcoming Messages for {selectedContact.name}</h4>
                          <div className="space-y-2">
                            {scheduledMessages
                              .filter(msg => msg.contactId === selectedContactId && msg.status === 'pending')
                              .map(msg => (
                                <div key={msg.id} className="border border-gray-200 rounded-md p-2 bg-white text-sm flex justify-between">
                                  <div>
                                    <p className="text-gray-800 truncate">{msg.content}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {msg.scheduledFor.toLocaleDateString()} at {msg.scheduledFor.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      setScheduledMessages(scheduledMessages.filter(m => m.id !== msg.id));
                                    }}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* AI Message Generator Panel */}
                  {isGenerating && (
                    <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="flex items-center text-gray-600">
                        <RefreshCw size={16} className="animate-spin mr-2" />
                        <span className="text-sm">Generating message suggestion...</span>
                      </div>
                    </div>
                  )}
                  
                  {generatedText && !isGenerating && (
                    <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-medium flex items-center">
                          <Brain size={16} className="text-blue-600 mr-1" />
                          AI Suggestion
                        </h3>
                        <div className="flex space-x-2">
                          <button 
                            onClick={useGeneratedText}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Use
                          </button>
                          <button 
                            onClick={() => setGeneratedText(null)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-800">{generatedText}</p>
                    </div>
                  )}
                  
                  {/* Message Input */}
                  <div className="flex items-center">
                    <div className="flex-1 flex space-x-2">
                      <button 
                        onClick={() => {
                          setShowTemplates(!showTemplates);
                          setShowScheduler(false);
                        }}
                        className={`inline-flex items-center px-3 py-2 border rounded-md text-sm ${
                          showTemplates 
                            ? 'bg-blue-50 border-blue-300 text-blue-700' 
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Templates
                      </button>
                      <button 
                        onClick={generateTextSuggestion}
                        disabled={isGenerating}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Brain size={16} className="mr-1" />
                        AI Suggest
                      </button>
                      <button 
                        onClick={() => {
                          setShowScheduler(!showScheduler);
                          setShowTemplates(false);
                        }}
                        className={`inline-flex items-center px-3 py-2 border rounded-md text-sm ${
                          showScheduler 
                            ? 'bg-blue-50 border-blue-300 text-blue-700' 
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Calendar size={16} className="mr-1" />
                        Schedule
                      </button>
                    </div>
                    <div className="flex-grow-6 flex border rounded-md overflow-hidden">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 p-2 focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || isSending}
                        className={`px-4 flex items-center justify-center ${
                          !newMessage.trim() || isSending
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isSending ? (
                          <RefreshCw size={18} className="animate-spin" />
                        ) : (
                          <Send size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500 flex justify-between">
                    <span>160 characters per message</span>
                    <span>{newMessage.length} chars</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-4">
                <MessageSquare size={48} className="text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg mb-2">Select a conversation</p>
                <p className="text-gray-400 text-sm text-center max-w-md mb-4">
                  Choose a contact from the list to view your conversation history and send messages.
                </p>
                <button 
                  onClick={() => setShowContactForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus size={16} className="mr-2" />
                  New Conversation
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Message Analytics */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Text Message Analytics</h2>
            <div className="text-sm text-gray-500">Last 30 days</div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Messages Sent</span>
                  <span className="font-semibold">{messageStats.sent}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                  <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Messages Received</span>
                  <span className="font-semibold">{messageStats.received}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                  <div className="bg-green-600 h-1.5 rounded-full" style={{ width: '60%' }}></div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Response Rate</span>
                  <span className="font-semibold">{messageStats.responseRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                  <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${messageStats.responseRate}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Avg Response Time</span>
                  <span className="font-semibold">{messageStats.averageResponseTime}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                  <div className="bg-yellow-600 h-1.5 rounded-full" style={{ width: '40%' }}></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium mb-3">Upcoming Scheduled Messages</h3>
            {scheduledMessages.filter(msg => msg.status === 'pending').length > 0 ? (
              <div className="space-y-2">
                {scheduledMessages
                  .filter(msg => msg.status === 'pending')
                  .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime())
                  .slice(0, 2)
                  .map(msg => {
                    const contact = contacts.find(c => c.id === msg.contactId);
                    return (
                      <div key={msg.id} className="flex justify-between p-2 bg-gray-50 rounded border border-gray-200">
                        <div>
                          <p className="text-sm font-medium">{contact?.name || 'Unknown Contact'}</p>
                          <p className="text-xs text-gray-500 truncate">{msg.content}</p>
                        </div>
                        <div className="text-xs text-gray-500 whitespace-nowrap">
                          {msg.scheduledFor.toLocaleDateString()} {msg.scheduledFor.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                    );
                  })}
                <div className="text-center">
                  <button className="text-sm text-blue-600 hover:text-blue-800">
                    View All ({scheduledMessages.filter(msg => msg.status === 'pending').length})
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 bg-gray-50 rounded">
                <Calendar size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No scheduled messages</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Best Practices & Bulk Messaging */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Tips for Effective SMS</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <Check size={16} className="text-green-500 mr-2 mt-0.5" />
                Keep messages brief and to the point (160 characters is ideal)
              </li>
              <li className="flex items-start">
                <Check size={16} className="text-green-500 mr-2 mt-0.5" />
                Always identify yourself in the first message
              </li>
              <li className="flex items-start">
                <Check size={16} className="text-green-500 mr-2 mt-0.5" />
                Include a clear call-to-action
              </li>
              <li className="flex items-start">
                <Check size={16} className="text-green-500 mr-2 mt-0.5" />
                Respond promptly to incoming messages
              </li>
              <li className="flex items-start">
                <Check size={16} className="text-green-500 mr-2 mt-0.5" />
                Respect business hours when sending messages
              </li>
            </ul>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Bulk Messaging</h2>
              <div className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">
                Coming Soon
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Send mass text messages to targeted contact lists with personalized variables.
            </p>
            <div className="flex items-center">
              <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 w-full">
                <Upload size={16} className="mr-2" />
                Import Contact List
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* New Contact Modal */}
      {showContactForm && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                      <User size={20} className="mr-2" />
                      New Contact
                    </h3>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                        <input 
                          type="text" 
                          id="name"
                          value={newContact.name}
                          onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number *</label>
                        <input 
                          type="tel" 
                          id="phone"
                          value={newContact.phone}
                          onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email (optional)</label>
                        <input 
                          type="email" 
                          id="email"
                          value={newContact.email}
                          onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  onClick={createNewContact}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Create Contact
                </button>
                <button 
                  type="button"
                  onClick={() => setShowContactForm(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* SMS Provider Configuration Modal */}
      {showProviderConfig && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                      <Settings size={20} className="mr-2" />
                      SMS Provider Configuration
                    </h3>
                    
                    <div className="mt-2 mb-4">
                      <p className="text-sm text-gray-500">
                        Configure your SMS provider to enable sending and receiving text messages.
                      </p>
                    </div>
                    
                    <div className="mt-4 space-y-4">
                      {/* Provider selection */}
                      <div>
                        <label htmlFor="provider" className="block text-sm font-medium text-gray-700">SMS Provider</label>
                        <select
                          id="provider"
                          value={smsProvider.name}
                          onChange={(e) => setSmsProvider({...smsProvider, name: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          <option value="twilio">Twilio</option>
                          <option value="messagebird">MessageBird</option>
                          <option value="vonage">Vonage (Nexmo)</option>
                        </select>
                      </div>
                      
                      {/* Twilio specific fields */}
                      {smsProvider.name === 'twilio' && (
                        <>
                          <div>
                            <label htmlFor="accountSid" className="block text-sm font-medium text-gray-700">Account SID</label>
                            <input 
                              type="text" 
                              id="accountSid"
                              value={smsProvider.configFields.accountSid}
                              onChange={(e) => setSmsProvider({
                                ...smsProvider, 
                                configFields: {...smsProvider.configFields, accountSid: e.target.value}
                              })}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            />
                          </div>
                          <div>
                            <label htmlFor="authToken" className="block text-sm font-medium text-gray-700">Auth Token</label>
                            <input 
                              type="password" 
                              id="authToken"
                              value={smsProvider.configFields.authToken}
                              onChange={(e) => setSmsProvider({
                                ...smsProvider, 
                                configFields: {...smsProvider.configFields, authToken: e.target.value}
                              })}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="your_auth_token"
                            />
                          </div>
                          <div>
                            <label htmlFor="fromNumber" className="block text-sm font-medium text-gray-700">From Number</label>
                            <input 
                              type="text" 
                              id="fromNumber"
                              value={smsProvider.configFields.fromNumber}
                              onChange={(e) => setSmsProvider({
                                ...smsProvider, 
                                configFields: {...smsProvider.configFields, fromNumber: e.target.value}
                              })}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="+1234567890"
                            />
                          </div>
                        </>
                      )}
                      
                      {/* MessageBird specific fields */}
                      {smsProvider.name === 'messagebird' && (
                        <>
                          <div>
                            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">API Key</label>
                            <input 
                              type="password" 
                              id="apiKey"
                              value={smsProvider.configFields.apiKey || ''}
                              onChange={(e) => setSmsProvider({
                                ...smsProvider, 
                                configFields: {...smsProvider.configFields, apiKey: e.target.value}
                              })}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="Your MessageBird API Key"
                            />
                          </div>
                          <div>
                            <label htmlFor="fromNumber" className="block text-sm font-medium text-gray-700">From Number/Name</label>
                            <input 
                              type="text" 
                              id="fromNumber"
                              value={smsProvider.configFields.fromNumber}
                              onChange={(e) => setSmsProvider({
                                ...smsProvider, 
                                configFields: {...smsProvider.configFields, fromNumber: e.target.value}
                              })}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="+1234567890 or CompanyName"
                            />
                          </div>
                        </>
                      )}
                      
                      {/* Vonage specific fields */}
                      {smsProvider.name === 'vonage' && (
                        <>
                          <div>
                            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">API Key</label>
                            <input 
                              type="text" 
                              id="apiKey"
                              value={smsProvider.configFields.apiKey || ''}
                              onChange={(e) => setSmsProvider({
                                ...smsProvider, 
                                configFields: {...smsProvider.configFields, apiKey: e.target.value}
                              })}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="Your Vonage API Key"
                            />
                          </div>
                          <div>
                            <label htmlFor="apiSecret" className="block text-sm font-medium text-gray-700">API Secret</label>
                            <input 
                              type="password" 
                              id="apiSecret"
                              value={smsProvider.configFields.apiSecret || ''}
                              onChange={(e) => setSmsProvider({
                                ...smsProvider, 
                                configFields: {...smsProvider.configFields, apiSecret: e.target.value}
                              })}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="Your Vonage API Secret"
                            />
                          </div>
                          <div>
                            <label htmlFor="fromNumber" className="block text-sm font-medium text-gray-700">From Number</label>
                            <input 
                              type="text" 
                              id="fromNumber"
                              value={smsProvider.configFields.fromNumber}
                              onChange={(e) => setSmsProvider({
                                ...smsProvider, 
                                configFields: {...smsProvider.configFields, fromNumber: e.target.value}
                              })}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="+1234567890"
                            />
                          </div>
                        </>
                      )}
                      
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => window.open(`https://${smsProvider.name}.com`, '_blank')}
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          <ExternalLink size={14} className="mr-1" />
                          Sign up for {smsProvider.name.charAt(0).toUpperCase() + smsProvider.name.slice(1)}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  onClick={handleConfigureSmsProvider}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Save Configuration
                </button>
                <button 
                  type="button"
                  onClick={() => setShowProviderConfig(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextMessages;
import React, { useState } from 'react';
import { 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  DollarSign,
  Briefcase,
  TrendingUp,
  BarChart3,
  Zap
} from 'lucide-react';
import DealKanbanBoard from '../components/DealKanbanBoard';
import DealDetailsModal from '../components/DealDetailsModal';
import RevenueForecasting from '../components/RevenueForecasting';
import SalesVelocityChart from '../components/SalesVelocityChart';
import { useDealStore } from '../store/dealStore';
import { Deal as DealType } from '../types/deal';

const Pipeline: React.FC = () => {
  const [activeView, setActiveView] = useState<'kanban' | 'forecast' | 'velocity'>('kanban');
  const [selectedDeal, setSelectedDeal] = useState<DealType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { deals, getSalesMetrics } = useDealStore();
  const metrics = getSalesMetrics();

  const handleDealClick = (deal: DealType) => {
    setSelectedDeal(deal);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDeal(null);
  };

  const handleSaveDeal = (deal: DealType) => {
    // Deal is already updated by the modal via useDealStore
    console.log('Deal saved:', deal);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const renderTabButton = (
    view: 'kanban' | 'forecast' | 'velocity',
    label: string,
    icon: React.ReactNode
  ) => (
    <button
      onClick={() => setActiveView(view)}
      className={`inline-flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
        activeView === view
          ? 'bg-blue-600 text-white'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {icon}
      <span className="ml-2">{label}</span>
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pipeline & Deal Management</h1>
          <p className="text-gray-600 mt-1">
            Track deals, forecast revenue, and analyze sales velocity
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
            <Plus className="h-4 w-4 mr-2" />
            New Deal
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Pipeline</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(metrics.totalPipelineValue)}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">15% from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Deals</p>
              <p className="text-2xl font-bold text-gray-900">{deals.length}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <Briefcase className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">8 new this month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Win Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.winRate.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-full">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">5% improvement</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Deal Size</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(metrics.averageDealSize)}
              </p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-full">
              <BarChart3 className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
            <span className="text-red-600">3% from last month</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-1 p-1 bg-gray-100 rounded-lg w-fit">
          {renderTabButton('kanban', 'Pipeline View', <Briefcase className="h-4 w-4" />)}
          {renderTabButton('forecast', 'Revenue Forecast', <TrendingUp className="h-4 w-4" />)}
          {renderTabButton('velocity', 'Sales Velocity', <Zap className="h-4 w-4" />)}
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl border border-gray-200">
        {activeView === 'kanban' && (
          <div className="p-6">
            <DealKanbanBoard onDealClick={handleDealClick} />
          </div>
        )}
        
        {activeView === 'forecast' && (
          <div className="p-6">
            <RevenueForecasting />
          </div>
        )}
        
        {activeView === 'velocity' && (
          <div className="p-6">
            <SalesVelocityChart />
          </div>
        )}
      </div>

      {/* Deal Details Modal */}
      <DealDetailsModal
        deal={selectedDeal}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveDeal}
      />
    </div>
  );
};

export default Pipeline;

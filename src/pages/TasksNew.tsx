import React, { useState } from 'react';
import { 
  LayoutGrid, 
  Calendar as CalendarIcon, 
  Activity,
  BarChart3
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useTaskStore } from '../store/taskStore';
import { TaskKanbanBoard } from '../components/TaskKanbanBoard';
import { TaskCalendar } from '../components/TaskCalendar';
import { ActivityFeed } from '../components/ActivityFeed';
import { TaskDetailsModal } from '../components/TaskDetailsModal';

export const Tasks: React.FC = () => {
  const { getTaskMetrics, getOverdueTasks, getTasksDueToday, getTasksDueThisWeek } = useTaskStore();
  const [activeTab, setActiveTab] = useState('board');
  const [showTaskModal, setShowTaskModal] = useState(false);

  const metrics = getTaskMetrics();
  const overdueTasks = getOverdueTasks();
  const tasksDueToday = getTasksDueToday();
  const tasksDueThisWeek = getTasksDueThisWeek();

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Task Management</h1>
              <p className="text-gray-600">Organize, track, and manage your tasks efficiently</p>
            </div>
            <Button onClick={() => setShowTaskModal(true)}>
              <LayoutGrid className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{metrics.totalTasks}</div>
                <div className="text-sm text-gray-600">Total Tasks</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{metrics.completedTasks}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{metrics.pendingTasks}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{metrics.overdueTasks}</div>
                <div className="text-sm text-gray-600">Overdue</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{tasksDueToday.length}</div>
                <div className="text-sm text-gray-600">Due Today</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{tasksDueThisWeek.length}</div>
                <div className="text-sm text-gray-600">This Week</div>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          {(overdueTasks.length > 0 || tasksDueToday.length > 0) && (
            <div className="space-y-2 mb-6">
              {overdueTasks.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Badge className="bg-red-100 text-red-800 mr-3">
                      {overdueTasks.length} Overdue
                    </Badge>
                    <span className="text-sm text-red-700">
                      You have {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''} that need attention
                    </span>
                  </div>
                </div>
              )}

              {tasksDueToday.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Badge className="bg-orange-100 text-orange-800 mr-3">
                      {tasksDueToday.length} Due Today
                    </Badge>
                    <span className="text-sm text-orange-700">
                      {tasksDueToday.length} task{tasksDueToday.length > 1 ? 's' : ''} due today
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-transparent border-b border-gray-200 rounded-none w-full justify-start h-auto p-0">
            <TabsTrigger 
              value="board" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-6 py-3"
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Kanban Board
            </TabsTrigger>
            <TabsTrigger 
              value="calendar" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-6 py-3"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Calendar
            </TabsTrigger>
            <TabsTrigger 
              value="activity" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-6 py-3"
            >
              <Activity className="h-4 w-4 mr-2" />
              Activity Feed
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-6 py-3"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} className="h-full">
          <TabsContent value="board" className="h-full m-0">
            <TaskKanbanBoard />
          </TabsContent>

          <TabsContent value="calendar" className="h-full m-0">
            <TaskCalendar />
          </TabsContent>

          <TabsContent value="activity" className="h-full m-0">
            <ActivityFeed />
          </TabsContent>

          <TabsContent value="analytics" className="h-full m-0 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Completion Rate */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Completion Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {metrics.completionRate.toFixed(1)}%
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${metrics.completionRate}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Productivity Score */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Productivity Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {metrics.productivityScore.toFixed(0)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Based on completion rate and daily goals
                    </div>
                  </CardContent>
                </Card>

                {/* Tasks by Priority */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tasks by Priority</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(metrics.tasksByPriority).map(([priority, count]) => (
                        <div key={priority} className="flex items-center justify-between">
                          <span className="capitalize text-sm">{priority}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Tasks by Type */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tasks by Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(metrics.tasksByType).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span className="capitalize text-sm">{type.replace('-', ' ')}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Tasks by Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tasks by Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(metrics.tasksByStatus).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <span className="capitalize text-sm">{status.replace('-', ' ')}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Weekly Progress */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">This Week</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Completed</span>
                        <span className="font-semibold">{metrics.tasksCompletedThisWeek}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Due this week</span>
                        <span className="font-semibold">{tasksDueThisWeek.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Completion rate</span>
                        <span className="font-semibold">
                          {tasksDueThisWeek.length > 0 
                            ? `${((metrics.tasksCompletedThisWeek / tasksDueThisWeek.length) * 100).toFixed(0)}%`
                            : 'N/A'
                          }
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Task Creation Modal */}
      {showTaskModal && (
        <TaskDetailsModal
          isOpen={showTaskModal}
          onClose={() => setShowTaskModal(false)}
        />
      )}
    </div>
  );
};

export default Tasks;

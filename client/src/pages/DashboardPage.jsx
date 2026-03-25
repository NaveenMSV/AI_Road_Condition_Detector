/**
 * Dashboard Page
 * Analytics charts, recent reports, top contributors, and admin panel
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  HiOutlineChartBar, HiOutlineUsers, HiOutlineTrendingUp,
  HiOutlineExclamation, HiOutlineTrash, HiOutlineCheckCircle,
  HiOutlineBan, HiOutlineShieldCheck
} from 'react-icons/hi';

const COLORS = ['#6366f1', '#f59e0b', '#f97316', '#ef4444', '#22c55e', '#8b5cf6'];

const typeLabels = {
  pothole: '🕳️ Potholes',
  speed_bump: '⚠️ Speed Bumps',
  road_crack: '⚡ Road Cracks',
};

export default function DashboardPage() {
  const { user, API } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await axios.get('/stats');
      setStats(data);
    } catch (err) {
      console.warn('Stats fetch error:', err.message);
      // Use mock data for demo
      setStats({
        totalIssues: 0,
        byType: { potholes: 0, bumps: 0, cracks: 0 },
        byStatus: { pending: 0, verified: 0, resolved: 0 },
        bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
        recentIssues: [],
        topContributors: [],
      });
    }
    setLoading(false);
  };

  const updateIssueStatus = async (issueId, status) => {
    try {
      await API.put(`/issues/${issueId}/status`, { status });
      toast.success(`Issue marked as ${status}`);
      fetchStats();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const deleteIssue = async (issueId) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    try {
      await API.delete(`/issues/${issueId}`);
      toast.success('Issue deleted');
      fetchStats();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-screen">
        <div className="spinner" />
      </div>
    );
  }

  const typeChartData = [
    { name: 'Potholes', value: stats?.byType?.potholes || 0 },
    { name: 'Bumps', value: stats?.byType?.bumps || 0 },
    { name: 'Cracks', value: stats?.byType?.cracks || 0 },
  ];

  const severityChartData = [
    { name: 'Low', value: stats?.bySeverity?.low || 0, fill: '#22c55e' },
    { name: 'Medium', value: stats?.bySeverity?.medium || 0, fill: '#eab308' },
    { name: 'High', value: stats?.bySeverity?.high || 0, fill: '#f97316' },
    { name: 'Critical', value: stats?.bySeverity?.critical || 0, fill: '#ef4444' },
  ];

  const statusChartData = [
    { name: 'Pending', value: stats?.byStatus?.pending || 0 },
    { name: 'Verified', value: stats?.byStatus?.verified || 0 },
    { name: 'Resolved', value: stats?.byStatus?.resolved || 0 },
  ];

  return (
    <div className="page-container">
      <div className="content-container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="section-title">Dashboard</h1>
          <p className="section-subtitle">Analytics and management overview</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white/50 dark:bg-white/5 rounded-xl p-1 w-fit border border-gray-200/50 dark:border-gray-700/50">
          {[
            { id: 'overview', label: 'Overview', icon: HiOutlineChartBar },
            { id: 'reports', label: 'Recent Reports', icon: HiOutlineExclamation },
            ...(user?.role === 'admin' ? [{ id: 'admin', label: 'Admin', icon: HiOutlineShieldCheck }] : []),
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Reports', value: stats?.totalIssues || 0, icon: HiOutlineChartBar, color: 'from-primary-500 to-primary-600', emoji: '📊' },
                { label: 'Verified', value: stats?.byStatus?.verified || 0, icon: HiOutlineCheckCircle, color: 'from-green-500 to-green-600', emoji: '✅' },
                { label: 'Pending', value: stats?.byStatus?.pending || 0, icon: HiOutlineExclamation, color: 'from-amber-500 to-amber-600', emoji: '⏳' },
                { label: 'Contributors', value: stats?.topContributors?.length || 0, icon: HiOutlineUsers, color: 'from-accent-500 to-accent-600', emoji: '👥' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card p-5"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg text-lg`}>
                      {stat.emoji}
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Issue Type Distribution */}
              <div className="glass-card p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">Issue Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={typeChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {typeChartData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Severity Breakdown */}
              <div className="glass-card p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">Severity Breakdown</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={severityChartData}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {severityChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Contributors */}
            {stats?.topContributors?.length > 0 && (
              <div className="glass-card p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <HiOutlineTrendingUp className="w-5 h-5 text-primary-500" />
                  Top Contributors
                </h3>
                <div className="space-y-3">
                  {stats.topContributors.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-bold">
                          {i + 1}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{c.name}</span>
                      </div>
                      <span className="text-sm text-gray-500">{c.reportsCount} reports</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Recent Reports Tab */}
        {activeTab === 'reports' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="glass-card p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Recent Reports</h3>
              {stats?.recentIssues?.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentIssues.map((issue, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">
                          {issue.type === 'pothole' ? '🕳️' : issue.type === 'speed_bump' ? '⚠️' : '⚡'}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white capitalize">
                            {issue.type?.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-gray-500">
                            by {issue.reporter} • {new Date(issue.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className={`badge-severity-${issue.severity} capitalize`}>
                        {issue.severity}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <HiOutlineChartBar className="w-16 h-16 mx-auto text-gray-200 dark:text-gray-700 mb-3" />
                  <p className="text-gray-500">No reports yet. Be the first to report!</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Admin Tab */}
        {activeTab === 'admin' && user?.role === 'admin' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="glass-card p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <HiOutlineShieldCheck className="w-5 h-5 text-primary-500" />
                Admin Panel - Manage Reports
              </h3>
              {stats?.recentIssues?.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentIssues.map((issue, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/5">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">
                          {issue.type === 'pothole' ? '🕳️' : issue.type === 'speed_bump' ? '⚠️' : '⚡'}
                        </span>
                        <div>
                          <p className="font-medium capitalize">{issue.type?.replace('_', ' ')}</p>
                          <p className="text-xs text-gray-500">ID: {issue.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateIssueStatus(issue.id, 'verified')}
                          className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-500/10 dark:hover:bg-green-500/20 transition-colors"
                          title="Verify"
                        >
                          <HiOutlineCheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateIssueStatus(issue.id, 'fake')}
                          className="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 transition-colors"
                          title="Mark as fake"
                        >
                          <HiOutlineBan className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteIssue(issue.id)}
                          className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
                          title="Delete"
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-gray-500">No reports to manage</p>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

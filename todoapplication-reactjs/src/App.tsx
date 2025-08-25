import React, { useState, useEffect } from 'react';
import './App.css';
import apiService, { Task, User, TaskFilter, DashboardStats } from './services/apiService';
import validationService, { FieldValidationResult } from './services/validationService';

interface LoginData {
  username: string;
  password: string;
}

const App = (): React.ReactElement => {
  // ==================== STATE ====================
  
  // Authentication
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginData, setLoginData] = useState<LoginData>({ username: 'admin', password: 'admin123' });
  
  // Navigation
  const [currentView, setCurrentView] = useState<'tasks' | 'admin' | 'dashboard'>('tasks');
  
  // Tasks
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  
  // Advanced filtering
  const [filters, setFilters] = useState<TaskFilter>({
    status: 'ALL',
    priority: 'ALL',
    category: '',
    keyword: ''
  });
  
  // Categories and users
  const [categories] = useState<string[]>(['Work', 'Personal', 'Shopping', 'Health', 'Education']);
  const [users, setUsers] = useState<User[]>([]);
  
  // Dashboard
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  
  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Validation
  const [loginValidationErrors, setLoginValidationErrors] = useState<FieldValidationResult>({});

  // ==================== AUTHENTICATION ====================
  
  const checkAuthStatus = () => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      console.log('Not in browser environment');
      return;
    }
    
    const token = localStorage.getItem('jwt_token');
    const userData = localStorage.getItem('user_data');
    
    console.log('Token:', token ? 'exists' : 'not found');
    console.log('User data:', userData);
    
    if (token && userData) {
      setIsLoggedIn(true);
      const user = JSON.parse(userData);
      setCurrentUser(user);
      setIsAdmin(user?.role === 'ADMIN');
      console.log('User logged in:', user);
      console.log('Is admin:', user?.role === 'ADMIN');
      
      if (user?.role === 'ADMIN') {
        console.log('Loading admin data...');
        loadUsers();
      }
    }
  };

  const login = async () => {
    // Validate login form
    const errors = validationService.validateLoginForm(loginData.username, loginData.password);
    
    if (validationService.hasValidationErrors(errors)) {
      setLoginValidationErrors(errors);
      showError('Please fix the validation errors before submitting.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    console.log('Attempting login with:', loginData.username);
    
    try {
      const response = await apiService.login(loginData);
      console.log('Login response:', response);
      
      if (response && (response.accessToken || response.token)) {
        const token = response.accessToken || response.token;
        
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          localStorage.setItem('jwt_token', token!);
          
          const isAdminUser = loginData.username.toLowerCase() === 'admin' || 
                             response.role === 'ADMIN' || 
                             response.user?.role === 'ADMIN';
          
          const userData: User = {
            username: response.username || loginData.username,
            role: isAdminUser ? 'ADMIN' : 'USER',
            email: response.user?.email
          };
          
          localStorage.setItem('user_data', JSON.stringify(userData));
          console.log('Stored user data:', userData);
        }
        
        setIsLoggedIn(true);
        const user: User = {
          username: response.username || loginData.username,
          role: (loginData.username.toLowerCase() === 'admin' || 
                 response.role === 'ADMIN' || 
                 response.user?.role === 'ADMIN') ? 'ADMIN' : 'USER',
          email: response.user?.email
        };
        setCurrentUser(user);
        setIsAdmin(user.role === 'ADMIN');
        
        console.log('Login successful - User:', user, 'Is Admin:', user.role === 'ADMIN');
        
        loadInitialData();
        showSuccess('Login successful!');
      } else {
        console.error('Invalid login response - no token found:', response);
        showError('Login failed - no token received');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      showError('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    apiService.logout();
    clearSession();
    showSuccess('Logged out successfully');
  };

  const clearSession = () => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user_data');
    }
    
    setIsLoggedIn(false);
    setIsAdmin(false);
    setCurrentUser(null);
    setTasks([]);
    setCurrentView('tasks');
  };

  // ==================== DATA LOADING ====================
  
  const loadInitialData = async () => {
    await loadTasks();
    if (isAdmin) {
      await loadUsers();
    }
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      const tasks = await apiService.getTasks();
      setTasks(tasks);
      applyFilters(tasks);
    } catch (error: any) {
      showError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    console.log('Loading users...');
    try {
      const users = await apiService.getAllUsers();
      console.log('Users loaded successfully:', users);
      setUsers(users);
    } catch (error: any) {
      console.error('Error loading users:', error);
      showError('Failed to load users: ' + (error.message || 'Unknown error'));
    }
  };

  const loadDashboardStats = async () => {
    console.log('Loading dashboard stats...');
    
    try {
      const stats = await apiService.getDashboardStats();
      console.log('Dashboard stats loaded from backend:', stats);
      setDashboardStats(stats);
    } catch (error: any) {
      console.error('Error loading dashboard stats from backend:', error);
      console.log('Calculating dashboard stats from local task data...');
      calculateDashboardStatsFromTasks();
    }
  };

  const calculateDashboardStatsFromTasks = () => {
    if (!tasks || tasks.length === 0) {
      console.log('No tasks available for dashboard stats calculation');
      setDashboardStats({
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0,
        tasksCompletedToday: 0,
        tasksCompletedThisWeek: 0,
        tasksCompletedThisMonth: 0,
        totalUsers: users?.length || 0,
        activeUsers: users?.filter(u => u.isActive)?.length || 0,
        categoriesCount: categories?.length || 0,
        averageTaskCompletionTime: 0,
        tasksByCategory: {},
        tasksByPriority: {},
        recentActivity: []
      });
      return;
    }

    const now = new Date();

    // Calculate basic stats
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const pendingTasks = tasks.filter(t => t.status === 'PENDING').length;
    const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    
    // Calculate overdue tasks
    const overdueTasks = tasks.filter(t => {
      if (!t.dueDate || t.status === 'COMPLETED') return false;
      const dueDate = new Date(t.dueDate);
      return dueDate < now;
    }).length;

    // Calculate tasks by category
    const tasksByCategory: { [key: string]: number } = {};
    tasks.forEach(task => {
      const category = task.category || 'Uncategorized';
      tasksByCategory[category] = (tasksByCategory[category] || 0) + 1;
    });

    // Calculate tasks by priority
    const tasksByPriority: { [key: string]: number } = {};
    tasks.forEach(task => {
      const priority = task.priority || 'MEDIUM';
      tasksByPriority[priority] = (tasksByPriority[priority] || 0) + 1;
    });

    setDashboardStats({
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      overdueTasks,
      tasksCompletedToday: 0,
      tasksCompletedThisWeek: 0,
      tasksCompletedThisMonth: 0,
      totalUsers: users?.length || 0,
      activeUsers: users?.filter(u => u.isActive)?.length || 0,
      categoriesCount: Object.keys(tasksByCategory).length,
      averageTaskCompletionTime: 0,
      tasksByCategory,
      tasksByPriority,
      recentActivity: tasks
        .filter(t => t.updatedAt)
        .sort((a, b) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime())
        .slice(0, 5)
    });
  };

  // ==================== FILTERING & SEARCH ====================

  const applyFilters = (tasksList: Task[] = tasks) => {
    let filtered = [...tasksList];

    // Keyword search
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(keyword) ||
        task.description?.toLowerCase().includes(keyword) ||
        task.category?.toLowerCase().includes(keyword)
      );
    }

    // Status filter
    if (filters.status && filters.status !== 'ALL') {
      filtered = filtered.filter(task => task.status === filters.status);
    }

    // Priority filter
    if (filters.priority && filters.priority !== 'ALL') {
      filtered = filtered.filter(task => task.priority === filters.priority);
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(task => task.category === filters.category);
    }

    setFilteredTasks(filtered);
  };

  // ==================== UTILITY METHODS ====================

  const showError = (message: string) => {
    setError(message);
    setSuccessMessage('');
    setTimeout(() => setError(''), 5000);
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setError('');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const formatDate = (date: Date | string): string => {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  };

  const isOverdue = (dueDate: Date | string): boolean => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getPriorityClass = (priority: string): string => {
    switch (priority) {
      case 'HIGH': return 'priority-high';
      case 'MEDIUM': return 'priority-medium';
      case 'LOW': return 'priority-low';
      default: return '';
    }
  };

  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'COMPLETED': return 'status-completed';
      case 'IN_PROGRESS': return 'status-in-progress';
      case 'PENDING': return 'status-pending';
      default: return '';
    }
  };

  // ==================== EFFECTS ====================

  useEffect(() => {
    console.log('Component initialized');
    
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        checkAuthStatus();
        if (apiService.isLoggedIn()) {
          loadInitialData();
        }
      }, 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyFilters();
  // eslint-disable-next-line react-hooks/exhaustive-deps  
  }, [filters, tasks]);

  useEffect(() => {
    if (currentView === 'dashboard' && !dashboardStats) {
      loadDashboardStats();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  // ==================== RENDER ====================

  if (!isLoggedIn) {
    return (
      <div className="app-container">
        <div className="login-container">
          <div className="login-card">
            <h2>Login to ToDoList</h2>
            <form onSubmit={(e) => { e.preventDefault(); login(); }}>
              <div className="form-group">
                <label htmlFor="username">Username:</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={loginData.username}
                  onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                  required
                  className={`form-control ${loginValidationErrors.username ? 'error' : ''}`}
                />
                {loginValidationErrors.username && (
                  <div className="validation-errors">
                    {loginValidationErrors.username.map((error, index) => (
                      <div key={index} className="error-message">{error}</div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="password">Password:</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  required
                  className={`form-control ${loginValidationErrors.password ? 'error' : ''}`}
                />
                {loginValidationErrors.password && (
                  <div className="validation-errors">
                    {loginValidationErrors.password.map((error, index) => (
                      <div key={index} className="error-message">{error}</div>
                    ))}
                  </div>
                )}
              </div>
              
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
        
        {/* Messages */}
        {error && <div className="message error">{error}</div>}
        {successMessage && <div className="message success">{successMessage}</div>}
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <h1>Enhanced ToDoList</h1>
          <div className="user-info">
            <span className="welcome">Welcome, {currentUser?.username}!</span>
            <span className={`role-badge role-${currentUser?.role?.toLowerCase()}`}>
              {currentUser?.role}
            </span>
            <small style={{marginLeft: '10px', color: '#666'}}>
              (Admin: {isAdmin ? 'Yes' : 'No'})
            </small>
            <button className="btn btn-outline" onClick={logout}>Logout</button>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="app-nav">
          <button 
            className={`nav-btn ${currentView === 'tasks' ? 'active' : ''}`}
            onClick={() => setCurrentView('tasks')}>
            <span className="icon">📋</span> Tasks
          </button>
          <button 
            className={`nav-btn ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}>
            <span className="icon">📊</span> Dashboard
          </button>
          {isAdmin && (
            <button 
              className={`nav-btn ${currentView === 'admin' ? 'active' : ''}`}
              onClick={() => setCurrentView('admin')}>
              <span className="icon">👥</span> Admin
            </button>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {currentView === 'tasks' && (
          <div className="tasks-view">
            {/* Task Controls */}
            <div className="task-controls">
              <div className="controls-row">
                <div className="search-container">
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={filters.keyword || ''}
                    onChange={(e) => setFilters({...filters, keyword: e.target.value})}
                    className="search-input"
                  />
                  <button 
                    className="btn btn-sm"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
                    Filters
                  </button>
                </div>
                <button className="btn btn-primary" onClick={() => showSuccess('Task creation modal coming soon!')}>
                  ➕ Add Task
                </button>
              </div>

              {showAdvancedFilters && (
                <div className="advanced-filters">
                  <div className="filter-row">
                    <div className="filter-group">
                      <label>Status:</label>
                      <select 
                        value={filters.status || 'ALL'} 
                        onChange={(e) => setFilters({...filters, status: e.target.value as any})}
                        className="form-control">
                        <option value="ALL">All Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </div>
                    
                    <div className="filter-group">
                      <label>Priority:</label>
                      <select 
                        value={filters.priority || 'ALL'} 
                        onChange={(e) => setFilters({...filters, priority: e.target.value as any})}
                        className="form-control">
                        <option value="ALL">All Priorities</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                      </select>
                    </div>
                    
                    <div className="filter-group">
                      <label>Category:</label>
                      <select 
                        value={filters.category || ''} 
                        onChange={(e) => setFilters({...filters, category: e.target.value})}
                        className="form-control">
                        <option value="">All Categories</option>
                        {categories.map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tasks Grid */}
            {filteredTasks.length === 0 ? (
              <div className="no-tasks">
                <h3>No tasks found</h3>
                <p>Create your first task to get started or try different filters!</p>
                <button className="btn btn-primary" onClick={() => showSuccess('Task creation coming soon!')}>
                  Create Task
                </button>
              </div>
            ) : (
              <div className="tasks-grid">
                {filteredTasks.map(task => (
                  <div key={task.id} className={`task-card ${getStatusClass(task.status)} ${isOverdue(task.dueDate!) ? 'overdue' : ''}`}>
                    <div className="task-header">
                      <div className="task-title-section">
                        <div className="task-title">{task.title}</div>
                        <div className="task-meta">
                          <span className={`priority-badge ${getPriorityClass(task.priority!)}`}>
                            {task.priority}
                          </span>
                          <span className={`status-badge ${getStatusClass(task.status)}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                          {task.category && (
                            <span className="category-badge">{task.category}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {task.description && (
                      <div className="task-body">
                        <div className="task-description">{task.description}</div>
                      </div>
                    )}
                    
                    <div className="task-footer">
                      {task.dueDate && (
                        <div className="task-dates">
                          <div className={`due-date ${isOverdue(task.dueDate) ? 'overdue-label' : ''}`}>
                            📅 Due: {formatDate(task.dueDate)}
                            {isOverdue(task.dueDate) && <span> (Overdue)</span>}
                          </div>
                        </div>
                      )}
                      
                      <div className="status-actions">
                        {task.status !== 'COMPLETED' && (
                          <button className="btn btn-sm btn-success" onClick={() => showSuccess('Task completion coming soon!')}>✅ Complete</button>
                        )}
                        <button className="btn btn-sm btn-primary" onClick={() => showSuccess('Task editing coming soon!')}>✏️ Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => showSuccess('Task deletion coming soon!')}>🗑️ Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentView === 'dashboard' && (
          <div className="dashboard-view">
            <h2>Dashboard</h2>
            {dashboardStats && (
              <div className="dashboard-stats">
                <div className="stats-grid">
                  <div className="stat-card">
                    <h3>{dashboardStats.totalTasks}</h3>
                    <p>Total Tasks</p>
                  </div>
                  <div className="stat-card">
                    <h3>{dashboardStats.completedTasks}</h3>
                    <p>Completed</p>
                  </div>
                  <div className="stat-card">
                    <h3>{dashboardStats.pendingTasks}</h3>
                    <p>Pending</p>
                  </div>
                  <div className="stat-card">
                    <h3>{dashboardStats.inProgressTasks}</h3>
                    <p>In Progress</p>
                  </div>
                  <div className="stat-card overdue">
                    <h3>{dashboardStats.overdueTasks}</h3>
                    <p>Overdue</p>
                  </div>
                </div>
                
                <div className="charts-section">
                  <div className="chart-card">
                    <h4>Tasks by Category</h4>
                    <div className="category-list">
                      {Object.entries(dashboardStats.tasksByCategory).map(([category, count]) => (
                        <div key={category} className="category-item">
                          <span>{category}</span>
                          <span className="category-count">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="chart-card">
                    <h4>Tasks by Priority</h4>
                    <div className="priority-list">
                      {Object.entries(dashboardStats.tasksByPriority).map(([priority, count]) => (
                        <div key={priority} className="priority-item">
                          <span>{priority}</span>
                          <span className="priority-count">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === 'admin' && isAdmin && (
          <div className="admin-view">
            <h2>User Management</h2>
            <div className="admin-controls">
              <button className="btn btn-primary" onClick={() => showSuccess('User creation coming soon!')}>
                ➕ Add User
              </button>
            </div>
            
            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>{user.username}</td>
                      <td>{user.email || '-'}</td>
                      <td>
                        <span className={`role-badge role-${user.role?.toLowerCase()}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${user.isActive ? 'active' : ''}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="actions">
                        <button className="btn-icon" onClick={() => showSuccess('User editing coming soon!')}>✏️</button>
                        <button className={`btn-icon ${user.isActive ? 'btn-deactivate' : 'btn-activate'}`} onClick={() => showSuccess('User status toggle coming soon!')}>
                          {user.isActive ? '🚫' : '✅'}
                        </button>
                        <button className="btn-icon btn-danger" onClick={() => showSuccess('User deletion coming soon!')}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">Loading...</div>
        </div>
      )}

      {/* Messages */}
      {error && <div className="message error">{error}</div>}
      {successMessage && <div className="message success">{successMessage}</div>}
    </div>
  );
};

export default App;
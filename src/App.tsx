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
  const [loginData, setLoginData] = useState<LoginData>({ username: '', password: '' });
  
  // Navigation
  const [currentView, setCurrentView] = useState<'tasks' | 'admin' | 'dashboard'>('tasks');
  
  // Tasks
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  
  // Task form
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    priority: 'MEDIUM',
    category: '',
    tags: [],
    dueDate: undefined
  });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Advanced filtering
  const [filters, setFilters] = useState<TaskFilter>({
    status: 'ALL',
    priority: 'ALL',
    category: '',
    keyword: '',
    dueDateFrom: undefined,
    dueDateTo: undefined
  });
  
  // Categories and users
  const [categories] = useState<string[]>(['Work', 'Personal', 'Shopping', 'Health', 'Education']);
  const [users, setUsers] = useState<User[]>([]);
  // const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [availableActiveUsers, setAvailableActiveUsers] = useState<User[]>([]);
  
  // Contributors for tasks
  const [selectedContributors, setSelectedContributors] = useState<User[]>([]);
  const [selectedContributorId, setSelectedContributorId] = useState<number | string>('');
  
  // Admin features
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [newUser, setNewUser] = useState<any>({
    username: '',
    password: '',
    email: '',
    role: 'USER',
    firstName: '',
    lastName: '',
    isActive: true
  });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Dashboard
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  
  // UI state
  const [showTaskModal, setShowTaskModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Validation
  const [loginValidationErrors, setLoginValidationErrors] = useState<FieldValidationResult>({});
  const [userValidationErrors, setUserValidationErrors] = useState<FieldValidationResult>({});
  const [taskValidationErrors, setTaskValidationErrors] = useState<FieldValidationResult>({});
  // const [showValidationErrors, setShowValidationErrors] = useState<boolean>(false);

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
    // Prevent duplicate login attempts
    if (loading) {
      console.log('Login already in progress, ignoring duplicate call');
      return;
    }

    // Validate login form
    const errors = validationService.validateLoginForm(loginData.username, loginData.password);
    
    if (validationService.hasValidationErrors(errors)) {
      setLoginValidationErrors(errors);
      const specificErrors = validationService.formatValidationErrorsWithContext(errors);
      showError(`Login validation failed: ${specificErrors}`);
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
    await loadCategories();
    if (isAdmin) {
      await loadUsers();
    }
    await loadUsersForAssignment();
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading tasks with collaborators...');
      const taskResponses = await apiService.getTasks();
      console.log('✅ Tasks loaded:', taskResponses);
      
      // Convert TaskResponse[] to Task[] for frontend compatibility
      const convertedTasks: Task[] = taskResponses.map(taskResponse => ({
        id: taskResponse.id,
        title: taskResponse.title,
        description: taskResponse.description,
        status: taskResponse.status,
        priority: taskResponse.priority,
        category: taskResponse.category,
        dueDate: taskResponse.dueDate,
        completionDate: taskResponse.completionDate || undefined,
        createdAt: taskResponse.createDate,
        updatedAt: taskResponse.updateDate,
        assignedTo: {
          id: taskResponse.owner.id,
          username: taskResponse.owner.username,
          email: taskResponse.owner.email,
          role: taskResponse.owner.role,
          isActive: taskResponse.owner.isActive
        },
        collaborators: taskResponse.collaborators.map(c => ({
          id: c.id,
          username: c.username,
          email: c.email,
          role: c.role,
          isActive: c.isActive
        })),
        userId: taskResponse.owner.id
      }));
      
      setTasks(convertedTasks);
      applyFilters(convertedTasks);
    } catch (error: any) {
      console.error('❌ Error loading tasks:', error);
      if (error.response?.status === 500 && error.response?.data?.includes('LazyInitializationException')) {
        showError('Backend database session issue. Please contact administrator or try refreshing.');
      } else {
        showError('Failed to load tasks: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    // TODO: Backend categories endpoint not implemented yet
    // try {
    //   const categories = await apiService.getCategories();
    //   setCategories(Array.from(new Set(categories)));
    // } catch (error: any) {
    //   console.error('Error loading categories:', error);
    // }
    
    // For now, categories will be populated from tasks as they are created/loaded
    console.log('Categories will be extracted from existing tasks');
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

  const loadUsersForAssignment = async () => {
    try {
      console.log('🔄 Loading users for assignment...');
      const users = await apiService.getUsersForAssignment();
      console.log('✅ Users for assignment loaded successfully:', users);
      console.log('📊 Number of users loaded:', users.length);
      setAvailableActiveUsers(users);
      
      // Additional debug info
      if (users.length === 0) {
        console.warn('⚠️ No users returned from API. Check backend and user data.');
      }
    } catch (error: any) {
      console.error('❌ Error loading assignable users:', error);
      console.error('🔍 Error details:', error.response?.data || error.message);
      showError('Failed to load assignable users: ' + (error.message || 'Unknown error'));
    }
  };

  const loadActiveUsers = async () => {
    console.log('Loading active users for contributors...');
    try {
      const users = await apiService.getActiveUsers();
      console.log('Active users loaded successfully:', users);
      console.log('Number of active users:', users.length);
      setAvailableActiveUsers(users);
    } catch (error: any) {
      console.error('Error loading active users:', error);
      showError('Failed to load active users: ' + (error.message || 'Unknown error'));
    }
  };

  const loadDashboardStats = async () => {
    console.log('Loading dashboard stats...');
    
    // TODO: Backend dashboard stats endpoint not implemented yet
    // try {
    //   const stats = await apiService.getDashboardStats();
    //   console.log('Dashboard stats loaded from backend:', stats);
    //   setDashboardStats(stats);
    // } catch (error: any) {
    //   console.error('Error loading dashboard stats from backend:', error);
    //   console.log('Calculating dashboard stats from local task data...');
    //   calculateDashboardStatsFromTasks();
    // }

    // For now, calculate stats from local task data
    console.log('Calculating dashboard stats from local task data...');
    calculateDashboardStatsFromTasks();
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

    // Date filters
    if (filters.dueDateFrom) {
      filtered = filtered.filter(task => 
        task.dueDate && new Date(task.dueDate) >= filters.dueDateFrom!
      );
    }

    if (filters.dueDateTo) {
      filtered = filtered.filter(task => 
        task.dueDate && new Date(task.dueDate) <= filters.dueDateTo!
      );
    }

    setFilteredTasks(filtered);
  };

  const clearFilters = () => {
    setFilters({
      status: 'ALL',
      priority: 'ALL',
      category: '',
      keyword: '',
      dueDateFrom: undefined,
      dueDateTo: undefined
    });
    applyFilters();
  };

  // ==================== TASK MANAGEMENT ====================

  const openTaskModal = (task?: Task) => {
    clearValidationErrors(); // Clear validation errors when opening modal
    
    if (task) {
      setEditingTask({ ...task });
      setNewTask({ ...task });
      setSelectedContributors(task.collaborators || []);
    } else {
      resetTaskForm();
      setSelectedContributors([]);
    }
    
    // Load active users for contributors
    loadActiveUsers();
    
    setShowTaskModal(true);
  };

  const closeTaskModal = () => {
    setShowTaskModal(false);
    setEditingTask(null);
    setSelectedContributors([]);
    setSelectedContributorId('');
    resetTaskForm();
  };

  const saveTask = async () => {
    // Validate task form
    const taskValidationErrors = validationService.validateTaskForm({
      title: newTask.title || '',
      description: newTask.description || '',
      dueDate: newTask.dueDate,
      status: newTask.status || 'PENDING',
      category: newTask.category || '',
      priority: newTask.priority || 'MEDIUM'
    });
    
    if (validationService.hasValidationErrors(taskValidationErrors)) {
      setTaskValidationErrors(taskValidationErrors);
      // setShowValidationErrors(true);
      const specificErrors = validationService.formatValidationErrorsWithContext(taskValidationErrors);
      showError(`Task validation failed: ${specificErrors}`);
      return;
    }
    
    // setShowValidationErrors(false);
    setLoading(true);
    
    // Parse tags if they're a string
    if (typeof newTask.tags === 'string') {
      setNewTask({...newTask, tags: (newTask.tags as string).split(',').map(tag => tag.trim()).filter(tag => tag)});
    }

    // Helper to format Date or ISO string to YYYY-MM-DD for LocalDate
    const formatToLocalDate = (d?: Date | string): string | undefined => {
      if (!d) return undefined;
      const dateObj = typeof d === 'string' ? new Date(d) : d;
      if (isNaN(dateObj.getTime())) return undefined;
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const taskData = {
      title: newTask.title || '',
      description: newTask.description || '',
      dueDate: formatToLocalDate(newTask.dueDate),
      status: (newTask.status || 'PENDING') as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED',
      priority: (newTask.priority || 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH',
      category: newTask.category || '',
      collaboratorUserIds: selectedContributors.map(user => user.id!).filter(id => id !== undefined)
    };

    try {
      if (editingTask) {
        console.log('🔄 Updating task with collaborators:', taskData);
    const updateRequest = { ...taskData, id: editingTask.id! };
        const updatedTaskResponse = await apiService.updateTaskWithCollaborators(updateRequest);
        
        // Convert TaskResponse back to Task for state management
        const updatedTask: Task = {
          id: updatedTaskResponse.id,
          title: updatedTaskResponse.title,
          description: updatedTaskResponse.description,
          status: updatedTaskResponse.status,
          priority: updatedTaskResponse.priority,
          category: updatedTaskResponse.category,
          dueDate: updatedTaskResponse.dueDate,
          completionDate: updatedTaskResponse.completionDate || undefined,
          createdAt: updatedTaskResponse.createDate,
          updatedAt: updatedTaskResponse.updateDate,
          assignedTo: {
            id: updatedTaskResponse.owner.id,
            username: updatedTaskResponse.owner.username,
            email: updatedTaskResponse.owner.email,
            role: updatedTaskResponse.owner.role,
            isActive: updatedTaskResponse.owner.isActive
          },
          collaborators: updatedTaskResponse.collaborators.map(c => ({
            id: c.id,
            username: c.username,
            email: c.email,
            role: c.role,
            isActive: c.isActive
          })),
          userId: updatedTaskResponse.owner.id
        };
        
        const index = tasks.findIndex(t => t.id === updatedTask.id);
        if (index !== -1) {
          const newTasks = [...tasks];
          newTasks[index] = updatedTask;
          setTasks(newTasks);
          applyFilters(newTasks);
        }
        closeTaskModal();
        showSuccess('Task updated successfully with collaborators');
        
        // Refresh dashboard stats if on dashboard view
        if (currentView === 'dashboard') {
          calculateDashboardStatsFromTasks();
        }
      } else {
        console.log('🔄 Creating task with collaborators:', taskData);
        const createdTaskResponse = await apiService.createTaskWithCollaborators(taskData);
        
        // Convert TaskResponse back to Task for state management
        const createdTask: Task = {
          id: createdTaskResponse.id,
          title: createdTaskResponse.title,
          description: createdTaskResponse.description,
          status: createdTaskResponse.status,
          priority: createdTaskResponse.priority,
          category: createdTaskResponse.category,
          dueDate: createdTaskResponse.dueDate,
          completionDate: createdTaskResponse.completionDate || undefined,
          createdAt: createdTaskResponse.createDate,
          updatedAt: createdTaskResponse.updateDate,
          assignedTo: {
            id: createdTaskResponse.owner.id,
            username: createdTaskResponse.owner.username,
            email: createdTaskResponse.owner.email,
            role: createdTaskResponse.owner.role,
            isActive: createdTaskResponse.owner.isActive
          },
          collaborators: createdTaskResponse.collaborators.map(c => ({
            id: c.id,
            username: c.username,
            email: c.email,
            role: c.role,
            isActive: c.isActive
          })),
          userId: createdTaskResponse.owner.id
        };
        
        const newTasks = [createdTask, ...tasks];
        setTasks(newTasks);
        applyFilters(newTasks);
        closeTaskModal();
        showSuccess('Task created successfully with collaborators');
        
        // Refresh dashboard stats if on dashboard view
        if (currentView === 'dashboard') {
          calculateDashboardStatsFromTasks();
        }
      }
    } catch (error: any) {
      console.error('❌ Error saving task:', error);
      showError(editingTask ? 'Failed to update task' : 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (taskId: number) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await apiService.deleteTask(taskId);
      const newTasks = tasks.filter((t: Task) => t.id !== taskId);
      setTasks(newTasks);
      applyFilters(newTasks);
      showSuccess('Task deleted successfully');
      
      // Refresh dashboard stats if on dashboard view
      if (currentView === 'dashboard') {
        calculateDashboardStatsFromTasks();
      }
      await autoRefreshAfterAction();
    } catch (error: any) {
      showError('Failed to delete task');
    }
  };

  const updateTaskStatus = async (task: Task, newStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED') => {
    const updatedTask = { ...task, status: newStatus };
    if (newStatus === 'COMPLETED') {
      updatedTask.completionDate = new Date().toISOString();
    }

    try {
      const updated = await apiService.updateTask(updatedTask);
      const index = tasks.findIndex((t: Task) => t.id === updated.id);
      if (index !== -1) {
        const newTasks = [...tasks];
        newTasks[index] = updated;
        setTasks(newTasks);
        applyFilters(newTasks);
      }
      showSuccess(`Task marked as ${newStatus.toLowerCase().replace('_', ' ')}`);
      await autoRefreshAfterAction();
    } catch (error: any) {
      showError('Failed to update task status');
    }
  };

  // ==================== BULK OPERATIONS ====================

  const toggleTaskSelection = (taskId: number) => {
    const index = selectedTasks.indexOf(taskId);
    if (index > -1) {
      setSelectedTasks(selectedTasks.filter((id: number) => id !== taskId));
    } else {
      setSelectedTasks([...selectedTasks, taskId]);
    }
  };

  const selectAllTasks = () => {
    setSelectedTasks(filteredTasks.map((task: Task) => task.id!));
  };

  const clearSelection = () => {
    setSelectedTasks([]);
  };

  const bulkUpdateStatus = async (status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED') => {
    if (selectedTasks.length === 0) {
      showError('Please select tasks to update');
      return;
    }

    const formatToLocalDate = (d?: Date | string): string | undefined => {
      if (!d) return undefined;
      const dateObj = typeof d === 'string' ? new Date(d) : d;
      if (isNaN(dateObj.getTime())) return undefined;
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const updates: Partial<Task> = { status };
    if (status === 'COMPLETED') {
      updates.completionDate = formatToLocalDate(new Date());
    }

    try {
      setLoading(true);
      showSuccess(`Updating ${selectedTasks.length} tasks individually...`);
      
      // Use the modified bulkUpdateTasks that handles individual requests internally
      const updatedTasks = await apiService.bulkUpdateTasks(selectedTasks, updates);
      
  // Refresh tasks from backend to get canonical data
  await loadTasks();
  applyFilters();
      clearSelection();
      
      // Show appropriate message based on success rate
      if (updatedTasks.length === selectedTasks.length) {
        showSuccess(`All ${updatedTasks.length} tasks updated successfully`);
      } else if (updatedTasks.length > 0) {
        showSuccess(`${updatedTasks.length} out of ${selectedTasks.length} tasks updated successfully`);
      } else {
        showError('No tasks were updated successfully');
      }
    } catch (error: any) {
      console.error('Bulk update error:', error);
      showError(`Failed to update tasks: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // ==================== USER MANAGEMENT (ADMIN) ====================

  const openUserModal = (user?: User) => {
    clearValidationErrors(); // Clear validation errors when opening modal
    
    console.log('Opening user modal. User parameter:', user);
    if (user) {
      console.log('Editing existing user:', user.username);
      setEditingUser({ ...user });
      setNewUser({
        username: user.username,
        password: '',
        email: user.email || '',
        role: user.role || 'USER',
        firstName: '',
        lastName: '',
        isActive: user.isActive !== undefined ? user.isActive : true
      });
      console.log('Set newUser for editing. isActive:', newUser.isActive);
    } else {
      console.log('Creating new user - calling resetUserForm()');
      resetUserForm();
    }
    setShowUserModal(true);
    console.log('Modal opened. Final newUser state:', newUser);
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setEditingUser(null);
    resetUserForm();
  };

  const saveUser = async () => {
    // Validate user form
    let userValidationErrors;
    if (editingUser) {
      userValidationErrors = validationService.validateUserUpdateForm({
        id: editingUser.id!,
        username: newUser.username,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        firstName: newUser.firstName,
        lastName: newUser.lastName
      });
    } else {
      userValidationErrors = validationService.validateRegistrationForm({
        username: newUser.username || '',
        email: newUser.email || '',
        password: newUser.password || '',
        role: newUser.role,
        firstName: newUser.firstName,
        lastName: newUser.lastName
      });
    }
    
    if (validationService.hasValidationErrors(userValidationErrors)) {
      setUserValidationErrors(userValidationErrors);
      // setShowValidationErrors(true);
      const specificErrors = validationService.formatValidationErrorsWithContext(userValidationErrors);
      showError(`User validation failed: ${specificErrors}`);
      return;
    }
    
    // setShowValidationErrors(false);
    console.log('Attempting to save user:', newUser);
    setLoading(true);

    try {
      if (editingUser) {
        const updateData: Partial<User> = {
          username: newUser.username,
          email: newUser.email,
          role: newUser.role
        };

        console.log('Updating user with data:', updateData);
        const updatedUser = await apiService.updateUser(editingUser.id!, updateData);
        console.log('User updated successfully:', updatedUser);
        const index = users.findIndex((u: User) => u.id === updatedUser.id);
        if (index !== -1) {
          const newUsers = [...users];
          newUsers[index] = updatedUser;
          setUsers(newUsers);
        }
        closeUserModal();
        showSuccess('User updated successfully');
        await autoRefreshAfterAction();
      } else {
        console.log('Creating new user with data:', newUser);
        const user = await apiService.registerUser(newUser);
        console.log('User created successfully:', user);
        // Refresh the user list to get updated data from backend
        await loadUsers();
        closeUserModal();
        showSuccess('User created successfully');
        await autoRefreshAfterAction();
      }
    } catch (error: any) {
      console.error('Error saving user:', error);
      const errorMessage = error.message || 'Unknown error';
      console.error('Detailed error:', error);
      showError((editingUser ? 'Failed to update user: ' : 'Failed to create user: ') + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await apiService.deleteUser(userId);
      setUsers(users.filter((u: User) => u.id !== userId));
      showSuccess('User deleted successfully');
      await autoRefreshAfterAction();
    } catch (error: any) {
      showError('Failed to delete user');
    }
  };

  const toggleUserStatus = async (user: any) => {
    const currentStatus = user.isActive;
    const action = currentStatus ? 'deactivate' : 'activate';
    const confirmMessage = `Are you sure you want to ${action} user "${user.username}"?`;
    
    if (!window.confirm(confirmMessage)) return;

    const newStatus = !currentStatus;
    console.log('Component: Toggling user status:', user.username);
    console.log('Component: Current status (isActive):', currentStatus);
    console.log('Component: Target status (isActive):', newStatus);
    
    try {
      const updatedUser = await apiService.toggleUserStatus(user.id, newStatus);
      console.log('Component: Received updated user from API:', updatedUser);
      console.log('Component: Updated user isActive:', updatedUser.isActive);
      
      // Update the user in the local array with proper change detection
      const userIndex = users.findIndex((u: User) => u.id === user.id);
      if (userIndex !== -1) {
        // Create a new array to trigger change detection
        // Ensure we're using the correct status from the response
        const finalStatus = updatedUser.isActive !== undefined ? updatedUser.isActive : newStatus;
        
        const newUsers = users.map((u: User, index: number) => 
          index === userIndex 
            ? { ...u, isActive: finalStatus }
            : u
        );
        setUsers(newUsers);
        
        console.log('Component: Updated user in array:', newUsers[userIndex]);
        console.log('Component: Updated users array length:', newUsers.length);
      }
      
      // Also update active users list if it exists
      if (availableActiveUsers && availableActiveUsers.length > 0) {
        await loadActiveUsers(); // Reload to ensure consistency
      }
      
      // Use the final status for the success message
      const finalStatus = updatedUser.isActive !== undefined ? updatedUser.isActive : newStatus;
      const statusText = finalStatus ? 'activated' : 'deactivated';
      showSuccess(`User ${statusText} successfully`);
      console.log('Component: User status update completed. Final status:', finalStatus);
      await autoRefreshAfterAction();
    } catch (error: any) {
      console.error('Component: Error updating user status:', error);
      showError(`Failed to ${action} user: ` + (error.message || 'Unknown error'));
    }
  };

  // ==================== CONTRIBUTOR MANAGEMENT METHODS ====================

  const addContributor = () => {
    console.log('🎯 addContributor called');
    console.log('📋 selectedContributorId:', selectedContributorId);
    console.log('👥 availableActiveUsers:', availableActiveUsers);
    console.log('✅ selectedContributors:', selectedContributors);
    
    if (!selectedContributorId) {
      showError('Please select a contributor to add');
      return;
    }
    
    const userId = typeof selectedContributorId === 'string' ? 
                   parseInt(selectedContributorId) : 
                   selectedContributorId;
    
    if (isNaN(userId)) {
      showError('Invalid contributor selection');
      return;
    }
    
    const user = availableActiveUsers.find((u: User) => u.id === userId);
    
    if (!user) {
      showError('Selected user not found in available users');
      console.error('❌ Available users:', availableActiveUsers);
      console.error('🔍 Looking for user ID:', userId);
      return;
    }
    
    if (isUserAlreadySelected(userId)) {
      showError(`${user.username} is already a contributor`);
      return;
    }
    
    setSelectedContributors([...selectedContributors, user]);
    setSelectedContributorId('');
    showSuccess(`${user.username} added as contributor`);
    console.log('✅ Added contributor:', user.username);
    console.log('📝 Current contributors:', [...selectedContributors, user]);
  };

  const removeContributor = (index: number) => {
    if (index >= 0 && index < selectedContributors.length) {
      const newContributors = [...selectedContributors];
      const removedUser = newContributors.splice(index, 1)[0];
      setSelectedContributors(newContributors);
      showSuccess(`${removedUser.username} removed from contributors`);
      console.log('Removed contributor:', removedUser.username);
      console.log('Current contributors:', newContributors);
    } else {
      showError('Invalid contributor selection for removal');
    }
  };

  const isUserAlreadySelected = (userId: number): boolean => {
    return selectedContributors.some((user: User) => user.id === userId);
  };

  // ==================== REFRESH FUNCTIONALITY ====================

  const refreshData = async () => {
    setLoading(true);
    try {
      await loadTasks();
      if (isAdmin) {
        await loadUsers();
        await loadActiveUsers();
      }
      await loadUsersForAssignment();
      await loadCategories();
      if (currentView === 'dashboard') {
        await loadDashboardStats();
      }
      showSuccess('Data refreshed successfully');
    } catch (error: any) {
      showError('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  const autoRefreshAfterAction = async () => {
    // Auto refresh data after user actions
    setTimeout(async () => {
      if (isAdmin) {
        await loadUsers();
        await loadActiveUsers();
      }
      await loadUsersForAssignment();
      if (currentView === 'dashboard') {
        await calculateDashboardStatsFromTasks();
      }
    }, 500);
  };

  const resetTaskForm = () => {
    setNewTask({
      title: '',
      description: '',
      priority: 'MEDIUM',
      category: '',
      tags: [],
      dueDate: undefined
    });
  };

  const resetUserForm = () => {
    console.log('Resetting user form...');
    setNewUser({
      username: '',
      password: '',
      email: '',
      role: 'USER',
      firstName: '',
      lastName: '',
      isActive: true
    });
    console.log('Form reset completed. newUser.isActive:', true);
  };

  const clearValidationErrors = () => {
    setLoginValidationErrors({});
    setUserValidationErrors({});
    setTaskValidationErrors({});
    // setShowValidationErrors(false);
  };

  // const resetForms = () => {
  //   resetTaskForm();
  //   resetUserForm();
  //   clearValidationErrors();
  // };

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
                <button className="btn btn-primary" onClick={() => openTaskModal()}>
                  ➕ Add Task
                </button>
                <button className="btn btn-secondary" onClick={refreshData}>
                  🔄 Refresh
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
                    
                    <div className="filter-group">
                      <label>Due Date From:</label>
                      <input 
                        type="date" 
                        value={filters.dueDateFrom ? new Date(filters.dueDateFrom).toISOString().split('T')[0] : ''} 
                        onChange={(e) => setFilters({...filters, dueDateFrom: e.target.value ? new Date(e.target.value) : undefined})}
                        className="form-control"
                      />
                    </div>
                    
                    <div className="filter-group">
                      <label>Due Date To:</label>
                      <input 
                        type="date" 
                        value={filters.dueDateTo ? new Date(filters.dueDateTo).toISOString().split('T')[0] : ''} 
                        onChange={(e) => setFilters({...filters, dueDateTo: e.target.value ? new Date(e.target.value) : undefined})}
                        className="form-control"
                      />
                    </div>
                    
                    <div className="filter-group">
                      <button className="btn btn-sm" onClick={clearFilters}>
                        Clear Filters
                      </button>
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
                <button className="btn btn-primary" onClick={() => openTaskModal()}>
                  Create Task
                </button>
              </div>
            ) : (
              <div>
                {/* Bulk Operations */}
                <div className="bulk-operations">
                  <div className="bulk-controls">
                    <button className="btn btn-sm" onClick={selectAllTasks}>
                      Select All ({filteredTasks.length})
                    </button>
                    <button className="btn btn-sm" onClick={clearSelection}>
                      Clear Selection
                    </button>
                    {selectedTasks.length > 0 && (
                      <div className="bulk-actions">
                        <span>Selected: {selectedTasks.length}</span>
                        <button className="btn btn-sm btn-success" onClick={() => bulkUpdateStatus('COMPLETED')}>
                          ✅ Complete Selected
                        </button>
                        <button className="btn btn-sm btn-warning" onClick={() => bulkUpdateStatus('IN_PROGRESS')}>
                          🔄 Mark In Progress
                        </button>
                        <button className="btn btn-sm" onClick={() => bulkUpdateStatus('PENDING')}>
                          📋 Mark Pending
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="tasks-grid">
                  {filteredTasks.map(task => (
                    <div key={task.id} className={`task-card ${getStatusClass(task.status)} ${isOverdue(task.dueDate!) ? 'overdue' : ''}`}>
                      <div className="task-header">
                        <div className="task-selection">
                          <input
                            type="checkbox"
                            checked={selectedTasks.includes(task.id!)}
                            onChange={() => toggleTaskSelection(task.id!)}
                          />
                        </div>
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
                      
                      {task.collaborators && task.collaborators.length > 0 && (
                        <div className="task-collaborators">
                          <strong>Collaborators:</strong>
                          {task.collaborators.map(collab => (
                            <span key={collab.id} className="collaborator-badge">
                              {collab.username}
                            </span>
                          ))}
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
                            <button className="btn btn-sm btn-success" onClick={() => updateTaskStatus(task, 'COMPLETED')}>✅ Complete</button>
                          )}
                          {task.status !== 'IN_PROGRESS' && (
                            <button className="btn btn-sm btn-warning" onClick={() => updateTaskStatus(task, 'IN_PROGRESS')}>🔄 In Progress</button>
                          )}
                          <button className="btn btn-sm btn-primary" onClick={() => openTaskModal(task)}>✏️ Edit</button>
                          <button className="btn btn-sm btn-danger" onClick={() => deleteTask(task.id!)}>🗑️ Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === 'dashboard' && (
          <div className="dashboard-view">
            <div className="dashboard-header">
              <h2>Dashboard</h2>
              <button className="btn btn-secondary" onClick={refreshData}>
                🔄 Refresh Data
              </button>
            </div>
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
              <button className="btn btn-primary" onClick={() => openUserModal()}>
                ➕ Add User
              </button>
              <button className="btn btn-secondary" onClick={refreshData}>
                🔄 Refresh Data
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
                        <button className="btn-icon" onClick={() => openUserModal(user)}>✏️</button>
                        <button className={`btn-icon ${user.isActive ? 'btn-deactivate' : 'btn-activate'}`} onClick={() => toggleUserStatus(user)}>
                          {user.isActive ? '🚫' : '✅'}
                        </button>
                        <button className="btn-icon btn-danger" onClick={() => deleteUser(user.id!)}>🗑️</button>
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

      {/* Task Modal */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={closeTaskModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTask ? 'Edit Task' : 'Create New Task'}</h2>
              <button className="modal-close" onClick={closeTaskModal}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); saveTask(); }}>
                <div className="form-group">
                  <label htmlFor="taskTitle">Title*:</label>
                  <input
                    type="text"
                    id="taskTitle"
                    value={newTask.title || ''}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                    className={`form-control ${taskValidationErrors.title ? 'error' : ''}`}
                    required
                  />
                  {taskValidationErrors.title && (
                    <div className="validation-errors">
                      {taskValidationErrors.title.map((error, index) => (
                        <div key={index} className="error-message">{error}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="taskDescription">Description:</label>
                  <textarea
                    id="taskDescription"
                    value={newTask.description || ''}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                    className="form-control"
                    rows={3}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="taskPriority">Priority:</label>
                    <select
                      id="taskPriority"
                      value={newTask.priority || 'MEDIUM'}
                      onChange={(e) => setNewTask({...newTask, priority: e.target.value as any})}
                      className="form-control"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="taskStatus">Status:</label>
                    <select
                      id="taskStatus"
                      value={newTask.status || 'PENDING'}
                      onChange={(e) => setNewTask({...newTask, status: e.target.value as any})}
                      className="form-control"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="taskCategory">Category:</label>
                    <select
                      id="taskCategory"
                      value={newTask.category || ''}
                      onChange={(e) => setNewTask({...newTask, category: e.target.value})}
                      className="form-control"
                    >
                      <option value="">Select Category</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="taskDueDate">Due Date:</label>
                    <input
                      type="date"
                      id="taskDueDate"
                      value={newTask.dueDate ? (typeof newTask.dueDate === 'string' ? newTask.dueDate.slice(0,10) : new Date(newTask.dueDate).toISOString().slice(0,10)) : ''}
                      onChange={(e) => setNewTask({...newTask, dueDate: e.target.value ? e.target.value : undefined})}
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="taskTags">Tags (comma-separated):</label>
                  <input
                    type="text"
                    id="taskTags"
                    value={Array.isArray(newTask.tags) ? newTask.tags.join(', ') : newTask.tags || ''}
                    onChange={(e) => {
                      const tagString = e.target.value;
                      const tagArray = tagString.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag);
                      setNewTask({...newTask, tags: tagArray});
                    }}
                    className="form-control"
                    placeholder="e.g., urgent, review, meeting"
                  />
                </div>

                {/* Contributors Section */}
                <div className="form-group">
                  <label>Contributors:</label>
                  {/* Debug info */}
                  <div className="debug-info" style={{
                    fontSize: '0.9em', 
                    color: '#0066cc', 
                    marginBottom: '10px',
                    padding: '8px',
                    background: '#f0f8ff',
                    border: '1px solid #0066cc',
                    borderRadius: '4px'
                  }}>
                    <strong>DEBUG:</strong> Available users: {availableActiveUsers.length} | Selected: {selectedContributors.length}
                    {availableActiveUsers.length === 0 && (
                      <div style={{color: '#cc0000', marginTop: '5px'}}>
                        ⚠️ No users loaded! Check console for API errors.
                      </div>
                    )}
                  </div>
                  <div className="contributors-section">
                    <div className="add-contributor">
                      <select
                        value={selectedContributorId}
                        onChange={(e) => setSelectedContributorId(e.target.value)}
                        className="form-control"
                      >
                        <option value="">Select a contributor</option>
                        {availableActiveUsers
                          .filter(user => !isUserAlreadySelected(user.id!))
                          .map(user => (
                            <option key={user.id} value={user.id}>
                              {user.username} {user.email ? `(${user.email})` : ''}
                            </option>
                          ))}
                      </select>
                      <button type="button" className="btn btn-sm" onClick={addContributor}>
                        Add
                      </button>
                    </div>
                    
                    <div className="selected-contributors">
                      {selectedContributors.length === 0 ? (
                        <div className="no-contributors" style={{color: '#999', fontStyle: 'italic'}}>
                          No contributors added yet
                        </div>
                      ) : (
                        selectedContributors.map((contributor, index) => (
                          <div key={contributor.id} className="contributor-item">
                            <span>{contributor.username} {contributor.email ? `(${contributor.email})` : ''}</span>
                            <button type="button" className="btn-remove" onClick={() => removeContributor(index)}>
                              ×
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeTaskModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Saving...' : (editingTask ? 'Update Task' : 'Create Task')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="modal-overlay" onClick={closeUserModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUser ? 'Edit User' : 'Create New User'}</h2>
              <button className="modal-close" onClick={closeUserModal}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); saveUser(); }}>
                <div className="form-group">
                  <label htmlFor="userUsername">Username*:</label>
                  <input
                    type="text"
                    id="userUsername"
                    value={newUser.username || ''}
                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                    className={`form-control ${userValidationErrors.username ? 'error' : ''}`}
                    required
                  />
                  {userValidationErrors.username && (
                    <div className="validation-errors">
                      {userValidationErrors.username.map((error, index) => (
                        <div key={index} className="error-message">{error}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="userEmail">Email:</label>
                  <input
                    type="email"
                    id="userEmail"
                    value={newUser.email || ''}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className={`form-control ${userValidationErrors.email ? 'error' : ''}`}
                  />
                  {userValidationErrors.email && (
                    <div className="validation-errors">
                      {userValidationErrors.email.map((error, index) => (
                        <div key={index} className="error-message">{error}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="userPassword">Password{editingUser ? ' (leave blank to keep current)' : '*'}:</label>
                  <input
                    type="password"
                    id="userPassword"
                    value={newUser.password || ''}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    className={`form-control ${userValidationErrors.password ? 'error' : ''}`}
                    required={!editingUser}
                  />
                  {userValidationErrors.password && (
                    <div className="validation-errors">
                      {userValidationErrors.password.map((error, index) => (
                        <div key={index} className="error-message">{error}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="userRole">Role:</label>
                    <select
                      id="userRole"
                      value={newUser.role || 'USER'}
                      onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                      className="form-control"
                    >
                      <option value="USER">User</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="userStatus">Status:</label>
                    <select
                      id="userStatus"
                      value={newUser.isActive ? 'true' : 'false'}
                      onChange={(e) => setNewUser({...newUser, isActive: e.target.value === 'true'})}
                      className="form-control"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeUserModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && <div className="message error">{error}</div>}
      {successMessage && <div className="message success">{successMessage}</div>}
    </div>
  );
};

export default App;
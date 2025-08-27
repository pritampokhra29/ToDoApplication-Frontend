import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Task, User, TaskFilter, DashboardStats, RegisterRequest } from './api.service';
import { ValidationService, FieldValidationResult } from './validation.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app-enhanced.html',
  styleUrls: ['./app-enhanced.scss']
})
export class AppComponent implements OnInit {
  protected readonly title = signal('Enhanced ToDoList');
  
  // Authentication
  isLoggedIn = false;
  isAdmin = false;
  currentUser: User | null = null;
  loginData = { username: '', password: '' };
  
  // Navigation
  currentView: 'tasks' | 'admin' | 'dashboard' = 'tasks';
  
  // Tasks
  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  selectedTasks: number[] = [];
  
  // Task form
  newTask: Partial<Task> = {
    title: '',
    description: '',
    status: 'PENDING',
    priority: 'MEDIUM',
    category: '',
    tags: [],
    dueDate: undefined
  };
  editingTask: Task | null = null;
  
  // Advanced filtering
  filters: TaskFilter = {
    status: 'ALL',
    priority: 'ALL',
    category: '',
    keyword: ''
  };
  
  // Categories and users
  categories: string[] = ['Work', 'Personal', 'Shopping', 'Health', 'Education'];
  users: User[] = [];
  availableUsers: User[] = [];
  
  // Contributors for tasks
  availableActiveUsers: User[] = [];
  selectedContributors: User[] = [];
  selectedContributorId: number | string = '';
  pendingCollaboratorIds: number[] = []; // Store collaborator IDs when editing task
  
  // Admin features
  showUserModal = false;
  newUser: RegisterRequest = {
    username: '',
    password: '',
    email: '',
    role: 'USER',
    firstName: '',
    lastName: '',
    isActive: true
  };
  editingUser: User | null = null;
  
  // Dashboard
  dashboardStats: DashboardStats | null = null;
  
  // UI state
  showTaskModal = false;
  loading = false;
  error = '';
  successMessage = '';
  showAdvancedFilters = false;

  // Validation
  loginValidationErrors: FieldValidationResult = {};
  userValidationErrors: FieldValidationResult = {};
  taskValidationErrors: FieldValidationResult = {};
  showValidationErrors = false;

  constructor(private apiService: ApiService, private validationService: ValidationService) {}

  ngOnInit() {
    console.log('Component initialized');
    console.log('API Base URL:', this.apiService.getBaseUrl());
    
    // Test API connectivity to debug 500 error
    this.testApiConnectivity();
    
    // Add a small delay to ensure browser environment is ready
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.checkAuthStatus();
        console.log('After checkAuthStatus - isLoggedIn:', this.isLoggedIn, 'isAdmin:', this.isAdmin, 'currentUser:', this.currentUser);
        if (this.isLoggedIn) {
          this.loadInitialData();
        }
      }, 100);
    }
  }

  // ==================== AUTHENTICATION ====================
  
  checkAuthStatus() {
    // Check if we're in browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      console.log('Not in browser environment');
      return;
    }
    
    const token = localStorage.getItem('jwt_token');
    const userData = localStorage.getItem('user_data');
    
    console.log('Token:', token ? 'exists' : 'not found');
    console.log('User data:', userData);
    
    if (token && userData) {
      this.isLoggedIn = true;
      this.currentUser = JSON.parse(userData);
      this.isAdmin = this.currentUser?.role === 'ADMIN';
      console.log('User logged in:', this.currentUser);
      console.log('Is admin:', this.isAdmin);
      
      // Load admin data if user is admin
      if (this.isAdmin) {
        console.log('Loading admin data...');
        this.loadUsers();
        this.loadUsersForAssignment();
      }
    }
  }

  login() {
    // Validate login form
    this.loginValidationErrors = this.validationService.validateLoginForm(
      this.loginData.username, 
      this.loginData.password
    );
    
    if (this.validationService.hasValidationErrors(this.loginValidationErrors)) {
      this.showValidationErrors = true;
      this.showError('Please fix the validation errors before submitting.');
      return;
    }
    
    this.showValidationErrors = false;
    this.loading = true;
    this.error = '';
    
    console.log('Attempting login with:', this.loginData.username);
    
    this.apiService.login(this.loginData).subscribe({
      next: (response) => {
        console.log('Login response:', response);
        
        if (response && (response.accessToken || response.token)) {
          const token = response.accessToken || response.token;
          
          // Check if we're in browser environment
          if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            localStorage.setItem('jwt_token', token!);
            
            // Automatically set admin role for 'admin' user or if role is ADMIN
            const isAdminUser = this.loginData.username.toLowerCase() === 'admin' || 
                               response.role === 'ADMIN' || 
                               response.user?.role === 'ADMIN';
            
            const userData: User = {
              username: response.username || this.loginData.username,
              role: isAdminUser ? 'ADMIN' : 'USER',
              email: response.user?.email
            };
            
            localStorage.setItem('user_data', JSON.stringify(userData));
            console.log('Stored user data:', userData);
          }
          
          this.isLoggedIn = true;
          this.currentUser = {
            username: response.username || this.loginData.username,
            role: (this.loginData.username.toLowerCase() === 'admin' || 
                   response.role === 'ADMIN' || 
                   response.user?.role === 'ADMIN') ? 'ADMIN' : 'USER',
            email: response.user?.email
          };
          this.isAdmin = this.currentUser.role === 'ADMIN';
          
          console.log('Login successful - User:', this.currentUser, 'Is Admin:', this.isAdmin);
          
          this.loadInitialData();
          this.showSuccess('Login successful!');
        } else {
          console.error('Invalid login response - no token found:', response);
          this.showError('Login failed - no token received');
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Login error:', error);
        this.showError('Login failed. Please check your credentials.');
        this.loading = false;
      }
    });
  }

  logout() {
    this.apiService.logout();
    this.clearSession();
    this.showSuccess('Logged out successfully');
  }

  private clearSession() {
    // Check if we're in browser environment
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user_data');
    }
    
    this.isLoggedIn = false;
    this.isAdmin = false;
    this.currentUser = null;
    this.tasks = [];
    this.resetForms();
    this.currentView = 'tasks';
  }

  // ==================== NAVIGATION ====================
  
  setView(view: 'tasks' | 'admin' | 'dashboard') {
    this.currentView = view;
    if (view === 'dashboard' && !this.dashboardStats) {
      this.loadDashboardStats();
    }
  }

  // ==================== DATA LOADING ====================
  
  loadInitialData() {
    this.loadTasks();
    this.loadCategories();
    if (this.isAdmin) {
      this.loadUsers();
    }
    this.loadUsersForAssignment();
  }

  loadTasks() {
    this.loading = true;
    this.apiService.getTasks().subscribe({
      next: (tasks) => {
        // Normalize task data to handle different API response formats
        this.tasks = tasks.map(task => this.normalizeTaskData(task));
        console.log('DEBUG - Loaded and normalized tasks:', this.tasks);
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        this.showError('Failed to load tasks');
        this.loading = false;
      }
    });
  }

  loadCategories() {
    // TODO: Backend categories endpoint not implemented yet
    // this.apiService.getCategories().subscribe({
    //   next: (categories) => {
    //     this.categories = [...new Set([...this.categories, ...categories])];
    //   },
    //   error: (error) => {
    //     console.error('Error loading categories:', error);
    //   }
    // });
    
    // For now, categories will be populated from tasks as they are created/loaded
    console.log('Categories will be extracted from existing tasks');
  }

  loadUsers() {
    console.log('Loading users...');
    this.apiService.getAllUsers().subscribe({
      next: (users) => {
        console.log('Users loaded successfully:', users);
        this.users = users;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.showError('Failed to load users: ' + (error.error?.message || error.message || 'Unknown error'));
      }
    });
  }

  loadUsersForAssignment() {
    this.apiService.getUsersForAssignment().subscribe({
      next: (users) => {
        this.availableUsers = users;
      },
      error: (error) => {
        console.error('Error loading assignable users:', error);
      }
    });
  }

  loadActiveUsers() {
    console.log('Loading active users for contributors...');
    this.apiService.getActiveUsers().subscribe({
      next: (users) => {
        console.log('Active users loaded successfully:', users);
        console.log('Number of active users loaded:', users.length);
        this.availableActiveUsers = users;
        console.log('availableActiveUsers array after assignment:', this.availableActiveUsers);
        
        // Convert pending collaborator IDs to User objects if we have any
        if (this.pendingCollaboratorIds.length > 0) {
          this.selectedContributors = this.convertUserIdsToUsers(this.pendingCollaboratorIds);
          console.log('DEBUG - Converted pending collaborator IDs to users:', this.pendingCollaboratorIds, '->', this.selectedContributors);
          this.pendingCollaboratorIds = []; // Clear pending IDs
        }
      },
      error: (error) => {
        console.error('Error loading active users:', error);
        this.showError('Failed to load active users: ' + (error.error?.message || error.message || 'Unknown error'));
      }
    });
  }

  loadDashboardStats() {
    console.log('Loading dashboard stats...');
    
    // TODO: Backend dashboard stats endpoint not implemented yet
    // First try to get stats from backend
    // this.apiService.getDashboardStats().subscribe({
    //   next: (stats) => {
    //     console.log('Dashboard stats loaded from backend:', stats);
    //     this.dashboardStats = stats;
    //   },
    //   error: (error) => {
    //     console.error('Error loading dashboard stats from backend:', error);
    //     console.log('Calculating dashboard stats from local task data...');
    //     
    //     // Fallback: Calculate stats from local task data
    //     this.calculateDashboardStatsFromTasks();
    //   }
    // });

    // For now, calculate stats from local task data
    console.log('Calculating dashboard stats from local task data...');
    this.calculateDashboardStatsFromTasks();
  }

  calculateDashboardStatsFromTasks() {
    if (!this.tasks || this.tasks.length === 0) {
      console.log('No tasks available for dashboard stats calculation');
      // Create empty stats if no tasks
      this.dashboardStats = {
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0,
        tasksCompletedToday: 0,
        tasksCompletedThisWeek: 0,
        tasksCompletedThisMonth: 0,
        totalUsers: this.users?.length || 0,
        activeUsers: this.users?.filter(u => u.isActive)?.length || 0,
        categoriesCount: this.categories?.length || 0,
        averageTaskCompletionTime: 0,
        tasksByCategory: {},
        tasksByPriority: {},
        recentActivity: []
      };
      return;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate basic stats
    const totalTasks = this.tasks.length;
    const completedTasks = this.tasks.filter(t => t.status === 'COMPLETED').length;
    const pendingTasks = this.tasks.filter(t => t.status === 'PENDING').length;
    const inProgressTasks = this.tasks.filter(t => t.status === 'IN_PROGRESS').length;
    
    // Calculate overdue tasks
    const overdueTasks = this.tasks.filter(t => {
      if (!t.dueDate || t.status === 'COMPLETED') return false;
      const dueDate = new Date(t.dueDate);
      return dueDate < now;
    }).length;

    // Calculate completion stats
    const tasksCompletedToday = this.tasks.filter(t => {
      if (t.status !== 'COMPLETED' || !t.updatedAt) return false;
      const updatedDate = new Date(t.updatedAt);
      return updatedDate >= today;
    }).length;

    const tasksCompletedThisWeek = this.tasks.filter(t => {
      if (t.status !== 'COMPLETED' || !t.updatedAt) return false;
      const updatedDate = new Date(t.updatedAt);
      return updatedDate >= weekAgo;
    }).length;

    const tasksCompletedThisMonth = this.tasks.filter(t => {
      if (t.status !== 'COMPLETED' || !t.updatedAt) return false;
      const updatedDate = new Date(t.updatedAt);
      return updatedDate >= monthAgo;
    }).length;

    // Calculate tasks by category
    const tasksByCategory: { [key: string]: number } = {};
    this.tasks.forEach(task => {
      const category = task.category || 'Uncategorized';
      tasksByCategory[category] = (tasksByCategory[category] || 0) + 1;
    });

    // Calculate tasks by priority
    const tasksByPriority: { [key: string]: number } = {};
    this.tasks.forEach(task => {
      const priority = task.priority || 'MEDIUM';
      tasksByPriority[priority] = (tasksByPriority[priority] || 0) + 1;
    });

    // Create dashboard stats object
    this.dashboardStats = {
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      overdueTasks,
      tasksCompletedToday,
      tasksCompletedThisWeek,
      tasksCompletedThisMonth,
      totalUsers: this.users?.length || 0,
      activeUsers: this.users?.filter(u => u.isActive)?.length || 0,
      categoriesCount: Object.keys(tasksByCategory).length,
      averageTaskCompletionTime: 0, // Would need completion time tracking
      tasksByCategory,
      tasksByPriority,
      recentActivity: this.tasks
        .filter(t => t.updatedAt)
        .sort((a, b) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime())
        .slice(0, 5)
        .map(t => ({
          taskTitle: t.title,
          status: t.status,
          updatedAt: t.updatedAt
        }))
    };

    console.log('Calculated dashboard stats from local data:', this.dashboardStats);
  }

  // ==================== TASK MANAGEMENT ====================

  openTaskModal(task?: Task) {
    console.log('DEBUG - Opening task modal');
    console.log('DEBUG - Editing task:', task);
    
    this.clearValidationErrors(); // Clear validation errors when opening modal
    
    if (task) {
      this.editingTask = { ...task };
      this.newTask = { ...task };
      
      // Handle collaborators - convert different response formats
      if (task.collaborators && Array.isArray(task.collaborators)) {
        // New API format: TaskResponse with full User objects
        this.selectedContributors = task.collaborators.filter(user => 
          // Filter out the owner from collaborators list for editing UI
          task.owner && user.id !== task.owner.id
        );
        console.log('DEBUG - Loaded full collaborators from TaskResponse:', this.selectedContributors);
      } else if (task.collaboratorUserIds && Array.isArray(task.collaboratorUserIds)) {
        // Legacy format: user IDs only
        this.pendingCollaboratorIds = task.collaboratorUserIds;
        this.selectedContributors = [];
        console.log('DEBUG - Stored pending collaborator IDs:', this.pendingCollaboratorIds);
      } else {
        this.selectedContributors = [];
        console.log('DEBUG - No collaborators found in task');
      }
    } else {
      this.resetTaskForm();
      this.selectedContributors = [];
      console.log('DEBUG - Reset contributors for new task');
    }
    
    // Load active users for contributors
    console.log('DEBUG - Loading active users...');
    this.loadActiveUsers();
    
    this.showTaskModal = true;
    console.log('DEBUG - Task modal opened, showTaskModal:', this.showTaskModal);
  }

  closeTaskModal() {
    this.showTaskModal = false;
    this.editingTask = null;
    this.selectedContributors = [];
    this.selectedContributorId = '';
    this.pendingCollaboratorIds = []; // Clear pending collaborator IDs
    this.resetTaskForm();
  }

  saveTask() {
    // Validate task form
    this.taskValidationErrors = this.validationService.validateTaskForm({
      title: this.newTask.title || '',
      description: this.newTask.description || '',
      dueDate: this.newTask.dueDate,
      status: this.newTask.status || 'PENDING',
      category: this.newTask.category || '',
      priority: this.newTask.priority || 'MEDIUM',
      collaborators: this.selectedContributors
    });
    
    if (this.validationService.hasValidationErrors(this.taskValidationErrors)) {
      this.showValidationErrors = true;
      this.showError('Please fix the validation errors before submitting.');
      return;
    }
    
    this.showValidationErrors = false;
    this.loading = true;
    
    // Parse tags if they're a string
    if (typeof this.newTask.tags === 'string') {
      this.newTask.tags = (this.newTask.tags as string).split(',').map(tag => tag.trim()).filter(tag => tag);
    }

    // Debug logging for collaborators
    console.log('DEBUG - Selected Contributors before saving:', this.selectedContributors);
    console.log('DEBUG - Selected Contributors length:', this.selectedContributors.length);

    // Convert collaborators to the format expected by backend (just IDs)
    const collaboratorIds = this.selectedContributors.map(user => user.id).filter(id => id !== undefined);
    console.log('DEBUG - Collaborator IDs:', collaboratorIds);

    const taskData = {
      ...this.newTask,
      status: this.newTask.status || 'PENDING',
      priority: this.newTask.priority || 'MEDIUM',
      collaboratorUserIds: collaboratorIds // Send as collaboratorUserIds instead of collaborators
    };

    console.log('DEBUG - Task data being sent:', taskData);
    console.log('DEBUG - Task data collaboratorUserIds:', taskData.collaboratorUserIds);

    if (this.editingTask) {
      this.apiService.updateTask({ ...taskData, id: this.editingTask.id } as Task).subscribe({
        next: (updatedTask) => {
          // Normalize the updated task response
          const normalizedTask = this.normalizeTaskData(updatedTask);
          const index = this.tasks.findIndex(t => t.id === normalizedTask.id);
          if (index !== -1) {
            this.tasks[index] = normalizedTask;
            this.applyFilters();
          }
          console.log('DEBUG - Updated task response:', updatedTask);
          console.log('DEBUG - Normalized updated task:', normalizedTask);
          this.closeTaskModal();
          this.showSuccess('Task updated successfully');
          this.loading = false;
          
          // Refresh dashboard stats if on dashboard view
          if (this.currentView === 'dashboard') {
            this.calculateDashboardStatsFromTasks();
          }
        },
        error: (error) => {
          this.showError('Failed to update task');
          this.loading = false;
        }
      });
    } else {
      this.apiService.createTask(taskData as Task).subscribe({
        next: (task) => {
          // Normalize the task response
          const normalizedTask = this.normalizeTaskData(task);
          this.tasks.unshift(normalizedTask);
          console.log('DEBUG - Created task response:', task);
          console.log('DEBUG - Normalized task:', normalizedTask);
          this.applyFilters();
          this.closeTaskModal();
          this.showSuccess('Task created successfully');
          this.loading = false;
          
          // Refresh dashboard stats if on dashboard view
          if (this.currentView === 'dashboard') {
            this.calculateDashboardStatsFromTasks();
          }
        },
        error: (error) => {
          this.showError('Failed to create task');
          this.loading = false;
        }
      });
    }
  }

  deleteTask(taskId: number) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    this.apiService.deleteTask(taskId).subscribe({
      next: () => {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        this.applyFilters();
        this.showSuccess('Task deleted successfully');
        
        // Refresh dashboard stats if on dashboard view
        if (this.currentView === 'dashboard') {
          this.calculateDashboardStatsFromTasks();
        }
      },
      error: (error) => {
        this.showError('Failed to delete task');
      }
    });
  }

  updateTaskStatus(task: Task, newStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED') {
    const updatedTask = { ...task, status: newStatus };
    if (newStatus === 'COMPLETED') {
      updatedTask.completionDate = new Date().toISOString();
    }

    this.apiService.updateTask(updatedTask).subscribe({
      next: (updated) => {
        const index = this.tasks.findIndex(t => t.id === updated.id);
        if (index !== -1) {
          this.tasks[index] = updated;
          this.applyFilters();
        }
        this.showSuccess(`Task marked as ${newStatus.toLowerCase().replace('_', ' ')}`);
      },
      error: (error) => {
        this.showError('Failed to update task status');
      }
    });
  }

  // ==================== TASK ASSIGNMENT & COLLABORATION ====================

  assignTask(taskId: number, userId: number) {
    this.apiService.assignTask(taskId, userId).subscribe({
      next: (updatedTask) => {
        const index = this.tasks.findIndex(t => t.id === updatedTask.id);
        if (index !== -1) {
          this.tasks[index] = updatedTask;
          this.applyFilters();
        }
        this.showSuccess('Task assigned successfully');
      },
      error: (error) => {
        this.showError('Failed to assign task');
      }
    });
  }

  addCollaborator(taskId: number, userId: number) {
    this.apiService.addCollaborator(taskId, userId).subscribe({
      next: (updatedTask) => {
        const index = this.tasks.findIndex(t => t.id === updatedTask.id);
        if (index !== -1) {
          this.tasks[index] = updatedTask;
          this.applyFilters();
        }
        this.showSuccess('Collaborator added successfully');
      },
      error: (error) => {
        this.showError('Failed to add collaborator');
      }
    });
  }

  // ==================== FILTERING & SEARCH ====================

  applyFilters() {
    let filtered = [...this.tasks];

    // Keyword search
    if (this.filters.keyword) {
      const keyword = this.filters.keyword.toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(keyword) ||
        task.description?.toLowerCase().includes(keyword) ||
        task.category?.toLowerCase().includes(keyword)
      );
    }

    // Status filter
    if (this.filters.status && this.filters.status !== 'ALL') {
      filtered = filtered.filter(task => task.status === this.filters.status);
    }

    // Priority filter
    if (this.filters.priority && this.filters.priority !== 'ALL') {
      filtered = filtered.filter(task => task.priority === this.filters.priority);
    }

    // Category filter
    if (this.filters.category) {
      filtered = filtered.filter(task => task.category === this.filters.category);
    }

    // Date filters
    if (this.filters.dueDateFrom) {
      filtered = filtered.filter(task => 
        task.dueDate && new Date(task.dueDate) >= this.filters.dueDateFrom!
      );
    }

    if (this.filters.dueDateTo) {
      filtered = filtered.filter(task => 
        task.dueDate && new Date(task.dueDate) <= this.filters.dueDateTo!
      );
    }

    this.filteredTasks = filtered;
  }

  clearFilters() {
    this.filters = {
      status: 'ALL',
      priority: 'ALL',
      category: '',
      keyword: ''
    };
    this.applyFilters();
  }

  // ==================== BULK OPERATIONS ====================

  toggleTaskSelection(taskId: number) {
    const index = this.selectedTasks.indexOf(taskId);
    if (index > -1) {
      this.selectedTasks.splice(index, 1);
    } else {
      this.selectedTasks.push(taskId);
    }
  }

  selectAllTasks() {
    this.selectedTasks = this.filteredTasks.map(task => task.id!);
  }

  clearSelection() {
    this.selectedTasks = [];
  }

  bulkUpdateStatus(status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED') {
    if (this.selectedTasks.length === 0) {
      this.showError('Please select tasks to update');
      return;
    }

    const updates: Partial<Task> = { status };
    if (status === 'COMPLETED') {
      updates.completionDate = new Date().toISOString();
    }

    this.apiService.bulkUpdateTasks(this.selectedTasks, updates).subscribe({
      next: (updatedTasks) => {
        updatedTasks.forEach(updatedTask => {
          const index = this.tasks.findIndex(t => t.id === updatedTask.id);
          if (index !== -1) {
            this.tasks[index] = updatedTask;
          }
        });
        this.applyFilters();
        this.clearSelection();
        this.showSuccess(`${updatedTasks.length} tasks updated successfully`);
      },
      error: (error) => {
        this.showError('Failed to update tasks');
      }
    });
  }

  // ==================== USER MANAGEMENT (ADMIN) ====================

  openUserModal(user?: User) {
    this.clearValidationErrors(); // Clear validation errors when opening modal
    
    console.log('Opening user modal. User parameter:', user);
    if (user) {
      console.log('Editing existing user:', user.username);
      this.editingUser = { ...user };
      this.newUser = {
        username: user.username,
        password: '',
        email: user.email || '',
        role: user.role || 'USER',
        firstName: '',
        lastName: '',
        isActive: user.isActive !== undefined ? user.isActive : true
      };
      console.log('Set newUser for editing. isActive:', this.newUser.isActive);
    } else {
      console.log('Creating new user - calling resetUserForm()');
      this.resetUserForm();
    }
    this.showUserModal = true;
    console.log('Modal opened. Final newUser state:', this.newUser);
  }

  closeUserModal() {
    this.showUserModal = false;
    this.editingUser = null;
    this.resetUserForm();
  }

  saveUser() {
    // Validate user form
    if (this.editingUser) {
      this.userValidationErrors = this.validationService.validateUserUpdateForm({
        id: this.editingUser.id!,
        username: this.newUser.username,
        email: this.newUser.email,
        password: this.newUser.password,
        role: this.newUser.role,
        firstName: this.newUser.firstName,
        lastName: this.newUser.lastName
      });
    } else {
      this.userValidationErrors = this.validationService.validateRegistrationForm({
        username: this.newUser.username || '',
        email: this.newUser.email || '',
        password: this.newUser.password || '',
        role: this.newUser.role,
        firstName: this.newUser.firstName,
        lastName: this.newUser.lastName
      });
    }
    
    if (this.validationService.hasValidationErrors(this.userValidationErrors)) {
      this.showValidationErrors = true;
      this.showError('Please fix the validation errors before submitting.');
      return;
    }
    
    this.showValidationErrors = false;
    console.log('Attempting to save user:', this.newUser);
    this.loading = true;

    if (this.editingUser) {
      const updateData: Partial<User> = {
        username: this.newUser.username,
        email: this.newUser.email,
        role: this.newUser.role
      };

      console.log('Updating user with data:', updateData);
      this.apiService.updateUser(this.editingUser.id!, updateData).subscribe({
        next: (updatedUser) => {
          console.log('User updated successfully:', updatedUser);
          const index = this.users.findIndex(u => u.id === updatedUser.id);
          if (index !== -1) {
            this.users[index] = updatedUser;
          }
          this.closeUserModal();
          this.showSuccess('User updated successfully');
          this.loading = false;
        },
        error: (error) => {
          console.error('Error updating user:', error);
          this.showError('Failed to update user: ' + (error.error?.message || error.message || 'Unknown error'));
          this.loading = false;
        }
      });
    } else {
      console.log('Creating new user with data:', this.newUser);
      console.log('newUser.isActive type:', typeof this.newUser.isActive);
      console.log('newUser.isActive value:', this.newUser.isActive);
      console.log('Full newUser object:', JSON.stringify(this.newUser, null, 2));
      
      this.apiService.registerUser(this.newUser).subscribe({
        next: (user) => {
          console.log('User created successfully:', user);
          // Refresh the user list to get updated data from backend
          this.loadUsers();
          this.closeUserModal();
          this.showSuccess('User created successfully');
          this.loading = false;
        },
        error: (error) => {
          console.error('Error creating user:', error);
          const errorMessage = error.error?.message || error.message || 'Unknown error';
          console.error('Detailed error:', error);
          this.showError('Failed to create user: ' + errorMessage);
          this.loading = false;
        }
      });
    }
  }

  deleteUser(userId: number) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    this.apiService.deleteUser(userId).subscribe({
      next: () => {
        this.users = this.users.filter(u => u.id !== userId);
        this.showSuccess('User deleted successfully');
      },
      error: (error) => {
        this.showError('Failed to delete user');
      }
    });
  }

  toggleUserStatus(user: any) {
    const currentStatus = user.isActive;
    const action = currentStatus ? 'deactivate' : 'activate';
    const confirmMessage = `Are you sure you want to ${action} user "${user.username}"?`;
    
    if (!confirm(confirmMessage)) return;

    const newStatus = !currentStatus;
    console.log('Component: Toggling user status:', user.username);
    console.log('Component: Current status (isActive):', currentStatus);
    console.log('Component: Target status (isActive):', newStatus);
    
    this.apiService.toggleUserStatus(user.id, newStatus).subscribe({
      next: (updatedUser) => {
        console.log('Component: Received updated user from API:', updatedUser);
        console.log('Component: Updated user isActive:', updatedUser.isActive);
        
        // Update the user in the local array with proper change detection
        const userIndex = this.users.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
          // Create a new array to trigger change detection
          // Ensure we're using the correct status from the response
          const finalStatus = updatedUser.isActive !== undefined ? updatedUser.isActive : newStatus;
          
          this.users = this.users.map((u, index) => 
            index === userIndex 
              ? { ...u, isActive: finalStatus }
              : u
          );
          
          console.log('Component: Updated user in array:', this.users[userIndex]);
          console.log('Component: Updated users array length:', this.users.length);
        }
        
        // Also update active users list if it exists
        if (this.availableActiveUsers && this.availableActiveUsers.length > 0) {
          this.loadActiveUsers(); // Reload to ensure consistency
        }
        
        // Use the final status for the success message
        const finalStatus = updatedUser.isActive !== undefined ? updatedUser.isActive : newStatus;
        const statusText = finalStatus ? 'activated' : 'deactivated';
        this.showSuccess(`User ${statusText} successfully`);
        console.log('Component: User status update completed. Final status:', finalStatus);
      },
      error: (error) => {
        console.error('Component: Error updating user status:', error);
        this.showError(`Failed to ${action} user: ` + (error.error?.message || error.message || 'Unknown error'));
      }
    });
  }

  // ==================== UTILITY METHODS ====================

  // Temporary method to force admin role for testing
  forceAdminRole() {
    if (this.currentUser) {
      this.currentUser.role = 'ADMIN';
      this.isAdmin = true;
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem('user_data', JSON.stringify(this.currentUser));
      }
      console.log('Forced admin role:', this.currentUser);
    }
  }

  // ==================== CONTRIBUTOR MANAGEMENT METHODS ====================

  addContributor() {
    console.log('DEBUG - addContributor called with selectedContributorId:', this.selectedContributorId);
    
    if (!this.selectedContributorId) return;
    
    const userId = typeof this.selectedContributorId === 'string' ? 
                   parseInt(this.selectedContributorId) : 
                   this.selectedContributorId;
    
    console.log('DEBUG - Parsed userId:', userId);
    console.log('DEBUG - Current user:', this.currentUser);
    console.log('DEBUG - Available active users:', this.availableActiveUsers);
    
    // Prevent adding current user as collaborator
    if (this.currentUser && userId === this.currentUser.id) {
      this.showError('You cannot add yourself as a collaborator');
      this.selectedContributorId = '';
      return;
    }
    
    const user = this.availableActiveUsers.find(u => u.id === userId);
    console.log('DEBUG - Found user:', user);
    
    if (user && !this.isUserAlreadySelected(userId)) {
      this.selectedContributors.push(user);
      console.log('Added contributor:', user.username);
      console.log('Current contributors:', this.selectedContributors);
      
      // Validate contributors after adding
      this.validateFieldOnBlur('collaborators', this.selectedContributors, 'task');
    } else if (this.isUserAlreadySelected(userId)) {
      this.showError('This user is already added as a collaborator');
    } else if (!user) {
      console.log('DEBUG - User not found in availableActiveUsers');
      this.showError('Selected user not found');
    }
    
    this.selectedContributorId = '';
  }

  removeContributor(index: number) {
    if (index >= 0 && index < this.selectedContributors.length) {
      const removedUser = this.selectedContributors.splice(index, 1)[0];
      console.log('Removed contributor:', removedUser.username);
      console.log('Current contributors:', this.selectedContributors);
      
      // Validate contributors after removing
      this.validateFieldOnBlur('collaborators', this.selectedContributors, 'task');
    }
  }

  isUserAlreadySelected(userId: number): boolean {
    return this.selectedContributors.some(user => user.id === userId);
  }

  convertUserIdsToUsers(userIds: number[]): User[] {
    if (!userIds || !Array.isArray(userIds)) {
      return [];
    }
    
    // Convert user IDs to User objects by finding them in availableActiveUsers
    const users: User[] = [];
    for (const id of userIds) {
      const user = this.availableActiveUsers.find(u => u.id === id);
      if (user) {
        users.push(user);
      } else {
        console.warn(`User with ID ${id} not found in availableActiveUsers`);
      }
    }
    
    console.log('DEBUG - convertUserIdsToUsers:', userIds, '->', users);
    return users;
  }

  // Helper method to get task owner (handles both user and owner fields)
  getTaskOwner(task: Task): User | undefined {
    return task.owner || task.user;
  }

  // Helper method to normalize task data from different API response formats
  normalizeTaskData(task: Task): Task {
    const normalized = { ...task };
    
    // Map legacy user field to owner if needed
    if (task.user && !task.owner) {
      normalized.owner = task.user;
    }
    
    // Ensure we have proper date field mapping
    if (task.createDate && !task.createdAt) {
      normalized.createdAt = task.createDate;
    }
    if (task.updateDate && !task.updatedAt) {
      normalized.updatedAt = task.updateDate;
    }
    
    return normalized;
  }

  // Debug method to test API connectivity
  testApiConnectivity() {
    console.log('=== API CONNECTIVITY TEST ===');
    console.log('Testing connection to:', this.apiService.getBaseUrl());
    
    // Only run in browser environment
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      // Test if backend is running - try to access a simple endpoint
      fetch(this.apiService.getBaseUrl() + '/tasks', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt_token') || 'no-token'}`
        }
      })
      .then(response => {
        console.log('Raw fetch response status:', response.status);
        console.log('Raw fetch response headers:', Object.fromEntries(response.headers.entries()));
        return response.text();
      })
      .then(text => {
        console.log('Raw fetch response body:', text);
      })
      .catch(error => {
        console.error('Raw fetch error:', error);
      });
    } else {
      console.log('Skipping connectivity test - not in browser environment');
    }
  }

  // ==================== FORM RESET METHODS ====================

  resetTaskForm() {
    this.newTask = {
      title: '',
      description: '',
      status: 'PENDING',
      priority: 'MEDIUM',
      category: '',
      tags: [],
      dueDate: undefined
    };
  }

  onStatusChange(value: any) {
    console.log('Status dropdown changed. Raw value:', value);
    console.log('Status dropdown changed. Type:', typeof value);
    this.newUser.isActive = value === true || value === 'true';
    console.log('Status dropdown changed. Final newUser.isActive:', this.newUser.isActive);
  }

  resetUserForm() {
    console.log('Resetting user form...');
    this.newUser = {
      username: '',
      password: '',
      email: '',
      role: 'USER',
      firstName: '',
      lastName: '',
      isActive: true
    };
    console.log('Form reset completed. newUser.isActive:', this.newUser.isActive);
    console.log('Form reset completed. typeof newUser.isActive:', typeof this.newUser.isActive);
  }

  showError(message: string) {
    this.error = message;
    this.successMessage = '';
    setTimeout(() => this.error = '', 5000);
  }

  showSuccess(message: string) {
    this.successMessage = message;
    this.error = '';
    setTimeout(() => this.successMessage = '', 3000);
  }

  formatDate(date: Date | string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  }

  formatDateTime(date: Date | string): string {
    if (!date) return '';
    return new Date(date).toLocaleString();
  }

  isOverdue(dueDate: Date | string): boolean {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'HIGH': return 'priority-high';
      case 'MEDIUM': return 'priority-medium';
      case 'LOW': return 'priority-low';
      default: return '';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'status-completed';
      case 'IN_PROGRESS': return 'status-in-progress';
      case 'PENDING': return 'status-pending';
      default: return '';
    }
  }

  trackByTaskId(index: number, task: Task): number {
    return task.id || index;
  }

  // ==================== VALIDATION HELPERS ====================

  validateFieldOnBlur(fieldName: string, value: any, context: 'login' | 'register' | 'userUpdate' | 'task' = 'register') {
    const errors = this.validationService.validateField(fieldName, value, context);
    
    // Update the appropriate validation errors object
    if (context === 'login') {
      if (errors.length > 0) {
        this.loginValidationErrors[fieldName] = errors;
      } else {
        delete this.loginValidationErrors[fieldName];
      }
    } else if (context === 'task') {
      if (errors.length > 0) {
        this.taskValidationErrors[fieldName] = errors;
      } else {
        delete this.taskValidationErrors[fieldName];
      }
    } else {
      if (errors.length > 0) {
        this.userValidationErrors[fieldName] = errors;
      } else {
        delete this.userValidationErrors[fieldName];
      }
    }
  }

  getFieldErrors(fieldName: string, context: 'login' | 'user' | 'task' = 'user'): string[] {
    switch (context) {
      case 'login':
        return this.loginValidationErrors[fieldName] || [];
      case 'task':
        return this.taskValidationErrors[fieldName] || [];
      case 'user':
      default:
        return this.userValidationErrors[fieldName] || [];
    }
  }

  hasFieldError(fieldName: string, context: 'login' | 'user' | 'task' = 'user'): boolean {
    return this.getFieldErrors(fieldName, context).length > 0;
  }

  clearValidationErrors() {
    this.loginValidationErrors = {};
    this.userValidationErrors = {};
    this.taskValidationErrors = {};
    this.showValidationErrors = false;
  }

  // Called when forms are reset
  resetForms() {
    this.newTask = {
      title: '',
      description: '',
      priority: 'MEDIUM',
      category: '',
      tags: [],
      dueDate: undefined
    };
    
    this.newUser = {
      username: '',
      password: '',
      email: '',
      role: 'USER',
      firstName: '',
      lastName: '',
      isActive: true
    };
    
    this.clearValidationErrors();
  }
}

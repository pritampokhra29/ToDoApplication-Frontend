import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Task, User, TaskFilter, DashboardStats, RegisterRequest } from './api.service';

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
  loginData = { username: 'admin', password: 'admin123' };
  
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

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    console.log('Component initialized');
    
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
        this.tasks = tasks;
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
    this.apiService.getCategories().subscribe({
      next: (categories) => {
        this.categories = [...new Set([...this.categories, ...categories])];
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
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
        this.availableActiveUsers = users;
      },
      error: (error) => {
        console.error('Error loading active users:', error);
        this.showError('Failed to load active users: ' + (error.error?.message || error.message || 'Unknown error'));
      }
    });
  }

  loadDashboardStats() {
    this.apiService.getDashboardStats().subscribe({
      next: (stats) => {
        this.dashboardStats = stats;
      },
      error: (error) => {
        console.error('Error loading dashboard stats:', error);
      }
    });
  }

  // ==================== TASK MANAGEMENT ====================

  openTaskModal(task?: Task) {
    if (task) {
      this.editingTask = { ...task };
      this.newTask = { ...task };
      this.selectedContributors = task.collaborators || [];
    } else {
      this.resetTaskForm();
      this.selectedContributors = [];
    }
    
    // Load active users for contributors
    this.loadActiveUsers();
    
    this.showTaskModal = true;
  }

  closeTaskModal() {
    this.showTaskModal = false;
    this.editingTask = null;
    this.selectedContributors = [];
    this.selectedContributorId = '';
    this.resetTaskForm();
  }

  saveTask() {
    if (!this.newTask.title?.trim()) {
      this.showError('Please enter a task title');
      return;
    }

    this.loading = true;
    
    // Parse tags if they're a string
    if (typeof this.newTask.tags === 'string') {
      this.newTask.tags = (this.newTask.tags as string).split(',').map(tag => tag.trim()).filter(tag => tag);
    }

    const taskData = {
      ...this.newTask,
      status: this.newTask.status || 'PENDING',
      priority: this.newTask.priority || 'MEDIUM',
      collaborators: this.selectedContributors
    };

    if (this.editingTask) {
      this.apiService.updateTask({ ...taskData, id: this.editingTask.id } as Task).subscribe({
        next: (updatedTask) => {
          const index = this.tasks.findIndex(t => t.id === updatedTask.id);
          if (index !== -1) {
            this.tasks[index] = updatedTask;
            this.applyFilters();
          }
          this.closeTaskModal();
          this.showSuccess('Task updated successfully');
          this.loading = false;
        },
        error: (error) => {
          this.showError('Failed to update task');
          this.loading = false;
        }
      });
    } else {
      this.apiService.createTask(taskData as Task).subscribe({
        next: (task) => {
          this.tasks.unshift(task);
          this.applyFilters();
          this.closeTaskModal();
          this.showSuccess('Task created successfully');
          this.loading = false;
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
    if (!this.newUser.username?.trim()) {
      this.showError('Please enter a username');
      return;
    }

    if (!this.editingUser && !this.newUser.password?.trim()) {
      this.showError('Please enter a password');
      return;
    }

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

  resetForms() {
    this.resetTaskForm();
    this.resetUserForm();
  }

  // ==================== CONTRIBUTOR MANAGEMENT METHODS ====================

  addContributor() {
    if (!this.selectedContributorId) return;
    
    const userId = typeof this.selectedContributorId === 'string' ? 
                   parseInt(this.selectedContributorId) : 
                   this.selectedContributorId;
    
    const user = this.availableActiveUsers.find(u => u.id === userId);
    
    if (user && !this.isUserAlreadySelected(userId)) {
      this.selectedContributors.push(user);
      console.log('Added contributor:', user.username);
      console.log('Current contributors:', this.selectedContributors);
    }
    
    this.selectedContributorId = '';
  }

  removeContributor(index: number) {
    if (index >= 0 && index < this.selectedContributors.length) {
      const removedUser = this.selectedContributors.splice(index, 1)[0];
      console.log('Removed contributor:', removedUser.username);
      console.log('Current contributors:', this.selectedContributors);
    }
  }

  isUserAlreadySelected(userId: number): boolean {
    return this.selectedContributors.some(user => user.id === userId);
  }

  // ==================== FORM RESET METHODS ====================

  resetTaskForm() {
    this.newTask = {
      title: '',
      description: '',
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
}

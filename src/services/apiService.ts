import axios, { AxiosResponse, AxiosError } from 'axios';

// ==================== INTERFACES ====================

export interface Task {
  id?: number;
  title: string;
  description?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  category?: string;
  tags?: string[];
  dueDate?: Date | string;
  completionDate?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  assignedTo?: User;
  collaborators?: User[];
  userId?: number;
}

// NEW: API Response Models (matching backend)
export interface TaskResponse {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  createDate: string;
  updateDate: string;
  deleted: boolean;
  completionDate: string | null;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  owner: UserDTO;
  collaborators: UserDTO[];
}

export interface UserDTO {
  id: number;
  username: string;
  email: string;
  role: 'ADMIN' | 'USER';
  isActive: boolean;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  dueDate?: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  category?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  collaboratorUserIds?: number[];
  collaboratorUsernames?: string[];
}

export interface UpdateTaskRequest {
  id: number;
  title: string;
  description?: string;
  dueDate?: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  category?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  collaboratorUserIds?: number[];
}

export interface User {
  id?: number;
  username: string;
  email?: string;
  role?: 'ADMIN' | 'USER';
  isActive?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken?: string;
  token?: string;
  refreshToken?: string;
  username?: string;
  role?: string;
  message?: string;
  user?: User;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
  role?: 'ADMIN' | 'USER';
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

export interface TaskRequest {
  id: number;
}

export interface TaskFilter {
  status?: 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  priority?: 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH';
  category?: string;
  assignedTo?: number;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  keyword?: string;
}

export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  tasksCompletedToday: number;
  tasksCompletedThisWeek: number;
  tasksCompletedThisMonth: number;
  totalUsers: number;
  activeUsers: number;
  categoriesCount: number;
  averageTaskCompletionTime: number;
  tasksByCategory: { [key: string]: number };
  tasksByPriority: { [key: string]: number };
  recentActivity: any[];
}

// ==================== API SERVICE CLASS ====================

class ApiService {
  private baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';
  private tasksUrl = `${this.baseUrl}/tasks`;
  private authUrl = `${this.baseUrl}/auth`;
  private static interceptorsSetup = false; // Prevent duplicate interceptors
  private pendingRequests = new Map<string, Promise<any>>(); // Request deduplication

  constructor() {
    // Log which environment and API URL is being used
    console.log('🚀 API Service initialized');
    console.log('📍 Environment:', process.env.REACT_APP_ENVIRONMENT || 'development');
    console.log('🌐 API URL:', this.baseUrl);
    
    // Set up axios interceptors only once
    if (!ApiService.interceptorsSetup) {
      this.setupInterceptors();
      ApiService.interceptorsSetup = true;
    }
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    axios.interceptors.request.use(
      (config) => {
        const token = this.getStoredToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('Adding Bearer token to request:', token.substring(0, 20) + '...');
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle errors
    axios.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.logout();
        }
        return Promise.reject(error);
      }
    );
  }

  // Get stored token from localStorage
  private getStoredToken(): string | null {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return localStorage.getItem('jwt_token');
    }
    return null;
  }

  // ==================== AUTHENTICATION METHODS ====================

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    console.log('Login attempt with URL:', `${this.authUrl}/login`);

    // Create a unique key for this login request
    const requestKey = `login-${credentials.username}`;
    
    // If the same request is already pending, return the existing promise
    if (this.pendingRequests.has(requestKey)) {
      console.log('Login request already pending, returning existing promise');
      return this.pendingRequests.get(requestKey)!;
    }

    const loginPromise = this.performLogin(credentials);
    this.pendingRequests.set(requestKey, loginPromise);

    try {
      const result = await loginPromise;
      this.pendingRequests.delete(requestKey);
      return result;
    } catch (error) {
      this.pendingRequests.delete(requestKey);
      throw error;
    }
  }

  private async performLogin(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      // Try simple POST request first
      const response: AxiosResponse<LoginResponse> = await axios.post(
        `${this.authUrl}/login`,
        credentials
      );

      console.log('Login response:', response.data);

      const token = response.data.accessToken || response.data.token;
      const username = response.data.username || response.data.user?.username || credentials.username;

      if (token) {
        localStorage.setItem('jwt_token', token);
        localStorage.setItem('username', username);
        console.log('JWT token stored:', token.substring(0, 20) + '...');
      } else {
        console.error('No token found in response:', response.data);
      }

      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw this.handleError(error as AxiosError);
    }
  }

  async register(userData: RegisterRequest): Promise<any> {
    try {
      const response = await axios.post(`${this.authUrl}/register`, userData);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  logout(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('username');
    }
  }

  isLoggedIn(): boolean {
    return !!this.getStoredToken();
  }

  getCurrentUsername(): string | null {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return localStorage.getItem('username');
    }
    return null;
  }

  // ==================== TASK MANAGEMENT METHODS ====================

  async getTasks(keyword?: string): Promise<TaskResponse[]> {
    try {
      let url = this.tasksUrl;
      if (keyword) {
        url += `?keyword=${encodeURIComponent(keyword)}`;
      }

      console.log('🔄 API: Fetching tasks from:', url);
      const response: AxiosResponse<TaskResponse[]> = await axios.get(url);
      console.log('✅ API: Tasks response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ API: Error fetching tasks:', error);
      throw this.handleError(error as AxiosError);
    }
  }

  async getTask(id: number): Promise<TaskResponse> {
    try {
      const url = `${this.tasksUrl}/${id}`;
      console.log('🔄 API: Fetching single task from:', url);

      const response: AxiosResponse<TaskResponse> = await axios.get(url);
      console.log('✅ API: Single task response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ API: Error fetching single task:', error);
      throw this.handleError(error as AxiosError);
    }
  }

  async createTask(task: Omit<Task, 'id'>): Promise<Task> {
    try {
      console.log('⚠️ DEPRECATED: Using basic createTask - consider using createTaskWithCollaborators');
      const response: AxiosResponse<Task> = await axios.post(this.tasksUrl, task);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  async createTaskWithCollaborators(taskRequest: CreateTaskRequest): Promise<TaskResponse> {
    try {
      const url = `${this.tasksUrl}/with-collaborators`;
      console.log('🔄 API: Creating task with collaborators at:', url);
      console.log('📝 API: Task request data:', taskRequest);

      const response: AxiosResponse<TaskResponse> = await axios.post(url, taskRequest);
      console.log('✅ API: Task created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ API: Error creating task with collaborators:', error);
      throw this.handleError(error as AxiosError);
    }
  }

  async updateTask(task: Task): Promise<Task> {
    try {
      console.log('⚠️ DEPRECATED: Using basic updateTask - consider using updateTaskWithCollaborators');
      const url = `${this.tasksUrl}/update`;
      const response: AxiosResponse<Task> = await axios.post(url, task);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  async updateTaskWithCollaborators(taskRequest: UpdateTaskRequest): Promise<TaskResponse> {
    try {
      const url = `${this.tasksUrl}/update-with-collaborators`;
      console.log('🔄 API: Updating task with collaborators at:', url);
      console.log('📝 API: Update request data:', taskRequest);

      const response: AxiosResponse<TaskResponse> = await axios.post(url, taskRequest);
      console.log('✅ API: Task updated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ API: Error updating task with collaborators:', error);
      throw this.handleError(error as AxiosError);
    }
  }

  async deleteTask(id: number): Promise<void> {
    try {
      const url = `${this.tasksUrl}/${id}`;
      console.log('🔄 API: Deleting task:', url);
      await axios.delete(url);
      console.log('✅ API: Task deleted successfully');
    } catch (error) {
      console.error('❌ API: Error deleting task:', error);
      throw this.handleError(error as AxiosError);
    }
  }

  // ==================== CONVERSION UTILITIES ====================

  // Convert TaskResponse to Task for backward compatibility
  private convertTaskResponseToTask(taskResponse: TaskResponse): Task {
    return {
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
      assignedTo: this.convertUserDTOToUser(taskResponse.owner),
      collaborators: taskResponse.collaborators.map(c => this.convertUserDTOToUser(c)),
      userId: taskResponse.owner.id
    };
  }

  // Convert User to UserDTO
  private convertUserToUserDTO(user: User): UserDTO {
    return {
      id: user.id!,
      username: user.username,
      email: user.email || '',
      role: user.role || 'USER',
      isActive: user.isActive !== false
    };
  }

  // Convert UserDTO to User
  private convertUserDTOToUser(userDTO: UserDTO): User {
    return {
      id: userDTO.id,
      username: userDTO.username,
      email: userDTO.email,
      role: userDTO.role,
      isActive: userDTO.isActive
    };
  }

  // Convert Task to CreateTaskRequest
  private convertTaskToCreateRequest(task: Omit<Task, 'id'>, collaboratorIds?: number[]): CreateTaskRequest {
    const formatToLocalDate = (d?: Date | string): string | undefined => {
      if (!d) return undefined;
      const dateObj = typeof d === 'string' ? new Date(d) : d;
      if (isNaN(dateObj.getTime())) return undefined;
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    return {
      title: task.title,
      description: task.description,
      dueDate: formatToLocalDate(task.dueDate),
      status: task.status,
      category: task.category,
      priority: task.priority,
      collaboratorUserIds: collaboratorIds
    };
  }

  // Convert Task to UpdateTaskRequest  
  private convertTaskToUpdateRequest(task: Task, collaboratorIds?: number[]): UpdateTaskRequest {
    const formatToLocalDate = (d?: Date | string): string | undefined => {
      if (!d) return undefined;
      const dateObj = typeof d === 'string' ? new Date(d) : d;
      if (isNaN(dateObj.getTime())) return undefined;
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    return {
      id: task.id!,
      title: task.title,
      description: task.description,
      dueDate: formatToLocalDate(task.dueDate),
      status: task.status,
      category: task.category,
      priority: task.priority,
      collaboratorUserIds: collaboratorIds
    };
  }

  async getTasksWithFilters(filters: TaskFilter): Promise<Task[]> {
    try {
      let url = this.tasksUrl;
      const params = new URLSearchParams();

      if (filters.keyword) params.append('keyword', filters.keyword);
      if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
      if (filters.priority && filters.priority !== 'ALL') params.append('priority', filters.priority);
      if (filters.category) params.append('category', filters.category);
      if (filters.assignedTo) params.append('assignedTo', filters.assignedTo.toString());
      if (filters.dueDateFrom) params.append('dueDateFrom', filters.dueDateFrom.toISOString());
      if (filters.dueDateTo) params.append('dueDateTo', filters.dueDateTo.toISOString());

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response: AxiosResponse<Task[]> = await axios.get(url);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  async assignTask(taskId: number, userId: number): Promise<Task> {
    try {
      const url = `${this.tasksUrl}/${taskId}/assign`;
      const requestBody = { userId };

      const response: AxiosResponse<Task> = await axios.post(url, requestBody);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  async addCollaborator(taskId: number, userId: number): Promise<Task> {
    try {
      const url = `${this.tasksUrl}/${taskId}/collaborators`;
      const requestBody = { userId };

      const response: AxiosResponse<Task> = await axios.post(url, requestBody);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  async removeCollaborator(taskId: number, userId: number): Promise<Task> {
    try {
      const url = `${this.tasksUrl}/${taskId}/collaborators/${userId}`;
      const response: AxiosResponse<Task> = await axios.delete(url);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  async bulkUpdateTasks(taskIds: number[], updates: Partial<Task>): Promise<Task[]> {
    try {
      // Since /bulk-update endpoint is not available, handle bulk updates internally
      // by sending individual update requests for each task
      const updatePromises: Promise<{ success: boolean; task?: Task; error?: string; taskId: number }>[] = [];
      
      // Create individual update promises with error handling
      for (const taskId of taskIds) {
        const updatePromise = this.getTask(taskId)
          .then(async (currentTaskResponse: TaskResponse) => {
            // Convert TaskResponse to Task for compatibility
            const currentTask = this.convertTaskResponseToTask(currentTaskResponse);
            const updatedTask: Task = {
              ...currentTask,
              ...updates,
              id: taskId // Ensure ID is preserved
            };
            const result = await this.updateTask(updatedTask);
            return { success: true, task: result, taskId };
          })
          .catch((error) => {
            console.error(`Failed to update task ${taskId}:`, error);
            return { 
              success: false, 
              error: error.message || 'Update failed', 
              taskId 
            };
          });
        updatePromises.push(updatePromise);
      }
      
      // Execute all updates in parallel
      const results = await Promise.all(updatePromises);
      
      // Separate successful and failed updates
      const successfulTasks = results
        .filter(result => result.success && result.task)
        .map(result => result.task!);
      
      const failedTasks = results.filter(result => !result.success);
      
      // If some tasks failed, log the errors but still return successful ones
      if (failedTasks.length > 0) {
        const failedIds = failedTasks.map(f => f.taskId).join(', ');
        console.warn(`Failed to update tasks: ${failedIds}`);
        
        // If all tasks failed, throw an error
        if (successfulTasks.length === 0) {
          throw new Error(`Failed to update all selected tasks`);
        }
        
        // If only some failed, we'll return the successful ones
        // The calling code can handle partial success
        console.info(`Successfully updated ${successfulTasks.length} out of ${taskIds.length} tasks`);
      }
      
      return successfulTasks;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  // TODO: Backend categories endpoint not implemented yet
  // async getCategories(): Promise<string[]> {
  //   try {
  //     const url = `${this.tasksUrl}/categories`;
  //     const response: AxiosResponse<string[]> = await axios.get(url);
  //     return response.data;
  //   } catch (error) {
  //     throw this.handleError(error as AxiosError);
  //   }
  // }

  // ==================== USER MANAGEMENT METHODS ====================

  async getAllUsers(): Promise<User[]> {
    try {
      const url = `${this.baseUrl}/auth/admin/users`;
      console.log('API: Fetching all users from URL:', url);

      const response = await axios.get(url);
      console.log('API: Raw response from backend:', response.data);

      let users: any[];

      if (Array.isArray(response.data)) {
        users = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        users = response.data.data;
      } else if (response.data && Array.isArray(response.data.users)) {
        users = response.data.users;
      } else if (response.data === null || response.data === undefined) {
        console.warn('API: Received null/undefined response, returning empty array');
        users = [];
      } else {
        console.error('API: Unexpected response format:', response.data);
        throw new Error('Invalid response format: expected array of users but got: ' + typeof response.data);
      }

      // Process users and map backend 'active' field to frontend 'isActive'
      return users.map(user => {
        let isActive = user.active;

        // Handle different formats of active field
        if (typeof user.active === 'string') {
          isActive = user.active.toLowerCase() === 'true';
        }
        if (typeof user.active === 'number') {
          isActive = user.active === 1;
        }
        if (isActive === null || isActive === undefined) {
          isActive = true;
        }

        return {
          ...user,
          isActive: isActive,
          role: user.role || 'USER'
        };
      });
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  async registerUser(userData: RegisterRequest): Promise<User> {
    try {
      const url = `${this.baseUrl}/auth/register`;

      const registrationData = {
        ...userData,
        isActive: userData.isActive === true || (userData.isActive as any) === 'true',
        active: userData.isActive === true || (userData.isActive as any) === 'true'
      };

      console.log('API: Registering user at URL:', url);
      console.log('API: Processed registration data:', registrationData);

      const response = await axios.post(url, registrationData);

      console.log('API: Register user response:', response);

      // Handle 201 Created status code
      if (response.status === 201 || response.status === 200) {
        let user: User;
        try {
          if (response.data && typeof response.data === 'object') {
            user = response.data;
          } else {
            // Create a mock user object if no user data is returned
            user = {
              id: Date.now(),
              username: userData.username,
              email: userData.email,
              role: userData.role || 'USER',
              isActive: true,
              createdAt: new Date()
            };
          }
        } catch (parseError) {
          console.log('API: Creating mock user:', parseError);
          user = {
            id: Date.now(),
            username: userData.username,
            email: userData.email,
            role: userData.role || 'USER',
            isActive: true,
            createdAt: new Date()
          };
        }
        return user;
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  async updateUser(userId: number, userData: Partial<User>): Promise<User> {
    try {
      const url = `${this.baseUrl}/auth/admin/users/${userId}`;
      console.log('API: Updating user at URL:', url);
      console.log('API: User data:', userData);

      const response: AxiosResponse<User> = await axios.post(url, userData);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  async toggleUserStatus(userId: number, isActive: boolean): Promise<User> {
    try {
      const url = `${this.baseUrl}/auth/admin/users/${userId}`;
      const updateData = { isActive: isActive };

      console.log('API: Updating user status at URL:', url);
      console.log('API: Update data:', updateData);

      const response = await axios.post(url, updateData);
      console.log('API: Raw backend response:', response.data);

      let mappedUser: any;

      if (response.data && typeof response.data === 'object') {
        mappedUser = {
          ...response.data,
          isActive: response.data.isActive !== undefined ? response.data.isActive :
                   response.data.active !== undefined ? response.data.active :
                   isActive
        };
      } else {
        mappedUser = {
          id: userId,
          isActive: isActive
        };
      }

      console.log('API: Final mapped user after status update:', mappedUser);
      return mappedUser;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  async deleteUser(userId: number): Promise<void> {
    try {
      const url = `${this.baseUrl}/auth/admin/users/${userId}`;
      await axios.delete(url);
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  async getUsersForAssignment(): Promise<User[]> {
    try {
      const url = `${this.baseUrl}/auth/users/active`;
      console.log('API: Fetching users for assignment from URL:', url);

      const response = await axios.get(url);
      console.log('API: Assignment users response:', response.data);

      let users: any[];

      if (Array.isArray(response.data)) {
        users = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        users = response.data.data;
      } else if (response.data && Array.isArray(response.data.users)) {
        users = response.data.users;
      } else {
        users = [];
      }

      return users.map(user => {
        let isActive = user.active;
        if (typeof user.active === 'string') {
          isActive = user.active.toLowerCase() === 'true';
        }
        return { ...user, isActive };
      });
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  async getActiveUsers(): Promise<User[]> {
    try {
      const url = `${this.baseUrl}/auth/users/active`;
      console.log('API: Fetching active users from URL:', url);

      const response = await axios.get(url);
      console.log('API: Active users response:', response.data);

      let users: any[];

      if (Array.isArray(response.data)) {
        users = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        users = response.data.data;
      } else if (response.data && Array.isArray(response.data.users)) {
        users = response.data.users;
      } else {
        users = [];
      }

      return users.map(user => {
        let isActive = user.active;
        if (typeof user.active === 'string') {
          isActive = user.active.toLowerCase() === 'true';
        }
        return { ...user, isActive };
      });
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  // ==================== DASHBOARD & ANALYTICS METHODS ====================

  // TODO: Backend dashboard stats endpoint not implemented yet
  // async getDashboardStats(): Promise<DashboardStats> {
  //   try {
  //     const url = `${this.baseUrl}/dashboard/stats`;
  //     const response: AxiosResponse<DashboardStats> = await axios.get(url);
  //     return response.data;
  //   } catch (error) {
  //     throw this.handleError(error as AxiosError);
  //   }
  // }

  // TODO: Backend analytics endpoint not implemented yet
  // async getTaskAnalytics(period: 'week' | 'month' | 'year' = 'month'): Promise<any> {
  //   try {
  //     const url = `${this.baseUrl}/dashboard/analytics?period=${period}`;
  //     const response: AxiosResponse<any> = await axios.get(url);
  //     return response.data;
  //   } catch (error) {
  //     throw this.handleError(error as AxiosError);
  //   }
  // }

  async updateTaskStatus(id: number, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'): Promise<Task> {
    try {
      const taskResponse = await this.getTask(id);
      const currentTask = this.convertTaskResponseToTask(taskResponse);
      const updatedTask = { ...currentTask, status };
      return await this.updateTask(updatedTask);
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  // ==================== UTILITY METHODS ====================

  async healthCheck(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/actuator/health`, {
        headers: { 'Content-Type': 'application/json' }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  private handleError(error: AxiosError): Error {
    let errorMessage = 'Unknown error!';

    console.error('API Error Details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      data: error.response?.data,
      url: error.config?.url,
    });

    if (error.response) {
      // Server responded with error status
      switch (error.response.status) {
        case 400:
          errorMessage = 'Bad Request - Please check your input';
          break;
        case 401:
          errorMessage = 'Unauthorized - Please login again';
          this.logout();
          break;
        case 403:
          errorMessage = 'Forbidden - You do not have permission for this action';
          break;
        case 404:
          errorMessage = 'Not Found - The requested resource was not found';
          break;
        case 500:
          errorMessage = 'Internal Server Error - Please try again later';
          break;
        default:
          errorMessage = `Error Code: ${error.response.status}\nMessage: ${error.message}`;
      }
    } else if (error.request) {
      // Request was made but no response received
      errorMessage = 'Network Error - Please check your connection';
    } else {
      // Something else happened
      errorMessage = `Error: ${error.message}`;
    }

    console.error('API Error:', errorMessage);
    return new Error(errorMessage);
  }
}

const apiServiceInstance = new ApiService();
export default apiServiceInstance;
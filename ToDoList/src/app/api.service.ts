import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, retry, tap, switchMap, map } from 'rxjs/operators';
import { environment } from '../environments/environment';

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
  createDate?: Date | string;  // Backend uses this field name
  updateDate?: Date | string;  // Backend uses this field name
  deleted?: boolean;
  assignedTo?: User;
  collaborators?: User[];
  collaboratorUserIds?: number[];
  collaboratorUsernames?: string[];
  user?: User;      // Legacy field - maps to owner
  owner?: User;     // New field from TaskResponse
  userId?: number;
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

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;
  private tasksUrl = `${this.baseUrl}/tasks`;
  private authUrl = `${this.baseUrl}/auth`;

  private tokenSubject = new BehaviorSubject<string | null>(this.getStoredToken());
  public token$ = this.tokenSubject.asObservable();

  constructor(private http: HttpClient) { 
    console.log('API Service initialized');
    console.log('API Base URL:', this.baseUrl);
    console.log('API Tasks URL:', this.tasksUrl);
    console.log('API Auth URL:', this.authUrl);
  }

  // Get base URL for debugging
  getBaseUrl(): string {
    return this.baseUrl;
  }

  // Get stored token from localStorage
  private getStoredToken(): string | null {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return localStorage.getItem('jwt_token');
    }
    return null;
  }

  // Get HTTP headers with authentication
  private getHttpOptions(includeAuth: boolean = true): { headers: HttpHeaders } {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    if (includeAuth) {
      const token = this.tokenSubject.value || this.getStoredToken();
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
        console.log('API: Adding Bearer token to request. Token starts with:', token.substring(0, 20) + '...'); 
        console.log('API: Full Authorization header set');
      } else {
        console.warn('API: No JWT token available for authenticated request');
        console.warn('API: Token from subject:', this.tokenSubject.value);
        console.warn('API: Token from localStorage:', this.getStoredToken());
      }
    }

    console.log('API: Final headers:', headers.keys());
    return { headers };
  }

  // Get HTTP headers with Basic Auth for login (CORS-friendly)
  private getBasicAuthHeaders(username: string, password: string): { headers: HttpHeaders } {
    const credentials = btoa(`${username}:${password}`);
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`
      })
    };
  }

  // ==================== AUTHENTICATION METHODS ====================

  /**
   * Login user with Basic Auth and get JWT token
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    console.log('Login attempt with URL:', `${this.authUrl}/login`);
    
    // Try a simple POST request with credentials in body (no custom headers)
    const loginData = {
      username: credentials.username,
      password: credentials.password
    };
    
    console.log('Login data:', loginData);
    
    return this.http.post<LoginResponse>(`${this.authUrl}/login`, loginData)
      .pipe(
        tap((response) => {
          console.log('Login response:', response); // Debug log
          
          // Handle different response formats
          const token = response.accessToken || response.token;
          const username = response.username || response.user?.username || credentials.username;
          
          if (token) {
            localStorage.setItem('jwt_token', token);
            localStorage.setItem('username', username);
            this.tokenSubject.next(token);
            console.log('JWT token stored:', token.substring(0, 20) + '...'); // Debug log
          } else {
            console.error('No token found in response:', response);
          }
        }),
        catchError((error) => {
          console.error('Simple POST login error:', error);
          console.error('Error status:', error.status);
          console.error('Error message:', error.message);
          
          // If simple POST fails, try with Basic Auth headers
          console.log('Simple POST failed, trying Basic Auth...');
          const authHeaders = this.getBasicAuthHeaders(credentials.username, credentials.password);
          
          return this.http.post<LoginResponse>(`${this.authUrl}/login`, {}, authHeaders)
            .pipe(
              tap((response) => {
                console.log('Basic Auth login response:', response);
                
                const token = response.accessToken || response.token;
                const username = response.username || response.user?.username || credentials.username;
                
                if (token) {
                  localStorage.setItem('jwt_token', token);
                  localStorage.setItem('username', username);
                  this.tokenSubject.next(token);
                  console.log('JWT token stored:', token.substring(0, 20) + '...');
                }
              }),
              catchError(this.handleError)
            );
        })
      );
  }

  /**
   * Register new user
   */
  register(userData: RegisterRequest): Observable<any> {
    return this.http.post(`${this.authUrl}/register`, userData, this.getHttpOptions(false))
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Logout user
   */
  logout(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('username');
    }
    this.tokenSubject.next(null);
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return !!this.tokenSubject.value;
  }

  /**
   * Get current username
   */
  getCurrentUsername(): string | null {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return localStorage.getItem('username');
    }
    return null;
  }

  // ==================== TASK MANAGEMENT METHODS ====================

  /**
   * Get all tasks (with optional keyword search)
   */
  getTasks(keyword?: string): Observable<Task[]> {
    let url = this.tasksUrl;
    if (keyword) {
      url += `?keyword=${encodeURIComponent(keyword)}`;
    }
    
    console.log('API: Making GET request to:', url);
    console.log('API: Base URL:', this.baseUrl);
    console.log('API: Full URL:', url);
    console.log('API: HTTP Options:', this.getHttpOptions());
    
    return this.http.get<Task[]>(url, this.getHttpOptions())
      .pipe(
        retry(1),
        catchError((error) => {
          console.error('API: GET /tasks failed:', error);
          console.error('API: Error status:', error.status);
          console.error('API: Error message:', error.message);
          console.error('API: Error body:', error.error);
          return this.handleError(error);
        })
      );
  }

  /**
   * Get a single task by ID
   * Note: Uses POST /tasks/get with JSON body as per API spec
   */
  getTask(id: number): Observable<Task> {
    const url = `${this.tasksUrl}/get`;
    const requestBody: TaskRequest = { id };
    
    return this.http.post<Task>(url, requestBody, this.getHttpOptions())
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Create a new task
   */
  createTask(task: Omit<Task, 'id'>): Observable<Task> {
    console.log('API: Creating task with data:', task);
    console.log('API: Task collaboratorUserIds:', task.collaboratorUserIds);
    console.log('API: Task collaboratorUserIds type:', typeof task.collaboratorUserIds);
    console.log('API: Task collaboratorUserIds length:', task.collaboratorUserIds?.length);
    console.log('API: Full task object:', JSON.stringify(task, null, 2));
    
    // Use the new endpoint if collaborators are provided
    const hasCollaborators = task.collaboratorUserIds && task.collaboratorUserIds.length > 0;
    const endpoint = hasCollaborators ? `${this.tasksUrl}/with-collaborators` : this.tasksUrl;
    
    // Create a copy of the task to send
    const taskToSend = { ...task };
    console.log('API: Using endpoint:', endpoint);
    console.log('API: Task to send:', JSON.stringify(taskToSend, null, 2));
    
    return this.http.post<Task>(endpoint, taskToSend, this.getHttpOptions())
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Update an existing task
   * Note: Uses POST /tasks/update with JSON body as per API spec
   */
  updateTask(task: Task): Observable<Task> {
    console.log('API: Updating task with data:', task);
    console.log('API: Task collaboratorUserIds:', task.collaboratorUserIds);
    
    // Use the new endpoint if collaborators are provided
    const hasCollaborators = task.collaboratorUserIds && task.collaboratorUserIds.length > 0;
    const endpoint = hasCollaborators ? 
      `${this.tasksUrl}/update-with-collaborators` : 
      `${this.tasksUrl}/update`;
    
    console.log('API: Using update endpoint:', endpoint);
    console.log('API: Task to update:', JSON.stringify(task, null, 2));
    
    return this.http.post<Task>(endpoint, task, this.getHttpOptions())
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Delete a task
   * Note: Uses POST /tasks/delete with JSON body as per API spec
   */
  deleteTask(id: number): Observable<any> {
    const url = `${this.tasksUrl}/delete`;
    const requestBody: TaskRequest = { id };
    
    return this.http.post(url, requestBody, this.getHttpOptions())
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Search tasks by keyword
   */
  searchTasks(keyword: string): Observable<Task[]> {
    return this.getTasks(keyword);
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'): Observable<Task[]> {
    return this.getTasks().pipe(
      // Filter on client side since the API doesn't provide status filtering
      // Alternatively, you could modify the backend to support status filtering
      catchError(this.handleError)
    );
  }

  /**
   * Advanced task filtering
   */
  getTasksWithFilters(filters: TaskFilter): Observable<Task[]> {
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
    
    return this.http.get<Task[]>(url, this.getHttpOptions())
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Assign task to user
   */
  assignTask(taskId: number, userId: number): Observable<Task> {
    const url = `${this.tasksUrl}/${taskId}/assign`;
    const requestBody = { userId };
    
    return this.http.post<Task>(url, requestBody, this.getHttpOptions())
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Add collaborator to task
   */
  addCollaborator(taskId: number, userId: number): Observable<Task> {
    const url = `${this.tasksUrl}/${taskId}/collaborators`;
    const requestBody = { userId };
    
    return this.http.post<Task>(url, requestBody, this.getHttpOptions())
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Remove collaborator from task
   */
  removeCollaborator(taskId: number, userId: number): Observable<Task> {
    const url = `${this.tasksUrl}/${taskId}/collaborators/${userId}`;
    
    return this.http.delete<Task>(url, this.getHttpOptions())
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Bulk update tasks
   */
  bulkUpdateTasks(taskIds: number[], updates: Partial<Task>): Observable<Task[]> {
    const url = `${this.tasksUrl}/bulk-update`;
    const requestBody = { taskIds, updates };
    
    return this.http.post<Task[]>(url, requestBody, this.getHttpOptions())
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Get task categories
   * TODO: Backend categories endpoint not implemented yet
   */
  // getCategories(): Observable<string[]> {
  //   const url = `${this.tasksUrl}/categories`;
  //   
  //   return this.http.get<string[]>(url, this.getHttpOptions())
  //     .pipe(
  //       retry(1),
  //       catchError(this.handleError)
  //     );
  // }

  // ==================== USER MANAGEMENT METHODS ====================

  /**
   * Get all users (Admin only)
   */
  getAllUsers(): Observable<User[]> {
    const url = `${this.baseUrl}/auth/admin/users`;
    
    console.log('API: Fetching all users from URL:', url);
    console.log('API: HTTP options:', this.getHttpOptions());
    
    return this.http.get<any>(url, this.getHttpOptions())
      .pipe(
        tap(response => {
          console.log('API: Raw response from backend:', response);
          console.log('API: Response type:', typeof response);
          console.log('API: Is array:', Array.isArray(response));
          
          // Log detailed info about the first user if available
          if (Array.isArray(response) && response.length > 0) {
            console.log('API: First user sample:', response[0]);
            console.log('API: First user isActive:', response[0].isActive, 'type:', typeof response[0].isActive);
          }
        }),
        map(response => {
          // Handle different response formats
          let users: any[];
          
          if (Array.isArray(response)) {
            users = response;
          } else if (response && Array.isArray(response.data)) {
            users = response.data;
          } else if (response && Array.isArray(response.users)) {
            users = response.users;
            console.log('API: Found users in response.users array');
          } else if (response === null || response === undefined) {
            console.warn('API: Received null/undefined response, returning empty array');
            users = [];
          } else {
            console.error('API: Unexpected response format:', response);
            console.error('API: Response type:', typeof response);
            console.error('API: Response keys:', Object.keys(response || {}));
            throw new Error('Invalid response format: expected array of users but got: ' + typeof response);
          }
          
          console.log('API: Extracted users array:', users);
          console.log('API: Users count:', users.length);
          
          // Process users and map backend 'active' field to frontend 'isActive'
          return users.map(user => {
            console.log('API: Processing user:', user.username, 'active:', user.active, 'type:', typeof user.active);
            
            // Map backend 'active' field to frontend 'isActive' field
            let isActive = user.active;
            
            // Handle different formats of active field
            if (typeof user.active === 'string') {
              if (user.active.toLowerCase() === 'true') {
                isActive = true;
              } else if (user.active.toLowerCase() === 'false') {
                isActive = false;
              }
              console.log('API: Converted string active:', user.active, 'to boolean:', isActive);
            }
            
            // Handle number format (1 = true, 0 = false)
            if (typeof user.active === 'number') {
              isActive = user.active === 1;
              console.log('API: Converted number active:', user.active, 'to boolean:', isActive);
            }
            
            // Default to true if the field is missing completely
            if (isActive === null || isActive === undefined) {
              isActive = true;
              console.log('API: Set default isActive to true for user:', user.username);
            }
            
            console.log('API: Final isActive for', user.username, ':', isActive);
            
            return {
              ...user,
              isActive: isActive, // Map backend 'active' to frontend 'isActive'
              role: user.role || 'USER'
            };
          });
        }),
        tap(processedUsers => {
          console.log('API: Processed users with defaults:', processedUsers);
        }),
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Register new user (Admin only)
   */
  registerUser(userData: RegisterRequest): Observable<User> {
    const url = `${this.baseUrl}/auth/register`;
    
    // Create a copy and ensure proper field mapping for registration
    // Send both 'isActive' and 'active' fields to ensure backend compatibility
    const registrationData = { 
      ...userData,
      // Ensure isActive is properly set as boolean
      isActive: userData.isActive === true || (userData.isActive as any) === 'true',
      // Also send 'active' field in case backend expects this name for registration
      active: userData.isActive === true || (userData.isActive as any) === 'true'
    };
    
    console.log('API: Registering user at URL:', url);
    console.log('API: Original user data:', userData);
    console.log('API: isActive type (original):', typeof userData.isActive);
    console.log('API: isActive value (original):', userData.isActive);
    console.log('API: Processed registration data:', registrationData);
    console.log('API: isActive type (processed):', typeof registrationData.isActive);
    console.log('API: isActive value (processed):', registrationData.isActive);
    console.log('API: HTTP options:', this.getHttpOptions());
    
    return this.http.post<any>(url, registrationData, { 
      ...this.getHttpOptions(),
      observe: 'response',
      responseType: 'text' as 'json'
    })
      .pipe(
        tap((response: any) => {
          console.log('API: Register user full response:', response);
          console.log('API: Register user status code:', response.status);
          console.log('API: Register user body:', response.body);
          console.log('API: Register user headers:', response.headers);
        }),
        map((response: any): User => {
          // Handle 201 Created status code
          if (response.status === 201 || response.status === 200) {
            // If the backend returns 201 with a success message or empty body,
            // create a mock user object since the user was created successfully
            let user: User;
            try {
              if (response.body && typeof response.body === 'string' && response.body.trim().startsWith('{')) {
                user = JSON.parse(response.body);
              } else {
                // Create a mock user object if no user data is returned
                user = {
                  id: Date.now(), // temporary ID
                  username: userData.username,
                  email: userData.email,
                  role: userData.role || 'USER',
                  isActive: true, // New users are active by default
                  createdAt: new Date()
                };
              }
            } catch (parseError) {
              console.log('API: Response body is not JSON, creating mock user:', parseError);
              // Create a mock user object since the registration was successful
              user = {
                id: Date.now(), // temporary ID
                username: userData.username,
                email: userData.email,
                role: userData.role || 'USER',
                isActive: true, // New users are active by default
                createdAt: new Date()
              };
            }
            return user;
          } else {
            throw new Error(`Unexpected status code: ${response.status}`);
          }
        }),
        catchError((error: any) => {
          console.error('API: Register user error:', error);
          console.error('API: Error status:', error.status);
          console.error('API: Error body:', error.error);
          
          // If we get a 201 status in the error (which Angular sometimes treats as an error),
          // treat it as success
          if (error.status === 201) {
            console.log('API: Treating 201 status as success despite error');
            const user: User = {
              id: Date.now(), // temporary ID
              username: userData.username,
              email: userData.email,
              role: userData.role || 'USER',
              isActive: true, // New users are active by default
              createdAt: new Date()
            };
            return new Observable<User>(observer => {
              observer.next(user);
              observer.complete();
            });
          }
          
          return this.handleError(error);
        })
      );
  }

  /**
   * Update user (Admin only)
   */
  updateUser(userId: number, userData: Partial<User>): Observable<User> {
    const url = `${this.baseUrl}/auth/admin/users/${userId}`;
    
    console.log('API: Updating user at URL:', url);
    console.log('API: User data:', userData);
    console.log('API: HTTP options:', this.getHttpOptions());
    
    return this.http.post<User>(url, userData, this.getHttpOptions())
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Toggle user status (Admin only) - Uses update user endpoint
   */
  toggleUserStatus(userId: number, isActive: boolean): Observable<User> {
    const url = `${this.baseUrl}/auth/admin/users/${userId}`;
    // Send 'isActive' field to backend (the DTO expects 'isActive')
    const updateData = { isActive: isActive };
    
    console.log('API: Updating user status at URL:', url);
    console.log('API: Update data (backend expects isActive field):', updateData);
    console.log('API: Target status:', isActive ? 'ACTIVE' : 'INACTIVE');
    console.log('API: HTTP options:', this.getHttpOptions());
    
    return this.http.post<any>(url, updateData, this.getHttpOptions())
      .pipe(
        map(response => {
          console.log('API: Raw backend response:', response);
          
          // Handle different possible response formats from backend
          let mappedUser: any;
          
          if (response && typeof response === 'object') {
            // Check what fields are available in the response
            console.log('API: Available fields in response:', Object.keys(response));
            
            // Map the response, prioritizing the field we sent but fallback to other formats
            mappedUser = {
              ...response,
              isActive: response.isActive !== undefined ? response.isActive : 
                       response.active !== undefined ? response.active : 
                       isActive // fallback to what we intended to set
            };
          } else {
            // If response is not an object, create a minimal user object
            mappedUser = {
              id: userId,
              isActive: isActive
            };
          }
          
          console.log('API: Final mapped user after status update:', mappedUser);
          console.log('API: Final user status (isActive):', mappedUser.isActive);
          return mappedUser;
        }),
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Delete user (Admin only)
   */
  deleteUser(userId: number): Observable<any> {
    const url = `${this.baseUrl}/auth/admin/users/${userId}`;
    
    return this.http.delete(url, this.getHttpOptions())
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Get users for task assignment
   */
  getUsersForAssignment(): Observable<User[]> {
    const url = `${this.baseUrl}/auth/users/active`;
    
    console.log('API: Fetching users for assignment from URL:', url);
    
    return this.http.get<any>(url, this.getHttpOptions())
      .pipe(
        tap(response => {
          console.log('API: Assignment users response:', response);
        }),
        map(response => {
          // Handle different response formats
          let users: any[];
          
          if (Array.isArray(response)) {
            users = response;
          } else if (response && Array.isArray(response.data)) {
            users = response.data;
          } else if (response && Array.isArray(response.users)) {
            users = response.users;
          } else if (response === null || response === undefined) {
            console.warn('API: Received null/undefined response for assignment users, returning empty array');
            users = [];
          } else {
            console.error('API: Unexpected assignment users response format:', response);
            throw new Error('Invalid response format: expected array of users');
          }
          
          // Map backend 'active' field to frontend 'isActive' field
          const mappedUsers = users.map(user => {
            console.log('API: Processing assignment user:', user.username, 'active:', user.active, 'type:', typeof user.active);
            
            // Map backend 'active' field to frontend 'isActive' field
            let isActive = user.active;
            
            // Handle different formats of active field
            if (typeof user.active === 'string') {
              if (user.active.toLowerCase() === 'true') {
                isActive = true;
              } else if (user.active.toLowerCase() === 'false') {
                isActive = false;
              }
            }
            
            const mappedUser = { ...user, isActive };
            console.log('API: Mapped assignment user:', mappedUser.username, 'isActive:', mappedUser.isActive);
            return mappedUser;
          });
          
          console.log('API: Final mapped assignment users:', mappedUsers);
          return mappedUsers;
        }),
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Get active users for task contributors
   */
  getActiveUsers(): Observable<User[]> {
    const url = `${this.baseUrl}/auth/users/active`;
    
    console.log('API: Fetching active users from URL:', url);
    console.log('API: HTTP options:', this.getHttpOptions());
    
    return this.http.get<any>(url, this.getHttpOptions())
      .pipe(
        tap(response => {
          console.log('API: Active users response:', response);
        }),
        map(response => {
          // Handle different response formats
          let users: any[];
          
          if (Array.isArray(response)) {
            users = response;
          } else if (response && Array.isArray(response.data)) {
            users = response.data;
          } else if (response && Array.isArray(response.users)) {
            users = response.users;
          } else if (response === null || response === undefined) {
            console.warn('API: Received null/undefined response for active users, returning empty array');
            users = [];
          } else {
            console.error('API: Unexpected active users response format:', response);
            throw new Error('Invalid response format: expected array of active users');
          }
          
          // Map backend 'active' field to frontend 'isActive' field for active users
          const mappedUsers = users.map(user => {
            console.log('API: Processing active user:', user.username, 'active:', user.active, 'type:', typeof user.active);
            
            // Map backend 'active' field to frontend 'isActive' field
            let isActive = user.active;
            
            // Handle different formats of active field
            if (typeof user.active === 'string') {
              if (user.active.toLowerCase() === 'true') {
                isActive = true;
              } else if (user.active.toLowerCase() === 'false') {
                isActive = false;
              }
            }
            
            const mappedUser = { ...user, isActive };
            console.log('API: Mapped active user:', mappedUser.username, 'isActive:', mappedUser.isActive);
            return mappedUser;
          });
          
          console.log('API: Final mapped active users:', mappedUsers);
          return mappedUsers;
        }),
        retry(1),
        catchError(this.handleError)
      );
  }

  // ==================== DASHBOARD & ANALYTICS METHODS ====================

  /**
   * Get dashboard statistics
   */
  getDashboardStats(): Observable<DashboardStats> {
    const url = `${this.baseUrl}/dashboard/stats`;
    
    return this.http.get<DashboardStats>(url, this.getHttpOptions())
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Get task analytics
   * TODO: Backend analytics endpoint not implemented yet
   */
  // getTaskAnalytics(period: 'week' | 'month' | 'year' = 'month'): Observable<any> {
  //   const url = `${this.baseUrl}/dashboard/analytics?period=${period}`;
  //   
  //   return this.http.get<any>(url, this.getHttpOptions())
  //     .pipe(
  //       retry(1),
  //       catchError(this.handleError)
  //     );
  // }

  /**
   * Update task status
   */
  updateTaskStatus(id: number, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'): Observable<Task> {
    // First get the task, then update it with new status
    return this.getTask(id).pipe(
      switchMap((task: Task) => {
        const updatedTask = { ...task, status };
        return this.updateTask(updatedTask);
      }),
      catchError(this.handleError)
    );
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Check if the backend is healthy
   */
  healthCheck(): Observable<any> {
    return this.http.get(`${this.baseUrl}/actuator/health`, this.getHttpOptions(false))
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Unknown error!';
    
    console.error('API Error Details:', {
      status: error.status,
      statusText: error.statusText,
      message: error.message,
      error: error.error,
      url: error.url,
      headers: error.headers
    });
    
    if (error.error instanceof ErrorEvent) {
      // Client-side errors
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side errors
      switch (error.status) {
        case 400:
          errorMessage = 'Bad Request - Please check your input';
          break;
        case 401:
          errorMessage = 'Unauthorized - Please login again';
          // Auto logout on 401
          if (typeof window !== 'undefined') {
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('username');
          }
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
          errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      }
    }
    
    console.error('API Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
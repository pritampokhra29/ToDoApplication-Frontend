import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, retry, tap, switchMap } from 'rxjs/operators';

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
  private baseUrl = 'http://localhost:8080';
  private tasksUrl = `${this.baseUrl}/tasks`;
  private authUrl = `${this.baseUrl}/auth`;

  private tokenSubject = new BehaviorSubject<string | null>(this.getStoredToken());
  public token$ = this.tokenSubject.asObservable();

  constructor(private http: HttpClient) { }

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
      const token = this.tokenSubject.value;
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
        console.log('Adding Bearer token to request:', token.substring(0, 20) + '...'); // Debug log
      } else {
        console.warn('No JWT token available for request'); // Debug log
      }
    }

    return { headers };
  }

  // Get HTTP headers with Basic Auth for login
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
    const authHeaders = this.getBasicAuthHeaders(credentials.username, credentials.password);
    
    return this.http.post<LoginResponse>(`${this.authUrl}/login`, credentials, authHeaders)
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
        catchError(this.handleError)
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
    
    return this.http.get<Task[]>(url, this.getHttpOptions())
      .pipe(
        retry(1),
        catchError(this.handleError)
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
    return this.http.post<Task>(this.tasksUrl, task, this.getHttpOptions())
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
    const url = `${this.tasksUrl}/update`;
    
    return this.http.post<Task>(url, task, this.getHttpOptions())
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
   */
  getCategories(): Observable<string[]> {
    const url = `${this.tasksUrl}/categories`;
    
    return this.http.get<string[]>(url, this.getHttpOptions())
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  // ==================== USER MANAGEMENT METHODS ====================

  /**
   * Get all users (Admin only)
   */
  getAllUsers(): Observable<User[]> {
    const url = `${this.baseUrl}/admin/users`;
    
    return this.http.get<User[]>(url, this.getHttpOptions())
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Register new user (Admin only)
   */
  registerUser(userData: RegisterRequest): Observable<User> {
    const url = `${this.baseUrl}/admin/register`;
    
    return this.http.post<User>(url, userData, this.getHttpOptions())
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Update user (Admin only)
   */
  updateUser(userId: number, userData: Partial<User>): Observable<User> {
    const url = `${this.baseUrl}/admin/users/${userId}`;
    
    return this.http.put<User>(url, userData, this.getHttpOptions())
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Delete user (Admin only)
   */
  deleteUser(userId: number): Observable<any> {
    const url = `${this.baseUrl}/admin/users/${userId}`;
    
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
    const url = `${this.baseUrl}/users/assignable`;
    
    return this.http.get<User[]>(url, this.getHttpOptions())
      .pipe(
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
   */
  getTaskAnalytics(period: 'week' | 'month' | 'year' = 'month'): Observable<any> {
    const url = `${this.baseUrl}/dashboard/analytics?period=${period}`;
    
    return this.http.get<any>(url, this.getHttpOptions())
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

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
          errorMessage = 'Forbidden - You do not have permission';
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
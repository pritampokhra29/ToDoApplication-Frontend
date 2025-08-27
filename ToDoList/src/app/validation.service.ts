import { Injectable } from '@angular/core';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FieldValidationResult {
  [fieldName: string]: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ValidationService {

  constructor() { }

  // ==================== USER VALIDATION ====================

  validateUsername(username: string, isRequired: boolean = true): ValidationResult {
    const errors: string[] = [];
    
    if (!username || username.trim() === '') {
      if (isRequired) {
        errors.push('Username is required and cannot be empty');
      }
    } else {
      const trimmed = username.trim();
      if (trimmed.length < 3) {
        errors.push('Username must be at least 3 characters long');
      } else if (trimmed.length > 50) {
        errors.push('Username cannot exceed 50 characters');
      }
      if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
        errors.push('Username can only contain letters (a-z, A-Z), numbers (0-9), and underscores (_)');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validateEmail(email: string, isRequired: boolean = true): ValidationResult {
    const errors: string[] = [];
    
    if (!email || email.trim() === '') {
      if (isRequired) {
        errors.push('Email address is required and cannot be empty');
      }
    } else {
      const trimmed = email.trim();
      if (trimmed.length > 100) {
        errors.push('Email address cannot exceed 100 characters');
      }
      // Enhanced email regex for better validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        errors.push('Please enter a valid email address (e.g., user@example.com)');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validatePassword(password: string, isRequired: boolean = true): ValidationResult {
    const errors: string[] = [];
    
    if (!password || password.trim() === '') {
      if (isRequired) {
        errors.push('Password is required and cannot be empty');
      }
    } else {
      if (password.length < 6) {
        errors.push('Password must be at least 6 characters long');
      } else if (password.length > 100) {
        errors.push('Password cannot exceed 100 characters');
      }
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/.test(password)) {
        errors.push('Password must contain at least one lowercase letter, one uppercase letter, and one number');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validateRole(role: string, isRequired: boolean = false): ValidationResult {
    const errors: string[] = [];
    
    if (!role || role.trim() === '') {
      if (isRequired) {
        errors.push('User role is required and must be selected');
      }
    } else {
      if (!/^(USER|ADMIN)$/.test(role)) {
        errors.push('User role must be either "USER" or "ADMIN"');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validateUserId(id: number | string): ValidationResult {
    const errors: string[] = [];
    
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    
    if (!numId || isNaN(numId) || numId <= 0) {
      errors.push('User ID must be a valid positive number greater than 0');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  // ==================== TASK VALIDATION ====================

  validateTaskTitle(title: string): ValidationResult {
    const errors: string[] = [];
    
    if (!title || title.trim() === '') {
      errors.push('Task title is required and cannot be empty');
    } else {
      const trimmed = title.trim();
      if (trimmed.length < 1) {
        errors.push('Task title must contain at least 1 character');
      } else if (trimmed.length > 255) {
        errors.push('Task title cannot exceed 255 characters');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validateTaskDescription(description: string): ValidationResult {
    const errors: string[] = [];
    
    if (description && description.length > 2000) {
      errors.push('Task description cannot exceed 2000 characters');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validateTaskDueDate(dueDate: string | Date): ValidationResult {
    const errors: string[] = [];
    
    if (dueDate) {
      const date = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to compare dates only
      
      if (isNaN(date.getTime())) {
        errors.push('Please provide a valid due date');
      } else if (date < today) {
        errors.push('Due date must be today or a future date');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validateTaskStatus(status: string): ValidationResult {
    const errors: string[] = [];
    
    if (status && !/^(PENDING|IN_PROGRESS|COMPLETED)$/.test(status)) {
      errors.push('Task status must be "PENDING", "IN_PROGRESS", or "COMPLETED"');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validateTaskCategory(category: string): ValidationResult {
    const errors: string[] = [];
    
    if (category && category.length > 100) {
      errors.push('Task category cannot exceed 100 characters');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validateTaskPriority(priority: string): ValidationResult {
    const errors: string[] = [];
    
    if (priority && !/^(LOW|MEDIUM|HIGH)$/.test(priority)) {
      errors.push('Task priority must be "LOW", "MEDIUM", or "HIGH"');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validateTaskId(id: number | string): ValidationResult {
    const errors: string[] = [];
    
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    
    if (!numId || isNaN(numId) || numId <= 0) {
      errors.push('Task ID must be a valid positive number greater than 0');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validateCollaborators(collaborators: any[]): ValidationResult {
    const errors: string[] = [];
    
    if (collaborators && Array.isArray(collaborators)) {
      if (collaborators.length > 10) {
        errors.push('A task cannot have more than 10 collaborators');
      }
      
      // Check for duplicate collaborators
      const userIds = collaborators.map(c => c.id).filter(id => id !== undefined && id !== null);
      const uniqueIds = new Set(userIds);
      if (userIds.length !== uniqueIds.size) {
        errors.push('Duplicate collaborators are not allowed');
      }
      
      // Validate each collaborator
      for (let i = 0; i < collaborators.length; i++) {
        const collaborator = collaborators[i];
        if (!collaborator || typeof collaborator !== 'object') {
          errors.push(`Collaborator ${i + 1} is invalid`);
          continue;
        }
        
        if (!collaborator.id || typeof collaborator.id !== 'number' || collaborator.id <= 0) {
          errors.push(`Collaborator ${i + 1} must have a valid user ID`);
        }
        
        if (!collaborator.username || typeof collaborator.username !== 'string' || collaborator.username.trim() === '') {
          errors.push(`Collaborator ${i + 1} must have a valid username`);
        }
      }
    } else if (collaborators !== undefined && collaborators !== null && !Array.isArray(collaborators)) {
      errors.push('Collaborators must be provided as a list of users');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  // ==================== FORM VALIDATION ====================

  validateLoginForm(username: string, password: string): FieldValidationResult {
    const result: FieldValidationResult = {};
    
    const usernameValidation = this.validateUsername(username, true);
    if (!usernameValidation.isValid) {
      result['username'] = usernameValidation.errors;
    }
    
    // For login, password just needs to be provided and within length limits
    const errors: string[] = [];
    if (!password || password.trim() === '') {
      errors.push('Password is required for login');
    } else if (password.length > 100) {
      errors.push('Password cannot exceed 100 characters');
    }
    
    if (errors.length > 0) {
      result['password'] = errors;
    }
    
    return result;
  }

  validateRegistrationForm(userData: {
    username: string;
    email: string;
    password: string;
    role?: string;
    firstName?: string;
    lastName?: string;
  }): FieldValidationResult {
    const result: FieldValidationResult = {};
    
    const usernameValidation = this.validateUsername(userData.username, true);
    if (!usernameValidation.isValid) {
      result['username'] = usernameValidation.errors;
    }
    
    const emailValidation = this.validateEmail(userData.email, true);
    if (!emailValidation.isValid) {
      result['email'] = emailValidation.errors;
    }
    
    const passwordValidation = this.validatePassword(userData.password, true);
    if (!passwordValidation.isValid) {
      result['password'] = passwordValidation.errors;
    }
    
    if (userData.role) {
      const roleValidation = this.validateRole(userData.role, false);
      if (!roleValidation.isValid) {
        result['role'] = roleValidation.errors;
      }
    }
    
    // Optional name validations
    if (userData.firstName && userData.firstName.length > 50) {
      result['firstName'] = ['First name cannot exceed 50 characters'];
    }
    
    if (userData.lastName && userData.lastName.length > 50) {
      result['lastName'] = ['Last name cannot exceed 50 characters'];
    }
    
    return result;
  }

  validateUserUpdateForm(userData: {
    id: number | string;
    username?: string;
    email?: string;
    password?: string;
    role?: string;
    firstName?: string;
    lastName?: string;
  }): FieldValidationResult {
    const result: FieldValidationResult = {};
    
    const idValidation = this.validateUserId(userData.id);
    if (!idValidation.isValid) {
      result['id'] = idValidation.errors;
    }
    
    if (userData.username) {
      const usernameValidation = this.validateUsername(userData.username, false);
      if (!usernameValidation.isValid) {
        result['username'] = usernameValidation.errors;
      }
    }
    
    if (userData.email) {
      const emailValidation = this.validateEmail(userData.email, false);
      if (!emailValidation.isValid) {
        result['email'] = emailValidation.errors;
      }
    }
    
    if (userData.password) {
      const passwordValidation = this.validatePassword(userData.password, false);
      if (!passwordValidation.isValid) {
        result['password'] = passwordValidation.errors;
      }
    }
    
    if (userData.role) {
      const roleValidation = this.validateRole(userData.role, false);
      if (!roleValidation.isValid) {
        result['role'] = roleValidation.errors;
      }
    }
    
    if (userData.firstName && userData.firstName.length > 50) {
      result['firstName'] = ['First name cannot exceed 50 characters'];
    }
    
    if (userData.lastName && userData.lastName.length > 50) {
      result['lastName'] = ['Last name cannot exceed 50 characters'];
    }
    
    return result;
  }

  validateTaskForm(taskData: {
    title: string;
    description?: string;
    dueDate?: string | Date;
    status?: string;
    category?: string;
    priority?: string;
    collaborators?: any[];
  }): FieldValidationResult {
    const result: FieldValidationResult = {};
    
    const titleValidation = this.validateTaskTitle(taskData.title);
    if (!titleValidation.isValid) {
      result['title'] = titleValidation.errors;
    }
    
    if (taskData.description) {
      const descValidation = this.validateTaskDescription(taskData.description);
      if (!descValidation.isValid) {
        result['description'] = descValidation.errors;
      }
    }
    
    if (taskData.dueDate) {
      const dueDateValidation = this.validateTaskDueDate(taskData.dueDate);
      if (!dueDateValidation.isValid) {
        result['dueDate'] = dueDateValidation.errors;
      }
    }
    
    if (taskData.status) {
      const statusValidation = this.validateTaskStatus(taskData.status);
      if (!statusValidation.isValid) {
        result['status'] = statusValidation.errors;
      }
    }
    
    if (taskData.category) {
      const categoryValidation = this.validateTaskCategory(taskData.category);
      if (!categoryValidation.isValid) {
        result['category'] = categoryValidation.errors;
      }
    }
    
    if (taskData.priority) {
      const priorityValidation = this.validateTaskPriority(taskData.priority);
      if (!priorityValidation.isValid) {
        result['priority'] = priorityValidation.errors;
      }
    }
    
    if (taskData.collaborators) {
      const collaboratorsValidation = this.validateCollaborators(taskData.collaborators);
      if (!collaboratorsValidation.isValid) {
        result['collaborators'] = collaboratorsValidation.errors;
      }
    }
    
    return result;
  }

  // ==================== UTILITY METHODS ====================

  hasValidationErrors(validationResult: FieldValidationResult): boolean {
    return Object.keys(validationResult).length > 0;
  }

  getAllErrors(validationResult: FieldValidationResult): string[] {
    const allErrors: string[] = [];
    Object.values(validationResult).forEach(errors => {
      allErrors.push(...errors);
    });
    return allErrors;
  }

  formatValidationErrors(validationResult: FieldValidationResult): string {
    const allErrors = this.getAllErrors(validationResult);
    return allErrors.join('; ');
  }

  // Real-time validation helper for form fields
  validateField(fieldName: string, value: any, context: 'login' | 'register' | 'userUpdate' | 'task' = 'register'): string[] {
    switch (fieldName) {
      case 'username':
        return this.validateUsername(value, context !== 'userUpdate').errors;
      case 'email':
        return this.validateEmail(value, context !== 'userUpdate').errors;
      case 'password':
        if (context === 'login') {
          const errors: string[] = [];
          if (!value || value.trim() === '') {
            errors.push('Password is required for login');
          } else if (value.length > 100) {
            errors.push('Password cannot exceed 100 characters');
          }
          return errors;
        }
        return this.validatePassword(value, context !== 'userUpdate').errors;
      case 'role':
        return this.validateRole(value, false).errors;
      case 'title':
        return this.validateTaskTitle(value).errors;
      case 'description':
        return this.validateTaskDescription(value).errors;
      case 'dueDate':
        return this.validateTaskDueDate(value).errors;
      case 'status':
        return this.validateTaskStatus(value).errors;
      case 'category':
        return this.validateTaskCategory(value).errors;
      case 'priority':
        return this.validateTaskPriority(value).errors;
      case 'collaborators':
        return this.validateCollaborators(value).errors;
      default:
        return [];
    }
  }
}

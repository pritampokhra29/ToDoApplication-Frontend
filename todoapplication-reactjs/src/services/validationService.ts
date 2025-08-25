export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FieldValidationResult {
  [fieldName: string]: string[];
}

class ValidationService {
  // ==================== USER VALIDATION ====================

  validateUsername(username: string, isRequired: boolean = true): ValidationResult {
    const errors: string[] = [];
    
    if (!username || username.trim() === '') {
      if (isRequired) {
        errors.push('Username is required');
      }
    } else {
      const trimmed = username.trim();
      if (trimmed.length < 3 || trimmed.length > 50) {
        errors.push('Username must be between 3 and 50 characters');
      }
      if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
        errors.push('Username can only contain letters, numbers, and underscores');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validateEmail(email: string, isRequired: boolean = true): ValidationResult {
    const errors: string[] = [];
    
    if (!email || email.trim() === '') {
      if (isRequired) {
        errors.push('Email is required');
      }
    } else {
      const trimmed = email.trim();
      if (trimmed.length > 100) {
        errors.push('Email must not exceed 100 characters');
      }
      // Enhanced email regex for better validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        errors.push('Email should be valid');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validatePassword(password: string, isRequired: boolean = true): ValidationResult {
    const errors: string[] = [];
    
    if (!password || password.trim() === '') {
      if (isRequired) {
        errors.push('Password is required');
      }
    } else {
      if (password.length < 6 || password.length > 100) {
        errors.push('Password must be between 6 and 100 characters');
      }
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/.test(password)) {
        errors.push('Password must contain at least one lowercase letter, one uppercase letter, and one digit');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validateRole(role: string, isRequired: boolean = false): ValidationResult {
    const errors: string[] = [];
    
    if (!role || role.trim() === '') {
      if (isRequired) {
        errors.push('Role is required');
      }
    } else {
      if (!/^(USER|ADMIN)$/.test(role)) {
        errors.push('Role must be either USER or ADMIN');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validateUserId(id: number | string): ValidationResult {
    const errors: string[] = [];
    
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    
    if (!numId || isNaN(numId) || numId <= 0) {
      errors.push('User ID must be positive');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  // ==================== TASK VALIDATION ====================

  validateTaskTitle(title: string): ValidationResult {
    const errors: string[] = [];
    
    if (!title || title.trim() === '') {
      errors.push('Task title is required');
    } else {
      const trimmed = title.trim();
      if (trimmed.length < 1 || trimmed.length > 255) {
        errors.push('Title must be between 1 and 255 characters');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validateTaskDescription(description: string): ValidationResult {
    const errors: string[] = [];
    
    if (description && description.length > 2000) {
      errors.push('Description must not exceed 2000 characters');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validateTaskDueDate(dueDate: string | Date): ValidationResult {
    const errors: string[] = [];
    
    if (dueDate) {
      const date = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to compare dates only
      
      if (date < today) {
        errors.push('Due date must be in the future');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validateTaskStatus(status: string): ValidationResult {
    const errors: string[] = [];
    
    if (status && !/^(TODO|IN_PROGRESS|COMPLETED)$/.test(status)) {
      errors.push('Status must be TODO, IN_PROGRESS, or COMPLETED');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validateTaskCategory(category: string): ValidationResult {
    const errors: string[] = [];
    
    if (category && category.length > 100) {
      errors.push('Category must not exceed 100 characters');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validateTaskPriority(priority: string): ValidationResult {
    const errors: string[] = [];
    
    if (priority && !/^(LOW|MEDIUM|HIGH)$/.test(priority)) {
      errors.push('Priority must be LOW, MEDIUM, or HIGH');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validateTaskId(id: number | string): ValidationResult {
    const errors: string[] = [];
    
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    
    if (!numId || isNaN(numId) || numId <= 0) {
      errors.push('Task ID must be positive');
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
      errors.push('Password is required');
    } else if (password.length > 100) {
      errors.push('Password must not exceed 100 characters');
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
      result['firstName'] = ['First name must not exceed 50 characters'];
    }
    
    if (userData.lastName && userData.lastName.length > 50) {
      result['lastName'] = ['Last name must not exceed 50 characters'];
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
      result['firstName'] = ['First name must not exceed 50 characters'];
    }
    
    if (userData.lastName && userData.lastName.length > 50) {
      result['lastName'] = ['Last name must not exceed 50 characters'];
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
            errors.push('Password is required');
          } else if (value.length > 100) {
            errors.push('Password must not exceed 100 characters');
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
      default:
        return [];
    }
  }
}

export default new ValidationService();
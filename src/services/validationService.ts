import { TASK_STATUS, TASK_PRIORITY, USER_ROLE, VALIDATION_MESSAGES } from '../constants/taskConstants';

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
        errors.push('Username is required - please enter a username');
      }
    } else {
      const trimmed = username.trim();
      if (trimmed.length < 3) {
        errors.push(`Username is too short (${trimmed.length}/3 minimum characters)`);
      } else if (trimmed.length > 50) {
        errors.push(`Username is too long (${trimmed.length}/50 maximum characters)`);
      }
      if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
        errors.push('Username contains invalid characters - only letters, numbers, and underscores are allowed');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validateEmail(email: string, isRequired: boolean = true): ValidationResult {
    const errors: string[] = [];
    
    if (!email || email.trim() === '') {
      if (isRequired) {
        errors.push('Email address is required - please enter your email');
      }
    } else {
      const trimmed = email.trim();
      if (trimmed.length > 100) {
        errors.push(`Email is too long (${trimmed.length}/100 maximum characters)`);
      }
      // Enhanced email regex for better validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        errors.push('Email format is invalid - please use format: user@domain.com');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validatePassword(password: string, isRequired: boolean = true): ValidationResult {
    const errors: string[] = [];
    
    if (!password || password.trim() === '') {
      if (isRequired) {
        errors.push('Password is required - please enter a password');
      }
    } else {
      if (password.length < 6) {
        errors.push(`Password is too short (${password.length}/6 minimum characters)`);
      } else if (password.length > 100) {
        errors.push(`Password is too long (${password.length}/100 maximum characters)`);
      }
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/.test(password)) {
        const missing = [];
        if (!/[a-z]/.test(password)) missing.push('lowercase letter');
        if (!/[A-Z]/.test(password)) missing.push('uppercase letter');
        if (!/\d/.test(password)) missing.push('number');
        errors.push(`Password must contain at least one ${missing.join(', ')}`);
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
      if (!Object.values(USER_ROLE).includes(role as any)) {
        errors.push(VALIDATION_MESSAGES.USER_ROLE);
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
      errors.push('Task title is required - please enter a descriptive title');
    } else {
      const trimmed = title.trim();
      if (trimmed.length > 255) {
        errors.push(`Task title is too long (${trimmed.length}/255 maximum characters)`);
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validateTaskDescription(description: string): ValidationResult {
    const errors: string[] = [];
    
    if (description && description.length > 2000) {
      errors.push(`Description is too long (${description.length}/2000 maximum characters)`);
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
        errors.push('Due date format is invalid - please enter a valid date');
      } else if (date < today) {
        const formattedDate = date.toLocaleDateString();
        errors.push(`Due date cannot be in the past (selected: ${formattedDate})`);
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  validateTaskStatus(status: string): ValidationResult {
    const errors: string[] = [];
    
    if (status && !Object.values(TASK_STATUS).includes(status as any)) {
      errors.push(VALIDATION_MESSAGES.TASK_STATUS);
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
    
    if (priority && !Object.values(TASK_PRIORITY).includes(priority as any)) {
      errors.push(VALIDATION_MESSAGES.TASK_PRIORITY);
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

  // Enhanced method to format validation errors with field context
  formatValidationErrorsWithContext(validationResult: FieldValidationResult): string {
    const errorsByField: string[] = [];
    
    Object.entries(validationResult).forEach(([fieldName, errors]) => {
      if (errors && errors.length > 0) {
        const fieldDisplayName = this.getFieldDisplayName(fieldName);
        const fieldErrors = errors.map(error => `${fieldDisplayName}: ${error}`);
        errorsByField.push(...fieldErrors);
      }
    });
    
    return errorsByField.join('; ');
  }

  // Helper method to get user-friendly field names
  private getFieldDisplayName(fieldName: string): string {
    const fieldDisplayNames: { [key: string]: string } = {
      'username': 'Username',
      'email': 'Email',
      'password': 'Password',
      'role': 'Role',
      'firstName': 'First Name',
      'lastName': 'Last Name',
      'title': 'Task Title',
      'description': 'Description',
      'dueDate': 'Due Date',
      'status': 'Status',
      'category': 'Category',
      'priority': 'Priority',
      'tags': 'Tags',
      'assignedUsers': 'Assigned Users'
    };
    
    return fieldDisplayNames[fieldName] || fieldName;
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

  // Method to get a user-friendly validation summary
  getValidationSummary(validationResult: FieldValidationResult): string {
    const errorCount = this.getAllErrors(validationResult).length;
    const fieldCount = Object.keys(validationResult).length;
    
    if (errorCount === 0) {
      return 'All fields are valid';
    } else if (fieldCount === 1) {
      const fieldName = Object.keys(validationResult)[0];
      const fieldDisplayName = this.getFieldDisplayName(fieldName);
      return `${fieldDisplayName} has ${errorCount} error${errorCount > 1 ? 's' : ''}`;
    } else {
      return `${fieldCount} field${fieldCount > 1 ? 's' : ''} have validation errors (${errorCount} total)`;
    }
  }

  // Method to provide helpful suggestions for fixing validation errors
  getValidationSuggestions(fieldName: string, errors: string[]): string[] {
    const suggestions: string[] = [];
    
    errors.forEach(error => {
      if (error.includes('too short')) {
        suggestions.push('Try entering more characters');
      } else if (error.includes('too long')) {
        suggestions.push('Try shortening your text');
      } else if (error.includes('invalid characters')) {
        suggestions.push('Remove special characters and spaces');
      } else if (error.includes('Email format is invalid')) {
        suggestions.push('Use format: yourname@example.com');
      } else if (error.includes('lowercase letter')) {
        suggestions.push('Add a lowercase letter (a-z)');
      } else if (error.includes('uppercase letter')) {
        suggestions.push('Add an uppercase letter (A-Z)');
      } else if (error.includes('number')) {
        suggestions.push('Add a number (0-9)');
      } else if (error.includes('past')) {
        suggestions.push('Choose today\'s date or a future date');
      } else if (error.includes('required')) {
        suggestions.push(`Please fill in the ${this.getFieldDisplayName(fieldName).toLowerCase()} field`);
      }
    });
    
    // Remove duplicates
    return Array.from(new Set(suggestions));
  }
}

const validationServiceInstance = new ValidationService();
export default validationServiceInstance;
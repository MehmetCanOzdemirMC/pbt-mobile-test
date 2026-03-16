/**
 * Import Validator Utility (React Native Port)
 *
 * Ported from: /Users/ridvandereci/Documents/GitHub/PBTv1/src/utils/importValidator.js
 * Validates diamond data before import
 */

/**
 * Validation rules for each field
 */
export const VALIDATION_RULES = {
  // Required fields
  shape: {
    required: true,
    type: 'string',
    values: ['Round', 'Princess', 'Cushion', 'Oval', 'Emerald', 'Radiant', 'Pear', 'Marquise', 'Heart', 'Asscher'],
    errorMessage: 'Invalid shape'
  },
  carat: {
    required: true,
    type: 'number',
    min: 0.01,
    max: 50.0,
    errorMessage: 'Carat must be between 0.01 and 50.00'
  },
  color: {
    required: true,
    type: 'string',
    pattern: /^[D-Z](-[D-Z])?$/i,
    errorMessage: 'Color must be D-Z or range (e.g., Q-R)'
  },
  clarity: {
    required: true,
    type: 'string',
    values: ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'SI3', 'I1', 'I2', 'I3'],
    errorMessage: 'Invalid clarity grade'
  },
  price_per_ct: {
    required: true,
    type: 'number',
    min: 1,
    max: 100000,
    errorMessage: 'Price per carat must be between $1 and $100,000'
  },

  // Optional fields with validation
  lab: {
    required: false,
    type: 'string',
    values: ['GIA', 'IGI', 'HRD', 'AGS', 'EGL', 'GCAL', 'GSI', 'OTHER'],
    errorMessage: 'Invalid lab',
    rejectUrl: true
  },
  cut: {
    required: false,
    type: 'string',
    values: ['Excellent', 'Very Good', 'Good', 'Fair', 'Poor', 'EX', 'VG', 'G', 'F', 'P'],
    errorMessage: 'Invalid cut grade'
  },
  polish: {
    required: false,
    type: 'string',
    values: ['Excellent', 'Very Good', 'Good', 'Fair', 'Poor', 'EX', 'VG', 'G', 'F', 'P'],
    errorMessage: 'Invalid polish grade'
  },
  symmetry: {
    required: false,
    type: 'string',
    values: ['Excellent', 'Very Good', 'Good', 'Fair', 'Poor', 'EX', 'VG', 'G', 'F', 'P'],
    errorMessage: 'Invalid symmetry grade'
  },
  fluorescence: {
    required: false,
    type: 'string',
    values: ['None', 'Faint', 'Medium', 'Strong', 'Very Strong', 'N', 'F', 'M', 'S', 'VS'],
    errorMessage: 'Invalid fluorescence'
  },

  // Numeric fields with ranges
  table_percent: {
    required: false,
    type: 'number',
    min: 40,
    max: 80,
    errorMessage: 'Table % must be between 40 and 80'
  },
  depth_percent: {
    required: false,
    type: 'number',
    min: 40,
    max: 80,
    errorMessage: 'Depth % must be between 40 and 80'
  },
  rap_percent: {
    required: false,
    type: 'number',
    min: -99,
    max: 100,
    errorMessage: 'Rap % must be between -99 and 100'
  },
  discount_percent: {
    required: false,
    type: 'number',
    min: 0,
    max: 100,
    errorMessage: 'Discount % must be between 0 and 100'
  }
};

/**
 * Validate a single field
 * @param {string} field - Field name
 * @param {any} value - Field value
 * @param {Object} rules - Validation rules
 * @returns {Object} { valid: boolean, error: string }
 */
export const validateField = (field, value, rules) => {
  // Check if required
  if (rules.required && (value === null || value === undefined || value === '')) {
    return { valid: false, error: `${field} is required` };
  }

  // Skip validation if optional and empty
  if (!rules.required && (value === null || value === undefined || value === '')) {
    return { valid: true };
  }

  // Type validation
  if (rules.type === 'number') {
    const num = parseFloat(value);
    if (isNaN(num)) {
      return { valid: false, error: `${field} must be a number` };
    }

    // Min/max validation
    if (rules.min !== undefined && num < rules.min) {
      return { valid: false, error: rules.errorMessage || `${field} is too small` };
    }
    if (rules.max !== undefined && num > rules.max) {
      return { valid: false, error: rules.errorMessage || `${field} is too large` };
    }
  }

  // String validation
  if (rules.type === 'string') {
    const str = String(value).trim();

    // Reject URLs in specific fields (e.g., lab)
    if (rules.rejectUrl && (str.includes('http://') || str.includes('https://'))) {
      return { valid: false, error: `${field} should not contain URLs` };
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(str)) {
      return { valid: false, error: rules.errorMessage || `Invalid ${field} format` };
    }

    // Values validation (enum)
    if (rules.values && rules.values.length > 0) {
      const upperStr = str.toUpperCase();
      const upperValues = rules.values.map(v => v.toUpperCase());
      if (!upperValues.includes(upperStr)) {
        return { valid: false, error: rules.errorMessage || `Invalid ${field}` };
      }
    }
  }

  return { valid: true };
};

/**
 * Validate a single diamond/stone row
 * @param {Object} stone - Stone data object
 * @param {number} rowIndex - Row index for error reporting
 * @returns {Object} { valid: boolean, errors: Array, warnings: Array }
 */
export const validateStone = (stone, rowIndex = 0) => {
  const errors = [];
  const warnings = [];

  // Validate each field
  Object.entries(VALIDATION_RULES).forEach(([field, rules]) => {
    const value = stone[field];
    const result = validateField(field, value, rules);

    if (!result.valid) {
      errors.push(`Row ${rowIndex + 1}: ${result.error}`);
    }
  });

  // Business logic validations
  // 1. Total price calculation check
  if (stone.carat && stone.price_per_ct) {
    const calculatedTotal = parseFloat(stone.carat) * parseFloat(stone.price_per_ct);
    if (stone.total_price && Math.abs(parseFloat(stone.total_price) - calculatedTotal) > 0.01) {
      warnings.push(`Row ${rowIndex + 1}: Total price mismatch (expected ${calculatedTotal.toFixed(2)})`);
    }
  }

  // 2. Certification number should exist if lab is specified
  if (stone.lab && stone.lab !== 'OTHER' && !stone.certificate_number) {
    warnings.push(`Row ${rowIndex + 1}: Certificate number missing for ${stone.lab} certification`);
  }

  // 3. Measurements validation (if exists)
  if (stone.measurements) {
    const measurements = String(stone.measurements).trim();
    const pattern = /^\d+(\.\d+)?\s*[xX]\s*\d+(\.\d+)?\s*[xX]\s*\d+(\.\d+)?$/;
    if (!pattern.test(measurements)) {
      warnings.push(`Row ${rowIndex + 1}: Measurements format invalid (should be: 7.50 x 7.48 x 4.60)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validate entire dataset
 * @param {Array} data - Array of stone data
 * @returns {Object} { valid: boolean, errors: Array, warnings: Array, validCount: number }
 */
export const validateDataset = (data) => {
  const allErrors = [];
  const allWarnings = [];
  let validCount = 0;

  data.forEach((stone, index) => {
    const result = validateStone(stone, index);
    if (result.valid) {
      validCount++;
    }
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  });

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    validCount,
    invalidCount: data.length - validCount,
    totalCount: data.length
  };
};

/**
 * Normalize/clean stone data
 * @param {Object} stone - Raw stone data
 * @returns {Object} Normalized stone data
 */
export const normalizeStone = (stone) => {
  const normalized = { ...stone };

  // Normalize shape (capitalize first letter)
  if (normalized.shape) {
    normalized.shape = String(normalized.shape).charAt(0).toUpperCase() +
      String(normalized.shape).slice(1).toLowerCase();
  }

  // Normalize color (uppercase)
  if (normalized.color) {
    normalized.color = String(normalized.color).toUpperCase().trim();
  }

  // Normalize clarity (uppercase)
  if (normalized.clarity) {
    normalized.clarity = String(normalized.clarity).toUpperCase().trim();
  }

  // Normalize lab (uppercase)
  if (normalized.lab) {
    normalized.lab = String(normalized.lab).toUpperCase().trim();
  }

  // Normalize grades (capitalize)
  ['cut', 'polish', 'symmetry', 'fluorescence'].forEach(field => {
    if (normalized[field]) {
      const value = String(normalized[field]).trim();
      // Map abbreviations to full names
      const gradeMap = {
        'EX': 'Excellent',
        'VG': 'Very Good',
        'G': 'Good',
        'F': 'Fair',
        'P': 'Poor',
        'N': 'None',
        'FNT': 'Faint',
        'M': 'Medium',
        'S': 'Strong',
        'VS': 'Very Strong'
      };
      normalized[field] = gradeMap[value.toUpperCase()] ||
        (value.charAt(0).toUpperCase() + value.slice(1).toLowerCase());
    }
  });

  // Calculate total price if missing
  if (normalized.carat && normalized.price_per_ct && !normalized.total_price) {
    normalized.total_price = parseFloat(normalized.carat) * parseFloat(normalized.price_per_ct);
  }

  // Convert numeric fields
  ['carat', 'price_per_ct', 'total_price', 'table_percent', 'depth_percent', 'rap_percent'].forEach(field => {
    if (normalized[field]) {
      normalized[field] = parseFloat(normalized[field]);
    }
  });

  return normalized;
};

#!/usr/bin/env node

/**
 * Test script to verify ESLint auto-fix functionality
 * This script demonstrates the ESLint configuration working correctly
 */

const fs = require('fs');
const path = require('path');

// Test variables that should be auto-fixed
const testVariable = 'This should use const instead of let';
const oldStyleVariable = 'This should use const instead of var';

// Test string concatenation that should use template literals
const message = 'Hello ' + 'World' + '!';

// Test console statements (should be warnings, not errors)
console.log('Testing ESLint auto-fix functionality');
console.log('Message:', message);

// Test function that should be arrow function
function testFunction() {
  return 'This should be an arrow function';
}

// Test object shorthand
const obj = {
  testVariable,
  testFunction,
};

// Test prefer destructuring
const name = obj.testVariable;
const func = obj.testFunction;

// Export for testing
module.exports = {
  testVariable,
  oldStyleVariable,
  message,
  testFunction,
  obj,
  name,
  func,
};

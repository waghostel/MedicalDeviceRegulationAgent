import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import {
  testAccessibility,
  ScreenReaderSimulator,
} from '@/lib/testing/accessibility-utils';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock form components for testing
const MockDeviceForm = () => (
  <form role="form" aria-labelledby="device-form-title">
    <h2 id="device-form-title">Device Information Form</h2>

    <div className="form-group">
      <label htmlFor="device-name">
        Device Name <span aria-label="required">*</span>
      </label>
      <input
        id="device-name"
        type="text"
        required
        aria-describedby="device-name-help device-name-error"
        aria-invalid="false"
      />
      <div id="device-name-help" className="help-text">
        Enter the commercial name of your medical device
      </div>
      <div id="device-name-error" className="error-text" aria-live="polite" />
    </div>

    <div className="form-group">
      <label htmlFor="intended-use">
        Intended Use <span aria-label="required">*</span>
      </label>
      <textarea
        id="intended-use"
        required
        rows={4}
        aria-describedby="intended-use-help"
        placeholder="Describe the intended use of your device..."
      />
      <div id="intended-use-help" className="help-text">
        Provide a clear description of what your device is intended to do
      </div>
    </div>

    <fieldset>
      <legend>Device Classification</legend>
      <div
        className="radio-group"
        role="radiogroup"
        aria-labelledby="classification-legend"
      >
        <div>
          <input
            type="radio"
            id="class-1"
            name="device-class"
            value="class-1"
            aria-describedby="class-1-desc"
          />
          <label htmlFor="class-1">Class I</label>
          <div id="class-1-desc" className="radio-description">
            Low risk devices with general controls
          </div>
        </div>
        <div>
          <input
            type="radio"
            id="class-2"
            name="device-class"
            value="class-2"
            aria-describedby="class-2-desc"
          />
          <label htmlFor="class-2">Class II</label>
          <div id="class-2-desc" className="radio-description">
            Moderate risk devices requiring special controls
          </div>
        </div>
        <div>
          <input
            type="radio"
            id="class-3"
            name="device-class"
            value="class-3"
            aria-describedby="class-3-desc"
          />
          <label htmlFor="class-3">Class III</label>
          <div id="class-3-desc" className="radio-description">
            High risk devices requiring premarket approval
          </div>
        </div>
      </div>
    </fieldset>

    <div className="form-group">
      <label htmlFor="product-code">Product Code</label>
      <select id="product-code" aria-describedby="product-code-help">
        <option value="">Select a product code</option>
        <option value="LRH">LRH - Cardiovascular Device</option>
        <option value="MNH">MNH - Orthopedic Device</option>
        <option value="OZP">OZP - Neurological Device</option>
      </select>
      <div id="product-code-help" className="help-text">
        Choose the FDA product code that best matches your device
      </div>
    </div>

    <div className="form-group">
      <div className="checkbox-group">
        <input
          type="checkbox"
          id="has-software"
          name="features"
          value="software"
          aria-describedby="software-desc"
        />
        <label htmlFor="has-software">Device includes software</label>
        <div id="software-desc" className="checkbox-description">
          Check if your device includes any software components
        </div>
      </div>

      <div className="checkbox-group">
        <input
          type="checkbox"
          id="has-ai"
          name="features"
          value="ai"
          aria-describedby="ai-desc"
        />
        <label htmlFor="has-ai">Device uses AI/ML</label>
        <div id="ai-desc" className="checkbox-description">
          Check if your device uses artificial intelligence or machine learning
        </div>
      </div>
    </div>

    <div className="form-actions">
      <button type="button" className="secondary">
        Save Draft
      </button>
      <button type="submit" className="primary">
        Submit for Classification
      </button>
    </div>
  </form>
);

const MockSearchForm = () => (
  <form role="search" aria-labelledby="search-form-title">
    <h2 id="search-form-title">Predicate Device Search</h2>

    <div className="search-group">
      <label htmlFor="search-query" className="visually-hidden">
        Search predicates
      </label>
      <input
        id="search-query"
        type="search"
        placeholder="Search for predicate devices..."
        aria-describedby="search-help"
        autoComplete="off"
      />
      <button type="submit" aria-label="Search predicates">
        <span aria-hidden="true">🔍</span>
      </button>
      <div id="search-help" className="help-text">
        Enter device name, K-number, or intended use to find similar devices
      </div>
    </div>

    <div className="filters" role="group" aria-labelledby="filters-title">
      <h3 id="filters-title">Search Filters</h3>

      <div className="filter-group">
        <label htmlFor="date-range">Clearance Date Range</label>
        <select id="date-range" aria-describedby="date-range-help">
          <option value="">Any date</option>
          <option value="last-year">Last year</option>
          <option value="last-5-years">Last 5 years</option>
          <option value="last-10-years">Last 10 years</option>
        </select>
        <div id="date-range-help" className="help-text">
          Filter by when the predicate device was cleared
        </div>
      </div>

      <div className="filter-group">
        <label htmlFor="confidence-threshold">Minimum Confidence</label>
        <input
          id="confidence-threshold"
          type="range"
          min="0"
          max="100"
          defaultValue="70"
          aria-describedby="confidence-help"
          aria-valuetext="70 percent"
        />
        <div id="confidence-help" className="help-text">
          Only show predicates with confidence above this threshold
        </div>
      </div>
    </div>

    <div className="form-actions">
      <button type="button" onClick={() => {}}>
        Clear Filters
      </button>
      <button type="submit">Apply Filters</button>
    </div>
  </form>
);

describe('Form Accessibility Tests', () => {
  describe('Device Information Form', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<MockDeviceForm />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper form structure and labels', () => {
      render(<MockDeviceForm />);

      // Form should have proper role and title
      const form = screen.getByRole('form');
      expect(form).toHaveAttribute('aria-labelledby', 'device-form-title');

      // All form controls should have labels
      const deviceNameInput = screen.getByLabelText(/device name/i);
      expect(deviceNameInput).toBeRequired();
      expect(deviceNameInput).toHaveAttribute('aria-describedby');

      const intendedUseTextarea = screen.getByLabelText(/intended use/i);
      expect(intendedUseTextarea).toBeRequired();
      expect(intendedUseTextarea).toHaveAttribute('aria-describedby');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<MockDeviceForm />);

      // Tab through form controls in logical order
      await user.tab(); // Device name input
      expect(screen.getByLabelText(/device name/i)).toHaveFocus();

      await user.tab(); // Intended use textarea
      expect(screen.getByLabelText(/intended use/i)).toHaveFocus();

      await user.tab(); // First radio button
      expect(screen.getByLabelText(/class i/i)).toHaveFocus();

      // Arrow keys should navigate within radio group
      await user.keyboard('{ArrowDown}');
      expect(screen.getByLabelText(/class ii/i)).toHaveFocus();

      await user.keyboard('{ArrowDown}');
      expect(screen.getByLabelText(/class iii/i)).toHaveFocus();
    });

    it('should have proper fieldset and legend structure', () => {
      render(<MockDeviceForm />);

      const fieldset = screen.getByRole('group', {
        name: /device classification/i,
      });
      expect(fieldset).toBeInTheDocument();

      const radioGroup = screen.getByRole('radiogroup');
      expect(radioGroup).toBeInTheDocument();

      // All radio buttons should be in the same group
      const radioButtons = screen.getAllByRole('radio');
      radioButtons.forEach((radio) => {
        expect(radio).toHaveAttribute('name', 'device-class');
      });
    });

    it('should provide helpful descriptions for form controls', () => {
      render(<MockDeviceForm />);

      // Check that help text is properly associated
      const deviceNameInput = screen.getByLabelText(/device name/i);
      const helpTextId = deviceNameInput.getAttribute('aria-describedby');
      expect(helpTextId).toContain('device-name-help');

      const helpText = document.getElementById('device-name-help');
      expect(helpText).toHaveTextContent(/enter the commercial name/i);
    });

    it('should handle form validation accessibly', async () => {
      const user = userEvent.setup();
      render(<MockDeviceForm />);

      const submitButton = screen.getByRole('button', {
        name: /submit for classification/i,
      });

      // Try to submit empty form
      await user.click(submitButton);

      // Required fields should be marked as invalid
      const deviceNameInput = screen.getByLabelText(/device name/i);
      expect(deviceNameInput).toBeInvalid();

      // Error messages should be announced
      const errorElement = document.getElementById('device-name-error');
      expect(errorElement).toHaveAttribute('aria-live', 'polite');
    });

    it('should support screen reader announcements', () => {
      const { container } = render(<MockDeviceForm />);
      const simulator = new ScreenReaderSimulator(container);

      const navigation = simulator.simulateScreenReaderNavigation();

      // Should announce form structure
      expect(navigation).toContain('Heading level 2: Device Information Form');
      expect(navigation).toContain('Landmark: form');

      // Should announce form controls with labels
      expect(navigation.some((item) => item.includes('Device Name'))).toBe(
        true
      );
      expect(navigation.some((item) => item.includes('Intended Use'))).toBe(
        true
      );
    });
  });

  describe('Search Form Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<MockSearchForm />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper search form structure', () => {
      render(<MockSearchForm />);

      const searchForm = screen.getByRole('search');
      expect(searchForm).toHaveAttribute(
        'aria-labelledby',
        'search-form-title'
      );

      const searchInput = screen.getByRole('searchbox');
      expect(searchInput).toHaveAttribute('aria-describedby', 'search-help');

      const searchButton = screen.getByRole('button', {
        name: /search predicates/i,
      });
      expect(searchButton).toBeInTheDocument();
    });

    it('should handle range input accessibly', () => {
      render(<MockSearchForm />);

      const rangeInput = screen.getByLabelText(/minimum confidence/i);
      expect(rangeInput).toHaveAttribute('type', 'range');
      expect(rangeInput).toHaveAttribute('aria-valuetext');
      expect(rangeInput).toHaveAttribute('aria-describedby', 'confidence-help');
    });

    it('should group related filters properly', () => {
      render(<MockSearchForm />);

      const filtersGroup = screen.getByRole('group', {
        name: /search filters/i,
      });
      expect(filtersGroup).toBeInTheDocument();

      // Filters should be contained within the group
      const dateRangeSelect = screen.getByLabelText(/clearance date range/i);
      expect(filtersGroup).toContainElement(dateRangeSelect);
    });

    it('should support keyboard navigation for search', async () => {
      const user = userEvent.setup();
      render(<MockSearchForm />);

      const searchInput = screen.getByRole('searchbox');
      const searchButton = screen.getByRole('button', {
        name: /search predicates/i,
      });

      // Focus search input
      await user.click(searchInput);
      expect(searchInput).toHaveFocus();

      // Type search query
      await user.type(searchInput, 'cardiac device');
      expect(searchInput).toHaveValue('cardiac device');

      // Enter should submit search
      await user.keyboard('{Enter}');
      // Should trigger search (in real implementation)

      // Tab to search button
      searchInput.focus();
      await user.tab();
      expect(searchButton).toHaveFocus();
    });
  });

  describe('Form Error Handling', () => {
    it('should announce validation errors to screen readers', async () => {
      const { container } = render(<MockDeviceForm />);
      const simulator = new ScreenReaderSimulator(container);

      // Simulate validation error
      const deviceNameInput = screen.getByLabelText(/device name/i);
      deviceNameInput.setAttribute('aria-invalid', 'true');

      const errorElement = document.getElementById('device-name-error');
      if (errorElement) {
        errorElement.textContent = 'Device name is required';
      }

      const announcements = simulator.getAnnouncements();
      expect(announcements).toContain('Device name is required');
    });

    it('should focus first invalid field on form submission', async () => {
      const user = userEvent.setup();
      render(<MockDeviceForm />);

      const submitButton = screen.getByRole('button', {
        name: /submit for classification/i,
      });
      await user.click(submitButton);

      // First invalid field should receive focus
      const deviceNameInput = screen.getByLabelText(/device name/i);
      expect(deviceNameInput).toHaveFocus();
    });

    it('should provide clear error messages', () => {
      render(<MockDeviceForm />);

      // Error containers should be properly set up
      const errorElement = document.getElementById('device-name-error');
      expect(errorElement).toHaveAttribute('aria-live', 'polite');

      // Error messages should be descriptive
      if (errorElement) {
        errorElement.textContent =
          'Please enter a device name between 3 and 100 characters';
        expect(errorElement).toHaveTextContent(/please enter a device name/i);
      }
    });
  });

  describe('Form Interaction Patterns', () => {
    it('should support autocomplete attributes', () => {
      render(<MockSearchForm />);

      const searchInput = screen.getByRole('searchbox');
      expect(searchInput).toHaveAttribute('autoComplete', 'off');
    });

    it('should handle dynamic content updates accessibly', async () => {
      const user = userEvent.setup();
      const { container } = render(<MockSearchForm />);
      const simulator = new ScreenReaderSimulator(container);

      const rangeInput = screen.getByLabelText(/minimum confidence/i);

      // Change range value
      await user.clear(rangeInput);
      await user.type(rangeInput, '85');

      // Should update aria-valuetext
      expect(rangeInput).toHaveAttribute('aria-valuetext', '85 percent');

      // Should announce change to screen readers
      const announcements = simulator.getAnnouncements();
      expect(announcements.some((a) => a.includes('85'))).toBe(true);
    });

    it('should provide progress indication for long operations', () => {
      render(
        <div>
          <MockDeviceForm />
          <div
            role="status"
            aria-live="polite"
            aria-label="Form submission progress"
          >
            <div
              role="progressbar"
              aria-valuenow={50}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              Submitting form... 50% complete
            </div>
          </div>
        </div>
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');

      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toHaveAttribute('aria-live', 'polite');
    });
  });
});

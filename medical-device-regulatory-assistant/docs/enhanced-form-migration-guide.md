# Enhanced Form Migration Guide

## Overview

This guide provides step-by-step instructions for migrating existing forms to use the Enhanced Form System. The migration process is designed to be gradual and non-breaking, allowing you to upgrade forms one at a time while maintaining existing functionality.

## Migration Strategy

### Phase 1: Assessment and Planning

1. **Identify Forms for Migration**
2. **Assess Current Implementation**
3. **Plan Migration Order**
4. **Set Up Testing Environment**

### Phase 2: Core Migration

1. **Install Dependencies**
2. **Create Validation Schemas**
3. **Migrate Form Hooks**
4. **Update Form Components**

### Phase 3: Enhancement Integration

1. **Add Auto-save Functionality**
2. **Implement Real-time Validation**
3. **Enhance Accessibility**
4. **Add Error Handling**

### Phase 4: Testing and Optimization

1. **Unit Testing**
2. **Integration Testing**
3. **Performance Testing**
4. **Accessibility Testing**

## Step-by-Step Migration Process

### Step 1: Form Assessment

Before migrating, assess your current form implementation:

```typescript
// Example: Current form implementation
import { useForm } from 'react-hook-form';

export function CurrentForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = (data) => {
    // Submit logic
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name', { required: 'Name is required' })} />
      {errors.name && <span>{errors.name.message}</span>}
      <button type="submit">Submit</button>
    </form>
  );
}
```

**Assessment Checklist:**

- [ ] Form complexity (number of fields)
- [ ] Current validation approach
- [ ] Error handling implementation
- [ ] Accessibility features
- [ ] Performance requirements
- [ ] Auto-save needs

### Step 2: Create Validation Schema

Convert existing validation rules to Zod schemas:

```typescript
// Before: React Hook Form validation
const validation = {
  name: {
    required: 'Name is required',
    maxLength: { value: 255, message: 'Name too long' },
  },
  email: {
    required: 'Email is required',
    pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' },
  },
};

// After: Zod schema
import { z } from 'zod';

export const formSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters')
    .trim(),

  email: z.string().min(1, 'Email is required').email('Invalid email address'),

  description: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length >= 10,
      'Description must be at least 10 characters when provided'
    ),
});

export type FormData = z.infer<typeof formSchema>;
```

### Step 3: Migrate Form Hook

Replace `useForm` with `useEnhancedForm`:

```typescript
// Before
import { useForm } from 'react-hook-form';

export function MyForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  // ... rest of component
}

// After
import { useEnhancedForm } from '@/hooks/use-enhanced-form';
import { formSchema, type FormData } from './validation';

export function MyForm() {
  const form = useEnhancedForm<FormData>({
    schema: formSchema,
    defaultValues: {
      name: '',
      email: '',
      description: '',
    },
    // Optional: Add auto-save
    autoSave: {
      enabled: true,
      interval: 2000,
      onSave: async (data) => {
        await saveDraft(data);
      },
      storageKey: 'my-form-draft',
    },
    // Optional: Configure real-time validation
    realTimeValidation: {
      enabled: true,
      debounceMs: 300,
    },
    // Optional: Accessibility settings
    accessibility: {
      announceErrors: true,
      focusFirstError: true,
    },
    formName: 'My Form',
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    getFieldValidation,
    submitWithFeedback,
    isSaving,
    lastSaved,
  } = form;

  // ... rest of component
}
```

### Step 4: Update Form Components

Replace standard inputs with enhanced components:

```typescript
// Before: Standard inputs
<input
  {...register('name')}
  placeholder="Enter name"
/>
{errors.name && <span className="error">{errors.name.message}</span>}

// After: Enhanced inputs
import { EnhancedInput } from '@/components/forms/EnhancedFormField';

<EnhancedInput
  {...register('name')}
  label="Name"
  placeholder="Enter name"
  validation={getFieldValidation('name')}
  error={errors.name}
  showCharacterCount={true}
  maxLength={255}
  required
/>
```

### Step 5: Update Form Submission

Enhance form submission with feedback:

```typescript
// Before: Basic submission
const onSubmit = async (data) => {
  try {
    await submitForm(data);
    // Handle success
  } catch (error) {
    // Handle error
  }
};

return (
  <form onSubmit={handleSubmit(onSubmit)}>
    {/* form fields */}
    <button type="submit">Submit</button>
  </form>
);

// After: Enhanced submission with feedback
const handleFormSubmit = async (data: FormData) => {
  await submitForm(data);
};

return (
  <form onSubmit={handleSubmit((data) =>
    submitWithFeedback(() => handleFormSubmit(data))
  )}>
    {/* enhanced form fields */}

    {/* Auto-save indicator */}
    <AutoSaveIndicator
      isSaving={isSaving}
      lastSaved={lastSaved}
    />

    <button type="submit" disabled={form.formState.isSubmitting}>
      {form.formState.isSubmitting ? 'Submitting...' : 'Submit'}
    </button>
  </form>
);
```

## Migration Examples

### Example 1: Simple Contact Form

**Before:**

```typescript
import React from 'react';
import { useForm } from 'react-hook-form';

interface ContactFormData {
  name: string;
  email: string;
  message: string;
}

export function ContactForm({ onSubmit }: { onSubmit: (data: ContactFormData) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<ContactFormData>();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>Name</label>
        <input {...register('name', { required: 'Name is required' })} />
        {errors.name && <span>{errors.name.message}</span>}
      </div>

      <div>
        <label>Email</label>
        <input
          type="email"
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' }
          })}
        />
        {errors.email && <span>{errors.email.message}</span>}
      </div>

      <div>
        <label>Message</label>
        <textarea {...register('message', { required: 'Message is required' })} />
        {errors.message && <span>{errors.message.message}</span>}
      </div>

      <button type="submit">Send Message</button>
    </form>
  );
}
```

**After:**

```typescript
import React from 'react';
import { z } from 'zod';
import { useEnhancedForm } from '@/hooks/use-enhanced-form';
import { EnhancedInput, EnhancedTextarea, AutoSaveIndicator } from '@/components/forms/EnhancedFormField';

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  message: z.string().min(1, 'Message is required').min(10, 'Message too short'),
});

type ContactFormData = z.infer<typeof contactSchema>;

export function ContactForm({ onSubmit }: { onSubmit: (data: ContactFormData) => Promise<void> }) {
  const form = useEnhancedForm<ContactFormData>({
    schema: contactSchema,
    autoSave: {
      enabled: true,
      interval: 3000,
      onSave: async (data) => {
        localStorage.setItem('contact-form-draft', JSON.stringify(data));
      },
      storageKey: 'contact-form-draft',
    },
    formName: 'Contact Form',
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    getFieldValidation,
    submitWithFeedback,
    isSaving,
    lastSaved,
  } = form;

  return (
    <form onSubmit={handleSubmit((data) => submitWithFeedback(() => onSubmit(data)))}>
      <EnhancedInput
        {...register('name')}
        label="Name"
        validation={getFieldValidation('name')}
        error={errors.name}
        showCharacterCount={true}
        maxLength={100}
        required
      />

      <EnhancedInput
        {...register('email')}
        type="email"
        label="Email"
        validation={getFieldValidation('email')}
        error={errors.email}
        required
      />

      <EnhancedTextarea
        {...register('message')}
        label="Message"
        validation={getFieldValidation('message')}
        error={errors.message}
        showCharacterCount={true}
        maxLength={1000}
        minRows={4}
        required
      />

      <AutoSaveIndicator
        isSaving={isSaving}
        lastSaved={lastSaved}
      />

      <button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}
```

### Example 2: Complex Multi-Section Form

**Before:**

```typescript
export function ProjectForm({ project, onSubmit }: ProjectFormProps) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: project || {},
  });

  const deviceType = watch('device_type');

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Basic Information */}
      <section>
        <h3>Basic Information</h3>
        <input {...register('name', { required: 'Project name is required' })} />
        <textarea {...register('description')} />
      </section>

      {/* Device Details */}
      <section>
        <h3>Device Details</h3>
        <select {...register('device_type')}>
          <option value="">Select device type</option>
          <option value="software">Software</option>
          <option value="hardware">Hardware</option>
        </select>

        {deviceType === 'software' && (
          <input {...register('software_version')} placeholder="Software version" />
        )}
      </section>

      <button type="submit">Save Project</button>
    </form>
  );
}
```

**After:**

```typescript
import { z } from 'zod';
import { useEnhancedForm } from '@/hooks/use-enhanced-form';

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(255),
  description: z.string().optional(),
  device_type: z.enum(['software', 'hardware', '']).optional(),
  software_version: z.string().optional(),
  intended_use: z.string().optional(),
}).refine(
  (data) => {
    if (data.device_type === 'software' && !data.software_version) {
      return false;
    }
    return true;
  },
  {
    message: 'Software version is required for software devices',
    path: ['software_version'],
  }
);

export function ProjectForm({ project, onSubmit }: ProjectFormProps) {
  const form = useEnhancedForm({
    schema: projectSchema,
    defaultValues: project || {
      name: '',
      description: '',
      device_type: '',
      software_version: '',
      intended_use: '',
    },
    autoSave: {
      enabled: true,
      interval: 2000,
      onSave: async (data) => {
        await saveProjectDraft(data);
      },
      storageKey: project ? `project-form-${project.id}` : 'project-form-new',
    },
    formName: project ? 'Edit Project' : 'New Project',
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    getFieldValidation,
    submitWithFeedback,
    isSaving,
    lastSaved,
  } = form;

  const deviceType = watch('device_type');

  return (
    <form onSubmit={handleSubmit((data) => submitWithFeedback(() => onSubmit(data)))}>
      {/* Basic Information */}
      <section>
        <h3>Basic Information</h3>

        <EnhancedInput
          {...register('name')}
          label="Project Name"
          validation={getFieldValidation('name')}
          error={errors.name}
          showCharacterCount={true}
          maxLength={255}
          required
        />

        <EnhancedTextarea
          {...register('description')}
          label="Description"
          validation={getFieldValidation('description')}
          error={errors.description}
          showCharacterCount={true}
          maxLength={1000}
          minRows={3}
        />
      </section>

      {/* Device Details */}
      <section>
        <h3>Device Details</h3>

        <EnhancedSelect
          {...register('device_type')}
          label="Device Type"
          validation={getFieldValidation('device_type')}
          error={errors.device_type}
          options={[
            { value: '', label: 'Select device type' },
            { value: 'software', label: 'Software' },
            { value: 'hardware', label: 'Hardware' },
          ]}
        />

        {deviceType === 'software' && (
          <EnhancedInput
            {...register('software_version')}
            label="Software Version"
            validation={getFieldValidation('software_version')}
            error={errors.software_version}
            placeholder="e.g., 1.0.0"
          />
        )}
      </section>

      <AutoSaveIndicator
        isSaving={isSaving}
        lastSaved={lastSaved}
      />

      <button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Saving...' : 'Save Project'}
      </button>
    </form>
  );
}
```

## Testing Migration

### Unit Tests

```typescript
import { renderHook, act } from '@testing-library/react';
import { useEnhancedForm } from '@/hooks/use-enhanced-form';
import { contactSchema } from './contact-form';

describe('ContactForm Migration', () => {
  it('maintains existing validation behavior', async () => {
    const { result } = renderHook(() =>
      useEnhancedForm({ schema: contactSchema })
    );

    // Test validation
    await act(async () => {
      await result.current.validateField('email', 'invalid-email');
    });

    const validation = result.current.getFieldValidation('email');
    expect(validation.isValid).toBe(false);
    expect(validation.message).toContain('Invalid email');
  });

  it('adds auto-save functionality', async () => {
    const mockSave = jest.fn();
    const { result } = renderHook(() =>
      useEnhancedForm({
        schema: contactSchema,
        autoSave: {
          enabled: true,
          onSave: mockSave,
        },
      })
    );

    await act(async () => {
      await result.current.saveNow();
    });

    expect(mockSave).toHaveBeenCalled();
  });
});
```

### Integration Tests

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactForm } from './contact-form';

describe('ContactForm Integration', () => {
  it('preserves existing form behavior', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = jest.fn();

    render(<ContactForm onSubmit={mockOnSubmit} />);

    // Fill form
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/message/i), 'Hello world');

    // Submit
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Hello world',
      });
    });
  });

  it('adds enhanced features', async () => {
    const user = userEvent.setup();
    render(<ContactForm onSubmit={jest.fn()} />);

    // Type in name field
    await user.type(screen.getByLabelText(/name/i), 'Test');

    // Should show character count
    expect(screen.getByText('4/100')).toBeInTheDocument();

    // Should show auto-save indicator
    await waitFor(() => {
      expect(screen.getByText(/auto-saved/i)).toBeInTheDocument();
    });
  });
});
```

## Common Migration Issues

### Issue 1: Validation Schema Conversion

**Problem:** Complex validation rules don't translate directly to Zod.

**Solution:** Break down complex rules into multiple refinements:

```typescript
// Complex validation
const schema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine((val) => /[A-Z]/.test(val), 'Must contain uppercase letter')
    .refine((val) => /[a-z]/.test(val), 'Must contain lowercase letter')
    .refine((val) => /\d/.test(val), 'Must contain number')
    .refine((val) => /[!@#$%^&*]/.test(val), 'Must contain special character'),
});
```

### Issue 2: Auto-save Conflicts

**Problem:** Multiple forms saving to the same storage key.

**Solution:** Use unique storage keys:

```typescript
const form = useEnhancedForm({
  autoSave: {
    storageKey: `${formType}-${userId}-${timestamp}`,
  },
});
```

### Issue 3: Performance Issues

**Problem:** Real-time validation causing performance problems.

**Solution:** Adjust debounce settings and optimize validation:

```typescript
const form = useEnhancedForm({
  realTimeValidation: {
    enabled: true,
    debounceMs: 500, // Increase debounce
  },
});
```

### Issue 4: Accessibility Regressions

**Problem:** Enhanced features breaking existing accessibility.

**Solution:** Test with screen readers and adjust settings:

```typescript
const form = useEnhancedForm({
  accessibility: {
    announceErrors: true,
    focusFirstError: true,
  },
});
```

## Migration Checklist

### Pre-Migration

- [ ] Assess current form implementation
- [ ] Identify enhancement opportunities
- [ ] Plan migration timeline
- [ ] Set up testing environment

### During Migration

- [ ] Create validation schema
- [ ] Update form hook
- [ ] Replace form components
- [ ] Add enhanced features
- [ ] Update tests

### Post-Migration

- [ ] Verify all functionality works
- [ ] Test accessibility features
- [ ] Monitor performance
- [ ] Gather user feedback
- [ ] Document changes

## Best Practices

1. **Gradual Migration:**
   - Migrate one form at a time
   - Test thoroughly before moving to next form
   - Keep old implementation as fallback initially

2. **Validation Schema Design:**
   - Start with simple validation rules
   - Add complex rules incrementally
   - Provide clear error messages

3. **Auto-save Configuration:**
   - Use appropriate save intervals
   - Handle storage errors gracefully
   - Provide user feedback

4. **Performance Monitoring:**
   - Monitor form performance after migration
   - Adjust settings based on usage patterns
   - Use React DevTools Profiler

5. **User Experience:**
   - Maintain familiar form behavior
   - Add enhancements gradually
   - Provide clear feedback for new features

## Rollback Strategy

If issues arise during migration, follow this rollback strategy:

1. **Immediate Rollback:**

   ```typescript
   // Keep old implementation available
   const USE_ENHANCED_FORM = process.env.REACT_APP_USE_ENHANCED_FORM === 'true';

   export function MyForm() {
     if (USE_ENHANCED_FORM) {
       return <EnhancedMyForm />;
     }
     return <OriginalMyForm />;
   }
   ```

2. **Gradual Rollback:**
   - Disable enhanced features one by one
   - Identify specific problematic features
   - Fix issues and re-enable features

3. **Complete Rollback:**
   - Revert to original implementation
   - Analyze migration issues
   - Plan improved migration approach

## Support and Resources

- **Documentation:** [Enhanced Form System Documentation](./enhanced-form-system.md)
- **Examples:** See `src/components/projects/project-form.tsx`
- **Testing:** See `src/__tests__/integration/enhanced-form-workflow.integration.test.tsx`
- **Performance:** See `src/__tests__/performance/enhanced-form-performance.test.tsx`

For additional support, consult the development team or create an issue in the project repository.

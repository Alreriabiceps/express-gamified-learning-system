# Admin System Documentation

## Overview

The admin system provides comprehensive management capabilities for educational content, user management, and system administration. This document outlines the architecture, components, and usage patterns.

## Architecture

### Component Structure

```
admin/
├── pages/
│   ├── dashboard/          # Main admin dashboard
│   ├── questions/          # Question management
│   ├── students/           # Student management
│   ├── subjects/           # Subject management
│   ├── weeks/              # Week schedule management
│   ├── reviewer/           # Reviewer management
│   └── settings/           # System settings
├── __tests__/              # Unit tests
└── README.md               # This documentation
```

### Shared Utilities

```
shared/
├── components/             # Reusable UI components
├── hooks/                  # Custom React hooks
├── utils/                  # Utility functions
└── services/               # API services
```

## Core Features

### 1. Question Management

- **Individual Question Creation**: Create questions with multiple choice answers
- **Batch Upload**: CSV-based bulk question import
- **AI Generation**: Multiple AI-powered question generation methods
- **Question Validation**: Comprehensive validation for question data
- **Bloom's Taxonomy**: Support for all cognitive levels

### 2. Student Management

- **Student Registration**: Bulk and individual student addition
- **Account Management**: Password reset, account status
- **Performance Tracking**: Monitor student progress and results

### 3. Week Schedule Management

- **Dynamic Scheduling**: Drag-and-drop question arrangement
- **Validation**: Automatic validation of schedule requirements
- **Analytics**: Real-time performance metrics and recommendations
- **Auto-save**: Draft saving and recovery

### 4. Subject Management

- **Subject Creation**: Add new subjects and categories
- **Content Organization**: Organize questions by subject
- **Hierarchical Structure**: Support for subject hierarchies

## Key Components

### LoadingSpinner

Reusable loading component with configurable sizes and text.

```jsx
import LoadingSpinner from "../../../shared/components/LoadingSpinner";

<LoadingSpinner size="lg" text="Loading questions..." className="my-4" />;
```

### Error Handling

Centralized error handling with consistent user feedback.

```jsx
import { handleApiError } from "../../../shared/utils/errorHandler";

try {
  const response = await fetch("/api/questions");
  if (!response.ok) throw response;
  // Handle success
} catch (error) {
  handleApiError(error, setError, "Failed to load questions");
}
```

### Form Validation

Comprehensive validation utilities for forms.

```jsx
import {
  validateRequired,
  validateQuestion,
} from "../../../shared/utils/formValidation";

const errors = validateRequired(formData, ["title", "description"]);
const questionErrors = validateQuestion(questionData);
```

### Performance Monitoring

Track and optimize admin operations.

```jsx
import { usePerformanceMonitor } from "../../../shared/utils/performanceMonitor";

const { startRender, endRender } = usePerformanceMonitor("QuestionList");

useEffect(() => {
  const operationId = startRender();
  // Component logic
  endRender(operationId, "success");
}, []);
```

## State Management

### Local State

Each component manages its own state using React hooks:

- `useState` for component state
- `useEffect` for side effects
- `useCallback` for memoized functions
- `useMemo` for computed values

### Data Persistence

- **Local Storage**: Draft saving, user preferences
- **API Integration**: Real-time data synchronization
- **Auto-save**: Automatic draft preservation

## API Integration

### Authentication

All admin API calls require a valid JWT token:

```jsx
const token = localStorage.getItem("token");
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};
```

### Error Handling

Consistent error handling across all API calls:

```jsx
const handleApiCall = async () => {
  try {
    const response = await fetch("/api/endpoint", { headers });
    if (!response.ok) throw response;
    return await response.json();
  } catch (error) {
    handleApiError(error, setError);
  }
};
```

## Responsive Design

### Mobile-First Approach

- Responsive grid layouts
- Touch-friendly interactions
- Optimized for small screens

### Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Usage

```jsx
import { useResponsive } from "../../../shared/hooks/useResponsive";

const { isMobile, isTablet, isDesktop, getResponsiveClasses } = useResponsive();

const classes = getResponsiveClasses({
  mobile: "text-sm p-2",
  tablet: "text-base p-3",
  desktop: "text-lg p-4",
});
```

## Testing

### Unit Tests

Comprehensive test coverage for utilities and components:

```bash
npm run test
npm run test:coverage
```

### Test Structure

- **Form Validation**: Test all validation functions
- **Error Handling**: Test error scenarios and responses
- **API Integration**: Mock API calls and responses
- **Component Rendering**: Test component behavior

## Performance Optimization

### Code Splitting

- Lazy loading of admin pages
- Dynamic imports for heavy components
- Bundle size optimization

### Memoization

- `useCallback` for stable function references
- `useMemo` for expensive calculations
- React.memo for component memoization

### Virtual Scrolling

- Large list optimization
- Efficient rendering of question lists
- Smooth scrolling performance

## Security Considerations

### Authentication

- JWT token validation
- Automatic token refresh
- Secure logout procedures

### Authorization

- Role-based access control
- Admin-only endpoints
- Input validation and sanitization

### Data Protection

- Secure API communication
- Input sanitization
- XSS prevention

## Best Practices

### Code Organization

1. **Single Responsibility**: Each component has one clear purpose
2. **Separation of Concerns**: UI, logic, and data handling are separated
3. **Reusability**: Common functionality is extracted to utilities
4. **Consistency**: Uniform patterns across all admin pages

### Error Handling

1. **User-Friendly Messages**: Clear, actionable error messages
2. **Graceful Degradation**: System continues to function when possible
3. **Logging**: Comprehensive error logging for debugging
4. **Recovery**: Automatic retry mechanisms where appropriate

### Performance

1. **Lazy Loading**: Load components and data on demand
2. **Debouncing**: Limit API calls and user input processing
3. **Caching**: Cache frequently accessed data
4. **Optimization**: Regular performance audits and improvements

## Troubleshooting

### Common Issues

#### Linter Errors

- Run `npm run lint` to identify issues
- Fix unused variables and imports
- Ensure proper dependency arrays in useEffect

#### API Errors

- Check authentication token validity
- Verify API endpoint availability
- Review network connectivity

#### Performance Issues

- Monitor component re-renders
- Check for memory leaks
- Optimize expensive operations

### Debug Tools

- React Developer Tools
- Browser DevTools
- Performance monitoring utilities
- Error tracking and logging

## Future Enhancements

### Planned Features

- **Advanced Analytics**: Enhanced reporting and insights
- **Bulk Operations**: More efficient bulk management tools
- **Real-time Updates**: WebSocket integration for live updates
- **Advanced Search**: Full-text search and filtering

### Technical Improvements

- **TypeScript Migration**: Enhanced type safety
- **State Management**: Redux or Zustand integration
- **Testing**: E2E testing with Playwright
- **CI/CD**: Automated testing and deployment

## Contributing

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Start development server: `npm run dev`

### Code Standards

- Follow ESLint configuration
- Use Prettier for formatting
- Write comprehensive tests
- Document new features

### Pull Request Process

1. Create feature branch
2. Implement changes with tests
3. Update documentation
4. Submit PR with detailed description

## Support

For technical support or questions:

- Check existing documentation
- Review issue tracker
- Contact development team
- Submit bug reports with detailed information

---

_Last updated: December 2024_
_Version: 1.0.0_

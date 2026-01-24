# AGENTS.md - Winter Points Bonus System

This is a Chinese language gamification web application for children's winter vacation point management system. The application allows kids to earn points through daily tasks and redeem rewards.

## Project Overview

- **Type**: Frontend-only HTML/CSS/JavaScript application
- **Language**: Chinese (zh-CN)
- **Target Audience**: Children and parents
- **Storage**: LocalStorage for data persistence
- **Configuration**: JSON files for tasks and rewards

## File Structure

```
├── index.html          # Main application file (HTML/CSS/JS)
├── tasks.txt           # Task configuration (JSON array)
├── rewards.txt         # Reward configuration (JSON array)
├── README.txt          # Chinese documentation
└── AGENTS.md           # This file
```

## Development Commands

Since this is a static HTML application, there are no build tools. Use these commands:

```bash
# Start local development server
python -m http.server 8000
# or
npx serve .

# Open in browser
# Navigate to http://localhost:8000
```

## Code Style Guidelines

### HTML Structure
- Use semantic HTML5 tags
- Maintain proper indentation (4 spaces)
- Keep CSS in `<style>` tag within `<head>`
- Keep JavaScript in `<script>` tag at end of `<body>`

### CSS Conventions
- Use BEM-like naming for classes (`.page`, `.btn-primary`, `.list-item`)
- Mobile-first responsive design
- Use CSS Grid and Flexbox for layouts
- Maintain consistent color scheme with gradients
- Use CSS custom properties for repeated values

### JavaScript Standards
- Use `const` and `let` instead of `var`
- Use async/await for asynchronous operations
- Use camelCase for variable and function names
- Use descriptive function names in English
- Use Chinese strings for user-facing text
- Handle errors gracefully with try-catch blocks

### Data Management
- Use LocalStorage for data persistence
- Store data as JSON strings
- Use fallback data when external files fail to load
- Implement proper data validation

### UI/UX Patterns
- Use emoji extensively for visual appeal
- Implement smooth transitions and animations
- Use modal messages instead of alerts
- Ensure mobile-friendly touch targets
- Use gradient backgrounds for visual appeal

## Configuration Files

### tasks.txt Format
```json
[
    {
        "name": "任务名称 📚",
        "points": 10
    }
]
```

### rewards.txt Format
```json
[
    {
        "name": "奖励名称 🎁",
        "points": 20
    }
]
```

## Key Features Implementation

### Daily Reset System
- Tasks reset at 7:00 AM daily
- Check `lastResetDate` and `resetAt7Today` flags
- Use `toDateString()` for date comparison

### Point Management
- Points stored as integer in LocalStorage
- Support both positive and negative point adjustments
- Update UI immediately after point changes

### Message System
- Use custom modal instead of alerts
- Include emoji for visual appeal
- Auto-hide after 2-3 seconds
- Support HTML content in messages

### Page Navigation
- Use `showPage(pageId)` function for navigation
- Update content dynamically when switching pages
- Maintain scroll position on page changes

## Testing Guidelines

Since this is a frontend application without testing framework:

1. **Manual Testing Checklist**:
   - Test daily sign-in functionality
   - Verify task completion and point awarding
   - Test reward redemption with sufficient/insufficient points
   - Check manual point addition feature
   - Verify daily reset at 7:00 AM
   - Test LocalStorage persistence

2. **Browser Compatibility**:
   - Test in modern browsers (Chrome, Firefox, Safari, Edge)
   - Verify mobile responsiveness
   - Check touch interactions on mobile devices

3. **Configuration Testing**:
   - Test with invalid JSON in config files
   - Verify fallback to default data
   - Test configuration updates without page refresh

## Common Issues and Solutions

### Configuration Loading
- Always wrap fetch operations in try-catch
- Provide fallback data when external files fail
- Use LocalStorage to cache loaded configurations

### Date/Time Handling
- Use `toLocaleString('zh-CN')` for Chinese date formatting
- Be careful with timezone differences
- Use `toDateString()` for date comparisons

### LocalStorage Limits
- Keep data structures simple
- Avoid storing large amounts of data
- Implement proper error handling for quota exceeded

## Security Considerations

- No server-side components, minimal security risks
- Validate user input for manual point additions
- Use parseInt() for number conversion
- Sanitize any user-provided content before display

## Performance Optimization

- Minimize DOM manipulations
- Use event delegation where appropriate
- Cache frequently accessed DOM elements
- Implement efficient rendering for lists

## Internationalization

- Currently Chinese-only (zh-CN)
- All user-facing text should be in Chinese
- Use proper Chinese punctuation and formatting
- Consider cultural appropriateness of emoji and content
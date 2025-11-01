# My Gantt - Project Gantt Chart Application

A feature-rich modern Gantt chart application for project management and task tracking.

## Features

- ✅ **Task Management**: Create, edit, and delete tasks
- ✅ **Timeline View**: Switch between day/week/month views
- ✅ **Drag & Drop**: Adjust task timelines by dragging
- ✅ **Progress Tracking**: Visualize task completion progress
- ✅ **Resource Allocation**: Assign assignees to tasks
- ✅ **Data Persistence**: Auto-save to local storage
- ✅ **Responsive Design**: Adapts to different screen sizes
- ✅ **Multi-language Support**: Supports Chinese, English, and Japanese

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** - Build tool
- **date-fns** - Date handling
- **CSS3** - Styling and animations

## Quick Start

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/          # React components
│   ├── GanttChart/     # Main Gantt chart component
│   ├── TaskBar/        # Task bar component
│   ├── TaskForm/       # Task form component
│   ├── Timeline/       # Timeline component
│   └── LanguageSwitcher/ # Language switcher component
├── contexts/           # React contexts
│   └── I18nContext.tsx # Internationalization context
├── utils/              # Utility functions
│   ├── dateUtils.ts    # Date handling utilities
│   └── storage.ts      # Local storage utilities
├── types.ts            # TypeScript type definitions
├── App.tsx             # Main application component
└── main.tsx            # Entry file
```

## Usage

1. **Create Tasks**: Click the "New Task" button and fill in task information
2. **Edit Tasks**: Click the "Edit" button in the task list
3. **Adjust Timeline**: Drag task bars directly on the Gantt chart
4. **Switch Views**: Use the day/week/month view buttons at the top
5. **View Progress**: The darker portion of task bars indicates completion progress
6. **Switch Language**: Click the globe icon in the top right corner to change language

## Future Plans

- [ ] Task dependency visualization
- [ ] Multi-project support
- [ ] Export functionality (PDF/Excel)
- [ ] Collaboration features
- [ ] Milestone markers
- [ ] Resource management

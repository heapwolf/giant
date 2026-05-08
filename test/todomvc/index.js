import { component, createRoot } from '../../giant.js';

component.enableGlobals()

export const TodoApp = component(function TodoApp(initialState = {}) {
  // Allow passing initial state for SSR and tests
  this.state.todos ??= initialState.todos || [];
  this.state.filter ??= initialState.filter || 'all';

  const { todos, filter } = this.state;

  // 2. Computed Values
  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);
  const visibleTodos = filter === 'active' ? activeTodos :
                       filter === 'completed' ? completedTodos :
                       todos;

  // 3. Event Handlers
  const addTodo = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      // 1. Update the state
      this.state.todos = [
        ...todos,
        { id: Date.now(), title: e.target.value.trim(), completed: false }
      ];

      // 2. Clear the input field
      e.target.value = '';
    }
  };

  const toggleTodo = (id) => {
    this.state.todos = todos.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
  };

  const destroyTodo = (id) => {
    this.state.todos = todos.filter(t => t.id !== id);
  };

  const toggleAll = (e) => {
    const completed = e.target.checked;
    this.state.todos = todos.map(t => ({ ...t, completed }));
  };

  const clearCompleted = () => {
    this.state.todos = activeTodos;
  };

  const setFilter = (newFilter) => (e) => {
    e.preventDefault();
    this.state.filter = newFilter;
  };

  // 4. View / Virtual-DOM-less Render Tree
  // Note: section, header, h1, input, etc. are globally available via GIANT
  return section({ class: 'todoapp' },

    header({ class: 'header' },
      h1('todos'),
      input({
        class: 'new-todo',
        placeholder: 'What needs to be done?',
        autofocus: true,
        onKeyup: addTodo
      })
    ),

    // Main section: hidden if no todos exist
    todos.length > 0 ? section({ class: 'main' },
      input({
        id: 'toggle-all',
        class: 'toggle-all',
        type: 'checkbox',
        checked: activeTodos.length === 0,
        onChange: toggleAll
      }),
      label({ for: 'toggle-all' }, 'Mark all as complete'),

      ul({ class: 'todo-list' },
        visibleTodos.map(todo =>
          li({
            key: todo.id, // structural integrity
            class: todo.completed ? 'completed' : ''
          },
            div({ class: 'view' },
              input({
                class: 'toggle',
                type: 'checkbox',
                checked: todo.completed,
                onChange: () => toggleTodo(todo.id)
              }),
              label(todo.title),
              button({
                class: 'destroy',
                onClick: () => destroyTodo(todo.id)
              })
            )
          )
        )
      )
    ) : '',

    // Footer section: hidden if no todos exist
    todos.length > 0 ? footer({ class: 'footer' },
      span({ class: 'todo-count' },
        strong(activeTodos.length.toString()),
        activeTodos.length === 1 ? ' item left' : ' items left'
      ),
      ul({ class: 'filters' },
        li(a({
          class: filter === 'all' ? 'selected' : '',
          href: '#/',
          onClick: setFilter('all')
        }, 'All')),
        li(a({
          class: filter === 'active' ? 'selected' : '',
          href: '#/active',
          onClick: setFilter('active')
        }, 'Active')),
        li(a({
          class: filter === 'completed' ? 'selected' : '',
          href: '#/completed',
          onClick: setFilter('completed')
        }, 'Completed'))
      ),
      // Clear completed button: hidden if no completed todos exist
      completedTodos.length > 0 ? button({
        class: 'clear-completed',
        onClick: clearCompleted
      }, 'Clear completed') : ''
    ) : ''
  );
})

// Mounts <todo-app> onto the DOM
if (globalThis.window && !globalThis.IS_PERF_TEST) {
  createRoot(TodoApp);
}

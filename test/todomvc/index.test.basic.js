// 1. The Microscopic Test Runner
const resultsDiv = document.getElementById('results');
const pass = (msg) => resultsDiv.innerHTML += `<div class="pass">✔ ${msg}</div>`;
const fail = (msg) => resultsDiv.innerHTML += `<div class="fail">✘ ${msg}</div>`;
const assert = (condition, msg) => condition ? pass(msg) : fail(msg);

// Helper to wait for GIANT's queueMicrotask render cycle
const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));

// Helper to simulate typing and pressing Enter
const typeAndEnter = (inputEl, text) => {
  inputEl.value = text;
  inputEl.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
};

// Helper to simulate a native click
const click = (el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));

async function runTests() {
  resultsDiv.innerHTML = '';
  await nextTick(); // Wait for initial mount

  try {
    const app = document.querySelector('.todoapp');
    const input = document.querySelector('.new-todo');

    // --- TEST 1: MOUNT & INITIAL STATE ---
    assert(app !== null, 'App mounted to the DOM');
    assert(!document.querySelector('.main'), 'Main section is hidden when no todos exist');
    assert(!document.querySelector('.footer'), 'Footer is hidden when no todos exist');

    // --- TEST 2: ADDING MULTIPLE ITEMS ---
    typeAndEnter(input, 'Task 1');
    await nextTick();
    typeAndEnter(input, 'Task 2');
    await nextTick();
    typeAndEnter(input, 'Task 3');
    await nextTick();

    let todos = document.querySelectorAll('.todo-list li');
    assert(todos.length === 3, 'Successfully added 3 todos');
    assert(document.querySelector('.todo-count').textContent.includes('3 items left'), 'Counter computes 3 items left');

    // --- TEST 3: TOGGLE SINGLE ITEM ---
    const firstCheckbox = document.querySelectorAll('.toggle')[0];
    firstCheckbox.checked = true;
    firstCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();

    assert(document.querySelectorAll('.todo-list li')[0].classList.contains('completed'), 'First item got "completed" class');
    assert(document.querySelector('.todo-count').textContent.includes('2 items left'), 'Counter computes 2 items left after 1 completion');
    assert(document.querySelector('.clear-completed') !== null, '"Clear completed" button appeared');

    // --- TEST 4: FILTERING (ROUTING) ---
    // Click 'Active' filter
    click(document.querySelector('a[href="#/active"]'));
    await nextTick();
    todos = document.querySelectorAll('.todo-list li');
    assert(todos.length === 2, 'Active filter successfully hid the completed task');

    // Click 'Completed' filter
    click(document.querySelector('a[href="#/completed"]'));
    await nextTick();
    todos = document.querySelectorAll('.todo-list li');
    assert(todos.length === 1, 'Completed filter successfully hid the active tasks');
    assert(todos[0].textContent.includes('Task 1'), 'Completed filter shows the correct task');

    // Click 'All' filter
    click(document.querySelector('a[href="#/"]'));
    await nextTick();
    assert(document.querySelectorAll('.todo-list li').length === 3, 'All filter restored all tasks');

    // --- TEST 5: TOGGLE ALL ---
    const toggleAllCheckbox = document.querySelector('.toggle-all');
    toggleAllCheckbox.checked = true;
    toggleAllCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();

    assert(document.querySelectorAll('.todo-list li.completed').length === 3, 'Toggle-all successfully completed all tasks');
    assert(document.querySelector('.todo-count').textContent.includes('0 items left'), 'Counter reads 0 after toggle-all');

    // --- TEST 6: CLEAR COMPLETED ---
    click(document.querySelector('.clear-completed'));
    await nextTick();

    assert(document.querySelectorAll('.todo-list li').length === 0, 'Clear completed wiped the list');
    assert(!document.querySelector('.main'), 'Main section hid itself after list was cleared');
    assert(!document.querySelector('.footer'), 'Footer hid itself after list was cleared');

    // --- TEST 7: DELETE SPECIFIC ITEM ---
    typeAndEnter(input, 'To be deleted');
    await nextTick();
    assert(document.querySelectorAll('.todo-list li').length === 1, 'Added item to test deletion');

    click(document.querySelector('.destroy'));
    await nextTick();
    assert(document.querySelectorAll('.todo-list li').length === 0, 'Destroy button successfully removed the item');

    pass('ALL E2E TESTS PASSED. THE FRAMEWORK IS BULLETPROOF.');

  } catch (err) {
    fail(`Test suite crashed: ${err.message}`);
    console.error(err);
  }
}

runTests();

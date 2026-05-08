import { testAccordion } from './accordion/accordion.test.js';
import { testAlert } from './alert/alert.test.js';
import { testAvatar } from './avatar/avatar.test.js';
import { testBadge } from './badge/badge.test.js';
import { testButton } from './button/button.test.js';
import { testCard } from './card/card.test.js';
import { testCharts } from './charts/charts.test.js';
import { testDialog } from './dialog/dialog.test.js';
import { testCheckbox } from './checkbox/checkbox.test.js';
import { testInput } from './input/input.test.js';
import { testDropdown } from './dropdown/dropdown.test.js';
import { testLabel } from './label/label.test.js';
import { testMenu } from './menu/menu.test.js';
import { testProgress } from './progress/progress.test.js';
import { testRadio } from './radio/radio.test.js';
import { testSeparator } from './separator/separator.test.js';
import { testSlider } from './slider/slider.test.js';
import { testSpinner } from './spinner/spinner.test.js';
import { testTabs } from './tabs/tabs.test.js';
import { testSwitch } from './switch/switch.test.js';
import { testText } from './text/text.test.js';
import { testTextarea } from './textarea/textarea.test.js';
import { testTooltip } from './tooltip/tooltip.test.js';

const testSuites = [
  { name: 'Accordion', run: testAccordion },
  { name: 'Alert', run: testAlert },
  { name: 'Avatar', run: testAvatar },
  { name: 'Badge', run: testBadge },
  { name: 'Button', run: testButton },
  { name: 'Card', run: testCard },
  { name: 'Chart', run: testCharts },
  { name: 'Dialog', run: testDialog },
  { name: 'Checkbox', run: testCheckbox },
  { name: 'Input', run: testInput },
  { name: 'Dropdown', run: testDropdown },
  { name: 'Label', run: testLabel },
  { name: 'Progress', run: testProgress },
  { name: 'Menu', run: testMenu },
  { name: 'Radio', run: testRadio },
  { name: 'Separator', run: testSeparator },
  { name: 'Slider', run: testSlider },
  { name: 'Spinner', run: testSpinner },
  { name: 'Switch', run: testSwitch },
  { name: 'Tabs', run: testTabs },
  { name: 'Text', run: testText },
  { name: 'Textarea', run: testTextarea },
  { name: 'Tooltip', run: testTooltip }
];

const resultsDiv = document.getElementById('results');
const mountPoint = document.getElementById('test-mount');

let stats = { total: 0, passed: 0, failed: 0 };

// Update the visual dashboard
const updateDashboard = () => {
  document.getElementById('stat-total').textContent = `Total: ${stats.total}`;
  document.getElementById('stat-passed').textContent = `Passed: ${stats.passed}`;
  document.getElementById('stat-failed').textContent = `Failed: ${stats.failed}`;
};

// Create a localized assertion context for each suite
const createAssertContext = (suiteContainer) => {
  return (condition, msg) => {
    stats.total++;
    const el = document.createElement('div');
    if (condition) {
      stats.passed++;
      el.className = 'test-pass';
      el.innerHTML = `<span class="icon">✅</span> ${msg}`;
    } else {
      stats.failed++;
      el.className = 'test-fail';
      el.innerHTML = `<span class="icon">❌<icon> ${msg}`;
    }
    suiteContainer.appendChild(el);
    updateDashboard();
  };
};

async function runAllTests() {
  console.log('\n=== Running Giant.js Component Tests ===\n');

  for (const suite of testSuites) {
    console.log(`Running suite: ${suite.name}`);

    // Create UI for this suite's results
    const suiteContainer = document.createElement('div');
    suiteContainer.className = 'suite';
    suiteContainer.innerHTML = `<h3>${suite.name}</h3>`;
    resultsDiv.appendChild(suiteContainer);

    const assert = createAssertContext(suiteContainer);

    try {
      // Clear the mount point before the suite runs
      mountPoint.innerHTML = '';

      // Pass the mount point and the assert function to the suite
      await suite.run(mountPoint, assert);

    } catch (error) {
      stats.total++;
      stats.failed++;
      updateDashboard();

      const errEl = document.createElement('div');
      errEl.className = 'test-fail';
      errEl.innerHTML = `<span class="icon">❌</span> Suite crashed: ${error.message}`;
      suiteContainer.appendChild(errEl);
      console.error(`Error in ${suite.name} tests:`, error);
    }
  }

  console.log(`\n=== Test Summary ===`);
  console.log(`Total: ${stats.total} | Passed: ${stats.passed} | Failed: ${stats.failed}`);
  console.log(`Success Rate: ${((stats.passed / Math.max(stats.total, 1)) * 100).toFixed(1)}%\n`);
}

// Kick off the runner
runAllTests();

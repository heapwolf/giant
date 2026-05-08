import { component, html, design, signal } from '../../../giant.js';

const { label, span } = html;

export const Label = component.Label((props, ...children) => {
  /**
   * @function Label
   * @description An accessible label associated with a form control.
   */
  const {
    class: className = '',
    htmlFor,
    for: forProp,
    required = false,
    disabled = false,
    style = {},
    ...rest
  } = props;

  const isDisabled = signal.disabled(disabled);
  const prevDisabled = signal._prevDisabled(disabled);

  // Sync prop to signal so the host node re-renders
  if (disabled !== undefined && disabled !== prevDisabled.value) {
    isDisabled.value = disabled;
    prevDisabled.value = disabled;
  }

  const targetId = htmlFor || forProp;

  return label(
    {
      ...rest,
      for: targetId,
      'data-disabled': isDisabled.value ? 'true' : 'false',
      class: [
        design.typography.size1,
        design.typography.weightMedium,
        design.typography.lineTight,
        isDisabled.value
          ? [design.effect.opacity50, design.interaction.cursorNotAllowed]
          : design.interaction.cursorPointer,
        className
      ],
      style: {
        display: 'inline-block',
        verticalAlign: 'middle',
        ...style
      }
    },
    ...children,
    required ? span(
      {
        'aria-hidden': 'true',
        class: [design.fg.dangerFg],
        style: { marginLeft: '0.125rem', userSelect: 'none' }
      },
      '*'
    ) : null
  );
});

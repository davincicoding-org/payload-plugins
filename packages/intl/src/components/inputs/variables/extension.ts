import type { VirtualElement } from '@floating-ui/dom';
import { computePosition, flip, shift } from '@floating-ui/dom';
import type { MentionOptions } from '@tiptap/extension-mention';
import Mention from '@tiptap/extension-mention';
import type { Attribute, Editor } from '@tiptap/react';
import {
  posToDOMRect,
  ReactNodeViewRenderer,
  ReactRenderer,
} from '@tiptap/react';
import type { SuggestionKeyDownProps } from '@tiptap/suggestion';
import type { TemplateVariable, VariableMentionNodeAttrs } from '@/types';

import { formatVariableLabel } from '@/utils/format';
import { isTagElement, isTemporalElement } from '@/utils/guards';
import { serializeICUMessage } from '@/utils/icu-tranform';
import { VariableChip } from './VariableChip';
import type { VariableSuggestionProps } from './VariableSuggestion';
import { VariableSuggestion } from './VariableSuggestion';

export function VariableMention(variables: TemplateVariable[]) {
  return Mention.extend<
    MentionOptions<VariableMentionNodeAttrs, VariableMentionNodeAttrs>
  >({
    name: 'variable',
    addNodeView: () => ReactNodeViewRenderer(VariableChip),
    addAttributes: () =>
      ({
        name: { default: null },
        icu: { default: null },
        label: { default: null },
      }) satisfies Record<keyof VariableMentionNodeAttrs, Attribute>,
    renderText: ({ node }) => node.attrs.icu,
  }).configure({
    HTMLAttributes: {
      class: 'variable',
    },
    suggestions: [
      createSuggestion('@', variables),
      createSuggestion(
        '{',
        variables.filter((variable) => !isTagElement(variable)),
      ),
      createSuggestion(
        '<',
        variables.filter((variable) => isTagElement(variable)),
      ),
    ],
  });
}

function createSuggestion(
  char: string,
  variables: TemplateVariable[],
): MentionOptions<
  VariableMentionNodeAttrs,
  VariableMentionNodeAttrs
>['suggestion'] {
  const items = variables.map((variable) => ({
    name: variable.value,
    label: formatVariableLabel(variable),
    icu: serializeICUMessage([variable]),
  }));

  function updatePosition(editor: Editor, element: HTMLElement): void {
    const virtualElement: VirtualElement = {
      getBoundingClientRect: () =>
        posToDOMRect(
          editor.view,
          editor.state.selection.from,
          editor.state.selection.to,
        ),
    };

    void computePosition(virtualElement, element, {
      placement: 'bottom-start',
      strategy: 'absolute',
      middleware: [shift(), flip()],
    }).then(({ x, y, strategy }) => {
      element.style.width = 'max-content';
      element.style.position = strategy;
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
    });
  }

  return {
    char,
    items: ({ query }) =>
      items.filter((item) =>
        item.name.toLowerCase().startsWith(query.toLowerCase()),
      ),
    render: () => {
      let component: ReactRenderer<
        { onKeyDown(props: SuggestionKeyDownProps): boolean },
        VariableSuggestionProps
      >;

      const scrollableElement = document.getElementById(
        'messages-form-content',
      );

      return {
        onStart: (props) => {
          component = new ReactRenderer<
            { onKeyDown(props: SuggestionKeyDownProps): boolean },
            VariableSuggestionProps
          >(VariableSuggestion, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) return;

          scrollableElement!.style.overflow = 'hidden';

          const element = component.element;
          element.style.position = 'absolute';
          document.body.appendChild(element);

          updatePosition(props.editor, element);
        },

        onUpdate(props) {
          component.updateProps(props);

          if (!props.clientRect) return;

          updatePosition(props.editor, component.element);
        },

        onKeyDown(props) {
          if (props.event.key === 'Escape') {
            component.destroy();
            return true;
          }
          if (!component.ref) return false;

          return component.ref.onKeyDown(props);
        },

        onExit() {
          component.element.remove();
          component.destroy();
          scrollableElement!.style.overflow = '';
        },
      };
    },
  };
}

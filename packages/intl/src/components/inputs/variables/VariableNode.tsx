'use client';

import type {
  EditorConfig,
  LexicalEditor,
} from '@payloadcms/richtext-lexical/lexical';
import {
  BeautifulMentionNode,
  type SerializedBeautifulMentionNode,
} from 'lexical-beautiful-mentions';

import { VariableChip } from './VariableChip';

export class VariableMentionNode extends BeautifulMentionNode {
  static getType(): string {
    return 'variableMention';
  }

  static clone(node: VariableMentionNode): VariableMentionNode {
    return new VariableMentionNode(
      node.__trigger,
      node.__value,
      node.__data,
      node.__key,
    );
  }

  static importJSON(
    serializedNode: SerializedBeautifulMentionNode,
  ): VariableMentionNode {
    return new VariableMentionNode(
      serializedNode.trigger,
      serializedNode.value,
      serializedNode.data,
    );
  }

  exportJSON(): SerializedBeautifulMentionNode {
    return {
      ...super.exportJSON(),
      type: 'variableMention',
    };
  }

  getTextContent(): string {
    const icu = this.__data?.icu;
    return typeof icu === 'string' ? icu : `{${this.__value}}`;
  }

  decorate(_editor: LexicalEditor, _config: EditorConfig): React.JSX.Element {
    const data = this.__data;
    return (
      <VariableChip
        icu={this.getTextContent()}
        label={typeof data?.label === 'string' ? data.label : this.__value}
        name={this.__value}
        nodeKey={this.__key}
      />
    );
  }
}

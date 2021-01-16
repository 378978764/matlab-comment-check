import { COMMANDS } from './utils/commands'
import { CancellationToken, CodeAction, CodeActionContext, CodeActionKind, CodeActionProvider, Command, Diagnostic, ProviderResult, Range, Selection, TextDocument, WorkspaceEdit } from "vscode";

import * as vscode from 'vscode'
import { downloadAndUnzipVSCode } from "vscode-test";
import { getCommentRange } from "./utils/commentUtils";
import { updateComment } from "./utils/variables";

export enum ACTIONS {
  FUNCTION_COMMMENT = 'FUNCTION_COMMENT',
  INSERT_TYPE = 'INSERT_TYPE'
}

export class CommonAction implements CodeActionProvider {
  provideCodeActions(doc: TextDocument, range: Range | Selection, context: CodeActionContext, token: CancellationToken): ProviderResult<(CodeAction | Command)[]> {
    return context.diagnostics
      .filter(v => v.code !== null)
      .map(v => {
        switch (v.code) {
          case ACTIONS.FUNCTION_COMMMENT:
            return this.createActionFunctionComment(doc)
          case ACTIONS.INSERT_TYPE:
            return this.createActionInsertType(doc, v)
          default:
            return this.createActionFunctionComment(doc)
        }
      })
  }

  private createActionFunctionComment(doc: TextDocument): CodeAction {
    // 然后更新函数注释
    const action = new CodeAction('更新函数注释', CodeActionKind.QuickFix)
    action.edit = new WorkspaceEdit()
    const rangeXY = getCommentRange(doc.getText())
    const range = new Range(
      doc.positionAt(rangeXY.start),
      doc.positionAt(rangeXY.end)
    )
    const newComment = updateComment(doc.getText())
    action.edit.replace(doc.uri, range, newComment)
    return action
  }

  private createActionInsertType(doc: TextDocument, v: Diagnostic): CodeAction {
    const action = new CodeAction('在类型文件中插入该类型', CodeActionKind.QuickFix)

    const typeName = v.message.split(' ')[1]
    action.edit = new WorkspaceEdit()
    action.command = {
      title: '在类型文件中插入类型',
      command: COMMANDS.INSERT_TYPE,
      arguments: [typeName]
    }
    return action
  }

  public static readonly providedCodeActionKinds = [
    CodeActionKind.QuickFix
  ];
}
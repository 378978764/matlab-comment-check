import { CancellationToken, CodeAction, CodeActionContext, CodeActionKind, CodeActionProvider, Command, Diagnostic, ProviderResult, Range, Selection, TextDocument, WorkspaceEdit } from "vscode";
import { getCommentRange } from "./utils/commentUtils";
import { readContent } from "./utils/reader";
import { updateComment } from "./utils/variables";

export class FunctionCommentAction implements CodeActionProvider {
  static ActionName = 'FUNCTION_COMMMENT'
  provideCodeActions(document: TextDocument, range: Range | Selection, context: CodeActionContext, token: CancellationToken): ProviderResult<(CodeAction | Command)[]> {
    return context.diagnostics
    .filter(v => v.code === FunctionCommentAction.ActionName)
    .map(v => this.createAction(document))
  }
  private createAction(doc: TextDocument): CodeAction {
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

  public static readonly providedCodeActionKinds = [
		CodeActionKind.QuickFix
	];
}
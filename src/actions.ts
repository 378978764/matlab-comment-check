import { CancellationToken, CodeAction, CodeActionContext, CodeActionKind, CodeActionProvider, Command, ProviderResult, Range, Selection, TextDocument, WorkspaceEdit } from "vscode";
import { getCommentRange } from "./utils/commentUtils";
import { updateComment } from "./utils/variables";

export class FunctionCommentAction implements CodeActionProvider {
  static ActionName = 'FUNCTION_COMMMENT'
  provideCodeActions(document: TextDocument, range: Range | Selection, context: CodeActionContext, token: CancellationToken): ProviderResult<(CodeAction | Command)[]> {
    return context.diagnostics
    .filter(v => v.code === FunctionCommentAction.ActionName)
    .map(() => this.createAction(document))
  }
  private createAction(doc: TextDocument): CodeAction {
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

  public static readonly providedCodeActionKinds = [
		CodeActionKind.QuickFix
	];
}
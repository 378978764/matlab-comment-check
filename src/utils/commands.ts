import { Range } from 'vscode'
import * as vscode from 'vscode'
import { extractFile, fileCommentToString, getCommentRange } from './commentUtils'
import { extractVariables, mergeVariables } from './variables'

function updateVariables(filePath: string) {
  const editor = vscode.window.activeTextEditor
  if (editor) {
    const doc = editor.document
    const content = editor.document.getText()
    const res = extractFile(content)
    const variables = extractVariables(content)
    // 合并新老
    res.variables = mergeVariables(res.variables, variables)
    // 写入编辑器
    const newComment = fileCommentToString(res)
    const rangeXY = getCommentRange(content)
    editor.edit(editBuilder => {
      const range = new Range(
        doc.positionAt(rangeXY.start),
        doc.positionAt(rangeXY.end)
      )
      editBuilder.replace(range, newComment)
    })
  } else {
    vscode.window.showWarningMessage('当前未打开 matlab 文件')
  }
}

export function registerCommands(context: vscode.ExtensionContext) {
  const prefix = 'matlabCommentCheck.'
  const commands = [updateVariables]
  for (let fun of commands) {
    context.subscriptions.push(vscode.commands.registerCommand(
      prefix + fun.name, fun
    ))
  }
}
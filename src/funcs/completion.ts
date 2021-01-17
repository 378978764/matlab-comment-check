import { TextDocument } from "vscode";
import * as vscode from 'vscode'
import tool from '../utils/tool'


/**
 * Auto-completion
 * @param {*} document current document
 */
function provideCompletionItems(document: TextDocument, position: vscode.Position) {
  const content = vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.getText();
  if (content) {
    let res: vscode.CompletionItem[]
    // struct member names
    let structNames = tool.getStructNames(document.fileName, content)
    // 去重
    structNames = structNames.filter(v => !structNames.find(vv => vv.name === v.name))
    const structCompletions = structNames.map(structName => {
      const completion = new vscode.CompletionItem(structName.name)
      completion.commitCharacters = ['.']
      return completion
    })
    // common commands
    let commands = tool.getCommands(document.fileName, content)
    commands = commands.filter(v => !structNames.find(structName => structName.name === v))
    const commandsCompletions = commands.map(
      (v) => new vscode.CompletionItem(v, vscode.CompletionItemKind.Field)
    )
    res = commandsCompletions.concat(structCompletions)
    return res
  }
  return []
}
/**
 * When the cursor selects the current autocomplete item, the action will be triggered. In general, no processing is required
 */
function resolveCompletionItem() {
  return null
}


export default function (context: vscode.ExtensionContext) {
  const provider1 = vscode.languages.registerCompletionItemProvider(
    "matlab",
    {
      provideCompletionItems,
      resolveCompletionItem,
    }
  )
  const provider2 = vscode.languages.registerCompletionItemProvider(
		'matlab',
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

				// get all text until the `position` and check if it reads `console.`
				// and if so then complete if `log`, `warn`, and `error`
        const linePrefix = document.lineAt(position).text.substr(0, position.character);

        const structNames = tool.getStructNames(document.fileName, document.getText())
        for (let structName of structNames) {
          const prefix = `${structName.name}.`
          if (linePrefix.endsWith(prefix)) {
            // 看一下当前文件中有没有新增加结构体，也就是在 structNames 还有没有同名的
            const nameList = structNames.filter(v => v.name === structName.name)
            // 然后加载一块
            const members = nameList.reduce((prev, current) => {
              return prev.concat(tool.findMemberNames(document.getText(), current))
            }, [] as string[])
            return members.map(v => new vscode.CompletionItem(
              v, vscode.CompletionItemKind.Method
            ))
          }
        }
        return undefined
			}
		},
		'.' // triggered whenever a '.' is being typed
  )
  // register the code
  context.subscriptions.push(provider1, provider2)
}

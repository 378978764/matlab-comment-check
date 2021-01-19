import { StructDetail } from './../utils/tool'
import { TextDocument } from "vscode";
import * as vscode from 'vscode'
import tool from '../utils/tool'
import { getTypeNames } from "../utils/typeReader";


/**
 * Auto-completion
 * @param {*} document current document
 */
function provideCompletionItems(document: TextDocument, position: vscode.Position) {
  const content = vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.getText();
  if (content) {
    let res: vscode.CompletionItem[]
    /**
     * 结构体变量
     */
    let structNames = tool.getStructNames(document.fileName, content)
    // 去重
    structNames = structNames.filter((v, i) => structNames.findIndex(vv => vv.name === v.name) !== i)
    const structCompletions = structNames.map(structName => {
      const completion = new vscode.CompletionItem(structName.name)
      completion.commitCharacters = ['.']
      return completion
    })
    /**
     * 普通变量
     */
    let commands = tool.getCommands(document.fileName, content)
    commands = commands.filter(v => !structNames.find(structName => structName.name === v))
    const commandsCompletions = commands.map(
      (v) => new vscode.CompletionItem(v, vscode.CompletionItemKind.Field)
    )
    /**
     * 结构体类型
     */

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

function provideMembersCompletionItems(document: TextDocument, position: vscode.Position) {

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
      let members: StructDetail[] = nameList.reduce((prev, current) => {
        return prev.concat(tool.findMemberNames(document.getText(), current, document.fileName))
      }, [] as StructDetail[])
      // 对 members 再次进行去重, 如果有重复的话，要求去掉没有 detail 的，留下有 detail 的
      let memberNames = members.map(v => v.name)
      memberNames = Array.from(new Set(memberNames))
      members = memberNames.map(v => {
        const validMembers = members.filter(member => member.name === v)
        if (validMembers.length === 1) {
          return validMembers[0]
        } else {
          const validMember = validMembers.find(v => typeof v.detail !== 'undefined')
          if (validMember) {
            return validMember
          } else {
            return validMembers[0]
          }
        }
      })
      return members.map(v => {
        const completionItem = new vscode.CompletionItem(
          v.name, vscode.CompletionItemKind.Method
        )
        completionItem.detail = v.detail
        return completionItem
      })
    }
  }
  return undefined
}

function provideTypesCompletionItems(document: TextDocument, position: vscode.Position) {

  const linePrefix = document.lineAt(position).text.substr(0, position.character);
  if (linePrefix.endsWith('-->')) {
    // 说明想要输入结构体类型
    const typeNames = getTypeNames()
    return typeNames.map(v => new vscode.CompletionItem(
      ` ${v}`,
      vscode.CompletionItemKind.Value
    ))
  }

  return undefined
}


export default function (context: vscode.ExtensionContext) {
  /**
   * 普通变量、结构体变量
   */
  const provider1 = vscode.languages.registerCompletionItemProvider(
    "matlab",
    {
      provideCompletionItems,
      resolveCompletionItem,
    }
  )
  /**
   * 结构体成员
   */
  const provider2 = vscode.languages.registerCompletionItemProvider(
    'matlab',
    {
      provideCompletionItems: provideMembersCompletionItems
    },
    '.'
  )
  /**
   * 结构体类型
   */
  const provider3 = vscode.languages.registerCompletionItemProvider(
    'matlab',
    {
      provideCompletionItems: provideTypesCompletionItems
    },
    '>'
  )

  // register the code
  context.subscriptions.push(provider1, provider2, provider3)
}

import { extractFunction, functionCommentToString, getHasMapping, ParamItem } from './commentUtils';
import TextUtils from "./TextUtils";

type VariableItem = {
  name: string,
  value: string,
  comment: string,
  range: {
    start: number,
    end: number
  },
  lineNumber: number
}

type FunctionVariable = {
  params: Array<VariableItem>,
  returns: Array<VariableItem>
}

type FunctionLine = {
  lineNumber: number,
  index: number
}

function getFunctionLine(content: string): FunctionLine {
  const functionRegex = /function\s/gm
  const functionRes = TextUtils.matchAll(content, functionRegex)
  if (functionRes.length > 0) {
    return {
      lineNumber: TextUtils.getLineNumber(content, functionRes[0].index),
      index: functionRes[0].index
    }
  } else {
    return {
      lineNumber: -1,
      index: -1
    }
  }
}


export function extractVariables(content: string): Array<VariableItem> {
  const regex = /(\S+)\s*~?=/gm
  let res = TextUtils.matchAll(content, regex)
  const excludeArray = [']', '[', ',', '，', '(', ')', '>']
  res = res.filter((v, i) => {
    const variable = v[1]
    for (let exclude of excludeArray) {
      if (variable.includes(exclude)) {
        return false
      }
    }
    // 去重，后面的不要了
    if (res.findIndex(v => v[1] == variable) !== i) {
      return false
    }
    return true
  })
  let variables = res.map(v => {
    const lineNumber = TextUtils.getLineNumber(content, v.index)
    let comments = ''
    if (lineNumber > 0) {
      const line = content.split('\n')[lineNumber - 1].trim()
      if (line.startsWith('%')) {
        // 可能有多个 %，都去除掉
        comments = line.replace(/^%+/g, '')
      }
    }
    comments = comments.trim()
    // 如果用 | 隔开，则前面的是注释，后面的是备注
    const splitPosition = comments.indexOf('|')
    let value = comments
    let comment = '-'
    if (splitPosition !== -1) {
      value = comments.slice(0, splitPosition).trim()
      comment = comments.slice(splitPosition + 1).trim()
    }
    // 如果没有注释，需要提供一个位置
    const item: VariableItem = {
      name: v[1],
      value: value,
      comment: comment,
      range: {
        start: v.index,
        end: v.index + v[1].length
      },
      lineNumber: lineNumber
    }
    return item
  })
  // 过滤掉 function 这一行的
  const functionLineNumber = getFunctionLine(content).lineNumber
  variables = variables.filter(v => v.lineNumber !== functionLineNumber)
  return variables
}

function stringArrayToVariables(params: {
  arr: Array<string>,
  functionLine: FunctionLine,
  line: string
}): Array<VariableItem> {
  const { arr, functionLine, line } = params
  return arr.map(v => {
    const start = functionLine.index + line.indexOf(v)
    return {
      name: v,
      value: '',
      comment: '',
      lineNumber: functionLine.lineNumber,
      range: {
        start: start,
        end: start + v.length
      }
    }
  })
}

/**
 * 提取代码中的 function 变量
 */
export function extractFunctionVariables(content: string): FunctionVariable {
  let res: FunctionVariable = {
    params: [],
    returns: []
  }
  // 首先获取 function 所在行
  const line = content.split('\n').filter(v => v.includes('function '))[0].trim()
  /**
   * 函数参数
   */
  const params = line.split('(')[1].split(')')[0].replace(/\s/g, '').split(',')
  // 参数的位置
  const functionLine = getFunctionLine(content)
  res.params = stringArrayToVariables({
    arr: params,
    functionLine: functionLine,
    line: line
  })
  /**
   * 返回值
   */
  // 多个变量
  const regex = /function\s\[(.+)\]\s/gm
  const multiRes = TextUtils.matchAll(content, regex)
  let returns : Array<string> = []
  if (multiRes.length > 0) {
    returns = multiRes[0][1].replace(/\s/g, '').split(',')
  } else {
    // 单个变量
    const regexSingle = /function\s(\S+)\s=/gm
    const singleRes = regexSingle.exec(content)
    if (singleRes) {
      returns = [singleRes[1]]
    }
  }
  // 给变量增加上属性
  res.returns = stringArrayToVariables({
    arr: returns,
    functionLine: functionLine,
    line: line
  })
  return res
}

export function extractFunctionVariablesWithoutComment(content: string) : Array<VariableItem> {
  // 从 function 那一行提取的
  const functionVariables = extractFunctionVariables(content)
  // 从最上面的注释提取的
  const commentFunction = extractFunction(content)
  // 看一下哪些变量没有注释
  const paramsMapping = getHasMapping(commentFunction.params)
  const returnsMapping = getHasMapping(commentFunction.returns)
  // 没有注释的 function 变量
  const paramsNo = functionVariables.params.filter(v => !paramsMapping[v.name])
  const returnsNo = functionVariables.returns.filter(v => !returnsMapping[v.name])
  const noArr = paramsNo.concat(returnsNo)
  return noArr
}

/**
 * 合并新老参数
 * @param oldParams 旧的，源码中写的参数
 * @param functionVariables 新的，在 funciton 那一行写的参数
 */
function getNewParams (oldParams: ParamItem[], functionVariables: VariableItem[]) : ParamItem[] {
  let newParams : Array<ParamItem> = []
  for (let param of functionVariables) {
    let oldParam = oldParams.find(v => v.name === param.name)
    if (oldParam) {
      newParams.push(oldParam)
    } else {
      // 之前没有，新建一个
      newParams.push({
        name: param.name,
        value: '',
        comment: ''
      })
    }
  }
  // 可能存在结构体的写法，这种情况下，需要保留原来的 oldParams 中的结构体
  const valirOldParams = oldParams.filter(v => v.name.includes('.')).filter(v => {
    const key = v.name.split('.')[0]
    return functionVariables.find(variable => variable.name === key) !== null
  })
  newParams = newParams.concat(valirOldParams)
  return newParams
}

/**
 * 从源码中，更新最上方的注释
 * @param content 源码
 */
export function updateComment(content: string) : string {
  // 得到原来的注释
  let commentFunction = extractFunction(content)
  // function 那一行
  const functionVariables = extractFunctionVariables(content)
  // 将原来的注释更新到从 function 行提取的上面
  const newParams = getNewParams(commentFunction.params, functionVariables.params)
  const newReturns = getNewParams(commentFunction.returns, functionVariables.returns)
  // 输出结果
  commentFunction.params = newParams
  commentFunction.returns = newReturns
  // 返回
  return functionCommentToString(commentFunction)
}
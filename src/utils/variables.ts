import { extractFunction, functionCommentToString, getHasMapping, ParamItem } from './commentUtils';
import { isFunction, readContent } from './reader';
import TextUtils from "./TextUtils";

export interface VariableComment {
  value: string,
  comment: string
}

export interface VariableItem extends VariableComment {
  name: string,
  range: {
    start: number,
    end: number
  },
  lineNumber: number
}

export interface FunctionVariable {
  params: Array<VariableItem>,
  returns: Array<VariableItem>
}

export interface FunctionLine {
  lineNumber: number,
  index: number
}

export interface FunctionCall {
  name: string,
  params: VariableItem[],
  returns: VariableItem[]
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

/**
 * 提取所有变量，包含函数调用的返回值
 * @param content 源码内容
 */
export function extractVariablesAll(content: string): VariableItem[] {
  const functionCalls = getFunctionCall(content)
  const returns = functionCalls.reduce((prev, current) => prev.concat(current.returns), [] as VariableItem[])
  return extractVariables(content).concat(returns)
}


/**
 * 提取源码当前文件的变量，不包含函数调用的返回值
 * @param content 源码
 */
export function extractVariables(content: string): Array<VariableItem> {
  const regex = /(\S+)\s*[><~]?=/gm
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
    const { value, comment } = splitValueAndComment(comments)
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
  const params = line.split('(')[1].split(')')[0].replace(/\s/g, '').split(',').filter(v => v !== '')
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
  let returns: Array<string> = []
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

export function extractFunctionVariablesWithoutComment(content: string): Array<VariableItem> {
  if (isFunction(content)) {
    // 从 function 那一行提取的
    const functionVariables = extractFunctionVariables(content)
    // 从最上面的注释提取的
    const commentFunction = extractFunction(content)
    // 看一下哪些变量没有注释
    const paramsMapping = getHasMapping(commentFunction.params)
    // 没有注释的 function 变量
    const paramsNo = functionVariables.params.filter(v => !paramsMapping[v.name])
    // 返回值不在这里用了，因为返回值可能是多个
    return paramsNo
  } else {
    return []
  }
}

/**
 * 合并核心变量的参数说明
 * 以源码主体中写的为准
 * @param oldParams 旧的，源码头部注释中写地点
 * @param bodyVariables 新的，从源码整体中提取的
 */
export function mergeVariables(oldParams: ParamItem[], bodyVariables: VariableItem[]): ParamItem[] {
  let newParams: Array<ParamItem> = []
  for (let variable of bodyVariables) {
    if (variable.value === '') {
      // 主体中没有写
      let oldParam = oldParams.find(v => v.name === variable.name)
      if (oldParam) {
        // 原来的有, 使用原来的
        newParams.push(oldParam)
      }
    } else {
      // 在源码主体中已经写了注释，以这个为准
      let newParam: ParamItem = {
        name: variable.name,
        value: variable.value,
        comment: variable.comment
      }
      newParams.push(newParam)
    }
  }
  // 可能存在结构体的写法，这种情况下，需要保留原来的 oldParams 中的结构体
  const valirOldParams = oldParams.filter(v => v.name.includes('.')).filter(v => {
    const key = v.name.split('.')[0]
    return bodyVariables.find(variable => variable.name === key) !== null
  })
  newParams = newParams.concat(valirOldParams)
  return newParams
}

/**
 * 合并新老参数
 * @param oldParams 旧的，源码中写的参数
 * @param functionVariables 新的，在 funciton 那一行写的参数
 */
export function getNewParams(oldParams: ParamItem[], functionVariables: VariableItem[]): ParamItem[] {
  let newParams: Array<ParamItem> = []
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
 * 这里更新的是函数的
 * @param content 源码
 */
export function updateComment(content: string): string {
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

function splitValueAndComment(content: string): VariableComment {
  content = content.trim()
  // 如果用 | 隔开，则前面的是注释，后面的是备注
  const splitPosition = content.indexOf('|')
  let value = content
  let comment = '-'
  if (splitPosition !== -1) {
    value = content.slice(0, splitPosition).trim()
    comment = content.slice(splitPosition + 1).trim()
  }
  return { value, comment }
}

/**
 * 在源码的指定行，获取多个返回值的注释
 * @param content 源码内容
 * @param lineNumber 行号
 */
function getMultiCommentsAtLine(content: string, lineNumber: number): VariableComment[] {
  if (lineNumber < 0) {
    return []
  }
  const arr = content.split('\n')
  if (lineNumber >= arr.length) {
    return []
  }
  const line = arr[lineNumber].trim()
  const pattern = /\[(.+)\]/
  const res = pattern.exec(line)
  if (res) {
    const comments = res[1].trim().split(',')
    return comments.map(v => splitValueAndComment(v))
  } else {
    return []
  }
}

/**
 * 获取函数调用
 * @param content 代码源码
 */
export function getFunctionCall(content: string): FunctionCall[] {
  let res: FunctionCall[] = []
  // multiple returns
  const regexMultiple = /\[(.+)\]\s*=\s*(\S+)\((.*)\)/g
  const resMultiple = TextUtils.matchAll(content, regexMultiple)
  res = res.concat(resMultiple.map(v => {
    const currentLine = v[0]
    // 行号
    const lineNumber = TextUtils.getLineNumber(content, v.index)
    // 从上一行找到注释
    const comments = getMultiCommentsAtLine(content, lineNumber - 1)
    // 开始的索引
    const startIndex = v.index
    // 返回值
    const returnNames = v[1].replace(/\s/g, '').split(',')
    const returns = returnNames.map((returnName, i) => {
      const start = startIndex + currentLine.indexOf(returnName)
      const end = start + returnName.length
      let returnItem: VariableItem = {
        name: returnName,
        value: i < comments.length ? comments[i].value : '',
        comment: i < comments.length ? comments[i].comment : '',
        range: {
          start: start,
          end: end
        },
        lineNumber: lineNumber
      }
      return returnItem
    })
    // 参数
    // const paramNames = v[3].replace(/\s/g, '').split(',')
    return {
      name: v[2],
      returns: returns,
      // 参数肯定已经被提取了，这里就不提取了
      params: []
    }
  }))
  return res
}

const filePath = 'C:\\Users\\sheng\\Documents\\code\\matlab\\quaternion_matlab\\test.m'
const content = readContent(filePath)
const res = extractFunctionVariables(content)
console.log(res)
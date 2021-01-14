/**
 * 将注释对象化管理
 */

import { readContent } from "./reader"
import { extractFunctionVariablesWithoutComment, extractVariables, getNewParams, mergeVariables } from "./variables"

export type ParamItem = {
  // 参数名称
  name: string,
  // 参数说明
  value: string,
  // 参数备注
  comment: string,
}

// 函数说明
export type CommentFunction = {
  // 功能
  function: string,
  // 参数
  params: Array<ParamItem>,
  // 返回值
  returns: Array<ParamItem>,
  // 核心变量
  variables: Array<ParamItem>
  // 备注
  comment: string
}

// 文件说明
export type CommentFile = {
  // 功能
  function: string,
  // 核心变量
  variables: Array<ParamItem>,
  // 备注
  comment: string
}

/**
 * 在 content 中获取 part 部分的内容
 * @param content 内容
 * @param part 部分标题，如 "功能"
 */
function getPart(content: string, part: string) {
  const titleLine = `% ${part}：`
  if (!content.includes(titleLine)) {
    return '无'
  }
  const arr = content.split('\n')
  let start = false
  let result = []
  for (let line of arr) {
    line = line.trim()
    if (line === titleLine) {
      start = true
      continue
    }
    if (start && line.endsWith('：')) {
      // 停止
      break
    }
    if (line === '') {
      // 空行也停止
      break
    }
    if (start) {
      result.push(line.slice(3).trim())
    }
  }
  // 返回结果
  return result.join('\n')
}

function extractTable(content: string) {
  let reg = /(\S+): (.+)/g
  reg.lastIndex = 0
  let result = []
  let res: RegExpExecArray | null
  let arr
  while (true) {
    res = reg.exec(content)
    if (res === null) {
      break
    }
    arr = res[2].split(' | ')
    result.push({
      name: res[1],
      value: arr[0],
      comment: arr.length > 1 ? arr[1] : '-'
    })
  }
  return result
}

/**
 * 获得功能描述
 * @param content 内容
 */
function getFunctionDescription(content: string) {
  return getPart(content, '功能')
}

/**
 * 获得备注描述
 * @param content 内容
 */
function getCommentDescription(content: string) {
  const res = getPart(content, '备注')
  return res === '' ? '无' : res
}

export function extractFunction (content: string) : CommentFunction {
  const functionContent = getFunctionDescription(content)
  const commentContent = getCommentDescription(content)
  const paramContent = getPart(content, '参数')
  const paramArray = extractTable(paramContent)
  const returnsContent = getPart(content, '返回值')
  const returnsArray = extractTable(returnsContent)
  const variablesContent = getPart(content, '核心变量')
  const variablesArray = extractTable(variablesContent)
  let res : CommentFunction = {
    function: functionContent,
    comment: commentContent,
    params: paramArray,
    variables: variablesArray,
    returns: returnsArray
  }
  return res
}

export function extractFile (content: string) : CommentFile {
  const functionContent = getFunctionDescription(content)
  const commentContent = getCommentDescription(content)
  let res : CommentFile = {
    function: functionContent,
    variables: extractTable(getPart(content, '核心变量')),
    comment: commentContent
  }
  return res
}

function returnPart(key: string, value: string) : string {
  return `% ${key}：\n${value.split('\n').map(v => '%   ' + v).join('\n')}\n`
}

function returnPartParams (key: string, params: Array<ParamItem>) : string {
  return `% ${key}：\n${params.map(v => {
    return `%   ${v.name}: ${v.value}${(v.comment === '-' || v.comment === '') ? '' : ' | ' + v.comment}`
  }).join('\n')}\n`
}

export function functionCommentToString (res: CommentFunction) : string {
  let content = ''
  content += returnPart('功能', res.function)
  content += returnPartParams('参数', res.params)
  content += returnPartParams('返回值', res.returns)
  content += returnPartParams('核心变量', res.variables)
  content += returnPart('备注', res.comment)
  return content
}

export function fileCommentToString (res: CommentFile) : string {
  let content = ''
  content += returnPart('功能', res.function)
  content += returnPartParams('核心变量', res.variables)
  content += returnPart('备注', res.comment)
  return content
}

export function getHasMapping (arr: Array<ParamItem>) : { [name: string]: boolean } {
  let init = {} as { string: boolean }
  return arr.reduce((prev, current) => {
    if (current.name.includes('.')) {
      // 是结构体的写法
      const objKey = current.name.split('.')[0]
      return {
        ...prev,
        [current.name]: true,
        [objKey]: true
      }
    } else {
      return {
        ...prev,
        [current.name]: true
      }
    }
  }, init)
}

/**
 * 获取注释内容的范围，在源码中开始索引和结束索引
 * @param content 源码
 */
export function getCommentRange (content: string) : { start: number, end: number } {
  // 思路就是从第一行开始，往后面找第一个空行，如果第一行不是注释，则返回 (0, 0)
  const arr = content.split('\n')
  let end = 0
  let start = 0
  for (let i = 0; i < arr.length; i++) {
    const line = arr[i].trim()
    if (!line.startsWith('%')) {
      return { start, end }
    } else {
      // 第一行就是注释，往后找
      end = end + arr[i].length + 1
    }
  }
  return { start, end }
}

const filePath = 'C:\\Users\\sheng\\Documents\\code\\matlab\\quaternion_matlab\\日常行为分析\\feature_visualize\\feature_range_test.m'
const content = readContent(filePath)
const res = extractFile(content)
const variables = extractVariables(content)
// 合并新老
res.variables = mergeVariables(res.variables, variables)
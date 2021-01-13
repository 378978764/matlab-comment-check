/**
 * 将注释对象化管理
 */

type ParamItem = {
  // 参数名称
  name: string,
  // 参数说明
  value: string,
  // 参数备注
  comment: string,
}

// 函数说明
type CommentFunction = {
  // 功能
  function: string,
  // 参数
  param: Array<ParamItem>,
  // 返回值
  returns: Array<ParamItem>,
  // 备注
  comment: string
}

// 文件说明
type CommentFile = {
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
  let res : CommentFunction = {
    function: functionContent,
    comment: commentContent,
    param: paramArray,
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
    return `%   ${v.name}: ${v.value}${v.comment === '-' ? '' : ' | ' + v.comment}`
  }).join('\n')}\n`
}

export function functionCommentToString (res: CommentFunction) : string {
  let content = ''
  content += returnPart('功能', res.function)
  content += returnPartParams('参数', res.param)
  content += returnPartParams('返回值', res.returns)
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
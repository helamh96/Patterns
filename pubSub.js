export const publiSub={};

const topics={}
let subUid=-1

publiSub.publish=function (topic, args) {
  if (!topics[topic]) {
    return false
  }
  const subscribers=topics[topic]
  let len=subscribers ? subscribers.length : 0
  while (len--) {
    subscribers[len].func(topic, args)
  }
  return this
}

publiSub.subscribe=function (topic, func) {
  if (!topics[topic]) {
    topics[topic]=[]
  }
  const token=(++subUid).toString()
  topics[topic].push({
    token: token,
    func: func
  })
  return token
}

publiSub.unsubscribe=function (token) {
  for (const m in topics) {
    if (topics[m]) {
      for (let i=0, j=topics[m].length; i < j; i++) {
        if (topics[m][i].token === token) {
          topics[m].splice(i, 1)
          return token
        }
      }
    }
  }
  return this
}

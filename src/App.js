import React, { Component } from 'react'
import chatdata from './data.json'
import './App.css'
import { CSSTransitionGroup } from 'react-transition-group'

function delay(amount = 0) {
  return new Promise(resolve => {
    setTimeout(resolve, amount)
  })
}

function time() {
  return Date.now()
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const MESSAGE_GAP = 400
const SENDER_SWITCH_GAP = 800
const IMAGE_LOADING_PADDING = 500
const RESIZING_TIME = 250
const REPLY_TRANSITION_TIME = 300
const SCROLL_DURATION = 300
const MINIMUM_TYPING_TIME = 450
const MSG_ANIMATE_TIME = 500

class Bubble extends Component {
  constructor(props) {
    super(props)
    this.state = {
      isTyping: false,
      width: '0',
      height: '0'
    }
    this.shadowBubble = React.createRef()
  }

  removeLoadingAfter(dl = 0) {
    return delay(dl).then(_ => this.setStateAsync({isTyping: false}))
  }

  setStateAsync(newState) {
    return new Promise(resolve => {
      this.setState(newState, _ => resolve())
    })
  }

  addLoading() {
    return this.setStateAsync({
      isTyping: true,
      width: '64px',
      height: '40px'
    })
  }

  updateSizeAfter(dl = 0) {
    return delay(dl)
    .then(_ =>
      this.setStateAsync({
        width: this.shadowBubble.current.offsetWidth,
        height: this.shadowBubble.current.offsetHeight
      })
    )
  }


  componentWillMount() {
    const { sender } = this.props

    if (sender !== 'me') return
    this.addLoading()

  }

  componentDidMount() {
    const { isTyping } = this.state
    const { content, wait } = this.props

    if (isTyping) {
      this.props.onHeightChange()

      // for image message
      if (content.indexOf('<img') >= 0) {
        var res = content.match(/src="([^"]+)"/)
        var img = new Image()
        img.onload = _ => {
          this.updateSizeAfter(IMAGE_LOADING_PADDING + wait)
          .then(_ => this.removeLoadingAfter(RESIZING_TIME))
          .then(_ => delay(100))
          .then(_ => this.props.onFinish())
        }
        img.src = res[1]

      // for long text
      } else {
        var typingTime = content.length >= 10 ? MINIMUM_TYPING_TIME + content.length / 10 * 400 : MINIMUM_TYPING_TIME
        this.updateSizeAfter(typingTime + wait)
          .then(_ => this.removeLoadingAfter(RESIZING_TIME))
          .then(_ => delay(100))
          .then(_ => this.props.onFinish())
      }
    } else {
      this.setStateAsync({
        width: this.shadowBubble.current.offsetWidth,
        height: this.shadowBubble.current.offsetHeight
      }).then(_ => this.props.onFinish())
    }
  }

  render() {
    var c = (
      <div className={
        this.props.content.indexOf('<img') >= 0 ?
          'img-content' : 'content'
        } dangerouslySetInnerHTML={{__html: this.props.content}} />)

    var b = this.state.isTyping ? (
      <div className="loader">
        <div className="wave"><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
      </div>) : c

    return (
      <CSSTransitionGroup
          component="div" 
          className="animate-row-container"
          transitionName="bounceIn" 
          transitionAppear={true}
          transitionEnter={false}
          transitionLeave={false}
          transitionAppearTimeout={MSG_ANIMATE_TIME} >
        <div className={this.props.sender === 'me' ? 'row left-row' : 'row right-row'}>
          <div className="chat-row">
            <div style={{width: this.state.width, height: this.state.height}}
                 className={this.props.sender === 'me' ? 'bubble bubble-transition left' : 'bubble right'}>
              {b}
            </div>
          </div>

          <div className="shadow chat-row">
            <div ref={this.shadowBubble} className={this.props.sender === 'me' ? 'mock bubble left' : 'mock bubble right'}>
              {c}
            </div>
          </div>
        </div>
      </CSSTransitionGroup>
    )

  }
}


class Replies extends Component {
  onReplyClick(answer, goto) {
    return _ => this.props.onRClick(answer, goto)
  }

  render() {
    return (
      <div className={this.props.isSendingMsg ? 'disabled inner' : 'inner'}>
        <CSSTransitionGroup
          component="div"
          className="inner-container"
          transitionName="fade" 
          transitionEnterTimeout={REPLY_TRANSITION_TIME} 
          transitionLeaveTimeout={REPLY_TRANSITION_TIME}>
          <div className="replies" key={this.props.akey}>
            {this.props.replies.map((r, i) =>
              <button key={i} onClick={this.onReplyClick(r.answer, r.goto)}>{r.answer}</button>
            )}
            <div className="blank"></div>
          </div>
        </CSSTransitionGroup>
      </div>
    )
  }
}


class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      chatPool: chatdata,
      msgList: [],
      replies: [],
      nextKey: 'ice',
      sender: 'me',
      repId: 0,
      isSendingMessage: true,
      buffer: []
    }
    this.scrollList = React.createRef()
  }

  updateScroll() {
    return new Promise(resolve => {
      const $chatbox = this.scrollList.current
      const distance = $chatbox.scrollHeight - $chatbox.offsetHeight - $chatbox.scrollTop
      const startTime = Date.now()

      if (distance === 0) {
        resolve()
      }

      requestAnimationFrame(function step() {
        const p = Math.min(1, (Date.now() - startTime) / SCROLL_DURATION)
        $chatbox.scrollTop = $chatbox.scrollTop + distance * p
          if (p < 1) { requestAnimationFrame(step) }
          else { resolve() }
      })
    })
  }

  updateReplies() {
    const {nextKey, chatPool} = this.state
    var replies = chatPool[nextKey].reply
    
    this.setStateAsync({ repId: time(), replies })
    .then(_ => delay(REPLY_TRANSITION_TIME))
    .then(_ => this.setStateAsync({ isSendingMessage: false }))
  }


  getMyWords() {
    const {nextKey, chatPool} = this.state

    var result = []

    chatPool[nextKey].says.map(v => {
      var vector = v.split('|')
      result.push({
        content: vector[0],
        wait: vector.length > 1 ? +vector[1] : 0
      })
      return v
    })

    return result.reverse()
  }

  getOneMsg() {
    if (this.state.buffer.length === 0) return false

    var bufferCopy = [...this.state.buffer]
    var result = bufferCopy.pop()
    this.setState({buffer: [...bufferCopy]})
    
    return result
  }

  getAndSay() {
    const msg = this.getOneMsg()

    const { content, wait } = msg
    const { sender } = this.state
    
    this.setState(prevState => ({
      isSendingMessage: true,
      sender,
      msgList: [...prevState.msgList, { sender, content, wait } ]
    }))

  }

  componentWillMount() {
    this.setState({ nextKey: 'ice' })
  }

  componentDidMount() {
    this.sendMessage('me', this.getMyWords())
  }

  onSent() {
    if (this.state.buffer.length === 0) {
      if (this.state.sender === 'me') {
        this.updateReplies()
      }
      this.updateScroll()
      return
    }
    this.updateScroll().then(_ => 
      delay(getRandomNumber(300, MESSAGE_GAP)).then(_ => this.getAndSay())
    )
  }

  setStateAsync(newState) {
    return new Promise(resolve => {
      this.setState(newState, _ => resolve())
    })
  }

  sendMessage(sender, msgs) {
    return new Promise(resolve => {
      const newState = {
        isSendingMessage: true,
        sender,
        buffer: msgs
      }

      this.setStateAsync(newState).then(_ => {
        this.getAndSay()
        resolve()
      })
    })
  }

  handleReplyClick(answer, goto) {
    if (this.state.isSendingMessage) return
    
    this.sendMessage('you', [ {content: answer, wait: 0} ])
    .then(_ => this.setStateAsync({ nextKey: goto }))
    .then(_ => delay(SENDER_SWITCH_GAP))
    .then(_ => this.setStateAsync({ sender: 'me' }))
    .then(_ => this.sendMessage('me', this.getMyWords()))
  }


  render() {
    return (
      <div className="app">
        <div className="message-list scrolly" ref={this.scrollList}>
          {this.state.msgList.map((m, i) =>
            <Bubble key={i} onFinish={this.onSent.bind(this)} onHeightChange={this.updateScroll.bind(this)} {...m} />
          )}
          <div className="msg-list-padding"></div>
        </div>

        <div className="quick-replies scrollx">
            <Replies isSendingMsg={this.state.isSendingMessage} akey={this.state.repId} replies={this.state.replies} onRClick={this.handleReplyClick.bind(this)}/>
        </div>
      </div>
    )
  }
}

export default App

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

const MESSAGE_GAP = 700
const SENDER_SWITCH_GAP = 800
const START_AFTER = 1000
const SHORT_GAP = 100
const IMAGE_LOADING_PADDING = 500
const RESIZING_TIME = 250
const SCROLL_DURATION = 300
const MINIMUM_TYPING_TIME = 500
const MSG_ANIMATE_TIME = 500

class Bubble extends Component {
  constructor(props) {
    super(props)
    this.state = {
      isTyping: false,
      width: 'auto',
      height: 'auto'
    }
    this.shadowBubble = React.createRef()
  }

  removeLoadingAfter(dl = 0) {
    return new Promise(resolve => {
      delay(dl).then(_ => {
        this.setState({isTyping: false})
        delay(0).then(resolve.bind(this))
      })
    })
    
  }

  addLoading() {
    return new Promise(resolve => {
      this.setState({
        isTyping: true,
        width: '64px',
        height: '40px'
      })
      delay(0).then(resolve.bind(this))
    })
    
  }

  updateSizeAfter(dl = 0) {
    return new Promise(resolve => {
      delay(dl).then(_ => {
        this.setState({
          width: this.shadowBubble.current.offsetWidth,
          height: this.shadowBubble.current.offsetHeight
        })
        delay(0).then(resolve.bind(this))
      })
    })
  }


  componentWillMount() {
    const { sender, content } = this.props

    if (sender !== 'me') {
      return
    }

    if (content.indexOf('<img') >= 0 || content.length >= 10) {
      this.addLoading()
    }

  }

  componentDidMount() {
    const { isTyping } = this.state
    const { sender, content, wait } = this.props

    if (isTyping) {
      this.props.onHeightChange()
      if (content.indexOf('<img') >= 0) {
        var res = content.match(/src="([^"]+)"/)
        var img = new Image()
        img.onload = _ => {
          this.updateSizeAfter(IMAGE_LOADING_PADDING + wait)
          .then(_ => this.removeLoadingAfter(RESIZING_TIME))
          .then(_ => this.props.onFinish())
        }
        img.src = res[1]
      } else if (content.length >= 10) {
        var typingTime = MINIMUM_TYPING_TIME + content.length / 10 * 400
        this.addLoading().then(_ => {
          this.updateSizeAfter(typingTime + wait)
          .then(_ => this.removeLoadingAfter(RESIZING_TIME))
          .then(_ => this.props.onFinish())
        })
      }
    } else {
      if (sender == 'me') {
        delay(0).then(_ => this.props.onFinish())
      }
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
      <div className={this.props.sender === 'me' ? 'row left-row' : 'row right-row'}>
       
        <div className="chat-row">
          <div style={{width: this.state.width, height: this.state.height}} className={this.props.sender === 'me' ? 'bubble left' : 'bubble right'}>
            {b}
          </div>
        </div>

        <div className="shadow chat-row">
          <div ref={this.shadowBubble} className={this.props.sender === 'me' ? 'mock bubble left' : 'mock bubble right'}>
            {c}
          </div>
        </div>
      </div>
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
          transitionEnterTimeout={300} 
          transitionLeaveTimeout={300}>
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

  say(sender, content, wait) {
    this.setState(prevState => ({
      sender,
      msgList: [...prevState.msgList, { sender, content, wait } ]
    }))
    // delay(SHORT_GAP).then(this.updateScroll.bind(this))
  }

  updateScroll() {
    return new Promise(resolve => {
      const $chatbox = this.scrollList.current
      const distance = $chatbox.scrollHeight - $chatbox.offsetHeight - $chatbox.scrollTop
      const startTime = Date.now()
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
    
    this.setState({ repId: time(), replies })
    delay(SHORT_GAP).then(_ => this.setState({ isSendingMessage: false }))
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
    this.setState({ buffer: result.reverse() })
  }

  getOneMsg() {
    if (this.state.buffer.length === 0) return false

    var bufferCopy = [...this.state.buffer]
    var result = bufferCopy.pop()
    this.setState({buffer: [...bufferCopy]})
    
    return result
  }

  getAndSay() {
    var msg = this.getOneMsg()

    if (msg) {
      this.setState({ isSendingMessage: true})
      const { content, wait } = msg
      this.say(this.state.sender, content, wait)
    } else {
      this.updateReplies()
    }
    
  }

  componentWillMount() {
    this.setState({ nextKey: 'ice' })
    this.getMyWords()
    this.updateReplies()
  }

  componentDidMount() {
    delay(SHORT_GAP).then(_ => this.getAndSay())
  }

  onHeightChange() {
    this.updateScroll()
  }

  onSent() {
    if (this.state.buffer.length === 0) {
      this.updateReplies()
      this.updateScroll()
      return
    }
    this.updateScroll().then(_ => 
      delay(getRandomNumber(0, 300)).then(_ => this.getAndSay())
    )
  }

  handleReplyClick(answer, goto) {
    if (this.state.isSendingMessage) return
    
    this.setState({
      isSendingMessage: true,
      sender: 'you',
      buffer: [ {content: answer, wait: 0} ]
    })

    delay(0).then(_ => {
      this.getAndSay()
      this.updateScroll()

      this.setState({ nextKey: goto })
      this.getMyWords()

      delay(SENDER_SWITCH_GAP).then(_ => {
        this.setState({ sender: 'me' })
        this.getAndSay()
      })
    })
  }


  render() {
    return (
      <div className="app">
        <div className="message-list scrolly" ref={this.scrollList}>
          <CSSTransitionGroup
          component="div" 
          transitionName="bounceIn" 
          transitionEnterTimeout={MSG_ANIMATE_TIME} 
          transitionLeaveTimeout={MSG_ANIMATE_TIME}>
            {this.state.msgList.map((m, i) =>
              <Bubble key={i} onFinish={this.onSent.bind(this)} onHeightChange={this.onHeightChange.bind(this)} {...m} />
            )}
          </CSSTransitionGroup>
        </div>

        <div className="quick-replies scrollx">
            <Replies isSendingMsg={this.state.isSendingMessage} akey={this.state.repId} replies={this.state.replies} onRClick={this.handleReplyClick.bind(this)}/>
        </div>
      </div>
    )
  }
}

export default App

import React, { Component } from 'react'
import chatdata from './data.json'
import './App.css'
import { CSSTransitionGroup } from 'react-transition-group'

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
  componentWillMount() {
    const sender = this.props.sender

    if (this.props.content.indexOf('<img') >= 0) {
      var res = this.props.content.match(/src="([^"]+)"/)
      this.setState({
        isTyping: true,
        width: '64px',
        height: '40px'
      })

      var img = new Image()
      img.onload = _ => {
        this.setState({
          width: this.shadowBubble.current.offsetWidth,
          height: this.shadowBubble.current.offsetHeight
        })
        setTimeout(_ => {
          this.setState({isTyping: false})
          this.props.onFinish()
        }, 250)
      }

      img.src = res[1]
      
    } else {
      const length = this.props.content.length
      if (sender == 'me' && length > 20) {
        this.setState({
          isTyping: true,
          width: '64px',
          height: '40px'
        })
        setTimeout(_ => {
          this.setState({
            width: this.shadowBubble.current.offsetWidth,
            height: this.shadowBubble.current.offsetHeight
          })
          setTimeout(_ => {
            this.setState({isTyping: false})
            this.props.onFinish()
          }, 250)
        }, length / 20 * 600)
      }
    }
    
    
  }
  render() {
    var b

    var c

    if (this.props.content.indexOf('<img') >= 0) {
      c = <div className="img-content" dangerouslySetInnerHTML={{__html: this.props.content}}></div>
    } else {
      c = <div className="content" dangerouslySetInnerHTML={{__html: this.props.content}}></div>
    }

    if (this.state.isTyping) {
      b = (
      <div className="loader">
        <div className="wave">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
        </div>
      </div>)
    } else {
      b = c 
    }

    return (
      <div className={this.props.sender == 'me' ? 'row left-row' : 'row right-row'}>
        <div className="chat-row">
          <div style={{width: this.state.width, height: this.state.height}} className={this.props.sender == 'me' ? 'bubble left' : 'bubble right'}>
            {b}
          </div>
        </div>
        <div className="shadow chat-row">
          <div ref={this.shadowBubble} className={this.props.sender == 'me' ? 'mock bubble left' : 'mock bubble right'}>
            {c}
          </div>
        </div>
      </div>
    )
  }
}


class Replies extends Component {
  onReplyClick(answer, goto) {
    return () => {
      this.props.onRClick(answer, goto)
    }
  }
  render() {
    return (
        <div className={this.props.isSendingMsg ? 'disabled inner' : 'inner'} key={this.props.akey}>
            <div className="replies">
              {this.props.replies.map((r, i) =>
                <button onClick={this.onReplyClick(r.answer, r.goto)}>{r.answer}</button>
              )}
              <div className="blank"></div>
            </div>
        </div>
    )
  }
}


class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      chatPool: chatdata,
      msgList: [
        // {
        //   "sender": "",
        //   "content": ""
        // }
      ],
      replies: [
        // {
        //   "answer": "",
        //   "goto": ""
        // }
      ],
      nextKey: 'ice',
      sender: 'me',
      repId: 0,
      isSendingMessage: true,
      buffer: []
    }
    this.scrollList = React.createRef()
  }

  delay(amount = 0) {
    return new Promise(resolve => {
      setTimeout(resolve, amount)
    })
  }

  say(sender, content) {
    this.setState({
      sender: sender
    })
    this.setState(prevState => ({
      msgList: [...prevState.msgList, { sender, content } ]
    }))
    this.delay(100).then(this.updateScroll.bind(this))
  }

  updateScroll() {
    const $chatbox = this.scrollList.current
    const distance = $chatbox.scrollHeight - $chatbox.offsetHeight - $chatbox.scrollTop
    const duration = 250
    const startTime = Date.now()
    requestAnimationFrame(function step() {
        const p = Math.min(1, (Date.now() - startTime) / duration)
        $chatbox.scrollTop = $chatbox.scrollTop + distance * p
        if (p < 1) {
          requestAnimationFrame(step)
        } else {
          return
        }
    })
  }

  updateReplies() {
    var nextKey = this.state.nextKey
    var replies = this.state.chatPool[nextKey].reply
    this.setState({ repId: this.time() })
    this.setState({ replies })
    this.delay(0).then(_ => this.setState({ isSendingMessage: false }))
  }


  getMyWords() {
    var nextKey = this.state.nextKey
    var chat = [...this.state.chatPool[nextKey].says]
    this.setState({buffer: chat.reverse()})
  }

  getOneMsg() {
    if (this.state.buffer.length == 0) {
      return false
    }
    var bufferCopy = [...this.state.buffer]
    var result = bufferCopy.pop()
    this.setState({buffer: [...bufferCopy]})
    return result
  }

  getAndSay() {
    var content = this.getOneMsg()
    if (content) {
      this.say(this.state.sender, content)
    } else {
      this.updateReplies()
      this.setState({
        isSendingMessage: false
      }) 
    }
    
  }

  componentDidMount() {
    this.setState({
      nextKey: 'ice'
    })
    this.getMyWords()
    this.updateReplies()
    this.delay(0).then(_ => this.setState({ isSendingMessage: true }))
    setTimeout(_ => {
      this.getAndSay()
    }, 200)
  }

  onSent() {
    this.delay(0).then(this.updateScroll.bind(this))
    this.delay(500).then(_ => {
      this.getAndSay()
    })

  }

  handleReplyClick(answer, goto) {
    if (this.state.isSendingMessage) return
    
    this.setState({
      isSendingMessage: true,
      sender: 'you',
      buffer: [answer]
    })

    this.delay(200).then(_ => {
      this.getAndSay()
      this.setState({
        nextKey: goto
      })
      this.getMyWords()
      this.delay(500).then(_ => {
        this.setState({
          sender: 'me'
        })
        this.getAndSay()
      })
    })

    
  }

  time() {
    return Date.now()
  }

  render() {
    return (
      <div className="app">

        <div className="message-list scrolly" ref={this.scrollList}>
          <CSSTransitionGroup
          component="div" className={this.state.sender == 'me' ? 'in-left' : 'in-right'} 
          transitionName="example" 
          transitionEnterTimeout={500} 
          transitionLeaveTimeout={500}>
            {this.state.msgList.map((m) =>
              <Bubble onFinish={this.onSent.bind(this)} sender={m['sender']} content={m['content']} />
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

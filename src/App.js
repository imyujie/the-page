import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import { CSSTransitionGroup } from 'react-transition-group'


class Bubble extends Component {

  render() {
    return (
      <div className="chat-row">
        
        <div className={this.props.sender == 'me' ? 'bubble left' : 'bubble right'}>
          {this.props.content}
        </div>
      </div>
    )
  }
}


class Replies extends Component {
  onReplyClick(answer, goto) {
    return () => {
      console.log('click')
      this.props.onRClick(answer, goto)
    }
  }
  render() {
    return (
      <CSSTransitionGroup
          component="div"
          className="bottom-container"
          transitionName="fade"
          transitionEnterTimeout={500}
          transitionLeaveTimeout={500}>
        <div className="inner" key={this.props.akey}>
            <div className="replies">
              {this.props.replies.map((r, i) =>
                <button onClick={this.onReplyClick(r.answer, r.goto)}>{r.answer}</button>
              )}
              <div className="blank"></div>
            </div>
        </div>
      </CSSTransitionGroup>
    )
  }
}


class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      chatPool: {
        "ice": {
          "says": [
            "你好",
            "Hello",
          ],
          "reply": [
            {
              "answer": "我现在不想和你说话，好烦",
              "goto": "apple"
            },
            {
              "answer": "你在说什么呀",
              "goto": "apple"
            },
            {
              "answer": "我记不太清楚了",
              "goto": "apple"
            }
          ]
        },
        "apple": {
          "says": [
            "苹果",
            "Hello",
          ],
          "reply": [
            {
              "answer": "Em",
              "goto": "ice"
            }
          ]
        },
      },
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
      sender: 'me',
      repId: 0
    };
    this.scrollList = React.createRef()
  }

  componentWillAppear() {
    console.log('appear')
  }

  delay(amount = 0) {
    return new Promise(resolve => {
        setTimeout(resolve, amount);
    });
  }

  say(sender, content) {
    this.setState({
      sender: sender
    })
    this.setState(prevState => ({
      msgList: [...prevState.msgList, { sender, content } ]
    }))
    this.updateScroll()
  }

  updateScroll() {
    const $chatbox = this.scrollList.current
    const distance = $chatbox.scrollHeight - $chatbox.offsetHeight - $chatbox.scrollTop;
    const duration = 250;
    const startTime = Date.now();
    requestAnimationFrame(function step() {
        const p = Math.min(1, (Date.now() - startTime) / duration);
        $chatbox.scrollTop = $chatbox.scrollTop + distance * p
        p < 1 && requestAnimationFrame(step);
    });
  }

  giveReplies(replies) {
    this.setState({ repId: this.time() })
    this.setState({ replies })
  }

  getReplies(k = 'ice') {
    var chat = this.state.chatPool[k]
    return chat.reply
  }

  getMyWords(k = 'ice') {
    var chat = this.state.chatPool[k]
    return [...chat.says.reverse()]
  }

  getOneMsg(msg) {
    if (msg.length == 0) {
      return false
    }
    return msg.pop()
  }

  componentDidMount() {

    var words = this.getMyWords()
    var aa = _ => {
      var c = this.getOneMsg(words)
      if (c) {
        this.say('me', c)
        setTimeout(aa, 500)
      } else {
        return
      }
    }

    aa()

    this.giveReplies(this.getReplies())
    
  }

  handleReplyClick(answer, goto) {
    this.say('you', answer)
    var words = this.getMyWords(goto)

    var pp = new Promise(resolve => {
      var aa = _ => {
        var c = this.getOneMsg(words)
        if (c) {
          this.say('me', c)
          setTimeout(aa, 500)
        } else {
          resolve()
          return
        }
      }
  
      aa()
    })
    
    
    pp.then(_ => {
      this.giveReplies(this.getReplies(goto))
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
              <Bubble sender={m['sender']} content={m['content']} />
            )}
          </CSSTransitionGroup>
        </div>

        <div className="quick-replies scrollx">
            <Replies akey={this.state.repId} replies={this.state.replies} onRClick={this.handleReplyClick.bind(this)}/>
        </div>
      </div>
    );
  }
}

export default App;

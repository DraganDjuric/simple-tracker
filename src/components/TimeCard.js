import React, { Component } from 'react';
import {initTimerState} from '../store/reducers/timer';
import TimeCardEdit from './TimeCardEdit';
import {Timer} from './Timer';

const ICON_RUN = '/favicon-run.ico';
const ICON_STOPPED = '/favicon.ico';

export default class TimeCard extends Component {
  constructor(props) {
    super(props);
    this.raf = window.requestAnimationFrame;
    this.rafId = null;
    this.modalRef = React.createRef();
    this.timerRef = React.createRef();
    this.startTimer = this.startTimer.bind(this);
    this.pauseTimer = this.pauseTimer.bind(this);
    this.resetTimer = this.resetTimer.bind(this);
    this.removeTimer = this.removeTimer.bind(this);
    this.handleEditFormUpdate = this.handleEditFormUpdate.bind(this);
    this.handleTagOnDrop = this.handleTagOnDrop.bind(this);
    this.handleTagOnDragOver = this.handleTagOnDragOver.bind(this);
    this.handleTagOnDragLeave = this.handleTagOnDragLeave.bind(this);
    this.handleTagRemove = this.handleTagRemove.bind(this);
    this.openFormModal = this.openFormModal.bind(this);
    this.initTimerState = initTimerState;
    this.id = this.props.id;
    this.favicon = document.querySelector('[rel="shortcut icon"]');
    this.title = document.querySelector('title');
    this.titleText = this.title.innerText;
    this.state = {
      ...this.props.getStateById(this.id),
      title: this.props.getStateById(this.id).title || this.props.title || this.props.id,
      description: this.props.getStateById(this.id).description || this.props.description || '',
      tags: this.props.getStateById(this.id).tags || {},
      openEditModal: this.props.getStateById(this.id).openEditModal || false
    };
  }

  componentDidMount() {
    let context = this.timerRef.current;
    if (context !== null) {
      window.M.AutoInit(context);
    }

    this.setState((state, props) => {
      let timerActive = (this.state.timerRunning && this.props.getActiveTimer.indexOf(this.id) === 0);
      this.rafId = timerActive
        ? this.raf.call(window, () => this.timerRun())
        : null;

      if (timerActive) {
        this.favicon.href = ICON_RUN;
        this.title.innerText = 'Running - ' + this.titleText;
      }

      if (this.state.openEditModal) {
        let modalInstance = this.modalRef && this.modalRef.current
          ? window.M.Modal.getInstance(this.modalRef.current)
          : null;

        if (modalInstance) {
          modalInstance.open();
          let nameInput = this.modalRef.current.querySelector('.timer-name');
          nameInput.focus();
        }

        let timerState = {
          ...state,
          openEditModal: false
        };

        this.props.onTimerUpdate({
          timerState,
          id: this.id
        })

        return timerState;
      }

    });
  }

  componentWillUnmount() {
    cancelAnimationFrame(this.rafId);
  }

  timerRun() {
    let timerState = {};

    this.setState((state, props) => {
      let timeStart = +new Date();
      let timeProgress = (timeStart - state.timeStart) + state.timeProgress;
      let timerActive = (state.timerRunning && this.props.getActiveTimer.indexOf(this.id) === 0);

      timerState = {
        ...state,
        timeStart,
        timeProgress,
        timerRunning: timerActive
      };

      if (timerActive) {
        this.rafId = this.raf.call(window, () => this.timerRun());
      } else {
        cancelAnimationFrame(this.rafId);
        this.props.onTimerUpdate({
          timerState,
          timerRunning: false,
          id: this.id
        });
      }

      return timerState;
    });
  }

  startTimer() {
    this.setState((state, props) => {
      let timerState = {
        ...this.props.getStateById(this.id),
        timerRunning: true,
        timeStart: +new Date(),
      }

      this.props.onTimerUpdate({
        timerState,
        id: this.id
      })

      this.rafId = this.raf.call(window, () => this.timerRun());
      this.favicon.href = ICON_RUN;
      this.title.innerText = 'Running - ' + this.titleText;

      return timerState;
    });
  }

  pauseTimer() {
    this.setState((state, props) => {
      let timerState = {
        ...state,
        timerRunning: false
      };

      props.onTimerStop({
        timerState,
        id: this.id
      });

      this.favicon.href = ICON_STOPPED;
      this.title.innerText = 'Stopped - ' + this.titleText;

      return timerState;
    });

  }

  resetTimer() {
    if (window.confirm('Are you sure you want to RESET this timer?')) {
      let state = this.props.getStateById(this.id);
      cancelAnimationFrame(state.rafId);
      let newState = {
        ...this.initTimerState,
        timerStartDate: new Date(),
      }
      this.props.onTimerUpdate({
        timerState: newState,
        id: this.id,
      });
      this.setState((state, props) => newState);
    }
  }

  removeTimer() {
    if (window.confirm('Are you sure you want to REMOVE this timer?')) {
      this.props.onTimerDelete({
        id: this.id,
        timerState: this.props.getAllTimerStates[this.id],
      });
    }
  }

  formatTimerDate() {
    let dateOpt = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    let date = new Date(this.state.timerStartDate);

    return date.toLocaleTimeString('en-US', dateOpt);
  }

  formatTime(milliseconds) {
    let time = milliseconds / 1000;
    const converter
      = (denom = 1) => ((time / denom) % 60 < 10 || (time / denom) % 60 === 60)
        ? `0${Math.floor(time / denom) % 60}`
        : `${Math.floor(time / denom) % 60}`;

    let sec = converter(1);
    let min = converter(60);
    let hr = converter(3600);

    return `${hr}:${min}:${sec}`;
  }

  editForm() {
    return React.createElement(
      TimeCardEdit, {
      ...this.props,
      title: this.state.title,
      description: this.state.description,
      handleEditFormUpdate: this.handleEditFormUpdate,
    });
  }

  handleEditFormUpdate(formState) {
    this.setState((state, props) => {
      let timerState = {
        ...this.state,
        ...formState
      }

      this.props.onTimerUpdate({
        timerState,
        id: this.id
      });

      return timerState;
    });
  }


  openFormModal() {
    window.M.Modal.init(this.modalRef.current, {});
  }

  handleTagOnDrop(e) {
    e.stopPropagation();
    let payload = JSON.parse(e.dataTransfer.getData('application/json') || '{}');

    if (Object.keys(payload).length > 0 && payload.type === 'TAG_LINK') {
      this.setState((state) => {
        let tags = {
          ...state.tags,
          [payload.id]: payload
        }

        let newState = {
          ...state,
          tags
        }

        this.props.onTimerUpdate({
          timerState: newState,
          id: this.id,
        });
        return newState;
      })
    }
  }

  handleTagOnDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy"
  }

  handleTagOnDragLeave(e) {
    e.preventDefault();
  }

  handleTagRemove(e) {
    e.preventDefault();
    let id = e.target.id.replace('tag-remove-', '');

    this.setState((state, props) => {
      delete state.tags[id];

      this.props.onTimerUpdate({
        timerState: state,
        id: this.id,
      });
      return state;
    });

  }

  buildTagList() {
    return Object.entries(this.props.getAllTagsById).map(([id, tagState]) => {
      return (this.state.tags[id])
      ? (
        <div
          style={{
            textTransform: 'capitalize'
          }}
          className={this.cardClass(['chip'], ['white'], ['grey', 'lighten-2'])}
          id={'tag-chip-' + id}
          key={id}>
          {tagState.name}
          <i id={'tag-remove-' + id}
            className="material-icons"
            style={{
              cursor: 'pointer',
              float: 'right',
              fontSize: '16px',
              lineHeight: '32px',
              paddingLeft: '8px',
            }}
            onClick={this.handleTagRemove}>close</i>
        </div>
      )
      : null
    })
  }

  cardClass(additionalClasses = [''], runningClasses = null, stoppedClasses = null) {
    const RUNNING = runningClasses || ['light-blue', 'lighten-1'];
    const STOPPED = stoppedClasses || ['white'];

    let classNames = [
      ...additionalClasses,
    ];

    classNames = (this.state.timerRunning)
      ? [...classNames, ...RUNNING]
      : [...classNames, ...STOPPED];

    return classNames.join(' ');
  }

  cardTextClass(additionalClasses = [''], runningClasses = null, stoppedClasses = null) {
    const RUNNING = runningClasses || ['white'];
    const STOPPED = stoppedClasses || ['grey', 'darken-1'];

    let classNames = [
      ...additionalClasses,
    ];

    const textModifier = (color) => {
      return (color.indexOf('darken') === 0 || color.indexOf('lighten') === 0)
        ? `text-${color}`
        : `${color}-text `;
    }

    classNames = (this.state.timerRunning)
      ? [...classNames, ...RUNNING.map(color => textModifier(color))]
      : [...classNames, ...STOPPED.map(color => textModifier(color))];

    return classNames.join(' ');
  }

  timerCardStyle() {
    return {
      margin: 0,
      width: 'calc(100% - 55px)',
      borderLeft: '1px solid #eee',
    }
  }

  timerCardWrapperStyle() {
    return {
      margin: '0 .75rem',
      background: 'white',
    }
  }

  sideButtonWrapperStyle() {
    return {
      width: '55px',
    }
  }

  sideButtonStyle() {
    return {
      width: '55px',
    }
  }

  descriptionStyle() {
    return {
      borderColor: '#29b6f6',
    }
  }

  render() {
    // @TODO: refactor this into smaller components
    return (
      <section
        ref={this.timerRef}
        onDragOver={this.handleTagOnDragOver}
        onDragLeave={this.handleTagOnDragLeave}
        onDrop={this.handleTagOnDrop}
        className="time-card row"
        style={this.timerCardWrapperStyle()}>
        <div className="side-button left"
          style={this.sideButtonWrapperStyle()}>
          <div
            style={this.sideButtonStyle()}
            id={'drag-' + this.props.id}
            draggable={true}
            onDrag={this.props.handleOrderOnDrag}
            onDragStart={this.props.handleOrderOnDragStart}
            onDragEnd={this.props.handleOrderOnDragEnd}
            className={"btn-flat grey-text text-darken-2 " + ((this.props.timerSearchQuery || this.props.getFilteredCategories.length > 0) ? 'disabled' : '')}>
            <i className="material-icons">drag_handle</i>
          </div>
          <button
            style={this.sideButtonStyle()}
            onClick={this.removeTimer}
            className="btn-flat grey-text text-darken-2">
            <i className="material-icons">delete_forever</i></button>
          <button
            style={this.sideButtonStyle()}
            className="btn-flat grey-text text-darken-2 modal-trigger"
            data-target={'modal-' + this.id} >
            <i className="material-icons">edit</i></button>
          <button
            style={this.sideButtonStyle()}
            onClick={this.resetTimer}
            className="btn-flat grey-text text-darken-2">
            <i className="material-icons">refresh</i></button>
        </div>
        <div
          id={this.props.id}
          style={this.timerCardStyle()}
          className={this.cardClass(['card', 'z-depth-0', 'left'])}>
          <div className={this.cardTextClass(["card-content"], ['grey', 'darken-3']) + this.cardClass([''], ['light-blue', 'lighten-4'])}>
            <span className="card-title">
              <span>{this.state.title || this.id}</span>
              <div>
                <small>
                  {this.formatTimerDate()}
                </small>
              </div>
            </span>
            <blockquote style={this.descriptionStyle()} className="card-description">
              {this.state.description
                ? this.state.description.split('\n').map((string, idx) => <p key={idx}>{string}</p>)
                : ''}
            </blockquote>
            <div className="card-meta">
                {this.buildTagList()}
            </div>
          </div>
          <div className="card-action">
            <Timer time={this.state.timeProgress} running={this.state.timerRunning} />
            <button disabled={this.state.timerRunning} onClick={this.startTimer} className={this.cardTextClass(["btn-flat"])}>
              <i className="material-icons">play_arrow</i></button>
            <button disabled={!this.state.timerRunning} onClick={this.pauseTimer} className={this.cardTextClass(["btn-flat"])}>
              <i className="material-icons">pause</i></button>
          </div>
        </div>
        <div id={'modal-' + this.id} ref={this.modalRef} className="modal">
          <div className="modal-content">
            <div className="row">
              <h5>Edit Timer</h5>
            </div>
            {this.editForm()}
          </div>
          <div className="modal-footer">
            <div className="left">
              <Timer
                time={this.state.timeProgress}
                running={this.state.timerRunning}
                caption={this.state.timerRunning ? '- Running' : '- Stopped'}/>
            </div>
            <a href="#!" className="modal-action modal-close waves-effect waves-green btn-flat">Done</a>
          </div>
        </div>
      </section>
    )
  }
};

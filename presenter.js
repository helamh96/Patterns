import views from "./view.js"
import {publiSub} from "./pubSub.js"
import {presenter, model} from "./notesPatterns.js"

const getDP="getDataPresenter"
const getDatesP="getDatesPresenter"
const saveNoteP="saveNotePresenter"
const undoActionP="undoActionPresenter"
const InterchageNotesP="interchageNotesP"
const editNoteP="editNotePresenter"
const deleteNoteP="deleteNotePresenter"
const filterNotesP="filterNotesPresenter"

const view=views(publiSub).getInstance()

function presenters() {
    let presenterInstance;
    return {
      getInstance: function () {
        if (!presenterInstance) {
          presenterInstance=init()
        }
        return presenterInstance
      }
    }
}

function init () {
  publiSub.publish(getDP, this)
  return {
    start: start,
    filterNotes: filterNotes,
    dates: dates,
    undoAction: undoAction,
    interchangeNotes: interchangeNotes,
    deleteNote: deleteNote,
    editNote: editNote,
    saveNote: saveNote
  }
}

function saveNote (note) {
  publiSub.publish(saveNoteP, note)
  publiSub.publish(getDP, this)
}

function editNote (note, ids) {
  publiSub.publish(editNoteP, [note, ids])
  publiSub.publish(getDP, this)
}

function deleteNote (ids) {
  publiSub.publish(deleteNoteP, ids)
  publiSub.publish(getDP, this)
}

function dates(ids) {
  publiSub.publish(getDatesP, [this, ids])
  return {
    creation: this.creationDate,
    modification: this.lastMod
  }
}

function filterNotes (filter) {
  publiSub.publish(filterNotesP, filter)
  publiSub.publish(getDP, this)
}

function interchangeNotes (start, end) {
  publiSub.publish(InterchageNotesP, [start, end])
  publiSub.publish(getDP, this)
}

function undoAction () {
  publiSub.publish(undoActionP)
  publiSub.publish(getDP, this)
}

function start () {

  function undoActionModelLoger() {
    model.undoAction()
  }
  publiSub.subscribe(undoActionP, undoActionModelLoger)
  
  function interchageNotesModelLogger () {
    let info=arguments[1]
    model.interchangeNotes(info[0], info[1])
  }
  publiSub.subscribe(InterchageNotesP, interchageNotesModelLogger)

  function filterNotesModelLogger () {
    let filter=arguments[1]
    model.filterNotes(filter)
  }
  publiSub.subscribe(filterNotesP, filterNotesModelLogger)

  function getDatesModelLogger () {
    let info=arguments[1]
    const p=info[0]
    const ids=info[1]
    p.creationDate=model.getDate(ids, "creation")
    p.lastMod=model.getDate(ids, "modification")
  }
  publiSub.subscribe(getDatesP, getDatesModelLogger)

  function deleteNoteModelL () {
    let ids=arguments[1]
    model.deleteNote(ids)
  }
  publiSub.subscribe(deleteNoteP, deleteNoteModelL)

  function editNoteModelL () {
    let info=arguments[1]
    model.updateNote(info[0], info[1])
  }
  publiSub.subscribe(editNoteP, editNoteModelL)

  function saveNoteModelL () {
    let note=arguments[1]
    model.saveNote(note)
  }
  publiSub.subscribe(saveNoteP, saveNoteModelL)

  function interchangeNotesLogger () {
    let indexes=arguments[1]
    presenter.interchangeNotes(indexes[0], indexes[1])
    const activeNotes=presenter.data
    view.main(activeNotes)
  };
  publiSub.subscribe("interchangeNotes", interchangeNotesLogger)

  function textFilterLogger () {
    let filter=arguments[1]
    presenter.filterNotes(filter)
    const activeNotes=presenter.data
    view.main(activeNotes)
  }
  publiSub.subscribe("newText", textFilterLogger)

  function deleteNoteLogger () {
    let ids=arguments[1]
    presenter.deleteNote(ids)
    const activeNotes=presenter.data
    view.main(activeNotes)
  }
  publiSub.subscribe("deleteNote", deleteNoteLogger)

  function editNoteLogger () {
    let info=arguments[1]
    presenter.editNote(info[0], info[1])
  }
  publiSub.subscribe("editNote", editNoteLogger)

  function saveNoteLogger () {
    let note=arguments[1]
    presenter.saveNote(note)
    const activeNotes=presenter.data
    view.main(activeNotes)
  }
  publiSub.subscribe("saveNote", saveNoteLogger)

  function undoActionLogger () {
    presenter.undoAction()
    const activeNotes=presenter.data
    view.main(activeNotes)
  }
  publiSub.subscribe("undoAction", undoActionLogger)

  function startAppLogger () {
    let activeNotes=arguments[1]
    view.start(activeNotes)
  }
  publiSub.subscribe("startApp", startAppLogger)

  function editClickedLogger () {
    let ids=arguments[1]
    const dates=presenter.dates(ids)
    const activeNotes=presenter.data
    const note=activeNotes[ids].note
    view.edit(note, dates, ids)
  }
  publiSub.subscribe("editClicked", editClickedLogger)

  function saveEditClickedLogger () {
    let info=arguments[1]
    const ids=info[0]
    const checker=info[1]
    const data=presenter.data
    const newNote=data[ids].note
    view.saveEdition(newNote, ids, data, checker)
  }
  publiSub.subscribe("saveEditClicked", saveEditClickedLogger)

  function viewLogger () {
    let ids=arguments[1]
    const dates=presenter.dates(ids)
    const activeNotes=presenter.data
    const note=activeNotes[ids].note
    view.view(ids, note, dates)
  }
  publiSub.subscribe("viewClicked", viewLogger)
  publiSub.publish("startApp", this.data)
}

export default presenters

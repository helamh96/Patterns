import {view} from "./view.js"
import {model} from "./model.js";
import {publiSub} from "./pubSub.js";

export const presenter = (function (publiSub) {
    let presenterInstance;
    function init () {
      publiSub.publish("getDataPresenter", this)
      function saveNote (note) {
        publiSub.publish("saveNotePresenter", note)
        publiSub.publish("getDataPresenter", this)
      }
  
      function editNote (note, ids) {
        publiSub.publish("editNotePresenter", [note, ids])
        publiSub.publish("getDataPresenter", this)
      }
  
      function deleteNote (ids) {
        publiSub.publish("deleteNotePresenter", ids)
        publiSub.publish("getDataPresenter", this)
      }
  
      function dates (ids) {
        publiSub.publish("getDatesPresenter", [this, ids])
        return {
          creation: this.creationDate,
          modification: this.lastMod
        }
      }
  
      function filterNotes (filter) {
        publiSub.publish("filterNotesPresenter", filter)
        publiSub.publish("getDataPresenter", this)
      }
  
      function interchangeNotes (startingPlace, endingPlace) {
        publiSub.publish("interchageNotesP", [startingPlace, endingPlace])
        publiSub.publish("getDataPresenter", this)
      }
  
      function undoAction () {
        publiSub.publish("undoActionPresenter")
        publiSub.publish("getDataPresenter", this)
      }
  
      function start () {
        function undoActionModelLoger (topic) {
          model.undoAction()
        }
        publiSub.subscribe("undoActionPresenter", undoActionModelLoger)
  
        function interchageNotesModelLogger (topic, info) {
          model.interchangeNotes(info[0], info[1])
        }
        publiSub.subscribe("interchageNotesP", interchageNotesModelLogger)
  
        function filterNotesModelLogger (topic, filter) {
          model.filterNotes(filter)
        }
        publiSub.subscribe("filterNotesPresenter", filterNotesModelLogger)
  
        function getDatesModelLogger (topic, info) {
          const p = info[0]
          const ids = info[1]
          p.creationDate = model.getDate(ids, "creation")
          p.lastMod = model.getDate(ids, "modification")
        }
        publiSub.subscribe("getDatesPresenter", getDatesModelLogger)
  
        function deleteNoteModelL (topic, ids) {
          model.deleteNote(ids)
        }
        publiSub.subscribe("deleteNotePresenter", deleteNoteModelL)
  
        function editNoteModelL (topic, info) {
          model.updateNote(info[0], info[1])
        }
        publiSub.subscribe("editNotePresenter", editNoteModelL)
  
        function saveNoteModelL (topic, note) {
          model.saveNote(note)
        }
        publiSub.subscribe("saveNotePresenter", saveNoteModelL)
  
        function interchangeNotesLogger (topic, indexes) {
          presenter.interchangeNotes(indexes[0], indexes[1])
          const activeNotes = presenter.data
          view.main(activeNotes)
        };
        publiSub.subscribe("interchangeNotes", interchangeNotesLogger)
  
        function textFilterLogger (topic, filter) {
          presenter.filterNotes(filter)
          const activeNotes = presenter.data
          view.main(activeNotes)
        }
        publiSub.subscribe("newText", textFilterLogger)
  
        function deleteNoteLogger (topic, ids) {
          presenter.deleteNote(ids)
          const activeNotes = presenter.data
          view.main(activeNotes)
        }
        publiSub.subscribe("deleteNote", deleteNoteLogger)
  
        function editNoteLogger (topic, info) {
          presenter.editNote(info[0], info[1])
        }
        publiSub.subscribe("editNote", editNoteLogger)
  
        function saveNoteLogger (topic, note) {
          presenter.saveNote(note)
          const activeNotes = presenter.data
          view.main(activeNotes)
        }
        publiSub.subscribe("saveNote", saveNoteLogger)
  
        function undoActionLogger (topic) {
          presenter.undoAction()
          const activeNotes = presenter.data
          view.main(activeNotes)
        }
        publiSub.subscribe("undoAction", undoActionLogger)
  
        function startAppLogger (topic, activeNotes) {
          view.start(activeNotes)
        }
        publiSub.subscribe("startApp", startAppLogger)
  
        function editClickedLogger (topic, ids) {
          const dates = presenter.dates(ids)
          const activeNotes = presenter.data
          const note = activeNotes[ids].note
          view.edit(note, dates, ids)
        }
        publiSub.subscribe("editClicked", editClickedLogger)
  
        function saveEditClickedLogger (topic, info) {
          const ids = info[0]
          const checker = info[1]
          const data = presenter.data
          const newNote = data[ids].note
          view.saveEdition(newNote, ids, data, checker)
        }
        publiSub.subscribe("saveEditClicked", saveEditClickedLogger)
  
        function viewLogger (topic, ids) {
          const dates = presenter.dates(ids)
          const activeNotes = presenter.data
          const note = activeNotes[ids].note
          view.view(ids, note, dates)
        }
        publiSub.subscribe("viewClicked", viewLogger)
        publiSub.publish("getDataPresenter", this)
        publiSub.publish("startApp", this.data)
      }
  
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
    return {
      getInstance: function () {
        if (!presenterInstance) {
          presenterInstance = init()
        }
        return presenterInstance
      }
    }
  })(publiSub).getInstance()

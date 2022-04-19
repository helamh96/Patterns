"use strict"

const publiSub = {};
(function (myObject) {
  const topics = {}
  let subUid = -1

  myObject.publish = function (topic, args) {
    if (!topics[topic]) {
      return false
    }
    const subscribers = topics[topic]
    let len = subscribers ? subscribers.length : 0
    while (len--) {
      subscribers[len].func(topic, args)
    }
    return this
  }

  myObject.subscribe = function (topic, func) {
    if (!topics[topic]) {
      topics[topic] = []
    }
    const token = (++subUid).toString()
    topics[topic].push({
      token: token,
      func: func
    })
    return token
  }

  myObject.unsubscribe = function (token) {
    for (const m in topics) {
      if (topics[m]) {
        for (let i = 0, j = topics[m].length; i < j; i++) {
          if (topics[m][i].token === token) {
            topics[m].splice(i, 1)
            return token
          }
        }
      }
    }
    return this
  }
}(publiSub))

//the Model
const model = (function () {
  let modelInstance
  function inicializate () {
    function readI (key, fallback = null) {
      const str = localStorage.getItem(key) || fallback
      return JSON.parse(str)
    }
    function writeStoreItem (key, value) {
      localStorage.setItem(key, JSON.stringify(value))
    }

    function getData (indx = "notes", active = true) {
      const data = readI(indx === "notes" ? "notes" : "commandsHistorial") || {}
      if (indx === "notes" && active) {
        return Object.keys(data)
          .reduce((activeNotes, ids) => {
            if (data[ids].active && data[ids].passFilter) {
              activeNotes[ids] = data[ids]
            }
            return activeNotes
          }, {})
      }

      return data
    }

    function updatePrevConf (inverse) {
      const commands = readI("commandsHistorial", "{}")
      const lastIndex = getLastIndex(commands)
      commands[String(lastIndex + 1)] = inverse
      writeStoreItem("commandsHistorial", commands)
    }
    function saveNoteDataBase (obj) {
      const data = readI("notes", "{}")
      const ids = obj.ids
      delete obj.ids
      data[ids] = obj
      writeStoreItem("notes", data)
    }

    function updateData (ids, filter, indx = "notes") {
      if (indx === "commandsHistorial") {
        writeStoreItem("commandsHistorial", filter.commands)
        return
      }
      let data = readI("notes")
      let difNote = [false, ""]
      if ("note" in filter) {
        if (filter.note !== data[ids].note) {
          difNote = [true, data[ids].note]
          data[ids].note = filter.note
          data[ids].lastMod = filter.lastMod.toString()
        }
      } else if ("data" in filter) {
        data = filter.data
      } else {
        for (const key in filter) {
          data[ids][key] = filter[key]
        }
      }
      writeStoreItem("notes", data)
      return difNote
    }

    function updateNotes (data) {
      writeStoreItem("notes", data)
    }

    class NotesInformation {
      constructor (note) {
        let d = Date.now()
        this.ids = d
        this.creaDate = d
        this.lastMod = d
        this.note = note
        this.active = true
        this.passFilter = true
      }
    }
    function ModelFactory () { }
    ModelFactory.prototype.createNote = function (note) {
      return new NotesInformation(note)
    }
    const noteFactory = new ModelFactory()
    const UndoOptions = {
      updateNote ({ command, ids }) {
        updateNote(command.text, ids, true)
      },
      saveNote ({ data }) {
        const lastIndex = getLastIndex(data)
        delete data[lastIndex]
        updateData("-1", { data }, "notes")
      },
      deleteNote ({ ids }) {
        updateData(ids, { active: true })
      },
      interchange ({ command }) {
        interchangeNotes(command.start, command.end, true)
      }
    }

    function undoAction () {
      const commands = getData("commandsHistorial")
      const data = getData("notes", false)
      const lastIndex = getLastIndex(commands)

      if (!data) {
        return
      }
      else if (lastIndex in commands) {
        const reverseCommand = commands[lastIndex]
        delete commands[lastIndex]
        const ids = reverseCommand.ids || ""
        const undoAction = UndoOptions[reverseCommand.command]
        if (undoAction) {
          undoAction({ command: reverseCommand, ids, data })
          updateData("-1", { commands: commands }, "commandsHistorial")
        }
      }
    }

    function deleteNote (ids) {
      updateData(ids, { active: false })
      updatePrevConf({ command: "deleteNote", ids })
    }

    function saveNote (note) {
      const obj = noteFactory.createNote(note)
      if (obj.note !== "") {
        saveNoteDataBase(obj)
        updatePrevConf({ command: "saveNote" })
      }
    }

    function updateNote (note, ids, reversing = false) {
      if (note) {
        const filter = { note, lastMod: Date.now() }
        const [dif, text] = updateData(ids, filter)
        if (!reversing) {
          if (dif) {
            updatePrevConf({ ids, command: "updateNote", text })
          }
        }
      }
    }

    function getDate (ids, opt) {
      const data = getData("notes", true)
      return opt === "creation"
        ? data[ids].creaDate
        : data[ids].lastMod
    }

    function filterNotes (filter) {
      const notes = getData("notes", false)
      for (const n of Object.values(notes)) {
        n.passFilter = n.note.includes(filter)
      }
      updateNotes(notes)
    }

    function interchangeNotes (startingPlace, endingPlace, reversing = false) {
      const data = getData("notes", false)
      const keepingNote = data[startingPlace]
      data[startingPlace] = data[endingPlace]
      data[endingPlace] = keepingNote
      if (!reversing) {
        updatePrevConf({
          command: "interchange",
          start: endingPlace,
          end: startingPlace
        })
      }
      updateNotes(data)
    }
    function getLastIndex (obj) {
      const indices = Object.keys(obj).map(num => parseInt(num, 10))
      const lastIndex = indices.length > 0 ? Math.max(...indices) : 0
      return lastIndex
    }
    return {
      saveNote,
      deleteNote,
      updateNote,
      getDate,
      filterNotes,
      interchangeNotes,
      undoAction,
      getActiveNotes: getData
    }
  }
  return {
    getInstance: function () {
      if (!modelInstance) {
        modelInstance = inicializate()
      }
      return modelInstance
    }
  }
})().getInstance()
/*.....................................*/

//the View
const view = (function (publiSub) {
  let viewInstance

  function inicializate () {
    const body = document.body;
    const datesInfo = document.querySelector(".infoDate")
    const textSpace = document.getElementById("textarea")
    const saveButton = document.querySelector(".savebtn")
    const editButton = document.querySelector(".saveChangebtn")
    const cancelingButton = document.querySelector(".cancelbtn")
    const savedNotes = document.querySelector(".savedNotes")
    const creationDP = document.querySelector(".creation")
    const lastMDP = document.querySelector(".modified")
    const undobtn = document.querySelector(".undobtn")
    const searchBox = document.querySelector(".searchingbox")
    let draggedNote

    function notifyChange () {
      const filter = searchBox.value
      publiSub.publish("newText", filter)
    };

    function start (activeNotes) {
      savedNotes.addEventListener("click", clickOnNote)
      savedNotes.addEventListener("dragstart", draggingNote)
      savedNotes.addEventListener("dragend", dragEnds)
      savedNotes.addEventListener("dragover", function (event) {event.preventDefault()})
      savedNotes.addEventListener("drop", dropNote)
      textSpace.addEventListener("keydown", allowTabs)
      window.addEventListener("keydown", function (event) {
        if (event.ctrlKey && (event.key === "z" || event.key === "Z")) {
          event.preventDefault()
        }
      })
      searchBox.addEventListener("keyup", notifyChange)
      saveButton.addEventListener("click", saveNote)
      undobtn.addEventListener("click", undoAction)
      document.addEventListener("keydown", checkKeys)
      notifyChange(activeNotes)
    }

    function clickOnNote (ev) {
      const clicked = ev.target
      const clickedClass = clicked.getAttribute("class")
      const ids = clicked.getAttribute("data-ids")
      switch (clickedClass) {
        case "viewbtn":
          publiSub.publish("viewClicked", ids)
          break
        case "editbtn":
          publiSub.publish("editClicked", ids)
          break
        case "delbtn":
          publiSub.publish("deleteNote", ids)
          break
      }
    }

    function editView (note, dates, ids) {
      body.classList.add("editting");
      textSpace.readOnly = false
      editButton.textContent = "Save the changes"
      cancelingButton.textContent = "Cancel."
      textSpace.value = note
      editButton.addEventListener("click", onEditButton, { once: true })
      const creationDate = dates.creation
      const lastMod = dates.modification
      creationDP.textContent = `Creation date: ${new Date(creationDate)}.`
      lastMDP.textContent = `Last modification: ${new Date (Number(lastMod))}`
      cancelingButton.addEventListener("click", onCancelButton, { once: true })
      function onCancelButton () {
        editButton.removeEventListener("click", onEditButton, { once: true })
        editNote(ids, true).saveEdition()
      }
      function onEditButton () {
        cancelingButton.removeEventListener("click", onCancelButton, { once: true })
        editNote(ids).saveEdition()
      }
    }

    function mainView (activeNotes) {
      body.classList.remove("editting");
      body.classList.remove("view");
      textSpace.setAttribute("placeholder", "Write a note here.")
      textSpace.readOnly = false
      textSpace.value = ""
      saveButton.textContent = "Save the note!"
      placing(activeNotes)
      cancelingButton.removeEventListener("click", mainView, { once: true })
    }

    function editNote (ids, checkCancel = false) {
      return {
        saveEdition: () => {
          publiSub.publish("saveEditClicked", [ids, checkCancel])
        }
      }
    }

    function saveEdition (newNote, ids, activeNotes, checkCancel) {
      if (!checkCancel) {
        newNote = textSpace.value
      }
      activeNotes[ids].note = newNote
      publiSub.publish("editNote", [newNote, ids])
      mainView(activeNotes)
    }

    function readingView (ids, note, dates) {
      body.classList.add("view")
      textSpace.readOnly = true
      editButton.textContent = "Go back"
      textSpace.value = note
      const creationDate = dates.creation
      const lastMod = dates.modification
      editButton.addEventListener("click", editNote(ids).saveEdition, { once: true })
      creationDP.textContent = `Creation date: ${new Date(creationDate)}.`
      lastMDP.textContent = `Last modification: ${new Date(Number(lastMod))}`
    }

    function currentNote (ids, activeNotes) {
      const temp = document.querySelector("#notes")
      const div = temp.content.querySelector(".sNotes")
      div.setAttribute("data-ids", ids)
      const p = div.querySelector("p")
      p.setAttribute("data-ids", ids)
      const buttons = div.querySelector(".buttons")
      buttons.setAttribute("data-ids", ids)
      const erraseB = buttons.querySelector(".delbtn")
      erraseB.setAttribute("data-ids", ids)
      const editB = buttons.querySelector(".editbtn")
      editB.setAttribute("data-ids", ids)
      const viewB = buttons.querySelector(".viewbtn")
      viewB.setAttribute("data-ids", ids)
      const noteData = activeNotes[ids]
      p.textContent = noteData.note.slice(0, 10)
      if (noteData.note.length > 10) {
        p.textContent += "..."
      }
      const a = document.importNode(div, true)
      return a
    }

    function viewFactory () {
      function createNote (ids, activeNotes) {
        return currentNote(ids, activeNotes)
      }
      return { createNote: createNote }
    }

    function placing (activeNotes) {
      savedNotes.innerHTML = ""
      const fragment = document.createDocumentFragment()
      for (const i of Object.keys(activeNotes).reverse()) {
        const j = parseInt(i)
        const currentNote = viewFactory().createNote(j, activeNotes)
        fragment.appendChild(currentNote)
      }
      savedNotes.appendChild(fragment)
    }

    function saveNote () {
      const note = textSpace.value
      publiSub.publish("saveNote", note)
    }

    function allowTabs (event) {
      if (event.key === "Tab") {
        event.preventDefault()
        const start = this.selectionStart
        const end = this.selectionEnd
        this.value = this.value.slice(0, start) + "\t" + this.value.slice(end)
        this.selectionEnd = start + 1
      }
    }

    function draggingNote (event) {
      draggedNote = event.target
      draggedNote.style.opacity = 0.3
    }

    function dragEnds () {
      draggedNote.style.opacity = 1
    }

    function dropNote (event) {
      const startingPlace = draggedNote.getAttribute("data-ids")
      const endingPlace = event.target.getAttribute("data-ids")
      publiSub.publish("interchangeNotes", [startingPlace, endingPlace])
    }

    function checkKeys (event) {
      if (event.ctrlKey && (event.key === "z" || event.key === "Z")) {
        undoAction()
      }
    }

    function undoAction () {
      if (undobtn.style.display !== "none") {
        publiSub.publish("undoAction")
      }
    }

    return {
      main: mainView,
      edit: editView,
      view: readingView,
      start: start,
      saveEdition: saveEdition
    }
  }
  return {
    getInstance: function () {
      viewInstance = inicializate()
      return viewInstance
    }
  }
})(publiSub).getInstance()
/*.....................................*/

// Presenter
const presenter = (function (publiSub) {
  let presenterInstance

  function inicializate () {
    let creationDate
    let lastMod
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
        presenterInstance = inicializate()
      }
      return presenterInstance
    }
  }
})(publiSub).getInstance()
/*.....................................*/


window.addEventListener("load", function () {
  function getDataModelLogger (topic, p) {
    p.data = model.getActiveNotes("notes", true)
  }
  publiSub.subscribe("getDataPresenter", getDataModelLogger)
  presenter.start()
})

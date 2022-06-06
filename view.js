import {publiSub} from "./pubSub.js";

const body=document.body;
const textSpace=document.getElementById("textarea")
const saveButton=document.querySelector(".savebtn")
const editButton=document.querySelector(".saveChangebtn")
const cancelingButton=document.querySelector(".cancelbtn")
const savedNotes=document.querySelector(".savedNotes")
const creationDP=document.querySelector(".creation")
const lastMDP=document.querySelector(".modified")
const undobtn=document.querySelector(".undobtn")
const searchBox=document.querySelector(".searchingbox")
let draggedNote


export default function views() {
  let viewInstance
  return {
    getInstance: function () {
      viewInstance=init()
      return viewInstance
    }
  }
}

  function init () {
    return {
      main: mainView,
      edit: editView,
      view: readingView,
      start: start,
      saveEdition: saveEdition
    }
  }

  function notifyChange () {
    const filter=searchBox.value
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
    const clicked=ev.target
    const clickedClass=clicked.getAttribute("class")
    const ids=clicked.getAttribute("data-ids")
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
    textSpace.readOnly=false
    editButton.textContent="Save the changes"
    cancelingButton.textContent="Cancel."
    textSpace.value=note
    editButton.addEventListener("click", onEditButton, { once: true })
    const creationDate=dates.creation
    const lastMod=dates.modification
    creationDP.textContent=`Creation date: ${new Date(creationDate)}.`
    lastMDP.textContent=`Last modification: ${new Date (Number(lastMod))}`
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
    textSpace.readOnly=false
    textSpace.value=""
    saveButton.textContent="Save the note!"
    placing(activeNotes)
    cancelingButton.removeEventListener("click", mainView, { once: true })
  }

  function editNote (ids, checkCancel=false) {
    return {
      saveEdition: () => {
        publiSub.publish("saveEditClicked", [ids, checkCancel])
      }
    }
  }

  function saveEdition (newNote, ids, activeNotes, checkCancel) {
    if (!checkCancel) {
      newNote=textSpace.value
    }
    activeNotes[ids].note=newNote
    publiSub.publish("editNote", [newNote, ids])
    mainView(activeNotes)
  }

  function readingView (ids, note, dates) {
    body.classList.add("view")
    textSpace.readOnly=true
    editButton.textContent="Go back"
    textSpace.value=note
    const creationDate=dates.creation
    const lastMod=dates.modification
    editButton.addEventListener("click", editNote(ids).saveEdition, { once: true })
    creationDP.textContent=`Creation date: ${new Date(creationDate)}.`
    lastMDP.textContent=`Last modification: ${new Date(Number(lastMod))}`
  }

  function currentNote (ids, activeNotes) {
    const temp=document.querySelector("#notes")
    const div=temp.content.querySelector(".sNotes")
    div.setAttribute("data-ids", ids)
    const p=div.querySelector("p")
    p.setAttribute("data-ids", ids)
    const buttons=div.querySelector(".buttons")
    buttons.setAttribute("data-ids", ids)
    const erraseB=buttons.querySelector(".delbtn")
    erraseB.setAttribute("data-ids", ids)
    const editB=buttons.querySelector(".editbtn")
    editB.setAttribute("data-ids", ids)
    const viewB=buttons.querySelector(".viewbtn")
    viewB.setAttribute("data-ids", ids)
    const noteData=activeNotes[ids]
    p.textContent=noteData.note.slice(0, 10)
    if (noteData.note.length > 10) {
      p.textContent += "..."
    }
    const a=document.importNode(div, true)
    return a
  }

  function viewFactory () {
    function createNote (ids, activeNotes) {
      return currentNote(ids, activeNotes)
    }
    return { createNote: createNote }
  }

  function placing (activeNotes) {
    savedNotes.innerHTML=""
    const fragment=document.createDocumentFragment()
    for (const i of Object.keys(activeNotes).reverse()) {
      const j=parseInt(i)
      const currentNote=viewFactory().createNote(j, activeNotes)
      fragment.appendChild(currentNote)
    }
    savedNotes.appendChild(fragment)
  }

  function saveNote () {
    const note=textSpace.value
    publiSub.publish("saveNote", note)
  }

  function allowTabs (event) {
    if (event.key === "Tab") {
      event.preventDefault()
      const start=this.selectionStart
      const end=this.selectionEnd
      this.value=this.value.slice(0, start) + "\t" + this.value.slice(end)
      this.selectionEnd=start + 1
    }
  }

  function draggingNote (event) {
    draggedNote=event.target
    draggedNote.style.opacity=0.3
  }

  function dragEnds () {
    draggedNote.style.opacity=1
  }

  function dropNote (event) {
    const start=draggedNote.getAttribute("data-ids")
    const end=event.target.getAttribute("data-ids")
    publiSub.publish("interchangeNotes", [start, end])
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
